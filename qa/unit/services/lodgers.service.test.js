// qa/unit/services/lodgers.service.test.js
// Tests de los servicios Supabase para inquilinos (TEN-05..08)
// Usa chainMock para mockear el cliente Supabase.

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { buildChain } from '../helpers/chainMock.js';

// ── Mock del cliente Supabase ─────────────────────────────────────────────────

const mockFrom = vi.fn();
vi.mock('../../../src/services/supabaseClient.js', () => ({
  supabase: { from: mockFrom },
}));

const mockInvoke = vi.fn();
vi.mock('../../../src/services/supabaseInvoke.services.js', () => ({
  invokeWithAuth: mockInvoke,
}));

// Importar DESPUÉS de los mocks
const { listLodgers, getLodger, updateLodger, scheduleCheckout } =
  await import('../../../src/services/lodgers.service.js');

// ── TEN-08 — listLodgers filtra por client_account_id ────────────────────────

describe('listLodgers (TEN-08)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('llama a supabase.from("profiles") con filtro client_account_id', async () => {
    const mockData = [{ id: 'l-1', role: 'lodger', active_assignment: [] }];
    const chain = buildChain({ data: mockData, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await listLodgers({ clientAccountId: 'client-001' });

    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(chain.eq).toHaveBeenCalledWith('client_account_id', 'client-001');
    expect(result).toHaveLength(1);
  });

  it('sin clientAccountId no añade filtro de tenant', async () => {
    const chain = buildChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await listLodgers({});

    // eq se llama para role=lodger pero NO para client_account_id
    const eqCalls = chain.eq.mock.calls;
    const tenantCall = eqCalls.find(([col]) => col === 'client_account_id');
    expect(tenantCall).toBeUndefined();
  });

  it('lanza error si Supabase devuelve error', async () => {
    const chain = buildChain({ data: null, error: { message: 'DB error' } });
    mockFrom.mockReturnValue(chain);

    await expect(listLodgers({})).rejects.toThrow('DB error');
  });

  it('filtra asignaciones con move_out_date pasada en cliente', async () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const futureDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const mockData = [{
      id: 'l-1',
      role: 'lodger',
      active_assignment: [
        { id: 'a1', move_out_date: pastDate },   // debe eliminarse
        { id: 'a2', move_out_date: null },        // debe mantenerse
        { id: 'a3', move_out_date: futureDate },  // debe mantenerse
      ],
    }];
    const chain = buildChain({ data: mockData, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await listLodgers({});
    expect(result[0].active_assignment).toHaveLength(2);
    expect(result[0].active_assignment.map(a => a.id)).toEqual(['a2', 'a3']);
  });
});

// ── TEN-07 — updateLodger filtra campos inmutables ────────────────────────────

describe('updateLodger (TEN-07)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('no envía id, email, role, client_account_id, created_at al UPDATE', async () => {
    const chain = buildChain({ data: { id: 'l-1', full_name: 'Ana' }, error: null });
    mockFrom.mockReturnValue(chain);

    await updateLodger('l-1', {
      id: 'l-1',
      email: 'ana@test.com',
      role: 'lodger',
      client_account_id: 'client-001',
      created_at: '2026-01-01',
      full_name: 'Ana García',
    });

    // Verificar que update se llama sin los campos inmutables
    const updateCall = chain.update.mock.calls[0][0];
    expect(updateCall).not.toHaveProperty('id');
    expect(updateCall).not.toHaveProperty('email');
    expect(updateCall).not.toHaveProperty('role');
    expect(updateCall).not.toHaveProperty('client_account_id');
    expect(updateCall).not.toHaveProperty('created_at');
    expect(updateCall).toHaveProperty('full_name', 'Ana García');
  });
});

// ── TEN-06 — scheduleCheckout → move_out_date guardada ───────────────────────

describe('scheduleCheckout (TEN-06)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('actualiza move_out_date en la asignación activa', async () => {
    const assignment = { id: 'asgn-1', room_id: 'room-1' };
    const chainGet = buildChain({ data: assignment, error: null });
    const chainUpdate = buildChain({ data: null, error: null });

    mockFrom
      .mockReturnValueOnce(chainGet)   // SELECT asignación activa
      .mockReturnValueOnce(chainUpdate); // UPDATE move_out_date

    const result = await scheduleCheckout('lodger-1', '2026-06-30');

    expect(chainUpdate.update).toHaveBeenCalledWith({ move_out_date: '2026-06-30' });
    expect(result).toEqual({ assignment_id: 'asgn-1' });
  });

  it('lanza error si no hay asignación activa', async () => {
    const chainGet = buildChain({ data: null, error: null });
    mockFrom.mockReturnValue(chainGet);

    await expect(scheduleCheckout('lodger-1', '2026-06-30'))
      .rejects.toThrow('No hay asignación activa');
  });
});
