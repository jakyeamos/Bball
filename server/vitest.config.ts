import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  resolve: {
    alias: {
      '@nba-draft-sim/shared': resolve(__dirname, '../shared/index.ts'),
    },
  },
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    environment: 'node',
  },
});
