/**
 * Tipos TypeScript de los contratos de SmartConversations.
 * Fuente: docs/smart-conversations/contracts/
 * Sin lógica de negocio.
 */

import type {
  ChannelCode,
  ServiceCode,
  CaseStatus,
  ResponseType,
  EscalationReason,
  MatchField,
  ValidationIdentityLevel,
  IdentityLevel,
  Urgency,
  ActivityEventType,
  WaOffboardMode,
} from './enums.js';

// ---------------------------------------------------------------------------
// NormalizedMessage
// Fuente: contract-normalized-message.md
// ---------------------------------------------------------------------------

export interface NormalizedMessage {
  /** UUID generado por conv-ingest. No puede ser igual a external_id. */
  message_id: string;
  /** wasender_message_id (WhatsApp) o ID de mensaje del cliente web. Obligatorio en WhatsApp. */
  external_id?: string;

  client_account_id: string;
  channel: ChannelCode;

  /** UUID de conv_sessions. Puede estar ausente en el primer mensaje de sesión nueva. */
  session_id?: string;

  /**
   * Identificador del remitente en este canal.
   * - WhatsApp: teléfono en formato internacional, SIN sufijo (p.ej. "+34612345678").
   *   El sufijo "@c.us" solo se añade al construir el campo `to` para la API de Wasender.
   *   Debe tratarse como PII: no enviarlo a n8n, no loguearlo.
   * - WebChat: UUID del session_id.
   * Fuente: contract-normalized-message §8.4
   */
  sender_ref: string;

  message_type: 'text' | 'audio' | 'image' | 'document' | 'system';
  /** Texto del mensaje o transcripción de audio. Obligatorio para message_type text/audio. */
  text?: string;
  audio_url?: string;
  image_url?: string;
  media_caption?: string;
  /** Obligatorio true cuando message_type = 'audio'. */
  is_transcribed: boolean;
  reply_to_id?: string;
  /** ISO 8601 UTC */
  received_at: string;
}

// ---------------------------------------------------------------------------
// IdentityValidationRequest / IdentityValidationResult
// Fuente: contract-identity-validation-result.md
// ---------------------------------------------------------------------------

export interface IdentityValidationRequest {
  client_account_id: string;
  /** UUID del perfil. Fast-path de WebChat cuando el JWT está resuelto. */
  profile_id?: string;
  /** Formato internacional: +34612345678. Fast-path de WhatsApp. */
  phone?: string;
  full_name?: string;
  residence_name?: string;
  room_label?: string;
}

export interface IdentityValidationResult {
  identity_level: ValidationIdentityLevel;
  /**
   * UUID del perfil. Presente cuando identity_level != NO_MATCH.
   * NUNCA reenviar a n8n ni a la IA. Almacenar en conv_sessions por la EF.
   */
  profile_id?: string;
  /**
   * UUID de la asignación activa. Presente cuando identity_level IN (STRONG, PARTIAL) ACTIVE.
   * NUNCA reenviar a n8n.
   */
  assignment_id?: string;
  accommodation_id?: string;
  room_id?: string;
  /**
   * Etiqueta legible de la habitación (contexto de identidad/contrato — es PII).
   * No confundir con room_label de datos de listing (público).
   * NUNCA reenviar a n8n.
   */
  room_label?: string;
  /** Nombre validado desde el perfil del Core. NUNCA reenviar a n8n. */
  full_name?: string;
  match_details: {
    /** Campos que contribuyeron a la coincidencia. Array vacío cuando NO_MATCH. */
    matched_by: MatchField[];
    /** 0.0 cuando NO_MATCH. ≥ 0.95 cuando STRONG_MATCH_ACTIVE por phone. */
    confidence: number;
  };
}

/** Subset de IdentityValidationResult seguro para pasar a n8n (solo identity_level) */
export interface IdentityLevelForN8n {
  identity_level: IdentityLevel;
}

// ---------------------------------------------------------------------------
// CanonicalResponse
// Fuente: contract-canonical-response.md
// ---------------------------------------------------------------------------

