import {
  DraftPickPayload,
  OffseasonDecisionRecord,
  OffseasonDraftPickResult,
  OffseasonRunState,
  createEmptyDraftNightState,
} from '@nba-draft-sim/shared';
import {
  buildDraftPickExplanation,
  draftGradeFromScore,
  normalizeScore,
} from './grading';

function positionNeedsScore(position: string, needs: string[]): number {
  const upperPosition = position.toUpperCase();
  const needText = needs.join(' ').toLowerCase();
  let score = 0;

  if (upperPosition.includes('G') && needText.includes('backcourt')) {
    score += 12;
  }
  if (upperPosition.includes('F') && needText.includes('wing')) {
    score += 12;
  }
  if (
    upperPosition.includes('C') &&
    (needText.includes('rim') || needText.includes('frontcourt'))
  ) {
    score += 14;
  }

  return score;
}

function coachTendencyBoost(run: OffseasonRunState): number {
  const tendency = run.coaching_market.tendency_profile;
  if (!tendency) {
    return 0;
  }

  return (
    tendency.spacing_bias * 16 +
    tendency.rim_pressure_bias * 14 +
    tendency.development_bias * 10
  );
}

function findProspectOrThrow(
  run: OffseasonRunState,
  playerId: number
) {
  const prospect = run.scouting_pre_draft.prospects.find(
    (candidate) => candidate.player_id === playerId
  );
  if (!prospect) {
    throw new Error(`Prospect not found for player_id=${playerId}.`);
  }
  return prospect;
}

export function applyDraftPickToRun(
  run: OffseasonRunState,
  payload: DraftPickPayload,
  nowIso: string
): { run: OffseasonRunState; pick: OffseasonDraftPickResult } {
  const draftState = run.draft_night ?? createEmptyDraftNightState();
  const prospect = findProspectOrThrow(run, payload.player_id);

  const baseBoardScore = Math.max(25, 100 - (prospect.board_rank - 1) * 3);
  const needsScore = positionNeedsScore(prospect.position, run.team_context.needs);
  const tendencyBoost = coachTendencyBoost(run);
  const fitScore = normalizeScore(baseBoardScore + needsScore + tendencyBoost);
  const grade = draftGradeFromScore(fitScore);
  const explanation = buildDraftPickExplanation({
    playerName: prospect.full_name,
    boardRank: prospect.board_rank,
    needsMatch: needsScore,
    tendencyBoost,
  });

  const pickNumber = draftState.picks.length + 1;
  const pick: OffseasonDraftPickResult = {
    id: `${run.run_id}-pick-${Date.parse(nowIso)}`,
    pick_number: pickNumber,
    player_id: prospect.player_id,
    player_name: prospect.full_name,
    board_rank: prospect.board_rank,
    fit_score: fitScore,
    grade,
    explanation,
    created_at: nowIso,
  };

  const decision: OffseasonDecisionRecord = {
    id: `${run.run_id}-draft-log-${Date.parse(nowIso)}`,
    phase: 'draft_night',
    title: `Draft pick ${pickNumber}: ${pick.player_name}`,
    verdict: 'graded',
    summary: `${pick.player_name} graded ${pick.grade} with fit score ${pick.fit_score}.`,
    details: explanation,
    created_at: nowIso,
  };

  const updatedRun: OffseasonRunState = {
    ...run,
    updated_at: nowIso,
    draft_night: {
      ...draftState,
      stage: 'make_picks',
      picks: [...draftState.picks, pick],
    },
    decision_history: [...run.decision_history, decision],
  };

  return { run: updatedRun, pick };
}

