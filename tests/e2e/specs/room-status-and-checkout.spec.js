// tests/e2e/specs/room-status-and-checkout.spec.js
// Estados de habitación + fechas Check-in / Check-out de inquilino — @regression
//
// Flujo completo:
//   setup → crear inquilino con habitación (room LIBRE → OCUPADA)
//         → verificar Check-in en tarjeta y detalle
//         → programar baja futura (room OCUPADA → PENDIENTE BAJA, tarjeta muestra Check-out)
//         → programar baja hoy (room → LIBRE, estado inquilino Inactivo)
//
// NOTA: Tests 01-06 marcados como test.fixme(BUG-033) porque TenantCreate.jsx
// está completamente roto (selectedRoomId is not defined en onFinish).
// Los tests de setup (00a, 00b) pasan sin BUG-033.

import { test, expect } from '@playwright/test';
import { antdSelect, extractIdFromUrl, waitForLoadingDone, pickToday, pickDate } from '../helpers/antd.js';

test.describe.configure({ mode: 'serial' });

const TS           = Date.now();
const TS_ALPHA     = String(TS).split('').map(d => String.fromCharCode(65 + parseInt(d, 10))).join('');
const ENT_LN       = `EntRS${TS_ALPHA}`;
const ENT_EMAIL    = `e2e.rs.${TS}@test.smartrent.com`;
const ACC_NAME     = `Piso RS ${TS}`;
const TENANT_FN    = 'RoomTest';
const TENANT_LN    = `InqRS${TS_ALPHA}`;
const TENANT_EMAIL = `e2e.rs.inquilino.${TS}@test.smartrent.com`;

// Fecha futura (+14 días) para test de baja programada
const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 14);
const FUTURE_DATE_ISO = futureDate.toISOString().split('T')[0];                  // YYYY-MM-DD
const FUTURE_DATE_ES  = futureDate.toLocaleDateString('es-ES');                  // D/M/YYYY

const state = {
  entityId:  null,
  accId:     null,
  tenantId:  null,
  roomId:    null,
};

