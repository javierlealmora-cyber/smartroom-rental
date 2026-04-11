// qa/unit/logic/energy-settlement.test.js
// Tests de lógica pura del algoritmo de liquidación de facturas (ENE-01..08)
// Sin mocks, sin red, sin DOM.
//
// Algoritmo: reparto por fracción diaria.
// Para cada día d del período, cada inquilino activo ese día acumula:
//   fraction[lodger_id] += 1 / totalDays / n_activos_hoy
// La suma de todas las fracciones ≤ 1.0 (= 1 si no hay días sin inquilinos).

import { describe, it, expect } from 'vitest';

// ── Funciones puras que replican el algoritmo de energy.service.js ────────────

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Construye el mapa día→[{lodger_id, room_id}] para el período dado.
 * ENE-01
 */
function buildDayMap(assignments, periodStart, periodEnd) {
  const pStart = new Date(periodStart);
  const pEnd   = new Date(periodEnd);
  const map = {};
  for (let d = new Date(pStart); d <= pEnd; d.setUTCDate(d.getUTCDate() + 1)) {
    map[d.toISOString().split('T')[0]] = [];
  }
  for (const a of assignments) {
    const aStart = new Date(Math.max(new Date(a.move_in_date), pStart));
    const aEnd   = new Date(Math.min(a.move_out_date ? new Date(a.move_out_date) : pEnd, pEnd));
    for (let d = new Date(aStart); d <= aEnd; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = d.toISOString().split('T')[0];
      if (map[key]) map[key].push({ lodger_id: a.lodger_id, room_id: a.room_id });
    }
  }
  return map;
}

/**
 * Calcula las fracciones acumuladas por inquilino a partir del dayMap.
 * ENE-02, ENE-03
 */
function calcFractions(dayMap, totalDays) {
  const fraction = {};
  for (const active of Object.values(dayMap)) {
    if (!active.length) continue;
    const share = 1 / totalDays / active.length;
    for (const { lodger_id } of active) {
      fraction[lodger_id] = (fraction[lodger_id] ?? 0) + share;
    }
  }
  return fraction;
}

/**
 * Calcula el total de días del período.
 */
function calcTotalDays(periodStart, periodEnd) {
  return Math.max(1, Math.round(
    (new Date(periodEnd).getTime() - new Date(periodStart).getTime()) / 86400000
  ) + 1);
}

/**
 * Calcula importes por inquilino dado fracciones y kWh.
 * ENE-04, ENE-05
 */
function calcPerLodger({ fractions, lodgerRooms, roomKwh, amountFixed, amountVariable }) {
  const kwhTotal    = Object.values(roomKwh).reduce((s, v) => s + v, 0);
  const hasReadings = kwhTotal > 0;

  return Object.entries(fractions).map(([lodger_id, f]) => {
    const roomId     = lodgerRooms[lodger_id];
    const kwhRoom    = roomKwh[roomId] ?? 0;
    const fixedShare = round2(amountFixed    * f);
    const varShare   = hasReadings
      ? round2(amountVariable * (kwhRoom / kwhTotal))
      : round2(amountVariable * f);
    return {
      lodger_id,
      room_id: roomId,
      fraction: f,
      amount_fixed: fixedShare,
      amount_variable: varShare,
      amount_total: round2(fixedShare + varShare),
    };
  });
}

/**
 * Aplica ajuste de céntimos al inquilino con mayor fracción.
 * ENE-06
 */
function reconcile(perLodger, billAmountTotal) {
  const computed = round2(perLodger.reduce((s, x) => s + x.amount_total, 0));
  const diff     = round2(billAmountTotal - computed);
  if (diff === 0) return perLodger;
  const result = perLodger.map((s) => ({ ...s }));
  const maxIdx = result.reduce(
    (best, x, i) => x.fraction > result[best].fraction ? i : best, 0
  );
  result[maxIdx].amount_total    = round2(result[maxIdx].amount_total    + diff);
  result[maxIdx].amount_variable = round2(result[maxIdx].amount_variable + diff);
  return result;
}

