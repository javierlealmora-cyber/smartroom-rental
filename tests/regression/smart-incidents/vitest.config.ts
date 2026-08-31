import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'tests/regression/smart-incidents/suites/**/*.spec.ts',
    ],
    exclude: ['node_modules/', 'dist/'],
    reporters: ['verbose'],
    testTimeout: 10_000,
  },
});
