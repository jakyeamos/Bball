import {
  OffseasonCoachProfile,
  OffseasonDecisionRecord,
  OffseasonRunState,
  createEmptyCoachingMarketState,
} from '@nba-draft-sim/shared';
import {
  CoachValuationInputs,
  applyTendencyToValuation,
  buildCoachHiringNotes,
  buildCoachTendencyProfile,
} from './coachTendencyEffects';

const BASELINE_VALUATION: CoachValuationInputs = {
  pace: 0,
  spacing: 0,
  rim_pressure: 0,
  defense: 0,
  development: 0,
};

function buildDecisionId(
  runId: string,
  phase: OffseasonDecisionRecord['phase'],
  nowIso: string
): string {
  const timestamp = Date.parse(nowIso);
  return `${runId}-${phase}-${timestamp}`;
}

function appendDecision(
  run: OffseasonRunState,
  decision: Omit<OffseasonDecisionRecord, 'id'>
): OffseasonRunState {
  const nextDecision: OffseasonDecisionRecord = {
    ...decision,
    id: buildDecisionId(run.run_id, decision.phase, decision.created_at),
  };

  return {
    ...run,
    decision_history: [...run.decision_history, nextDecision],
  };
}

function getCoachingMarketState(run: OffseasonRunState): OffseasonRunState['coaching_market'] {
  if (!run.coaching_market) {
    return createEmptyCoachingMarketState();
  }
  return run.coaching_market;
}

export interface CoachValuationContext {
  baseline: CoachValuationInputs;
  adjusted: CoachValuationInputs;
}

export function buildValuationContextFromRun(
  run: OffseasonRunState
): CoachValuationContext {
  const coachingState = getCoachingMarketState(run);
  if (!coachingState.tendency_profile) {
    return {
      baseline: BASELINE_VALUATION,
      adjusted: BASELINE_VALUATION,
    };
  }

  return {
    baseline: BASELINE_VALUATION,
    adjusted: applyTendencyToValuation(
      BASELINE_VALUATION,
      coachingState.tendency_profile
    ),
  };
}

export function hireCoachForRun(
  run: OffseasonRunState,
  coach: OffseasonCoachProfile,
  nowIso: string
): OffseasonRunState {
  const tendencyProfile = buildCoachTendencyProfile(coach);
  const hiringNotes = buildCoachHiringNotes(coach, tendencyProfile);
  const coachingState = getCoachingMarketState(run);

  const updatedRun: OffseasonRunState = {
    ...run,
    updated_at: nowIso,
    coaching_market: {
      ...coachingState,
      stage: 'coach_hired',
      selected_coach: coach,
      tendency_profile: tendencyProfile,
      hiring_notes: hiringNotes,
    },
  };

  return appendDecision(updatedRun, {
    phase: 'coaching_market',
    title: `Hired ${coach.head_coach_name}`,
    verdict: 'selected',
    summary: `Selected ${coach.head_coach_name} to lead the offseason decision loop.`,
    details: hiringNotes,
    created_at: nowIso,
  });
}

