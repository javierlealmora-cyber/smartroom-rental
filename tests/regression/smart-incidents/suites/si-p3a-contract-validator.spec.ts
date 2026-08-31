/**
 * si-p3a-contract-validator.spec.ts — SI-P3A: Tests runtime del validador provider v1.0.
 *
 * OFFLINE ONLY: Importa funciones puras sin Deno.env, sin fetch, sin DB.
 * Fuente canónica: docs/smart-incidents/contracts/contract-create-incident-request.md
 *
 * 95 tests activos. 0 it.todo. 0 tests deshabilitados.
 */

import { describe, it, expect } from 'vitest';

import {
  validateCreateIncidentRequest,
} from '../../../../supabase/functions/_shared/smart-incidents/validator.ts';

import {
  PROVIDER_ERROR_CODES,
  getHttpStatus,
  isRetryable,
  getSafeMessage,
  buildProviderErrorResponse,
} from '../../../../supabase/functions/_shared/smart-incidents/errors.ts';

import {
  buildFirstCreationResponse,
  buildReplayResponse,
} from '../../../../supabase/functions/_shared/smart-incidents/response-mapper.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures de UUID para tests
// ─────────────────────────────────────────────────────────────────────────────

const UUID_CLIENT   = 'f1e2d3c4-0000-0000-0000-000000000010';
const UUID_REQUEST  = 'a1b2c3d4-0000-0000-0000-000000000001';
const UUID_CORR     = 'b2c3d4e5-0000-0000-0000-000000000002';
const UUID_IDEM_KEY = 'c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8'; // 32 chars
const UUID_REQUESTER = 'c9d0e1f2-0000-0000-0000-000000000030';
const UUID_ACCOMM    = 'b5c6d7e8-0000-0000-0000-000000000020';
const UUID_ROOM      = 'd3e4f5a6-0000-0000-0000-000000000040';
const UUID_INCIDENT  = '7f8a9b0c-0000-0000-0000-000000000099';

/** Request v1.0 mínimo y válido (WhatsApp, room_id = null). */
function validRequest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    contract_version: '1.0',
    client_account_id: UUID_CLIENT,
    request_id: UUID_REQUEST,
    correlation_id: UUID_CORR,
    idempotency_key: UUID_IDEM_KEY,
    source_system: 'smart_conversations',
    source_channel: 'whatsapp',
    external_request_reference: null,
    actor: { type: 'system' },
    requester_profile_id: UUID_REQUESTER,
    incident: {
      title: 'Grifo del baño con fuga',
      description: 'El grifo del baño lleva dos días goteando continuamente.',
      accommodation_id: UUID_ACCOMM,
      room_id: null,
      category: 'maintenance',
      priority: 'normal',
    },
    ...overrides,
  };
}

/** Sobreescribe el objeto incident del fixture. */
function withIncident(inc: Record<string, unknown>): Record<string, unknown> {
  return validRequest({ incident: inc });
}