// ── ENE-01 — buildDayMap: mapa día→inquilinos activos ─────────────────────────

describe('buildDayMap — mapa día/inquilinos (ENE-01)', () => {
  const period = ['2026-01-01', '2026-01-05'];

  it('un inquilino todo el período → aparece en todos los días', () => {
    const map = buildDayMap(
      [{ lodger_id: 'A', room_id: 'R1', move_in_date: '2025-12-01', move_out_date: null }],
      ...period
    );
    expect(Object.keys(map).length).toBe(5);
    for (const active of Object.values(map)) {
      expect(active.map(x => x.lodger_id)).toContain('A');
    }
  });

  it('inquilino que entra el día 3 → días 1-2 sin él', () => {
    const map = buildDayMap(
      [{ lodger_id: 'A', room_id: 'R1', move_in_date: '2026-01-03', move_out_date: null }],
      ...period
    );
    expect(map['2026-01-01']).toHaveLength(0);
    expect(map['2026-01-02']).toHaveLength(0);
    expect(map['2026-01-03'].map(x => x.lodger_id)).toContain('A');
    expect(map['2026-01-05'].map(x => x.lodger_id)).toContain('A');
  });

  it('inquilino que sale el día 2 → días 3-5 sin él', () => {
    const map = buildDayMap(
      [{ lodger_id: 'A', room_id: 'R1', move_in_date: '2026-01-01', move_out_date: '2026-01-02' }],
      ...period
    );
    expect(map['2026-01-01'].map(x => x.lodger_id)).toContain('A');
    expect(map['2026-01-02'].map(x => x.lodger_id)).toContain('A');
    expect(map['2026-01-03']).toHaveLength(0);
  });

  it('dos inquilinos solapados → ambos en los días de solapamiento', () => {
    const map = buildDayMap([
      { lodger_id: 'A', room_id: 'R1', move_in_date: '2026-01-01', move_out_date: null },
      { lodger_id: 'B', room_id: 'R2', move_in_date: '2026-01-03', move_out_date: null },
    ], ...period);
    expect(map['2026-01-02'].map(x => x.lodger_id)).toEqual(['A']);
    expect(map['2026-01-03'].map(x => x.lodger_id)).toEqual(expect.arrayContaining(['A', 'B']));
  });

  it('inquilino fuera del período → no aparece en ningún día', () => {
    const map = buildDayMap(
      [{ lodger_id: 'X', room_id: 'R1', move_in_date: '2026-02-01', move_out_date: null }],
      ...period
    );
    for (const active of Object.values(map)) {
      expect(active).toHaveLength(0);
    }
  });
});

// ── ENE-02 — calcFractions: 3 inquilinos período completo ────────────────────

describe('calcFractions — 3 inquilinos período completo (ENE-02)', () => {
  it('3 inquilinos activos 31/31 días → fracción = 1/3 cada uno', () => {
    const assignments = [
      { lodger_id: 'A', room_id: 'R1', move_in_date: '2025-12-01', move_out_date: null },
      { lodger_id: 'B', room_id: 'R2', move_in_date: '2025-12-01', move_out_date: null },
      { lodger_id: 'C', room_id: 'R3', move_in_date: '2025-12-01', move_out_date: null },
    ];
    const period = ['2026-01-01', '2026-01-31'];
    const totalDays = calcTotalDays(...period);
    const map = buildDayMap(assignments, ...period);
    const fractions = calcFractions(map, totalDays);

    expect(Object.keys(fractions)).toHaveLength(3);
    expect(fractions['A']).toBeCloseTo(1/3, 4);
    expect(fractions['B']).toBeCloseTo(1/3, 4);
    expect(fractions['C']).toBeCloseTo(1/3, 4);

    // Suma total debe ser ≈ 1.0
    const sum = Object.values(fractions).reduce((s, v) => s + v, 0);
    expect(round2(sum)).toBe(1);
  });

  it('suma de fracciones = 1 siempre que todos los días tengan inquilinos', () => {
    const assignments = [
      { lodger_id: 'A', room_id: 'R1', move_in_date: '2026-01-01', move_out_date: '2026-01-15' },
      { lodger_id: 'B', room_id: 'R2', move_in_date: '2026-01-16', move_out_date: null },
    ];
    const period = ['2026-01-01', '2026-01-31'];
    const totalDays = calcTotalDays(...period);
    const map = buildDayMap(assignments, ...period);
    const fractions = calcFractions(map, totalDays);

    const sum = Object.values(fractions).reduce((s, v) => s + v, 0);
    expect(round2(sum)).toBe(1);
  });
});

