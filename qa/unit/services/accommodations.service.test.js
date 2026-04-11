// qa/unit/services/accommodations.service.test.js
// Tests de servicios Supabase para habitaciones y alojamientos (REQ-005, ACC-05..09)
// Usa chainMock para mockear el cliente Supabase.
// Sin red, sin DOM.

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { buildChain } from '../helpers/chainMock.js';

// ── Mock del cliente Supabase ─────────────────────────────────────────────────

const mockFrom = vi.fn();
vi.mock('../../../src/services/supabaseClient.js', () => ({
  supabase: { from: mockFrom },
}));

// Importar DESPUÉS de los mocks
const { listRooms, listAccommodations } =
  await import('../../../src/services/accommodations.service.js');

const TODAY = new Date().toISOString().split('T')[0];
const FUTURE = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

// ── ACC-05 — listRooms: derivedStatus correcto por estado ─────────────────────

describe('listRooms — derivedStatus (ACC-05, REQ-005)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('habitación sin asignaciones activas → derivedStatus: free', async () => {
    const rooms = [{ id: 'r-1', is_maintenance: false }];
    const assignments = [];

    const chainRooms   = buildChain({ data: rooms,       error: null });
    const chainAsgns   = buildChain({ data: assignments, error: null });
    mockFrom.mockReturnValueOnce(chainRooms).mockReturnValueOnce(chainAsgns);

    const result = await listRooms('acc-001');
    expect(result[0].derivedStatus).toBe('free');
  });

  it('habitación con asignación activa (move_out_date null) → occupied', async () => {
    const rooms = [{ id: 'r-1', is_maintenance: false }];
    const assignments = [{ room_id: 'r-1', move_out_date: null }];

    const chainRooms = buildChain({ data: rooms,       error: null });
    const chainAsgns = buildChain({ data: assignments, error: null });
    mockFrom.mockReturnValueOnce(chainRooms).mockReturnValueOnce(chainAsgns);

    const result = await listRooms('acc-001');
    expect(result[0].derivedStatus).toBe('occupied');
  });

  it('habitación con asignación con fecha futura → pending_checkout', async () => {
    const rooms = [{ id: 'r-1', is_maintenance: false }];
    const assignments = [{ room_id: 'r-1', move_out_date: FUTURE }];

    const chainRooms = buildChain({ data: rooms,       error: null });
    const chainAsgns = buildChain({ data: assignments, error: null });
    mockFrom.mockReturnValueOnce(chainRooms).mockReturnValueOnce(chainAsgns);

    const result = await listRooms('acc-001');
    expect(result[0].derivedStatus).toBe('pending_checkout');
  });

  it('habitación con is_maintenance=true → maintenance (prioridad sobre asignaciones)', async () => {
    const rooms = [{ id: 'r-1', is_maintenance: true }];
    const assignments = [{ room_id: 'r-1', move_out_date: null }];

    const chainRooms = buildChain({ data: rooms,       error: null });
    const chainAsgns = buildChain({ data: assignments, error: null });
    mockFrom.mockReturnValueOnce(chainRooms).mockReturnValueOnce(chainAsgns);

    const result = await listRooms('acc-001');
    expect(result[0].derivedStatus).toBe('maintenance');
  });

  it('resultado preserva todos los campos originales del room', async () => {
    const rooms = [{ id: 'r-1', is_maintenance: false, number: '101', monthly_rent: 450 }];
    const chainRooms = buildChain({ data: rooms,  error: null });
    const chainAsgns = buildChain({ data: [],     error: null });
    mockFrom.mockReturnValueOnce(chainRooms).mockReturnValueOnce(chainAsgns);

    const result = await listRooms('acc-001');
    expect(result[0].number).toBe('101');
    expect(result[0].monthly_rent).toBe(450);
    expect(result[0].derivedStatus).toBe('free');
  });

  it('múltiples habitaciones: cada una recibe su derivedStatus independiente', async () => {
    const rooms = [
      { id: 'r-1', is_maintenance: false },
      { id: 'r-2', is_maintenance: false },
      { id: 'r-3', is_maintenance: true  },
    ];
    const assignments = [
      { room_id: 'r-1', move_out_date: null },   // occupied
      { room_id: 'r-2', move_out_date: FUTURE },  // pending_checkout
      // r-3 en mantenimiento, sin asignación
    ];

    const chainRooms = buildChain({ data: rooms,       error: null });
    const chainAsgns = buildChain({ data: assignments, error: null });
    mockFrom.mockReturnValueOnce(chainRooms).mockReturnValueOnce(chainAsgns);

    const result = await listRooms('acc-001');
    const byId = Object.fromEntries(result.map(r => [r.id, r.derivedStatus]));
    expect(byId['r-1']).toBe('occupied');
    expect(byId['r-2']).toBe('pending_checkout');
    expect(byId['r-3']).toBe('maintenance');
  });

  it('lanza error si Supabase devuelve error en rooms', async () => {
    const chainRooms = buildChain({ data: null, error: { message: 'DB error rooms' } });
    const chainAsgns = buildChain({ data: [],   error: null });
    mockFrom.mockReturnValueOnce(chainRooms).mockReturnValueOnce(chainAsgns);

    await expect(listRooms('acc-001')).rejects.toThrow('DB error rooms');
  });
});

