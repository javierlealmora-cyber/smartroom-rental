/**
 * Variables de entorno para el regression harness de SmartConversations.
 * Si faltan variables reales, los tests operan en modo mock/dev.
 *
 * No hardcodear secretos aquí. Usar .env.test local (no commiteado).
 */

export const ENV = {
  // Wasender — no obligatorio en Fase 0; se usa wasender.mock.ts
  WASENDER_API_BASE_URL: process.env.WASENDER_API_BASE_URL ?? 'https://api.wasender.com',
  WASENDER_API_KEY: process.env.WASENDER_API_KEY ?? 'mock-wasender-key',
  WASENDER_WEBHOOK_SECRET: process.env.WASENDER_WEBHOOK_SECRET ?? 'mock-webhook-secret-xxx',
  WASENDER_SESSION_ID: process.env.WASENDER_SESSION_ID ?? 'mock-session-id',

  // Claude / IA
  CLAUDE_API_KEY: process.env.CLAUDE_API_KEY ?? 'mock-claude-key',

  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL ?? 'http://localhost:54321',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? 'mock-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'mock-service-role-key',

  // Modo de ejecución
  USE_REAL_SERVICES: process.env.USE_REAL_SERVICES === 'true',
} as const;

export type TestEnv = typeof ENV;