// ── ENE-03 — calcFractions: solapamientos parciales ──────────────────────────

describe('calcFractions — solapamientos parciales (ENE-03)', () => {
  it('A 31 días, B 16 días: fracciones proporcionales', () => {
    // Período 01-31 enero (31 días)
    // A: entra 01/01, B: entra 16/01
    // Días 1-15: solo A → A += 15 × (1/31/1)
    // Días 16-31: A y B → cada uno += 16 × (1/31/2)
    // fraction[A] = 15/31 + 8/31 = 23/31 ≈ 0.7419
    // fraction[B] = 8/31 ≈ 0.2581
    const assignments = [
      { lodger_id: 'A', room_id: 'R1', move_in_date: '2026-01-01', move_out_date: null },
      { lodger_id: 'B', room_id: 'R2', move_in_date: '2026-01-16', move_out_date: null },
    ];
    const period = ['2026-01-01', '2026-01-31'];
    const totalDays = calcTotalDays(...period);
    const map = buildDayMap(assignments, ...period);
    const fractions = calcFractions(map, totalDays);

    expect(fractions['A']).toBeCloseTo(23/31, 4);
    expect(fractions['B']).toBeCloseTo(8/31,  4);
    // A paga más que B
    expect(fractions['A']).toBeGreaterThan(fractions['B']);
  });

  it('días sin inquilinos → suma de fracciones < 1', () => {
    // Solo los días 10-20 tienen inquilino → 11/31 < 1
    const assignments = [
      { lodger_id: 'A', room_id: 'R1', move_in_date: '2026-01-10', move_out_date: '2026-01-20' },
    ];
    const period = ['2026-01-01', '2026-01-31'];
    const totalDays = calcTotalDays(...period);
    const map = buildDayMap(assignments, ...period);
    const fractions = calcFractions(map, totalDays);

    expect(fractions['A']).toBeCloseTo(11/31, 4);
    expect(fractions['A']).toBeLessThan(1);
  });

  it('inquilino que sale el mismo día que empieza el período → 1 día', () => {
    const assignments = [
      { lodger_id: 'A', room_id: 'R1', move_in_date: '2026-01-01', move_out_date: '2026-01-01' },
    ];
    const period = ['2026-01-01', '2026-01-31'];
    const totalDays = calcTotalDays(...period);
    const map = buildDayMap(assignments, ...period);
    const fractions = calcFractions(map, totalDays);

    expect(fractions['A']).toBeCloseTo(1/31, 4);
  });
});

// ── ENE-04 — Con lecturas kWh: variable proporcional a kWh ───────────────────

describe('calcPerLodger — con lecturas kWh (ENE-04)', () => {
  it('HAB-1 = 80 kWh, HAB-2 = 20 kWh → variable 80%/20%', () => {
    const fractions   = { 'A': 0.5, 'B': 0.5 };
    const lodgerRooms = { 'A': 'R1', 'B': 'R2' };
    const roomKwh     = { 'R1': 80, 'R2': 20 };
    const result = calcPerLodger({
      fractions, lodgerRooms, roomKwh,
      amountFixed: 50, amountVariable: 200,
    });
    const A = result.find(x => x.lodger_id === 'A');
    const B = result.find(x => x.lodger_id === 'B');
    expect(A.amount_variable).toBe(160);  // 200 × (80/100)
    expect(B.amount_variable).toBe(40);   // 200 × (20/100)
    // fixed siempre por fracción (igual)
    expect(A.amount_fixed).toBe(25);      // 50 × 0.5
    expect(B.amount_fixed).toBe(25);
  });

  it('suma importes totales = amountFixed + amountVariable', () => {
    const fractions   = { 'A': 0.7, 'B': 0.3 };
    const lodgerRooms = { 'A': 'R1', 'B': 'R2' };
    const roomKwh     = { 'R1': 70, 'R2': 30 };
    const result = calcPerLodger({
      fractions, lodgerRooms, roomKwh,
      amountFixed: 100, amountVariable: 100,
    });
    const sum = round2(result.reduce((s, x) => s + x.amount_total, 0));
    expect(sum).toBeCloseTo(200, 1);
  });
});

