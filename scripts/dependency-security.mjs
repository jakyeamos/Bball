#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Advisories at or above this severity block the commit.
export const MINIMUM_BLOCKING_SEVERITY = 'high';
const AUDIT_TIMEOUT_MS = 30_000;

const SEVERITY_ORDER = ['critical', 'high', 'moderate', 'low', 'info'];
const threshold = SEVERITY_ORDER.indexOf(MINIMUM_BLOCKING_SEVERITY);
const BLOCKING_SEVERITIES = SEVERITY_ORDER.filter((_, index) => index <= threshold);
const INFO_SEVERITIES = SEVERITY_ORDER.filter((_, index) => index > threshold);
const NETWORK_ERROR_PATTERNS = [
  /fetch failed/i,
  /ENOTFOUND/,
  /ECONNREFUSED/,
  /ETIMEDOUT/,
  /EAI_AGAIN/,
  /getaddrinfo/i,
  /network/i,
  /socket hang up/i,
  /request to .* failed/i,
];

export function parseAuditOutput(stdout, stderr) {
  try {
    return { status: 'report', report: JSON.parse(stdout.trim()) };
  } catch {
    const combined = (stderr || stdout || '').trim();
    if (NETWORK_ERROR_PATTERNS.some((pattern) => pattern.test(combined))) {
      return {
        status: 'skip',
        reason: 'registry unreachable (' + (combined.split('\n')[0] || 'network error') + ')',
      };
    }
    return {
      status: 'skip',
      reason: 'could not parse `pnpm audit` output' + (combined ? ': ' + combined.split('\n')[0] : ''),
    };
  }
}

export function classifyAuditReport(report) {
  if (report?.error || !report?.metadata?.vulnerabilities) {
    const message = String(report?.error?.message ?? '').trim();
    if (message && NETWORK_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
      return { status: 'skip', reason: 'registry unreachable (' + message + ')' };
    }
    return {
      status: 'skip',
      reason: '`pnpm audit` returned no vulnerability data' + (message ? ': ' + message : ''),
    };
  }

  const counts = report.metadata.vulnerabilities ?? {};
  const blockingCount = BLOCKING_SEVERITIES.reduce((sum, sev) => sum + (counts[sev] ?? 0), 0);

  if (blockingCount > 0) {
    const advisories = Object.values(report?.advisories ?? {}).filter((advisory) =>
      BLOCKING_SEVERITIES.includes(advisory?.severity)
    );
    return { status: 'fail', blockingCount, counts, advisories };
  }

  return { status: 'pass', counts };
}

export function runDependencyAudit(spawn = spawnSync) {
  const result = spawn('pnpm', ['audit', '--json'], {
    encoding: 'utf8',
    timeout: AUDIT_TIMEOUT_MS,
  });
  if (result.error) {
    return { status: 'skip', reason: 'could not run `pnpm audit` (' + result.error.message + ')' };
  }

  const parsed = parseAuditOutput(result.stdout ?? '', result.stderr ?? '');
  return parsed.status === 'skip' ? parsed : classifyAuditReport(parsed.report);
}

function writeOutcome(outcome) {
  if (outcome.status === 'skip') {
    console.warn('[dependency:security] SKIPPED — ' + outcome.reason);
    console.warn(
      '[dependency:security] Registry audit is advisory-only and requires network; not blocking the commit.'
    );
    return;
  }

  if (outcome.status === 'fail') {
    console.error(
      '[dependency:security] FAIL — ' +
        outcome.blockingCount +
        ' advisory(ies) at or above ' +
        MINIMUM_BLOCKING_SEVERITY +
        ':'
    );
    for (const sev of BLOCKING_SEVERITIES) {
      if (outcome.counts[sev]) console.error('  - ' + sev + ': ' + outcome.counts[sev]);
    }
    for (const advisory of outcome.advisories) {
      console.error(
        '  * [' +
          advisory.severity +
          '] ' +
          (advisory.module_name ?? '?') +
          ': ' +
          (advisory.title ?? '')
      );
    }
    console.error('[dependency:security] Run `pnpm audit` for details.');
    return;
  }

  const blockingSummary = BLOCKING_SEVERITIES.map(
    (sev) => (outcome.counts[sev] ?? 0) + ' ' + sev
  ).join(', ');
  const infoSummary = INFO_SEVERITIES.map(
    (sev) => (outcome.counts[sev] ?? 0) + ' ' + sev
  ).join(', ');
  console.log(
    '[dependency:security] PASS — no advisories at or above ' +
      MINIMUM_BLOCKING_SEVERITY +
      ' (' +
      blockingSummary +
      '; ' +
      infoSummary +
      ').'
  );
}

export function main(spawn = spawnSync) {
  const outcome = runDependencyAudit(spawn);
  writeOutcome(outcome);
  process.exitCode = outcome.status === 'fail' ? 1 : 0;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  main();
}
