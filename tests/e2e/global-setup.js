// tests/e2e/global-setup.js
// Ejecutado una sola vez antes de todos los tests de regresión.
// Obtiene sesión via Supabase API directamente e inyecta en localStorage,
// evitando problemas de UI con caracteres especiales en el password.

import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';

export default async function globalSetup() {
  const email = process.env.TEST_MANAGER_EMAIL;
  const password = process.env.TEST_MANAGER_PASSWORD;
  const baseURL = process.env.BASE_URL || 'http://localhost:5173';
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!email || !password) {
    console.warn('[global-setup] TEST_MANAGER_EMAIL / TEST_MANAGER_PASSWORD not set — skipping auth setup');
    return;
  }

  mkdirSync('tests/e2e/.auth', { recursive: true });

  // 1. Obtener sesión directamente via Supabase Auth API
  console.log(`[global-setup] Authenticating ${email} via Supabase API...`);
  const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': supabaseKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const session = await authRes.json();

  if (!session.access_token) {
    throw new Error(`[global-setup] Supabase auth failed: ${JSON.stringify(session)}`);
  }
  console.log(`[global-setup] Auth OK — user: ${session.user?.email}, role: ${session.user?.role}`);

  // 2. Inyectar sesión en el browser via localStorage
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  // Navegar a la app para establecer el origen
  await page.goto('/v2/admin/auth/login');

  // Clave de localStorage que usa Supabase JS v2: sb-<ref>-auth-token
  const projectRef = supabaseUrl.match(/\/\/([^.]+)\.supabase/)?.[1] ?? 'supabase';
  const storageKey = `sb-${projectRef}-auth-token`;

  await page.evaluate(({ key, sess }) => {
    localStorage.setItem(key, JSON.stringify(sess));
  }, { key: storageKey, sess: session });

  // 3. Navegar al panel y esperar que la app cargue la sesión
  await page.goto('/v2/admin/dashboard');
  try {
    await page.waitForURL(
      (url) => !url.pathname.includes('/auth/login'),
      { timeout: 15_000 }
    );
    console.log(`[global-setup] Session loaded — current URL: ${page.url()}`);
  } catch {
    await page.screenshot({ path: 'tests/e2e/.auth/login-debug.png' });
    throw new Error(`[global-setup] App did not load session. URL: ${page.url()}`);
  }

  // 4. Guardar estado (cookies + localStorage)
  await context.storageState({ path: 'tests/e2e/.auth/manager.json' });
  console.log('[global-setup] Auth state saved to tests/e2e/.auth/manager.json');

  await browser.close();
}