// ── ENE-05 — Sin lecturas kWh: variable proporcional a fracción ──────────────

describe('calcPerLodger — sin lecturas kWh (ENE-05)', () => {
  it('roomKwh vacío → hasReadings=false → variable × fraction', () => {
    const fractions   = { 'A': 0.6, 'B': 0.4 };
    const lodgerRooms = { 'A': 'R1', 'B': 'R2' };
    const roomKwh     = {};  // sin lecturas
    const result = calcPerLodger({
      fractions, lodgerRooms, roomKwh,
      amountFixed: 0, amountVariable: 100,
    });
    const A = result.find(x => x.lodger_id === 'A');
    const B = result.find(x => x.lodger_id === 'B');
    expect(A.amount_variable).toBe(60);   // 100 × 0.6
    expect(B.amount_variable).toBe(40);   // 100 × 0.4
  });

  it('3 inquilinos igual peso → partes iguales (equivale al antiguo modo equal)', () => {
    const f = 1/3;
    const fractions   = { 'A': f, 'B': f, 'C': f };
    const lodgerRooms = { 'A': 'R1', 'B': 'R2', 'C': 'R3' };
    const roomKwh     = {};
    const result = calcPerLodger({
      fractions, lodgerRooms, roomKwh,
      amountFixed: 0, amountVariable: 90,
    });
    for (const r of result) {
      expect(r.amount_variable).toBeCloseTo(30, 1);
    }
  });

  it('suma sin lecturas = amountFixed + amountVariable × sumFractions', () => {
    const fractions   = { 'A': 0.5, 'B': 0.5 };
    const lodgerRooms = { 'A': 'R1', 'B': 'R2' };
    const roomKwh     = {};
    const result = calcPerLodger({
      fractions, lodgerRooms, roomKwh,
      amountFixed: 50, amountVariable: 100,
    });
    const sum = round2(result.reduce((s, x) => s + x.amount_total, 0));
    expect(sum).toBeCloseTo(150, 1);
  });
});

// ── ENE-06 — Reconciliación: SUM == total exacto ──────────────────────────────

describe('reconcile — SUM == bill.amount_total (ENE-06)', () => {
  it('3 inquilinos → ajuste de céntimo → SUM exacta', () => {
    const raw = [
      { lodger_id: 'A', fraction: 1/3, amount_fixed: 0, amount_variable: 33.33, amount_total: 33.33 },
      { lodger_id: 'B', fraction: 1/3, amount_fixed: 0, amount_variable: 33.33, amount_total: 33.33 },
      { lodger_id: 'C', fraction: 1/3, amount_fixed: 0, amount_variable: 33.33, amount_total: 33.33 },
    ];
    const adjusted = reconcile(raw, 100);
    const sum = round2(adjusted.reduce((s, x) => s + x.amount_total, 0));
    expect(sum).toBe(100);
  });

  it('sin diferencia de céntimos → sin cambios', () => {
    const raw = [
      { lodger_id: 'A', fraction: 0.5, amount_fixed: 0, amount_variable: 50, amount_total: 50 },
      { lodger_id: 'B', fraction: 0.5, amount_fixed: 0, amount_variable: 50, amount_total: 50 },
    ];
    const adjusted = reconcile(raw, 100);
    expect(adjusted[0].amount_total).toBe(50);
    expect(adjusted[1].amount_total).toBe(50);
  });

  it('ajuste va al inquilino con mayor fracción', () => {
    // A tiene fracción 0.5 (mayor) → recibe el ajuste
    const raw = [
      { lodger_id: 'A', fraction: 0.5,  amount_fixed: 0, amount_variable: 33.33, amount_total: 33.33 },
      { lodger_id: 'B', fraction: 0.3,  amount_fixed: 0, amount_variable: 33.33, amount_total: 33.33 },
      { lodger_id: 'C', fraction: 0.2,  amount_fixed: 0, amount_variable: 33.33, amount_total: 33.33 },
    ];
    const adjusted = reconcile(raw, 100);
    expect(adjusted.find(x => x.lodger_id === 'A').amount_total).toBe(33.34);
    expect(adjusted.find(x => x.lodger_id === 'B').amount_total).toBe(33.33);
    expect(adjusted.find(x => x.lodger_id === 'C').amount_total).toBe(33.33);
  });
});