function validIncident(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: 'Grifo del baño con fuga',
    description: 'El grifo del baño lleva dos días goteando continuamente.',
    accommodation_id: UUID_ACCOMM,
    room_id: null,
    category: 'maintenance',
    priority: 'normal',
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO 1 — Requests válidos
// ─────────────────────────────────────────────────────────────────────────────

describe('SI-P3A-VALID — Requests válidos (contrato §5.1)', () => {

  it('SI-P3A-VALID-01: WhatsApp minimal — room_id null, attachments ausente', () => {
    const result = validateCreateIncidentRequest(validRequest());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.source_channel).toBe('whatsapp');
      expect(result.data.incident.room_id).toBeNull();
      expect(result.data.incident.priority).toBe('normal');
    }
  });

  it('SI-P3A-VALID-02: WebChat con room_id UUID y priority urgent', () => {
    const req = validRequest({
      source_channel: 'webchat',
      incident: validIncident({
        room_id: UUID_ROOM,
        priority: 'urgent',
        title: 'Seguridad: puerta sin cerrar',
        description: 'La puerta principal lleva horas sin cerrarse correctamente.',
        category: 'security',
      }),
    });
    const result = validateCreateIncidentRequest(req);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.source_channel).toBe('webchat');
      expect(result.data.incident.room_id).toBe(UUID_ROOM);
      expect(result.data.incident.priority).toBe('urgent');
    }
  });

  it('SI-P3A-VALID-03: room_id = null es válido', () => {
    const result = validateCreateIncidentRequest(validRequest({
      incident: validIncident({ room_id: null }),
    }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.incident.room_id).toBeNull();
  });

  it('SI-P3A-VALID-04: room_id = UUID válido', () => {
    const result = validateCreateIncidentRequest(validRequest({
      incident: validIncident({ room_id: UUID_ROOM }),
    }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.incident.room_id).toBe(UUID_ROOM);
  });

  it('SI-P3A-VALID-05: priority = normal', () => {
    const result = validateCreateIncidentRequest(validRequest());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.incident.priority).toBe('normal');
  });

  it('SI-P3A-VALID-06: priority = urgent', () => {
    const result = validateCreateIncidentRequest(validRequest({
      incident: validIncident({ priority: 'urgent' }),
    }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.incident.priority).toBe('urgent');
  });

  it('SI-P3A-VALID-07: attachments ausente — equivalente a []', () => {
    const inc = validIncident();
    delete inc['attachments'];
    const result = validateCreateIncidentRequest(withIncident(inc));
    expect(result.ok).toBe(true);
  });

  it('SI-P3A-VALID-08: attachments = [] explícito', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ attachments: [] }),
    ));
    expect(result.ok).toBe(true);
  });

  it('SI-P3A-VALID-09: category = noise', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ category: 'noise', title: 'Ruido insoportable de vecinos', description: 'Los vecinos ponen música hasta las 4am continuamente.' }),
    ));
    expect(result.ok).toBe(true);
  });

  it('SI-P3A-VALID-10: category = security', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ category: 'security', title: 'Cerradura rota detectada', description: 'La cerradura principal del apartamento no cierra desde ayer.' }),
    ));
    expect(result.ok).toBe(true);
  });

  it('SI-P3A-VALID-11: category = billing', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ category: 'billing', title: 'Error en el cargo mensual', description: 'Se ha cobrado el doble del importe acordado en el contrato.' }),
    ));
    expect(result.ok).toBe(true);
  });

  it('SI-P3A-VALID-12: category = other', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ category: 'other', title: 'Otra incidencia registrada', description: 'Hay un problema que no encaja en ninguna categoría estándar.' }),
    ));
    expect(result.ok).toBe(true);
  });

  it('SI-P3A-VALID-13: idempotency_key de exactamente 16 chars (límite inferior)', () => {
    const result = validateCreateIncidentRequest(validRequest({ idempotency_key: 'a'.repeat(16) }));
    expect(result.ok).toBe(true);
  });

  it('SI-P3A-VALID-14: idempotency_key de exactamente 128 chars (límite superior)', () => {
    const result = validateCreateIncidentRequest(validRequest({ idempotency_key: 'z'.repeat(128) }));
    expect(result.ok).toBe(true);
  });

  it('SI-P3A-VALID-15: external_request_reference = null (campo presente)', () => {
    const result = validateCreateIncidentRequest(validRequest({ external_request_reference: null }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.external_request_reference).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO 2 — Restricciones estructurales (additionalProperties = false)
// ─────────────────────────────────────────────────────────────────────────────

describe('SI-P3A-STRUCT — Restricciones estructurales (§5.1)', () => {

  it('SI-P3A-STRUCT-01: propiedad adicional en raíz → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(validRequest({ unexpected_field: 'x' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('unexpected_field');
    }
  });

  it('SI-P3A-STRUCT-02: propiedad adicional en actor → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(validRequest({
      actor: { type: 'system', identity_level: 'STRONG_MATCH_ACTIVE' },
    }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toContain('actor');
    }
  });

  it('SI-P3A-STRUCT-03: propiedad adicional en incident → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ extra_prop: 'not_allowed' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toContain('incident');
    }
  });

  it('SI-P3A-STRUCT-04: actor.type ≠ system → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(validRequest({ actor: { type: 'system_service' } }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('actor.type');
    }
  });

  it('SI-P3A-STRUCT-05: actor.type = tenant → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(validRequest({ actor: { type: 'tenant' } }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('VALIDATION_ERROR');
  });

  it('SI-P3A-STRUCT-06: external_request_reference ≠ null → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(validRequest({ external_request_reference: 'some-ref' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('external_request_reference');
    }
  });

  it('SI-P3A-STRUCT-07: external_request_reference ausente → VALIDATION_ERROR', () => {
    const req = validRequest();
    delete req['external_request_reference'];
    const result = validateCreateIncidentRequest(req);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('VALIDATION_ERROR');
  });

  it('SI-P3A-STRUCT-08: source_system inválido → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(validRequest({ source_system: 'n8n_webhook' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('source_system');
    }
  });

  it('SI-P3A-STRUCT-09: source_channel inválido → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(validRequest({ source_channel: 'sms' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('source_channel');
    }
  });

  it('SI-P3A-STRUCT-10: input no es objeto → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest('not an object');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('VALIDATION_ERROR');
  });

  it('SI-P3A-STRUCT-11: input null → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('VALIDATION_ERROR');
  });

  it('SI-P3A-STRUCT-12: input array → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest([]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('VALIDATION_ERROR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO 3 — description obligatoria (§6.3)
// ─────────────────────────────────────────────────────────────────────────────

describe('SI-P3A-DESC — Campo description (§6.3)', () => {

  it('SI-P3A-DESC-01: description ausente → VALIDATION_ERROR', () => {
    const inc = validIncident();
    delete inc['description'];
    const result = validateCreateIncidentRequest(withIncident(inc));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('incident.description');
    }
  });

  it('SI-P3A-DESC-02: description = null → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ description: null }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('incident.description');
    }
  });

  it('SI-P3A-DESC-03: description < 10 chars → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ description: 'Corto' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('incident.description');
    }
  });

  it('SI-P3A-DESC-04: description exactamente 9 chars → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ description: '123456789' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('VALIDATION_ERROR');
  });

  it('SI-P3A-DESC-05: description > 4000 chars → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ description: 'a'.repeat(4001) }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('incident.description');
    }
  });

  it('SI-P3A-DESC-06: description = solo espacios → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ description: '          ' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('VALIDATION_ERROR');
  });

  it('SI-P3A-DESC-07: description con <script> → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ description: 'Problema: <script>alert(1)</script>' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('incident.description');
    }
  });

  it('SI-P3A-DESC-08: description con onclick= → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ description: '<div onclick=alert(1)>El grifo gotea continuamente</div>' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('VALIDATION_ERROR');
  });

  it('SI-P3A-DESC-09: description válida de 10 chars → OK', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ description: '1234567890' }),
    ));
    expect(result.ok).toBe(true);
  });

  it('SI-P3A-DESC-10: description válida de 4000 chars → OK', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ description: 'a'.repeat(4000) }),
    ));
    expect(result.ok).toBe(true);
  });

  it('SI-P3A-DESC-11: description tipo number → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ description: 42 }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('VALIDATION_ERROR');
  });

  // ─── Tests adversariales — política conservadora HTML §6.3 ───────────────
  // Sin sanitizador aprobado en el repo; política: texto plano, rechazar cualquier tag.
  // Los casos 12–17 son bypasses del denylist anterior (específico por tag).

  it('SI-P3A-DESC-12: <a href="javascript:"> → VALIDATION_ERROR (cualquier tag, política conservadora)', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ description: 'Haz clic aquí: <a href="javascript:alert(1)">enlace</a>' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('incident.description');
    }
  });

  it('SI-P3A-DESC-13: <img src=x onerror=alert(1)> → VALIDATION_ERROR (tag img no estaba en denylist anterior)', () => {
    // La implementación anterior solo bloqueaba: script|iframe|form|object|embed|svg|link|meta|base.
    // <img> no estaba en esa lista; era un bypass real.
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ description: 'Imagen de la avería: <img src=x onerror=alert(1)>' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('incident.description');
    }
  });

  it('SI-P3A-DESC-14: <svg onload=alert(1)> → VALIDATION_ERROR (cualquier tag)', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ description: 'Diagrama: <svg onload=alert(1)>fallo eléctrico en zona norte</svg>' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('incident.description');
    }
  });

  it('SI-P3A-DESC-15: <SCRIPT> en mayúsculas → VALIDATION_ERROR ([a-zA-Z] cubre mayúsculas)', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ description: 'Código malicioso: <SCRIPT>alert(1)</SCRIPT>' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('incident.description');
    }
  });

  it('SI-P3A-DESC-16: <b>texto benigno</b> → VALIDATION_ERROR (política conservadora: tag benigno también rechazado)', () => {
    // Con la política conservadora no se distingue entre tags benignos y ejecutables.
    // Cualquier markup HTML queda fuera del dominio "texto plano".
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ description: 'El grifo está <b>completamente roto</b> desde ayer.' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('incident.description');
    }
  });

  it('SI-P3A-DESC-17: <style>...</style> → VALIDATION_ERROR (bypass denylist anterior, capturado por política conservadora)', () => {
    // <style> no estaba en el denylist anterior: bypass confirmado.
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ description: 'CSS inyectado: <style>body{background:url(x)}</style>' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('incident.description');
    }
  });

  it('SI-P3A-DESC-18: <details ontoggle=alert(1)> → VALIDATION_ERROR (details no estaba en denylist anterior)', () => {
    // <details> no estaba en el denylist anterior: otro bypass real.
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ description: 'Detalles: <details ontoggle=alert(1)>problema en planta baja</details>' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('incident.description');
    }
  });

  it('SI-P3A-DESC-19: onclick= sin etiqueta envolvente → VALIDATION_ERROR (event handler standalone)', () => {
    // Cubre el caso donde el atributo de evento aparece sin un tag HTML.
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ description: 'onclick=alert(1) esta incidencia es urgente y necesita atención inmediata.' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('incident.description');
    }
  });

  it('SI-P3A-DESC-20: texto con < seguido de dígito → OK (no forma tag HTML)', () => {
    // "<" seguido de espacio o dígito no coincide con /<\/?[a-zA-Z]/, es texto plano legítimo.
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ description: 'La temperatura bajó a menos de < 5 grados durante la avería.' }),
    ));
    expect(result.ok).toBe(true);
  });

  it('SI-P3A-DESC-21: <img src=x> sin event handler → VALIDATION_ERROR (tag sin on*, bypass del denylist anterior)', () => {
    // La impl anterior dependía de HTML_EXECUTABLE_TAG_RE (img no estaba) + HTML_EVENT_HANDLER_RE (no hay on*).
    // Resultado en impl anterior: PERMITIDO. Con política conservadora: RECHAZADO.
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ description: 'Foto de la avería adjunta: <img src=x> ver imagen para más contexto.' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('incident.description');
    }
  });

  it('SI-P3A-DESC-22: <div onclick="x()">texto</div> → VALIDATION_ERROR (tag con handler entre comillas)', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ description: 'Avería registrada: <div onclick="x()">haz clic para detalles adicionales</div>' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('incident.description');
    }
  });

  it('SI-P3A-DESC-23: <SCRIPT > (espacio antes de >) → VALIDATION_ERROR (variante con espacio, capturada por [^>]*)', () => {
    // [^>]* incluye espacios; <SCRIPT > sigue siendo capturado por /<\/?[a-zA-Z][^>]*>/.
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ description: 'Inyección: <SCRIPT >alert(1)</SCRIPT >' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('incident.description');
    }
  });

  it('SI-P3A-DESC-24: < script> (espacio DESPUÉS de <) → OK — KNOWN_NON_HTML_INPUT_BEHAVIOR', () => {
    // Clasificación: KNOWN_NON_HTML_INPUT_BEHAVIOR (no es "contradicción").
    // /<\/?[a-zA-Z]/ requiere una letra inmediatamente después del < opcional /.
    // Un espacio entre < y el nombre del tag no coincide → el string pasa.
    // Los navegadores tampoco ejecutan < script> como tag (no es HTML válido ejecutable).
    // Límite conocido y documentado de la política conservadora v1.0; no es un bypass explotable.
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ description: '< script>alert(1)< /script> texto de descripción suficientemente largo.' }),
    ));
    // La descripción debe ser ≥10 chars. ¿Pasa? Depende solo de si el regex la rechaza.
    // El regex NO la rechaza → ok = true (límite documentado, no HTML ejecutable real).
    expect(result.ok).toBe(true);
  });

  it('SI-P3A-DESC-25: texto matemático "2 < 3 y 5 > 4" → OK (operadores, no tags HTML)', () => {
    // < seguido de dígito/espacio no coincide con /<\/?[a-zA-Z]/.
    // > suelto tampoco genera coincidencia de tag.
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ description: 'Lectura del sensor: el valor 2 < 3 y 5 > 4 indica funcionamiento normal.' }),
    ));
    expect(result.ok).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO 4 — title (§6.3, §8.6)
