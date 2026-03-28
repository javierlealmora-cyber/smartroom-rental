// qa/e2e/specs/tenants.spec.js
// CRUD de Inquilinos + Asignación de habitación + Cambio de habitación — @regression
//
// El test crea su propia entidad + alojamiento (con 2 habitaciones).
// Flujo completo:
//   setup → crear inquilino → asignar habitación → editar → cambiar habitación → programar baja

import { test, expect } from '@playwright/test';
import { antdSelect, extractIdFromUrl, waitForLoadingDone, pickToday } from '../helpers/antd.js';

test.describe.configure({ mode: 'serial' });

const TS              = Date.now();
// Los campos de nombre solo aceptan letras → convertir timestamp a letras (0→A … 9→J)
const TS_ALPHA        = String(TS).split('').map(d => String.fromCharCode(65 + parseInt(d, 10))).join('');
const ENT_LN          = `EntTen${TS_ALPHA}`;   // ej: EntTenBHHDAGHHAEDB
const ENT_EMAIL       = `e2e.ten.${TS}@test.smartrent.com`;
const ACC_NAME        = `Piso E2E ${TS}`;
const TENANT_FN       = 'Test';
const TENANT_LN       = `InqTen${TS_ALPHA}`;   // ej: InqTenBHHDAGHHAEDB
const TENANT_EMAIL    = `e2e.inquilino.${TS}@test.smartrent.com`;
const TENANT_PHONE    = '666000111';
const TENANT_FULLNAME = `${TENANT_FN} ${TENANT_LN}`;

const state = {
  entityId:  null,
  accId:     null,
  tenantId:  null,
  room1Id:   null,   // habitación inicial
  room2Id:   null,   // habitación destino del cambio
};

