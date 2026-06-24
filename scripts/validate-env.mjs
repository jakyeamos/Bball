#!/usr/bin/env node
import fs from 'node:fs';

const requiredFiles = [
  ".env.example"
];
const missing = requiredFiles.filter((file) => !fs.existsSync(file));
if (missing.length) {
  console.error('Missing environment example files:');
  for (const file of missing) console.error('- ' + file);
  process.exit(1);
}
for (const file of requiredFiles) {
  const text = fs.readFileSync(file, 'utf8').trim();
  if (!text) {
    console.error('Environment example is empty: ' + file);
    process.exit(1);
  }
}
console.log('Environment examples present: ' + requiredFiles.join(', '));
