/**
 * activity-log.ts -- Tipos y helpers de Activity Log para SmartConversations.
 *
 * Los tipos de evento se definen en ACTIVITY_EVENT_TYPE.
 * Los eventos WebChat de notificacion de mensajes NO se registran en Activity Log.
 * Fuente: SmartConversations rules-31, rules-80.
 */

export type ActivityEventType =
  | 'conversation_started'
  | 'conversation_closed'
  | 'message_received'
  | 'message_sent'
  | 'identity_validated'
  | 'case_created'
  | 'case_updated'
  | 'escalation_requested'
  | 'assignment_changed'
  | 'tenant_feature_checked';

export interface ActivityLogEntry {
  event_type:       ActivityEventType;
  client_account_id: string;
  session_id?:       string;
  message_id?:       string;
  case_id?:          string;
  actor_type?:       'system' | 'agent' | 'bot';
  metadata?:         Record<string, unknown>;
  created_at:        string;
}
