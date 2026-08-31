/**
 * Enums canónicos de SmartConversations.
 * Fuente de verdad: contracts, rules y migración 20260716000001.
 * Sin lógica de negocio. Solo tipos y constantes.
 */

// ---------------------------------------------------------------------------
// Canal
// Fuente: rules-10 §4.2, contract-normalized-message §5
// ---------------------------------------------------------------------------

export const CHANNEL = {
  WHATSAPP: 'whatsapp',
  WEBCHAT: 'webchat',
} as const;

export type ChannelCode = (typeof CHANNEL)[keyof typeof CHANNEL];

// ---------------------------------------------------------------------------
// Servicios
// Fuente: rules-10 §4.1
// ---------------------------------------------------------------------------

export const SERVICE_CODE = {
  INCIDENCIAS: 'conv_incidencias',
  PUBLICACIONES: 'conv_publicaciones',
  AYUDA: 'conv_ayuda',
} as const;

export type ServiceCode = (typeof SERVICE_CODE)[keyof typeof SERVICE_CODE];

// ---------------------------------------------------------------------------
// Estado de sesión (conv_sessions.state)
// Fuente: contract-case-state-machine §5.1
// ---------------------------------------------------------------------------

export const SESSION_STATE = {
  NEW: 'NEW',
  SELECTING_SERVICE: 'SELECTING_SERVICE',
  IN_SERVICE: 'IN_SERVICE',
  AWAITING_USER: 'AWAITING_USER',
  ESCALATED: 'ESCALATED',
  IDLE: 'IDLE',
  EXPIRED: 'EXPIRED',
  CLOSED: 'CLOSED',
} as const;

export type SessionState = (typeof SESSION_STATE)[keyof typeof SESSION_STATE];

// ---------------------------------------------------------------------------
// Nivel de identidad (conv_sessions.identity_level)
// Fuente: rules-40 §4.1, contract-identity-validation-result §5
// NOTA: UNVERIFIED_LEAD solo lo asigna WF-30; no es resultado de conv-core-validate-identity.
// ---------------------------------------------------------------------------

export const IDENTITY_LEVEL = {
  NO_MATCH: 'NO_MATCH',
  MATCH_INACTIVE: 'MATCH_INACTIVE',
  PARTIAL_MATCH_ACTIVE: 'PARTIAL_MATCH_ACTIVE',
  STRONG_MATCH_ACTIVE: 'STRONG_MATCH_ACTIVE',
  UNVERIFIED_LEAD: 'UNVERIFIED_LEAD',
} as const;

export type IdentityLevel = (typeof IDENTITY_LEVEL)[keyof typeof IDENTITY_LEVEL];

/** Niveles que resultan de conv-core-validate-identity (excluye UNVERIFIED_LEAD) */
export const VALIDATION_IDENTITY_LEVELS = [
  IDENTITY_LEVEL.NO_MATCH,
  IDENTITY_LEVEL.MATCH_INACTIVE,
  IDENTITY_LEVEL.PARTIAL_MATCH_ACTIVE,
  IDENTITY_LEVEL.STRONG_MATCH_ACTIVE,
] as const;

export type ValidationIdentityLevel = (typeof VALIDATION_IDENTITY_LEVELS)[number];

// ---------------------------------------------------------------------------
// Estado de caso (conv_cases.status)
// Fuente: contract-case-state-machine §5.3
// ---------------------------------------------------------------------------

export const CASE_STATUS = {
  OPEN: 'open',
  WAITING_USER: 'waiting_user',
  WAITING_INTERNAL: 'waiting_internal',
  ESCALATED: 'escalated',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
} as const;

export type CaseStatus = (typeof CASE_STATUS)[keyof typeof CASE_STATUS];

/** Estados finales: una vez alcanzados, el caso no puede reabrirse */
export const CASE_FINAL_STATUSES = [CASE_STATUS.CLOSED] as const;

