import {
  FrontOfficeValidationIssue,
  FrontOfficeValidationReport,
  FrontOfficeValidationStatus,
} from '@nba-draft-sim/shared';

export type CbaValidationIssueInput = Omit<
  FrontOfficeValidationIssue,
  'status'
>;

export function buildInvalidIssue(
  input: CbaValidationIssueInput
): FrontOfficeValidationIssue {
  return {
    ...input,
    status: 'invalid',
  };
}

export function validationStatusFromIssues(
  issues: FrontOfficeValidationIssue[]
): FrontOfficeValidationStatus {
  if (issues.some((issue) => issue.status === 'invalid')) {
    return 'invalid';
  }

  if (issues.some((issue) => issue.status === 'warning')) {
    return 'warning';
  }

  return 'valid';
}

export function buildValidationReport(
  issues: FrontOfficeValidationIssue[],
  checkedAt: string
): FrontOfficeValidationReport {
  return {
    status: validationStatusFromIssues(issues),
    issues,
    checked_at: checkedAt,
  };
}
