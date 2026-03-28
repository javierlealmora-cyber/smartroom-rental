// qa/unit/helpers/factories.js
// Constructores de objetos de dominio para tests.
// Todos los campos tienen valores por defecto válidos; se sobreescriben con el spread.

let _seq = 1;
const seq = () => String(_seq++);

export function makeProfile(overrides = {}) {
  const id = overrides.id ?? `profile-${seq()}`;
  return {
    id,
    full_name: 'Ana García',
    email: `ana-${id}@test.com`,
    role: 'lodger',
    onboarding_status: 'active',
    client_account_id: 'client-001',
    move_out_date: null,
    ...overrides,
  };
}

export function makeRoom(overrides = {}) {
  const id = overrides.id ?? `room-${seq()}`;
  return {
    id,
    number: `HAB-${id}`,
    accommodation_id: 'acc-001',
    client_account_id: 'client-001',
    is_maintenance: false,
    ...overrides,
  };
}

export function makeAssignment(overrides = {}) {
  const id = overrides.id ?? `asgn-${seq()}`;
  return {
    id,
    lodger_id: `profile-${seq()}`,
    room_id: `room-${seq()}`,
    accommodation_id: 'acc-001',
    client_account_id: 'client-001',
    move_in_date: '2026-01-01',
    move_out_date: null,
    ...overrides,
  };
}

export function makeAccommodation(overrides = {}) {
  const id = overrides.id ?? `acc-${seq()}`;
  return {
    id,
    name: `Piso ${id}`,
    client_account_id: 'client-001',
    split_mode_electricity: 'equal',
    split_mode_water: 'equal',
    split_mode_gas: 'prorated',
    ...overrides,
  };
}

export function makeEnergyBill(overrides = {}) {
  const id = overrides.id ?? `bill-${seq()}`;
  return {
    id,
    accommodation_id: 'acc-001',
    client_account_id: 'client-001',
    bill_type: 'electricity',
    period_start: '2026-01-01',
    period_end: '2026-01-31',
    amount_total: 150.00,
    amount_power: 30.00,
    amount_meter: 20.00,
    amount_energy: 100.00,
    status: 'pending',
    issue_date: '2026-02-01',
    ...overrides,
  };
}

export function makeEnergyReading(overrides = {}) {
  const id = overrides.id ?? `reading-${seq()}`;
  return {
    id,
    accommodation_id: 'acc-001',
    room_id: `room-${seq()}`,
    client_account_id: 'client-001',
    reading_date: '2026-01-31',
    kwh_start: 100,
    kwh_end: 150,
    kwh_consumed: 50,
    ...overrides,
  };
}

export function makeSettlement(overrides = {}) {
  const id = overrides.id ?? `settlement-${seq()}`;
  return {
    id,
    energy_bill_id: `bill-${seq()}`,
    lodger_id: `profile-${seq()}`,
    room_id: `room-${seq()}`,
    client_account_id: 'client-001',
    days_present: 31,
    kwh_assigned: 0,
    amount_fixed: 16.13,
    amount_variable: 33.33,
    amount_total: 49.46,
    ...overrides,
  };
}

export function makeBulletin(overrides = {}) {
  const id = overrides.id ?? `bulletin-${seq()}`;
  return {
    id,
    lodger_id: `profile-${seq()}`,
    accommodation_id: 'acc-001',
    client_account_id: 'client-001',
    concept: 'Suministro electricity 2026-01-01 / 2026-01-31',
    amount: 49.46,
    status: 'draft',
    due_date: '2026-02-28',
    ...overrides,
  };
}
