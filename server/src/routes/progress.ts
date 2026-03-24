/**
 * server/src/routes/progress.ts
 * Phase 02-03: Lesson progress write endpoint.
 *
 * Routes:
 *   POST /api/progress   — record or update a user's progress on a lesson
 *
 * Request body is validated against progressWriteSchema via validateBody
 * middleware before the handler runs. Invalid payloads get a 400 with
 * structured `issues` before any storage work begins.
 *
 * Data storage:
 *   Phase 02-03 uses an in-memory store for infrastructure testing.
 *   Phase 4 will replace this with Supabase writes using the lesson_progress
 *   table created in Phase 02-02 migrations.
 *
 * Authentication:
 *   The user_id is extracted from the request context in Phase 4 when Supabase
 *   auth middleware is wired. For now the endpoint accepts an optional
 *   user_id field in the body so the shape can be validated end-to-end.
 */

import { Router, Request, Response } from 'express';
import { ProgressWritePayload, progressWriteSchema } from '@nba-draft-sim/shared';
import { validateBody } from '../middleware/validateBody';

const router = Router();

// ---------------------------------------------------------------------------
// In-memory store — keyed by "userId:lessonId"
// Replace with Supabase upsert in Phase 4.
// ---------------------------------------------------------------------------

interface ProgressEntry extends ProgressWritePayload {
  user_id: string;
  updated_at: string;
}

const progressStore = new Map<string, ProgressEntry>();

// ---------------------------------------------------------------------------
// POST /api/progress
// ---------------------------------------------------------------------------

router.post(
  '/',
  validateBody(progressWriteSchema),
  (req: Request, res: Response): void => {
    const payload = res.locals.validatedBody as ProgressWritePayload;

    // Phase 02-03: accept user_id from body; Phase 4 will use JWT sub claim.
    const user_id =
      typeof req.body.user_id === 'string' && req.body.user_id.trim() !== ''
        ? (req.body.user_id as string).trim()
        : 'anonymous';

    const key = `${user_id}:${payload.lesson_id}`;
    const entry: ProgressEntry = {
      ...payload,
      user_id,
      updated_at: new Date().toISOString(),
    };

    progressStore.set(key, entry);

    res.status(200).json({ success: true, progress: entry });
  }
);

// ---------------------------------------------------------------------------
// GET /api/progress/:lesson_id  (utility for testing — returns stored entry)
// ---------------------------------------------------------------------------

router.get('/:lesson_id', (req: Request, res: Response): void => {
  const user_id =
    typeof req.query.user_id === 'string' ? req.query.user_id : 'anonymous';
  const key = `${user_id}:${req.params.lesson_id}`;
  const entry = progressStore.get(key);

  if (!entry) {
    res.status(404).json({ error: 'No progress found for this lesson.' });
    return;
  }

  res.json({ progress: entry });
});

export default router;
