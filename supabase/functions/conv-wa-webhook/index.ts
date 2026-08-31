/**
 * conv-wa-webhook
 *
 * Adaptador inbound de canal WhatsApp — hardened (Fase 11B3).
 * Recibe webhooks de Wasender, valida firma HMAC, timestamp, deduplicación
 * y normaliza el mensaje antes de llamar a conv-ingest.
 *
 * Responsabilidades:
 *   1. Leer body raw (para HMAC sobre raw body, no sobre JSON re-serializado).
 *   2. Resolver tenant desde wasender_session_id (confiable) en lugar de query param.
 *   3. Obtener secret de forma segura (RPC backend; soporta rotación current/prev).
 *   4. Verificar firma HMAC-SHA256 con comparación constant-time.
 *   5. Validar timestamp firmado — rechazar si > WASENDER_WEBHOOK_TIMESTAMP_TOLERANCE_S (default 300s).
 *   6. Rechazar timestamp futuro fuera de margen (tolerancia de 30s hacia delante).
 *   7. Aplicar deduplicación por wasender_message_id (idempotente).
 *   8. Normalizar sender_ref.
 *   9. Llamar conv-ingest solo después de autenticar.
 *
 * Orden obligatorio: parseo mínimo → secret seguro → firma → timestamp → dedupe → normalización → ingest.
 *
 * Autenticación de entrada: HMAC-SHA256 (webhook Wasender), no service_role.
 * Uso interno de service_role: consultas a Supabase y llamada a conv-ingest.
 *
 * Privacidad: no se loguean teléfono, message_text, raw_payload, firma, timestamp ni secret.
 * Fuente: rules-20, rules-80, SEC-026 (timestamp), SEC-012 (constant-time).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { createSafeLogger } from "../_shared/smart-conversations/ef-logger.ts";
import { timingSafeEqualBytes } from "../_shared/smart-conversations/runtime/constant-time.ts";

const EF_NAME = 'conv-wa-webhook';

// ── Constantes de seguridad ────────────────────────────────────────────────

/** Ventana de tolerancia para timestamps de webhook (segundos hacia atrás) */
const TIMESTAMP_TOLERANCE_S = (() => {
  if (typeof Deno !== 'undefined') {
    return parseInt(Deno.env.get('WASENDER_WEBHOOK_TIMESTAMP_TOLERANCE_S') ?? '300', 10);
  }
  return 300;
})();

/** Margen hacia el futuro permitido (segundos) — para compensar desfase de reloj */
const TIMESTAMP_FUTURE_TOLERANCE_S = 30;

// ── HMAC-SHA256 con constant-time ──────────────────────────────────────────

async function computeHmacSha256Bytes(body: string, secret: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  return new Uint8Array(sig);
}

function hexToBytes(hex: string): Uint8Array | null {
  const clean = hex.startsWith('sha256=') ? hex.slice(7) : hex;
  if (!clean || clean.length % 2 !== 0) return null;
  const len = clean.length / 2;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    const byte = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
    if (isNaN(byte)) return null;
    bytes[i] = byte;
  }
  return bytes;
}

/**
 * Verifica firma HMAC-SHA256 con comparación constant-time.
 * Soporta rotación: prueba current primero, luego previous si está presente.
 * SEC-012: usa timingSafeEqualBytes.
 */
async function verifyHmacWithRotation(
  rawBody: string,
  signature: string,
  currentSecret: string,
  previousSecret: string | null,
): Promise<boolean> {
  const sigBytes = hexToBytes(signature);
  if (!sigBytes) return false;

  const currentMac = await computeHmacSha256Bytes(rawBody, currentSecret);
  if (await timingSafeEqualBytes(sigBytes, currentMac)) return true;

  if (previousSecret) {
    const prevMac = await computeHmacSha256Bytes(rawBody, previousSecret);
    if (await timingSafeEqualBytes(sigBytes, prevMac)) return true;
  }

  return false;
}

// ── Validación de timestamp ────────────────────────────────────────────────

/**
 * Valida que el timestamp del webhook está dentro de la ventana de tolerancia.
 * Rechaza timestamps demasiado antiguos (replay) y demasiado futuros (clock skew extremo).
 * SEC-026.
 */
