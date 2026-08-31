/**
 * validator.ts — Validador estricto del request provider v1.0 de Smart Incidents.
 * Fuente: contract-create-incident-request.md §5–§8
 *
 * Sin efectos secundarios. Sin llamadas externas. Sin IA.
 * No inventa validaciones no documentadas en el contrato.
 * Estado: PROVIDER_REQUEST_VALIDATOR_IMPLEMENTED_OFFLINE
 */

import type {
  CreateIncidentRequestV1,
  IncidentCategory,
  IncidentPriority,
  ProviderErrorCode,
} from './types.ts';

// ─── Tipo de resultado del validador ─────────────────────────────────────────

export type ValidateRequestResult =
  | { ok: true; data: CreateIncidentRequestV1 }
  | { ok: false; error_code: ProviderErrorCode; field?: string; message: string };

// ─── Constantes ───────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_CATEGORIES = new Set<IncidentCategory>([
  'maintenance', 'noise', 'security', 'billing', 'other',
]);

const VALID_PRIORITIES = new Set<IncidentPriority>(['normal', 'urgent']);

const VALID_SOURCE_CHANNELS = new Set(['whatsapp', 'webchat']);

// §5.1 — additionalProperties = false en raíz
const ROOT_ALLOWED = new Set([
  'contract_version', 'client_account_id', 'request_id', 'correlation_id',
  'idempotency_key', 'source_system', 'source_channel', 'external_request_reference',
  'actor', 'requester_profile_id', 'incident',
]);

// §5.1 — additionalProperties = false en actor
const ACTOR_ALLOWED = new Set(['type']);

// §5.1 — additionalProperties = false en incident
const INCIDENT_ALLOWED = new Set([
  'title', 'description', 'accommodation_id', 'room_id',
  'category', 'priority', 'attachments',
]);

// §6.3 / §8.6 — Política conservadora de texto plano para v1.0.
// Rechazar cualquier etiqueta o markup HTML reconocible en title Y description.
// No se intenta sanitizar ni transformar; se devuelve VALIDATION_ERROR.
// Implementación más restrictiva que el mínimo contractual "sin HTML ejecutable";
// un contrato puede ser más restrictivo que la rule. No se requiere cambio documental.
const HTML_ANY_TAG_RE = /<\/?[a-zA-Z][^>]*>/;

// Cinturón de seguridad adicional: atributos de evento HTML sin tag envolvente.
// Cubre el caso "onclick=..." embebido en texto plano sin etiqueta.
const HTML_EVENT_HANDLER_RE = /\bon\w+\s*=/i;

// §8.6 — PII de canal documentada en title: patrones deterministas
// Fuente: contract §8.2 y §8.6; no implementar detector general no documentado.

// Email evidente: local@dominio.tld — requiere punto en el dominio y TLD ≥ 2 letras.
// Anti-falso-positivo: solo forma x@y.z; tokens sin dominio real no coinciden.
const EVIDENT_EMAIL_RE = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/;

// Teléfono internacional evidente: + seguido de ≥ 7 dígitos consecutivos.
// Anti-falso-positivo: "+18 grados" = 2 dígitos tras + → no coincide.
// Números de habitación/planta sin prefijo + tampoco coinciden.
const INTL_PHONE_RE = /\+\d{7,}/;

const WA_JID_SUFFIX_RE = /@(c\.us|s\.whatsapp\.net)/i;
const CHANNEL_PII_KEYWORDS_RE = /\b(sender_ref|wa_jid|phone_number|email_address)\b/i;

// ─── Helpers internos ─────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isValidUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}

function titleHasHtml(s: string): boolean {
  return HTML_ANY_TAG_RE.test(s);
}

// Política conservadora v1.0: texto plano.
// Rechaza cualquier etiqueta HTML (por HTML_ANY_TAG_RE) MÁS
// atributos de evento sin etiqueta envolvente (por HTML_EVENT_HANDLER_RE).
// No existía sanitizador aprobado en el repositorio al aplicar SI-P3A.
function descriptionHasHtml(s: string): boolean {
  return HTML_ANY_TAG_RE.test(s) || HTML_EVENT_HANDLER_RE.test(s);
}

function titleHasChannelPii(s: string): boolean {
  return (
    EVIDENT_EMAIL_RE.test(s) ||
    INTL_PHONE_RE.test(s) ||
    WA_JID_SUFFIX_RE.test(s) ||
    CHANNEL_PII_KEYWORDS_RE.test(s)
  );
}

function fail(
  error_code: ProviderErrorCode,
  message: string,
  field?: string,
): ValidateRequestResult {
  const base: ValidateRequestResult & { ok: false } = { ok: false, error_code, message };
  if (field !== undefined) (base as Record<string, unknown>)['field'] = field;
  return base;
}

// ─── Validación del actor ─────────────────────────────────────────────────────