// ─────────────────────────────────────────────────────────────────────────────

describe('SI-P3A-TITLE — Campo title (§6.3, §8.6)', () => {

  it('SI-P3A-TITLE-01: title ausente → VALIDATION_ERROR', () => {
    const inc = validIncident();
    delete inc['title'];
    const result = validateCreateIncidentRequest(withIncident(inc));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('incident.title');
    }
  });

  it('SI-P3A-TITLE-02: title < 5 chars → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ title: 'Fuga' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('incident.title');
    }
  });

  it('SI-P3A-TITLE-03: title de exactamente 4 chars → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ title: 'Agua' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('VALIDATION_ERROR');
  });

  it('SI-P3A-TITLE-04: title > 120 chars → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ title: 'T'.repeat(121) }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('incident.title');
    }
  });

  it('SI-P3A-TITLE-05: title = solo espacios → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ title: '     ' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('VALIDATION_ERROR');
  });

  it('SI-P3A-TITLE-06: title con <img> → VALIDATION_ERROR (sin HTML)', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ title: 'Problema <img src=x> en el baño' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('incident.title');
    }
  });

  it('SI-P3A-TITLE-07: title con <b> (HTML no ejecutable) → VALIDATION_ERROR (title sin HTML)', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ title: 'Problema <b>grave</b> detectado' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('VALIDATION_ERROR');
  });

  it('SI-P3A-TITLE-08: title con @c.us (WA JID) → VALIDATION_ERROR (PII de canal)', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ title: 'Problema del usuario 34612345678@c.us en el baño' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('incident.title');
    }
  });

  it('SI-P3A-TITLE-09: title con sender_ref → VALIDATION_ERROR (PII de canal)', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ title: 'sender_ref del huésped registrado' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('VALIDATION_ERROR');
  });

  it('SI-P3A-TITLE-10: title válido de exactamente 5 chars → OK', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ title: 'Fuga!' }),
    ));
    expect(result.ok).toBe(true);
  });

  it('SI-P3A-TITLE-11: title válido de exactamente 120 chars → OK', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ title: 'M'.repeat(120) }),
    ));
    expect(result.ok).toBe(true);
  });

  // ── PII ampliada — email evidente, teléfono internacional, keywords ──────────

  it('SI-P3A-TITLE-12: title con email evidente → VALIDATION_ERROR; mensaje no expone el valor', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ title: 'El usuario user@example.com reporta fuga de agua' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('incident.title');
      // Verificación de privacidad: el mensaje NO debe exponer el valor rechazado
      expect(result.message).not.toContain('user@example.com');
    }
  });

  it('SI-P3A-TITLE-13: title con teléfono internacional (+34600111222) → VALIDATION_ERROR; mensaje no expone el valor', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ title: 'Llamar al +34600111222 por avería en calefacción' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('incident.title');
      expect(result.message).not.toContain('+34600111222');
    }
  });

  it('SI-P3A-TITLE-14: title con @s.whatsapp.net (WA JID completo) → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ title: 'Incidencia de 34612345678@s.whatsapp.net en cuarto de baño' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('incident.title');
    }
  });

  it('SI-P3A-TITLE-15: title con wa_jid keyword → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ title: 'wa_jid del huésped tiene incidencia abierta' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('incident.title');
    }
  });

  it('SI-P3A-TITLE-16: title con phone_number keyword → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ title: 'Fuga reportada por phone_number del contacto registrado' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('incident.title');
    }
  });

  it('SI-P3A-TITLE-17: title con email_address keyword → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ title: 'Incidencia vinculada a email_address del residente' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('incident.title');
    }
  });

  // ── Casos permitidos — números de habitación, planta, puerta, temperatura ────

  it('SI-P3A-TITLE-18: "Problema en habitación 204" → OK (número de habitación no es PII)', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ title: 'Problema en habitación 204' }),
    ));
    expect(result.ok).toBe(true);
  });

  it('SI-P3A-TITLE-19: "Avería en planta 3" → OK (número de planta no es PII)', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ title: 'Avería en planta 3' }),
    ));
    expect(result.ok).toBe(true);
  });

  it('SI-P3A-TITLE-20: "La puerta 12 no cierra" → OK (número de puerta no es PII)', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ title: 'La puerta 12 no cierra' }),
    ));
    expect(result.ok).toBe(true);
  });

  it('SI-P3A-TITLE-21: "Temperatura inferior a 18 grados" → OK (valor numérico sin prefijo + no es teléfono)', () => {
    // INTL_PHONE_RE requiere + seguido de ≥7 dígitos consecutivos.
    // "18 grados" no tiene prefijo +; tampoco hay email ni keyword de canal.
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ title: 'Temperatura inferior a 18 grados en la habitación' }),
    ));
    expect(result.ok).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO 5 — Enums category y priority (§6.3, §8.12)
