import { Request, Response, Router } from 'express';
import { LessonProgressRecord, ProgressWritePayload, progressWriteSchema } from '../../../shared/schemas';
import { updateStore } from '../lib/courtVisionStore';
import { getRequestUserId } from '../lib/requestIdentity';
import { validateBody } from '../middleware/validateBody';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const userId = getRequestUserId(req);
  const progress = await updateStore((store) => store.progress_by_user[userId] ?? []);
  res.json({ progress });
});

router.post(
  '/',
  validateBody(progressWriteSchema),
  async (req: Request, res: Response): Promise<void> => {
    const payload = res.locals.validatedBody as ProgressWritePayload;
    const userId = getRequestUserId(req);

    const progress = await updateStore((store) => {
      const existing = store.progress_by_user[userId] ?? [];
      const index = existing.findIndex((entry) => entry.lesson_id === payload.lesson_id);
      const now = new Date().toISOString();

      const nextEntry: LessonProgressRecord = {
        user_id: userId,
        lesson_id: payload.lesson_id,
        completed: payload.completed,
        score: payload.score,
        attempts: index >= 0 ? existing[index].attempts + 1 : 1,
        updated_at: now,
        last_attempted_at: now,
      };

      if (index >= 0) {
        existing[index] = {
          ...existing[index],
          ...nextEntry,
          completed: existing[index].completed || payload.completed,
          score: payload.score ?? existing[index].score,
        };
      } else {
        existing.push(nextEntry);
      }

      store.progress_by_user[userId] = existing;
      return index >= 0 ? existing[index] : nextEntry;
    });

    res.status(200).json({ success: true, progress });
  }
);

router.get('/:lesson_id', async (req: Request, res: Response): Promise<void> => {
  const userId = getRequestUserId(req);
  const lessonId = req.params.lesson_id;

  const progress = await updateStore((store) => {
    const entries = store.progress_by_user[userId] ?? [];
    return entries.find((entry) => entry.lesson_id === lessonId) ?? null;
  });

  if (!progress) {
    res.status(404).json({ error: 'No progress found for this lesson.' });
    return;
  }

  res.json({ progress });
});

export default router;
