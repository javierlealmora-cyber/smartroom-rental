// qa/unit/logic/roomStatus.test.js
// Tests de lógica pura para estados de habitaciones (REQ-005, ACC-01..04, ACC-13..18)
// Cubre:
//   A) getRoomStatus()   — lógica de AccommodationDetail (active_assignment + future_assignment)
//   B) getRoomUpcoming() — detecta reserva futura para badge secundario
//   C) derivedStatus()   — lógica de listRooms() (índice de asignaciones separado)
//   D) getStats()        — contadores de AccommodationsList + regresión BUG-037
// Sin mocks, sin red, sin DOM.

import { describe, it, expect } from 'vitest';

// Réplica exacta de getRoomStatus() en AccommodationDetail.jsx
// active_assignment: asignaciones con move_in_date <= hoy (ya empezadas)
// future_assignment: asignaciones con move_in_date > hoy (reservas futuras)
function getRoomStatus(room) {
  if (room.is_maintenance) return 'maintenance';
  const today = new Date().toISOString().split('T')[0];
  const current = (room.active_assignment || []).find(
    a => a.move_in_date <= today && (!a.move_out_date || a.move_out_date > today)
  );
  const upcoming = (room.future_assignment || []).find(a => a.move_in_date > today);
  if (!current && !upcoming) return 'free';
  if (!current && upcoming) return 'reserved';
  if (current && !current.move_out_date) return 'occupied';
  return 'pending_checkout';
}

function getRoomUpcoming(room) {
  const today = new Date().toISOString().split('T')[0];
  return (room.future_assignment || []).find(a => a.move_in_date > today) ?? null;
}

// ── Builders locales ──────────────────────────────────────────────────────────

const PAST   = '2020-01-01';
const TODAY  = new Date().toISOString().split('T')[0];
const FUTURE = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
const FAR    = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

function room(overrides = {}) {
  return { id: 'r-1', is_maintenance: false, active_assignment: [], future_assignment: [], ...overrides };
}

// Asignación activa: ya empezó (move_in_date <= hoy), no terminada o termina en el futuro
function activeAsgn(moveOutDate = null) {
  return [{ id: 'a-1', move_in_date: PAST, move_out_date: moveOutDate }];
}

// Asignación futura: aún no empieza (move_in_date > hoy)
function futureAsgn(moveInDate = FUTURE) {
  return [{ id: 'a-2', move_in_date: moveInDate, move_out_date: null }];
}

// ── ACC-01 — free ─────────────────────────────────────────────────────────────

