import { Request, Response, Router } from 'express';
import { ProfileResponse, RoleLens } from '../../../shared/schemas';
import {
  getUserBadges,
  getUserDailyResults,
  getUserProgress,
  inferStreak,
  recommendationFromLesson,
  updateStore,
} from '../lib/courtVisionStore';
import { getRequestUserId } from '../lib/requestIdentity';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const userId = getRequestUserId(req);

  const profile = await updateStore((store) => {
    const lessons = store.lessons.filter((lesson) => lesson.published !== false);
    const progress = getUserProgress(store, userId);
    const dailyResults = getUserDailyResults(store, userId);
    const badges = getUserBadges(store, userId);
    const streak = inferStreak(dailyResults);

    const trackMetrics = (['player', 'coach', 'gm'] as RoleLens[]).map((roleLens) => {
      const trackLessons = lessons.filter((lesson) => lesson.role_lens === roleLens);
      const trackProgress = progress.filter((entry) =>
        trackLessons.some((lesson) => lesson.id === entry.lesson_id)
      );
      const completed = trackProgress.filter((entry) => entry.completed);
      const scored = trackProgress.filter((entry) => typeof entry.score === 'number');
      const weakTags = trackLessons
        .filter((lesson) => !completed.some((entry) => entry.lesson_id === lesson.id))
        .flatMap((lesson) => lesson.tags ?? [])
        .slice(0, 3);

      return {
        role_lens: roleLens,
        completion_count: completed.length,
        accuracy_rate:
          scored.length > 0
            ? Math.round(
                scored.reduce((sum, entry) => sum + (entry.score ?? 0), 0) / scored.length
              )
            : 0,
        weak_tags: [...new Set(weakTags)],
      };
    });

    const weakestTrack = [...trackMetrics].sort((a, b) => {
      if (a.completion_count !== b.completion_count) {
        return a.completion_count - b.completion_count;
      }
      return a.accuracy_rate - b.accuracy_rate;
    })[0];

    const suggestedLessons = lessons
      .filter(
        (lesson) =>
          lesson.role_lens === weakestTrack.role_lens &&
          !progress.some((entry) => entry.lesson_id === lesson.id && entry.completed)
      )
      .slice(0, 3)
      .map(recommendationFromLesson);

    const response: ProfileResponse = {
      user_id: userId,
      auth_mode: userId.startsWith('guest-') ? 'guest' : 'supabase',
      total_completed_lessons: progress.filter((entry) => entry.completed).length,
      track_metrics: trackMetrics,
      streak,
      badges,
      suggested_lessons: suggestedLessons,
      recent_challenge: dailyResults[dailyResults.length - 1] ?? null,
    };

    return response;
  });

  res.json(profile);
});

export default router;