// ---------------------------------------------------------------------------
// Tipo de caso (conv_cases.case_ref_type)
// Fuente: contract-case-state-machine §6
// ---------------------------------------------------------------------------

export const CASE_REF_TYPE = {
  INCIDENT: 'incident',
  LEAD: 'lead',
  HELP_TICKET: 'help_ticket',
} as const;

export type CaseRefType = (typeof CASE_REF_TYPE)[keyof typeof CASE_REF_TYPE];

// ---------------------------------------------------------------------------
// Estado de mensaje (conv_messages.status)
// Fuente: skill-data-model-and-state §6.5
// ---------------------------------------------------------------------------

export const MESSAGE_STATUS = {
  RECEIVED: 'received',
  PROCESSING: 'processing',
  SENT: 'sent',
  FAILED: 'failed',
} as const;

export type MessageStatus = (typeof MESSAGE_STATUS)[keyof typeof MESSAGE_STATUS];

// ---------------------------------------------------------------------------
// Tipo de mensaje (conv_messages, NormalizedMessage)
// Fuente: contract-normalized-message §5
// ---------------------------------------------------------------------------

export const MESSAGE_TYPE = {
  TEXT: 'text',
  AUDIO: 'audio',
  IMAGE: 'image',
  DOCUMENT: 'document',
  SYSTEM: 'system',
} as const;

export type MessageType = (typeof MESSAGE_TYPE)[keyof typeof MESSAGE_TYPE];

// ---------------------------------------------------------------------------
// Tipo de remitente (conv_messages.sender_type)
// ---------------------------------------------------------------------------

export const SENDER_TYPE = {
  USER: 'user',
  BOT: 'bot',
  ADMIN: 'admin',
} as const;

export type SenderType = (typeof SENDER_TYPE)[keyof typeof SENDER_TYPE];

// ---------------------------------------------------------------------------
// Dirección de mensaje (conv_messages.direction)
// ---------------------------------------------------------------------------

export const MESSAGE_DIRECTION = {
  INBOUND: 'inbound',
  OUTBOUND: 'outbound',
} as const;

export type MessageDirection = (typeof MESSAGE_DIRECTION)[keyof typeof MESSAGE_DIRECTION];

// ---------------------------------------------------------------------------
// Estado de la cola de envío (conv_send_queue.status)
// Fuente: rules-90 §4.2
// ---------------------------------------------------------------------------

export const SEND_QUEUE_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
} as const;

export type SendQueueStatus = (typeof SEND_QUEUE_STATUS)[keyof typeof SEND_QUEUE_STATUS];

// ---------------------------------------------------------------------------
// Estado de la sesión Wasender (conv_wa_sessions.status)
// Fuente: rules-20 §4.4
// ---------------------------------------------------------------------------

export const WA_SESSION_STATUS = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  ACTIVE: 'active',
  ERROR: 'error',
} as const;

export type WaSessionStatus = (typeof WA_SESSION_STATUS)[keyof typeof WA_SESSION_STATUS];

// ---------------------------------------------------------------------------
// Tipo de notificación al admin (conv_admin_notifications.event_type)
// Fuente: rules-90 §4.8
// ---------------------------------------------------------------------------

export const ADMIN_NOTIFICATION_TYPE = {
  WA_SESSION_DISCONNECTED: 'wa_session_disconnected',
  SEND_QUEUE_FAILED: 'send_queue_failed',
  MESSAGES_STALLED: 'messages_stalled',
  CORE_API_ERRORS: 'core_api_errors',
  RECONCILE_JOB_STALLED: 'reconcile_job_stalled',
  CASE_AUTO_ESCALATED: 'case_auto_escalated',
  DELIVERY_FAILED_BATCH: 'delivery_failed_batch',
} as const;

export type AdminNotificationType = (typeof ADMIN_NOTIFICATION_TYPE)[keyof typeof ADMIN_NOTIFICATION_TYPE];

