// qa/unit/services/energy.service.test.js
// Tests del servicio de energía
// settleEnergyBill usa acceso directo a Supabase (sin Edge Function).

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { buildChain } from '../helpers/chainMock.js';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
vi.mock('../../../src/services/supabaseClient.js', () => ({
  supabase: { from: mockFrom },
}));

const {
  listEnergyBills,
  getEnergyBill,
  settleEnergyBill,
  unsettleEnergyBill,
} = await import('../../../src/services/energy.service.js');

const CLIENT_ACCOUNT_ID = 'cai-test-001';

// ── listEnergyBills ───────────────────────────────────────────────────────────

describe('listEnergyBills', () => {
  beforeEach(() => vi.clearAllMocks());

  it('devuelve lista de facturas sin filtros', async () => {
    const bills = [{ id: 'b-1', status: 'pending' }];
    const chain = buildChain({ data: bills, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await listEnergyBills();
    expect(mockFrom).toHaveBeenCalledWith('energy_bills');
    expect(result).toEqual(bills);
  });

  it('filtra por accommodationId cuando se pasa', async () => {
    const chain = buildChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await listEnergyBills({ accommodationId: 'acc-1' });
    expect(chain.eq).toHaveBeenCalledWith('accommodation_id', 'acc-1');
  });

  it('filtra por status cuando se pasa', async () => {
    const chain = buildChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await listEnergyBills({ status: 'pending' });
    expect(chain.eq).toHaveBeenCalledWith('status', 'pending');
  });

  it('devuelve [] cuando data es null', async () => {
    const chain = buildChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await listEnergyBills();
    expect(result).toEqual([]);
  });

  it('lanza error si Supabase falla', async () => {
    const chain = buildChain({ data: null, error: { message: 'DB error' } });
    mockFrom.mockReturnValue(chain);

    await expect(listEnergyBills()).rejects.toThrow('DB error');
  });
});

// ── settleEnergyBill — acceso directo a Supabase ──────────────────────────────
//
// settleEnergyBill(billId, clientAccountId) ya NO usa invokeWithAuth ni Edge Function.
// Hace múltiples llamadas directas a Supabase con RLS.
//
// Secuencia de llamadas a from() en caso de éxito (sin total_kwh / total_kwh=0):
//   1. energy_bills (SELECT bill)
//   2. lodger_room_assignments (SELECT assignments)
//   3. energy_readings (SELECT lecturas kWh — siempre, independientemente)
//   4. bulletins DELETE (limpieza idempotente)
//   5. energy_settlements DELETE (limpieza idempotente)
//   6. energy_settlements INSERT (filas diarias)
//   7. bulletins INSERT
//   8. energy_bills UPDATE (status = 'settled')
//
// Secuencia adicional si !hasReadings && total_kwh > 0 (lecturas estimadas):
//   1-3. igual que arriba
//   4. energy_readings DELETE (lecturas estimadas previas — idempotente)
//   5. energy_readings INSERT (lecturas estimadas: 1 por habitación × día)
//   6-10. igual que arriba (bulletins DELETE, settlements DELETE, settlements INSERT, bulletins INSERT, energy_bills UPDATE)

describe('settleEnergyBill — validaciones previas', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lanza "Factura no encontrada" si la factura no existe', async () => {
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: { message: 'No rows found' } }));

    await expect(settleEnergyBill('bill-123', CLIENT_ACCOUNT_ID))
      .rejects.toThrow('Factura no encontrada');
  });

  it('lanza "La factura ya ha sido liquidada" si status = settled', async () => {
    mockFrom.mockReturnValueOnce(buildChain({
      data: { id: 'bill-1', status: 'settled', accommodation_id: 'acc-1' },
      error: null,
    }));

    await expect(settleEnergyBill('bill-1', CLIENT_ACCOUNT_ID))
      .rejects.toThrow('La factura ya ha sido liquidada');
  });

  it('lanza "No hay inquilinos" si no hay asignaciones solapadas', async () => {
    // bill OK
    mockFrom.mockReturnValueOnce(buildChain({
      data: {
        id: 'bill-1', status: 'pending', accommodation_id: 'acc-1',
        period_start: '2026-01-01', period_end: '2026-01-31',
        amount_total: 100, amount_power: 0, amount_meter: 0,
      },
      error: null,
    }));
    // assignments → vacío
    mockFrom.mockReturnValueOnce(buildChain({ data: [], error: null }));

    await expect(settleEnergyBill('bill-1', CLIENT_ACCOUNT_ID))
      .rejects.toThrow('No hay inquilinos en este período para liquidar');
  });
});

