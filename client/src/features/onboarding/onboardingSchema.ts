import { OnboardingResponse, RoleLens } from '@nba-draft-sim/shared';

export const KNOWLEDGE_LEVELS = ['new', 'growing', 'advanced'] as const;
export const IMPROVEMENT_GOALS: RoleLens[] = ['player', 'coach', 'gm'];

export function isValidOnboardingResponse(value: Partial<OnboardingResponse>): value is OnboardingResponse {
  return (
    typeof value.favorite_team === 'string' &&
    value.favorite_team.trim().length > 0 &&
    typeof value.knowledge_level === 'string' &&
    KNOWLEDGE_LEVELS.includes(value.knowledge_level as (typeof KNOWLEDGE_LEVELS)[number]) &&
    typeof value.improvement_goal === 'string' &&
    IMPROVEMENT_GOALS.includes(value.improvement_goal as RoleLens)
  );
}
