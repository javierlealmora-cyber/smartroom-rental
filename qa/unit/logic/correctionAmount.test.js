// qa/unit/logic/correctionAmount.test.js
// Tests de lógica pura para el cálculo del importe de corrección por cambio de habitación (CHG-01..06)
// Cubre: calcCorrectionAmount() — fórmula proporcional por días restantes del mes.
//
// Fórmula: (nueva_renta - renta_anterior) × días_restantes / días_del_mes
// días_restantes = días_del_mes - día_del_cambio + 1  (incluye el día del cambio)
//
// Sin mocks, sin red, sin DOM.

import { describe, it, expect } from 'vitest';

// Réplica exacta de calcCorrectionAmount() en AccommodationDetail.jsx
// Se usa dayjs en el componente; aquí usamos un mock mínimo con la misma interfaz.
function makeDayjsMock(year, month, day) {
  const _date = new Date(year, month - 1, day);
  const daysInMonthVal = new Date(year, month, 0).getDate();
  return {
    date: () => day,
    daysInMonth: () => daysInMonthVal,
  };
}

function calcCorrectionAmount(changeDate, currentRent, newRent) {
  if (!changeDate || currentRent == null || newRent == null) return null;
  const dayOfMonth = changeDate.date();
  if (dayOfMonth === 1) return 0;
  const daysInMonth = changeDate.daysInMonth();
  const remainingDays = daysInMonth - dayOfMonth + 1;
  const correction = (newRent - currentRent) * remainingDays / daysInMonth;
  return Math.round(correction * 100) / 100;
}

// ── CHG-01 — Cambio el día 1 → 0 ─────────────────────────────────────────────

describe('calcCorrectionAmount — día 1 del mes (CHG-01)', () => {
  it('cambio el 1 enero → 0 aunque la renta sea diferente', () => {
    const date = makeDayjsMock(2026, 1, 1);
    expect(calcCorrectionAmount(date, 500, 600)).toBe(0);
  });

  it('cambio el 1 marzo → 0', () => {
    const date = makeDayjsMock(2026, 3, 1);
    expect(calcCorrectionAmount(date, 800, 400)).toBe(0);
  });
});

// ── CHG-02 — Nueva renta más cara → positivo (CHG-02) ────────────────────────

describe('calcCorrectionAmount — nueva renta más cara (CHG-02)', () => {
  it('500→600, día 15, mes de 30 días → (100 × 16/30) = 53.33', () => {
    const date = makeDayjsMock(2026, 4, 15); // abril = 30 días
    const result = calcCorrectionAmount(date, 500, 600);
    expect(result).toBe(53.33);
  });

  it('400→700, día 1 → 0 (cambio el primer día del mes)', () => {
    const date = makeDayjsMock(2026, 5, 1);
    expect(calcCorrectionAmount(date, 400, 700)).toBe(0);
  });

  it('500→600, día 20, mes de 31 días → (100 × 12/31) = 38.71', () => {
    const date = makeDayjsMock(2026, 5, 20); // mayo = 31 días
    const result = calcCorrectionAmount(date, 500, 600);
    expect(result).toBe(38.71);
  });
});

// ── CHG-03 — Nueva renta más barata → negativo (CHG-03) ──────────────────────

describe('calcCorrectionAmount — nueva renta más barata (CHG-03)', () => {
  it('500→400, día 15, mes de 30 días → (-100 × 16/30) = -53.33', () => {
    const date = makeDayjsMock(2026, 4, 15);
    const result = calcCorrectionAmount(date, 500, 400);
    expect(result).toBe(-53.33);
  });

  it('500→400, día 20, mes de 31 días → (-100 × 12/31) = -38.71', () => {
    const date = makeDayjsMock(2026, 5, 20);
    const result = calcCorrectionAmount(date, 500, 400);
    expect(result).toBe(-38.71);
  });
});

// ── CHG-04 — Misma renta → 0 (CHG-04) ────────────────────────────────────────

describe('calcCorrectionAmount — misma renta (CHG-04)', () => {
  it('500→500, cualquier día → 0', () => {
    const date = makeDayjsMock(2026, 4, 15);
    expect(calcCorrectionAmount(date, 500, 500)).toBe(0);
  });

  it('0→0 → 0', () => {
    const date = makeDayjsMock(2026, 1, 10);
    expect(calcCorrectionAmount(date, 0, 0)).toBe(0);
  });
});

// ── Casos límite ──────────────────────────────────────────────────────────────

describe('calcCorrectionAmount — casos límite y valores nulos', () => {
  it('sin fecha → null', () => {
    expect(calcCorrectionAmount(null, 500, 600)).toBeNull();
  });

  it('sin renta anterior (null) → null', () => {
    const date = makeDayjsMock(2026, 4, 15);
    expect(calcCorrectionAmount(date, null, 600)).toBeNull();
  });

  it('sin renta nueva (null) → null', () => {
    const date = makeDayjsMock(2026, 4, 15);
    expect(calcCorrectionAmount(date, 500, null)).toBeNull();
  });

  it('último día del mes: día 30 en mes de 30 días → solo 1 día restante', () => {
    const date = makeDayjsMock(2026, 4, 30); // abril = 30 días
    const result = calcCorrectionAmount(date, 500, 600);
    // (100 × 1/30) = 3.33
    expect(result).toBe(3.33);
  });

  it('febrero año bisiesto: día 15 en mes de 29 días', () => {
    const date = makeDayjsMock(2028, 2, 15); // 2028 es bisiesto
    // febrero 2028 = 29 días; restantes = 29 - 15 + 1 = 15
    // (100 × 15/29) = 51.72
    const result = calcCorrectionAmount(date, 500, 600);
    expect(result).toBe(51.72);
  });
});
