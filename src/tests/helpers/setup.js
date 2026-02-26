import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup automático después de cada test
afterEach(() => {
  cleanup();
});

// Mock de variables de entorno para tests
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

// Mock de import.meta.env (Vite)
global.import = {
  meta: {
    env: {
      DEV: true,
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
};

// Suprimir warnings de console en tests (opcional)
global.console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
};
