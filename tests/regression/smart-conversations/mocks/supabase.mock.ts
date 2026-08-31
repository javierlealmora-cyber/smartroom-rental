/**
 * Mock del cliente Supabase para tests de regresión.
 * No realiza conexiones reales a la base de datos.
 */

import { vi } from 'vitest';

/** Construye un mock mínimo del cliente Supabase */
export function createSupabaseMock() {
  const selectMock = vi.fn().mockResolvedValue({ data: [], error: null });
  const insertMock = vi.fn().mockResolvedValue({ data: [{}], error: null });
  const updateMock = vi.fn().mockResolvedValue({ data: [{}], error: null });
  const deleteMock = vi.fn().mockResolvedValue({ data: [], error: null });
  const upsertMock = vi.fn().mockResolvedValue({ data: [{}], error: null });

  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: insertMock,
    update: updateMock,
    delete: deleteMock,
    upsert: upsertMock,
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  const fromMock = vi.fn().mockReturnValue(queryBuilder);

  const functionsMock = {
    invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    from: fromMock,
    functions: functionsMock,
    _queryBuilder: queryBuilder,
    _selectMock: selectMock,
    _insertMock: insertMock,
    _updateMock: updateMock,
  };
}

/** Respuesta de EF con éxito */
export function mockEFSuccess(data: unknown) {
  return { data, error: null };
}

/** Respuesta de EF con error */
export function mockEFError(message: string, status = 500) {
  return {
    data: null,
    error: { message, status },
  };
}

/** Simula un registro de conv_sessions existente */
export function mockSessionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sess-mock-default',
    client_account_id: 'aaaa-0001-test-tenant-a',
    channel: 'whatsapp',
    external_id: '+34600000001',
    identity_level: 'NO_MATCH',
    identity_attempts: 0,
    status: 'active',
    created_at: '2026-07-16T10:00:00.000Z',
    updated_at: '2026-07-16T10:00:00.000Z',
    ...overrides,
  };
}

/** Simula un registro de conv_cases existente */
export function mockCaseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'conv-case-mock-default',
    client_account_id: 'aaaa-0001-test-tenant-a',
    session_id: 'sess-mock-default',
    channel: 'whatsapp',
    case_ref_type: 'incident',
    status: 'open',
    created_at: '2026-07-16T10:10:00.000Z',
    updated_at: '2026-07-16T10:10:00.000Z',
    ...overrides,
  };
}
