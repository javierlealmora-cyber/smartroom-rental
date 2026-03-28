// qa/e2e/specs/energy.spec.js
// Tests E2E de energía: subir factura + repartir (ENE-08, ENE-09)
// Requiere credenciales en qa/e2e/.env.e2e y un alojamiento de prueba con inquilinos.
//
// BUG CONOCIDO: ENE-10 (modo meter sin lecturas) → fallo silencioso sin test activo

import { test, expect } from '@playwright/test';
import { waitForLoadingDone } from '../helpers/antd.js';

test.describe.configure({ mode: 'serial' });

const SKIP_MSG = 'Credenciales no configuradas. Rellenar qa/e2e/.env.e2e';

// ── ENE-08 — Subir factura manual ─────────────────────────────────────────────

test.describe('Subir factura manual (ENE-08) @regression', () => {
  test.skip(!process.env.TEST_MANAGER_EMAIL, SKIP_MSG);
  test.skip(!process.env.TEST_ACC_ID, 'TEST_ACC_ID no configurado en .env.e2e');

  test('puede subir una nueva factura en un alojamiento', async ({ page }) => {
    const accId = process.env.TEST_ACC_ID;

    await page.goto(`/v2/admin/alojamientos/${accId}/facturas`);
    await waitForLoadingDone(page);

    // Botón nueva factura
    const newBtn = page.getByRole('button', { name: /nueva factura|añadir factura/i });
    await expect(newBtn).toBeVisible({ timeout: 8_000 });
    await newBtn.click();

    // Formulario de factura
    const form = page.locator('.ant-modal, form').filter({ has: page.locator('input') }).first();
    await expect(form).toBeVisible({ timeout: 5_000 });

    // Rellenar importe mínimo
    await page.locator('#amount_total, input[name="amount_total"]').first().fill('100');

    const ts = Date.now();
    const submitBtn = page.getByRole('button', { name: /guardar|crear|aceptar/i });
    await submitBtn.click();

    await waitForLoadingDone(page);

    // Verificar que aparece en la tabla
    await expect(page.getByText('100')).toBeVisible({ timeout: 10_000 });
  });
});

// ── ENE-09 — Botón Repartir genera settlements + bulletins ────────────────────

test.describe('Repartir factura (ENE-09) @regression', () => {
  test.skip(!process.env.TEST_MANAGER_EMAIL, SKIP_MSG);
  test.skip(!process.env.TEST_ACC_ID, 'TEST_ACC_ID no configurado en .env.e2e');
  test.skip(!process.env.TEST_BILL_ID, 'TEST_BILL_ID (factura en estado pending) no configurado');

  test('factura pendiente tiene botón Repartir visible', async ({ page }) => {
    const accId = process.env.TEST_ACC_ID;
    await page.goto(`/v2/admin/alojamientos/${accId}/facturas`);
    await waitForLoadingDone(page);

    const repartirBtn = page.getByRole('button', { name: /repartir/i }).first();
    await expect(repartirBtn).toBeVisible({ timeout: 8_000 });
  });

  test('click Repartir → confirmar → factura pasa a Liquidada', async ({ page }) => {
    const accId = process.env.TEST_ACC_ID;
    await page.goto(`/v2/admin/alojamientos/${accId}/facturas`);
    await waitForLoadingDone(page);

    const repartirBtn = page.getByRole('button', { name: /repartir/i }).first();
    await repartirBtn.click();

    // Popconfirm
    const confirmBtn = page.getByRole('button', { name: /sí|confirmar|aceptar/i });
    await expect(confirmBtn).toBeVisible({ timeout: 5_000 });
    await confirmBtn.click();

    await waitForLoadingDone(page, 20_000);

    // La factura debe mostrar badge "Liquidada"
    await expect(page.getByText(/liquidada/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('factura liquidada NO muestra botón Repartir', async ({ page }) => {
    const accId = process.env.TEST_ACC_ID;
    await page.goto(`/v2/admin/alojamientos/${accId}/facturas`);
    await waitForLoadingDone(page);

    // Buscar la fila con "Liquidada" y verificar que no tiene botón Repartir
    const settledRow = page.locator('tr').filter({ hasText: /liquidada/i }).first();
    const repartirInRow = settledRow.getByRole('button', { name: /repartir/i });
    await expect(repartirInRow).not.toBeVisible();
  });
});

// ── ENE-10 — Modo meter sin lecturas (fallo silencioso) ──────────────────────

test.describe('Modo meter sin lecturas (ENE-10)', () => {
  test.fixme('meter sin lecturas → error claro o fallback a prorated con aviso', async () => {
    // GAP-2 identificado en Plan: La Edge Function devuelve variableShare=0 para todos
    // sin mensaje de error visible al usuario.
    // Ver: supabase/functions/settle_energy_bill/index.ts línea ~130 (kwhTotal = 0)
    // Pendiente: implementar GAP-2 → detectar kwhTotal=0 y devolver error 400 claro.
  });
});
