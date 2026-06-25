// qa/e2e/specs/shared-rooms.spec.js
// REQ-015 — Habitaciones compartidas con acompañante (@regression)
//
// Cubre los 6 escenarios principales del requisito:
//   1) Crear inquilino con toggle "Habitación compartida" + datos del acompañante
//   2) Ver sección Acompañante en TenantDetail (cabecera + collapse de datos)
//   3) Editar datos del acompañante (admin)
//   4) Cambiar de habitación → el acompañante se arrastra automáticamente y se ve el banner
//   5) Tag "Compartida" en TenantsList (vista cards y vista lista)
//   6) Búsqueda por nombre del acompañante → tag "Match acompañante"
//
// Estos tests dependen de un alojamiento + entidad ya creados por `tenants.spec.js`
// (mismo patrón). Mientras BUG-033 siga abierto, se marcan como `test.fixme` igual
// que el resto del flujo dependiente.

import { test, expect } from '@playwright/test';
import { antdSelect, extractIdFromUrl, waitForLoadingDone, pickToday } from '../helpers/antd.js';

test.describe.configure({ mode: 'serial' });

const TS              = Date.now();
const TS_ALPHA        = String(TS).split('').map(d => String.fromCharCode(65 + parseInt(d, 10))).join('');
const ENT_LN          = `EntShared${TS_ALPHA}`;
const ENT_EMAIL       = `e2e.shared.${TS}@test.smartrent.com`;
const ACC_NAME        = `Piso Compartido E2E ${TS}`;

const TENANT_FN       = 'Test';
const TENANT_LN       = `InqShared${TS_ALPHA}`;
const TENANT_EMAIL    = `e2e.inq.shared.${TS}@test.smartrent.com`;
const TENANT_FULLNAME = `${TENANT_FN} ${TENANT_LN}`;

const ACC_FN          = 'Pareja';
const ACC_LN          = `AcompShared${TS_ALPHA}`;
const ACC_FULLNAME    = `${ACC_FN} ${ACC_LN}`;
const ACC_EMAIL       = `e2e.acomp.${TS}@test.smartrent.com`;

const state = {
  entityId: null,
  accId:    null,
  tenantId: null,
};

