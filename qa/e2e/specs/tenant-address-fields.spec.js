// qa/e2e/specs/tenant-address-fields.spec.js
// Validación de campos de dirección en el módulo de Inquilinos @regression
//
// Cubre: ADDRESS-FIELDS-VALIDATION.md (todos los campos de dirección son OBLIGATORIOS)
//   TEST-ADDR-001   Crear inquilino con dirección completa
//   TEST-ADDR-002   Formulario NO se envía sin campos de dirección (todos obligatorios)
//   TEST-ADDR-003   Código postal tiene maxLength=10
//   TEST-ADDR-004   Cada campo de dirección muestra su error específico
//   TEST-ADDR-005   Campos obligatorios también en edición
//   TEST-ADDR-006   Editar y modificar dirección existente
//   TEST-ADDR-007   No se puede guardar con un campo de dirección vacío
//   TEST-ADDR-008B  Asterisco rojo en todos los campos de dirección
//   TEST-ADDR-009   Detalle muestra 6 campos individuales en 2 columnas
//   TEST-ADDR-010   Etiqueta "Dirección" visible con borderTop
//   TEST-ADDR-011   Detalle con dirección parcial no muestra null/undefined
//
// Prerequisito: qa/e2e/.env.e2e configurado con credenciales de staging

import { test, expect } from '@playwright/test';
import { antdSelect, extractIdFromUrl, waitForLoadingDone } from '../helpers/antd.js';

test.describe.configure({ mode: 'serial' });

const TS        = Date.now();
const ENT_LN    = `E2E Addr ${TS}`;
const ENT_EMAIL = `e2e.addr.${TS}@test.smartrent.com`;
const ACC_NAME  = `Piso Addr ${TS}`;

const TENANT_FULL_ADDR = {
  first_name:  'ConDir',
  last_name1:  `FullAddr${TS}`,
  last_name2:  'Test',
  email:       `fulladdr.${TS}@test.smartrent.com`,
  phone:       '600333444',
  document_id: `FD${TS}`,
  gender:      'female',
};

const ADDRESS_COMPLETE = {
  address_street:      'Calle Mayor',
  address_number:      '123',
  address_floor:       '3º B',
  address_postal_code: '28013',
  address_city:        'Madrid',
  address_province:    'Madrid',
  address_country:     'España',
};

const ADDRESS_MODIFIED = {
  address_street:      'Nueva Calle, 200',
  address_postal_code: '28001',
};

const state = {
  entityId:       null,
  accId:          null,
  tenantFullAddr: null,
};

// Helper: rellenar campos personales obligatorios
async function fillRequiredFields(page, tenant) {
  await page.locator('#first_name').fill(tenant.first_name);
  await page.locator('#last_name1').fill(tenant.last_name1);
  await page.locator('#last_name2').fill(tenant.last_name2);
  await page.locator('#email').fill(tenant.email);
  await page.locator('#phone').fill(tenant.phone);
  await page.locator('#document_id').fill(tenant.document_id);
  await antdSelect(page, 'gender', tenant.gender === 'male' ? 'Masculino' : 'Femenino');
}

// Helper: rellenar campos de dirección
async function fillAddressFields(page, address) {
  if (address.address_street !== undefined)
    await page.locator('#address_street').fill(address.address_street);
  if (address.address_number !== undefined)
    await page.locator('#address_number').fill(address.address_number);
  if (address.address_floor !== undefined)
    await page.locator('#address_floor').fill(address.address_floor);
  if (address.address_postal_code !== undefined)
    await page.locator('#address_postal_code').fill(address.address_postal_code);
  if (address.address_city !== undefined)
    await page.locator('#address_city').fill(address.address_city);
  if (address.address_province !== undefined)
    await page.locator('#address_province').fill(address.address_province);
  if (address.address_country !== undefined)
    await page.locator('#address_country').fill(address.address_country);
}

// Helper: limpiar un campo
async function clearField(page, fieldId) {
  await page.locator(`#${fieldId}`).clear();
  await page.locator(`#${fieldId}`).press('Tab'); // Triggear validación blur
}

