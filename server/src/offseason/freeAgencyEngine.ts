import {
  FreeAgencyOfferPayload,
  OffseasonDecisionRecord,
  OffseasonFreeAgencySigning,
  OffseasonFreeAgencyTarget,
  OffseasonRunState,
  createEmptyFreeAgencyState,
} from '@nba-draft-sim/shared';
import { buildFreeAgencyExplanation, normalizeScore } from './grading';

function needScore(position: string, needs: string[]): number {
  const needText = needs.join(' ').toLowerCase();
  const upper = position.toUpperCase();
  let score = 0;

  if (upper.includes('G') && needText.includes('backcourt')) {
    score += 10;
  }
  if (upper.includes('F') && needText.includes('wing')) {
    score += 10;
  }
  if (
    upper.includes('C') &&
    (needText.includes('rim') || needText.includes('frontcourt'))
  ) {
    score += 12;
  }

  return score;
}

function alreadyDraftedIds(run: OffseasonRunState): Set<number> {
  return new Set(run.draft_night.picks.map((pick) => pick.player_id));
}

export function listFreeAgencyTargets(
  run: OffseasonRunState
): OffseasonFreeAgencyTarget[] {
  const draftedIds = alreadyDraftedIds(run);
  return run.scouting_pre_draft.prospects
    .filter((prospect) => !draftedIds.has(prospect.player_id))
    .slice(0, 20)
    .map((prospect) => {
      const askingPrice = Math.max(
        3,
        18 - prospect.board_rank * 0.45 + (1 - prospect.uncertainty_score) * 6
      );
      return {
        player_id: prospect.player_id,
        player_name: prospect.full_name,
        position: prospect.position,
        board_rank: prospect.board_rank,
        asking_price_millions: Math.round(askingPrice * 10) / 10,
      };
    });
}

function decisionToVerdict(
  decision: FreeAgencyOfferPayload['decision']
): OffseasonDecisionRecord['verdict'] {
  return decision === 'signed' ? 'signed' : 'rejected';
}

export function applyFreeAgencyOfferToRun(
  run: OffseasonRunState,
  payload: FreeAgencyOfferPayload,
  nowIso: string
): { run: OffseasonRunState; signing: OffseasonFreeAgencySigning } {
  const freeAgencyState = run.free_agency ?? createEmptyFreeAgencyState();
  const targets = listFreeAgencyTargets(run);
  const target = targets.find((candidate) => candidate.player_id === payload.player_id);

  if (!target) {
    throw new Error(`Free-agency target not found for player_id=${payload.player_id}.`);
  }

  if (payload.contract_millions > freeAgencyState.cap_space_millions) {
    throw new Error(
      `Offer exceeds available cap space (${freeAgencyState.cap_space_millions.toFixed(
        1
      )}M).`
    );
  }

  if (
    payload.decision === 'signed' &&
    run.team_context.roster.length >= freeAgencyState.roster_limit
  ) {
    throw new Error('Roster limit reached. Move a player before signing.');
  }

  const fitScore = normalizeScore(
    60 +
      needScore(target.position, run.team_context.needs) +
      Math.max(0, 20 - target.board_rank)
  );
  const capSpaceAfter =
    payload.decision === 'signed'
      ? freeAgencyState.cap_space_millions - payload.contract_millions
      : freeAgencyState.cap_space_millions;
  const explanation = buildFreeAgencyExplanation({
    playerName: target.player_name,
    contractMillions: payload.contract_millions,
    capSpaceAfter,
    needsMatch: needScore(target.position, run.team_context.needs),
    decision: payload.decision,
  });

  const signing: OffseasonFreeAgencySigning = {
    id: `${run.run_id}-fa-${Date.parse(nowIso)}`,
    player_id: target.player_id,
    player_name: target.player_name,
    decision: payload.decision,
    contract_millions: payload.contract_millions,
    fit_score: fitScore,
    explanation,
    created_at: nowIso,
  };

  const nextRoster =
    payload.decision === 'signed'
      ? [
          ...run.team_context.roster,
          {
            id: target.player_id,
            full_name: target.player_name,
            position: target.position,
          },
        ]
      : run.team_context.roster;

  const decisionRecord: OffseasonDecisionRecord = {
    id: `${run.run_id}-fa-log-${Date.parse(nowIso)}`,
    phase: 'free_agency',
    title: `Free agency ${payload.decision}: ${target.player_name}`,
    verdict: decisionToVerdict(payload.decision),
    summary: `${target.player_name} ${payload.decision} at ${payload.contract_millions.toFixed(
      1
    )}M.`,
    details: explanation,
    created_at: nowIso,
  };

  return {
    signing,
    run: {
      ...run,
      updated_at: nowIso,
      team_context: {
        ...run.team_context,
        roster: nextRoster,
      },
      free_agency: {
        ...freeAgencyState,
        stage: 'target_signings',
        cap_space_millions: Math.round(capSpaceAfter * 10) / 10,
        signings: [...freeAgencyState.signings, signing],
      },
      decision_history: [...run.decision_history, decisionRecord],
    },
  };
}

