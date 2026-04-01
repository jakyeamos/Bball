import { Request, Response, Router } from 'express';
import { DiscussionComment } from '../../../shared/schemas';
import { updateStore } from '../lib/courtVisionStore';
import { getDisplayNameFromUserId, getRequestUserId } from '../lib/requestIdentity';

const router = Router();

router.get('/:lessonId', async (req: Request, res: Response): Promise<void> => {
  const comments = await updateStore((store) => store.discussions_by_lesson[req.params.lessonId] ?? []);
  res.json({ comments });
});

router.post('/:lessonId', async (req: Request, res: Response): Promise<void> => {
  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
  if (!body) {
    res.status(400).json({
      error: 'Comment body is required.',
      issues: [{ path: 'body', message: 'Comments must include non-empty body text.' }],
    });
    return;
  }

  const userId = getRequestUserId(req);

  const comment = await updateStore((store) => {
    const nextComment: DiscussionComment = {
      id: `comment-${Date.now()}`,
      lesson_id: req.params.lessonId,
      author_id: userId,
      author_label: getDisplayNameFromUserId(userId),
      body,
      created_at: new Date().toISOString(),
    };

    const existing = store.discussions_by_lesson[req.params.lessonId] ?? [];
    existing.push(nextComment);
    store.discussions_by_lesson[req.params.lessonId] = existing;
    return nextComment;
  });

  res.status(201).json(comment);
});

export default router;