function validateActor(actor: unknown): ValidateRequestResult | null {
  if (!isRecord(actor)) {
    return fail('VALIDATION_ERROR', 'actor debe ser un objeto JSON', 'actor');
  }
  for (const key of Object.keys(actor)) {
    if (!ACTOR_ALLOWED.has(key)) {
      return fail('VALIDATION_ERROR', `Campo no permitido en actor: ${key}`, `actor.${key}`);
    }
  }
  if (actor['type'] !== 'system') {
    return fail(
      'VALIDATION_ERROR',
      'actor.type solo acepta "system"; valores como "system_service", "tenant" o "client_admin" no se permiten',
      'actor.type',
    );
  }
  return null;
}

// ─── Validación del incident ──────────────────────────────────────────────────

function validateIncident(incident: unknown): ValidateRequestResult | null {
  if (!isRecord(incident)) {
    return fail('VALIDATION_ERROR', 'incident debe ser un objeto JSON', 'incident');
  }

  // additionalProperties = false
  for (const key of Object.keys(incident)) {
    if (!INCIDENT_ALLOWED.has(key)) {
      return fail('VALIDATION_ERROR', `Campo no permitido en incident: ${key}`, `incident.${key}`);
    }
  }

  // title — §6.3: obligatorio, 5–120, sin HTML, sin PII de canal
  {
    const title = incident['title'];
    if (title === undefined || title === null) {
      return fail('VALIDATION_ERROR', 'incident.title es obligatorio', 'incident.title');
    }
    if (typeof title !== 'string') {
      return fail('VALIDATION_ERROR', 'incident.title debe ser un string', 'incident.title');
    }
    const t = title.trim();
    if (t.length === 0) {
      return fail('VALIDATION_ERROR', 'incident.title no puede estar vacío o contener solo espacios', 'incident.title');
    }
    if (t.length < 5) {
      return fail('VALIDATION_ERROR', 'incident.title debe tener al menos 5 caracteres (trimmed)', 'incident.title');
    }
    if (t.length > 120) {
      return fail('VALIDATION_ERROR', 'incident.title no puede superar 120 caracteres (trimmed)', 'incident.title');
    }
    if (titleHasHtml(t)) {
      return fail('VALIDATION_ERROR', 'incident.title no puede contener HTML', 'incident.title');
    }
    if (titleHasChannelPii(t)) {
      return fail('VALIDATION_ERROR', 'incident.title contiene datos sensibles de canal no permitidos', 'incident.title');
    }
  }

  // description — §6.3: obligatorio, no nullable, 10–4000, sin HTML ejecutable
  {
    const hasKey = 'description' in incident;
    const desc = incident['description'];
    if (!hasKey || desc === undefined) {
      return fail('VALIDATION_ERROR', 'incident.description es obligatorio', 'incident.description');
    }
    if (desc === null) {
      return fail('VALIDATION_ERROR', 'incident.description no puede ser null', 'incident.description');
    }
    if (typeof desc !== 'string') {
      return fail('VALIDATION_ERROR', 'incident.description debe ser un string', 'incident.description');
    }
    const d = desc.trim();
    if (d.length === 0) {
      return fail('VALIDATION_ERROR', 'incident.description no puede estar vacía o contener solo espacios', 'incident.description');
    }
    if (d.length < 10) {
      return fail('VALIDATION_ERROR', 'incident.description debe tener al menos 10 caracteres (trimmed)', 'incident.description');
    }
    if (d.length > 4000) {
      return fail('VALIDATION_ERROR', 'incident.description no puede superar 4000 caracteres (trimmed)', 'incident.description');
    }
    if (descriptionHasHtml(d)) {
      return fail('VALIDATION_ERROR', 'incident.description no puede contener HTML (política conservadora v1.0: texto plano)', 'incident.description');
    }
  }

  // accommodation_id — §6.3: UUID obligatorio
  if (!isValidUuid(incident['accommodation_id'])) {
    return fail(
      'VALIDATION_ERROR',
      'incident.accommodation_id debe ser un UUID válido',
      'incident.accommodation_id',
    );
  }

  // room_id — §7.1 (campo obligatorio en el request, valor null o UUID)
  if (!('room_id' in incident) || incident['room_id'] === undefined) {
    return fail('VALIDATION_ERROR', 'incident.room_id es obligatorio (use null si no aplica)', 'incident.room_id');
  }
  const roomId = incident['room_id'];
  if (roomId !== null && !isValidUuid(roomId)) {
    return fail(
      'VALIDATION_ERROR',
      'incident.room_id debe ser un UUID válido o null',
      'incident.room_id',
    );
  }

  // category — §6.3
  if (!VALID_CATEGORIES.has(incident['category'] as IncidentCategory)) {
    return fail(
      'INVALID_CATEGORY',
      'incident.category debe ser uno de: maintenance, noise, security, billing, other',
      'incident.category',
    );
  }

  // priority — §6.3
  if (!VALID_PRIORITIES.has(incident['priority'] as IncidentPriority)) {
    return fail(
      'INVALID_PRIORITY',
      'incident.priority debe ser uno de: normal, urgent',
      'incident.priority',
    );
  }

  // attachments — §7.1: ausente o []
  if ('attachments' in incident && incident['attachments'] !== undefined) {
    const att = incident['attachments'];
    if (!Array.isArray(att)) {
      return fail('VALIDATION_ERROR', 'incident.attachments debe ser un array', 'incident.attachments');
    }
    if (att.length > 0) {
      return fail(
        'ATTACHMENTS_NOT_SUPPORTED',
        'Adjuntos no soportados en v1.0; únicamente se acepta [] o la omisión del campo',
        'incident.attachments',
      );
    }
  }

  return null;
}