describe('settleEnergyBill — cálculo y escritura (1 inquilino, sin lecturas)', () => {
  beforeEach(() => vi.clearAllMocks());

  /**
   * Mocks para 1 inquilino durante todo el período, sin lecturas kWh.
   * Secuencia: bill → assignments → energy_readings → bulletins DELETE →
   *            energy_settlements DELETE → energy_settlements INSERT →
   *            bulletins INSERT → energy_bills UPDATE
   */
  function setupMocksForSuccess({ amountTotal = 100, amountPower = 20, amountMeter = 10 } = {}) {
    // 1. bill
    mockFrom.mockReturnValueOnce(buildChain({
      data: {
        id: 'bill-1', status: 'pending', accommodation_id: 'acc-1',
        period_start: '2026-01-01', period_end: '2026-01-31',
        amount_total: amountTotal, amount_power: amountPower, amount_meter: amountMeter,
        total_kwh: 0,
      },
      error: null,
    }));
    // 2. assignments (1 inquilino, todo el período)
    mockFrom.mockReturnValueOnce(buildChain({
      data: [{ lodger_id: 'l-1', room_id: 'r-1', move_in_date: '2026-01-01', move_out_date: null }],
      error: null,
    }));
    // 3. energy_readings (sin lecturas)
    mockFrom.mockReturnValueOnce(buildChain({ data: [], error: null }));
    // 4. bulletins DELETE (limpieza idempotente)
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null }));
    // 5. energy_settlements DELETE (limpieza idempotente)
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null }));
    // 6. energy_settlements INSERT
    mockFrom.mockReturnValueOnce(buildChain({ data: [{}], error: null }));
    // 7. bulletins INSERT
    mockFrom.mockReturnValueOnce(buildChain({ data: [{}], error: null }));
    // 8. energy_bills UPDATE
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null }));
  }

  it('llama a from("energy_bills") para cargar la factura', async () => {
    setupMocksForSuccess();
    await settleEnergyBill('bill-1', CLIENT_ACCOUNT_ID);
    expect(mockFrom).toHaveBeenCalledWith('energy_bills');
  });

  it('siempre consulta energy_readings (aunque no haya lector)', async () => {
    setupMocksForSuccess();
    await settleEnergyBill('bill-1', CLIENT_ACCOUNT_ID);
    expect(mockFrom).toHaveBeenCalledWith('energy_readings');
  });

  it('devuelve { settlements_count, amount_total, has_readings } al completar', async () => {
    setupMocksForSuccess({ amountTotal: 150 });
    const result = await settleEnergyBill('bill-1', CLIENT_ACCOUNT_ID);
    expect(result).toMatchObject({ settlements_count: 1, amount_total: 150, has_readings: false });
  });

  it('inserta en energy_settlements', async () => {
    setupMocksForSuccess();
    await settleEnergyBill('bill-1', CLIENT_ACCOUNT_ID);
    expect(mockFrom).toHaveBeenCalledWith('energy_settlements');
  });

  it('inserta en bulletins con status draft', async () => {
    setupMocksForSuccess();
    await settleEnergyBill('bill-1', CLIENT_ACCOUNT_ID);
    expect(mockFrom).toHaveBeenCalledWith('bulletins');
  });

  it('actualiza energy_bills status a settled', async () => {
    setupMocksForSuccess();
    await settleEnergyBill('bill-1', CLIENT_ACCOUNT_ID);
    // Última llamada a energy_bills es el UPDATE
    const calls = mockFrom.mock.calls.map(([t]) => t);
    expect(calls[calls.length - 1]).toBe('energy_bills');
  });

  it('lanza si falla el INSERT de settlements', async () => {
    // bill
    mockFrom.mockReturnValueOnce(buildChain({
      data: {
        id: 'bill-1', status: 'pending', accommodation_id: 'acc-1',
        period_start: '2026-01-01', period_end: '2026-01-31',
        amount_total: 100, amount_power: 0, amount_meter: 0, total_kwh: 0,
      },
      error: null,
    }));
    // assignments
    mockFrom.mockReturnValueOnce(buildChain({
      data: [{ lodger_id: 'l-1', room_id: 'r-1', move_in_date: '2026-01-01', move_out_date: null }],
      error: null,
    }));
    // energy_readings
    mockFrom.mockReturnValueOnce(buildChain({ data: [], error: null }));
    // DELETEs idempotentes
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null }));
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null }));
    // INSERT settlements falla
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: { message: 'constraint violation' } }));

    await expect(settleEnergyBill('bill-1', CLIENT_ACCOUNT_ID))
      .rejects.toThrow('Error al insertar liquidaciones');
  });
});