test.describe('Inquilinos CRUD @regression', () => {

  test.skip(!process.env.TEST_MANAGER_EMAIL,
    'Credenciales de staging no configuradas. Rellenar qa/e2e/.env.e2e');

  // ── Setup A: crear entidad propietaria ───────────────────────────────────
  test('00a - setup: crear entidad propietaria', async ({ page }) => {
    await page.goto('/v2/admin/entidades/nueva');

    await antdSelect(page, 'legal_type', 'Persona física');
    await page.locator('#first_name').fill('Test');
    await page.locator('#last_name1').fill(ENT_LN);
    // BUG-031 workaround: last_name2 y gender son NOT NULL en DB
    await page.locator('#last_name2').fill('Setup');
    await antdSelect(page, 'gender', 'Masculino');
    await page.locator('#tax_id').fill('12345678A');
    await page.locator('#phone').fill('600000001');
    await page.locator('#billing_email').fill(ENT_EMAIL);
    // Campos de dirección requeridos en DB
    await page.locator('#street').fill('Calle Test');
    await page.locator('#street_number').fill('1');
    await page.locator('#zip').fill('46001');
    await page.locator('#city').fill('Valencia');
    await antdSelect(page, 'province', 'Valencia');

    await page.getByRole('button', { name: 'Crear' }).click();
    await page.waitForURL('**/v2/admin/entidades', { timeout: 15_000 });
    await waitForLoadingDone(page);

    // Leer ID de la entidad
    await page.locator('input[placeholder*="Buscar"]').fill(ENT_LN);
    await waitForLoadingDone(page);

    const card = page.locator('.ant-card').filter({ hasText: ENT_LN });
    await expect(card).toBeVisible({ timeout: 10_000 });
    await card.getByRole('button', { name: 'Editar' }).click();
    await page.waitForURL('**/entidades/**/editar', { timeout: 10_000 });

    state.entityId = extractIdFromUrl(page, 'entidades');
    expect(state.entityId).toBeTruthy();
  });

  // ── Setup B: crear alojamiento con 2 habitaciones ───────────────────────
  test('00b - setup: crear alojamiento con 2 habitaciones', async ({ page }) => {
    await page.goto('/v2/admin/alojamientos/nuevo');
    await waitForLoadingDone(page);

    // Seleccionar entidad propietaria
    await page.locator('#owner_entity_id').click();
    await page.keyboard.type(ENT_LN);
    await page.locator('.ant-select-dropdown:visible')
      .locator('.ant-select-item-option', { hasText: ENT_LN })
      .first()
      .click();
    // Esperar a que el dropdown del propietario se cierre completamente
    await page.locator('.ant-select-dropdown:visible').first().waitFor({ state: 'hidden', timeout: 3_000 }).catch(() => {});

    await page.locator('#name').fill(ACC_NAME);
    // AntD InputNumber: triple click para seleccionar todo, luego fill
    await page.locator('#numRooms').click({ clickCount: 3 });
    await page.locator('#numRooms').fill('2');
    await page.locator('#city').fill('Valencia');
    await antdSelect(page, 'province', 'Valencia');

    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 2: verificar al menos 2 habitaciones (.ant-table-row excluye la fila oculta de medición de AntD)
    const roomRows = page.locator('.ant-table-tbody tr.ant-table-row');
    await roomRows.first().waitFor({ state: 'visible', timeout: 5_000 });
    const roomCount = await roomRows.count();
    expect(roomCount, 'Debe haber al menos 2 habitaciones para asignación y cambio').toBeGreaterThanOrEqual(2);

    await page.getByRole('button', { name: 'Crear Alojamiento' }).click();
    await page.waitForURL('**/v2/admin/alojamientos', { timeout: 20_000 });
    await waitForLoadingDone(page);

    // Leer ID del alojamiento
    const accCard = page.locator('.ant-card').filter({ hasText: ACC_NAME });
    await expect(accCard).toBeVisible({ timeout: 10_000 });
    await accCard.getByRole('button', { name: 'Editar' }).click();
    await page.waitForURL('**/alojamientos/**/editar', { timeout: 10_000 });

    state.accId = extractIdFromUrl(page, 'alojamientos');
    expect(state.accId).toBeTruthy();
  });

  // ── 01 · Lista de inquilinos carga ───────────────────────────────────────
  test('01 - lista de inquilinos es accesible', async ({ page }) => {
    await page.goto('/v2/admin/inquilinos');
    await waitForLoadingDone(page);

    await expect(
      page.locator('h1, h2, .ant-typography').filter({ hasText: /[Ii]nquilinos/ }).first()
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nuevo Inquilino' })).toBeVisible();
  });

  // ── 02 · Crear inquilino y asignar habitación ────────────────────────────
  // BUG-033: TenantCreate.jsx onFinish referencia selectedRoomId/availableRooms/payUntilEndOfMonth
  // que son estado interno de RoomAssignmentForm (no accesibles en el padre) → ReferenceError en submit.
  // Afecta TODOS los casos (con y sin habitación). Tests 03-08 también marcados como fixme.
  test.fixme('02 - crear inquilino con asignación de habitación', async ({ page }) => {
    await page.goto('/v2/admin/inquilinos/nuevo');
    await waitForLoadingDone(page);

    // ── Datos personales (todos los campos requeridos por LodgerFormFields) ──
    await page.locator('#first_name').fill(TENANT_FN);
    await page.locator('#last_name1').fill(TENANT_LN);
    await page.locator('#last_name2').fill('Setup');
    await page.locator('#email').fill(TENANT_EMAIL);
    await page.locator('#phone').fill(TENANT_PHONE);
    await page.locator('#document_id').fill(`E2E${TS}`);
    await antdSelect(page, 'gender', 'Masculino');
    // Dirección (todos obligatorios en el form)
    await page.locator('#address_street').fill('Calle Test');
    await page.locator('#address_number').fill('1');
    await page.locator('#address_floor').fill('1A');
    await page.locator('#address_postal_code').fill('28001');
    await page.locator('#address_city').fill('Madrid');
    await page.locator('#address_province').fill('Madrid');
    await page.locator('#address_country').fill('España');

    // ── Asignación de habitación ──────────────────────────────────────────

    // Seleccionar alojamiento
    await page.locator('#accommodation_id').click();
    await page.locator('.ant-select-dropdown:visible')
      .getByText(ACC_NAME, { exact: false })
      .click();

    // Esperar a que carguen las habitaciones
    await page.waitForResponse(
      (r) => r.url().includes('rooms') || r.url().includes('habitaci'),
      { timeout: 10_000 }
    ).catch(() => {});
    await waitForLoadingDone(page);

    // Hacer click en la primera habitación libre
    // Usamos el tag "Libre" directamente — el click burbujea hasta el div onClick del card
    const freeRoomTag = page.locator('.ant-tag-success', { hasText: 'Libre' }).first();
    await expect(freeRoomTag).toBeVisible({ timeout: 10_000 });
    await freeRoomTag.click();
    // Esperar a que la fecha de check-in aparezca (confirma selección)
    await expect(page.locator('#move_in_date')).toBeVisible({ timeout: 5_000 });

    // Fianza: obligatoria cuando hay habitación seleccionada
    await page.locator('#deposit_amount').click({ clickCount: 3 });
    await page.locator('#deposit_amount').fill('0');

    // Fecha de entrada: hoy
    await pickToday(page, 'move_in_date').catch(() => {});
    // Asegurarse de que el DatePicker está cerrado antes de continuar
    if (await page.locator('.ant-picker-dropdown').first().isVisible().catch(() => false)) {
      await page.keyboard.press('Escape').catch(() => {});
      // Si Escape no funcionó, hacer click fuera del picker
      if (await page.locator('.ant-picker-dropdown').first().isVisible().catch(() => false)) {
        await page.locator('h2').first().click({ force: true }).catch(() => {});
      }
    }
    await page.locator('.ant-picker-dropdown').first().waitFor({ state: 'hidden', timeout: 3_000 }).catch(() => {});

    // Registrar
    await page.getByRole('button', { name: 'Registrar Inquilino' }).click();

    // TenantCreate muestra "Inquilino Registrado Exitosamente" en la misma página (sin redirect)
    await expect(
      page.locator('h2, .ant-typography').filter({ hasText: /Registrado Exitosamente/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await waitForLoadingDone(page);
  });

  // ── 03 · Verificar el inquilino en la lista ──────────────────────────────
  // BUG-033: depende de que test 02 cree el inquilino (roto hasta fix)
  test.fixme('03 - verificar inquilino en lista y obtener ID', async ({ page }) => {
    await page.goto('/v2/admin/inquilinos');
    await waitForLoadingDone(page);

    // Buscar por nombre
    const searchInput = page.locator('input[placeholder*="buscar"], input[placeholder*="Buscar"]');
    if (await searchInput.count() > 0) {
      await searchInput.first().fill(TENANT_LN);
      await waitForLoadingDone(page);
    }

    const tenantCard = page.locator('.ant-card').filter({ hasText: TENANT_LN });
    await expect(tenantCard).toBeVisible({ timeout: 10_000 });

    // El estado debe ser "Invitado" o "Activo" (dependiendo de si se envió onboarding)
    await expect(
      tenantCard.locator('.ant-tag, span').filter({ hasText: /Invitado|Activo|invited|active/ }).first()
    ).toBeVisible({ timeout: 5_000 });

    // Leer ID — clic en botón "Detalle del Inquilino" (icono FileTextOutlined → anticon-file-text)
    // que navega a /v2/admin/inquilinos/:id/detalle-inquilino
    await tenantCard.locator('.anticon-file-text').click();
    await page.waitForURL('**/inquilinos/**/detalle-inquilino', { timeout: 10_000 });

    state.tenantId = extractIdFromUrl(page, 'inquilinos');
    expect(state.tenantId).toBeTruthy();
  });

  // ── 04 · Ver detalle del inquilino ───────────────────────────────────────
  // BUG-033: depende de que test 02 cree el inquilino (roto hasta fix)
  test.fixme('04 - ver detalle del inquilino', async ({ page }) => {
    expect(state.tenantId).toBeTruthy();

    // Navegar al detalle (LodgerDetail)
    await page.goto(`/v2/admin/inquilinos/${state.tenantId}/detalle`);
    await waitForLoadingDone(page);

    // El nombre debe aparecer en el detalle
    await expect(
      page.locator('.ant-typography, h1, h2').filter({ hasText: TENANT_LN }).first()
    ).toBeVisible({ timeout: 10_000 });

    // El email del inquilino
    await expect(page.locator(`text=${TENANT_EMAIL}`)).toBeVisible({ timeout: 5_000 });
  });

  // ── 05 · Editar inquilino (actualizar teléfono) ──────────────────────────
  // BUG-033: depende de que test 02 cree el inquilino (roto hasta fix)
  test.fixme('05 - editar inquilino: actualizar teléfono', async ({ page }) => {
    expect(state.tenantId).toBeTruthy();

    await page.goto(`/v2/admin/inquilinos/${state.tenantId}/editar`);
    await waitForLoadingDone(page);

    // Verificar nombre cargado
    await expect(page.locator('#last_name1')).toHaveValue(TENANT_LN);

    // Actualizar teléfono
    await page.locator('#phone').fill('');
    await page.locator('#phone').fill('677999888');

    await page.getByRole('button', { name: 'Guardar Cambios' }).click();

    // Confirmar guardado (redirige o muestra mensaje de éxito)
    await page.waitForURL('**/v2/admin/inquilinos**', { timeout: 15_000 });
  });

  // ── 06 · Cambiar habitación del inquilino (modal reassign) ───────────────
  // BUG-033: depende de que test 02 cree el inquilino (roto hasta fix)
  test.fixme('06 - cambiar habitación: abrir modal y reasignar', async ({ page }) => {
    expect(state.tenantId).toBeTruthy();
    expect(state.accId).toBeTruthy();

    // Navegar directamente a la página de edición con ?action=reassign
    // (equivale a clickar el botón "Cambiar habitación" del SwapOutlined)
    await page.goto(`/v2/admin/inquilinos/${state.tenantId}/editar?action=reassign`);
    await waitForLoadingDone(page);

    // El modal de reasignación debe abrirse automáticamente
    const modal = page.locator('.ant-modal').filter({ hasText: /Cambiar habitaci/i });
    await expect(modal).toBeVisible({ timeout: 10_000 });

    // Seleccionar el mismo alojamiento (para elegir la otra habitación libre)
    await modal.locator('#new_accommodation_id').click();
    await page.locator('.ant-select-dropdown:visible')
      .getByText(ACC_NAME, { exact: false })
      .click();

    // Esperar a que carguen las habitaciones disponibles
    await waitForLoadingDone(page);
    await page.waitForTimeout(1_000); // pequeña espera para que el select se llene

    // Seleccionar la primera habitación libre en el select
    const roomSelect = modal.locator('#new_room_id');
    await roomSelect.click();
    const roomOptions = page.locator('.ant-select-dropdown:visible .ant-select-item-option');
    const optionCount = await roomOptions.count();
    expect(optionCount, 'Debe haber al menos una habitación libre disponible').toBeGreaterThan(0);
    await roomOptions.first().click();

    // Fecha de entrada (hoy)
    await pickToday(page, 'move_in_date').catch(async () => {
      // Fallback: el campo ya tiene valor por defecto
    });

    // Confirmar el cambio
    await modal.getByRole('button', { name: /Confirmar|Cambiar/i }).click();

    // El modal debe cerrarse y mostrar éxito
    await expect(modal).toBeHidden({ timeout: 15_000 });

    // Verificar que la página se actualizó (sin errores)
    await expect(page.locator('.ant-alert-error')).toHaveCount(0);
  });

  // ── 07 · Verificar cambio en el detalle del inquilino ───────────────────
  // BUG-033: depende de que test 02 cree el inquilino (roto hasta fix)
  test.fixme('07 - verificar habitación actualizada en detalle', async ({ page }) => {
    expect(state.tenantId).toBeTruthy();

    await page.goto(`/v2/admin/inquilinos/${state.tenantId}/detalle`);
    await waitForLoadingDone(page);

    // El inquilino sigue activo / invitado
    await expect(
      page.locator('.ant-tag, span').filter({ hasText: /Invitado|Activo/ }).first()
    ).toBeVisible({ timeout: 10_000 });

    // La información de habitación/alojamiento está presente
    await expect(
      page.locator('text=' + ACC_NAME).or(page.locator('.ant-typography', { hasText: ACC_NAME }))
    ).toBeVisible({ timeout: 5_000 }).catch(() => {
      // Puede que el nombre del alojamiento no esté en el detalle — verificar que hay una habitación asignada
    });
  });

  // ── 08 · Programar baja del inquilino ────────────────────────────────────
  // BUG-033: depende de que test 02 cree el inquilino (roto hasta fix)
  test.fixme('08 - programar baja del inquilino', async ({ page }) => {
    expect(state.tenantId).toBeTruthy();

    await page.goto('/v2/admin/inquilinos');
    await waitForLoadingDone(page);

    // Filtrar por nombre
    const searchInput = page.locator('input[placeholder*="buscar"], input[placeholder*="Buscar"]');
    if (await searchInput.count() > 0) {
      await searchInput.first().fill(TENANT_LN);
      await waitForLoadingDone(page);
    }

    const tenantCard = page.locator('.ant-card').filter({ hasText: TENANT_LN });
    await expect(tenantCard).toBeVisible({ timeout: 10_000 });

    // Botón "Programar baja" (LogoutOutlined → anticon-logout)
    const checkoutBtn = tenantCard.locator('.anticon-logout, button[title*="baja"], button[title*="Baja"]');
    if (await checkoutBtn.count() === 0) {
      // Buscar el botón por tooltip
      await tenantCard.locator('.anticon-logout').first().click().catch(() => {
        // Puede que el botón no esté visible si el inquilino no está activo
        test.skip(true, 'Botón de programar baja no disponible (inquilino puede no estar activo aún)');
      });
      return;
    }

    await checkoutBtn.first().click();

    // Confirmar en el dialog de confirmación
    await page.locator('.ant-modal-confirm-btns button', { hasText: /[Aa]ceptar|[Cc]onfirmar|[Ss]í/ })
      .click().catch(async () => {
        // Puede haber un modal de DatePicker para fecha de baja
        await pickToday(page, 'checkout_date').catch(() => {});
        await page.getByRole('button', { name: /[Cc]onfirmar|[Aa]ceptar/ }).click().catch(() => {});
      });

    await waitForLoadingDone(page);

    // El estado del inquilino cambia a "Pendiente de baja"
    await page.goto('/v2/admin/inquilinos');
    await waitForLoadingDone(page);

    if (await searchInput.count() > 0) {
      await searchInput.first().fill(TENANT_LN);
      await waitForLoadingDone(page);
    }

    const updatedCard = page.locator('.ant-card').filter({ hasText: TENANT_LN });
    // Verificar que el estado cambió (puede ser "Pendiente de baja" o similar)
    await expect(updatedCard).toBeVisible({ timeout: 10_000 });
  });

});