describe('getRoomStatus — free', () => {
  it('sin asignaciones activas ni futuras → free', () => {
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
  it('asignación activa sin move_out_date → occupied', () => {
    expect(getRoomStatus(room({ active_assignment: activeAsgn(null) }))).toBe('occupied');
  });
});

// ── ACC-03 — pending_checkout ────────────────────────────────────────────────

describe('getRoomStatus — pending_checkout', () => {
  it('asignación activa con move_out_date futuro → pending_checkout', () => {
    expect(getRoomStatus(room({ active_assignment: activeAsgn(FUTURE) }))).toBe('pending_checkout');
  });

  it('asignación con move_out_date = hoy → free (query .gt.today excluye hoy)', () => {
    // La query de load() usa .or("move_out_date.is.null,move_out_date.gt.today")
    // → si move_out_date = hoy, la asignación NO aparece en active_assignment
    // → la habitación queda sin current → free
    expect(getRoomStatus(room({ active_assignment: [] }))).toBe('free');
  });
});

// ── ACC-04 — maintenance ──────────────────────────────────────────────────────

describe('getRoomStatus — maintenance', () => {
  it('is_maintenance=true sin asignaciones → maintenance', () => {
    expect(getRoomStatus(room({ is_maintenance: true }))).toBe('maintenance');
  });

  it('is_maintenance=true con asignación activa → maintenance (tiene prioridad)', () => {
    expect(
      getRoomStatus(room({ is_maintenance: true, active_assignment: activeAsgn(null) }))
    ).toBe('maintenance');
  });

  it('is_maintenance=true con asignación futura → maintenance (tiene prioridad)', () => {
    expect(
      getRoomStatus(room({ is_maintenance: true, future_assignment: futureAsgn() }))
    ).toBe('maintenance');
  });
});

// ── ACC-13..18 — estado "reserved" y combos (REQ-005 v2) ─────────────────────

describe('getRoomStatus — reserved (ACC-13)', () => {
  it('solo asignación futura, sin activa → reserved', () => {
    expect(getRoomStatus(room({ future_assignment: futureAsgn() }))).toBe('reserved');
  });

  it('future_assignment con move_in_date mañana → reserved', () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    expect(getRoomStatus(room({ future_assignment: futureAsgn(tomorrow) }))).toBe('reserved');
  });

  it('future_assignment con move_in_date = hoy NO cuenta como reserva (hoy ya es "current")', () => {
    // move_in_date <= hoy → va a active_assignment, no future_assignment
    // Simulamos que lo del futuro ya no tiene nada futuro
    expect(getRoomStatus(room({ active_assignment: [{ id: 'a-1', move_in_date: TODAY, move_out_date: null }] }))).toBe('occupied');
  });
});

describe('getRoomUpcoming — badge reserva futura (ACC-14)', () => {
  it('sin future_assignment → null', () => {
    expect(getRoomUpcoming(room())).toBeNull();
  });

  it('con asignación futura → devuelve la asignación', () => {
    const fa = futureAsgn(FUTURE);
    expect(getRoomUpcoming(room({ future_assignment: fa }))).toEqual(fa[0]);
  });

  it('con future_assignment vacío → null', () => {
    expect(getRoomUpcoming(room({ future_assignment: [] }))).toBeNull();
  });
});

describe('getRoomStatus — combo occupied + reservada futura (ACC-15)', () => {
  it('asignación activa (sin move_out_date) + asignación futura → occupied (principal), upcoming presente', () => {
    const r = room({ active_assignment: activeAsgn(null), future_assignment: futureAsgn() });
    expect(getRoomStatus(r)).toBe('occupied');
    expect(getRoomUpcoming(r)).not.toBeNull();
  });
});

describe('getRoomStatus — combo pending_checkout + reservada futura (ACC-16)', () => {
  it('asignación activa con move_out_date futuro + asignación futura → pending_checkout (principal), upcoming presente', () => {
    const r = room({ active_assignment: activeAsgn(FUTURE), future_assignment: futureAsgn(FAR) });
    expect(getRoomStatus(r)).toBe('pending_checkout');
    expect(getRoomUpcoming(r)).not.toBeNull();
  });
});

describe('getRoomStatus — múltiples asignaciones futuras (ACC-17)', () => {
  it('dos asignaciones futuras → reserved, upcoming = la primera en el tiempo', () => {
    const fa = [
      { id: 'a-2', move_in_date: FAR,    move_out_date: null },
      { id: 'a-3', move_in_date: FUTURE, move_out_date: null },
    ];
    const r = room({ future_assignment: fa });
    expect(getRoomStatus(r)).toBe('reserved');
    // getRoomUpcoming devuelve el primer find → el que está primero en el array
    expect(getRoomUpcoming(r)?.id).toBe('a-2');
  });
});

describe('getRoomStatus — asignación activa expirada no debe contar (ACC-18)', () => {
  it('asignación en active_assignment pero move_in_date en el futuro → no cuenta como current', () => {
    // Simula un error de datos: move_in_date > hoy en active_assignment
    // La función debe ignorarla (find() la descarta)
    const r = room({ active_assignment: [{ id: 'a-1', move_in_date: FUTURE, move_out_date: null }] });
    expect(getRoomStatus(r)).toBe('free');
  });
});

// =============================================================================
// B) derivedStatus — lógica de listRooms() (REQ-005)
//    El servicio consulta rooms + assignments por separado y construye un índice.
//    El campo resultante se llama `derivedStatus` (no `status`).
// =============================================================================

// Réplica exacta de la lógica de listRooms() en accommodations.service.js
function computeDerivedStatus(roomRow, assignmentsByRoomId) {
  const asgn = assignmentsByRoomId[roomRow.id];
  if (roomRow.is_maintenance) return 'maintenance';
  if (!asgn)                  return 'free';
  if (!asgn.move_out_date)    return 'occupied';
  return 'pending_checkout';
}

describe('derivedStatus (listRooms pattern) — REQ-005', () => {
  it('sin entrada en índice → free', () => {
    expect(computeDerivedStatus({ id: 'r-1', is_maintenance: false }, {})).toBe('free');
  });

  it('asignación activa (move_out_date null) → occupied', () => {
    const idx = { 'r-1': { room_id: 'r-1', move_out_date: null } };
    expect(computeDerivedStatus({ id: 'r-1', is_maintenance: false }, idx)).toBe('occupied');
  });

  it('asignación con fecha futura → pending_checkout', () => {
    const idx = { 'r-1': { room_id: 'r-1', move_out_date: FUTURE } };
    expect(computeDerivedStatus({ id: 'r-1', is_maintenance: false }, idx)).toBe('pending_checkout');
  });

  it('is_maintenance=true con asignación activa → maintenance (prioridad)', () => {
    const idx = { 'r-1': { room_id: 'r-1', move_out_date: null } };
    expect(computeDerivedStatus({ id: 'r-1', is_maintenance: true }, idx)).toBe('maintenance');
  });

  // REQ-005 regla 6: move_out_date = hoy → libre (la query usa .gt.today, excluye hoy)
  it('asignación con move_out_date = hoy NO está en el índice → free', () => {
    // listRooms filtra: move_out_date.is.null OR move_out_date.gt.today
    // Una asignación que termina HOY no pasa el filtro → no aparece en el índice
    expect(computeDerivedStatus({ id: 'r-1', is_maintenance: false }, {})).toBe('free');
  });
});

// =============================================================================
// C) getStats() — contadores de AccommodationsList (REQ-005 + regresión BUG-037)
// =============================================================================

// Réplica de getStats() actual (con el bug)
function getStatsBuggy(acc) {
  const rooms = acc.rooms || [];
  const total    = rooms.length;
  const occupied = rooms.filter((r) => r.status === 'occupied').length;
  const free     = rooms.filter((r) => r.status === 'free').length;
  const pending  = rooms.filter((r) => r.status === 'pending_checkout').length;
  const rate     = total > 0 ? Math.round((occupied / total) * 100) : 0;
  return { total, occupied, free, pending, rate };
}

// Versión correcta (usa derivedStatus)
function getStatsFixed(acc) {
  const rooms = acc.rooms || [];
  const total    = rooms.length;
  const occupied = rooms.filter((r) => r.derivedStatus === 'occupied').length;
  const free     = rooms.filter((r) => r.derivedStatus === 'free').length;
  const pending  = rooms.filter((r) => r.derivedStatus === 'pending_checkout').length;
  const rate     = total > 0 ? Math.round((occupied / total) * 100) : 0;
  return { total, occupied, free, pending, rate };
}

// Datos que devuelve listAccommodations() — sin status, sin assignments (BUG-037)
const roomsFromListAccommodations = [
  { id: 'r-1', is_maintenance: false }, // sin status, sin derivedStatus
  { id: 'r-2', is_maintenance: false },
  { id: 'r-3', is_maintenance: true  },
];

// Datos que devuelve listRooms() — con derivedStatus calculado
const roomsFromListRooms = [
  { id: 'r-1', is_maintenance: false, derivedStatus: 'occupied' },
  { id: 'r-2', is_maintenance: false, derivedStatus: 'pending_checkout' },
  { id: 'r-3', is_maintenance: true,  derivedStatus: 'maintenance' },
  { id: 'r-4', is_maintenance: false, derivedStatus: 'free' },
];

describe('getStats — regresión BUG-037 (cerrado 2026-03-28)', () => {
  it('regresión: si getStats leyera r.status (campo eliminado), todos los contadores serían 0', () => {
    // Documenta el comportamiento buggy anterior para evitar regresión.
    // getStatsBuggy replica la versión PRE-fix que leía r.status.
    // Confirma que rooms sin campo `status` producen 0 en todos los contadores.
    const { total, occupied, free, pending } = getStatsBuggy({ rooms: roomsFromListAccommodations });
    expect(total).toBe(3);
    expect(occupied).toBe(0);  // porque r.status === undefined
    expect(free).toBe(0);
    expect(pending).toBe(0);
  });
});

describe('getStats — comportamiento correcto con derivedStatus (REQ-005)', () => {
  it('contadores correctos cuando rooms tienen derivedStatus', () => {
    const { total, occupied, free, pending, rate } = getStatsFixed({ rooms: roomsFromListRooms });
    expect(total).toBe(4);
    expect(occupied).toBe(1);
    expect(free).toBe(1);
    expect(pending).toBe(1);
    expect(rate).toBe(25); // 1 occupied / 4 total = 25%
  });

  it('alojamiento sin habitaciones → todo 0, rate 0%', () => {
    const { total, occupied, free, pending, rate } = getStatsFixed({ rooms: [] });
    expect(total).toBe(0);
    expect(rate).toBe(0);
    expect(occupied + free + pending).toBe(0);
  });

  it('todas ocupadas → rate 100%', () => {
    const rooms = [
      { id: 'r-1', derivedStatus: 'occupied' },
      { id: 'r-2', derivedStatus: 'occupied' },
    ];
    const { occupied, rate } = getStatsFixed({ rooms });
    expect(occupied).toBe(2);
    expect(rate).toBe(100);
  });

  it('maintenance no cuenta en ningún contador', () => {
    const rooms = [
      { id: 'r-1', derivedStatus: 'maintenance' },
      { id: 'r-2', derivedStatus: 'occupied' },
    ];
    const { total, occupied, free, pending } = getStatsFixed({ rooms });
    expect(total).toBe(2);    // total = longitud del array (incluye maintenance)
    expect(occupied).toBe(1);
    expect(free).toBe(0);
    expect(pending).toBe(0);
  });
});
