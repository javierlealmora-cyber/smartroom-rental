// tests/e2e/global-setup.js
// Ejecutado una sola vez antes de todos los tests de regresión.
// Obtiene sesión via Supabase API directamente e inyecta en localStorage,
// evitando problemas de UI con caracteres especiales en el password.

import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';

// Autentica un usuario y guarda su storageState en el path indicado.
async function authenticateUser({ email, password, baseURL, supabaseUrl, supabaseKey, storagePath, debugName }) {
  console.log(`[global-setup] Authenticating ${debugName} (${email})...`);

  const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': supabaseKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const session = await authRes.json();

  if (!session.access_token) {
    throw new Error(`[global-setup] Auth failed for ${debugName}: ${JSON.stringify(session)}`);
  }
  console.log(`[global-setup] Auth OK — ${debugName}: ${session.user?.email}`);

  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  await page.goto('/v2/admin/auth/login');

  const projectRef = supabaseUrl.match(/\/\/([^.]+)\.supabase/)?.[1] ?? 'supabase';
  const storageKey = `sb-${projectRef}-auth-token`;

  await page.evaluate(({ key, sess }) => {
    localStorage.setItem(key, JSON.stringify(sess));
  }, { key: storageKey, sess: session });

  await page.goto('/v2/admin/dashboard');
  try {
    await page.waitForURL(
      (url) => !url.pathname.includes('/auth/login'),
      { timeout: 15_000 }
    );
    console.log(`[global-setup] Session loaded for ${debugName} — URL: ${page.url()}`);
  } catch {
    await page.screenshot({ path: `tests/e2e/.auth/${debugName}-debug.png` });
    throw new Error(`[global-setup] App did not load session for ${debugName}. URL: ${page.url()}`);
  }

  await context.storageState({ path: storagePath });
  console.log(`[global-setup] Auth state saved to ${storagePath}`);
  await browser.close();
}

export default async function globalSetup() {
  const baseURL     = process.env.BASE_URL || 'http://localhost:5173';
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  mkdirSync('tests/e2e/.auth', { recursive: true });

  // ── Gestor principal ──────────────────────────────────────────────────────
  if (process.env.TEST_MANAGER_EMAIL && process.env.TEST_MANAGER_PASSWORD) {
    await authenticateUser({
      email:       process.env.TEST_MANAGER_EMAIL,
      password:    process.env.TEST_MANAGER_PASSWORD,
      baseURL, supabaseUrl, supabaseKey,
      storagePath: 'tests/e2e/.auth/manager.json',
      debugName:   'manager',
    });
  } else {
    console.warn('[global-setup] TEST_MANAGER_EMAIL not set — skipping manager auth');
  }

  // ── Gestor plan Basic ─────────────────────────────────────────────────────
  if (process.env.TEST_MANAGER_BASIC_EMAIL && process.env.TEST_MANAGER_BASIC_PASSWORD) {
    await authenticateUser({
      email:       process.env.TEST_MANAGER_BASIC_EMAIL,
      password:    process.env.TEST_MANAGER_BASIC_PASSWORD,
      baseURL, supabaseUrl, supabaseKey,
      storagePath: 'tests/e2e/.auth/manager-basic.json',
      debugName:   'manager-basic',
    });
  } else {
    console.warn('[global-setup] TEST_MANAGER_BASIC_EMAIL not set — skipping basic auth');
  }

  // ── Gestor plan Investor ──────────────────────────────────────────────────
  if (process.env.TEST_MANAGER_INVESTOR_EMAIL && process.env.TEST_MANAGER_INVESTOR_PASSWORD) {
    await authenticateUser({
      email:       process.env.TEST_MANAGER_INVESTOR_EMAIL,
      password:    process.env.TEST_MANAGER_INVESTOR_PASSWORD,
      baseURL, supabaseUrl, supabaseKey,
      storagePath: 'tests/e2e/.auth/manager-investor.json',
      debugName:   'manager-investor',
    });
  }

  // ── Gestor plan Business ──────────────────────────────────────────────────
  if (process.env.TEST_MANAGER_BUSINESS_EMAIL && process.env.TEST_MANAGER_BUSINESS_PASSWORD) {
    await authenticateUser({
      email:       process.env.TEST_MANAGER_BUSINESS_EMAIL,
      password:    process.env.TEST_MANAGER_BUSINESS_PASSWORD,
      baseURL, supabaseUrl, supabaseKey,
      storagePath: 'tests/e2e/.auth/manager-business.json',
      debugName:   'manager-business',
    });
  }

  // ── Gestor plan Agency ────────────────────────────────────────────────────
  if (process.env.TEST_MANAGER_AGENCY_EMAIL && process.env.TEST_MANAGER_AGENCY_PASSWORD) {
    await authenticateUser({
      email:       process.env.TEST_MANAGER_AGENCY_EMAIL,
      password:    process.env.TEST_MANAGER_AGENCY_PASSWORD,
      baseURL, supabaseUrl, supabaseKey,
      storagePath: 'tests/e2e/.auth/manager-agency.json',
      debugName:   'manager-agency',
    });
  }
}
