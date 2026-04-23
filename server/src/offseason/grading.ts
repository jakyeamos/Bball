import { DraftGrade } from '@nba-draft-sim/shared';

export function normalizeScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value > 100) {
    return 100;
  }
  if (value < 0) {
    return 0;
  }
  return Math.round(value * 10) / 10;
}

export function draftGradeFromScore(score: number): DraftGrade {
  if (score >= 90) {
    return 'A';
  }
  if (score >= 78) {
    return 'B';
  }
  if (score >= 65) {
    return 'C';
  }
  if (score >= 50) {
    return 'D';
  }
  return 'F';
}

export function buildDraftPickExplanation(input: {
  playerName: string;
  boardRank: number;
  needsMatch: number;
  tendencyBoost: number;
}): string[] {
  const lines = [
    `${input.playerName} was graded against board rank, roster need alignment, and coaching profile fit.`,
    `Board context: rank ${input.boardRank} influenced expected value for this slot.`,
  ];

  if (input.needsMatch > 0) {
    lines.push('The pick improves at least one current roster need, which boosted the grade.');
  } else {
    lines.push('The pick does not directly resolve a listed roster need, which reduced the grade.');
  }

  if (input.tendencyBoost > 0) {
    lines.push('Coach tendencies increased downstream fit confidence for this selection.');
  } else if (input.tendencyBoost < 0) {
    lines.push('Coach tendencies lowered fit confidence for this selection.');
  } else {
    lines.push('Coach tendency impact on this pick was neutral.');
  }

  return lines;
}

export function buildFreeAgencyExplanation(input: {
  playerName: string;
  contractMillions: number;
  capSpaceAfter: number;
  needsMatch: number;
  decision: 'signed' | 'declined';
}): string[] {
  const decisionLine =
    input.decision === 'signed'
      ? `${input.playerName} was signed on a ${input.contractMillions.toFixed(
          1
        )}M offer.`
      : `${input.playerName} offer was declined at ${input.contractMillions.toFixed(
          1
        )}M.`;

  const fitLine =
    input.needsMatch > 0
      ? 'The target addresses one of the active roster needs.'
      : 'The target offers limited direct overlap with listed roster needs.';

  const capLine = `Projected cap space after decision: ${input.capSpaceAfter.toFixed(
    1
  )}M.`;

  return [decisionLine, fitLine, capLine];
}

