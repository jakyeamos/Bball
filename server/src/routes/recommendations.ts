import { Request, Response, Router } from 'express';
import {
  AdvancedModuleRecommendation,
  OnboardingResponse,
  RecommendationCard,
} from '../../../shared/schemas';
import { featureFlags } from '@nba-draft-sim/shared';
import { getStore, recommendationFromLesson, updateStore } from '../lib/courtVisionStore';
import { getRequestUserId } from '../lib/requestIdentity';

const router = Router();
const GM_ADVANCED_THRESHOLD = 3;

function isValidOnboarding(body: unknown): body is OnboardingResponse {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return false;
  const payload = body as Record<string, unknown>;
  return (
    typeof payload.favorite_team === 'string' &&
    typeof payload.knowledge_level === 'string' &&
    typeof payload.improvement_goal === 'string'
  );
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
  if (!isValidOnboarding(req.body)) {
    res.status(400).json({
      error: 'Invalid onboarding payload.',
      issues: [{ path: 'body', message: 'favorite_team, knowledge_level, and improvement_goal are required.' }],
    });
    return;
  }

  const userId = getRequestUserId(req);
  const payload = req.body as OnboardingResponse;
  const store = await getStore();

  const recommendedLessons = store.lessons
    .filter((lesson) => lesson.published !== false && lesson.role_lens === payload.improvement_goal)
    .slice(0, 3)
    .map(recommendationFromLesson);

  const benchmarkChallenge = store.daily_challenges
    .find((challenge) => challenge.role_lens === payload.improvement_goal);

  const recommendations: RecommendationCard[] = [
    ...recommendedLessons,
    ...(benchmarkChallenge
      ? [
          {
            id: benchmarkChallenge.id,
            title: benchmarkChallenge.title,
            description: benchmarkChallenge.prompt,
            route: '/',
            role_lens: benchmarkChallenge.role_lens,
            kind: 'challenge' as const,
          },
        ]
      : []),
  ].slice(0, 4);

  await updateStore((draft) => {
    draft.onboarding_by_user[userId] = payload;
  });

  res.json({ recommendations });
});

router.get('/advanced', async (req: Request, res: Response): Promise<void> => {
  if (
    !featureFlags.offseasonFoundationEnabled ||
    !featureFlags.offseasonTeamContextEnabled
  ) {
    res.json({ modules: [] });
    return;
  }

  const userId = getRequestUserId(req);
  const store = await getStore();
  const userProgress = store.progress_by_user[userId] ?? [];
  const gmLessons = store.lessons.filter(
    (lesson) => lesson.role_lens === 'gm' && lesson.published !== false
  );
  const gmLessonIds = new Set(gmLessons.map((lesson) => lesson.id));
  const completedCoreGmLessons = userProgress.filter(
    (entry) => entry.completed && gmLessonIds.has(entry.lesson_id)
  ).length;

  const modules: AdvancedModuleRecommendation[] = [];
  if (completedCoreGmLessons >= GM_ADVANCED_THRESHOLD) {
    modules.push({
      id: 'offseason-simulator',
      title: 'Offseason Simulator',
      description:
        'Run a full GM offseason with real team context, picks, and timeline pressure.',
      route: '/offseason/team-context',
      role_lens: 'gm',
      minimum_completed_lessons: GM_ADVANCED_THRESHOLD,
      current_completed_lessons: completedCoreGmLessons,
    });
  }

  res.json({ modules });
});

export default router;
