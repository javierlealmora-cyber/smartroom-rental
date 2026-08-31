/**
 * types.ts — Tipos runtime del contrato provider v1.0 de Smart Incidents.
 * Fuente: docs/smart-incidents/contracts/contract-create-incident-request.md
 *
 * Estado: PROVIDER_RUNTIME_CONTRACT_IMPLEMENTED_OFFLINE
 * No modificar sin actualizar primero el contrato provider.
 */

// ─── Enums canónicos ─────────────────────────────────────────────────────────

export type IncidentCategory =
  | 'maintenance'
  | 'noise'
  | 'security'
  | 'billing'
  | 'other';

export type IncidentPriority = 'normal' | 'urgent';

export type IncidentSourceChannel = 'whatsapp' | 'webchat';

export type IncidentStatus = 'new';

// ─── Actor provider ───────────────────────────────────────────────────────────

/** §6.2 — Actor técnico. Solo acepta type = "system". */
export interface CreateIncidentActorV1 {
  type: 'system';
}

// ─── Datos del incidente dentro del request ───────────────────────────────────

/** §5.1 / §6.3 / §7.1 — Objeto incident en el request v1.0. */
export interface IncidentRequestDataV1 {
  /** §6.3 — obligatorio, 5–120 chars, sin HTML, sin PII de canal. */
  title: string;
  /** §6.3 — obligatorio, no nullable, 10–4000 chars, sin HTML ejecutable. */
  description: string;
  /** §6.3 — UUID obligatorio. Verificado contra Core en SI-P4. */
  accommodation_id: string;
  /** §7.1 — null o UUID. Cuando presente: verificado contra accommodation. */
  room_id: string | null;
  /** §6.3 — enum de cinco valores. */
  category: IncidentCategory;
  /** §6.3 — enum de dos valores. Mapeado desde urgency_proposal por el consumer. */
  priority: IncidentPriority;
  /** §7.1 — v1.0: solo [] o ausente. */
  attachments?: never[];
}

// ─── Request completo v1.0 ────────────────────────────────────────────────────

/** §5.1 — Estructura completa del request provider v1.0. */
export interface CreateIncidentRequestV1 {
  /** §8.1 — verificado como primera operación. */
  contract_version: '1.0';
  /** §6.1 — UUID. Vinculado server-side al caller autenticado. */
  client_account_id: string;
  /** §6.1 — UUID. Identifica la invocación técnica. */
  request_id: string;
  /** §6.1 — UUID. Identifica la operación de negocio transversalmente. */
  correlation_id: string;
  /** §6.1 — 16–128 chars. Opaco. Sin PII. */
  idempotency_key: string;
  /** §6.1 — literal exacto. */
  source_system: 'smart_conversations';
  /** §6.1 — whatsapp o webchat únicamente. */
  source_channel: IncidentSourceChannel;
  /** §6.1 — obligatorio, null en v1.0. */
  external_request_reference: null;
  /** §6.2 — objeto con type = "system" únicamente. */
  actor: CreateIncidentActorV1;
  /** §6.1 — UUID del perfil del tenant. Resuelto server-side por SC. */
  requester_profile_id: string;
  /** §6.3 / §7.1 — datos de la incidencia. */
  incident: IncidentRequestDataV1;
}

// ─── Response v1.0 ───────────────────────────────────────────────────────────

/** §5.2 — Estructura de la response del provider v1.0. */
export interface CreateIncidentResultV1 {
  contract_version: '1.0';
  /** Invocación actual (no la original en replays). */
  request_id: string;
  /** Invocación actual (no la original en replays). */
  correlation_id: string;
  /** Opaco para el consumer. */
  incident_id: string;
  /** Nullable en v1.0. */
  incident_reference: string | null;
  /** Siempre "new". */
  status: IncidentStatus;
  /** Estable en replay. */
  created_at: string;
  /** true en replay exacto, false en primera creación. */
  idempotent_replay: boolean;
}

// ─── Códigos de error — exactamente 15 ───────────────────────────────────────

/** §8.12 — 15 códigos canónicos. No añadir ni eliminar sin actualizar el contrato. */
export type ProviderErrorCode =
  | 'UNSUPPORTED_CONTRACT_VERSION'
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_REQUIRED'
  | 'CALLER_NOT_AUTHORIZED'
  | 'FEATURE_DISABLED'
  | 'RESOURCE_NOT_FOUND'
  | 'REQUESTER_NOT_ALLOWED'
  | 'INVALID_CATEGORY'
  | 'INVALID_PRIORITY'
  | 'ATTACHMENTS_NOT_SUPPORTED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'RATE_LIMITED'
  | 'DEPENDENCY_UNAVAILABLE'
  | 'PROVIDER_TIMEOUT'
  | 'INTERNAL_ERROR';

// ─── Tipos de respuesta del provider ─────────────────────────────────────────

/** Respuesta de error serializable — sin stack, sin PII, sin datos internos. */
export interface ProviderErrorResponse {
  ok: false;
  error_code: ProviderErrorCode;
  http_status: number;
  retryable: boolean;
  /** Mensaje seguro para el consumer. Sin SQL, sin stack, sin secretos. */
  message: string;
  /** Ruta del campo inválido, cuando aplica. */
  field?: string;
  /** request_id de la invocación actual. */
  request_id: string;
  /** correlation_id de la invocación actual. */
  correlation_id: string;
}

/** Respuesta de éxito del provider. */
export interface ProviderSuccessResponse {
  ok: true;
  data: CreateIncidentResultV1;
}

export type ProviderResponse = ProviderSuccessResponse | ProviderErrorResponse;
