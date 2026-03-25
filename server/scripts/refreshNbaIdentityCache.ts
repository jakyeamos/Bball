/**
 * Operator entrypoint: regenerate NBA identity JSON artifacts from the seed script.
 * Idempotent — overwrites server/data/nba-seed.json and nba-seed.meta.json in place.
 * Does not call stats.nba.com on the HTTP request path.
 *
 * Usage (from repo root): `npm run refresh:nba-cache --workspace=server`
 */

import { spawn } from 'child_process';
import * as path from 'path';

function isDirectInvocation(): boolean {
  return process.argv.some((arg) => /refreshNbaIdentityCache\.(ts|js|cjs|mjs)$/.test(arg));
}

async function run(): Promise<void> {
  const serverDir = path.join(__dirname, '..');
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

  await new Promise<void>((resolve, reject) => {
    const child = spawn(npmCmd, ['run', 'seed:nba'], {
      cwd: serverDir,
      stdio: 'inherit',
      env: { ...process.env },
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`seed:nba exited with code ${code}`));
    });
  });

  console.log('[refresh:nba-cache] seed step finished — artifacts updated under server/data/');
}

if (isDirectInvocation()) {
  void run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