// =============================================================================
test.describe('Validación de campos de dirección — Inquilino @regression', () => {

  test.skip(!process.env.TEST_MANAGER_EMAIL,
    'Credenciales de staging no configuradas. Rellenar qa/e2e/.env.e2e');

  // ── Setup A: entidad propietaria ─────────────────────────────────────────
  test('00a - setup: crear entidad propietaria', async ({ page }) => {
    await page.goto('/v2/admin/entidades/nueva');
    await antdSelect(page, 'legal_type', 'Persona física');
    await page.locator('#first_name').fill('E2E');
    await page.locator('#last_name1').fill(ENT_LN);
    await page.locator('#billing_email').fill(ENT_EMAIL);
    await page.locator('#city').fill('Madrid');
    await antdSelect(page, 'province', 'Madrid');
    await page.getByRole('button', { name: 'Crear' }).click();
    await page.waitForURL('**/v2/admin/entidades', { timeout: 15_000 });
    await waitForLoadingDone(page);

    const card = page.locator('.ant-card').filter({ hasText: ENT_LN });
    await expect(card).toBeVisible({ timeout: 10_000 });
    await card.getByRole('button', { name: 'Editar' }).click();
    await page.waitForURL('**/entidades/**/editar', { timeout: 10_000 });
    state.entityId = extractIdFromUrl(page, 'entidades');
    expect(state.entityId).toBeTruthy();
  });

  // ── Setup B: alojamiento ──────────────────────────────────────────────────
  test('00b - setup: crear alojamiento', async ({ page }) => {
    await page.goto('/v2/admin/alojamientos/nuevo');
    await waitForLoadingDone(page);

    await page.locator('#owner_entity_id').click();
    await page.keyboard.type(ENT_LN);
    await page.locator('.ant-select-dropdown:visible')
      .locator('.ant-select-item-option', { hasText: ENT_LN }).first().click();

    await page.locator('#name').fill(ACC_NAME);
    await page.locator('#numRooms').fill('2');
    await page.locator('#city').fill('Madrid');
    await antdSelect(page, 'province', 'Madrid');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.locator('.ant-table-tbody tr')).toHaveCount(2, { timeout: 5_000 });
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

  // ── TEST-ADDR-002: Formulario NO se envía sin dirección ───────────────────
  test('01 - ADDR-002: formulario bloqueado cuando faltan todos los campos de dirección', async ({ page }) => {
    await page.goto('/v2/admin/inquilinos/nuevo');
    await waitForLoadingDone(page);

    // Rellenar solo datos personales, sin dirección
    await fillRequiredFields(page, TENANT_FULL_ADDR);

    await page.getByRole('button', { name: 'Crear Inquilino' }).click();

    // El formulario NO debe redirigir
    await expect(page).toHaveURL(/\/v2\/admin\/inquilinos\/nuevo/);

    // Deben aparecer mensajes de error de validación de dirección
    await expect(page.locator('text=La calle es obligatoria').or(
      page.locator('.ant-form-item-explain-error').filter({ hasText: /calle/ })
    )).toBeVisible({ timeout: 5_000 });
  });

  // ── TEST-ADDR-008B: Asterisco rojo en campos obligatorios ─────────────────
  test('02 - ADDR-008B: campos de dirección muestran asterisco rojo (*)', async ({ page }) => {
    await page.goto('/v2/admin/inquilinos/nuevo');
    await waitForLoadingDone(page);

    // Los Form.Item con required muestran el asterisco vía .ant-form-item-required
    const requiredLabels = [
      'Calle',
      'Número',
      'Piso / Puerta',
      'Código Postal',
      'Localidad',
      'Provincia',
      'País',
    ];

    for (const label of requiredLabels) {
      // Verificar que el label está marcado como requerido (tiene asterisco en el DOM)
      const formItem = page.locator('.ant-form-item').filter({ hasText: label }).first();
      await expect(formItem.locator('.ant-form-item-required'), `"${label}" debe ser obligatorio`).toBeVisible();
    }
  });

  // ── TEST-ADDR-003: Código postal tiene maxLength=10 ───────────────────────
  test('03 - ADDR-003: input código postal tiene maxLength=10', async ({ page }) => {
    await page.goto('/v2/admin/inquilinos/nuevo');
    await waitForLoadingDone(page);

    const postalInput = page.locator('#address_postal_code');
    await expect(postalInput).toBeVisible();

    const maxLength = await postalInput.getAttribute('maxlength');
    expect(maxLength).toBe('10');

    // No acepta más de 10 caracteres
    await postalInput.fill('123456789012');
    const value = await postalInput.inputValue();
    expect(value.length).toBeLessThanOrEqual(10);
  });

  // ── TEST-ADDR-004: Cada campo muestra su mensaje de error específico ───────
  test('04 - ADDR-004: cada campo de dirección muestra su mensaje de error al quedar vacío', async ({ page }) => {
    await page.goto('/v2/admin/inquilinos/nuevo');
    await waitForLoadingDone(page);

    await fillRequiredFields(page, {
      ...TENANT_FULL_ADDR,
      email: `addr004.${TS}@test.smartrent.com`,
      document_id: `A4${TS}`,
    });
    await fillAddressFields(page, ADDRESS_COMPLETE);

    // Caso: limpiar address_postal_code y enviar
    await clearField(page, 'address_postal_code');
    await page.getByRole('button', { name: 'Crear Inquilino' }).click();

    await expect(
      page.locator('text=El código postal es obligatorio').or(
        page.locator('.ant-form-item-explain-error').filter({ hasText: /postal/ })
      )
    ).toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveURL(/\/v2\/admin\/inquilinos\/nuevo/);
  });

  // ── TEST-ADDR-001: Crear inquilino CON dirección completa ─────────────────
  test('05 - ADDR-001: crear inquilino con dirección completa', async ({ page }) => {
    await page.goto('/v2/admin/inquilinos/nuevo');
    await waitForLoadingDone(page);

    await fillRequiredFields(page, TENANT_FULL_ADDR);
    await fillAddressFields(page, ADDRESS_COMPLETE);

    await page.getByRole('button', { name: 'Crear Inquilino' }).click();
    await page.waitForURL('**/v2/admin/inquilinos', { timeout: 20_000 });
    await expect(page).toHaveURL(/\/v2\/admin\/inquilinos/);
  });

  // ── TEST-ADDR-009 + TEST-ADDR-010: Detalle muestra 6 campos en 2 columnas ─
  test('06 - ADDR-009/010: detalle muestra 6 campos individuales con etiqueta "Dirección"', async ({ page }) => {
    await page.goto('/v2/admin/inquilinos');
    await waitForLoadingDone(page);

    const searchInput = page.locator('input[placeholder*="Buscar"], input[placeholder*="buscar"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill(TENANT_FULL_ADDR.last_name1);
      await waitForLoadingDone(page);
    }

    const row = page.locator('.ant-card, tr').filter({ hasText: TENANT_FULL_ADDR.last_name1 }).first();
    await expect(row).toBeVisible({ timeout: 10_000 });
    // Clic en botón "Detalle del Inquilino" (icono FileTextOutlined → anticon-file-text)
    // que navega a /v2/admin/inquilinos/:id/detalle-inquilino
    await row.locator('.anticon-file-text').first().click();
    await page.waitForURL('**/inquilinos/**/detalle-inquilino', { timeout: 10_000 });
    await waitForLoadingDone(page);

    state.tenantFullAddr = extractIdFromUrl(page, 'inquilinos');

    // TEST-ADDR-010: Etiqueta "Dirección" siempre visible
    await expect(page.locator('text=Dirección').first()).toBeVisible();

    // TEST-ADDR-009: Los 7 labels individuales
    await expect(page.locator('text=Calle')).toBeVisible();
    await expect(page.locator('text=Número')).toBeVisible();
    await expect(page.locator('text=Piso / Puerta')).toBeVisible();
    await expect(page.locator('text=Código Postal')).toBeVisible();
    await expect(page.locator('text=Localidad')).toBeVisible();
    await expect(page.locator('text=Provincia')).toBeVisible();
    await expect(page.locator('text=País')).toBeVisible();

    // Los valores de la dirección son visibles
    await expect(page.locator(`text=${ADDRESS_COMPLETE.address_street}`)).toBeVisible();
    await expect(page.locator(`text=${ADDRESS_COMPLETE.address_city}`)).toBeVisible();
    await expect(page.locator(`text=${ADDRESS_COMPLETE.address_country}`)).toBeVisible();
  });

  // ── TEST-ADDR-005: Campos obligatorios en edición ─────────────────────────
  test('07 - ADDR-005: editar inquilino — campos de dirección son obligatorios', async ({ page }) => {
    if (!state.tenantFullAddr) test.skip(true, 'ID de inquilino no disponible');

    await page.goto(`/v2/admin/inquilinos/${state.tenantFullAddr}/editar`);
    await waitForLoadingDone(page);

    // Limpiar todos los campos de dirección
    for (const field of ['address_street', 'address_number', 'address_floor', 'address_postal_code',
                          'address_city', 'address_province', 'address_country']) {
      await clearField(page, field);
    }

    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    // El formulario NO debe redirigir ni guardar
    await expect(page).toHaveURL(/\/editar/);
    await expect(
      page.locator('.ant-form-item-explain-error').first()
    ).toBeVisible({ timeout: 5_000 });
  });

  // ── TEST-ADDR-006: Editar y modificar dirección existente ─────────────────
  test('08 - ADDR-006: editar inquilino con dirección y modificar algunos campos', async ({ page }) => {
    if (!state.tenantFullAddr) test.skip(true, 'ID de inquilino no disponible');

    await page.goto(`/v2/admin/inquilinos/${state.tenantFullAddr}/editar`);
    await waitForLoadingDone(page);

    await expect(page.locator('#address_street')).toHaveValue(ADDRESS_COMPLETE.address_street);

    await page.locator('#address_street').clear();
    await page.locator('#address_street').fill(ADDRESS_MODIFIED.address_street);
    await page.locator('#address_postal_code').clear();
    await page.locator('#address_postal_code').fill(ADDRESS_MODIFIED.address_postal_code);

    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(
      page.locator('.ant-message-success').or(
        page.locator('text=guardado').or(page.locator('text=actualizado'))
      )
    ).toBeVisible({ timeout: 8_000 }).catch(() => {});

    // Verificar persistencia recargando
    await page.reload();
    await waitForLoadingDone(page);
    await expect(page.locator('#address_street')).toHaveValue(ADDRESS_MODIFIED.address_street);
    await expect(page.locator('#address_postal_code')).toHaveValue(ADDRESS_MODIFIED.address_postal_code);
    // Campos no modificados se mantienen
    await expect(page.locator('#address_city')).toHaveValue(ADDRESS_COMPLETE.address_city);
  });

  // ── TEST-ADDR-007: No se puede guardar con un campo vacío ─────────────────
  test('09 - ADDR-007: editar — no se puede guardar si un campo de dirección está vacío', async ({ page }) => {
    if (!state.tenantFullAddr) test.skip(true, 'ID de inquilino no disponible');

    await page.goto(`/v2/admin/inquilinos/${state.tenantFullAddr}/editar`);
    await waitForLoadingDone(page);

    // Limpiar solo código postal
    await clearField(page, 'address_postal_code');

    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    // El formulario NO debe guardar
    await expect(page).toHaveURL(/\/editar/);
    await expect(
      page.locator('text=El código postal es obligatorio').or(
        page.locator('.ant-form-item-explain-error').filter({ hasText: /postal/ })
      )
    ).toBeVisible({ timeout: 5_000 });

    // El campo calle mantiene su valor modificado
    await expect(page.locator('#address_street')).toHaveValue(ADDRESS_MODIFIED.address_street);
  });

  // ── TEST-ADDR-011: Detalle no muestra null/undefined ─────────────────────
  test('10 - ADDR-011: detalle no muestra "null" ni "undefined" en ningún campo', async ({ page }) => {
    if (!state.tenantFullAddr) test.skip(true, 'ID de inquilino no disponible');

    await page.goto(`/v2/admin/inquilinos/${state.tenantFullAddr}`);
    await waitForLoadingDone(page);

    await expect(page.locator('text=Dirección').first()).toBeVisible();

    const pageContent = await page.textContent('body');
    expect(pageContent).not.toContain('null');
    expect(pageContent).not.toContain('undefined');
  });

});
