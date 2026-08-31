/**
 * Configuración de servicios externos para el regression harness.
 * Todos los endpoints apuntan a mocks en Fase 0.
 */

import { ENV } from './test-env.js';

export const SERVICES = {
  wasender: {
    baseUrl: ENV.WASENDER_API_BASE_URL,
    apiKey: ENV.WASENDER_API_KEY,
    webhookSecret: ENV.WASENDER_WEBHOOK_SECRET,
    sessionId: ENV.WASENDER_SESSION_ID,
    endpoints: {
      sendMessage: '/api/send-message',
      sessionStatus: '/api/session-status',
    },
  },
  supabase: {
    url: ENV.SUPABASE_URL,
    anonKey: ENV.SUPABASE_ANON_KEY,
    serviceRoleKey: ENV.SUPABASE_SERVICE_ROLE_KEY,
    /** EFs del add-on SmartConversations */
    functions: {
      convIngest: 'conv-ingest',
      convCoreCreateIncident: 'conv-core-create-incident',
      convCorePublishActivity: 'conv-core-publish-activity',
      convWebSession: 'conv-web-session',
      convWebMessage: 'conv-web-message',
    },
  },
  claude: {
    apiKey: ENV.CLAUDE_API_KEY,
  },
  n8n: {
    /** WF-01 — recepción de mensajes WhatsApp desde Wasender */
    wf01WebhookUrl: process.env.N8N_WF01_WEBHOOK_URL ?? 'http://localhost:5678/webhook/wf-01',
    /** WF-20 — workflow de incidencias */
    wf20WebhookUrl: process.env.N8N_WF20_WEBHOOK_URL ?? 'http://localhost:5678/webhook/wf-20',
    /** WF-30 — workflow de leads/listings */
    wf30WebhookUrl: process.env.N8N_WF30_WEBHOOK_URL ?? 'http://localhost:5678/webhook/wf-30',
    /** WF-40 — workflow de ayuda */
    wf40WebhookUrl: process.env.N8N_WF40_WEBHOOK_URL ?? 'http://localhost:5678/webhook/wf-40',
    /** WF-IDENTITY — validación progresiva de identidad */
    wfIdentityWebhookUrl: process.env.N8N_WFIDENTITY_WEBHOOK_URL ?? 'http://localhost:5678/webhook/wf-identity',
  },
} as const;
