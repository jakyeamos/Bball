import { ProfileResponse, RecommendationCard } from '@nba-draft-sim/shared';

export function recommendNextLesson(profile: ProfileResponse): RecommendationCard | null {
  return profile.suggested_lessons[0] ?? null;
}
