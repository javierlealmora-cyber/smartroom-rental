import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load staging credentials from .env.e2e if present
dotenv.config({ path: resolve('./qa/e2e/.env.e2e'), override: false });

const isRemote = !!process.env.BASE_URL;
const hasCredentials = !!(
  (process.env.TEST_MANAGER_EMAIL      && process.env.TEST_MANAGER_PASSWORD) ||
  (process.env.TEST_MANAGER_BASIC_EMAIL && process.env.TEST_MANAGER_BASIC_PASSWORD) ||
  (process.env.TEST_MANAGER_INVESTOR_EMAIL && process.env.TEST_MANAGER_INVESTOR_PASSWORD) ||
  (process.env.TEST_MANAGER_BUSINESS_EMAIL && process.env.TEST_MANAGER_BUSINESS_PASSWORD) ||
  (process.env.TEST_MANAGER_AGENCY_EMAIL && process.env.TEST_MANAGER_AGENCY_PASSWORD)
);

export default defineConfig({
  testDir: './qa/e2e/specs',
  fullyParallel: false,            // serial: CRUD tests modify shared DB state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,                      // one worker to avoid race conditions on shared data
  outputDir: 'qa/reports/test-results',
  reporter: [['html', { outputFolder: 'qa/reports/playwright-report' }], ['list']],
  timeout: 60_000,

  globalSetup: hasCredentials ? './qa/e2e/global-setup.js' : undefined,

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    // ── Smoke: sin autenticación, multi-browser ──────────────────────────────
    {
      name: 'chromium',
      testMatch: /smoke\.spec\.js/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testMatch: /smoke\.spec\.js/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testMatch: /smoke\.spec\.js/,
      use: { ...devices['Desktop Safari'] },
    },

    // ── Regression: gestor principal, todos los specs excepto smoke y plan-específicos ──
    {
      name: 'regression',
      testIgnore: [/smoke\.spec\.js/, /admin-basic\.spec\.js/, /admin-investor\.spec\.js/, /admin-business\.spec\.js/, /admin-agency\.spec\.js/],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'qa/e2e/.auth/manager.json',
      },
    },

    // ── Regression Basic: gestor con plan Basic ───────────────────────────────
    {
      name: 'regression-basic',
      testMatch: /admin-basic\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'qa/e2e/.auth/manager-basic.json',
      },
    },

    // ── Regression Investor: gestor con plan Investor ─────────────────────────
    {
      name: 'regression-investor',
      testMatch: /admin-investor\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'qa/e2e/.auth/manager-investor.json',
      },
    },

    // ── Regression Business: gestor con plan Business ─────────────────────────
    {
      name: 'regression-business',
      testMatch: /admin-business\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'qa/e2e/.auth/manager-business.json',
      },
    },
  ],

  webServer: isRemote ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
