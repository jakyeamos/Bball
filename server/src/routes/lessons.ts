import { Request, Response, Router } from 'express';
import { LessonRecord, RoleLens, lessonRecordSchema } from '../../../shared/schemas';
import { getStore } from '../lib/courtVisionStore';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const store = await getStore();
  const roleLens = typeof req.query.role_lens === 'string' ? req.query.role_lens : undefined;
  const difficulty = typeof req.query.difficulty === 'string' ? req.query.difficulty : undefined;
  const format = typeof req.query.format === 'string' ? req.query.format : undefined;
  const tag = typeof req.query.tag === 'string' ? req.query.tag : undefined;
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
  const publishedOnly = req.query.published_only !== 'false';

  let lessons = store.lessons.filter((lesson) => (publishedOnly ? lesson.published !== false : true));

  if (roleLens) {
    const validLens: RoleLens[] = ['player', 'coach', 'gm'];
    if (!validLens.includes(roleLens as RoleLens)) {
      res.status(400).json({
        error: 'Validation failed',
        issues: [{ path: 'role_lens', message: `role_lens must be one of: ${validLens.join(', ')}.` }],
      });
      return;
    }
    lessons = lessons.filter((lesson) => lesson.role_lens === roleLens);
  }

  if (difficulty) {
    lessons = lessons.filter((lesson) => lesson.difficulty === difficulty);
  }

  if (format) {
    lessons = lessons.filter((lesson) => lesson.interaction_type === format);
  }

  if (tag) {
    lessons = lessons.filter((lesson) => lesson.tags?.includes(tag));
  }

  if (search) {
    lessons = lessons.filter((lesson) =>
      [lesson.title, lesson.description, lesson.takeaway, lesson.subcategory, ...(lesson.tags ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search)
    );
  }

  const validated: LessonRecord[] = [];
  for (const lesson of lessons) {
    const result = lessonRecordSchema.safeParse(lesson);
    if (!result.valid) {
      res.status(500).json({
        error: 'Internal data integrity error',
        issues: result.errors.map((message, index) => ({ path: `lesson.${index}`, message })),
      });
      return;
    }
    validated.push(result.data);
  }

  res.json({ lessons: validated });
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const store = await getStore();
  const lesson = store.lessons.find((candidate) => candidate.id === req.params.id);

  if (!lesson || lesson.published === false) {
    res.status(404).json({ error: 'Lesson not found.' });
    return;
  }

  const result = lessonRecordSchema.safeParse(lesson);
  if (!result.valid) {
    res.status(500).json({
      error: 'Internal data integrity error',
      issues: result.errors.map((message, index) => ({ path: `lesson.${index}`, message })),
    });
    return;
  }

  res.json({ lesson: result.data });
});

export default router;
