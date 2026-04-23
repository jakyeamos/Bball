import { Request, Response, Router } from 'express';
import {
  OffseasonRunState,
  createInitialOffseasonRunState,
  featureFlags,
  offseasonPhaseTransitionSchema,
  offseasonRunSchema,
  offseasonTeamContextSchema,
} from '@nba-draft-sim/shared';
import { updateStore } from '../lib/courtVisionStore';
import { getRequestUserId } from '../lib/requestIdentity';
import { validateBody } from '../middleware/validateBody';
import { migrateOffseasonRunState } from '../offseason/migrations';
import { transitionRunPhase } from '../offseason/stateMachine';
import { buildTeamContextForTeam, listAvailableTeams } from '../offseason/teamContext';

const router = Router();

function isOffseasonFoundationEnabled(): boolean {
  return featureFlags.offseasonFoundationEnabled;
}

function isTeamContextEnabled(): boolean {
  return (
    featureFlags.offseasonFoundationEnabled &&
    featureFlags.offseasonTeamContextEnabled
  );
}

function generateRunId(userId: string): string {
  return `offseason-${userId.slice(0, 8)}-${Date.now()}`;
}

function sortRunsByRecency(runs: OffseasonRunState[]): OffseasonRunState[] {
  return [...runs].sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

async function readUserRuns(userId: string): Promise<OffseasonRunState[]> {
  const runs = await updateStore((store) => store.offseason_runs_by_user[userId] ?? []);
  const normalizedRuns: OffseasonRunState[] = [];

  for (const run of runs) {
    const migration = migrateOffseasonRunState(run);
    normalizedRuns.push(migration.state);
  }

  const hasChanged =
    normalizedRuns.length !== runs.length ||
    normalizedRuns.some((normalized, index) => normalized !== runs[index]);

  if (hasChanged) {
    await updateStore((store) => {
      store.offseason_runs_by_user[userId] = normalizedRuns;
    });
  }

  return sortRunsByRecency(normalizedRuns);
}

router.get('/teams', async (_req: Request, res: Response): Promise<void> => {
  if (!isTeamContextEnabled()) {
    res.status(404).json({
      error: 'Offseason Team Context is disabled by feature flag.',
    });
    return;
  }

  const teams = await listAvailableTeams();
  res.json({ teams });
});

router.get('/active', async (req: Request, res: Response): Promise<void> => {
  if (!isOffseasonFoundationEnabled()) {
    res.status(404).json({
      error: 'Offseason foundation is disabled by feature flag.',
    });
    return;
  }

  const userId = getRequestUserId(req);
  const runId =
    typeof req.query.run_id === 'string' ? req.query.run_id : undefined;

  const runs = await readUserRuns(userId);
  const run = runId
    ? runs.find((candidate) => candidate.run_id === runId) ?? null
    : runs[0] ?? null;

  res.json({ run });
});

router.post(
  '/',
  validateBody(offseasonRunSchema),
  async (req: Request, res: Response): Promise<void> => {
    if (!isTeamContextEnabled()) {
      res.status(404).json({
        error: 'Offseason Team Context is disabled by feature flag.',
      });
      return;
    }

    const userId = getRequestUserId(req);
    const payload = res.locals.validatedBody as { season_year: number };
    const now = new Date().toISOString();

    const run = createInitialOffseasonRunState({
      run_id: generateRunId(userId),
      season_year: payload.season_year,
      now_iso: now,
    });

    await updateStore((store) => {
      const existing = store.offseason_runs_by_user[userId] ?? [];
      store.offseason_runs_by_user[userId] = [run, ...existing];
    });

    res.status(201).json({ run });
  }
);

router.post(
  '/:run_id/team-context',
  validateBody(offseasonTeamContextSchema),
  async (req: Request, res: Response): Promise<void> => {
    if (!isTeamContextEnabled()) {
      res.status(404).json({
        error: 'Offseason Team Context is disabled by feature flag.',
      });
      return;
    }

    try {
      const runId = req.params.run_id;
      const userId = getRequestUserId(req);
      const payload = res.locals.validatedBody as { team_id: number };
      const context = await buildTeamContextForTeam(payload.team_id);
      const now = new Date().toISOString();

      let updatedRun: OffseasonRunState | null = null;

      await updateStore((store) => {
        const runs = store.offseason_runs_by_user[userId] ?? [];
        const index = runs.findIndex((candidate) => candidate.run_id === runId);

        if (index < 0) {
          return;
        }

        const migrated = migrateOffseasonRunState(runs[index]).state;
        updatedRun = {
          ...migrated,
          updated_at: now,
          team_context: context,
        };
        runs[index] = updatedRun;
        store.offseason_runs_by_user[userId] = sortRunsByRecency(runs);
      });

      if (!updatedRun) {
        res.status(404).json({ error: 'Offseason run not found.' });
        return;
      }

      res.json({ run: updatedRun });
    } catch (error) {
      res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : 'Unable to update Team Context for offseason run.',
      });
    }
  }
);

router.post(
  '/:run_id/transition',
  validateBody(offseasonPhaseTransitionSchema),
  async (req: Request, res: Response): Promise<void> => {
    if (!isOffseasonFoundationEnabled()) {
      res.status(404).json({
        error: 'Offseason foundation is disabled by feature flag.',
      });
      return;
    }

    try {
      const runId = req.params.run_id;
      const userId = getRequestUserId(req);
      const payload = res.locals.validatedBody as {
        expected_phase: OffseasonRunState['phase'];
        next_phase: OffseasonRunState['phase'];
      };
      const now = new Date().toISOString();
      let nextRun: OffseasonRunState | null = null;

      await updateStore((store) => {
        const runs = store.offseason_runs_by_user[userId] ?? [];
        const index = runs.findIndex((candidate) => candidate.run_id === runId);
        if (index < 0) {
          return;
        }

        const migrated = migrateOffseasonRunState(runs[index]).state;

        if (migrated.phase !== payload.expected_phase) {
          return;
        }

        nextRun = transitionRunPhase(migrated, payload.next_phase, now);
        runs[index] = nextRun;
        store.offseason_runs_by_user[userId] = sortRunsByRecency(runs);
      });

      if (!nextRun) {
        res.status(409).json({
          error:
            'Unable to transition offseason run. Check run existence and expected_phase.',
        });
        return;
      }

      res.json({ run: nextRun });
    } catch (error) {
      res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : 'Unable to transition offseason run.',
      });
    }
  }
);

export default router;
