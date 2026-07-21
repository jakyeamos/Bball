import {
  OffseasonDecisionRecord,
  OffseasonRunState,
  OffseasonTradeProposal,
  TradeProposalPayload,
  createEmptyTradeMarketState,
} from '@nba-draft-sim/shared';

function buildProposalId(runId: string, nowIso: string): string {
  return `${runId}-trade-${Date.parse(nowIso)}`;
}

function playerPositionIndex(run: OffseasonRunState): Map<number, string> {
  const index = new Map<number, string>();
  for (const player of run.team_context.roster) {
    index.set(player.id, player.position.toUpperCase());
  }
  for (const prospect of run.scouting_pre_draft.prospects) {
    index.set(prospect.player_id, prospect.position.toUpperCase());
  }
  return index;
}

function positionFitScore(position: string, needs: string[]): number {
  const needText = needs.join(' ').toLowerCase();
  const guardFit =
    position.includes('G') && needText.includes('backcourt') ? 5 : 0;
  const wingFit = position.includes('F') && needText.includes('wing') ? 5 : 0;
  const centerFit =
    position.includes('C') &&
    (needText.includes('rim') || needText.includes('frontcourt'))
      ? 6
      : 0;
  return guardFit + wingFit + centerFit;
}

function coachWeightBoost(run: OffseasonRunState): number {
  const tendency = run.coaching_market.tendency_profile;
  if (!tendency) {
    return 0;
  }
  return (
    tendency.spacing_bias * 8 +
    tendency.rim_pressure_bias * 8 +
    tendency.development_bias * 10
  );
}

function evaluateScore(
  run: OffseasonRunState,
  payload: TradeProposalPayload
): { score: number; rationale: string[] } {
  const positionLookup = playerPositionIndex(run);
  const needs = run.team_context.needs;
  const timeline = run.team_context.timeline;
  let score = 0;
  const rationale: string[] = [];

  for (const incomingPlayerId of payload.requested_player_ids) {
    const position = positionLookup.get(incomingPlayerId) ?? 'UNK';
    score += positionFitScore(position, needs);
  }

  for (const outgoingPlayerId of payload.offered_player_ids) {
    const position = positionLookup.get(outgoingPlayerId) ?? 'UNK';
    score -= Math.max(2, Math.round(positionFitScore(position, needs) * 0.7));
  }

  score += payload.requested_pick_ids.length * 4;
  score -= payload.offered_pick_ids.length * 4;

  if (timeline === 'contending' && payload.requested_player_ids.length > 0) {
    score += 5;
    rationale.push(
      'Incoming player assets align with a contending timeline that values immediate rotation impact.'
    );
  } else if (
    timeline === 'rebuilding' &&
    payload.requested_pick_ids.length > 0
  ) {
    score += 5;
    rationale.push(
      'Incoming pick value supports a rebuilding timeline and future optionality.'
    );
  } else if (timeline === 'contending' && payload.requested_pick_ids.length > 0) {
    score -= 2;
    rationale.push(
      'Pick-heavy returns can undercut immediate playoff rotation priorities for this timeline.'
    );
  } else {
    rationale.push('Trade return has mixed timeline fit and should be weighed against roster context.');
  }

  const tendencyBoost = coachWeightBoost(run);
  score += tendencyBoost;
  if (tendencyBoost > 0.5) {
    rationale.push(
      'Coach tendency profile improves projected fit for this package in downstream grading.'
    );
  } else if (tendencyBoost < -0.5) {
    rationale.push(
      'Coach tendency profile reduces downstream fit confidence for this package.'
    );
  }

  const incomingAssets =
    payload.requested_player_ids.length + payload.requested_pick_ids.length;
  const outgoingAssets =
    payload.offered_player_ids.length + payload.offered_pick_ids.length;
  rationale.push(
    `Asset balance: incoming ${incomingAssets} versus outgoing ${outgoingAssets} total assets.`
  );

  return { score: Math.round(score * 10) / 10, rationale };
}

function verdictFromScore(
  score: number
): OffseasonTradeProposal['verdict'] {
  if (score >= 6) {
    return 'helps';
  }
  if (score <= -6) {
    return 'hurts';
  }
  return 'neutral';
}

function decisionSummary(
  payload: TradeProposalPayload,
  proposal: OffseasonTradeProposal
): string {
  const action = payload.decision === 'accepted' ? 'accepted' : 'rejected';
  return `Trade ${action} with ${proposal.verdict} fit impact (${proposal.fit_score}).`;
}

function buildTradeProposal(
  run: OffseasonRunState,
  payload: TradeProposalPayload,
  nowIso: string
): OffseasonTradeProposal {
  const evaluation = evaluateScore(run, payload);
  return {
    id: buildProposalId(run.run_id, nowIso),
    offered_player_ids: payload.offered_player_ids,
    offered_pick_ids: payload.offered_pick_ids,
    requested_player_ids: payload.requested_player_ids,
    requested_pick_ids: payload.requested_pick_ids,
    decision: payload.decision,
    verdict: verdictFromScore(evaluation.score),
    fit_score: evaluation.score,
    rationale: evaluation.rationale,
    created_at: nowIso,
  };
}

export function applyTradeProposalToRun(
  run: OffseasonRunState,
  payload: TradeProposalPayload,
  nowIso: string
): { run: OffseasonRunState; proposal: OffseasonTradeProposal } {
  const tradeState = run.trade_market ?? createEmptyTradeMarketState();
  const proposal = buildTradeProposal(run, payload, nowIso);
  const phaseDecision: Omit<OffseasonDecisionRecord, 'id'> = {
    phase: 'trade_market',
    title: `Trade ${payload.decision}`,
    verdict: payload.decision,
    summary: decisionSummary(payload, proposal),
    details: proposal.rationale,
    created_at: nowIso,
  };

  const nextDecision: OffseasonDecisionRecord = {
    ...phaseDecision,
    id: `${run.run_id}-trade-log-${Date.parse(nowIso)}`,
  };

  return {
    proposal,
    run: {
      ...run,
      updated_at: nowIso,
      trade_market: {
        ...tradeState,
        stage: 'explore_market',
        proposals: [...tradeState.proposals, proposal],
      },
      decision_history: [...run.decision_history, nextDecision],
    },
  };
}
