import { OFFSEASON_PHASE_ORDER, OffseasonPhase, OffseasonRunState } from '@nba-draft-sim/shared';

function phaseIndex(phase: OffseasonPhase): number {
  return OFFSEASON_PHASE_ORDER.indexOf(phase);
}

export function assertValidPhaseTransition(
  current: OffseasonPhase,
  next: OffseasonPhase
): void {
  const currentIndex = phaseIndex(current);
  const nextIndex = phaseIndex(next);

  if (currentIndex < 0 || nextIndex < 0) {
    throw new Error(`Unknown phase transition: ${current} -> ${next}`);
  }

  if (nextIndex === currentIndex) {
    return;
  }

  if (nextIndex !== currentIndex + 1) {
    throw new Error(
      `Invalid phase transition: ${current} -> ${next}. Transitions must advance one phase at a time.`
    );
  }
}

export function transitionRunPhase(
  run: OffseasonRunState,
  nextPhase: OffseasonPhase,
  nowIso: string
): OffseasonRunState {
  assertValidPhaseTransition(run.phase, nextPhase);

  if (
    run.phase === 'team_context' &&
    nextPhase === 'coaching_market' &&
    run.team_context.selected_team_id === null
  ) {
    throw new Error(
      'Cannot leave Team Context before selecting a team.'
    );
  }

  return {
    ...run,
    phase: nextPhase,
    updated_at: nowIso,
    team_context: {
      ...run.team_context,
      stage:
        nextPhase === 'coaching_market'
          ? 'ready_for_coaching_market'
          : run.team_context.stage,
    },
  };
}