// ─────────────────────────────────────────────────────────────────────────────

describe('SI-P3A-ENUM — Enums category y priority (§6.3)', () => {

  it('SI-P3A-ENUM-01: category = maintenance → OK', () => {
    const result = validateCreateIncidentRequest(withIncident(validIncident({ category: 'maintenance' })));
    expect(result.ok).toBe(true);
  });

  it('SI-P3A-ENUM-02: category = noise → OK', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ category: 'noise', title: 'Ruidos constantes en el techo', description: 'Los vecinos hacen ruido todas las noches sin parar.' }),
    ));
    expect(result.ok).toBe(true);
  });

  it('SI-P3A-ENUM-03: category = security → OK', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ category: 'security', title: 'Cerradura forzada detectada', description: 'La cerradura de entrada muestra señales de intento de forzado.' }),
    ));
    expect(result.ok).toBe(true);
  });

  it('SI-P3A-ENUM-04: category = billing → OK', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ category: 'billing', title: 'Cargo incorrecto en factura', description: 'La factura del mes incluye un cargo que no corresponde al contrato.' }),
    ));
    expect(result.ok).toBe(true);
  });

  it('SI-P3A-ENUM-05: category = other → OK', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ category: 'other', title: 'Incidencia sin categoría clara', description: 'El problema no encaja en ninguna de las categorías disponibles actualmente.' }),
    ));
    expect(result.ok).toBe(true);
  });

  it('SI-P3A-ENUM-06: category inválida → INVALID_CATEGORY', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ category: 'plumbing' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('INVALID_CATEGORY');
      expect(result.field).toBe('incident.category');
    }
  });

  it('SI-P3A-ENUM-07: category = "" (vacío) → INVALID_CATEGORY', () => {
    const result = validateCreateIncidentRequest(withIncident(validIncident({ category: '' })));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('INVALID_CATEGORY');
  });

  it('SI-P3A-ENUM-08: priority = normal → OK', () => {
    const result = validateCreateIncidentRequest(withIncident(validIncident({ priority: 'normal' })));
    expect(result.ok).toBe(true);
  });

  it('SI-P3A-ENUM-09: priority = urgent → OK', () => {
    const result = validateCreateIncidentRequest(withIncident(validIncident({ priority: 'urgent' })));
    expect(result.ok).toBe(true);
  });

  it('SI-P3A-ENUM-10: priority = critical → INVALID_PRIORITY', () => {
    const result = validateCreateIncidentRequest(withIncident(validIncident({ priority: 'critical' })));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('INVALID_PRIORITY');
      expect(result.field).toBe('incident.priority');
    }
  });

  it('SI-P3A-ENUM-11: priority = "" (vacío) → INVALID_PRIORITY', () => {
    const result = validateCreateIncidentRequest(withIncident(validIncident({ priority: '' })));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('INVALID_PRIORITY');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO 6 — Attachments (§7.1, §8.12)
// ─────────────────────────────────────────────────────────────────────────────

describe('SI-P3A-ATT — Attachments (§7.1, §8.12)', () => {

  it('SI-P3A-ATT-01: attachments omitido → OK', () => {
    const inc = validIncident();
    delete inc['attachments'];
    const result = validateCreateIncidentRequest(withIncident(inc));
    expect(result.ok).toBe(true);
  });

  it('SI-P3A-ATT-02: attachments = [] → OK', () => {
    const result = validateCreateIncidentRequest(withIncident(validIncident({ attachments: [] })));
    expect(result.ok).toBe(true);
  });

  it('SI-P3A-ATT-03: attachments no vacío → ATTACHMENTS_NOT_SUPPORTED', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ attachments: [{ url: 'https://example.com/foto.jpg' }] }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('ATTACHMENTS_NOT_SUPPORTED');
      expect(result.field).toBe('incident.attachments');
    }
  });

  it('SI-P3A-ATT-04: attachments = string (no array) → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ attachments: 'file.jpg' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('incident.attachments');
    }
  });

  it('SI-P3A-ATT-05: attachments = null (no array) → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ attachments: null }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('VALIDATION_ERROR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO 7 — Campos prohibidos (§8.2)
// ─────────────────────────────────────────────────────────────────────────────

describe('SI-P3A-PROHIB — Campos prohibidos (§8.2)', () => {

  it('SI-P3A-PROHIB-01: identity_level en raíz → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(validRequest({ identity_level: 'STRONG_MATCH_ACTIVE' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('identity_level');
    }
  });

  it('SI-P3A-PROHIB-02: urgency_proposal en raíz → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(validRequest({ urgency_proposal: 'high' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('urgency_proposal');
    }
  });

  it('SI-P3A-PROHIB-03: conv_case_id en raíz → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(validRequest({ conv_case_id: 'some-case-id' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('VALIDATION_ERROR');
  });

  it('SI-P3A-PROHIB-04: conv_session_id en raíz → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(validRequest({ conv_session_id: 'some-session' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('VALIDATION_ERROR');
  });

  it('SI-P3A-PROHIB-05: assignee en incident → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ assignee: UUID_REQUESTER }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toContain('incident');
    }
  });

  it('SI-P3A-PROHIB-06: status en incident → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ status: 'in_progress' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toContain('incident');
    }
  });

  it('SI-P3A-PROHIB-07: service_role en raíz → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(validRequest({ service_role: 'eyJhbGciOiJIUzI1NiJ9' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('VALIDATION_ERROR');
  });

  it('SI-P3A-PROHIB-08: resolver_id en incident → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ resolver_id: UUID_REQUESTER }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('VALIDATION_ERROR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO 8 — Idempotency key (§6.1)
// ─────────────────────────────────────────────────────────────────────────────

describe('SI-P3A-IDEM — Idempotency key (§6.1)', () => {

  it('SI-P3A-IDEM-01: clave < 16 chars → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(validRequest({ idempotency_key: 'short-key-123' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('idempotency_key');
    }
  });

  it('SI-P3A-IDEM-02: clave > 128 chars → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(validRequest({ idempotency_key: 'x'.repeat(129) }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('idempotency_key');
    }
  });

  it('SI-P3A-IDEM-03: clave válida de 16 chars → OK', () => {
    const result = validateCreateIncidentRequest(validRequest({ idempotency_key: 'a'.repeat(16) }));
    expect(result.ok).toBe(true);
  });

  it('SI-P3A-IDEM-04: clave válida de 64 chars → OK', () => {
    const result = validateCreateIncidentRequest(validRequest({ idempotency_key: 'k'.repeat(64) }));
    expect(result.ok).toBe(true);
  });

  it('SI-P3A-IDEM-05: error de clave inválida NO expone la clave completa — privacidad', () => {
    // 133 chars: supera el límite de 128 → debe fallar Y no exponer el valor en el mensaje
    const longKey = 'secret-' + 'X'.repeat(126);
    const result = validateCreateIncidentRequest(validRequest({ idempotency_key: longKey }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // El mensaje de error no debe contener la clave completa
      expect(result.message).not.toContain(longKey);
    }
  });

  it('SI-P3A-IDEM-06: clave = número (no string) → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(validRequest({ idempotency_key: 12345678901234567 }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('VALIDATION_ERROR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO 9 — contract_version (§8.1)
// ─────────────────────────────────────────────────────────────────────────────

describe('SI-P3A-VERSION — contract_version (§8.1)', () => {

  it('SI-P3A-VERSION-01: contract_version = "1.0" → OK', () => {
    const result = validateCreateIncidentRequest(validRequest());
    expect(result.ok).toBe(true);
  });

  it('SI-P3A-VERSION-02: contract_version ausente → UNSUPPORTED_CONTRACT_VERSION', () => {
    const req = validRequest();
    delete req['contract_version'];
    const result = validateCreateIncidentRequest(req);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('UNSUPPORTED_CONTRACT_VERSION');
    }
  });

  it('SI-P3A-VERSION-03: contract_version = "2.0" → UNSUPPORTED_CONTRACT_VERSION', () => {
    const result = validateCreateIncidentRequest(validRequest({ contract_version: '2.0' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('UNSUPPORTED_CONTRACT_VERSION');
      expect(result.field).toBe('contract_version');
    }
  });

  it('SI-P3A-VERSION-04: contract_version verificada ANTES de additionalProperties', () => {
    // Si hay campo extra Y versión incorrecta, debe devolver UNSUPPORTED_CONTRACT_VERSION
    const result = validateCreateIncidentRequest(validRequest({
      contract_version: '99.0',
      unexpected_field: 'x',
    }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('UNSUPPORTED_CONTRACT_VERSION');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO 10 — UUID validation (§6.1, §6.3)
// ─────────────────────────────────────────────────────────────────────────────

describe('SI-P3A-UUID — Validación de UUIDs (§6.1, §6.3)', () => {

  it('SI-P3A-UUID-01: client_account_id inválido → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(validRequest({ client_account_id: 'not-a-uuid' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('client_account_id');
    }
  });

  it('SI-P3A-UUID-02: request_id inválido → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(validRequest({ request_id: 'abc-123' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('request_id');
    }
  });

  it('SI-P3A-UUID-03: correlation_id inválido → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(validRequest({ correlation_id: '' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe('VALIDATION_ERROR');
  });

  it('SI-P3A-UUID-04: requester_profile_id inválido → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(validRequest({ requester_profile_id: '12345' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('requester_profile_id');
    }
  });

  it('SI-P3A-UUID-05: accommodation_id inválido → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ accommodation_id: 'bad-uuid' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('incident.accommodation_id');
    }
  });

  it('SI-P3A-UUID-06: room_id inválido (no UUID, no null) → VALIDATION_ERROR', () => {
    const result = validateCreateIncidentRequest(withIncident(
      validIncident({ room_id: 'not-a-uuid' }),
    ));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('incident.room_id');
    }
  });

  it('SI-P3A-UUID-07: room_id ausente → VALIDATION_ERROR (campo obligatorio, acepta null)', () => {
    const inc = validIncident();
    delete inc['room_id'];
    const result = validateCreateIncidentRequest(withIncident(inc));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('VALIDATION_ERROR');
      expect(result.field).toBe('incident.room_id');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO 11 — Catálogo de errores (§8.12)
// ─────────────────────────────────────────────────────────────────────────────

describe('SI-P3A-ERRORS — Catálogo de errores canónicos (§8.12)', () => {

  it('SI-P3A-ERRORS-01: exactamente 15 códigos canónicos', () => {
    expect(PROVIDER_ERROR_CODES).toHaveLength(15);
  });

  it('SI-P3A-ERRORS-02: UNSUPPORTED_CONTRACT_VERSION → HTTP 400, no retryable', () => {
    expect(getHttpStatus('UNSUPPORTED_CONTRACT_VERSION')).toBe(400);
    expect(isRetryable('UNSUPPORTED_CONTRACT_VERSION')).toBe(false);
  });

  it('SI-P3A-ERRORS-03: VALIDATION_ERROR → HTTP 400, no retryable', () => {
    expect(getHttpStatus('VALIDATION_ERROR')).toBe(400);
    expect(isRetryable('VALIDATION_ERROR')).toBe(false);
  });

  it('SI-P3A-ERRORS-04: AUTHENTICATION_REQUIRED → HTTP 401, no retryable', () => {
    expect(getHttpStatus('AUTHENTICATION_REQUIRED')).toBe(401);
    expect(isRetryable('AUTHENTICATION_REQUIRED')).toBe(false);
  });

  it('SI-P3A-ERRORS-05: CALLER_NOT_AUTHORIZED → HTTP 403, no retryable', () => {
    expect(getHttpStatus('CALLER_NOT_AUTHORIZED')).toBe(403);
    expect(isRetryable('CALLER_NOT_AUTHORIZED')).toBe(false);
  });

  it('SI-P3A-ERRORS-06: FEATURE_DISABLED → HTTP 403, no retryable', () => {
    expect(getHttpStatus('FEATURE_DISABLED')).toBe(403);
    expect(isRetryable('FEATURE_DISABLED')).toBe(false);
  });

  it('SI-P3A-ERRORS-07: RESOURCE_NOT_FOUND → HTTP 404, no retryable', () => {
    expect(getHttpStatus('RESOURCE_NOT_FOUND')).toBe(404);
    expect(isRetryable('RESOURCE_NOT_FOUND')).toBe(false);
  });

  it('SI-P3A-ERRORS-08: REQUESTER_NOT_ALLOWED → HTTP 403, no retryable', () => {
    expect(getHttpStatus('REQUESTER_NOT_ALLOWED')).toBe(403);
    expect(isRetryable('REQUESTER_NOT_ALLOWED')).toBe(false);
  });

  it('SI-P3A-ERRORS-09: INVALID_CATEGORY → HTTP 422, no retryable', () => {
    expect(getHttpStatus('INVALID_CATEGORY')).toBe(422);
    expect(isRetryable('INVALID_CATEGORY')).toBe(false);
  });

  it('SI-P3A-ERRORS-10: INVALID_PRIORITY → HTTP 422, no retryable', () => {
    expect(getHttpStatus('INVALID_PRIORITY')).toBe(422);
    expect(isRetryable('INVALID_PRIORITY')).toBe(false);
  });

  it('SI-P3A-ERRORS-11: ATTACHMENTS_NOT_SUPPORTED → HTTP 422, no retryable', () => {
    expect(getHttpStatus('ATTACHMENTS_NOT_SUPPORTED')).toBe(422);
    expect(isRetryable('ATTACHMENTS_NOT_SUPPORTED')).toBe(false);
  });

  it('SI-P3A-ERRORS-12: IDEMPOTENCY_CONFLICT → HTTP 409, no retryable', () => {
    expect(getHttpStatus('IDEMPOTENCY_CONFLICT')).toBe(409);
    expect(isRetryable('IDEMPOTENCY_CONFLICT')).toBe(false);
  });

  it('SI-P3A-ERRORS-13: RATE_LIMITED → HTTP 429, retryable = true', () => {
    expect(getHttpStatus('RATE_LIMITED')).toBe(429);
    expect(isRetryable('RATE_LIMITED')).toBe(true);
  });

  it('SI-P3A-ERRORS-14: DEPENDENCY_UNAVAILABLE → HTTP 503, retryable = true', () => {
    expect(getHttpStatus('DEPENDENCY_UNAVAILABLE')).toBe(503);
    expect(isRetryable('DEPENDENCY_UNAVAILABLE')).toBe(true);
  });

  it('SI-P3A-ERRORS-15: PROVIDER_TIMEOUT → HTTP 504, retryable = true', () => {
    expect(getHttpStatus('PROVIDER_TIMEOUT')).toBe(504);
    expect(isRetryable('PROVIDER_TIMEOUT')).toBe(true);
  });

  it('SI-P3A-ERRORS-16: INTERNAL_ERROR → HTTP 500, no retryable', () => {
    expect(getHttpStatus('INTERNAL_ERROR')).toBe(500);
    expect(isRetryable('INTERNAL_ERROR')).toBe(false);
  });

  it('SI-P3A-ERRORS-17: buildProviderErrorResponse — sin stack, sin PII, sin SQL', () => {
    const resp = buildProviderErrorResponse('VALIDATION_ERROR', UUID_REQUEST, UUID_CORR, 'incident.title');
    expect(resp.ok).toBe(false);
    expect(resp.error_code).toBe('VALIDATION_ERROR');
    expect(resp.http_status).toBe(400);
    expect(resp.retryable).toBe(false);
    expect(resp.message).toBeDefined();
    expect(resp.request_id).toBe(UUID_REQUEST);
    expect(resp.correlation_id).toBe(UUID_CORR);
    expect(resp.field).toBe('incident.title');
    // Sin stack
    expect(resp).not.toHaveProperty('stack');
    // Sin datos internos crudos
    expect(resp).not.toHaveProperty('sql');
    expect(resp).not.toHaveProperty('raw');
  });

  it('SI-P3A-ERRORS-18: getSafeMessage — devuelve mensaje seguro no vacío para todos los códigos', () => {
    for (const code of PROVIDER_ERROR_CODES) {
      const msg = getSafeMessage(code);
      expect(typeof msg).toBe('string');
      expect(msg.length).toBeGreaterThan(0);
    }
  });

  it('SI-P3A-ERRORS-19: cada código tiene HTTP status en rango esperado (4xx/5xx)', () => {
    for (const code of PROVIDER_ERROR_CODES) {
      const http = getHttpStatus(code);
      expect(http).toBeGreaterThanOrEqual(400);
      expect(http).toBeLessThan(600);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO 12 — Response mapper (§5.2, §8.5)
// ─────────────────────────────────────────────────────────────────────────────

describe('SI-P3A-RESP — Response mapper (§5.2, §8.5)', () => {

  const CREATED_AT = '2026-07-30T10:00:00+02:00';
  const NEW_REQUEST_ID  = 'd1e2f3a4-0000-0000-0000-000000000005';
  const NEW_CORR_ID     = 'e2f3a4b5-0000-0000-0000-000000000006';

  it('SI-P3A-RESP-01: primera creación — structure correcta', () => {
    const resp = buildFirstCreationResponse({
      request_id: UUID_REQUEST,
      correlation_id: UUID_CORR,
      incident_id: UUID_INCIDENT,
      incident_reference: null,
      created_at: CREATED_AT,
    });
    expect(resp.contract_version).toBe('1.0');
    expect(resp.request_id).toBe(UUID_REQUEST);
    expect(resp.correlation_id).toBe(UUID_CORR);
    expect(resp.incident_id).toBe(UUID_INCIDENT);
    expect(resp.incident_reference).toBeNull();
    expect(resp.status).toBe('new');
    expect(resp.created_at).toBe(CREATED_AT);
    expect(resp.idempotent_replay).toBe(false);
  });

  it('SI-P3A-RESP-02: primera creación — idempotent_replay = false', () => {
    const resp = buildFirstCreationResponse({
      request_id: UUID_REQUEST,
      correlation_id: UUID_CORR,
      incident_id: UUID_INCIDENT,
      incident_reference: null,
      created_at: CREATED_AT,
    });
    expect(resp.idempotent_replay).toBe(false);
  });

  it('SI-P3A-RESP-03: primera creación — status siempre "new"', () => {
    const resp = buildFirstCreationResponse({
      request_id: UUID_REQUEST,
      correlation_id: UUID_CORR,
      incident_id: UUID_INCIDENT,
      incident_reference: null,
      created_at: CREATED_AT,
    });
    expect(resp.status).toBe('new');
  });

  it('SI-P3A-RESP-04: replay — idempotent_replay = true', () => {
    const resp = buildReplayResponse({
      request_id: NEW_REQUEST_ID,
      correlation_id: NEW_CORR_ID,
      original_incident_id: UUID_INCIDENT,
      original_incident_reference: null,
      original_created_at: CREATED_AT,
    });
    expect(resp.idempotent_replay).toBe(true);
  });

  it('SI-P3A-RESP-05: replay — request_id y correlation_id reflejan invocación actual', () => {
    const resp = buildReplayResponse({
      request_id: NEW_REQUEST_ID,
      correlation_id: NEW_CORR_ID,
      original_incident_id: UUID_INCIDENT,
      original_incident_reference: null,
      original_created_at: CREATED_AT,
    });
    expect(resp.request_id).toBe(NEW_REQUEST_ID);
    expect(resp.correlation_id).toBe(NEW_CORR_ID);
    // NO son los originales
    expect(resp.request_id).not.toBe(UUID_REQUEST);
    expect(resp.correlation_id).not.toBe(UUID_CORR);
  });

  it('SI-P3A-RESP-06: replay — incident_id, created_at proceden del original', () => {
    const resp = buildReplayResponse({
      request_id: NEW_REQUEST_ID,
      correlation_id: NEW_CORR_ID,
      original_incident_id: UUID_INCIDENT,
      original_incident_reference: null,
      original_created_at: CREATED_AT,
    });
    expect(resp.incident_id).toBe(UUID_INCIDENT);
    expect(resp.created_at).toBe(CREATED_AT);
  });

  it('SI-P3A-RESP-07: replay — status siempre "new"', () => {
    const resp = buildReplayResponse({
      request_id: NEW_REQUEST_ID,
      correlation_id: NEW_CORR_ID,
      original_incident_id: UUID_INCIDENT,
      original_incident_reference: null,
      original_created_at: CREATED_AT,
    });
    expect(resp.status).toBe('new');
  });

  it('SI-P3A-RESP-08: primera creación — sin campos extra', () => {
    const resp = buildFirstCreationResponse({
      request_id: UUID_REQUEST,
      correlation_id: UUID_CORR,
      incident_id: UUID_INCIDENT,
      incident_reference: null,
      created_at: CREATED_AT,
    });
    const keys = Object.keys(resp);
    const expected = [
      'contract_version', 'request_id', 'correlation_id',
      'incident_id', 'incident_reference', 'status', 'created_at', 'idempotent_replay',
    ];
    expect(keys.sort()).toEqual(expected.sort());
  });

  it('SI-P3A-RESP-09: contract_version siempre "1.0"', () => {
    const r1 = buildFirstCreationResponse({ request_id: UUID_REQUEST, correlation_id: UUID_CORR, incident_id: UUID_INCIDENT, incident_reference: null, created_at: CREATED_AT });
    const r2 = buildReplayResponse({ request_id: NEW_REQUEST_ID, correlation_id: NEW_CORR_ID, original_incident_id: UUID_INCIDENT, original_incident_reference: null, original_created_at: CREATED_AT });
    expect(r1.contract_version).toBe('1.0');
    expect(r2.contract_version).toBe('1.0');
  });
});
