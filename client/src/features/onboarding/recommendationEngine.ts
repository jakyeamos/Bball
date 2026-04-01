import { DailyChallengeRecord, LessonRecord, OnboardingResponse, RecommendationCard } from '@nba-draft-sim/shared';

export function buildOnboardingRecommendations(
  onboarding: OnboardingResponse,
  lessons: LessonRecord[],
  challenge: DailyChallengeRecord | null
): RecommendationCard[] {
  const lessonRecommendations = lessons
    .filter((lesson) => lesson.role_lens === onboarding.improvement_goal)
    .slice(0, 3)
    .map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      description: lesson.takeaway || lesson.description,
      route: `/lessons/${lesson.id}`,
      role_lens: lesson.role_lens,
      kind: 'lesson' as const,
    }));

  const challengeRecommendation =
    challenge && challenge.role_lens === onboarding.improvement_goal
      ? [
          {
            id: challenge.id,
            title: challenge.title,
            description: challenge.prompt,
            route: '/',
            role_lens: challenge.role_lens,
            kind: 'challenge' as const,
          },
        ]
      : [];

  return [...lessonRecommendations, ...challengeRecommendation].slice(0, 4);
}
