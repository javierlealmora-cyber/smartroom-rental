// tests/e2e/specs/entities.spec.js
// CRUD de Entidades Propietarias — @regression (staging)
//
// Pre-requisito: tests/e2e/.env.e2e con credenciales de manager
// Ejecutar con: npx playwright test entities.spec.js --project=regression

import { test, expect } from '@playwright/test';
import { antdSelect, extractIdFromUrl, waitForLoadingDone } from '../helpers/antd.js';

test.describe.configure({ mode: 'serial' });

const TS = Date.now();
const ENTITY_FIRSTNAME = 'E2E';
const ENTITY_LASTNAME  = `Entidad ${TS}`;
const ENTITY_EMAIL     = `e2e.entity.${TS}@test.smartrent.com`;
const ENTITY_PHONE     = '600123456';
const ENTITY_PHONE_UPD = '611987654';

// Estado compartido entre tests del bloque serial
const state = { entityId: null };

test.describe('Entidades CRUD @regression', () => {

  test.skip(!process.env.TEST_MANAGER_EMAIL,
    'Credenciales de staging no configuradas. Rellenar tests/e2e/.env.e2e');

  // ── 01 · La lista de entidades carga correctamente ───────────────────────
  test('01 - lista de entidades es accesible', async ({ page }) => {
    await page.goto('/v2/admin/entidades');
    await waitForLoadingDone(page);

    // La página tiene el título correcto
    await expect(page.locator('h1, .ant-typography').filter({ hasText: 'Entidades' }).first())
      .toBeVisible();

    // El botón "Nueva entidad" existe
    await expect(page.getByRole('button', { name: 'Nueva entidad' })).toBeVisible();
  });

  // ── 02 · Crear entidad (persona_fisica) ──────────────────────────────────
  test('02 - crear nueva entidad (persona física)', async ({ page }) => {
    await page.goto('/v2/admin/entidades/nueva');

    // Tipo legal → persona física
    await antdSelect(page, 'legal_type', 'Persona física');

    // Datos personales
    await page.locator('#first_name').fill(ENTITY_FIRSTNAME);
    await page.locator('#last_name1').fill(ENTITY_LASTNAME);
    await page.locator('#billing_email').fill(ENTITY_EMAIL);
    await page.locator('#phone').fill(ENTITY_PHONE);

    // Dirección (mínima)
    await page.locator('#city').fill('Madrid');
    await antdSelect(page, 'province', 'Madrid');

    // Enviar
    await page.getByRole('button', { name: 'Crear' }).click();

    // Redirige a la lista
    await page.waitForURL('**/v2/admin/entidades', { timeout: 15_000 });
    await waitForLoadingDone(page);

    // La entidad aparece en la lista
    await expect(
      page.locator('.ant-card').filter({ hasText: ENTITY_LASTNAME })
    ).toBeVisible({ timeout: 10_000 });
  });

  // ── 03 · Obtener el ID de la entidad creada ──────────────────────────────
  test('03 - navegar al detalle y obtener ID', async ({ page }) => {
    await page.goto('/v2/admin/entidades');
    await waitForLoadingDone(page);

    // Buscar la entidad por nombre usando el buscador
    await page.locator('input[placeholder*="Buscar"]').fill(ENTITY_LASTNAME);
    await waitForLoadingDone(page);

    // Hacer click en Editar para obtener el ID desde la URL
    const entityCard = page.locator('.ant-card').filter({ hasText: ENTITY_LASTNAME });
    await expect(entityCard).toBeVisible({ timeout: 10_000 });
    await entityCard.getByRole('button', { name: 'Editar' }).click();

    await page.waitForURL('**/entidades/**/editar', { timeout: 10_000 });
    state.entityId = extractIdFromUrl(page, 'entidades');
    expect(state.entityId).toBeTruthy();

    // Verificar que estamos en la página de edición correcta
    await expect(page.locator('h2, .ant-typography').filter({ hasText: /Editar entidad/i }).first())
      .toBeVisible({ timeout: 5_000 });
  });

  // ── 04 · Editar la entidad (actualizar teléfono) ─────────────────────────
  test('04 - editar entidad: actualizar teléfono', async ({ page }) => {
    expect(state.entityId, 'entityId debe estar disponible del test anterior').toBeTruthy();

    await page.goto(`/v2/admin/entidades/${state.entityId}/editar`);
    await waitForLoadingDone(page);

    // Verificar que los datos se cargaron (nombre pre-relleno)
    await expect(page.locator('#last_name1')).toHaveValue(ENTITY_LASTNAME);

    // Actualizar teléfono
    await page.locator('#phone').fill('');
    await page.locator('#phone').fill(ENTITY_PHONE_UPD);

    await page.getByRole('button', { name: 'Guardar' }).click();

    // Debe redirigir o mostrar confirmación
    // (según EntityEdit, redirige a /v2/admin/entidades o muestra success)
    await page.waitForURL('**/v2/admin/entidades**', { timeout: 15_000 });

    // Verificar que el cambio persistió volviendo a editar
    await page.goto(`/v2/admin/entidades/${state.entityId}/editar`);
    await waitForLoadingDone(page);
    await expect(page.locator('#phone')).toHaveValue(ENTITY_PHONE_UPD);
  });

  // ── 05 · Ver detalle de la entidad ───────────────────────────────────────
  test('05 - ver detalle de la entidad', async ({ page }) => {
    expect(state.entityId).toBeTruthy();

    await page.goto(`/v2/admin/entidades/${state.entityId}`);
    await waitForLoadingDone(page);

    // La página de detalle muestra el nombre
    await expect(
      page.locator('.ant-typography, h1, h2').filter({ hasText: ENTITY_LASTNAME }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  // ── 06 · Verificar KPIs en la lista ─────────────────────────────────────
  test('06 - KPIs de entidad visibles en la lista', async ({ page }) => {
    await page.goto('/v2/admin/entidades');
    await page.locator('input[placeholder*="Buscar"]').fill(ENTITY_LASTNAME);
    await waitForLoadingDone(page);

    const entityCard = page.locator('.ant-card').filter({ hasText: ENTITY_LASTNAME });
    await expect(entityCard).toBeVisible();

    // Los KPI boxes (Aloj., Hab. Tot., Ocup., Libres) deben estar presentes
    await expect(entityCard.locator('div', { hasText: 'Aloj.' }).first()).toBeVisible();
    await expect(entityCard.locator('div', { hasText: 'Libres' }).first()).toBeVisible();
  });

});
