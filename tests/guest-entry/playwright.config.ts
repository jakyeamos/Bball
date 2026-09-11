import { defineConfig } from '@playwright/test';
import path from 'node:path';

export default defineConfig({
  testDir: '.',
  testMatch: 'guest-entry.spec.ts',
  timeout: 30_000,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:31236', headless: true },
  webServer: {
    command: 'pnpm --filter nba-draft-sim-client dev --host 127.0.0.1 --port 31236 --strictPort',
    cwd: path.resolve(__dirname, '../..'),
    url: 'http://127.0.0.1:31236',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
      VITE_API_URL: 'http://127.0.0.1:31237',
    },
  },
});
