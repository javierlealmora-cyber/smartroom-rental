/**
 * Helper para resetear el estado de test entre suites.
 * En Fase 0 solo limpia mocks de Vitest. En fases posteriores
 * podrá conectar con Supabase local (local dev environment).
 */

import { vi } from 'vitest';

/** Resetea todos los mocks de Vitest entre tests */
export function resetTestMocks(): void {
  vi.clearAllMocks();
}

/** Resetea módulos importados (útil para circuit breaker tests) */
export function resetTestModules(): void {
  vi.resetModules();
}

/**
 * Estado en memoria simulado de las tablas conv_* para tests unitarios.
 * Solo para fases donde no se usa Supabase local real.
 */
export function createInMemoryConvStore() {
  return {
    conv_sessions: [] as Record<string, unknown>[],
    conv_cases: [] as Record<string, unknown>[],
    conv_messages: [] as Record<string, unknown>[],
    conv_send_queue: [] as Record<string, unknown>[],

    reset() {
      this.conv_sessions = [];
      this.conv_cases = [];
      this.conv_messages = [];
      this.conv_send_queue = [];
    },
  };
}
