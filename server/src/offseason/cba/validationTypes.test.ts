import { describe, expect, it } from 'vitest';
import {
  buildInvalidIssue,
  buildValidationReport,
  validationStatusFromIssues,
} from './validationTypes';

describe('CBA validation result helpers', () => {
  it('returns valid when no issues exist', () => {
    expect(validationStatusFromIssues([])).toBe('valid');
    expect(buildValidationReport([], '2026-05-14T00:00:00.000Z')).toEqual({
      status: 'valid',
      issues: [],
      checked_at: '2026-05-14T00:00:00.000Z',
    });
  });

  it('returns invalid when an invalid issue exists', () => {
    const issue = buildInvalidIssue({
      id: 'missing-team',
      message: 'Team is missing.',
      rule_ids: ['league-dataset-completeness'],
      team_id: 1,
    });

    expect(validationStatusFromIssues([issue])).toBe('invalid');
    expect(issue.status).toBe('invalid');
    expect(issue.team_id).toBe(1);
  });
});
