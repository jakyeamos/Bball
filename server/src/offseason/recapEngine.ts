import {
  DraftGrade,
  OffseasonRecapMoment,
  OffseasonRecapReport,
  OffseasonRunState,
} from '@nba-draft-sim/shared';
import { draftGradeFromScore, normalizeScore } from './grading';

function average(values: number[], fallback = 0): number {
  if (values.length === 0) {
    return fallback;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function positionAddressesNeed(position: string, need: string): boolean {
  const upperPosition = position.toUpperCase();
  const lowerNeed = need.toLowerCase();

  if (upperPosition.includes('G') && lowerNeed.includes('backcourt')) {
    return true;
  }

  if (upperPosition.includes('F') && lowerNeed.includes('wing')) {
    return true;
  }

  if (
    upperPosition.includes('C') &&
    (lowerNeed.includes('rim') || lowerNeed.includes('frontcourt'))
  ) {
    return true;
  }

  return false;
}

function projectedDirection(
  timeline: OffseasonRunState['team_context']['timeline'],
  overallScore: number
): string {
  const lane = timeline ?? 'transitioning';

  if (lane === 'contending') {
    if (overallScore >= 80) {
      return 'Contending window strengthened: this offseason improved immediate playoff viability.';
    }
    if (overallScore >= 65) {
      return 'Contending lane preserved: the roster still projects as competitive but with visible gaps.';
    }
    return 'Contending lane weakened: this cycle undercut near-term competitive depth.';
  }

  if (lane === 'rebuilding') {
    if (overallScore >= 80) {
      return 'Rebuild accelerated: decisions added high-upside talent and fit clarity.';
    }
    if (overallScore >= 65) {
      return 'Rebuild remains on track: gains were made, though development risk remains.';
    }
    return 'Rebuild stalled: decision quality did not sufficiently improve long-term direction.';
  }

  if (overallScore >= 80) {
    return 'Transition phase improved: roster direction now leans toward a stable competitive path.';
  }
  if (overallScore >= 65) {
    return 'Transition phase steady: mixed outcomes keep multiple pathways open.';
  }
  return 'Transition phase regressed: the roster still lacks a clear strategic identity.';
}

function buildKeyMoments(run: OffseasonRunState): OffseasonRecapMoment[] {
  return run.decision_history
    .slice()
    .sort(
      (left, right) =>
        new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
    )
    .slice(-6)
    .map((decision) => ({
      id: decision.id,
      phase: decision.phase,
      title: decision.title,
      verdict: decision.verdict,
      summary: decision.summary,
      created_at: decision.created_at,
    }));
}

export function buildOffseasonRecap(run: OffseasonRunState): OffseasonRecapReport {
  const prospectsById = new Map(
    run.scouting_pre_draft.prospects.map((prospect) => [
      prospect.player_id,
      prospect,
    ])
  );

  const rosterPositionsById = new Map(
    run.team_context.roster.map((player) => [player.id, player.position])
  );

  const draftPicks = run.draft_night.picks;
  const signedPlayers = run.free_agency.signings.filter(
    (signing) => signing.decision === 'signed'
  );
  const acceptedTrades = run.trade_market.proposals.filter(
    (proposal) => proposal.decision === 'accepted'
  );

  const incomingTradePositions = acceptedTrades
    .flatMap((proposal) => proposal.requested_player_ids)
    .map(
      (playerId) =>
        prospectsById.get(playerId)?.position ?? rosterPositionsById.get(playerId)
    )
    .filter((position): position is string => typeof position === 'string');

  const draftedPositions = draftPicks
    .map((pick) => prospectsById.get(pick.player_id)?.position)
    .filter((position): position is string => typeof position === 'string');

  const signedPositions = signedPlayers
    .map((signing) => prospectsById.get(signing.player_id)?.position)
    .filter((position): position is string => typeof position === 'string');

  const addedPositions = [
    ...draftedPositions,
    ...signedPositions,
    ...incomingTradePositions,
  ];

  const addressedNeedIndexes = new Set<number>();
  run.team_context.needs.forEach((need, index) => {
    if (addedPositions.some((position) => positionAddressesNeed(position, need))) {
      addressedNeedIndexes.add(index);
    }
  });

  const totalNeeds = run.team_context.needs.length;
  const addressedNeeds = addressedNeedIndexes.size;
  const unmetNeeds = Math.max(0, totalNeeds - addressedNeeds);

  const draftAverage = normalizeScore(
    average(draftPicks.map((pick) => pick.fit_score), 55)
  );
  const freeAgencyAverage = normalizeScore(
    average(signedPlayers.map((signing) => signing.fit_score), 55)
  );
  const tradeAverage = normalizeScore(
    average(
      acceptedTrades.map((proposal) => normalizeScore(60 + proposal.fit_score * 2)),
      58
    )
  );

  const developmentBias =
    run.coaching_market.tendency_profile?.development_bias ?? 0;
  const youthTalentAdds =
    draftPicks.filter((pick) => pick.board_rank <= 20).length +
    signedPlayers.filter((signing) => {
      const boardRank = prospectsById.get(signing.player_id)?.board_rank ?? 99;
      return boardRank <= 25;
    }).length;

  const developmentalEnvironmentScore = normalizeScore(
    55 + developmentBias * 25 + youthTalentAdds * 4 - unmetNeeds * 5
  );

  const overallScore = normalizeScore(
    draftAverage * 0.4 +
      freeAgencyAverage * 0.25 +
      tradeAverage * 0.15 +
      developmentalEnvironmentScore * 0.2 +
      (run.coaching_market.selected_coach ? 4 : 0) -
      unmetNeeds * 2
  );

  const teamGrade: DraftGrade = draftGradeFromScore(overallScore);
  const direction = projectedDirection(run.team_context.timeline, overallScore);

  const fitReport = [
    `Need coverage: addressed ${addressedNeeds} of ${totalNeeds} listed team needs through draft, trades, and signings.`,
    `Draft outcomes: ${draftPicks.length} picks with an average fit score of ${draftAverage.toFixed(1)}.`,
    `Free agency outcomes: ${signedPlayers.length} signed targets with average fit ${freeAgencyAverage.toFixed(1)} and ${run.free_agency.cap_space_millions.toFixed(1)}M cap space remaining.`,
    `Trade outcomes: ${acceptedTrades.length} accepted proposals with normalized fit impact ${tradeAverage.toFixed(1)}.`,
  ];

  const explanation = [
    `Final grade ${teamGrade} (${overallScore.toFixed(1)}) blends decision quality from draft night, free agency, and trade outcomes.`,
    `Developmental environment scored ${developmentalEnvironmentScore.toFixed(1)} based on coach development bias and youth-talent additions.`,
    direction,
  ];

  return {
    run_id: run.run_id,
    team_grade: teamGrade,
    overall_score: overallScore,
    fit_report: fitReport,
    developmental_environment_score: developmentalEnvironmentScore,
    projected_direction: direction,
    explanation,
    key_moments: buildKeyMoments(run),
  };
}
