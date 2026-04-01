import { Request, Response, Router } from 'express';
import { LessonRecord, lessonRecordSchema } from '../../../shared/schemas';
import { updateStore } from '../lib/courtVisionStore';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

router.use(requireAdmin);

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const lessons = await updateStore((store) => store.lessons);
  res.json({ lessons });
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const lesson = (req.body?.lesson ?? req.body) as LessonRecord;
  const parsed = lessonRecordSchema.safeParse(lesson);

  if (!parsed.valid) {
    res.status(400).json({
      error: 'Invalid lesson payload.',
      issues: parsed.errors.map((message, index) => ({ path: `lesson.${index}`, message })),
    });
    return;
  }

  const saved = await updateStore((store) => {
    const index = store.lessons.findIndex((entry) => entry.id === parsed.data.id);
    if (index >= 0) {
      store.lessons[index] = parsed.data;
    } else {
      store.lessons.unshift(parsed.data);
    }

    const tags = new Set(store.tags);
    (parsed.data.tags ?? []).forEach((tag) => tags.add(tag));
    store.tags = [...tags].sort((a, b) => a.localeCompare(b));

    return parsed.data;
  });

  res.json(saved);
});

router.post('/:id/publish', async (req: Request, res: Response): Promise<void> => {
  const published = Boolean(req.body?.published);

  const updated = await updateStore((store) => {
    const lesson = store.lessons.find((entry) => entry.id === req.params.id);
    if (!lesson) {
      return null;
    }

    lesson.published = published;
    return lesson;
  });

  if (!updated) {
    res.status(404).json({ error: 'Lesson not found.' });
    return;
  }

  res.json(updated);
});

export default router;
