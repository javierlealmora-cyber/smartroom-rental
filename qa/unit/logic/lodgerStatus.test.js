// qa/unit/logic/lodgerStatus.test.js
// Tests de lógica pura para estados de inquilinos (REQ-006, TEN-01..04)
// Incluye regresión BUG-038 (getLodgerStatus con active_assignment de listLodgers)
// Sin mocks, sin red, sin DOM.

import { describe, it, expect } from 'vitest';
import {
  getLodgerStatus,
  isLodgerActive,
  hasLodgerPendingCheckout,
  getActiveAssignment,
} from '../../../src/utils/lodgerStatus.js';

// Fecha de "hoy" fijada en el test de forma relativa usando offsets
const today = new Date().toISOString().split('T')[0];
const futureDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
const pastDate   = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
const oldDate    = '2024-01-01';

// ── Builders locales ──────────────────────────────────────────────────────────

function lodger(assignments) {
  return { id: 'l-1', assignments };
}

function asgn(move_in_date, move_out_date = null) {
  return { id: 'a-1', move_in_date, move_out_date };
}

// ── TEN-04 — invited ──────────────────────────────────────────────────────────

describe('getLodgerStatus — invited', () => {
  it('sin asignaciones → invited', () => {
    expect(getLodgerStatus(lodger([]))).toBe('invited');
  });

  it('asignación sin move_in_date → invited', () => {
    expect(getLodgerStatus(lodger([asgn(null)]))).toBe('invited');
  });

  it('lodger undefined → invited', () => {
    expect(getLodgerStatus(undefined)).toBe('invited');
  });
});

// ── TEN-01 — active ───────────────────────────────────────────────────────────

describe('getLodgerStatus — active', () => {
  it('sin move_out_date → active', () => {
    expect(getLodgerStatus(lodger([asgn('2026-01-01')]))).toBe('active');
  });

  it('múltiples asignaciones: la más reciente sin fecha de salida → active', () => {
    const l = lodger([
      asgn('2025-01-01', pastDate),   // antigua, ya terminada
      asgn('2026-01-01', null),       // actual, activa
    ]);
    expect(getLodgerStatus(l)).toBe('active');
  });
});

// ── TEN-02 — pending_checkout ────────────────────────────────────────────────

describe('getLodgerStatus — pending_checkout', () => {
  it('move_out_date futura → pending_checkout', () => {
    expect(getLodgerStatus(lodger([asgn('2026-01-01', futureDate)]))).toBe('pending_checkout');
  });
});

// ── TEN-03 — inactive ────────────────────────────────────────────────────────

describe('getLodgerStatus — inactive', () => {
  it('move_out_date pasada → inactive', () => {
    expect(getLodgerStatus(lodger([asgn(oldDate, pastDate)]))).toBe('inactive');
  });

  it('múltiples asignaciones: la más reciente con fecha de salida pasada → inactive', () => {
    const l = lodger([
      asgn('2024-01-01', '2024-06-30'),
      asgn('2025-01-01', pastDate),
    ]);
    expect(getLodgerStatus(l)).toBe('inactive');
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

describe('isLodgerActive', () => {
  it('activo → true', () => {
    expect(isLodgerActive(lodger([asgn('2026-01-01')]))).toBe(true);
  });

  it('invitado → false', () => {
    expect(isLodgerActive(lodger([]))).toBe(false);
  });

  it('inactive → false', () => {
    expect(isLodgerActive(lodger([asgn(oldDate, pastDate)]))).toBe(false);
  });
});

describe('hasLodgerPendingCheckout', () => {
  it('fecha futura → true', () => {
    expect(hasLodgerPendingCheckout(lodger([asgn('2026-01-01', futureDate)]))).toBe(true);
  });

  it('activo sin fecha → false', () => {
    expect(hasLodgerPendingCheckout(lodger([asgn('2026-01-01')]))).toBe(false);
  });
});

describe('getActiveAssignment', () => {
  it('sin asignaciones → null', () => {
    expect(getActiveAssignment(lodger([]))).toBeNull();
  });

  it('asignación sin fecha de salida → la devuelve', () => {
    const a = asgn('2026-01-01');
    expect(getActiveAssignment(lodger([a]))).toBe(a);
  });

  it('asignación con fecha de salida futura → la devuelve', () => {
    const a = asgn('2026-01-01', futureDate);
    expect(getActiveAssignment(lodger([a]))).toBe(a);
  });

  it('asignación con fecha de salida pasada → null', () => {
    expect(getActiveAssignment(lodger([asgn(oldDate, pastDate)]))).toBeNull();
  });
});

// =============================================================================
// Regresión BUG-038 (cerrado 2026-03-28) — REQ-006
// getLodgerStatus debe aceptar tanto 'assignments' (getLodger)
// como 'active_assignment' (listLodgers).
// =============================================================================

// Builder para datos de listLodgers (usa active_assignment, no assignments)
function lodgerFromList(active_assignment) {
  return { id: 'l-1', active_assignment };
}

describe('getLodgerStatus — regresión BUG-038: acepta active_assignment (listLodgers)', () => {
  it('active_assignment con asignación activa → active', () => {
    const l = lodgerFromList([{ id: 'a-1', move_in_date: '2026-01-01', move_out_date: null }]);
    expect(getLodgerStatus(l)).toBe('active');
  });

  it('active_assignment con fecha futura → pending_checkout', () => {
    const l = lodgerFromList([{ id: 'a-1', move_in_date: '2026-01-01', move_out_date: futureDate }]);
    expect(getLodgerStatus(l)).toBe('pending_checkout');
  });

  it('active_assignment vacío → invited', () => {
    const l = lodgerFromList([]);
    expect(getLodgerStatus(l)).toBe('invited');
  });

  it('ni assignments ni active_assignment → invited', () => {
    expect(getLodgerStatus({ id: 'l-1' })).toBe('invited');
  });
});

// =============================================================================
// Casos límite (REQ-006 regla 5)
// =============================================================================

describe('getLodgerStatus — casos límite (REQ-006)', () => {
  it('move_out_date = hoy → inactive (hoy no es "después de hoy")', () => {
    const l = lodger([asgn('2026-01-01', today)]);
    expect(getLodgerStatus(l)).toBe('inactive');
  });

  it('null lodger → invited', () => {
    expect(getLodgerStatus(null)).toBe('invited');
  });

  it('lodger con assignments y active_assignment → usa assignments (prioridad)', () => {
    // assignments toma prioridad sobre active_assignment por el orden del OR
    const l = {
      id: 'l-1',
      assignments: [{ id: 'a-1', move_in_date: '2026-01-01', move_out_date: null }],
      active_assignment: [],  // vacío — pero assignments tiene la activa
    };
    expect(getLodgerStatus(l)).toBe('active');
  });
});
