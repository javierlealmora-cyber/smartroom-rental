// qa/unit/logic/roomStatus.test.js
// Tests de lógica pura para estados de habitaciones (ACC-01..04)
// Testa getRoomStatus() tal y como está definida en AccommodationDetail.jsx.
// Sin mocks, sin red, sin DOM.

import { describe, it, expect } from 'vitest';

// La función no está exportada del componente, así que la replicamos aquí
// exactamente igual para testearla de forma pura.
// Si en el futuro se extrae a un utils/ independiente, cambiar el import.
function getRoomStatus(room) {
  if (room.is_maintenance) return 'maintenance';
  const asgn = room.active_assignment?.[0];
  if (!asgn) return 'free';
  if (!asgn.move_out_date) return 'occupied';
  return 'pending_checkout';
}

// ── Builders locales ──────────────────────────────────────────────────────────

function room(overrides = {}) {
  return { id: 'r-1', is_maintenance: false, active_assignment: [], ...overrides };
}

function withAssignment(moveOutDate = null) {
  return [{ id: 'a-1', move_out_date: moveOutDate }];
}

// ── ACC-01 — free ─────────────────────────────────────────────────────────────

describe('getRoomStatus — free', () => {
  it('sin asignaciones activas → free', () => {
    expect(getRoomStatus(room())).toBe('free');
  });

  it('active_assignment undefined → free', () => {
    expect(getRoomStatus(room({ active_assignment: undefined }))).toBe('free');
  });

  it('active_assignment null → free', () => {
    expect(getRoomStatus(room({ active_assignment: null }))).toBe('free');
  });
});

// ── ACC-02 — occupied ─────────────────────────────────────────────────────────

describe('getRoomStatus — occupied', () => {
  it('asignación sin move_out_date → occupied', () => {
    expect(getRoomStatus(room({ active_assignment: withAssignment(null) }))).toBe('occupied');
  });
});

// ── ACC-03 — pending_checkout ────────────────────────────────────────────────

describe('getRoomStatus — pending_checkout', () => {
  it('asignación con move_out_date → pending_checkout', () => {
    const futureDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    expect(getRoomStatus(room({ active_assignment: withAssignment(futureDate) }))).toBe('pending_checkout');
  });

  it('asignación con move_out_date pasada en active_assignment → pending_checkout', () => {
    // El array active_assignment contiene la asignación "activa" según la BD
    // aunque la fecha ya haya pasado (reconciliación pendiente).
    // La función solo mira si move_out_date es null o no.
    expect(getRoomStatus(room({ active_assignment: withAssignment('2024-01-01') }))).toBe('pending_checkout');
  });
});

// ── ACC-04 — maintenance ──────────────────────────────────────────────────────

describe('getRoomStatus — maintenance', () => {
  it('is_maintenance=true sin asignaciones → maintenance', () => {
    expect(getRoomStatus(room({ is_maintenance: true }))).toBe('maintenance');
  });

  it('is_maintenance=true con asignación → maintenance (tiene prioridad)', () => {
    expect(
      getRoomStatus(room({ is_maintenance: true, active_assignment: withAssignment(null) }))
    ).toBe('maintenance');
  });
});
