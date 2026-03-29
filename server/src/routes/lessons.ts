/**
 * server/src/routes/lessons.ts
 * Phase 02-03: Lesson list and detail endpoints.
 *
 * Routes:
 *   GET  /api/lessons         — list all lessons (with optional role_lens filter)
 *   GET  /api/lessons/:id     — single lesson detail
 *
 * Response shapes are validated against lessonRecordSchema before sending so
 * any future database mismatch produces a 500 with a clear message rather than
 * silently returning malformed data to the client.
 *
 * Data source:
 *   Phase 02-03 uses an in-memory seed array. Phase 4 will replace this with
 *   Supabase queries once the content layer is built.
 */

import { Router, Request, Response } from 'express';
import {
  LessonRecord,
  RoleLens,
  Difficulty,
  lessonRecordSchema,
} from '@nba-draft-sim/shared';

const router = Router();

// ---------------------------------------------------------------------------
// Seed data — placeholder lessons for infrastructure testing
// Replace with Supabase query in Phase 4.
// ---------------------------------------------------------------------------

const SEED_LESSONS: LessonRecord[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    title: 'Reading Pick-and-Roll Coverage',
    role_lens: 'player' as RoleLens,
    difficulty: 'beginner' as Difficulty,
    description:
      'Understand how to read a defender\'s coverage on a pick-and-roll and choose the correct decision.',
    takeaway: 'Identify Drop vs Hedging early to make the right pass or shot.',
    interaction_type: 'film',
    media_url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=800&auto=format&fit=crop',
    content_url: 'https://www.youtube.com/embed/ScMzIvxBSi4',
    annotations: [
      { timestamp: 10, note: 'Notice the big man dropping back.' },
      { timestamp: 25, note: 'Guard goes over the screen, creating a pocket pass opportunity.' }
    ]
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    title: 'Defensive Rotations After Drive Kick',
    role_lens: 'coach' as RoleLens,
    difficulty: 'intermediate' as Difficulty,
    description:
      'Learn the rotations a defense needs to execute when the ball handler drives and kicks to an open shooter.',
    takeaway: 'Help the helper and x-out to shooters efficiently.',
    interaction_type: 'film',
    media_url: 'https://images.unsplash.com/photo-1519861531473-9200262188bf?q=80&w=800&auto=format&fit=crop',
    content_url: 'https://www.youtube.com/embed/jfKfPfyJRdk',
    annotations: [
      { timestamp: 5, note: 'Initial breakdown at the point of attack.' },
      { timestamp: 15, note: 'Low man rotates over to stop the drive.' },
      { timestamp: 30, note: 'Weak side defenders sync the x-out rotation.' }
    ]
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    title: 'Valuing Draft Picks in Trades',
    role_lens: 'gm' as RoleLens,
    difficulty: 'intermediate' as Difficulty,
    description:
      'How to assess future pick value relative to immediate roster needs when evaluating trade offers.',
    takeaway: 'Balance your contention window with draft asset accumulation.',
    interaction_type: 'article'
  },
];

// ---------------------------------------------------------------------------
// GET /api/lessons
// ---------------------------------------------------------------------------

router.get('/', (req: Request, res: Response): void => {
  const { role_lens } = req.query;

  let lessons = SEED_LESSONS;

  // Optional filter by role_lens query param
  if (typeof role_lens === 'string') {
    const validLens: RoleLens[] = ['player', 'coach', 'gm'];
    if (!validLens.includes(role_lens as RoleLens)) {
      res.status(400).json({
        error: 'Validation failed',
        issues: [
          {
            path: 'role_lens',
            message: `role_lens must be one of: ${validLens.join(', ')}.`,
          },
        ],
      });
      return;
    }
    lessons = lessons.filter((l) => l.role_lens === role_lens);
  }

  // Validate each record against the shared schema before sending
  const validated: LessonRecord[] = [];
  for (const lesson of lessons) {
    const result = lessonRecordSchema.safeParse(lesson);
    if (!result.valid) {
      // Data integrity error — seed/db returned a malformed record
      res.status(500).json({
        error: 'Internal data integrity error',
        issues: result.errors,
      });
      return;
    }
    validated.push(result.data);
  }

  res.json({ lessons: validated });
});

// ---------------------------------------------------------------------------
// GET /api/lessons/:id
// ---------------------------------------------------------------------------

router.get('/:id', (req: Request, res: Response): void => {
  const { id } = req.params;

  const lesson = SEED_LESSONS.find((l) => l.id === id);

  if (!lesson) {
    res.status(404).json({ error: 'Lesson not found.' });
    return;
  }

  const result = lessonRecordSchema.safeParse(lesson);
  if (!result.valid) {
    res.status(500).json({
      error: 'Internal data integrity error',
      issues: result.errors,
    });
    return;
  }

  res.json({ lesson: result.data });
});

export default router;
