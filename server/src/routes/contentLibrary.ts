import { Request, Response, Router } from 'express';
import { ContentLibraryItem } from '../../../shared/schemas';
import { getStore } from '../lib/courtVisionStore';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const store = await getStore();
  const roleLens = typeof req.query.role_lens === 'string' ? req.query.role_lens : undefined;
  const difficulty = typeof req.query.difficulty === 'string' ? req.query.difficulty : undefined;
  const format = typeof req.query.format === 'string' ? req.query.format : undefined;
  const tag = typeof req.query.tag === 'string' ? req.query.tag : undefined;
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

  let items: ContentLibraryItem[] = [
    ...store.lessons
      .filter((lesson) => lesson.published !== false)
      .map((lesson) => ({
        id: lesson.id,
        content_type: 'lesson' as const,
        title: lesson.title,
        summary: lesson.takeaway || lesson.description,
        role_lens: lesson.role_lens,
        route: `/lessons/${lesson.id}`,
        tags: lesson.tags ?? [],
        difficulty: lesson.difficulty,
        interaction_type: lesson.interaction_type,
        subcategory: lesson.subcategory,
        estimated_minutes: lesson.estimated_minutes,
      })),
    ...store.recaps
      .filter((recap) => recap.published)
      .map((recap) => ({
        id: recap.id,
        content_type: 'recap' as const,
        title: recap.title,
        summary: recap.summary,
        role_lens: recap.role_lens,
        route: recap.route,
        tags: recap.tags,
      })),
  ];

  if (roleLens) {
    items = items.filter((item) => item.role_lens === roleLens);
  }

  if (difficulty) {
    items = items.filter((item) => item.difficulty === difficulty);
  }

  if (format) {
    items = items.filter((item) => item.interaction_type === format);
  }

  if (tag) {
    items = items.filter((item) => item.tags.includes(tag));
  }

  if (search) {
    items = items.filter((item) =>
      [item.title, item.summary, item.subcategory, ...item.tags]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search)
    );
  }

  res.json({
    items,
    available_tags: store.tags,
    recaps: store.recaps.filter((recap) => recap.published),
  });
});

export default router;