// ── ENE-07 — Propiedad global: CA-001 (3 inquilinos 31 días) ──────────────────

describe('Propiedad global ENE-07 — CA-001: 3 inquilinos período completo', () => {
  it('SUM(bulletins.amount_total) == bill.amount_total exacto', () => {
    const period    = ['2026-01-01', '2026-01-31'];
    const totalDays = calcTotalDays(...period);
    const assignments = [
      { lodger_id: 'A', room_id: 'R1', move_in_date: '2025-12-01', move_out_date: null },
      { lodger_id: 'B', room_id: 'R2', move_in_date: '2025-12-01', move_out_date: null },
      { lodger_id: 'C', room_id: 'R3', move_in_date: '2025-12-01', move_out_date: null },
    ];
    const map       = buildDayMap(assignments, ...period);
    const fractions = calcFractions(map, totalDays);
    const lodgerRooms = { 'A': 'R1', 'B': 'R2', 'C': 'R3' };
    const perLodger = calcPerLodger({
      fractions, lodgerRooms, roomKwh: {},
      amountFixed: 50, amountVariable: 100,
    });
    const adjusted = reconcile(perLodger, 150);

    const sum = round2(adjusted.reduce((s, x) => s + x.amount_total, 0));
    expect(sum).toBe(150);
    // Cada uno paga aprox 50€
    for (const r of adjusted) {
      expect(r.amount_total).toBeCloseTo(50, 0);
    }
  });
});

// ── ENE-08 — Propiedad global: CA-002 (inquilino a mitad de período) ──────────

describe('Propiedad global ENE-08 — CA-002: inquilino parcial', () => {
  it('A 31 días, B 16 días → A paga más, suma exacta', () => {
    const period    = ['2026-01-01', '2026-01-31'];
    const totalDays = calcTotalDays(...period);
    const assignments = [
      { lodger_id: 'A', room_id: 'R1', move_in_date: '2026-01-01', move_out_date: null },
      { lodger_id: 'B', room_id: 'R2', move_in_date: '2026-01-16', move_out_date: null },
    ];
    const map       = buildDayMap(assignments, ...period);
    const fractions = calcFractions(map, totalDays);
    const lodgerRooms = { 'A': 'R1', 'B': 'R2' };
    const perLodger = calcPerLodger({
      fractions, lodgerRooms, roomKwh: {},
      amountFixed: 0, amountVariable: 100,
    });
    const adjusted = reconcile(perLodger, 100);

    const sum = round2(adjusted.reduce((s, x) => s + x.amount_total, 0));
    expect(sum).toBe(100);

    const A = adjusted.find(x => x.lodger_id === 'A');
    const B = adjusted.find(x => x.lodger_id === 'B');
    expect(A.amount_total).toBeGreaterThan(B.amount_total);
    // A ≈ 74.2€, B ≈ 25.8€
    expect(A.amount_total).toBeCloseTo(74.19, 0);
    expect(B.amount_total).toBeCloseTo(25.81, 0);
  });
});
