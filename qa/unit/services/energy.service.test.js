// qa/unit/services/energy.service.test.js
// Tests del servicio de energía (ENE-07)
// Usa mocks del cliente Supabase e invokeWithAuth.

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { buildChain } from '../helpers/chainMock.js';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
vi.mock('../../../src/services/supabaseClient.js', () => ({
  supabase: { from: mockFrom },
}));

const mockInvoke = vi.fn();
vi.mock('../../../src/services/supabaseInvoke.services.js', () => ({
  invokeWithAuth: mockInvoke,
}));

const {
  listEnergyBills,
  getEnergyBill,
  settleEnergyBill,
} = await import('../../../src/services/energy.service.js');

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

// ── settleEnergyBill (ENE-07) — llama Edge Function ──────────────────────────

describe('settleEnergyBill (ENE-07)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('llama a invokeWithAuth("settle_energy_bill") con bill_id correcto', async () => {
    mockInvoke.mockResolvedValue({ ok: true, data: { settlements_count: 3 } });

    const result = await settleEnergyBill('bill-123');

    expect(mockInvoke).toHaveBeenCalledWith('settle_energy_bill', {
      body: { bill_id: 'bill-123' },
    });
    expect(result).toEqual({ settlements_count: 3 });
  });

  it('lanza error si la Edge Function devuelve ok=false', async () => {
    mockInvoke.mockResolvedValue({
      ok: false,
      error: { message: 'La factura ya ha sido liquidada' },
    });

    await expect(settleEnergyBill('bill-123'))
      .rejects.toThrow('La factura ya ha sido liquidada');
  });

  it('lanza error genérico si no hay message en error', async () => {
    mockInvoke.mockResolvedValue({ ok: false, error: {} });

    await expect(settleEnergyBill('bill-123'))
      .rejects.toThrow('Error al liquidar la factura');
  });
});
