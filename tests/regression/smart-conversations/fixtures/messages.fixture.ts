import { TEST_TENANT_A, TEST_TENANT_B } from '../config/tenants.js';

/** Mensaje de texto WhatsApp normalizado */
export const fixtureNormalizedMessageWhatsApp = {
  channel: 'whatsapp' as const,
  client_account_id: TEST_TENANT_A.client_account_id,
  session_id: 'sess-wa-0001',
  external_message_id: 'wamid.mock-0001',
  content: 'Hola, el grifo del baño no funciona',
  content_type: 'text' as const,
  timestamp: '2026-07-16T10:05:00.000Z',
};

/** Mensaje de texto WebChat normalizado */
export const fixtureNormalizedMessageWebChat = {
  channel: 'webchat' as const,
  client_account_id: TEST_TENANT_B.client_account_id,
  session_id: 'sess-wc-0001',
  external_message_id: 'wc-msg-mock-0001',
  content: 'Me gustaría saber el precio de una habitación individual',
  content_type: 'text' as const,
  timestamp: '2026-07-16T10:06:00.000Z',
};

/** Mensaje con intención de incidencia */
export const fixtureMessageIncidentIntent = {
  ...fixtureNormalizedMessageWhatsApp,
  external_message_id: 'wamid.mock-incident-01',
  content: 'Hay una fuga de agua en mi habitación, es urgente',
};

/** Mensaje con intención de lead/listing */
export const fixtureMessageListingIntent = {
  ...fixtureNormalizedMessageWebChat,
  external_message_id: 'wc-msg-mock-listing-01',
  content: '¿Tienen habitaciones disponibles para octubre?',
};

/** Mensaje con intención de ayuda */
export const fixtureMessageHelpIntent = {
  ...fixtureNormalizedMessageWhatsApp,
  external_message_id: 'wamid.mock-help-01',
  content: '¿Cómo puedo pagar la mensualidad?',
};

/** Mensaje con información de identidad (nombre + residencia) */
export const fixtureMessageWithIdentityInfo = {
  ...fixtureNormalizedMessageWhatsApp,
  external_message_id: 'wamid.mock-identity-01',
  session_id: 'sess-wa-0003',
  content: 'Me llamo Juan García y vivo en la residencia Sol, habitación 204',
};

export type NormalizedMessage = typeof fixtureNormalizedMessageWhatsApp;