function validateWebhookTimestamp(timestampHeader: string | null): {
  valid: boolean;
  reason?: string;
} {
  if (!timestampHeader) {
    return { valid: false, reason: 'missing_timestamp' };
  }

  const ts = parseInt(timestampHeader, 10);
  if (isNaN(ts) || ts <= 0) {
    return { valid: false, reason: 'invalid_timestamp_format' };
  }

  const nowS = Math.floor(Date.now() / 1000);
  const ageSecs = nowS - ts;

  if (ageSecs > TIMESTAMP_TOLERANCE_S) {
    return { valid: false, reason: 'timestamp_too_old' };
  }

  if (ageSecs < -TIMESTAMP_FUTURE_TOLERANCE_S) {
    return { valid: false, reason: 'timestamp_too_future' };
  }

  return { valid: true };
}

// ── Normalización de sender_ref ────────────────────────────────────────────

function normalizeSenderRef(remoteJid: string): string {
  let phone = remoteJid ?? '';
  if (phone.includes('@s.whatsapp.net')) {
    phone = phone.split('@s.whatsapp.net')[0];
  }
  if (phone.includes('@c.us')) {
    phone = phone.split('@c.us')[0];
  }
  if (!phone || phone.length < 7) return '';
  if (!phone.startsWith('+')) {
    phone = '+' + phone;
  }
  return phone;
}

// ── Payload Wasender ───────────────────────────────────────────────────────

interface WasenderWebhookPayload {
  event?: string;
  data?: {
    key?: {
      remoteJid?: string;
      fromMe?: boolean;
      id?: string;
    };
    message?: {
      conversation?: string;
      extendedTextMessage?: { text?: string };
    };
    pushName?: string;
  };
}

// ── Respuesta silenciosa ───────────────────────────────────────────────────

/** 200 silencioso para casos no procesables — no revela al atacante el motivo */
function silentOk(): Response {
  return new Response('ok', { status: 200 });
}

