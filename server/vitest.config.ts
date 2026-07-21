import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  root: resolve(__dirname, '..'),
  resolve: {
    alias: {
      '@nba-draft-sim/shared': resolve(__dirname, '../shared/index.ts'),
    },
  },
  test: {
    include: ['server/src/**/__tests__/**/*.test.ts', 'server/src/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: resolve(__dirname, '../coverage'),
      include: ['scripts/dependency-security.mjs'],
      exclude: ['**/*.test.ts', '**/__tests__/**', '**/node_modules/**'],
    },
  },
});