// ── ACC-06 — listRooms: filtro de asignaciones activas/futuras ────────────────

describe('listRooms — filtro de asignaciones (ACC-06, REQ-005)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('usa .or con move_out_date.is.null y move_out_date.gt.today para excluir pasadas', async () => {
    const chainRooms = buildChain({ data: [], error: null });
    const chainAsgns = buildChain({ data: [], error: null });
    mockFrom.mockReturnValueOnce(chainRooms).mockReturnValueOnce(chainAsgns);

    await listRooms('acc-001');

    const orCall = chainAsgns.or.mock.calls[0]?.[0];
    expect(orCall).toContain('move_out_date.is.null');
    expect(orCall).toContain(`move_out_date.gt.${TODAY}`);
  });

  it('filtra por accommodation_id', async () => {
    const chainRooms = buildChain({ data: [], error: null });
    const chainAsgns = buildChain({ data: [], error: null });
    mockFrom.mockReturnValueOnce(chainRooms).mockReturnValueOnce(chainAsgns);

    await listRooms('acc-specific-123');

    expect(chainAsgns.eq).toHaveBeenCalledWith('accommodation_id', 'acc-specific-123');
  });
});

// ── ACC-07 — listAccommodations: derivedStatus embebido en rooms ──────────────

describe('listAccommodations — derivedStatus en rooms (ACC-07, REQ-005)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rooms incluyen derivedStatus derivado de current_assignments', async () => {
    const mockData = [{
      id: 'acc-1',
      name: 'Piso Centro',
      client_account_id: 'client-001',
      owner_entity: null,
      rooms: [
        {
          id: 'r-1', is_maintenance: false,
          current_assignments: [{ room_id: 'r-1', move_out_date: null }],
        },
        {
          id: 'r-2', is_maintenance: false,
          current_assignments: [],
        },
        {
          id: 'r-3', is_maintenance: true,
          current_assignments: [],
        },
      ],
    }];

    const chain = buildChain({ data: mockData, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await listAccommodations({});
    const rooms = result[0].rooms;
    expect(rooms.find(r => r.id === 'r-1').derivedStatus).toBe('occupied');
    expect(rooms.find(r => r.id === 'r-2').derivedStatus).toBe('free');
    expect(rooms.find(r => r.id === 'r-3').derivedStatus).toBe('maintenance');
  });

  it('regresión BUG-037: rooms tienen derivedStatus (ya no leen r.status)', async () => {
    // Verifica que el fix está en su lugar: rooms ahora tienen derivedStatus, no status.
    const mockData = [{
      id: 'acc-1', name: 'Piso', client_account_id: 'client-001', owner_entity: null,
      rooms: [{ id: 'r-1', is_maintenance: false, current_assignments: [] }],
    }];
    const chain = buildChain({ data: mockData, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await listAccommodations({});
    const room = result[0].rooms[0];
    expect(room.derivedStatus).toBe('free');  // campo derivedStatus presente
    expect(room.status).toBeUndefined();       // campo status ya no existe
  });
});

// ── ACC-08 — listAccommodations: filtro multi-tenant ─────────────────────────

describe('listAccommodations — multi-tenant (ACC-08, REQ-005)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('con clientAccountId aplica filtro .eq("client_account_id")', async () => {
    const chain = buildChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await listAccommodations({ clientAccountId: 'client-xyz' });

    expect(chain.eq).toHaveBeenCalledWith('client_account_id', 'client-xyz');
  });

  it('sin clientAccountId no aplica filtro de tenant', async () => {
    const chain = buildChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await listAccommodations({});

    const eqCalls = chain.eq.mock.calls;
    const tenantCall = eqCalls.find(([col]) => col === 'client_account_id');
    expect(tenantCall).toBeUndefined();
  });

  it('lanza error si Supabase devuelve error', async () => {
    const chain = buildChain({ data: null, error: { message: 'DB error' } });
    mockFrom.mockReturnValue(chain);

    await expect(listAccommodations({})).rejects.toThrow('DB error');
  });
});