describe('settleEnergyBill — con lecturas kWh (has_readings = true)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('devuelve has_readings = true cuando hay lecturas de kWh', async () => {
    // bill
    mockFrom.mockReturnValueOnce(buildChain({
      data: {
        id: 'bill-1', status: 'pending', accommodation_id: 'acc-1',
        period_start: '2026-01-01', period_end: '2026-01-31',
        amount_total: 100, amount_power: 0, amount_meter: 0, total_kwh: 100,
      },
      error: null,
    }));
    // assignments (1 inquilino)
    mockFrom.mockReturnValueOnce(buildChain({
      data: [{ lodger_id: 'l-1', room_id: 'r-1', move_in_date: '2026-01-01', move_out_date: null }],
      error: null,
    }));
    // energy_readings → con datos
    mockFrom.mockReturnValueOnce(buildChain({
      data: [{ room_id: 'r-1', kwh: 80 }],
      error: null,
    }));
    // DELETEs + INSERTs + UPDATE
    for (let i = 0; i < 5; i++) {
      mockFrom.mockReturnValueOnce(buildChain({ data: [{}], error: null }));
    }

    const result = await settleEnergyBill('bill-1', CLIENT_ACCOUNT_ID);
    expect(result.has_readings).toBe(true);
  });
});

// ── settleEnergyBill — lecturas estimadas (total_kwh > 0, sin lecturas reales) ─

describe('settleEnergyBill — genera lecturas estimadas en energy_readings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('genera lecturas estimadas cuando total_kwh > 0 y no hay lecturas reales', async () => {
    // 1. bill con total_kwh > 0
    mockFrom.mockReturnValueOnce(buildChain({
      data: {
        id: 'bill-1', status: 'pending', accommodation_id: 'acc-1',
        period_start: '2026-01-01', period_end: '2026-01-31',
        amount_total: 100, amount_power: 20, amount_meter: 10, total_kwh: 93,
      },
      error: null,
    }));
    // 2. assignments (1 inquilino, todo el período)
    mockFrom.mockReturnValueOnce(buildChain({
      data: [{ lodger_id: 'l-1', room_id: 'r-1', move_in_date: '2026-01-01', move_out_date: null }],
      error: null,
    }));
    // 3. energy_readings SELECT → vacío (sin lecturas reales)
    mockFrom.mockReturnValueOnce(buildChain({ data: [], error: null }));
    // 4. energy_readings DELETE (estimadas previas — idempotente)
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null }));
    // 5. energy_readings INSERT (lecturas estimadas)
    mockFrom.mockReturnValueOnce(buildChain({ data: [{}], error: null }));
    // 6. bulletins DELETE
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null }));
    // 7. energy_settlements DELETE
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null }));
    // 8. energy_settlements INSERT
    mockFrom.mockReturnValueOnce(buildChain({ data: [{}], error: null }));
    // 9. bulletins INSERT
    mockFrom.mockReturnValueOnce(buildChain({ data: [{}], error: null }));
    // 10. energy_bills UPDATE
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null }));

    const result = await settleEnergyBill('bill-1', CLIENT_ACCOUNT_ID);

    // Verifica secuencia: energy_readings aparece 3 veces (SELECT + DELETE + INSERT)
    const tables = mockFrom.mock.calls.map(([t]) => t);
    expect(tables.filter(t => t === 'energy_readings')).toHaveLength(3);
    expect(result.has_readings).toBe(false);
  });

  it('NO genera lecturas estimadas cuando total_kwh es 0 o nulo', async () => {
    // Usa total_kwh: 0 → no activa paso 5b → solo 8 llamadas (no 10)
    mockFrom.mockReturnValueOnce(buildChain({
      data: {
        id: 'bill-1', status: 'pending', accommodation_id: 'acc-1',
        period_start: '2026-01-01', period_end: '2026-01-31',
        amount_total: 100, amount_power: 0, amount_meter: 0, total_kwh: 0,
      },
      error: null,
    }));
    mockFrom.mockReturnValueOnce(buildChain({
      data: [{ lodger_id: 'l-1', room_id: 'r-1', move_in_date: '2026-01-01', move_out_date: null }],
      error: null,
    }));
    mockFrom.mockReturnValueOnce(buildChain({ data: [], error: null })); // readings SELECT
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null })); // bulletins DELETE
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null })); // settlements DELETE
    mockFrom.mockReturnValueOnce(buildChain({ data: [{}], error: null })); // settlements INSERT
    mockFrom.mockReturnValueOnce(buildChain({ data: [{}], error: null })); // bulletins INSERT
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null })); // energy_bills UPDATE

    await settleEnergyBill('bill-1', CLIENT_ACCOUNT_ID);

    const tables = mockFrom.mock.calls.map(([t]) => t);
    // energy_readings solo 1 vez (SELECT), no DELETE ni INSERT estimados
    expect(tables.filter(t => t === 'energy_readings')).toHaveLength(1);
  });
});