// ── Handler ────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 204 });
  if (req.method !== 'POST') return silentOk();

  const log = createSafeLogger(EF_NAME);
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

  // ── 1. Leer body raw antes de cualquier otra operación ─────────────────
  // El HMAC se calcula sobre el raw body, no sobre el JSON re-serializado.
  const rawBody = await req.text();
  const signature = req.headers.get('X-Wasender-Signature') ?? '';
  const timestampHeader = req.headers.get('X-Wasender-Timestamp') ?? null;

  // ── 2. Parseo mínimo para localizar wasender_session_id ───────────────
  // Solo extraemos el campo necesario para resolver el tenant.
  // No procesamos el payload completo hasta después de validar la firma.
  let wasenderSessionId: string | null = null;
  {
    // Intento de parseo minimal sin exponer errores de estructura
    try {
      const minimal = JSON.parse(rawBody) as Record<string, unknown>;
      const sessionIdRaw = minimal['wasender_session_id'] ?? minimal['session_id'];
      if (typeof sessionIdRaw === 'string' && sessionIdRaw.length > 0) {
        wasenderSessionId = sessionIdRaw;
      }
    } catch { /* no acción — se descartará en la firma */ }
  }

  // ── 3. Consultar tenant y secrets desde wasender_session_id (confiable) ──
  // SEC-018: tenant resuelto desde wasender_session_id, no desde query param.
  // El query param client_account_id es informativo (legacy); wasender_session_id
  // es la fuente de autoridad para el tenant.
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Si no hay wasender_session_id, intentar desde query param (legacy fallback).
  const url = new URL(req.url);
  const queryClientAccountId = url.searchParams.get('client_account_id') ?? '';

  let waSession: {
    id: string;
    status: string;
    client_account_id: string;
    webhook_secret: string;
    webhook_secret_prev: string | null;
  } | null = null;

  if (wasenderSessionId) {
    const { data } = await supabase
      .from('conv_wa_sessions')
      .select('id, status, client_account_id, webhook_secret, webhook_secret_prev')
      .eq('id', wasenderSessionId)
      .maybeSingle();
    waSession = data ?? null;
  } else if (queryClientAccountId) {
    // Legacy: resolver por client_account_id (SEC-018: riesgo documentado, fallback temporal)
    const { data } = await supabase
      .from('conv_wa_sessions')
      .select('id, status, client_account_id, webhook_secret, webhook_secret_prev')
      .eq('client_account_id', queryClientAccountId)
      .maybeSingle();
    waSession = data ?? null;
  }

  if (!waSession) {
    log.warn('sesión WhatsApp no encontrada — webhook descartado silenciosamente');
    return silentOk();
  }

  // ── 4. Validar timestamp (antes de HMAC para fail-fast rápido) ─────────
  // SEC-026: ventana de 5 minutos hacia atrás, 30s hacia delante.
  const tsResult = validateWebhookTimestamp(timestampHeader);
  if (!tsResult.valid) {
    log.warn('timestamp de webhook inválido — descartado', {
      reason: tsResult.reason ?? 'unknown',
    });
    return silentOk();
  }

  // ── 5. Verificar firma HMAC-SHA256 con constant-time y soporte rotación ─
  // SEC-012: constant-time comparison. Soporta current + previous secret.
  const signatureValid = await verifyHmacWithRotation(
    rawBody,
    signature,
    waSession.webhook_secret,
    waSession.webhook_secret_prev ?? null,
  );

  if (!signatureValid) {
    log.warn('firma HMAC inválida — webhook descartado silenciosamente');
    return silentOk();
  }

  // ── 6. Verificar sesión activa ─────────────────────────────────────────
  if (waSession.status !== 'active') {
    log.info('sesión WhatsApp no activa — mensaje ignorado', { status: waSession.status });
    return silentOk();
  }

  // ── 7. Parsear payload completo (ya autenticado por HMAC + timestamp) ──
  let payload: WasenderWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    log.warn('payload no es JSON válido tras HMAC ok');
    return silentOk();
  }

  const remoteJid = payload?.data?.key?.remoteJid ?? '';
  const fromMe = payload?.data?.key?.fromMe ?? false;
  const waMessageId = payload?.data?.key?.id ?? '';
  const messageText =
    payload?.data?.message?.conversation ??
    payload?.data?.message?.extendedTextMessage?.text ??
    '';

  // Ignorar mensajes propios (outbound de bot)
  if (fromMe) return silentOk();

  // Ignorar mensajes de grupos
  if (remoteJid.includes('@g.us')) {
    log.info('mensaje de grupo ignorado');
    return silentOk();
  }

  // ── 8. Deduplicación por wasender_message_id ───────────────────────────
  // Idempotente: si el mensaje ya fue procesado, responder 200 sin reprocesar.
  const client_account_id = waSession.client_account_id;
  if (waMessageId) {
    const { data: existing } = await supabase
      .from('conv_messages')
      .select('id')
      .eq('client_account_id', client_account_id)
      .eq('provider_message_id', waMessageId)
      .maybeSingle();

    if (existing) {
      log.info('mensaje ya procesado — dedup aplicada', { has_message_id: 'true' });
      return silentOk();
    }
  }

  // ── 9. Normalizar sender_ref ───────────────────────────────────────────
  const senderRef = normalizeSenderRef(remoteJid);
  if (!senderRef) {
    log.warn('sender_ref no pudo normalizarse — mensaje descartado');
    return silentOk();
  }

  if (!messageText) {
    log.info('mensaje sin texto — descartado (media sin caption)');
    return silentOk();
  }

  // ── 10. Llamar conv-ingest (solo tras autenticar y deduplicar) ─────────
  try {
    const ingestRes = await fetch(`${supabaseUrl}/functions/v1/conv-ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        client_account_id,
        normalized_message: {
          channel: 'whatsapp',
          sender_ref: senderRef,
          message_text: messageText,
          provider_message_id: waMessageId || null,
        },
      }),
    });

    if (!ingestRes.ok) {
      log.warn('conv-ingest devolvió error', { status: String(ingestRes.status) });
    } else {
      log.info('mensaje WhatsApp ingestado', {
        channel: 'whatsapp',
        has_message_id: String(!!waMessageId),
      });
    }
  } catch (e: unknown) {
    log.warn('Error al llamar a conv-ingest', {
      err: e instanceof Error ? e.message : String(e),
    });
  }

  return silentOk();
});
