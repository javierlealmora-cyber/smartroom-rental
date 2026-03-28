// qa/e2e/specs/accommodations.spec.js
// CRUD de Alojamientos y Habitaciones — @regression (staging)
//
// El test crea su propia entidad propietaria de test.
// Cada ejecución genera datos únicos (timestamp) para evitar conflictos.

import { test, expect } from '@playwright/test';
import { antdSelect, extractIdFromUrl, waitForLoadingDone } from '../helpers/antd.js';

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

  test.describe.configure({ mode: 'serial' });

  test.skip(!process.env.TEST_MANAGER_EMAIL,
    'Credenciales de staging no configuradas. Rellenar qa/e2e/.env.e2e');

  // ── Setup: obtener o crear entidad propietaria ───────────────────────────
  test('00 - setup: obtener entidad propietaria', async ({ page }) => {
    // Intentar crear una entidad nueva
    await page.goto('/v2/admin/entidades/nueva');
    await waitForLoadingDone(page);

    const crearBtn = page.getByRole('button', { name: 'Crear' });
    const isDisabled = await crearBtn.getAttribute('disabled') !== null ||
      await crearBtn.evaluate(el => el.disabled).catch(() => true);

    if (!isDisabled) {
      // Cuenta con client_account_id — podemos crear
      await antdSelect(page, 'legal_type', 'Persona física');
      await page.locator('#first_name').fill('E2E');
      await page.locator('#last_name1').fill(ENT_LN);
      await page.locator('#tax_id').fill('12345678A');
      await page.locator('#billing_email').fill(ENT_EMAIL);
      await page.locator('#street').fill('Calle Mayor');
      await page.locator('#street_number').fill('1');
      await page.locator('#zip').fill('08001');
      await page.locator('#city').fill('Barcelona');
      await antdSelect(page, 'province', 'Barcelona');
      await crearBtn.click();
      await page.waitForURL('**/v2/admin/entidades', { timeout: 15_000 });
      await waitForLoadingDone(page);
      await page.locator('input[placeholder*="Buscar"]').fill(ENT_LN);
      await waitForLoadingDone(page);
      const card = page.locator('.ant-card').filter({ hasText: ENT_LN });
      await expect(card).toBeVisible({ timeout: 10_000 });
      await card.getByRole('button', { name: 'Editar' }).click();
    } else {
      // Sin client_account_id (superadmin) — usar primera entidad existente
      await page.goto('/v2/admin/entidades');
      await waitForLoadingDone(page);
      const firstCard = page.locator('.ant-card').filter({
        has: page.getByRole('button', { name: 'Editar' })
      }).first();
      await expect(firstCard).toBeVisible({ timeout: 10_000 });
      await firstCard.getByRole('button', { name: 'Editar' }).click();
    }

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

// ─────────────────────────────────────────────────────────────────────────────
// Tests 08-10: CRUD de Habitaciones desde AccommodationDetail
// Bloque independiente — encuentra un alojamiento existente sin depender de 00-07
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Habitaciones CRUD desde AccommodationDetail @regression', () => {

  test.describe.configure({ mode: 'serial' });

  test.skip(!process.env.TEST_MANAGER_EMAIL,
    'Credenciales de staging no configuradas. Rellenar qa/e2e/.env.e2e');

  const roomState = { accId: null, newRoomNumber: null };

  // ── R0 · Obtener un alojamiento existente para el CRUD ───────────────────
  test('08-setup - obtener alojamiento para CRUD de habitaciones', async ({ page }) => {
    await page.goto('/v2/admin/alojamientos');
    await waitForLoadingDone(page);

    // Tomar el primer alojamiento con botón Editar
    const firstCard = page.locator('.ant-card').filter({
      has: page.getByRole('button', { name: 'Editar' }),
    }).first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    await firstCard.getByRole('button', { name: 'Editar' }).click();
    await page.waitForURL('**/alojamientos/**/editar', { timeout: 10_000 });

    roomState.accId = extractIdFromUrl(page, 'alojamientos');
    expect(roomState.accId).toBeTruthy();
  });

  // ── 08 · Añadir habitación desde AccommodationDetail (tab Datos) ─────────
  test('08 - añadir habitación desde AccommodationDetail (tab Datos)', async ({ page }) => {
    expect(roomState.accId).toBeTruthy();

    await page.goto(`/v2/admin/alojamientos/${roomState.accId}/habitaciones`);
    await waitForLoadingDone(page);

    // Clicar el tab "Datos del Alojamiento" (en AntD v6 los tabs son <button>)
    await page.getByRole('button', { name: 'Datos del Alojamiento' }).click();
    await waitForLoadingDone(page);

    // Contar habitaciones antes de añadir
    const countBefore = await page.locator('table tbody tr').count();

    // Abrir el formulario de nueva habitación (botón "plus Añadir" en el header de la card)
    // Antes de abrir el form: .last() = el botón del header de Habitaciones (no el de gasto adicional)
    await page.getByRole('button', { name: 'Añadir' }).last().click();

    // Rellenar número de habitación (campo único obligatorio)
    await page.getByPlaceholder('Nº').fill('T99');

    // Confirmar — cuando el form está abierto hay dos botones "Añadir": header + submit
    // el .last() apunta al submit del form
    await page.getByRole('button', { name: 'Añadir' }).last().click();
    await waitForLoadingDone(page);

    // La nueva habitación T99 aparece en la tabla
    await expect(
      page.locator('table tbody').locator('td', { hasText: 'T99' })
    ).toBeVisible({ timeout: 10_000 });

    // El contador aumentó
    const countAfter = await page.locator('table tbody tr').count();
    expect(countAfter).toBeGreaterThan(countBefore);

    roomState.newRoomNumber = 'T99';
  });

  // ── 09 · Editar habitación desde AccommodationDetail ────────────────────
  test('09 - editar habitación desde AccommodationDetail (tab Datos)', async ({ page }) => {
    expect(roomState.accId).toBeTruthy();
    expect(roomState.newRoomNumber).toBeTruthy();

    await page.goto(`/v2/admin/alojamientos/${roomState.accId}/habitaciones`);
    await waitForLoadingDone(page);

    await page.getByRole('button', { name: 'Datos del Alojamiento' }).click();
    await waitForLoadingDone(page);

    // Encontrar la fila de T99 y clicar su botón Editar
    const row = page.locator('table tbody tr').filter({ hasText: roomState.newRoomNumber });
    await expect(row).toBeVisible({ timeout: 10_000 });
    await row.getByRole('button', { name: 'Editar' }).click();

    // Aparece el formulario de edición (texto "Editando Hab.")
    await expect(page.getByText(/Editando Hab\./)).toBeVisible({ timeout: 5_000 });

    // Cambiar el número — único input[placeholder="Nº"] en el form de edición inline
    await page.getByPlaceholder('Nº').fill('T99-UPD');

    await page.getByRole('button', { name: 'Guardar' }).click();
    await waitForLoadingDone(page);

    // La habitación actualizada aparece en la tabla
    await expect(
      page.locator('table tbody').locator('td', { hasText: 'T99-UPD' })
    ).toBeVisible({ timeout: 10_000 });

    roomState.newRoomNumber = 'T99-UPD';
  });

  // ── 10 · Cambiar estado habitación: free → maintenance → free ────────────
  test('10 - toggle estado habitación (free → mantenimiento → libre)', async ({ page }) => {
    expect(roomState.accId).toBeTruthy();
    expect(roomState.newRoomNumber).toBeTruthy();

    await page.goto(`/v2/admin/alojamientos/${roomState.accId}/habitaciones`);
    await waitForLoadingDone(page);

    await page.getByRole('button', { name: 'Datos del Alojamiento' }).click();
    await waitForLoadingDone(page);

    const row = page.locator('table tbody tr').filter({ hasText: roomState.newRoomNumber });
    await expect(row).toBeVisible({ timeout: 10_000 });

    // ── Poner en Mantenimiento ───────────────────────────────────────────────
    await row.getByRole('button', { name: 'Desactivar' }).click();

    // Confirmar el Popconfirm de AntD
    const popconfirm = page.locator('.ant-popconfirm');
    await expect(popconfirm).toBeVisible({ timeout: 5_000 });
    await popconfirm.getByRole('button', { name: 'Sí' }).click();
    await waitForLoadingDone(page);

    // El estado de la fila cambió a Mantenimiento
    await expect(
      row.locator('text=Mantenimiento')
    ).toBeVisible({ timeout: 10_000 });

    // ── Volver a Libre (toggle: maintenance → free) ──────────────────────────
    // El botón sigue diciendo "Desactivar" (Reactivar sólo aparece con status=inactive)
    await row.getByRole('button', { name: 'Desactivar' }).click();
    const popconfirm2 = page.locator('.ant-popconfirm');
    await expect(popconfirm2).toBeVisible({ timeout: 5_000 });
    await popconfirm2.getByRole('button', { name: 'Sí' }).click();
    await waitForLoadingDone(page);

    // El estado vuelve a Libre
    await expect(
      row.locator('text=Libre')
    ).toBeVisible({ timeout: 10_000 });
  });

});
