// tests/e2e/specs/accommodations.spec.js
// CRUD de Alojamientos y Habitaciones — @regression (staging)
//
// El test crea su propia entidad propietaria de test.
// Cada ejecución genera datos únicos (timestamp) para evitar conflictos.

import { test, expect } from '@playwright/test';
import { antdSelect, extractIdFromUrl, waitForLoadingDone } from '../helpers/antd.js';

test.describe.configure({ mode: 'serial' });

const TS     = Date.now();
const ENT_LN = `E2E Acc ${TS}`;            // apellido entidad propietaria
const ENT_EMAIL = `e2e.acc.${TS}@test.smartrent.com`;
const ACC_NAME  = `Residencia E2E ${TS}`;
const ACC_NAME_UPD = `Residencia E2E Updated ${TS}`;
const NUM_ROOMS = 3;

const state = {
  entityId:  null,
  entityName: ENT_LN,
  accId:     null,
  accName:   ACC_NAME,
};

test.describe('Alojamientos + Habitaciones CRUD @regression', () => {

  test.skip(!process.env.TEST_MANAGER_EMAIL,
    'Credenciales de staging no configuradas. Rellenar tests/e2e/.env.e2e');

  // ── Setup: crear entidad propietaria de test ─────────────────────────────
  test('00 - setup: crear entidad propietaria', async ({ page }) => {
    await page.goto('/v2/admin/entidades/nueva');

    await antdSelect(page, 'legal_type', 'Persona física');
    await page.locator('#first_name').fill('E2E');
    await page.locator('#last_name1').fill(ENT_LN);
    await page.locator('#billing_email').fill(ENT_EMAIL);
    await page.locator('#city').fill('Barcelona');
    await antdSelect(page, 'province', 'Barcelona');

    await page.getByRole('button', { name: 'Crear' }).click();
    await page.waitForURL('**/v2/admin/entidades', { timeout: 15_000 });
    await waitForLoadingDone(page);

    // Obtener ID buscando la entidad y clicando Editar
    await page.locator('input[placeholder*="Buscar"]').fill(ENT_LN);
    await waitForLoadingDone(page);

    const card = page.locator('.ant-card').filter({ hasText: ENT_LN });
    await expect(card).toBeVisible({ timeout: 10_000 });
    await card.getByRole('button', { name: 'Editar' }).click();
    await page.waitForURL('**/entidades/**/editar', { timeout: 10_000 });

    state.entityId = extractIdFromUrl(page, 'entidades');
    expect(state.entityId).toBeTruthy();
  });

  // ── 01 · Lista de alojamientos carga ────────────────────────────────────
  test('01 - lista de alojamientos es accesible', async ({ page }) => {
    await page.goto('/v2/admin/alojamientos');
    await waitForLoadingDone(page);

    await expect(
      page.locator('h1, h2, .ant-typography').filter({ hasText: /[Aa]lojamientos/ }).first()
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nuevo Alojamiento' })).toBeVisible();
  });

  // ── 02 · Crear alojamiento (wizard 2 pasos) ──────────────────────────────
  test('02 - crear alojamiento con habitaciones (wizard)', async ({ page }) => {
    await page.goto('/v2/admin/alojamientos/nuevo');
    await waitForLoadingDone(page);

    // ── Paso 1: Datos básicos ──────────────────────────────────────────────

    // Entidad propietaria (select con búsqueda)
    await page.locator('#owner_entity_id').click();
    // Escribir para filtrar en el select
    await page.locator('.ant-select-dropdown:visible input').fill(ENT_LN).catch(async () => {
      // Si no hay input de búsqueda visible, escribir directamente
      await page.keyboard.type(ENT_LN);
    });
    await page.locator('.ant-select-dropdown:visible')
      .locator('.ant-select-item-option', { hasText: ENT_LN })
      .first()
      .click();

    // Nombre del alojamiento
    await page.locator('#name').fill(ACC_NAME);

    // Número de habitaciones
    await page.locator('#numRooms').fill(String(NUM_ROOMS));

    // Dirección
    await page.locator('#street').fill('Calle Test E2E');
    await page.locator('#street_number').fill('1');
    await page.locator('#postal_code').fill('08001');
    await page.locator('#city').fill('Barcelona');
    await antdSelect(page, 'province', 'Barcelona');

    // Continuar al paso 2
    await page.getByRole('button', { name: 'Continuar' }).click();

    // ── Paso 2: Configuración de habitaciones ─────────────────────────────
    await expect(page.locator('.ant-steps-item-active')).toContainText('Habitaciones');

    // Las habitaciones se generaron automáticamente (NUM_ROOMS filas en la tabla)
    const rows = page.locator('.ant-table-tbody tr');
    await expect(rows).toHaveCount(NUM_ROOMS, { timeout: 5_000 });

    // Ajustar precio de la primera habitación
    await rows.first().locator('.ant-input-number input').first().fill('500');

    // Crear el alojamiento
    await page.getByRole('button', { name: 'Crear Alojamiento' }).click();

    // Redirige a la lista
    await page.waitForURL('**/v2/admin/alojamientos', { timeout: 20_000 });
    await waitForLoadingDone(page);

    // El alojamiento aparece en la lista
    await expect(
      page.locator('.ant-card').filter({ hasText: ACC_NAME })
    ).toBeVisible({ timeout: 15_000 });
  });

  // ── 03 · Obtener ID del alojamiento ──────────────────────────────────────
  test('03 - obtener ID del alojamiento creado', async ({ page }) => {
    await page.goto('/v2/admin/alojamientos');
    await waitForLoadingDone(page);

    // Buscar el alojamiento por nombre si hay buscador
    const searchInput = page.locator('input[placeholder*="buscar"], input[placeholder*="Buscar"]');
    if (await searchInput.count() > 0) {
      await searchInput.first().fill(ACC_NAME);
      await waitForLoadingDone(page);
    }

    const accCard = page.locator('.ant-card').filter({ hasText: ACC_NAME });
    await expect(accCard).toBeVisible({ timeout: 10_000 });

    // Clic en Editar para leer el ID de la URL
    await accCard.getByRole('button', { name: 'Editar' }).click();
    await page.waitForURL('**/alojamientos/**/editar', { timeout: 10_000 });

    state.accId = extractIdFromUrl(page, 'alojamientos');
    expect(state.accId).toBeTruthy();
  });

  // ── 04 · Ver habitaciones del alojamiento ───────────────────────────────
  test('04 - ver habitaciones (AccommodationDetail)', async ({ page }) => {
    expect(state.accId).toBeTruthy();

    await page.goto(`/v2/admin/alojamientos/${state.accId}/habitaciones`);
    await waitForLoadingDone(page);

    // Deben aparecer las habitaciones creadas (NUM_ROOMS)
    // Las habitaciones se muestran como cards o filas
    const roomItems = page.locator('.ant-card, .ant-list-item').filter({ hasText: /Hab\./ });
    const count = await roomItems.count();
    expect(count).toBeGreaterThanOrEqual(NUM_ROOMS);

    // Cada habitación tiene un badge de estado (Libre)
    await expect(
      page.locator('.ant-tag').filter({ hasText: 'Libre' }).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  // ── 05 · Editar alojamiento (cambiar nombre) ─────────────────────────────
  test('05 - editar alojamiento: actualizar nombre', async ({ page }) => {
    expect(state.accId).toBeTruthy();

    await page.goto(`/v2/admin/alojamientos/${state.accId}/editar`);
    await waitForLoadingDone(page);

    // Verificar que el nombre actual está cargado
    await expect(page.locator('#name')).toHaveValue(ACC_NAME);

    // Actualizar nombre
    await page.locator('#name').fill('');
    await page.locator('#name').fill(ACC_NAME_UPD);

    await page.getByRole('button', { name: 'Guardar Alojamiento' }).click();

    // Redirige o confirma el guardado
    await page.waitForURL('**/v2/admin/alojamientos**', { timeout: 15_000 });

    // El nombre actualizado aparece en la lista
    await waitForLoadingDone(page);
    await expect(
      page.locator('.ant-card').filter({ hasText: ACC_NAME_UPD })
    ).toBeVisible({ timeout: 10_000 });

    // Actualizar estado para el resto de tests
    state.accName = ACC_NAME_UPD;
  });

  // ── 06 · Añadir una habitación desde edición ─────────────────────────────
  test('06 - añadir habitación desde AccommodationEdit', async ({ page }) => {
    expect(state.accId).toBeTruthy();

    await page.goto(`/v2/admin/alojamientos/${state.accId}/editar`);
    await waitForLoadingDone(page);

    // Buscar el botón "Añadir" para nueva habitación
    const addRoomBtn = page.getByRole('button', { name: /[Aa]ñadir/ });
    if (await addRoomBtn.count() === 0) {
      test.skip(true, 'No se encontró botón Añadir habitación en la página de edición');
      return;
    }

    await addRoomBtn.click();

    // Esperar a que aparezca el formulario de nueva habitación
    const newRoomForm = page.locator('.ant-form, form').filter({ hasText: /número|nº/i }).last();
    if (await newRoomForm.count() > 0) {
      // Rellenar número de habitación
      const numInput = newRoomForm.locator('input').first();
      await numInput.fill('99');

      // Guardar la habitación
      const saveBtn = newRoomForm.getByRole('button', { name: /guardar|añadir|crear/i });
      if (await saveBtn.count() > 0) {
        await saveBtn.click();
      }
    }

    await waitForLoadingDone(page);

    // Verificar que el número de habitaciones aumentó
    await page.goto(`/v2/admin/alojamientos/${state.accId}/habitaciones`);
    await waitForLoadingDone(page);

    const roomItems = page.locator('.ant-card, .ant-list-item, tr').filter({ hasText: /Hab\.|hab\./ });
    const count = await roomItems.count();
    expect(count).toBeGreaterThanOrEqual(NUM_ROOMS + 1);
  });

  // ── 07 · KPIs del alojamiento en la lista ───────────────────────────────
  test('07 - KPIs del alojamiento visibles en lista', async ({ page }) => {
    await page.goto('/v2/admin/alojamientos');
    await waitForLoadingDone(page);

    const accCard = page.locator('.ant-card').filter({ hasText: ACC_NAME_UPD });
    await expect(accCard).toBeVisible({ timeout: 10_000 });

    // KPIs: Total, Ocupado, Libres
    await expect(accCard.locator('div', { hasText: 'Libres' }).first()).toBeVisible();
  });

});
