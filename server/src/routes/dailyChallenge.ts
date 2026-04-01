import { Request, Response, Router } from 'express';
import { BadgeRecord, DailyChallengeResult } from '../../../shared/schemas';
import {
  buildStreakBadge,
  buildTrackBadge,
  getChallengeForDate,
  getUserBadges,
  getUserDailyResults,
  inferStreak,
  updateStore,
} from '../lib/courtVisionStore';
import { getRequestUserId } from '../lib/requestIdentity';

const router = Router();

function currentDateString(req: Request): string {
  return typeof req.query.date === 'string'
    ? req.query.date
    : new Date().toISOString().slice(0, 10);
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const date = currentDateString(req);
  const challenge = await updateStore((store) => getChallengeForDate(store, date));
  res.json({ challenge });
});

router.post('/submit', async (req: Request, res: Response): Promise<void> => {
  const challengeId = typeof req.body?.challenge_id === 'string' ? req.body.challenge_id : '';
  const selectedChoiceId =
    typeof req.body?.selected_choice_id === 'string' ? req.body.selected_choice_id : '';

  if (!challengeId || !selectedChoiceId) {
    res.status(400).json({
      error: 'challenge_id and selected_choice_id are required.',
      issues: [{ path: 'body', message: 'Submit both challenge_id and selected_choice_id.' }],
    });
    return;
  }

  const userId = getRequestUserId(req);

  const result = await updateStore((store) => {
    const challenge = store.daily_challenges.find((entry) => entry.id === challengeId);
    if (!challenge) {
      return null;
    }

    const submittedAt = new Date().toISOString();
    const existingResults = store.daily_results_by_user[userId] ?? [];
    const filteredResults = existingResults.filter((entry) => entry.challenge_id !== challengeId);

    const nextResult: DailyChallengeResult = {
      challenge_id: challenge.id,
      challenge_date: challenge.challenge_date,
      role_lens: challenge.role_lens,
      selected_choice_id: selectedChoiceId,
      correct: selectedChoiceId === challenge.correct_choice_id,
      explanation: challenge.explanation,
      streak: { current_streak: 0, best_streak: 0 },
      badges: [],
      submitted_at: submittedAt,
    };

    const withNext = [...filteredResults, nextResult].sort((a, b) => a.challenge_date.localeCompare(b.challenge_date));
    const streak = inferStreak(withNext);
    nextResult.streak = streak;

    const earnedBadges: BadgeRecord[] = [];
    const existingBadges = getUserBadges(store, userId);

    if (!existingBadges.some((badge) => badge.id === `first-${challenge.role_lens}-challenge`)) {
      earnedBadges.push(buildTrackBadge(challenge.role_lens, submittedAt));
    }

    [3, 7, 30].forEach((milestone) => {
      if (
        streak.current_streak >= milestone &&
        !existingBadges.some((badge) => badge.id === `streak-${milestone}`)
      ) {
        earnedBadges.push(buildStreakBadge(milestone, submittedAt));
      }
    });

    nextResult.badges = earnedBadges;
    store.daily_results_by_user[userId] = withNext.map((entry) =>
      entry.challenge_id === challengeId ? nextResult : entry
    );
    store.badges_by_user[userId] = [...existingBadges, ...earnedBadges];

    return nextResult;
  });

  if (!result) {
    res.status(404).json({ error: 'Challenge not found.' });
    return;
  }

  res.json(result);
});

router.get('/history', async (req: Request, res: Response): Promise<void> => {
  const userId = getRequestUserId(req);
  const results = await updateStore((store) => getUserDailyResults(store, userId));
  res.json({ results });
});

export default router;
