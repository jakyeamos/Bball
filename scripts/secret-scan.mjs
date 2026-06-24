#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ignored = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', 'out']);
const allowedPlaceholderPatterns = [
  /sk_test_?x+/i,
  /your[-_a-z0-9]*key[-_a-z0-9]*/i,
  /MY_[A-Z0-9_]+/,
  /username:password/i,
  /your-project-ref/i,
  /clerk_user_id/i,
];
const secretPatterns = [
  { name: 'private key', pattern: /-----BEGIN (RSA |OPENSSH |EC |DSA |)?PRIVATE KEY-----/ },
  { name: 'github token', pattern: /gh[pousr]_[A-Za-z0-9_]{30,}/ },
  { name: 'live stripe key', pattern: /sk_live_[A-Za-z0-9]{20,}/ },
  { name: 'slack token', pattern: /xox[baprs]-[A-Za-z0-9-]{20,}/ },
  { name: 'aws access key', pattern: /AKIA[0-9A-Z]{16}/ },
  { name: 'supabase service role jwt', pattern: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/ },
];
const extensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json', '.md', '.yml', '.yaml', '.env', '.example', '.toml']);
const findings = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(fullPath); continue; }
    const ext = path.extname(entry.name);
    if (!extensions.has(ext) && !entry.name.includes('.env')) continue;
    const text = fs.readFileSync(fullPath, 'utf8');
    for (const { name, pattern } of secretPatterns) {
      if (!pattern.test(text)) continue;
      if (allowedPlaceholderPatterns.some((allowed) => allowed.test(text))) continue;
      findings.push(path.relative(root, fullPath) + ': ' + name);
    }
  }
}
walk(root);
if (findings.length) {
  console.error('Potential secrets found:');
  for (const finding of findings) console.error('- ' + finding);
  process.exit(1);
}
console.log('No high-confidence secrets found.');
