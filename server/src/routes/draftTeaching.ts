import { Request, Response, Router } from 'express';
import { DraftTeachingMoment } from '../../../shared/schemas';

const router = Router();

const MOMENTS: DraftTeachingMoment[] = [
  {
    id: 'clock-pressure',
    title: 'Clock Pressure',
    prompt: 'When the clock dips under 15 seconds, default to the highest-confidence fit instead of chasing a thin upside edge.',
    trigger: 'clock_pressure',
    severity: 'warning',
    lesson_id: '10000000-0000-0000-0000-000000000008',
    lesson_title: 'When To Trade A Future First',
  },
  {
    id: 'fit-conflict',
    title: 'Fit Conflict',
    prompt: 'A talented prospect can still be a weak pick if the roster already lacks the spacer or rim protector the lineup needs.',
    trigger: 'fit_conflict',
    severity: 'info',
    lesson_id: '10000000-0000-0000-0000-000000000007',
    lesson_title: 'Value Creation Versus Raw Production',
  },
  {
    id: 'value-reach',
    title: 'Value Reach',
    prompt: 'If two players grade similarly, choose the one with the more portable skill set unless your board has a clear organizational bet.',
    trigger: 'value_reach',
    severity: 'warning',
    lesson_id: '10000000-0000-0000-0000-000000000015',
    lesson_title: 'Prospect Risk And Outcome Ranges',
  },
  {
    id: 'scarcity',
    title: 'Positional Scarcity',
    prompt: 'Scarcity matters when a player solves a rare role, not simply because the position label sounds important.',
    trigger: 'positional_scarcity',
    severity: 'success',
    lesson_id: '10000000-0000-0000-0000-000000000012',
    lesson_title: 'Backup Center Or Fifth Shooter',
  },
];

router.get('/', (_req: Request, res: Response): void => {
  res.json({ moments: MOMENTS });
});

export default router;