test.describe('Estados de Habitación y Fechas Check-in/Out @regression', () => {

  test.skip(!process.env.TEST_MANAGER_EMAIL,
    'Credenciales de staging no configuradas. Rellenar tests/e2e/.env.e2e');

  // ── Setup A: crear entidad propietaria ────────────────────────────────────
  test('00a - setup: crear entidad propietaria', async ({ page }) => {
    await page.goto('/v2/admin/entidades/nueva');

    await antdSelect(page, 'legal_type', 'Persona física');
    await page.locator('#first_name').fill('RoomTest');
    await page.locator('#last_name1').fill(ENT_LN);
    await page.locator('#last_name2').fill('Setup');
    await antdSelect(page, 'gender', 'Masculino');
    await page.locator('#tax_id').fill('87654321B');
    await page.locator('#phone').fill('600000002');
    await page.locator('#billing_email').fill(ENT_EMAIL);
    await page.locator('#street').fill('Calle Room');
    await page.locator('#street_number').fill('2');
    await page.locator('#zip').fill('46002');
    await page.locator('#city').fill('Valencia');
    await antdSelect(page, 'province', 'Valencia');

    await page.getByRole('button', { name: 'Crear' }).click();
    await page.waitForURL('**/v2/admin/entidades', { timeout: 15_000 });
    await waitForLoadingDone(page);

    await page.locator('input[placeholder*="Buscar"]').fill(ENT_LN);
    await waitForLoadingDone(page);

    const card = page.locator('.ant-card').filter({ hasText: ENT_LN });
    await expect(card).toBeVisible({ timeout: 10_000 });
    await card.getByRole('button', { name: 'Editar' }).click();
    await page.waitForURL('**/entidades/**/editar', { timeout: 10_000 });

    state.entityId = extractIdFromUrl(page, 'entidades');
    expect(state.entityId).toBeTruthy();
  });

  // ── Setup B: crear alojamiento con habitación ─────────────────────────────
  test('00b - setup: crear alojamiento con habitación', async ({ page }) => {
    await page.goto('/v2/admin/alojamientos/nuevo');
    await waitForLoadingDone(page);

    await page.locator('#owner_entity_id').click();
    await page.keyboard.type(ENT_LN);
    await page.locator('.ant-select-dropdown:visible')
      .locator('.ant-select-item-option', { hasText: ENT_LN })
      .first()
      .click();
    await page.locator('.ant-select-dropdown:visible').first().waitFor({ state: 'hidden', timeout: 3_000 }).catch(() => {});

    await page.locator('#name').fill(ACC_NAME);
    await page.locator('#numRooms').click({ clickCount: 3 });
    await page.locator('#numRooms').fill('1');
    await page.locator('#city').fill('Valencia');
    await antdSelect(page, 'province', 'Valencia');

    await page.getByRole('button', { name: 'Continuar' }).click();

    const roomRows = page.locator('.ant-table-tbody tr.ant-table-row');
    await roomRows.first().waitFor({ state: 'visible', timeout: 5_000 });

    await page.getByRole('button', { name: 'Crear Alojamiento' }).click();
    await page.waitForURL('**/v2/admin/alojamientos', { timeout: 20_000 });
    await waitForLoadingDone(page);

    const accCard = page.locator('.ant-card').filter({ hasText: ACC_NAME });
    await expect(accCard).toBeVisible({ timeout: 10_000 });
    await accCard.getByRole('button', { name: 'Editar' }).click();
    await page.waitForURL('**/alojamientos/**/editar', { timeout: 10_000 });

    state.accId = extractIdFromUrl(page, 'alojamientos');
    expect(state.accId).toBeTruthy();
  });

  // ── 00c - Verificar habitación en estado Libre antes de asignar ───────────
  // Depende de setup, pero NO de BUG-033 (solo lectura del alojamiento)
  test('00c - habitación aparece como Libre antes de asignar inquilino', async ({ page }) => {
    expect(state.accId).toBeTruthy();

    await page.goto(`/v2/admin/alojamientos/${state.accId}/habitaciones`);
    await waitForLoadingDone(page);

    // La habitación muestra badge con texto "Libre" (span con background #16A34A inline-style)
    // El tab por defecto es "Habitaciones" (activeTab = "habitaciones")
    const freeTag = page.locator('span').filter({ hasText: /^Libre$/ }).first();
    await expect(freeTag).toBeVisible({ timeout: 10_000 });
  });

  // ── 01 - Crear inquilino con habitación → habitación pasa a Ocupada ───────
  // BUG-033: TenantCreate.jsx onFinish lanza ReferenceError: selectedRoomId is not defined
  test.fixme('01 - crear inquilino con habitación: habitación pasa a Ocupada', async ({ page }) => {
    await page.goto('/v2/admin/inquilinos/nuevo');
    await waitForLoadingDone(page);

    // Datos personales
    await page.locator('#first_name').fill(TENANT_FN);
    await page.locator('#last_name1').fill(TENANT_LN);
    await page.locator('#last_name2').fill('Test');
    await page.locator('#email').fill(TENANT_EMAIL);
    await page.locator('#phone').fill('666111222');
    await page.locator('#document_id').fill(`RS${TS}`);
    await antdSelect(page, 'gender', 'Masculino');
    await page.locator('#address_street').fill('Calle Room');
    await page.locator('#address_number').fill('2');
    await page.locator('#address_floor').fill('1A');
    await page.locator('#address_postal_code').fill('46002');
    await page.locator('#address_city').fill('Valencia');
    await page.locator('#address_province').fill('Valencia');
    await page.locator('#address_country').fill('España');

    // Asignación: seleccionar alojamiento
    await page.locator('#accommodation_id').click();
    await page.locator('.ant-select-dropdown:visible')
      .getByText(ACC_NAME, { exact: false })
      .click();
    await waitForLoadingDone(page);

    // Seleccionar habitación libre
    const freeRoomTag = page.locator('.ant-tag-success', { hasText: 'Libre' }).first();
    await expect(freeRoomTag).toBeVisible({ timeout: 10_000 });
    await freeRoomTag.click();
    await expect(page.locator('#move_in_date')).toBeVisible({ timeout: 5_000 });

    await page.locator('#deposit_amount').click({ clickCount: 3 });
    await page.locator('#deposit_amount').fill('0');
    await pickToday(page, 'move_in_date').catch(() => {});
    await page.locator('.ant-picker-dropdown').first().waitFor({ state: 'hidden', timeout: 3_000 }).catch(() => {});

    await page.getByRole('button', { name: 'Registrar Inquilino' }).click();

    await expect(
      page.locator('h2, .ant-typography').filter({ hasText: /Registrado Exitosamente/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await waitForLoadingDone(page);
  });

  // ── 02 - Verificar habitación Ocupada y obtener ID inquilino ─────────────
  // BUG-033: depende de test 01 (inquilino creado con habitación)
  test.fixme('02 - habitación aparece como Ocupada tras asignación', async ({ page }) => {
    expect(state.accId).toBeTruthy();

    // Obtener ID del inquilino
    await page.goto('/v2/admin/inquilinos');
    await waitForLoadingDone(page);
    const searchInput = page.locator('input[placeholder*="buscar"], input[placeholder*="Buscar"]');
    if (await searchInput.count() > 0) {
      await searchInput.first().fill(TENANT_LN);
      await waitForLoadingDone(page);
    }
    const tenantCard = page.locator('.ant-card').filter({ hasText: TENANT_LN });
    await expect(tenantCard).toBeVisible({ timeout: 10_000 });

    // Estado del inquilino: "Activo"
    await expect(
      tenantCard.locator('.ant-tag, span').filter({ hasText: /Activo|active/ }).first()
    ).toBeVisible({ timeout: 5_000 });

    // Fecha Check-in visible en la tarjeta (texto gris "Check-in: ...")
    await expect(
      tenantCard.locator('div', { hasText: /Check-in:/ }).first()
    ).toBeVisible({ timeout: 5_000 });

    // Navegar al detalle para obtener ID
    await tenantCard.locator('.anticon-file-text').click();
    await page.waitForURL('**/inquilinos/**/detalle-inquilino', { timeout: 10_000 });
    state.tenantId = extractIdFromUrl(page, 'inquilinos');
    expect(state.tenantId).toBeTruthy();

    // Verificar habitación en alojamiento → badge "Ocupada" (span inline-style #DC2626)
    await page.goto(`/v2/admin/alojamientos/${state.accId}/habitaciones`);
    await waitForLoadingDone(page);

    const occupiedTag = page.locator('span').filter({ hasText: /^Ocupada$/ }).first();
    await expect(occupiedTag).toBeVisible({ timeout: 10_000 });
  });

  // ── 03 - Detalle del inquilino muestra Check-in ───────────────────────────
  // BUG-033: depende de test 01
  test.fixme('03 - detalle del inquilino muestra fecha Check-in', async ({ page }) => {
    expect(state.tenantId).toBeTruthy();

    await page.goto(`/v2/admin/inquilinos/${state.tenantId}/detalle`);
    await waitForLoadingDone(page);

    // El nombre del inquilino visible
    await expect(
      page.locator('.ant-typography, h1, h2').filter({ hasText: TENANT_LN }).first()
    ).toBeVisible({ timeout: 10_000 });

    // Fecha de Check-in visible (label + valor)
    await expect(
      page.locator('text=/Check-in|Fecha de entrada|move_in/i').first()
    ).toBeVisible({ timeout: 5_000 });
  });

  // ── 04 - Programar baja futura → habitación pasa a Pendiente baja ─────────
  // BUG-033: depende de test 01
  test.fixme('04 - programar baja futura: habitación pasa a Pendiente baja + tarjeta muestra Check-out', async ({ page }) => {
    expect(state.tenantId).toBeTruthy();

    await page.goto('/v2/admin/inquilinos');
    await waitForLoadingDone(page);

    const searchInput = page.locator('input[placeholder*="buscar"], input[placeholder*="Buscar"]');
    if (await searchInput.count() > 0) {
      await searchInput.first().fill(TENANT_LN);
      await waitForLoadingDone(page);
    }

    const tenantCard = page.locator('.ant-card').filter({ hasText: TENANT_LN });
    await expect(tenantCard).toBeVisible({ timeout: 10_000 });

    // Clic en botón Check-Out (LogoutOutlined → anticon-logout)
    await tenantCard.locator('.anticon-logout').first().click();

    // Modal de Check-Out
    const modal = page.locator('.ant-modal').filter({ hasText: /Check-Out/i });
    await expect(modal).toBeVisible({ timeout: 10_000 });

    // Seleccionar fecha futura en el campo checkout_date
    await pickDate(page, 'checkout_date', FUTURE_DATE_ISO);

    // Confirmar
    await modal.getByRole('button', { name: /Confirmar|Check-Out|Procesar/i }).click();

    // Mensaje de éxito: "Check-out programado para DD/MM/YYYY"
    await expect(
      page.locator('.ant-message-notice-content').filter({ hasText: /Check-out programado/i }).first()
    ).toBeVisible({ timeout: 10_000 });
    await waitForLoadingDone(page);

    // La tarjeta del inquilino debe mostrar:
    // 1. Estado "Pendiente baja"
    await expect(
      tenantCard.locator('.ant-tag, span').filter({ hasText: /Pendiente|pending/i }).first()
    ).toBeVisible({ timeout: 5_000 });

    // 2. Fecha Check-out en ámbar
    await expect(
      tenantCard.locator('div', { hasText: /Check-out:/i }).first()
    ).toBeVisible({ timeout: 5_000 });

    // Verificar habitación en alojamiento → badge "Pendiente baja" (span inline-style #D97706)
    await page.goto(`/v2/admin/alojamientos/${state.accId}/habitaciones`);
    await waitForLoadingDone(page);

    const pendingTag = page.locator('span').filter({ hasText: /^Pendiente baja$/ }).first();
    await expect(pendingTag).toBeVisible({ timeout: 10_000 });
  });

  // ── 05 - Programar baja hoy → habitación pasa a Libre ────────────────────
  // BUG-033: depende de test 01. Requiere reiniciar estado: primero deshacer baja futura.
  // NOTA: este test simula un checkout con fecha de hoy (diferente inquilino o tras cancelar el anterior).
  // En un entorno real se necesitaría un segundo inquilino o cancelar la baja programada.
  // El test verifica la rama "baja hoy" independiente con un setup propio si fuera necesario.
  test.fixme('05 - programar baja hoy: habitación pasa a Libre', async ({ page }) => {
    // Este test depende de que no haya una baja futura activa en el inquilino.
    // Si el test 04 ya programó una baja futura, esta prueba la sobreescribiría con fecha de hoy.
    expect(state.tenantId).toBeTruthy();

    await page.goto('/v2/admin/inquilinos');
    await waitForLoadingDone(page);

    const searchInput = page.locator('input[placeholder*="buscar"], input[placeholder*="Buscar"]');
    if (await searchInput.count() > 0) {
      await searchInput.first().fill(TENANT_LN);
      await waitForLoadingDone(page);
    }

    const tenantCard = page.locator('.ant-card').filter({ hasText: TENANT_LN });
    await expect(tenantCard).toBeVisible({ timeout: 10_000 });

    // Si el inquilino está en "Pendiente baja" (del test 04), el botón Logout puede no estar disponible.
    // El test verifica que cuando la fecha de baja ES hoy, la habitación pasa a "Libre".
    const logoutBtn = tenantCard.locator('.anticon-logout');
    if (await logoutBtn.count() === 0) {
      test.skip(true, 'Botón de checkout no disponible (inquilino en estado Pendiente baja desde test 04)');
      return;
    }

    await logoutBtn.first().click();

    const modal = page.locator('.ant-modal').filter({ hasText: /Check-Out/i });
    await expect(modal).toBeVisible({ timeout: 10_000 });

    // La fecha por defecto es hoy — confirmar sin cambiar
    await modal.getByRole('button', { name: /Confirmar|Check-Out|Procesar/i }).click();

    // Mensaje: "Check-out realizado. El inquilino ha sido dado de baja."
    await expect(
      page.locator('.ant-message-notice-content').filter({ hasText: /Check-out realizado/i }).first()
    ).toBeVisible({ timeout: 10_000 });
    await waitForLoadingDone(page);

    // Verificar habitación → "Libre"
    await page.goto(`/v2/admin/alojamientos/${state.accId}/habitaciones`);
    await waitForLoadingDone(page);

    const freeTag = page.locator('span').filter({ hasText: /^Libre$/ }).first();
    await expect(freeTag).toBeVisible({ timeout: 10_000 });
  });

  // ── 06 - Estado del inquilino tras baja (hoy) → Inactivo ─────────────────
  // BUG-033: depende de test 01
  test.fixme('06 - inquilino en estado Inactivo tras baja de hoy', async ({ page }) => {
    expect(state.tenantId).toBeTruthy();

    await page.goto('/v2/admin/inquilinos');
    await waitForLoadingDone(page);

    const searchInput = page.locator('input[placeholder*="buscar"], input[placeholder*="Buscar"]');
    if (await searchInput.count() > 0) {
      await searchInput.first().fill(TENANT_LN);
      await waitForLoadingDone(page);
    }

    const tenantCard = page.locator('.ant-card').filter({ hasText: TENANT_LN });
    await expect(tenantCard).toBeVisible({ timeout: 10_000 });

    // El estado calculado con move_out_date = hoy debe ser "Inactivo"
    // (getLodgerStatus: move_out_date <= hoy → 'inactive')
    await expect(
      tenantCard.locator('.ant-tag, span').filter({ hasText: /Inactivo|inactive/i }).first()
    ).toBeVisible({ timeout: 5_000 });

    // No debe mostrar fecha de Check-out (ya no es pendiente, es pasado)
    // Check-in sí puede estar visible; Check-out en ámbar NO
    await expect(
      tenantCard.locator('div[style*="F59E0B"]').first()
    ).toHaveCount(0);
  });

});
