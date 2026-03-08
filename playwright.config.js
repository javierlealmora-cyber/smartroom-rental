import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load staging credentials from .env.e2e if present
dotenv.config({ path: resolve('./tests/e2e/.env.e2e'), override: false });

const isRemote = !!process.env.BASE_URL;
const hasCredentials = !!(process.env.TEST_MANAGER_EMAIL && process.env.TEST_MANAGER_PASSWORD);

export default defineConfig({
  testDir: './tests/e2e/specs',
  fullyParallel: false,            // serial: CRUD tests modify shared DB state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,                      // one worker to avoid race conditions on shared data
  reporter: [['html'], ['list']],
  timeout: 60_000,

  globalSetup: hasCredentials ? './tests/e2e/global-setup.js' : undefined,

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

    // ── Regression: autenticado, sólo chromium ───────────────────────────────
    {
      name: 'regression',
      testIgnore: /smoke\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/manager.json',
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
