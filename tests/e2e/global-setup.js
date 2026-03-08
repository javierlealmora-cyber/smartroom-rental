// tests/e2e/global-setup.js
// Ejecutado una sola vez antes de todos los tests de regresión.
// Hace login como manager y guarda el estado de sesión en .auth/manager.json

import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';

export default async function globalSetup() {
  const email = process.env.TEST_MANAGER_EMAIL;
  const password = process.env.TEST_MANAGER_PASSWORD;
  const baseURL = process.env.BASE_URL || 'http://localhost:5173';

  if (!email || !password) {
    console.warn('[global-setup] TEST_MANAGER_EMAIL / TEST_MANAGER_PASSWORD not set — skipping auth setup');
    return;
  }

  mkdirSync('tests/e2e/.auth', { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });

  console.log(`[global-setup] Logging in as ${email} at ${baseURL}/v2/admin/auth/login ...`);

  await page.goto('/v2/admin/auth/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  console.log('[global-setup] Submitted form, waiting for redirect...');

  // Esperar redirect post-login: superadmin → /v2/superadmin, admin → /v2/admin/dashboard
  // Excluir la propia URL de login para no resolver prematuramente
  try {
    await page.waitForURL(
      /\/(v2\/superadmin|v2\/admin\/dashboard|v2\/admin$|v2\/planes)/,
      { timeout: 20_000 }
    );
  } catch {
    const currentUrl = page.url();
    console.error(`[global-setup] waitForURL timed out. Current URL: ${currentUrl}`);
    await page.screenshot({ path: 'tests/e2e/.auth/login-debug.png' });
    throw new Error(`Login failed or did not redirect. Current URL: ${currentUrl}`);
  }

  console.log(`[global-setup] Redirected to: ${page.url()}`);

  // Guardar sesión (cookies + localStorage)
  await page.context().storageState({ path: 'tests/e2e/.auth/manager.json' });

  console.log('[global-setup] Auth state saved to tests/e2e/.auth/manager.json');
  await browser.close();
}
