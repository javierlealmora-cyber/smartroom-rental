/**
 * Tipos TypeScript que reflejan el schema SQL de la migración 20260716000001.
 * Una fila por tabla conv_*. Sin lógica de negocio.
 *
 * Los campos jsonb se tipan como Record<string, unknown> por defecto.
 * Los tipos de jsonb con estructura conocida tienen su propio tipo en contracts.ts.
 */

import type {
  ChannelCode,
  SessionState,
  IdentityLevel,
  CaseStatus,
  CaseRefType,
  MessageStatus,
  MessageType,
  SenderType,
  MessageDirection,
  SendQueueStatus,
  WaSessionStatus,
  ServiceCode,
  AdminNotificationType,
  AdminNotificationSeverity,
} from './enums.js';

// ---------------------------------------------------------------------------
// conv_service_activations
// ---------------------------------------------------------------------------

export interface ConvServiceActivationRow {
  id: string;
  client_account_id: string;
  service_code: ServiceCode;
  channel: ChannelCode;
  is_active: boolean;
  config: Record<string, unknown> | null;
  deactivated_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ConvServiceActivationInsert = Omit<ConvServiceActivationRow, 'id' | 'created_at' | 'updated_at'>;

// ---------------------------------------------------------------------------
// conv_wa_sessions
// ---------------------------------------------------------------------------

export interface ConvWaSessionRow {
  id: string;
  client_account_id: string;
  wasender_session_id: string;
  status: WaSessionStatus;
  webhook_secret: string;
  /** Nombre del secreto en Supabase Vault; nunca la API key en texto claro */
  api_key_secret_name: string | null;
  connected_at: string | null;
  disconnected_at: string | null;
  last_webhook_at: string | null;
  config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export type ConvWaSessionInsert = Omit<ConvWaSessionRow, 'id' | 'created_at' | 'updated_at'>;
export type ConvWaSessionUpdate = Partial<Omit<ConvWaSessionInsert, 'client_account_id'>>;

// ---------------------------------------------------------------------------
// conv_wc_configs
// ---------------------------------------------------------------------------

export interface ConvWcConfigRow {
  id: string;
  client_account_id: string;
  is_active: boolean;
  allowed_origins: string[];
  widget_title: string | null;
  widget_color: string | null;
  config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export type ConvWcConfigInsert = Omit<ConvWcConfigRow, 'id' | 'created_at' | 'updated_at'>;

// ---------------------------------------------------------------------------
// conv_sessions
// ---------------------------------------------------------------------------

/**
 * Datos de identidad almacenados en conv_sessions.identity_data.
 * Contiene únicamente datos declarados por el usuario durante identificación progresiva.
 * - Nunca incluye phone_number en texto claro (rules-80 §4.8).
 * - Puede incluir full_name, residence_name y room_label declarados por el usuario.
 * - Solo accesible por EFs con service_role. Nunca se reenvía a n8n ni a la IA.
 */
export interface ConvSessionIdentityData {
  /** Nombre completo declarado por el usuario. Sensible — no reenviar a n8n. */
  full_name?: string;
  /** Nombre de la residencia declarado por el usuario. */
  residence_name?: string;
  /**
   * Etiqueta de habitación declarada por el usuario.
   * En contexto de identidad es PII (rules-80 §4.1).
   * No confundir con room_label de datos de listing, que es público.
   */
  room_label?: string;
}

export interface ConvSessionRow {
  id: string;
  client_account_id: string;
  channel: ChannelCode;
  /**
   * Identificador del remitente en este canal.
   * - WhatsApp: teléfono en formato internacional sin sufijos (p.ej. "+34612345678").
   *   Debe tratarse como PII: nunca enviarlo a n8n, IA ni loguearlo.
   *   Solo lo usan EFs autorizadas como conv-send-wa.
   * - WebChat: UUID de sesión del widget (no PII).
   * Fuente: contract-normalized-message §8.4
   */
  sender_ref: string;
  state: SessionState;
  identity_level: IdentityLevel;
  /**
   * UUID del perfil en SmartRoom Core.
   * Almacenado por EF tras conv-core-validate-identity.
   * NUNCA se pasa a n8n ni a la IA (rules-80 §3.4).
   */
  profile_id: string | null;
  identity_data: ConvSessionIdentityData;
  /** Contador de intentos de WF-IDENTITY. Máximo 3 (rules-40 §3.7). */
  identity_attempts: number;
  active_service_code: ServiceCode | null;
  /** UUID del caso activo. FK a conv_cases (DEFERRABLE). */
  active_case_id: string | null;
  open_cases_ids: string[];
  last_active_at: string;
  created_at: string;
  updated_at: string;
}

export type ConvSessionInsert = Omit<ConvSessionRow, 'id' | 'created_at' | 'updated_at' | 'last_active_at' | 'open_cases_ids'>
  & {
    open_cases_ids?: string[];
    last_active_at?: string;
  };

export type ConvSessionUpdate = Partial<Omit<ConvSessionInsert, 'client_account_id' | 'channel' | 'sender_ref'>>;

// ---------------------------------------------------------------------------
// conv_cases
// ---------------------------------------------------------------------------

export interface ConvCaseRow {
  id: string;
  client_account_id: string;
  session_id: string;
  service_code: ServiceCode;
  status: CaseStatus;
  case_ref_type: CaseRefType;
  /** Referencia legible asignada por el Core. Null hasta confirmación. */
  case_ref: string | null;
  summary: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type ConvCaseInsert = Omit<ConvCaseRow, 'id' | 'created_at' | 'updated_at'>;
export type ConvCaseUpdate = Partial<Omit<ConvCaseInsert, 'client_account_id' | 'session_id' | 'case_ref_type'>>;

// ---------------------------------------------------------------------------
// conv_messages
// ---------------------------------------------------------------------------

export interface ConvMessageRow {
  id: string;
  client_account_id: string;
  session_id: string;
  case_id: string | null;
  channel: ChannelCode;
  sender_type: SenderType;
  direction: MessageDirection;
  text: string | null;
  status: MessageStatus;
  /** ID de mensaje de Wasender. Solo para WhatsApp. NULL para WebChat. */
  wasender_message_id: string | null;
  /**
   * Payload completo del webhook o mensaje WebChat.
   * Retención: 30 días (rules-80 §4.7).
   * NUNCA exponer a n8n ni a la IA.
   */
  raw_payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export type ConvMessageInsert = Omit<ConvMessageRow, 'id' | 'created_at' | 'updated_at'>;
export type ConvMessageUpdate = Partial<Pick<ConvMessageRow, 'status' | 'case_id' | 'updated_at'>>;

// ---------------------------------------------------------------------------
// conv_send_queue
// Fuente: rules-90 §4.2 — DDL oficial
// ---------------------------------------------------------------------------

export interface ConvSendQueueRow {
  id: string;
  session_id: string;
  client_account_id: string;
  channel: ChannelCode;
  message_id: string | null;
  /** Datos de envío. Sin PII en texto claro. */
  payload: Record<string, unknown>;
  /** Número de intentos realizados. Fuente: rules-90 §4.2. */
  attempts: number;
  max_retries: number;
  /** Timestamp del próximo intento. Fuente: rules-90 §4.2. */
  next_attempt_at: string;
  last_error: string | null;
  status: SendQueueStatus;
  created_at: string;
}

export type ConvSendQueueInsert = Omit<ConvSendQueueRow, 'id' | 'created_at'>;
export type ConvSendQueueUpdate = Partial<Pick<ConvSendQueueRow, 'status' | 'attempts' | 'next_attempt_at' | 'last_error'>>;

// ---------------------------------------------------------------------------
// conv_admin_notifications
// ---------------------------------------------------------------------------

export interface ConvAdminNotificationRow {
  id: string;
  client_account_id: string;
  event_type: AdminNotificationType;
  severity: AdminNotificationSeverity;
  /** Contexto no PII: IDs opacos, contadores, enums. */
  context: Record<string, unknown>;
  is_read: boolean;
  resolved_at: string | null;
  created_at: string;
}

export type ConvAdminNotificationInsert = Omit<ConvAdminNotificationRow, 'id' | 'created_at'>;
