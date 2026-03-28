// qa/e2e/helpers/data.js
// Generadores de datos únicos para tests E2E.
// Cada test que crea datos debe llamar a estos helpers para evitar colisiones entre runs.

/**
 * Genera un sufijo único basado en timestamp, seguro para campos de nombre
 * (solo letras, sin números que puedan fallar validaciones de nombre propio).
 */
export function uniqueSuffix() {
  return String(Date.now())
    .split('')
    .map((d) => String.fromCharCode(65 + parseInt(d, 10)))
    .join('');
}

/**
 * Genera datos únicos para crear un inquilino de prueba.
 */
export function makeTestTenant() {
  const ts = Date.now();
  const alpha = uniqueSuffix();
  return {
    first_name: 'E2E',
    last_name: `Inq${alpha}`,
    full_name: `E2E Inq${alpha}`,
    email: `e2e.tenant.${ts}@test.smartrent.com`,
    phone: '666000001',
  };
}

/**
 * Genera datos únicos para crear una entidad propietaria.
 */
export function makeTestEntity() {
  const ts = Date.now();
  const alpha = uniqueSuffix();
  return {
    first_name: 'E2E',
    last_name: `Ent${alpha}`,
    email: `e2e.entity.${ts}@test.smartrent.com`,
    tax_id: '12345678A',
    phone: '600000001',
  };
}

/**
 * Genera datos únicos para crear un alojamiento.
 */
export function makeTestAccommodation() {
  const ts = Date.now();
  return {
    name: `E2E Piso ${ts}`,
    street: 'Calle Test E2E',
    street_number: '1',
    zip: '46001',
    city: 'Valencia',
  };
}
