import { Request, Response, Router } from 'express';
import { updateStore } from '../lib/courtVisionStore';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

router.use(requireAdmin);

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const tags = await updateStore((store) => store.tags);
  res.json({ tags });
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const previousName =
    typeof req.body?.previous_name === 'string' ? req.body.previous_name.trim() : '';

  if (!name) {
    res.status(400).json({
      error: 'Tag name is required.',
      issues: [{ path: 'name', message: 'Provide a non-empty tag name.' }],
    });
    return;
  }

  const tags = await updateStore((store) => {
    let nextTags = store.tags.filter((tag) => tag !== previousName);
    if (!nextTags.includes(name)) {
      nextTags.push(name);
    }
    nextTags = nextTags.sort((a, b) => a.localeCompare(b));
    store.tags = nextTags;

    if (previousName && previousName !== name) {
      store.lessons = store.lessons.map((lesson) => ({
        ...lesson,
        tags: (lesson.tags ?? []).map((tag) => (tag === previousName ? name : tag)),
      }));
    }

    return nextTags;
  });

  res.json({ tags });
});

router.delete('/:name', async (req: Request, res: Response): Promise<void> => {
  const name = req.params.name;

  const result = await updateStore((store) => {
    const usageCount = store.lessons.filter((lesson) => lesson.tags?.includes(name)).length;
    if (usageCount > 0) {
      return { tags: store.tags, usageCount };
    }

    store.tags = store.tags.filter((tag) => tag !== name);
    return { tags: store.tags, usageCount: 0 };
  });

  if (result.usageCount > 0) {
    res.status(409).json({
      error: 'Tag is still in use.',
      issues: [{ path: 'name', message: `Remove the tag from ${result.usageCount} lesson(s) before deleting it.` }],
    });
    return;
  }

  res.json({ tags: result.tags });
});

export default router;
