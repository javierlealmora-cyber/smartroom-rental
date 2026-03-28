// qa/e2e/specs/auth.spec.js
// Tests E2E de autenticación (AUTH-01..06)
// Requiere credenciales en qa/e2e/.env.e2e

import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const SKIP_MSG = 'Credenciales no configuradas. Rellenar qa/e2e/.env.e2e';

// ── AUTH-04 / AUTH-05 — Guards sin sesión (no requieren credenciales) ─────────

test.describe('Guards — sin sesión (AUTH-04, AUTH-05)', () => {
  test('ruta protegida admin sin sesión → redirige a login admin', async ({ page }) => {
    await page.goto('/v2/admin/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 8_000 });
  });

  test('ruta protegida lodger sin sesión → redirige a login lodger', async ({ page }) => {
    await page.goto('/v2/lodger/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 8_000 });
  });
});

// ── AUTH-01 — Login válido por rol ────────────────────────────────────────────

test.describe('Login válido (AUTH-01) @regression', () => {
  test.skip(!process.env.TEST_MANAGER_EMAIL, SKIP_MSG);

  test('login manager → redirect a /v2/admin/dashboard', async ({ page }) => {
    await page.goto('/v2/admin/auth/login');
    await page.locator('input[type="email"]').fill(process.env.TEST_MANAGER_EMAIL);
    await page.locator('input[type="password"]').fill(process.env.TEST_MANAGER_PASSWORD);
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    await expect(page).toHaveURL(/\/v2\/admin\/dashboard/, { timeout: 15_000 });
  });
});

// ── AUTH-02 — Login inválido → mensaje de error ───────────────────────────────

test.describe('Login inválido (AUTH-02)', () => {
  test('credenciales incorrectas → muestra error', async ({ page }) => {
    await page.goto('/v2/admin/auth/login');
    await page.locator('input[type="email"]').fill('noexiste@test.com');
    await page.locator('input[type="password"]').fill('contraseña_incorrecta');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    // Esperar mensaje de error (background rojo = color dc2626)
    const errorEl = page.locator('[style*="dc2626"], [style*="DC2626"]').first();
    await expect(errorEl).toBeVisible({ timeout: 10_000 });
  });

  test('email vacío → botón submit disabled', async ({ page }) => {
    await page.goto('/v2/admin/auth/login');
    await page.locator('input[type="password"]').fill('algo');
    const submitBtn = page.getByRole('button', { name: /iniciar sesión/i });
    await expect(submitBtn).toBeDisabled();
  });

  test('password vacío → botón submit disabled', async ({ page }) => {
    await page.goto('/v2/admin/auth/login');
    await page.locator('input[type="email"]').fill('algo@test.com');
    const submitBtn = page.getByRole('button', { name: /iniciar sesión/i });
    await expect(submitBtn).toBeDisabled();
  });
});

// ── AUTH-03 — Portal cruzado → "Acceso no permitido" ─────────────────────────

test.describe('Portal cruzado (AUTH-03) @regression', () => {
  test.skip(!process.env.TEST_LODGER_EMAIL, SKIP_MSG);

  test('inquilino intenta login en portal manager → "Acceso no permitido"', async ({ page }) => {
    await page.goto('/v2/admin/auth/login');
    await page.locator('input[type="email"]').fill(process.env.TEST_LODGER_EMAIL);
    await page.locator('input[type="password"]').fill(process.env.TEST_LODGER_PASSWORD);
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    await expect(page.getByRole('heading', { name: /acceso no permitido/i }))
      .toBeVisible({ timeout: 10_000 });
  });
});

// ── AUTH-06 — Logout → portal correcto ───────────────────────────────────────

test.describe('Logout (AUTH-06) @regression', () => {
  test.skip(!process.env.TEST_MANAGER_EMAIL, SKIP_MSG);

  test('logout desde portal manager → redirige a login manager', async ({ page }) => {
    // Login
    await page.goto('/v2/admin/auth/login');
    await page.locator('input[type="email"]').fill(process.env.TEST_MANAGER_EMAIL);
    await page.locator('input[type="password"]').fill(process.env.TEST_MANAGER_PASSWORD);
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await expect(page).toHaveURL(/\/v2\/admin\/dashboard/, { timeout: 15_000 });

    // Logout
    const logoutBtn = page.getByRole('button', { name: /cerrar sesión|logout/i });
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
    } else {
      // Buscar en menú de usuario
      await page.getByRole('button', { name: /usuario|perfil|cuenta/i }).first().click();
      await page.getByText(/cerrar sesión/i).click();
    }

    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10_000 });
    // Verificar que redirige al portal manager, no al comercial
    await expect(page).toHaveURL(/admin/, { timeout: 5_000 });
  });
});
