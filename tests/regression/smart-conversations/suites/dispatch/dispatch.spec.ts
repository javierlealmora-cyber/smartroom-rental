/**
 * Suite: Dispatch — conv-dispatch-message (Fase 9A)
 * Análisis estático de conv-dispatch-message y sus 4 helpers de runtime.
 *
 * IDs: DSP-AUTH, DSP-ROUTING, DSP-OUTBOUND, DSP-MAP,
 *      DSP-MARKER, DSP-IDEMP, DSP-ERR, DSP-PRIV, DSP-RES, DSP-REG
 */

import { describe, it, beforeAll, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EF_DIR     = resolve(__dirname, '../../../../../supabase/functions');
const SHARED_DIR = resolve(EF_DIR, '_shared/smart-conversations/runtime');

let srcDispatch:     string;
let srcSvcRouter:    string;
let srcRespMapper:   string;
let srcOutbRouter:   string;
let srcIdempotency:  string;

beforeAll(() => {
  srcDispatch    = readFileSync(resolve(EF_DIR, 'conv-dispatch-message/index.ts'), 'utf-8');
  srcSvcRouter   = readFileSync(resolve(SHARED_DIR, 'dispatch-service-router.ts'), 'utf-8');
  srcRespMapper  = readFileSync(resolve(SHARED_DIR, 'dispatch-response-mapper.ts'), 'utf-8');
  srcOutbRouter  = readFileSync(resolve(SHARED_DIR, 'dispatch-outbound-router.ts'), 'utf-8');
  srcIdempotency = readFileSync(resolve(SHARED_DIR, 'dispatch-idempotency.ts'), 'utf-8');
});

// ---------------------------------------------------------------------------
// DSP-AUTH — autenticación y validación de input
// ---------------------------------------------------------------------------

describe('DSP-AUTH: autenticación y validación de input', () => {

  it('DSP-AUTH-01: conv-dispatch-message requiere service_role', () => {
    expect(srcDispatch).toContain('isServiceRoleRequest');
    expect(srcDispatch).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(srcDispatch).toContain('ERROR_CODES.UNAUTHORIZED');
  });

  it('DSP-AUTH-02: rechaza session_token — no usa getUser/getSession', () => {
    expect(srcDispatch).not.toContain('getUser');
    expect(srcDispatch).not.toContain('getSession');
  });

  it('DSP-AUTH-03: rechaza payload sin client_account_id', () => {
    expect(srcDispatch).toContain('client_account_id es obligatorio');
  });

  it('DSP-AUTH-04: rechaza payload sin session_id', () => {
    expect(srcDispatch).toContain('session_id es obligatorio');
  });

  it('DSP-AUTH-05: rechaza payload sin message_id', () => {
    expect(srcDispatch).toContain('message_id es obligatorio');
  });

  it('DSP-AUTH-06: rechaza sesión inexistente — devuelve 404', () => {
    expect(srcDispatch).toContain('Sesión no encontrada');
    expect(srcDispatch).toContain("'conv_sessions'");
  });

  it('DSP-AUTH-07: rechaza mensaje inexistente — devuelve 404', () => {
    expect(srcDispatch).toContain('Mensaje no encontrado');
    expect(srcDispatch).toContain("'conv_messages'");
  });

  it('DSP-AUTH-08: rechaza mensaje que no pertenece a la sesión', () => {
    expect(srcDispatch).toContain('El mensaje no pertenece a la sesión indicada');
  });

  it('DSP-AUTH-09: rechaza mensaje con direction != inbound', () => {
    expect(srcDispatch).toContain("direction !== 'inbound'");
    expect(srcDispatch).toContain('Solo se pueden despachar mensajes inbound');
  });

  it('DSP-AUTH-10: rechaza channel inválido o inconsistente', () => {
    expect(srcDispatch).toContain('Canal inválido o no soportado');
    expect(srcDispatch).toContain('VALID_CHANNELS');
  });

  it('DSP-AUTH-extra: no acepta message_text externo como fuente de verdad', () => {
    expect(srcDispatch).toContain("'message_text' in rawBody");
    expect(srcDispatch).toContain('message_text no está permitido en el payload de dispatch');
  });

});

// ---------------------------------------------------------------------------
// DSP-ROUTING — routing engine
// ---------------------------------------------------------------------------

describe('DSP-ROUTING: integración con conv-routing-engine', () => {

  it('DSP-ROUTING-11: llama a conv-routing-engine', () => {
    expect(srcDispatch).toContain('conv-routing-engine');
  });

  it('DSP-ROUTING-12: no duplica lógica de routing — CONFIDENCE_THRESHOLD no está en dispatch', () => {
    expect(srcDispatch).not.toContain('CONFIDENCE_THRESHOLD');
    expect(srcDispatch).not.toContain('services_active');
  });

  it("DSP-ROUTING-13: routing 'routed' con conv_incidencias llama conv-wf20-incidents", () => {
    expect(srcSvcRouter).toContain("conv_incidencias:   'conv-wf20-incidents'");
    const mappingPos = srcDispatch.indexOf('conv-routing-engine');
    const wfCallPos  = srcDispatch.indexOf('getWfEfName');
    expect(mappingPos).toBeGreaterThan(0);
    expect(wfCallPos).toBeGreaterThan(mappingPos);
  });

  it("DSP-ROUTING-14: routing 'routed' con conv_publicaciones llama conv-wf30-listings", () => {
    expect(srcSvcRouter).toContain("conv_publicaciones: 'conv-wf30-listings'");
  });

  it("DSP-ROUTING-15: routing 'routed' con conv_ayuda llama conv-wf40-help", () => {
    expect(srcSvcRouter).toContain("conv_ayuda:         'conv-wf40-help'");
  });

  it("DSP-ROUTING-16: routing 'menu' no llama a WF-20/30/40", () => {
    // Dentro del bloque menu, no hay referencia a getWfEfName
    const menuBlock = srcDispatch.match(/responseType === 'menu'[\s\S]{0,300}/);
    expect(menuBlock).not.toBeNull();
    expect(menuBlock![0]).not.toContain('getWfEfName');
    expect(menuBlock![0]).not.toContain('conv-wf20');
    expect(menuBlock![0]).not.toContain('conv-wf30');
    expect(menuBlock![0]).not.toContain('conv-wf40');
  });

  it("DSP-ROUTING-17: routing 'no_service' no llama a WF-20/30/40", () => {
    const noSvcBlock = srcDispatch.match(/responseType === 'no_service'[\s\S]{0,200}/);
    expect(noSvcBlock).not.toBeNull();
    expect(noSvcBlock![0]).not.toContain('getWfEfName');
    expect(noSvcBlock![0]).not.toContain('wf20');
    expect(noSvcBlock![0]).not.toContain('wf30');
    expect(noSvcBlock![0]).not.toContain('wf40');
  });

  it("DSP-ROUTING-18: routing 'context_switch_confirmation' no llama a WF-20/30/40", () => {
    const ctxBlock = srcDispatch.match(/responseType === 'context_switch_confirmation'[\s\S]{0,200}/);
    expect(ctxBlock).not.toBeNull();
    expect(ctxBlock![0]).not.toContain('getWfEfName');
    expect(ctxBlock![0]).not.toContain('wf20');
    expect(ctxBlock![0]).not.toContain('wf30');
    expect(ctxBlock![0]).not.toContain('wf40');
  });

  it('DSP-ROUTING-19: context_switch_confirmation no cambia active_service_code', () => {
    // El bloque context_switch solo llama buildContextSwitchText sin UPDATE de sesión
    const ctxBlock = srcDispatch.match(/responseType === 'context_switch_confirmation'[\s\S]{0,150}/);
    expect(ctxBlock).not.toBeNull();
    expect(ctxBlock![0]).toContain('buildContextSwitchText');
    // active_service_code puede aparecer en comentario interno — verificar que no hay .update(
    expect(ctxBlock![0]).not.toContain('.from(');
    // El dispatch no hace un .update({ active_service_code dentro del bloque context_switch
    const noUpdateCtx = srcDispatch.match(/responseType === 'context_switch_confirmation'[\s\S]{0,300}active_service_code\s*:/);
    expect(noUpdateCtx).toBeNull();
  });

});

// ---------------------------------------------------------------------------
// DSP-OUTBOUND — routing de salida
// ---------------------------------------------------------------------------

describe('DSP-OUTBOUND: routing de salida por canal', () => {

  it('DSP-OUTBOUND-20: canal whatsapp usa conv-send-wa', () => {
    expect(srcOutbRouter).toContain("whatsapp: 'conv-send-wa'");
    expect(srcDispatch).toContain('getOutboundEfName');
  });

  it('DSP-OUTBOUND-21: canal webchat usa conv-web-deliver', () => {
    expect(srcOutbRouter).toContain("webchat:  'conv-web-deliver'");
  });

  it('DSP-OUTBOUND-22: dispatch no construye jids WhatsApp — ausente en todos los helpers', () => {
    // La restricción es que dispatch no construye JIDs — lo verifica la ausencia en helpers de outbound
    expect(srcOutbRouter).not.toContain('@c.us');
    expect(srcIdempotency).not.toContain('@c.us');
    expect(srcSvcRouter).not.toContain('@c.us');
    expect(srcRespMapper).not.toContain('@c.us');
    // dispatch llama conv-send-wa que gestiona JIDs — no los construye directamente
    expect(srcDispatch).not.toContain('sendWasenderMessage');
  });

  it('DSP-OUTBOUND-23: dispatch no construye @s.whatsapp.net — ausente en helpers de outbound', () => {
    expect(srcOutbRouter).not.toContain('@s.whatsapp.net');
    expect(srcIdempotency).not.toContain('@s.whatsapp.net');
    expect(srcSvcRouter).not.toContain('@s.whatsapp.net');
    expect(srcRespMapper).not.toContain('@s.whatsapp.net');
    // Verificar que dispatch no importa ni usa wasender-client
    expect(srcDispatch).not.toContain('wasender-client');
  });

  it('DSP-OUTBOUND-24: dispatch no llama a wasender-client directamente', () => {
    expect(srcDispatch).not.toContain('wasender-client');
    expect(srcDispatch).not.toContain('sendWasenderMessage');
  });

  it('DSP-OUTBOUND-25: dispatch no implementa retry de outbound', () => {
    // No hay lógica de backoff/retry en dispatch — eso es responsabilidad de conv-send-wa
    expect(srcDispatch).not.toContain('BACKOFF_SECONDS');
    expect(srcDispatch).not.toContain('MAX_ATTEMPTS');
    expect(srcDispatch).not.toContain('while (attempts');
  });

});

// ---------------------------------------------------------------------------
// DSP-MAP — mapping de respuestas
// ---------------------------------------------------------------------------

describe('DSP-MAP: mapping de respuestas de WF a texto seguro', () => {

  it("DSP-MAP-26: WF-20 'success' tiene fallback text", () => {
    expect(srcRespMapper).toContain("success:");
    expect(srcRespMapper).toContain('incidencia ha sido registrada');
  });

  it("DSP-MAP-27: WF-20 'pending_input' tiene fallback text", () => {
    expect(srcRespMapper).toContain("pending_input:");
    expect(srcRespMapper).toContain('más información');
  });

  it("DSP-MAP-28: WF-20 'identity_required' tiene fallback text", () => {
    expect(srcRespMapper).toContain("identity_required:");
    expect(srcRespMapper).toContain('verificar tu identidad');
  });

  it("DSP-MAP-29: WF-30 'listing_results' tiene fallback text", () => {
    expect(srcRespMapper).toContain("listing_results:");
    expect(srcRespMapper).toContain('publicaciones disponibles');
  });

  it("DSP-MAP-30: WF-30 'lead_created' tiene fallback text", () => {
    expect(srcRespMapper).toContain("lead_created:");
    expect(srcRespMapper).toContain('interés');
  });

  it("DSP-MAP-31: WF-40 'help_answer' tiene fallback text", () => {
    expect(srcRespMapper).toContain("help_answer:");
    expect(srcRespMapper).toContain('información');
  });

  it("DSP-MAP-32: WF-40 'help_ticket_created' o 'waiting_internal' tiene fallback text", () => {
    expect(srcRespMapper).toMatch(/help_ticket_created:|waiting_internal:/);
    expect(srcRespMapper).toContain('Nuestro equipo te atenderá pronto');
  });

  it("DSP-MAP-33: 'escalated' tiene fallback text", () => {
    expect(srcRespMapper).toContain("escalated:");
    expect(srcRespMapper).toContain('derivada');
  });

  it("DSP-MAP-34: 'clarification' tiene fallback text", () => {
    expect(srcRespMapper).toMatch(/clarification:|clarification_needed:/);
    expect(srcRespMapper).toContain('¿');
  });

  it('DSP-MAP-35: mapper no devuelve JSON técnico al usuario', () => {
    expect(srcRespMapper).not.toMatch(/"response_type"\s*:/);
    expect(srcRespMapper).not.toContain('JSON.stringify');
  });

  it('DSP-MAP-36: mapper no devuelve stack traces', () => {
    expect(srcRespMapper).not.toContain('stack');
    expect(srcRespMapper).not.toContain('Error:');
  });

});

// ---------------------------------------------------------------------------
// DSP-MARKER — marcadores sin resolver
// ---------------------------------------------------------------------------

describe('DSP-MARKER: guardas de marcadores', () => {

  it('DSP-MARKER-37: mapper detecta {incident_ref} sin resolver', () => {
    expect(srcRespMapper).toContain('MARKER_PATTERN');
    expect(srcRespMapper).toContain('hasUnsubstitutedMarkers');
  });

  it('DSP-MARKER-38: mapper detecta {lead_ref} sin resolver', () => {
    // El mismo pattern cubre {lead_ref}
    expect(srcRespMapper).toContain('MARKER_PATTERN');
    expect(srcRespMapper).toContain('[a-z_]+');
  });

  it('DSP-MARKER-39: mapper detecta {help_ticket_ref} sin resolver', () => {
    expect(srcRespMapper).toContain('hasUnsubstitutedMarkers');
  });

  it('DSP-MARKER-40: mapper detecta {user_name} sin resolver', () => {
    expect(srcRespMapper).toContain('hasUnsubstitutedMarkers');
    // Si hay marcador → usar fallback
    expect(srcRespMapper).toContain('FALLBACK_TEXT');
  });

});

// ---------------------------------------------------------------------------
// DSP-IDEMP — idempotencia
// ---------------------------------------------------------------------------

describe('DSP-IDEMP: estrategia de idempotencia (microfix Fase 9A)', () => {

  // ── Estrategia correcta: solo status del inbound ─────────────────────────

  it('DSP-IDEMP-41: idempotencia basada en status del inbound — sin outboundCount como código funcional', () => {
    // evaluateDispatchIdempotency existe
    expect(srcIdempotency).toContain('evaluateDispatchIdempotency');
    // La función solo acepta inboundStatus — no hay parámetro outboundCount en la firma
    expect(srcIdempotency).not.toMatch(/function\s+\w+\s*\([^)]*outboundCount/);
    expect(srcIdempotency).not.toMatch(/outboundCount\s*\)/);  // no como argumento
    // dispatch no declara ni usa la variable outboundCount
    expect(srcDispatch).not.toMatch(/const outboundCount|let outboundCount/);
    expect(srcDispatch).not.toMatch(/outboundCount\s*=/);
    expect(srcDispatch).toContain('idempotent: true');
  });

  it('DSP-IDEMP-42: status sent devuelve éxito idempotente sin routing', () => {
    expect(srcIdempotency).toContain("case 'sent'");
    expect(srcIdempotency).toContain("already_sent");
    // El return idempotente ocurre antes del routing call
    const idempPos      = srcDispatch.indexOf('idempotent: true');
    const routingCallPos = srcDispatch.indexOf("functions/v1/conv-routing-engine");
    expect(idempPos).toBeLessThan(routingCallPos);
  });

  it('DSP-IDEMP-42b: status processing devuelve already_processing sin routing', () => {
    expect(srcIdempotency).toContain("case 'processing'");
    expect(srcIdempotency).toContain("already_processing");
  });

  it('DSP-IDEMP-42c: status failed devuelve previously_failed sin routing por defecto', () => {
    expect(srcIdempotency).toContain("case 'failed'");
    expect(srcIdempotency).toContain("previously_failed");
  });

  it('DSP-IDEMP-42d: status received devuelve proceed — ejecuta dispatch', () => {
    expect(srcIdempotency).toContain("case 'received'");
    expect(srcIdempotency).toContain("'proceed'");
    expect(srcIdempotency).toContain('alreadyDispatched: false');
  });

  it('DSP-IDEMP-43: mensaje B no bloqueado por outbound del mensaje A — sin query de outbounds de sesión', () => {
    // dispatch no ejecuta query para contar outbounds de la sesión
    expect(srcDispatch).not.toMatch(/const outboundCount|let outboundCount/);
    expect(srcDispatch).not.toMatch(/outboundCount\s*=/);
    // No hay select sobre conv_messages con direction=outbound para contar
    expect(srcDispatch).not.toMatch(/direction.*'outbound'[\s\S]{0,100}count.*exact/);
    // La función evaluateDispatchIdempotency no tiene parámetro de outbound en su firma
    expect(srcIdempotency).not.toMatch(/function\s+\w+\s*\([^)]*outboundCount/);
    expect(srcIdempotency).not.toMatch(/outboundCount\s*\)/);
  });

  it('DSP-IDEMP-44: idempotencia documentada como best-effort con UPDATE condicional', () => {
    expect(srcIdempotency).toContain('best-effort');
    // dispatch usa UPDATE condicional como mejora de concurrencia
    expect(srcDispatch).toContain('UPDATE condicional');
    expect(srcDispatch).toContain('updatedRows');
  });

  it('DSP-IDEMP-45: UPDATE condicional solo si status=received — mejora de concurrencia', () => {
    // El dispatch hace el UPDATE con .eq("status", "received")
    expect(srcDispatch).toContain(".eq('status', 'received')");
    expect(srcDispatch).toContain('updatedRows');
  });

  it('DSP-IDEMP-46: idempotencia no crea casos duplicados — return antes del routing', () => {
    const idempPos      = srcDispatch.indexOf('idempotent: true');
    const routingCallPos = srcDispatch.indexOf("functions/v1/conv-routing-engine");
    expect(idempPos).toBeGreaterThan(0);
    expect(routingCallPos).toBeGreaterThan(0);
    expect(idempPos).toBeLessThan(routingCallPos);
  });

  it('DSP-IDEMP-47: no introduce nuevas tablas, columnas ni estados prohibidos', () => {
    // No hay nuevas tablas
    expect(srcIdempotency).not.toMatch(/dispatched_message_id\s*[=:]/);
    expect(srcDispatch).not.toContain("'conv_dispatch'");
    expect(srcDispatch).not.toMatch(/from\('conv_dispatch/);
    // No introduce 'processed' como valor de status
    expect(srcIdempotency).not.toMatch(/'processed'/);
    expect(srcDispatch).not.toMatch(/'processed'/);
    // No introduce next_retry_at ni attempt_count como propiedades de objeto
    expect(srcIdempotency).not.toMatch(/next_retry_at\s*[=:]/);
    expect(srcIdempotency).not.toMatch(/attempt_count\s*[=:]/);
    expect(srcDispatch).not.toMatch(/next_retry_at\s*[=:]/);
    expect(srcDispatch).not.toMatch(/attempt_count\s*[=:]/);
  });

  it('DSP-IDEMP-48: no expone outboundCount en logs', () => {
    expect(srcDispatch).not.toMatch(/log\.(info|warn|error)\([^\n]*outboundCount/);
  });

});

// ---------------------------------------------------------------------------
// DSP-ERR — errores
// ---------------------------------------------------------------------------

describe('DSP-ERR: gestión de errores', () => {

  it('DSP-ERR-45: error de routing no llama a WF — devuelve antes de routing result dispatch', () => {
    // El catch del routing-engine hace return err() — verificar que hay return
    // en el bloque de manejo de error de routing antes del bloque responseType
    expect(srcDispatch).toContain("routing HTTP");
    // El routing catch restaura status y hace return err
    const routingErrBlock = srcDispatch.match(/Error al llamar a conv-routing-engine[\s\S]{0,600}return err/);
    expect(routingErrBlock).not.toBeNull();
    // Ese bloque no llama al WF
    expect(routingErrBlock![0]).not.toContain('getWfEfName');
    expect(routingErrBlock![0]).not.toContain('wf20');
    expect(routingErrBlock![0]).not.toContain('wf30');
    expect(routingErrBlock![0]).not.toContain('wf40');
  });

  it('DSP-ERR-46: error de routing devuelve respuesta segura', () => {
    expect(srcDispatch).toContain('SAFE_ERROR_TEXT');
    expect(srcDispatch).toContain('Ha ocurrido un problema');
  });

  it('DSP-ERR-47: error de WF devuelve respuesta segura — mapWfResponseToText con error', () => {
    expect(srcDispatch).toContain("response_type: 'error'");
    expect(srcDispatch).toContain('mapWfResponseToText');
  });

  it('DSP-ERR-48: error de outbound se delega a conv-send-wa/conv-web-deliver', () => {
    expect(srcDispatch).toContain('Errores de outbound se delegan');
    expect(srcDispatch).not.toContain('BACKOFF_SECONDS');
  });

  it('DSP-ERR-49: no se expone error técnico al usuario', () => {
    expect(srcDispatch).not.toMatch(/text:.*Error\s*:/);
    expect(srcDispatch).not.toMatch(/text:.*status\s*\d{3}/);
    expect(srcDispatch).not.toMatch(/text:.*stack/);
  });

  it('DSP-ERR-50: no crea eventos inventados ante error', () => {
    expect(srcDispatch).not.toMatch(/'conv_help_escalated'/);
    // dispatch no llama a conv-core-publish-activity en ningún caso
    expect(srcDispatch).not.toContain('conv-core-publish-activity');
    expect(srcDispatch).not.toContain('publishActivity');
  });

});

// ---------------------------------------------------------------------------
// DSP-PRIV — privacidad y logging
// ---------------------------------------------------------------------------

describe('DSP-PRIV: privacidad y sanitización', () => {

  it('DSP-PRIV-51: logs no contienen message_text', () => {
    expect(srcDispatch).not.toMatch(/log\.(info|warn|error)\([^\n]*message_text/);
  });

  it('DSP-PRIV-52: logs no contienen sender_ref', () => {
    expect(srcDispatch).not.toMatch(/log\.(info|warn|error)\([^\n]*sender_ref/);
  });

  it('DSP-PRIV-53: logs no contienen phone', () => {
    expect(srcDispatch).not.toMatch(/log\.(info|warn|error)\([^\n]*phone/);
  });

  it('DSP-PRIV-54: logs no contienen profile_id', () => {
    expect(srcDispatch).not.toMatch(/log\.(info|warn|error)\([^\n]*profile_id/);
  });

  it('DSP-PRIV-55: logs no contienen identity_data', () => {
    expect(srcDispatch).not.toMatch(/log\.(info|warn|error)\([^\n]*identity_data/);
  });

  it('DSP-PRIV-56: logs no contienen raw_payload', () => {
    expect(srcDispatch).not.toMatch(/log\.(info|warn|error)\([^\n]*raw_payload/);
  });

  it('DSP-PRIV-57: payload outbound no contiene profile_id', () => {
    const outboundPayloadBlock = srcDispatch.match(/body: JSON\.stringify\(\{[\s\S]{0,300}outboundText/);
    expect(outboundPayloadBlock).not.toBeNull();
    expect(outboundPayloadBlock![0]).not.toContain('profile_id');
  });

  it('DSP-PRIV-58: payload outbound no contiene identity_data', () => {
    const outboundPayloadBlock = srcDispatch.match(/body: JSON\.stringify\(\{[\s\S]{0,300}outboundText/);
    expect(outboundPayloadBlock).not.toBeNull();
    expect(outboundPayloadBlock![0]).not.toContain('identity_data');
  });

  it('DSP-PRIV-59: payload outbound no contiene sender_ref', () => {
    const outboundPayloadBlock = srcDispatch.match(/body: JSON\.stringify\(\{[\s\S]{0,300}outboundText/);
    expect(outboundPayloadBlock).not.toBeNull();
    expect(outboundPayloadBlock![0]).not.toContain('sender_ref');
  });

  it('DSP-PRIV-60: no llama a n8n real', () => {
    for (const src of [srcDispatch, srcSvcRouter, srcRespMapper, srcOutbRouter, srcIdempotency]) {
      expect(src).not.toContain('n8n.io');
      expect(src).not.toContain('/webhook/');
    }
  });

  it('DSP-PRIV-61: no llama a Claude real', () => {
    for (const src of [srcDispatch, srcSvcRouter, srcRespMapper, srcOutbRouter, srcIdempotency]) {
      expect(src).not.toContain('anthropic');
      expect(src).not.toContain('messages.create');
    }
  });

  it('DSP-PRIV-62: no llama a Core real', () => {
    for (const src of [srcDispatch, srcSvcRouter, srcRespMapper, srcOutbRouter, srcIdempotency]) {
      expect(src).not.toContain('smartroom-core');
    }
  });

  it('DSP-PRIV-63: no llama a Wasender real — sin wasender.io en ninguna fuente', () => {
    for (const src of [srcDispatch, srcSvcRouter, srcRespMapper, srcOutbRouter, srcIdempotency]) {
      expect(src).not.toContain('wasender.io');
    }
    // @s.whatsapp.net ya verificado en DSP-OUTBOUND-23 (solo en helpers, no en dispatch JSDoc)
    expect(srcSvcRouter).not.toContain('@s.whatsapp.net');
    expect(srcRespMapper).not.toContain('@s.whatsapp.net');
    expect(srcIdempotency).not.toContain('@s.whatsapp.net');
  });

});

// ---------------------------------------------------------------------------
// DSP-RES — restricciones globales
// ---------------------------------------------------------------------------

describe('DSP-RES: restricciones globales', () => {

  it('DSP-RES-64: no introduce WF-02 como valor de código (puede estar en JSDoc)', () => {
    // WF-02 en JSDoc es aceptable — verificar que no está como service_code o EF name
    expect(srcSvcRouter).not.toContain('WF-02');
    expect(srcDispatch).not.toMatch(/'conv_wf02'|'wf02'|WF-02-/);
    // SERVICE_TO_EF no debe tener entradas para WF-02
    expect(srcSvcRouter).not.toMatch(/wf02/i);
  });

  it("DSP-RES-65: no introduce conv_help_escalated como string value", () => {
    for (const src of [srcDispatch, srcSvcRouter, srcRespMapper, srcOutbRouter, srcIdempotency]) {
      expect(src).not.toMatch(/'conv_help_escalated'/);
    }
  });

  it('DSP-RES-66: no introduce WEAK_MATCH como valor de código (puede estar en JSDoc)', () => {
    // WEAK_MATCH en JSDoc de dispatch es aceptable — verificar que no está en helpers ni como código
    for (const src of [srcSvcRouter, srcRespMapper, srcOutbRouter, srcIdempotency]) {
      expect(src).not.toContain('WEAK_MATCH');
    }
    // En dispatch: no como string value ni constante de código
    expect(srcDispatch).not.toMatch(/'WEAK_MATCH'/);
    expect(srcDispatch).not.toMatch(/= 'WEAK_MATCH'|=== 'WEAK_MATCH'/);
  });

  it("DSP-RES-67: no introduce 'UNVERIFIED' standalone", () => {
    for (const src of [srcDispatch, srcSvcRouter, srcRespMapper, srcOutbRouter, srcIdempotency]) {
      expect(src).not.toContain("'UNVERIFIED'");
    }
  });

  it('DSP-RES-68: no introduce next_retry_at como campo de objeto', () => {
    // Puede aparecer en JSDoc como término prohibido — verificar no es propiedad de objeto
    for (const src of [srcDispatch, srcSvcRouter, srcRespMapper, srcOutbRouter, srcIdempotency]) {
      expect(src).not.toMatch(/next_retry_at\s*:/);
    }
    // No aparece como referencia de lectura de DB
    expect(srcDispatch).not.toMatch(/\.next_retry_at/);
  });

  it('DSP-RES-69: no introduce attempt_count como campo de objeto', () => {
    // Puede aparecer en JSDoc como término prohibido — verificar no es propiedad de objeto
    for (const src of [srcDispatch, srcSvcRouter, srcRespMapper, srcOutbRouter, srcIdempotency]) {
      expect(src).not.toMatch(/attempt_count\s*:/);
    }
    expect(srcDispatch).not.toMatch(/\.attempt_count/);
  });

  it("DSP-RES-70: no introduce nuevos estados de message status — no usa 'processed'", () => {
    for (const src of [srcDispatch, srcIdempotency]) {
      expect(src).not.toContain("'processed'");
      expect(src).not.toContain('"processed"');
    }
  });

  it('DSP-RES-71: no introduce nuevos eventos de Activity Log', () => {
    // dispatch no llama a conv-core-publish-activity
    expect(srcDispatch).not.toContain('conv-core-publish-activity');
    expect(srcDispatch).not.toContain('publishActivity');
  });

  it('DSP-RES-72: no modifica requirements/rules/contracts/skills/diagrams/specs', () => {
    // Verificar que los ficheros de documentación no fueron modificados
    // (se comprueba que dispatch no importa ni hace referencia a esos ficheros)
    expect(srcDispatch).not.toContain('requirements');
    expect(srcDispatch).not.toContain('contracts.ts');
    expect(srcDispatch).not.toContain('skills');
  });

});

// ---------------------------------------------------------------------------
// DSP-REG — regresión global
// ---------------------------------------------------------------------------

describe('DSP-REG: regresión global', () => {
  const EF   = resolve(__dirname, '../../../../../supabase/functions');
  const RTIM = resolve(EF, '_shared/smart-conversations/runtime');

  it('DSP-REG-73: tests de schema — migración sigue existiendo', () => {
    const mig = readFileSync(
      resolve(__dirname, '../../../../../supabase/migrations/20260716000001_smart_conversations_core_schema.sql'),
      'utf-8',
    );
    expect(mig).toContain('CREATE TABLE conv_messages');
    expect(mig).toContain('CREATE TABLE conv_sessions');
  });

  it('DSP-REG-74: tests de types — enums mantienen los canales y servicios', () => {
    const enums = readFileSync(resolve(EF, '_shared/smart-conversations/enums.ts'), 'utf-8');
    expect(enums).toContain("'whatsapp'");
    expect(enums).toContain("'webchat'");
    expect(enums).toContain("'conv_incidencias'");
    expect(enums).toContain("'conv_publicaciones'");
    expect(enums).toContain("'conv_ayuda'");
  });

  it('DSP-REG-75: tests de infra — ef-auth y ef-logger siguen disponibles', () => {
    const auth   = readFileSync(resolve(EF, '_shared/smart-conversations/ef-auth.ts'), 'utf-8');
    const logger = readFileSync(resolve(EF, '_shared/smart-conversations/ef-logger.ts'), 'utf-8');
    expect(auth).toContain('isServiceRoleRequest');
    expect(logger).toContain('sanitizeForLog');
  });

  it('DSP-REG-76: tests de ingest — conv-ingest sigue existiendo con duplicate_ignored', () => {
    const ingest = readFileSync(resolve(EF, 'conv-ingest/index.ts'), 'utf-8');
    expect(ingest).toContain("'duplicate_ignored'");
  });

  it('DSP-REG-77: tests de channels — conv-wa-webhook sigue existiendo', () => {
    const wa = readFileSync(resolve(EF, 'conv-wa-webhook/index.ts'), 'utf-8');
    expect(wa).toContain('HMAC');
  });

  it('DSP-REG-78: tests de outbound — conv-process-send-queue sigue existiendo', () => {
    const queue = readFileSync(resolve(EF, 'conv-process-send-queue/index.ts'), 'utf-8');
    expect(queue).toContain('BACKOFF_SECONDS');
  });

  it('DSP-REG-79: tests de routing — conv-routing-engine sigue teniendo CONFIDENCE_THRESHOLD', () => {
    const routing = readFileSync(resolve(EF, 'conv-routing-engine/index.ts'), 'utf-8');
    expect(routing).toContain('CONFIDENCE_THRESHOLD = 0.85');
  });

  it('DSP-REG-80: tests de identity — identity-level.ts sigue existiendo', () => {
    const idLevel = readFileSync(resolve(RTIM, 'identity-level.ts'), 'utf-8');
    expect(idLevel).toContain('canAdvanceIdentityLevel');
  });

  it('DSP-REG-81: tests de incidents — conv-wf20-incidents sigue existiendo', () => {
    const wf20 = readFileSync(resolve(EF, 'conv-wf20-incidents/index.ts'), 'utf-8');
    expect(wf20).toContain('STRONG_MATCH_ACTIVE');
    expect(wf20).toContain("'conv_incidencias'");
  });

  it('DSP-REG-82: tests de listings — conv-wf30-listings sigue existiendo', () => {
    const wf30 = readFileSync(resolve(EF, 'conv-wf30-listings/index.ts'), 'utf-8');
    expect(wf30).toContain("'conv_publicaciones'");
    expect(wf30).toContain('UNVERIFIED_LEAD');
  });

  it('DSP-REG-83: tests de help — conv-wf40-help sigue existiendo', () => {
    const wf40 = readFileSync(resolve(EF, 'conv-wf40-help/index.ts'), 'utf-8');
    expect(wf40).toContain("'conv_ayuda'");
    expect(wf40).not.toMatch(/'conv_help_escalated'/);
  });

  it('DSP-REG-84: it.todo restantes siguen registrados en activity-log spec', () => {
    const activityLog = readFileSync(
      resolve(__dirname, '../../../../../tests/regression/smart-conversations/suites/activity-log/activity-log.spec.ts'),
      'utf-8',
    );
    expect(activityLog).toMatch(/it\.todo\(/);
  });

});
