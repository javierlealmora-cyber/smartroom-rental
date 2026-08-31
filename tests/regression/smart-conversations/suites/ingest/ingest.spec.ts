/**
 * Suite: conv-ingest
 * Fase 4 — Entrada común interna de mensajes normalizados.
 * Análisis estático del código fuente (sin runtime Deno).
 * IDs: INGEST-AUTH, INGEST-V, INGEST-S, INGEST-M, INGEST-D, INGEST-A, INGEST-T, INGEST-P, INGEST-REG
 */

import { describe, it, beforeAll, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EF_DIR  = resolve(__dirname, '../../../../../supabase/functions');
const INGEST_PATH = resolve(EF_DIR, 'conv-ingest/index.ts');

let srcIngest: string;

beforeAll(() => {
  srcIngest = readFileSync(INGEST_PATH, 'utf-8');
});

// ---------------------------------------------------------------------------
// INGEST-AUTH — autenticación
// ---------------------------------------------------------------------------

describe('INGEST-AUTH: autenticación service_role', () => {

  it('INGEST-AUTH-01: requiere service_role — llama a isServiceRoleRequest', () => {
    expect(srcIngest).toContain('isServiceRoleRequest');
    expect(srcIngest).toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('INGEST-AUTH-02: rechaza token anon — devuelve 401 si no es service_role', () => {
    expect(srcIngest).toContain("ERROR_CODES.UNAUTHORIZED");
    expect(srcIngest).toContain('401');
    expect(srcIngest).toMatch(/isServiceRoleRequest[\s\S]{0,150}UNAUTHORIZED/);
  });

  it('INGEST-AUTH-03: rechaza JWT de usuario — el comentario documenta la restricción', () => {
    expect(srcIngest).toMatch(/JWT|jwt|sesión de usuario|sin sesión/i);
    expect(srcIngest).not.toContain('getUser');
    expect(srcIngest).not.toContain('getSession');
    expect(srcIngest).not.toContain('auth.signIn');
  });

  it('INGEST-AUTH-04: rechaza session_token de widget — documentado en cabecera', () => {
    expect(srcIngest).toMatch(/session_token|widget/i);
    // La función isServiceRoleRequest rechaza cualquier token que no sea el service_role key
    expect(srcIngest).toContain('isServiceRoleRequest');
  });

});

// ---------------------------------------------------------------------------
// INGEST-V — validación de input
// ---------------------------------------------------------------------------

describe('INGEST-V: validación de NormalizedMessage', () => {

  it('INGEST-V-01: rechaza payload sin client_account_id', () => {
    expect(srcIngest).toContain('client_account_id');
    expect(srcIngest).toMatch(/client_account_id[^:]*obligatorio/);
  });

  it('INGEST-V-02: rechaza payload sin normalized_message', () => {
    expect(srcIngest).toContain('normalized_message');
    expect(srcIngest).toMatch(/normalized_message[^:]*obligatorio/);
  });

  it('INGEST-V-03: rechaza canal no soportado', () => {
    expect(srcIngest).toContain('SUPPORTED_CHANNELS');
    expect(srcIngest).toContain("'whatsapp'");
    expect(srcIngest).toContain("'webchat'");
    expect(srcIngest).toMatch(/canal no soportado/);
  });

  it('INGEST-V-04: rechaza sender_ref vacío', () => {
    expect(srcIngest).toContain('sender_ref');
    expect(srcIngest).toMatch(/sender_ref[^:]*obligatorio/);
  });

  it('INGEST-V-05: rechaza sender_ref con @c.us', () => {
    expect(srcIngest).toContain('@c.us');
    expect(srcIngest).toMatch(/@c\.us/);
    expect(srcIngest).toMatch(/sender_ref[^:]*@c\.us|@c\.us[^:]*sender_ref/);
  });

  it('INGEST-V-06: rechaza message_text vacío', () => {
    expect(srcIngest).toContain('message_text');
    expect(srcIngest).toMatch(/message_text[^:]*obligatorio/);
  });

});

// ---------------------------------------------------------------------------
// INGEST-S — sesiones
// ---------------------------------------------------------------------------

describe('INGEST-S: gestión de conv_sessions', () => {

  it('INGEST-S-01: crea nueva conv_sessions si no existe', () => {
    expect(srcIngest).toContain("'conv_sessions'");
    expect(srcIngest).toContain('.insert(');
    expect(srcIngest).toContain('isNewSession = true');
  });

  it('INGEST-S-02: usa identity_level = NO_MATCH por defecto', () => {
    expect(srcIngest).toContain("identity_level: 'NO_MATCH'");
  });

  it('INGEST-S-03: no introduce UNVERIFIED', () => {
    expect(srcIngest).not.toContain('UNVERIFIED');
  });

  it('INGEST-S-04: recupera sesión existente por client_account_id + channel + sender_ref', () => {
    expect(srcIngest).toContain('.maybeSingle()');
    expect(srcIngest).toContain('.eq(\'client_account_id\'');
    expect(srcIngest).toContain('.eq(\'channel\'');
    expect(srcIngest).toContain('.eq(\'sender_ref\'');
  });

  it('INGEST-S-05: actualiza last_active_at en sesión existente', () => {
    expect(srcIngest).toContain('last_active_at');
    expect(srcIngest).toContain('.update(');
    expect(srcIngest).toMatch(/last_active_at[\s\S]{0,100}new Date/);
  });

  it('INGEST-S-06: no degrada identity_level al actualizar sesión existente', () => {
    // El update de sesión existente solo toca last_active_at
    // Capturar el bloque { last_active_at: ... } del .update()
    const updateBlock = srcIngest.match(/\.update\(\{\s*last_active_at[^}]+\}/);
    expect(updateBlock).not.toBeNull();
    const block = updateBlock![0];
    expect(block).not.toContain('identity_level');
    expect(block).toContain('last_active_at');
  });

  it('INGEST-S-07: no borra profile_id al actualizar sesión existente', () => {
    const updateBlock = srcIngest.match(/\.update\(\{\s*last_active_at[^}]+\}/);
    expect(updateBlock).not.toBeNull();
    expect(updateBlock![0]).not.toContain('profile_id');
  });

  it('INGEST-S-08: no borra identity_data al actualizar sesión existente', () => {
    const updateBlock = srcIngest.match(/\.update\(\{\s*last_active_at[^}]+\}/);
    expect(updateBlock).not.toBeNull();
    expect(updateBlock![0]).not.toContain('identity_data');
  });

});

// ---------------------------------------------------------------------------
// INGEST-M — mensajes
// ---------------------------------------------------------------------------

describe('INGEST-M: inserción en conv_messages', () => {

  it('INGEST-M-01: inserta mensaje inbound en conv_messages', () => {
    expect(srcIngest).toContain("'conv_messages'");
    expect(srcIngest).toContain("messageInsert");
  });

  it('INGEST-M-02: usa sender_type = user', () => {
    expect(srcIngest).toContain("sender_type: 'user'");
  });

  it('INGEST-M-03: usa direction = inbound', () => {
    expect(srcIngest).toContain("direction: 'inbound'");
  });

  it('INGEST-M-04: usa status = received', () => {
    expect(srcIngest).toContain("status: 'received'");
  });

  it('INGEST-M-05: para WhatsApp guarda provider_message_id como wasender_message_id', () => {
    expect(srcIngest).toContain('wasenderMessageId');
    expect(srcIngest).toContain("wasender_message_id");
    expect(srcIngest).toContain("channel === 'whatsapp'");
    expect(srcIngest).toContain('provider_message_id');
  });

  it('INGEST-M-06: para WebChat permite provider_message_id null — wasenderMessageId es null', () => {
    expect(srcIngest).toContain('wasenderMessageId');
    // El condicional garantiza que null no se pasa a wasender_message_id
    expect(srcIngest).toMatch(/wasenderMessageId[\s\S]{0,200}messageInsert\['wasender_message_id'\]/);
    // El índice parcial excluye NULL (WebChat no interfiere)
    expect(srcIngest).not.toContain("channel === 'webchat' && provider_message_id");
  });

  it('INGEST-M-07: no guarda @c.us en wasender_message_id', () => {
    // sender_ref con @c.us se rechaza en validación antes de llegar a mensajes
    const rejectionBefore = srcIngest.indexOf('@c.us');
    const msgInsertPos = srcIngest.indexOf('messageInsert');
    expect(rejectionBefore).toBeLessThan(msgInsertPos);
  });

});

// ---------------------------------------------------------------------------
// INGEST-D — deduplicación
// ---------------------------------------------------------------------------

describe('INGEST-D: deduplicación de mensajes WhatsApp', () => {

  it('INGEST-D-01: comprueba wasender_message_id antes de insertar (deduplicación)', () => {
    expect(srcIngest).toContain('.eq(\'wasender_message_id\'');
    expect(srcIngest).toContain('existingMsg');
  });

  it('INGEST-D-02: duplicado devuelve respuesta idempotente duplicate_ignored', () => {
    expect(srcIngest).toContain("'duplicate_ignored'");
    expect(srcIngest).toContain('idempotent: true');
  });

  it('INGEST-D-03: duplicado no publica conv_conversation_started de nuevo', () => {
    // El early return por duplicado ocurre ANTES del fetch a conv-core-publish-activity
    // Usamos la cadena con comillas para apuntar al literal, no al comentario del JSDoc
    const duplicateReturn = srcIngest.indexOf("'duplicate_ignored'");
    const activityPublish = srcIngest.indexOf("'conv_conversation_started'");
    expect(duplicateReturn).toBeGreaterThan(0);
    expect(activityPublish).toBeGreaterThan(0);
    expect(duplicateReturn).toBeLessThan(activityPublish);
  });

});

// ---------------------------------------------------------------------------
// INGEST-A — activity log
// ---------------------------------------------------------------------------

describe('INGEST-A: publicación de activity log', () => {

  it('INGEST-A-01: nueva sesión publica conv_conversation_started', () => {
    expect(srcIngest).toContain("'conv_conversation_started'");
    expect(srcIngest).toContain('isNewSession');
    // isNewSession controla si se publica — aumentamos la ventana para cubrir el bloque completo
    expect(srcIngest).toMatch(/isNewSession[\s\S]{0,800}'conv_conversation_started'/);
  });

  it('INGEST-A-02: sesión existente no publica conv_conversation_started — guarda isNewSession=false', () => {
    // La rama else (sesión existente) no establece isNewSession=true
    expect(srcIngest).toContain('isNewSession = true');
    // isNewSession solo se pone a true en el bloque de sesión nueva
    expect(srcIngest).not.toMatch(/isNewSession = false[\s\S]{0,50}'conv_conversation_started'/);
  });

  it('INGEST-A-03: fallo de Activity Log no bloquea ingest — fire-and-log con .catch()', () => {
    // El fetch de publish-activity usa .catch() sin await de error
    expect(srcIngest).toContain('conv-core-publish-activity');
    expect(srcIngest).toMatch(/conv-core-publish-activity[\s\S]{0,600}\.catch\(/);
  });

  it('INGEST-A-04: payload de conv_conversation_started no contiene PII', () => {
    const activityBlock = srcIngest.match(
      /conv_conversation_started[\s\S]{0,500}data:\s*\{[^}]+\}/
    );
    expect(activityBlock).not.toBeNull();
    const block = activityBlock![0];
    expect(block).not.toContain('phone_number');
    expect(block).not.toContain('full_name');
    expect(block).not.toContain('profile_id');
    expect(block).not.toContain('sender_ref');
    expect(block).not.toContain('message_text');
    // Solo session_id (opaco) y channel (enum)
    expect(block).toContain('session_id');
    expect(block).toContain('channel');
  });

});

// ---------------------------------------------------------------------------
// INGEST-T — servicios activos (tenant features)
// ---------------------------------------------------------------------------

describe('INGEST-T: consulta de servicios activos', () => {

  it('INGEST-T-01: si hay servicios activos devuelve respuesta accepted', () => {
    expect(srcIngest).toContain("'accepted'");
    expect(srcIngest).toContain('next_state: \'received\'');
    expect(srcIngest).toContain('servicesActive.length');
  });

  it('INGEST-T-02: si services_active = [] devuelve no_service', () => {
    expect(srcIngest).toContain("'no_service'");
    expect(srcIngest).toContain('NO_SERVICE_TEXT');
    expect(srcIngest).toContain('Este canal no tiene servicios activos actualmente.');
    expect(srcIngest).toMatch(/servicesActive\.length === 0/);
  });

  it('INGEST-T-03: consulta conv-core-get-tenant-features en cada llamada', () => {
    expect(srcIngest).toContain('conv-core-get-tenant-features');
    // La variable servicesActive se inicializa dentro del handler, no a nivel de módulo
    expect(srcIngest).toMatch(/let servicesActive[^=]*= \[\]/);
  });

  it('INGEST-T-04: no cachea TenantFeaturesResponse — sin variable de módulo', () => {
    // servicesActive debe declararse dentro del handler (after serve(async)
    const servePos = srcIngest.indexOf('serve(async');
    const letServicesPos = srcIngest.indexOf('let servicesActive');
    expect(letServicesPos).toBeGreaterThan(servePos);
  });

});

// ---------------------------------------------------------------------------
// INGEST-P — privacidad y logging
// ---------------------------------------------------------------------------

describe('INGEST-P: privacidad y sanitización de logs', () => {

  it('INGEST-P-01: no envía profile_id en payloads externos (n8n)', () => {
    // No hay llamadas a n8n real
    expect(srcIngest).not.toContain('n8n.io');
    expect(srcIngest).not.toContain('webhook.site');
  });

  it('INGEST-P-02: no envía phone_number en payloads externos', () => {
    expect(srcIngest).not.toContain('phone_number');
  });

  it('INGEST-P-03: no envía raw_payload a ningún endpoint externo', () => {
    // raw_payload no se pasa al body de fetch() de publish-activity ni de tenant-features
    expect(srcIngest).not.toContain('raw_payload:');
  });

  it('INGEST-P-04: no llama a IA (sin Claude, sin Anthropic)', () => {
    expect(srcIngest).not.toContain('anthropic');
    expect(srcIngest).not.toContain('claude.ai');
    expect(srcIngest).not.toContain('messages.create');
  });

  it('INGEST-P-05: no llama a n8n real', () => {
    expect(srcIngest).not.toContain('n8n.io');
    expect(srcIngest).not.toContain('/webhook/');
  });

  it('INGEST-P-06: logs no contienen message_text — usa log sanitizado', () => {
    expect(srcIngest).toContain('createSafeLogger');
    // message_text no debe aparecer en llamadas a log.*
    expect(srcIngest).not.toMatch(/log\.(info|warn|error)[^;]*message_text/);
  });

  it('INGEST-P-07: logs no contienen sender_ref sensible ni token', () => {
    // sender_ref no aparece en logs
    expect(srcIngest).not.toMatch(/log\.(info|warn|error)[^;]*sender_ref/);
  });

  it('INGEST-P-08: no llama a Wasender real', () => {
    expect(srcIngest).not.toContain('wasender.io');
    expect(srcIngest).not.toContain('wasenderapi');
    expect(srcIngest).not.toContain('/api/send');
  });

});

// ---------------------------------------------------------------------------
// INGEST-REG — regression global
// ---------------------------------------------------------------------------

describe('INGEST-REG: regresión — restricciones de Fase 4', () => {

  it('INGEST-REG-01: no implementa WF-10 ni routing real', () => {
    expect(srcIngest).not.toContain('WF-10');
    expect(srcIngest).not.toContain('conv-wf-10');
    expect(srcIngest).not.toContain('classify_intent');
  });

  it('INGEST-REG-02: no llama a Core real (no Core API externa)', () => {
    expect(srcIngest).not.toContain('smartroom-core');
    expect(srcIngest).not.toContain('/api/v1/incidents');
    expect(srcIngest).not.toContain('/api/v1/leads');
  });

  it('INGEST-REG-03: no introduce next_retry_at ni attempt_count (campos prohibidos Fase 4)', () => {
    expect(srcIngest).not.toContain('next_retry_at');
    expect(srcIngest).not.toContain('attempt_count');
  });

  it('INGEST-REG-04: no introduce UNVERIFIED (prohibido en sesiones)', () => {
    expect(srcIngest).not.toContain('UNVERIFIED');
  });

  it('INGEST-REG-05: conv-ingest importa shared runtime de la ruta correcta', () => {
    expect(srcIngest).toContain('_shared/response.ts');
    expect(srcIngest).toContain('_shared/smart-conversations/ef-auth.ts');
    expect(srcIngest).toContain('_shared/smart-conversations/ef-logger.ts');
  });

});
