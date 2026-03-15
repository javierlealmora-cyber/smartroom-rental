import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup automático después de cada test
afterEach(() => {
  cleanup();
});

// Cargar variables de entorno reales para tests de integración
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Configurar variables de entorno para tests
// Usar SERVICE_ROLE_KEY para tests de integración (bypasea RLS)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://lqwyyyttjamirccdtlvl.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

vi.stubEnv('VITE_SUPABASE_URL', SUPABASE_URL);
vi.stubEnv('VITE_SUPABASE_ANON_KEY', SUPABASE_KEY);

// Mock de import.meta.env (Vite) - usar service role key en tests
global.import = {
  meta: {
    env: {
      DEV: true,
      VITE_SUPABASE_URL: SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: SUPABASE_KEY,
    },
  },
};

console.log('🧪 Tests configurados con Supabase (usando service role key para bypasear RLS)');

// Suprimir warnings de console en tests (opcional)
global.console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
};
