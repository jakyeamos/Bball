import { Request, Response, Router } from 'express';
import { DailyChallengeRecord } from '../../../shared/schemas';
import { updateStore } from '../lib/courtVisionStore';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

router.use(requireAdmin);

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const challenges = await updateStore((store) => store.daily_challenges);
  res.json({ challenges });
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const challenge = req.body as DailyChallengeRecord;

  if (!challenge.id || !challenge.challenge_date || !challenge.prompt || !Array.isArray(challenge.choices)) {
    res.status(400).json({
      error: 'Invalid challenge payload.',
      issues: [{ path: 'challenge', message: 'id, challenge_date, prompt, and choices are required.' }],
    });
    return;
  }

  const saved = await updateStore((store) => {
    const existingIndex = store.daily_challenges.findIndex(
      (entry) => entry.challenge_date === challenge.challenge_date || entry.id === challenge.id
    );

    if (existingIndex >= 0) {
      store.daily_challenges[existingIndex] = challenge;
    } else {
      store.daily_challenges.push(challenge);
      store.daily_challenges.sort((a, b) => a.challenge_date.localeCompare(b.challenge_date));
    }

    return challenge;
  });

  res.json(saved);
});

export default router;
