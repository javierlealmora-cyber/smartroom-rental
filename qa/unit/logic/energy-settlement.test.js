// qa/unit/logic/energy-settlement.test.js
// Tests de lógica pura del algoritmo de liquidación de facturas (ENE-01..06)
// Sin mocks, sin red, sin DOM.
//
// La lógica está en supabase/functions/settle_energy_bill/index.ts.
// Se replica aquí como funciones puras para testearla de forma aislada.

import { describe, it, expect } from 'vitest';

// ── Funciones puras extraídas del algoritmo ───────────────────────────────────

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Calcula los días de solapamiento entre la estancia del inquilino y el período.
 * ENE-01, ENE-02
 */
function calcDaysPresent(moveInDate, moveOutDate, periodStart, periodEnd) {
  const start = new Date(Math.max(
    new Date(moveInDate).getTime(),
    new Date(periodStart).getTime()
  ));
  const end = new Date(Math.min(
    moveOutDate ? new Date(moveOutDate).getTime() : new Date(periodEnd).getTime(),
    new Date(periodEnd).getTime()
  ));
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
}

function calcTotalDays(periodStart, periodEnd) {
  return Math.max(1, Math.round(
    (new Date(periodEnd).getTime() - new Date(periodStart).getTime()) / 86400000
  ) + 1);
}

/**
 * Calcula los importes para un inquilino dado.
 */
function calcSettlement({ daysPresent, totalDays, amountFixed, amountVariable, splitMode, kwhAssigned, kwhTotal, nActive }) {
  const fixedShare = amountFixed > 0 ? round2(amountFixed * (daysPresent / totalDays)) : 0;

  let variableShare;
  if (splitMode === 'meter' && kwhTotal > 0) {
    variableShare = round2(amountVariable * (kwhAssigned / kwhTotal));
  } else if (splitMode === 'prorated') {
    variableShare = round2(amountVariable * (daysPresent / totalDays));
  } else {
    variableShare = round2(amountVariable / nActive);
  }

  return { fixedShare, variableShare, total: round2(fixedShare + variableShare) };
}

/**
 * Aplica ajuste de céntimos al inquilino con más días.
 */
function reconcile(settlements, billAmountTotal) {
  const computed = settlements.reduce((s, x) => s + x.amount_total, 0);
  const diff = round2(billAmountTotal - round2(computed));
  if (diff === 0) return settlements;

  const result = settlements.map(s => ({ ...s }));
  const maxIdx = result.reduce(
    (best, x, i) => x.days_present > result[best].days_present ? i : best, 0
  );
  result[maxIdx].amount_total = round2(result[maxIdx].amount_total + diff);
  result[maxIdx].amount_variable = round2(result[maxIdx].amount_variable + diff);
  return result;
}

// ── ENE-01 — days_present: overlap correcto ───────────────────────────────────

describe('calcDaysPresent — overlap correcto (ENE-01)', () => {
  const period = ['2026-01-01', '2026-01-31'];

  it('inquilino presente todo el período → 31 días', () => {
    expect(calcDaysPresent('2025-12-01', null, ...period)).toBe(31);
  });

  it('inquilino entra en mitad → días desde su entrada', () => {
    // entra el 16/01, período hasta 31/01 → 16 días
    expect(calcDaysPresent('2026-01-16', null, ...period)).toBe(16);
  });

  it('inquilino sale en mitad → días hasta su salida', () => {
    // entra 01/01, sale 10/01 → 10 días
    expect(calcDaysPresent('2026-01-01', '2026-01-10', ...period)).toBe(10);
  });

  it('solapamiento parcial ambos extremos → intersección', () => {
    // entra 20/01, sale 05/02 → 12 días (20-31 ene)
    expect(calcDaysPresent('2026-01-20', '2026-02-05', ...period)).toBe(12);
  });

  it('período de un día → 1 día', () => {
    expect(calcDaysPresent('2026-01-15', null, '2026-01-15', '2026-01-15')).toBe(1);
  });
});

// ── ENE-02 — days_present: inquilino fuera del período ───────────────────────

describe('calcDaysPresent — fuera del período (ENE-02)', () => {
  const period = ['2026-01-01', '2026-01-31'];

  it('sale antes de que empiece el período → 0 días', () => {
    expect(calcDaysPresent('2025-10-01', '2025-12-31', ...period)).toBe(0);
  });

  it('entra después de que termine el período → 0 días', () => {
    expect(calcDaysPresent('2026-02-01', null, ...period)).toBe(0);
  });
});

// ── ENE-03 — Reparto equal ────────────────────────────────────────────────────