// ─── Validador principal ──────────────────────────────────────────────────────

/**
 * Valida un request de creación de incidencia contra el contrato provider v1.0.
 *
 * §8.1: contract_version se verifica como primera operación.
 * §5.1: additionalProperties = false en raíz, actor e incident.
 * No realiza resolución de UUID contra base de datos ni Core (PROVIDER_DOMAIN_REVALIDATION_PENDING).
 * No implementa autenticación ni entitlement (INCIDENT_AUTH_IMPLEMENTATION_PENDING).
 */
export function validateCreateIncidentRequest(input: unknown): ValidateRequestResult {
  if (!isRecord(input)) {
    return fail('VALIDATION_ERROR', 'El request debe ser un objeto JSON');
  }

  // §8.1 — contract_version PRIMERO, antes de cualquier otro campo
  if (input['contract_version'] !== '1.0') {
    return fail(
      'UNSUPPORTED_CONTRACT_VERSION',
      'contract_version no soportado; únicamente se acepta "1.0"',
      'contract_version',
    );
  }

  // additionalProperties = false en raíz — §5.1
  for (const key of Object.keys(input)) {
    if (!ROOT_ALLOWED.has(key)) {
      return fail('VALIDATION_ERROR', `Campo no permitido en la raíz: ${key}`, key);
    }
  }

  // client_account_id — UUID
  if (!isValidUuid(input['client_account_id'])) {
    return fail('VALIDATION_ERROR', 'client_account_id debe ser un UUID válido', 'client_account_id');
  }

  // request_id — UUID
  if (!isValidUuid(input['request_id'])) {
    return fail('VALIDATION_ERROR', 'request_id debe ser un UUID válido', 'request_id');
  }

  // correlation_id — UUID
  if (!isValidUuid(input['correlation_id'])) {
    return fail('VALIDATION_ERROR', 'correlation_id debe ser un UUID válido', 'correlation_id');
  }

  // idempotency_key — §6.1: string opaco 16–128 chars
  const iKey = input['idempotency_key'];
  if (typeof iKey !== 'string') {
    return fail('VALIDATION_ERROR', 'idempotency_key debe ser un string', 'idempotency_key');
  }
  const iKeyTrimmed = iKey.trim();
  if (iKeyTrimmed.length < 16 || iKeyTrimmed.length > 128) {
    // No incluir la clave completa en el mensaje — privacidad
    return fail(
      'VALIDATION_ERROR',
      'idempotency_key debe tener entre 16 y 128 caracteres',
      'idempotency_key',
    );
  }

  // source_system — §6.1: literal exacto
  if (input['source_system'] !== 'smart_conversations') {
    return fail(
      'VALIDATION_ERROR',
      'source_system solo acepta "smart_conversations"',
      'source_system',
    );
  }

  // source_channel — §6.1: whatsapp o webchat
  if (!VALID_SOURCE_CHANNELS.has(input['source_channel'] as string)) {
    return fail(
      'VALIDATION_ERROR',
      'source_channel solo acepta "whatsapp" o "webchat"',
      'source_channel',
    );
  }

  // external_request_reference — §6.1: obligatorio, valor null en v1.0
  if (!('external_request_reference' in input)) {
    return fail(
      'VALIDATION_ERROR',
      'external_request_reference es obligatorio',
      'external_request_reference',
    );
  }
  if (input['external_request_reference'] !== null) {
    return fail(
      'VALIDATION_ERROR',
      'external_request_reference debe ser null en v1.0',
      'external_request_reference',
    );
  }

  // requester_profile_id — UUID
  if (!isValidUuid(input['requester_profile_id'])) {
    return fail(
      'VALIDATION_ERROR',
      'requester_profile_id debe ser un UUID válido',
      'requester_profile_id',
    );
  }

  // actor — §6.2
  const actorResult = validateActor(input['actor']);
  if (actorResult !== null) return actorResult;

  // incident — §6.3 / §7.1
  const incidentResult = validateIncident(input['incident']);
  if (incidentResult !== null) return incidentResult;

  return { ok: true, data: input as CreateIncidentRequestV1 };
}