test.describe('Habitación compartida — Acompañante (REQ-015) @regression', () => {
  test.skip(!process.env.TEST_MANAGER_EMAIL,
    'Credenciales de staging no configuradas. Rellenar qa/e2e/.env.e2e');

  // ── Setup A · Entidad propietaria ─────────────────────────────────────────
  test('00a - setup: crear entidad propietaria', async ({ page }) => {
    await page.goto('/v2/admin/entidades/nueva');

    await antdSelect(page, 'legal_type', 'Persona física');
    await page.locator('#first_name').fill('Test');
    await page.locator('#last_name1').fill(ENT_LN);
    await page.locator('#last_name2').fill('Setup');
    await antdSelect(page, 'gender', 'Masculino');
    await page.locator('#tax_id').fill('12345678A');
    await page.locator('#phone').fill('600000002');
    await page.locator('#billing_email').fill(ENT_EMAIL);
    await page.locator('#street').fill('Calle Test');
    await page.locator('#street_number').fill('1');
    await page.locator('#zip').fill('46001');
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

  // ── Setup B · Alojamiento con 2 habitaciones (una compartida) ─────────────
  test.fixme('00b - setup: alojamiento con 2 habitaciones, marcar la 1 como compartida', async ({ page: _page }) => {
    expect(state.entityId).toBeTruthy();
    // Crear alojamiento, añadir 2 habitaciones, y editar la 1ª para activar
    // el toggle "Habitación compartida" (rooms.is_shared = true).
    // Selector pendiente de estabilizar: el toggle aparece en el form de edición
    // de habitación dentro de AccommodationDetail.
  });

  // ── 01 · Crear inquilino activando "Habitación compartida" + acompañante ──
  test.fixme('01 - crear inquilino con habitación compartida y acompañante', async ({ page }) => {
    expect(state.accId).toBeTruthy();
    await page.goto('/v2/admin/inquilinos/nuevo');
    await waitForLoadingDone(page);

    // Datos del inquilino principal
    await page.locator('#first_name').fill(TENANT_FN);
    await page.locator('#last_name1').fill(TENANT_LN);
    await page.locator('#email').fill(TENANT_EMAIL);
    await page.locator('#phone').fill('666000222');
    await antdSelect(page, 'gender', 'Femenino');

    // Selección de alojamiento + habitación compartida
    await antdSelect(page, 'accommodation_id', ACC_NAME);
    const sharedRoomTag = page.locator('.ant-tag').filter({ hasText: 'Compartida' }).first();
    await expect(sharedRoomTag).toBeVisible({ timeout: 5_000 });

    // Click en habitación libre marcada como compartida
    const freeRoom = page.locator('.ant-card').filter({ has: page.locator('.ant-tag', { hasText: 'Libre' }) })
      .filter({ has: page.locator('.ant-tag', { hasText: 'Compartida' }) }).first();
    await freeRoom.click();

    // Sub-form del acompañante: el toggle debería estar ON por defecto
    const sharedSwitch = page.locator('.ant-switch').filter({ hasText: '' }).first();
    await expect(sharedSwitch).toHaveAttribute('aria-checked', 'true');

    // Datos mínimos del acompañante (los nombres se anidan: accompanist.first_name, …)
    await page.locator('input[id="accompanist_first_name"], input[id="accompanist.first_name"]').first().fill(ACC_FN);
    await page.locator('input[id="accompanist_last_name1"], input[id="accompanist.last_name1"]').first().fill(ACC_LN);
    await page.locator('input[id="accompanist_email"], input[id="accompanist.email"]').first().fill(ACC_EMAIL);

    // Fianza + fecha
    await page.locator('#deposit_amount').fill('0');
    await pickToday(page, 'move_in_date').catch(() => {});

    await page.getByRole('button', { name: 'Registrar Inquilino' }).click();
    await expect(page.getByText(/Registrado Exitosamente/i)).toBeVisible({ timeout: 20_000 });
  });

  // ── 02 · TenantDetail muestra la sección Acompañante ──────────────────────
  test.fixme('02 - sección Acompañante visible en TenantDetail con datos correctos', async ({ page }) => {
    expect(state.tenantId).toBeTruthy();
    await page.goto(`/v2/admin/inquilinos/${state.tenantId}/detalle-inquilino`);
    await waitForLoadingDone(page);

    // Cabecera "ACOMPAÑANTE"
    await expect(page.getByText(/Acompa\u00f1ante/i)).toBeVisible({ timeout: 10_000 });
    // Nombre completo
    await expect(page.getByText(ACC_FULLNAME)).toBeVisible();

    // Expand collapse → "Ver datos"
    await page.getByText(/Ver datos/i).click();
    await expect(page.getByText('Email')).toBeVisible();
    await expect(page.getByText(ACC_EMAIL)).toBeVisible();
  });

  // ── 03 · Editar datos del acompañante (modal) ─────────────────────────────
  test.fixme('03 - editar acompañante: actualizar teléfono', async ({ page }) => {
    expect(state.tenantId).toBeTruthy();
    await page.goto(`/v2/admin/inquilinos/${state.tenantId}/detalle-inquilino`);
    await waitForLoadingDone(page);

    // Botón "Editar" de la sección Acompañante
    await page.getByRole('button', { name: /Editar/i })
      .or(page.getByText(/Editar/i)).first().click();

    const modal = page.locator('.ant-modal').filter({ hasText: /Editar acompa\u00f1ante/i });
    await expect(modal).toBeVisible({ timeout: 10_000 });

    await modal.locator('input[id*="phone"]').first().fill('677111000');
    await modal.getByRole('button', { name: /Guardar|Aceptar/i }).click();
    await expect(modal).toBeHidden({ timeout: 10_000 });

    // Verificar nuevo teléfono
    await page.getByText(/Ver datos/i).click();
    await expect(page.getByText('677111000')).toBeVisible({ timeout: 5_000 });
  });

  // ── 04 · Reassign room: el acompañante se arrastra y se ve el banner ──────
  test.fixme('04 - cambiar habitación: banner + arrastre automático del acompañante', async ({ page }) => {
    expect(state.tenantId).toBeTruthy();
    await page.goto(`/v2/admin/inquilinos/${state.tenantId}/editar?action=reassign`);
    await waitForLoadingDone(page);

    const modal = page.locator('.ant-modal').filter({ hasText: /Cambiar habitaci/i });
    await expect(modal).toBeVisible({ timeout: 10_000 });

    // REQ-015: banner de aviso "El acompañante se mantiene"
    await expect(modal.getByText(/acompa\u00f1ante se mantiene|Permanece como acompa\u00f1ante/i))
      .toBeVisible({ timeout: 5_000 });
    await expect(modal.getByText(ACC_FULLNAME)).toBeVisible();

    // Selección destino
    await modal.locator('#new_accommodation_id').click();
    await page.locator('.ant-select-dropdown:visible').getByText(ACC_NAME).click();
    await waitForLoadingDone(page);
    await modal.locator('#new_room_id').click();
    await page.locator('.ant-select-dropdown:visible .ant-select-item-option').first().click();
    await pickToday(page, 'move_in_date').catch(() => {});

    await modal.getByRole('button', { name: /Confirmar|Cambiar/i }).click();
    await expect(modal).toBeHidden({ timeout: 15_000 });

    // En el detalle, la sección Acompañante sigue presente con el mismo nombre
    await page.goto(`/v2/admin/inquilinos/${state.tenantId}/detalle-inquilino`);
    await waitForLoadingDone(page);
    await expect(page.getByText(ACC_FULLNAME)).toBeVisible({ timeout: 10_000 });
  });

  // ── 05 · Tag "Compartida" en TenantsList ─────────────────────────────────
  test.fixme('05 - TenantsList muestra tag "Compartida" en la card del inquilino', async ({ page }) => {
    await page.goto('/v2/admin/inquilinos');
    await waitForLoadingDone(page);

    await page.locator('input[placeholder*="Buscar"]').first().fill(TENANT_LN);
    await waitForLoadingDone(page);

    const card = page.locator('.ant-row').locator('div').filter({ hasText: TENANT_FULLNAME }).first();
    await expect(card.locator('.ant-tag').filter({ hasText: 'Compartida' })).toBeVisible({ timeout: 10_000 });
  });

  // ── 06 · Búsqueda por nombre del acompañante → tag "Match acompañante" ───
  test.fixme('06 - buscar por nombre del acompañante y ver tag "Match acompañante"', async ({ page }) => {
    await page.goto('/v2/admin/inquilinos');
    await waitForLoadingDone(page);

    await page.locator('input[placeholder*="Buscar"]').first().fill(ACC_LN);
    await waitForLoadingDone(page);

    const card = page.locator('.ant-row').locator('div').filter({ hasText: TENANT_FULLNAME }).first();
    await expect(card).toBeVisible({ timeout: 10_000 });
    await expect(card.locator('.ant-tag').filter({ hasText: /Match acompa\u00f1ante/i }))
      .toBeVisible({ timeout: 5_000 });
  });

});