export const ADMIN_NOTIFICATION_SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export type AdminNotificationSeverity = (typeof ADMIN_NOTIFICATION_SEVERITY)[keyof typeof ADMIN_NOTIFICATION_SEVERITY];

// ---------------------------------------------------------------------------
// Tipos de evento del activity log
// Fuente: rules-75 §4.2
// ---------------------------------------------------------------------------

export const ACTIVITY_EVENT_TYPE = {
  SUBSCRIPTION_ACTIVATED: 'conv_subscription_activated',
  CHANNEL_CONNECTED: 'conv_channel_connected',
  CHANNEL_OFFBOARDED: 'conv_channel_offboarded',
  CONVERSATION_STARTED: 'conv_conversation_started',
  IDENTITY_VALIDATED: 'conv_identity_validated',
  PRE_INCIDENT_CREATED: 'conv_pre_incident_created',
  INCIDENT_CREATED: 'conv_incident_created',
  LEAD_CREATED: 'conv_lead_created',
  CASE_ESCALATED: 'conv_case_escalated',
  CASE_SUMMARY_UPDATED: 'conv_case_summary_updated',
  CASE_CLOSED: 'conv_case_closed',
  CASE_CREATED: 'conv_case_created',
  MESSAGE_DELIVERY_FAILED: 'conv_message_delivery_failed',
} as const;

export type ActivityEventType = (typeof ACTIVITY_EVENT_TYPE)[keyof typeof ACTIVITY_EVENT_TYPE];

// ---------------------------------------------------------------------------
// ResponseType (CanonicalResponse)
// Fuente: contract-canonical-response §5
// ---------------------------------------------------------------------------

export const RESPONSE_TYPE = {
  SUCCESS: 'success',
  PENDING_INPUT: 'pending_input',
  ESCALATED: 'escalated',
  IDENTITY_REQUIRED: 'identity_required',
  ERROR_HANDLED: 'error_handled',
  NO_SERVICE: 'no_service',
} as const;

export type ResponseType = (typeof RESPONSE_TYPE)[keyof typeof RESPONSE_TYPE];

// ---------------------------------------------------------------------------
// EscalationReason (CanonicalResponse)
// Fuente: contract-canonical-response §5
// ---------------------------------------------------------------------------

export const ESCALATION_REASON = {
  USER_REQUEST: 'user_request',
  IDENTITY_UNRESOLVED: 'identity_unresolved',
  CORE_ERROR: 'core_error',
  AI_LOW_CONFIDENCE: 'ai_low_confidence',
  AUTO_TIMEOUT: 'auto_timeout',
} as const;

export type EscalationReason = (typeof ESCALATION_REASON)[keyof typeof ESCALATION_REASON];

// ---------------------------------------------------------------------------
// MatchField (IdentityValidationResult)
// Fuente: contract-identity-validation-result §5
// ---------------------------------------------------------------------------

export const MATCH_FIELD = {
  PHONE: 'phone',
  NAME: 'name',
  ROOM: 'room',
  RESIDENCE: 'residence',
} as const;

export type MatchField = (typeof MATCH_FIELD)[keyof typeof MATCH_FIELD];

// ---------------------------------------------------------------------------
// Urgencia de incidencia
// Fuente: rules-75 §4.4 (payload conv_incident_created)
// ---------------------------------------------------------------------------

export const URGENCY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

export type Urgency = (typeof URGENCY)[keyof typeof URGENCY];

// ---------------------------------------------------------------------------
// Modo de offboard de Wasender
// Fuente: rules-20 §4.6
// ---------------------------------------------------------------------------

export const WA_OFFBOARD_MODE = {
  LOGOUT: 'logout',
  DELETE: 'delete',
} as const;

export type WaOffboardMode = (typeof WA_OFFBOARD_MODE)[keyof typeof WA_OFFBOARD_MODE];