export interface CanonicalResponse {
  session_id: string;
  service_code: ServiceCode;
  response_type: ResponseType;
  /**
   * Texto final para el usuario. Marcadores ya sustituidos por la EF.
   * No puede contener: {incident_ref}, {lead_ref}, {due_date}, {amount}.
   * No puede contener: {user_name} (no es marcador oficial).
   * No puede contener PII (profile_id, phone_number, full_name, room_label).
   */
  text: string;
  next_state?: CaseStatus;
  case_id?: string;
  /** Referencia legible del Core (INC-2026-NNNN, LEAD-2026-NNNN). */
  case_ref?: string;
  /** Omitir si false; incluir explícitamente solo si true. */
  escalated?: boolean;
  /** Obligatorio si escalated = true. */
  escalation_reason?: EscalationReason;
  /** Obligatorio true si response_type = 'pending_input'. */
  needs_more_input?: boolean;
  suggested_actions?: string[];
  /** Datos de depuración interna. WF-91 y WF-92 lo ignoran siempre. */
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// TenantFeaturesResponse
// Fuente: contract-tenant-features-response.md
// ---------------------------------------------------------------------------

export interface ServiceActivation {
  service_code: ServiceCode;
  channels: ChannelCode[];
  config?: ServiceConfig;
}

export interface ServiceConfig {
  auto_escalate_after_minutes?: number;
  ai_confidence_threshold?: number;
  kb_confidence_threshold?: number;
  fallback_message?: string;
}

export interface PlanLimits {
  /** 0 = ilimitado */
  max_cases_per_month: number;
  ai_enabled: boolean;
  webchat_enabled: boolean;
  whatsapp_enabled: boolean;
}

export interface TenantFeaturesResponse {
  /** Lista de servicios activos. [] si ninguno está activo. */
  services_active: ServiceActivation[];
  plan_limits: PlanLimits;
}

// ---------------------------------------------------------------------------
// Activity Log — payloads de eventos
// Fuente: rules-75 §4.3/4.4
// ---------------------------------------------------------------------------

/** Estructura base obligatoria de todos los eventos del activity log */
export interface ActivityLogEvent<T extends ActivityEventData = ActivityEventData> {
  event_type: ActivityEventType;
  source: 'smartconversations';
  client_account_id: string;
  /** ISO 8601 */
  timestamp: string;
  data: T;
}

/** Payload data de conv_subscription_activated */
export interface ActivityDataSubscriptionActivated {
  service_code: 'smart_conversations';
}

/** Payload data de conv_channel_connected */
export interface ActivityDataChannelConnected {
  channel: ChannelCode;
}

/** Payload data de conv_channel_offboarded */
export interface ActivityDataChannelOffboarded {
  channel: ChannelCode;
  mode: WaOffboardMode;
}

/** Payload data de conv_conversation_started */
export interface ActivityDataConversationStarted {
  session_id: string;
  channel: ChannelCode;
}

/** Payload data de conv_identity_validated (solo STRONG o PARTIAL) */
export interface ActivityDataIdentityValidated {
  session_id: string;
  identity_level: 'STRONG_MATCH_ACTIVE' | 'PARTIAL_MATCH_ACTIVE';
  channel: ChannelCode;
}

/** Payload data de conv_pre_incident_created */
export interface ActivityDataPreIncidentCreated {
  conv_case_id: string;
  channel: ChannelCode;
  incident_type: string;
  urgency: Urgency;
}

/** Payload data de conv_incident_created */
export interface ActivityDataIncidentCreated {
  incident_id: string;
  incident_ref: string;
  conv_case_id: string;
  channel: ChannelCode;
  incident_type: string;
  urgency: Urgency;
}

/** Payload data de conv_lead_created */
export interface ActivityDataLeadCreated {
  lead_id: string;
  lead_ref: string;
  listing_id: string;
  conv_case_id: string;
  channel: ChannelCode;
  interest_type: 'immediate' | 'future';
}

/** Payload data de conv_case_escalated */
export interface ActivityDataCaseEscalated {
  conv_case_id: string;
  channel: ChannelCode;
  service_code: ServiceCode;
  reason: 'identity_failed' | 'no_kb_match' | 'admin_requested';
}

/** Payload data de conv_case_summary_updated */
export interface ActivityDataCaseSummaryUpdated {
  conv_case_id: string;
  case_ref_type: 'incident' | 'lead' | 'help_ticket';
  /** Texto funcional anónimo. Sin PII. Sin mensajes literales del usuario. */
  summary: string;
}

/** Payload data de conv_case_closed */
export interface ActivityDataCaseClosed {
  conv_case_id: string;
  /** Opcional para help_ticket sin objeto en el Core */
  case_ref_id?: string;
  case_ref_type: 'incident' | 'lead' | 'help_ticket';
  resolution_channel: ChannelCode | 'admin_panel';
}

/** Payload data de conv_case_created */
export interface ActivityDataCaseCreated {
  conv_case_id: string;
  case_ref_type: 'incident' | 'lead' | 'help_ticket';
  service_code: ServiceCode;
  channel: ChannelCode;
}

/** Payload data de conv_message_delivery_failed */
export interface ActivityDataMessageDeliveryFailed {
  session_id: string;
  conv_case_id?: string;
  channel: ChannelCode;
  attempts: number;
  /** Enum técnico resumido, sin detalle de proveedor. */
  reason: string;
}

/** Unión de todos los payloads data posibles */
export type ActivityEventData =
  | ActivityDataSubscriptionActivated
  | ActivityDataChannelConnected
  | ActivityDataChannelOffboarded
  | ActivityDataConversationStarted
  | ActivityDataIdentityValidated
  | ActivityDataPreIncidentCreated
  | ActivityDataIncidentCreated
  | ActivityDataLeadCreated
  | ActivityDataCaseEscalated
  | ActivityDataCaseSummaryUpdated
  | ActivityDataCaseClosed
  | ActivityDataCaseCreated
  | ActivityDataMessageDeliveryFailed;
