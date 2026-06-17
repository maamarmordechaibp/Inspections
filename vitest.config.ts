import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// Standalone test config (kept separate from vite.config.ts so the production
// build is untouched). Tests cover pure business logic — no DOM required.
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    globals: true,
  },
});
