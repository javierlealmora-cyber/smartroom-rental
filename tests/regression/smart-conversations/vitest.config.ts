import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // Redirige imports Deno a shims Node.js para tests runtime de EFs WebChat.
      // Los tests estáticos (readFileSync) nunca importan los módulos EF y no se ven afectados.
      'https://deno.land/std@0.168.0/http/server.ts':
        path.resolve(__dirname, '__mocks__/deno-http-server.ts'),
      'https://esm.sh/@supabase/supabase-js@2.39.0':
        path.resolve(__dirname, '__mocks__/supabase-client.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: [
      'tests/regression/smart-conversations/suites/**/*.spec.ts',
      'tests/regression/smart-conversations/suites/schema/*.spec.ts',
    ],
    exclude: ['node_modules/', 'dist/'],
    reporters: ['verbose'],
    testTimeout: 10_000,
  },
});