describe('Reparto equal (ENE-03)', () => {
  it('3 inquilinos → partes iguales de amountVariable', () => {
    const share = calcSettlement({
      daysPresent: 31, totalDays: 31,
      amountFixed: 0, amountVariable: 90,
      splitMode: 'equal', kwhAssigned: 0, kwhTotal: 0, nActive: 3,
    });
    expect(share.variableShare).toBe(30);
  });

  it('amount_fixed = 0 → fixedShare = 0', () => {
    const share = calcSettlement({
      daysPresent: 31, totalDays: 31,
      amountFixed: 0, amountVariable: 60,
      splitMode: 'equal', kwhAssigned: 0, kwhTotal: 0, nActive: 2,
    });
    expect(share.fixedShare).toBe(0);
    expect(share.variableShare).toBe(30);
  });
});

// ── ENE-04 — Reparto prorated ─────────────────────────────────────────────────

describe('Reparto prorated (ENE-04)', () => {
  it('15 días sobre 30 → mitad del amount_variable', () => {
    const share = calcSettlement({
      daysPresent: 15, totalDays: 30,
      amountFixed: 0, amountVariable: 100,
      splitMode: 'prorated', kwhAssigned: 0, kwhTotal: 0, nActive: 1,
    });
    expect(share.variableShare).toBe(50);
  });

  it('amount_fixed prorrateado por días independiente del splitMode', () => {
    const share = calcSettlement({
      daysPresent: 10, totalDays: 31,
      amountFixed: 31, amountVariable: 0,
      splitMode: 'equal', kwhAssigned: 0, kwhTotal: 0, nActive: 1,
    });
    // 31 * (10/31) = 10.00
    expect(share.fixedShare).toBe(10);
  });
});

// ── ENE-05 — Reparto meter ────────────────────────────────────────────────────

describe('Reparto meter (ENE-05)', () => {
  it('inquilino con 75 kWh sobre 100 kWh totales → 75% del amount_variable', () => {
    const share = calcSettlement({
      daysPresent: 31, totalDays: 31,
      amountFixed: 0, amountVariable: 100,
      splitMode: 'meter', kwhAssigned: 75, kwhTotal: 100, nActive: 2,
    });
    expect(share.variableShare).toBe(75);
  });

  it('kwhTotal = 0 → fallback equal', () => {
    const share = calcSettlement({
      daysPresent: 31, totalDays: 31,
      amountFixed: 0, amountVariable: 100,
      splitMode: 'meter', kwhAssigned: 0, kwhTotal: 0, nActive: 2,
    });
    // Fallback a equal: 100 / 2 = 50
    expect(share.variableShare).toBe(50);
  });
});

// ── ENE-06 — Reconciliación: SUM == total exacto ──────────────────────────────

describe('Reconciliación (ENE-06)', () => {
  it('SUM(settlements.amount_total) == bill.amount_total tras ajuste', () => {
    // Reparto de 100€ entre 3 inquilinos: 33.33 + 33.33 + 33.33 = 99.99 → ajustar +0.01
    const raw = [
      { days_present: 31, amount_total: 33.33, amount_variable: 33.33 },
      { days_present: 31, amount_total: 33.33, amount_variable: 33.33 },
      { days_present: 31, amount_total: 33.33, amount_variable: 33.33 },
    ];
    const adjusted = reconcile(raw, 100);
    const sum = round2(adjusted.reduce((s, x) => s + x.amount_total, 0));
    expect(sum).toBe(100);
  });

  it('sin diferencia de céntimos → sin cambios', () => {
    const raw = [
      { days_present: 31, amount_total: 50, amount_variable: 50 },
      { days_present: 31, amount_total: 50, amount_variable: 50 },
    ];
    const adjusted = reconcile(raw, 100);
    expect(adjusted[0].amount_total).toBe(50);
    expect(adjusted[1].amount_total).toBe(50);
  });

  it('ajuste va al inquilino con más días presentes', () => {
    const raw = [
      { days_present: 10, amount_total: 33.33, amount_variable: 33.33 },
      { days_present: 20, amount_total: 33.33, amount_variable: 33.33 },  // ← este
      { days_present: 5,  amount_total: 33.33, amount_variable: 33.33 },
    ];
    const adjusted = reconcile(raw, 100);
    // El índice 1 tiene más días → recibe el +0.01
    expect(adjusted[1].amount_total).toBe(33.34);
    expect(adjusted[0].amount_total).toBe(33.33);
    expect(adjusted[2].amount_total).toBe(33.33);
  });
});
