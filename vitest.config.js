import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [
      './src/tests/helpers/setup.js',
      './qa/unit/helpers/setup.js',
    ],
    env: loadEnv(mode || 'development', process.cwd(), ''),
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/',
        'qa/',
        '**/*.config.js',
        'dist/',
        'scripts/',
      ],
    },
    include: [
      'src/**/*.{test,spec}.{js,jsx}',
      'qa/unit/**/*.{test,spec}.{js,jsx}',
    ],
    exclude: ['node_modules/', 'dist/', '.git/'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}));