// ── unsettleEnergyBill ────────────────────────────────────────────────────────

describe('unsettleEnergyBill', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lanza "Factura no encontrada" si no existe', async () => {
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: { message: 'not found' } }));

    await expect(unsettleEnergyBill('bill-123', CLIENT_ACCOUNT_ID))
      .rejects.toThrow('Factura no encontrada');
  });

  it('lanza "La factura no está en estado Repartida" si status != settled', async () => {
    mockFrom.mockReturnValueOnce(buildChain({
      data: { id: 'bill-1', status: 'pending', accommodation_id: 'acc-1', period_start: '2026-01-01', period_end: '2026-01-31' },
      error: null,
    }));

    await expect(unsettleEnergyBill('bill-1', CLIENT_ACCOUNT_ID))
      .rejects.toThrow('La factura no está en estado Repartida');
  });

  it('elimina bulletins, settlements y lecturas estimadas; vuelve a validated', async () => {
    // 1. SELECT bill (ahora incluye accommodation_id, period_start, period_end)
    mockFrom.mockReturnValueOnce(buildChain({
      data: { id: 'bill-1', status: 'settled', accommodation_id: 'acc-1', period_start: '2026-01-01', period_end: '2026-01-31' },
      error: null,
    }));
    // 2. DELETE bulletins
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null }));
    // 3. DELETE energy_settlements
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null }));
    // 4. DELETE energy_readings (lecturas estimadas)
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null }));
    // 5. UPDATE energy_bills
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null }));

    await expect(unsettleEnergyBill('bill-1', CLIENT_ACCOUNT_ID)).resolves.toBeUndefined();

    const tables = mockFrom.mock.calls.map(([t]) => t);
    expect(tables).toContain('bulletins');
    expect(tables).toContain('energy_settlements');
    expect(tables).toContain('energy_readings');
    expect(tables.filter(t => t === 'energy_bills')).toHaveLength(2); // SELECT + UPDATE
  });

  it('lanza si el UPDATE final falla', async () => {
    mockFrom.mockReturnValueOnce(buildChain({
      data: { id: 'bill-1', status: 'settled', accommodation_id: 'acc-1', period_start: '2026-01-01', period_end: '2026-01-31' },
      error: null,
    }));
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null })); // DELETE bulletins
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null })); // DELETE settlements
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: null })); // DELETE energy_readings
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: { message: 'update failed' } })); // UPDATE

    await expect(unsettleEnergyBill('bill-1', CLIENT_ACCOUNT_ID))
      .rejects.toThrow('Error al revertir el reparto');
  });
});
