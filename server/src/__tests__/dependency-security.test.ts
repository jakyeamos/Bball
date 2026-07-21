import { describe, expect, it, vi } from 'vitest';
import {
  classifyAuditReport,
  main,
  parseAuditOutput,
  runDependencyAudit,
} from '../../../scripts/dependency-security.mjs';

const emptyCounts = {
  critical: 0,
  high: 0,
  moderate: 0,
  low: 0,
  info: 0,
};

describe('dependency security gate', () => {
  it('passes when audit findings remain below the blocking severity', () => {
    const outcome = classifyAuditReport({
      metadata: { vulnerabilities: { ...emptyCounts, moderate: 1 } },
    });

    expect(outcome.status).toBe('pass');
    expect(outcome.counts.moderate).toBe(1);
  });

  it('fails when an audit finding reaches the blocking severity', () => {
    const outcome = classifyAuditReport({
      metadata: { vulnerabilities: { ...emptyCounts, high: 1 } },
      advisories: {
        '1001': {
          severity: 'high',
          module_name: 'example-package',
          title: 'Example vulnerability',
        },
      },
    });

    expect(outcome.status).toBe('fail');
    expect(outcome.blockingCount).toBe(1);
    expect(outcome.advisories).toHaveLength(1);
  });

  it('skips malformed registry output when the registry is unreachable', () => {
    const outcome = parseAuditOutput('', 'fetch failed: getaddrinfo ENOTFOUND registry');

    expect(outcome).toEqual({
      status: 'skip',
      reason: 'registry unreachable (fetch failed: getaddrinfo ENOTFOUND registry)',
    });
  });

  it('skips malformed non-network output with a useful reason', () => {
    const outcome = parseAuditOutput('not json', '');

    expect(outcome).toEqual({
      status: 'skip',
      reason: 'could not parse `pnpm audit` output: not json',
    });
  });

  it('skips an audit response without vulnerability metadata', () => {
    const outcome = classifyAuditReport({ error: { message: 'no audit data' } });

    expect(outcome.status).toBe('skip');
    expect(outcome.reason).toContain('no audit data');
  });

  it('skips an audit response when the registry reports a network error', () => {
    const outcome = classifyAuditReport({ error: { message: 'fetch failed' } });

    expect(outcome).toEqual({ status: 'skip', reason: 'registry unreachable (fetch failed)' });
  });

  it('runs the audit command with a bounded timeout and classifies its JSON', () => {
    let command = '';
    let args: string[] = [];
    let options: { encoding: string; timeout: number } | undefined;

    const outcome = runDependencyAudit((receivedCommand, receivedArgs, receivedOptions) => {
      command = receivedCommand;
      args = receivedArgs;
      options = receivedOptions;
      return {
        stdout: JSON.stringify({ metadata: { vulnerabilities: emptyCounts } }),
        stderr: '',
      };
    });

    expect(outcome.status).toBe('pass');
    expect(command).toBe('pnpm');
    expect(args).toEqual(['audit', '--json']);
    expect(options).toEqual({ encoding: 'utf8', timeout: 30_000 });
  });

  it('prints a non-blocking skip when the audit command cannot start', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    main(() => ({ error: new Error('pnpm unavailable') }));

    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0]?.[0]).toContain('pnpm unavailable');
    expect(process.exitCode).toBe(0);
    warn.mockRestore();
  });

  it('prints blocking advisory details and sets a failing exit code', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    main(() => ({
      stdout: JSON.stringify({
        metadata: { vulnerabilities: { ...emptyCounts, high: 1 } },
        advisories: {
          '1001': {
            severity: 'high',
            module_name: 'example-package',
            title: 'Example vulnerability',
          },
        },
      }),
      stderr: '',
    }));

    expect(error).toHaveBeenCalled();
    expect(error.mock.calls.flat().join('\n')).toContain('example-package');
    expect(process.exitCode).toBe(1);
    error.mockRestore();
    process.exitCode = 0;
  });

  it('prints the severity summary when the audit passes', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    main(() => ({
      stdout: JSON.stringify({ metadata: { vulnerabilities: { ...emptyCounts, moderate: 1 } } }),
      stderr: '',
    }));

    expect(log).toHaveBeenCalledWith(expect.stringContaining('PASS'));
    expect(process.exitCode).toBe(0);
    log.mockRestore();
  });
});
