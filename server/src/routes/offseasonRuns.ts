import { Request, Response, Router } from 'express';
import {
  OffseasonRunState,
  createInitialOffseasonRunState,
  offseasonDraftPickSchema,
  offseasonFreeAgencyOfferSchema,
  featureFlags,
  offseasonCoachingHireSchema,
  offseasonScoutingBoardUpdateSchema,
  offseasonTradeProposalSchema,
  offseasonPhaseTransitionSchema,
  offseasonRunSchema,
  offseasonTeamContextSchema,
} from '@nba-draft-sim/shared';
import { updateStore } from '../lib/courtVisionStore';
import { getRequestUserId } from '../lib/requestIdentity';
import { validateBody } from '../middleware/validateBody';
import { hireCoachForRun } from '../offseason/decisionEngine';
import {
  findCoachProfileById,
  listCoachProfiles,
} from '../offseason/coachTendencyEffects';
import { migrateOffseasonRunState } from '../offseason/migrations';
import {
  applyScoutingBoardToRun,
  buildInitialScoutingBoard,
  reorderScoutingBoard,
} from '../offseason/scoutingEngine';
import { applyDraftPickToRun } from '../offseason/draftNightEngine';
import { transitionRunPhase } from '../offseason/stateMachine';
import { buildTeamContextForTeam, listAvailableTeams } from '../offseason/teamContext';
import { applyTradeProposalToRun } from '../offseason/tradeEvaluator';
import {
  applyFreeAgencyOfferToRun,
  listFreeAgencyTargets,
} from '../offseason/freeAgencyEngine';
import { buildOffseasonRecap } from '../offseason/recapEngine';

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

function isCoachingMarketEnabled(): boolean {
  return (
    featureFlags.offseasonFoundationEnabled &&
    featureFlags.offseasonTeamContextEnabled &&
    featureFlags.offseasonCoachingMarketEnabled
  );
}

function isScoutingEnabled(): boolean {
  return (
    isCoachingMarketEnabled() &&
    featureFlags.offseasonScoutingEnabled
  );
}

function isTradeMarketEnabled(): boolean {
  return isScoutingEnabled() && featureFlags.offseasonTradeMarketEnabled;
}

function isDraftNightEnabled(): boolean {
  return isTradeMarketEnabled() && featureFlags.offseasonDraftNightEnabled;
}

function isFreeAgencyEnabled(): boolean {
  return isDraftNightEnabled() && featureFlags.offseasonFreeAgencyEnabled;
}

function isDecisionLoopEnabled(): boolean {
  return isFreeAgencyEnabled() && featureFlags.offseasonDecisionLoopEnabled;
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

router.get(
  '/:run_id/coaching-market',
  async (req: Request, res: Response): Promise<void> => {
    if (!isCoachingMarketEnabled()) {
      res.status(404).json({
        error: 'Offseason Coaching Market is disabled by feature flag.',
      });
      return;
    }

    const runId = req.params.run_id;
    const userId = getRequestUserId(req);
    const runs = await readUserRuns(userId);
    const run = runs.find((candidate) => candidate.run_id === runId) ?? null;

    if (!run) {
      res.status(404).json({ error: 'Offseason run not found.' });
      return;
    }

    if (run.phase !== 'coaching_market') {
      res.status(409).json({
        error:
          'Run is not currently in the Coaching Market phase. Complete Team Context first.',
      });
      return;
    }

    const coaches = listCoachProfiles();
    res.json({ run, coaches });
  }
);

router.post(
  '/:run_id/coaching-market/hire',
  validateBody(offseasonCoachingHireSchema),
  async (req: Request, res: Response): Promise<void> => {
    if (!isCoachingMarketEnabled()) {
      res.status(404).json({
        error: 'Offseason Coaching Market is disabled by feature flag.',
      });
      return;
    }

    const runId = req.params.run_id;
    const userId = getRequestUserId(req);
    const payload = res.locals.validatedBody as { coach_id: string };
    const coach = findCoachProfileById(payload.coach_id);

    if (!coach) {
      res.status(404).json({
        error: `Coach not found for coach_id=${payload.coach_id}.`,
      });
      return;
    }

    const now = new Date().toISOString();
    let updatedRun: OffseasonRunState | null = null;

    await updateStore((store) => {
      const runs = store.offseason_runs_by_user[userId] ?? [];
      const index = runs.findIndex((candidate) => candidate.run_id === runId);
      if (index < 0) {
        return;
      }

      const migrated = migrateOffseasonRunState(runs[index]).state;

      if (migrated.phase !== 'coaching_market') {
        return;
      }

      updatedRun = hireCoachForRun(migrated, coach, now);
      runs[index] = updatedRun;
      store.offseason_runs_by_user[userId] = sortRunsByRecency(runs);
    });

    if (!updatedRun) {
      res.status(409).json({
        error:
          'Unable to hire coach. Confirm the run exists and is in Coaching Market.',
      });
      return;
    }

    res.json({ run: updatedRun });
  }
);

router.get(
  '/:run_id/scouting-board',
  async (req: Request, res: Response): Promise<void> => {
    if (!isScoutingEnabled()) {
      res.status(404).json({
        error: 'Offseason Scouting is disabled by feature flag.',
      });
      return;
    }

    const runId = req.params.run_id;
    const userId = getRequestUserId(req);
    const now = new Date().toISOString();
    let updatedRun: OffseasonRunState | null = null;
    let phaseMismatch = false;

    await updateStore(async (store) => {
      const runs = store.offseason_runs_by_user[userId] ?? [];
      const index = runs.findIndex((candidate) => candidate.run_id === runId);

      if (index < 0) {
        return;
      }

      const migrated = migrateOffseasonRunState(runs[index]).state;
      if (migrated.phase !== 'scouting_pre_draft') {
        phaseMismatch = true;
        return;
      }

      let prospects = migrated.scouting_pre_draft.prospects;
      if (prospects.length === 0) {
        prospects = await buildInitialScoutingBoard(migrated);
      }

      updatedRun = applyScoutingBoardToRun(migrated, prospects, now);
      runs[index] = updatedRun;
      store.offseason_runs_by_user[userId] = sortRunsByRecency(runs);
    });

    if (phaseMismatch) {
      res.status(409).json({
        error:
          'Run is not currently in Scouting Pre-Draft. Hire a coach and transition first.',
      });
      return;
    }

    if (!updatedRun) {
      res.status(404).json({ error: 'Offseason run not found.' });
      return;
    }

    const resolvedRun = updatedRun as OffseasonRunState;

    res.json({
      run: resolvedRun,
      prospects: resolvedRun.scouting_pre_draft.prospects,
    });
  }
);

router.post(
  '/:run_id/scouting-board/rank',
  validateBody(offseasonScoutingBoardUpdateSchema),
  async (req: Request, res: Response): Promise<void> => {
    if (!isScoutingEnabled()) {
      res.status(404).json({
        error: 'Offseason Scouting is disabled by feature flag.',
      });
      return;
    }

    const runId = req.params.run_id;
    const userId = getRequestUserId(req);
    const payload = res.locals.validatedBody as { ranked_player_ids: number[] };
    const now = new Date().toISOString();
    let updatedRun: OffseasonRunState | null = null;

    await updateStore((store) => {
      const runs = store.offseason_runs_by_user[userId] ?? [];
      const index = runs.findIndex((candidate) => candidate.run_id === runId);
      if (index < 0) {
        return;
      }

      const migrated = migrateOffseasonRunState(runs[index]).state;
      if (migrated.phase !== 'scouting_pre_draft') {
        return;
      }

      if (migrated.scouting_pre_draft.prospects.length === 0) {
        return;
      }

      const reordered = reorderScoutingBoard(
        migrated.scouting_pre_draft.prospects,
        payload.ranked_player_ids
      );
      updatedRun = applyScoutingBoardToRun(migrated, reordered, now);
      runs[index] = updatedRun;
      store.offseason_runs_by_user[userId] = sortRunsByRecency(runs);
    });

    if (!updatedRun) {
      res.status(409).json({
        error:
          'Unable to update scouting board. Ensure the run is in Scouting Pre-Draft with a loaded board.',
      });
      return;
    }

    const resolvedRun = updatedRun as OffseasonRunState;

    res.json({
      run: resolvedRun,
      prospects: resolvedRun.scouting_pre_draft.prospects,
    });
  }
);

router.post(
  '/:run_id/trade-market/proposals',
  validateBody(offseasonTradeProposalSchema),
  async (req: Request, res: Response): Promise<void> => {
    if (!isTradeMarketEnabled()) {
      res.status(404).json({
        error: 'Offseason Trade Market is disabled by feature flag.',
      });
      return;
    }

    const runId = req.params.run_id;
    const userId = getRequestUserId(req);
    const payload = res.locals.validatedBody as {
      offered_player_ids: number[];
      offered_pick_ids: string[];
      requested_player_ids: number[];
      requested_pick_ids: string[];
      decision: 'accepted' | 'rejected';
    };
    const now = new Date().toISOString();
    let updatedRun: OffseasonRunState | null = null;
    let proposalResult: ReturnType<typeof applyTradeProposalToRun>['proposal'] | null =
      null;

    await updateStore((store) => {
      const runs = store.offseason_runs_by_user[userId] ?? [];
      const index = runs.findIndex((candidate) => candidate.run_id === runId);
      if (index < 0) {
        return;
      }

      const migrated = migrateOffseasonRunState(runs[index]).state;
      if (migrated.phase !== 'trade_market') {
        return;
      }

      const evaluation = applyTradeProposalToRun(migrated, payload, now);
      updatedRun = evaluation.run;
      proposalResult = evaluation.proposal;
      runs[index] = updatedRun;
      store.offseason_runs_by_user[userId] = sortRunsByRecency(runs);
    });

    if (!updatedRun || !proposalResult) {
      res.status(409).json({
        error:
          'Unable to evaluate trade proposal. Ensure the run is in Trade Market.',
      });
      return;
    }

    res.json({
      run: updatedRun,
      proposal: proposalResult,
    });
  }
);

router.post(
  '/:run_id/draft-night/picks',
  validateBody(offseasonDraftPickSchema),
  async (req: Request, res: Response): Promise<void> => {
    if (!isDraftNightEnabled()) {
      res.status(404).json({
        error: 'Offseason Draft Night is disabled by feature flag.',
      });
      return;
    }

    const runId = req.params.run_id;
    const userId = getRequestUserId(req);
    const payload = res.locals.validatedBody as { player_id: number };
    const now = new Date().toISOString();
    let updatedRun: OffseasonRunState | null = null;
    let pickResult: ReturnType<typeof applyDraftPickToRun>['pick'] | null = null;

    try {
      await updateStore((store) => {
        const runs = store.offseason_runs_by_user[userId] ?? [];
        const index = runs.findIndex((candidate) => candidate.run_id === runId);
        if (index < 0) {
          return;
        }

        const migrated = migrateOffseasonRunState(runs[index]).state;
        if (migrated.phase !== 'draft_night') {
          return;
        }

        const draftResult = applyDraftPickToRun(migrated, payload, now);
        updatedRun = draftResult.run;
        pickResult = draftResult.pick;
        runs[index] = updatedRun;
        store.offseason_runs_by_user[userId] = sortRunsByRecency(runs);
      });
    } catch (error) {
      res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : 'Unable to process draft-night pick.',
      });
      return;
    }

    if (!updatedRun || !pickResult) {
      res.status(409).json({
        error: 'Unable to submit draft pick. Ensure the run is in Draft Night.',
      });
      return;
    }

    res.json({
      run: updatedRun,
      pick: pickResult,
    });
  }
);

router.get(
  '/:run_id/free-agency/targets',
  async (req: Request, res: Response): Promise<void> => {
    if (!isFreeAgencyEnabled()) {
      res.status(404).json({
        error: 'Offseason Free Agency is disabled by feature flag.',
      });
      return;
    }

    const runId = req.params.run_id;
    const userId = getRequestUserId(req);
    const runs = await readUserRuns(userId);
    const run = runs.find((candidate) => candidate.run_id === runId) ?? null;

    if (!run) {
      res.status(404).json({ error: 'Offseason run not found.' });
      return;
    }

    if (run.phase !== 'free_agency') {
      res.status(409).json({
        error:
          'Run is not currently in Free Agency. Complete Draft Night first.',
      });
      return;
    }

    const targets = listFreeAgencyTargets(run);
    res.json({ run, targets });
  }
);

router.post(
  '/:run_id/free-agency/offers',
  validateBody(offseasonFreeAgencyOfferSchema),
  async (req: Request, res: Response): Promise<void> => {
    if (!isFreeAgencyEnabled()) {
      res.status(404).json({
        error: 'Offseason Free Agency is disabled by feature flag.',
      });
      return;
    }

    const runId = req.params.run_id;
    const userId = getRequestUserId(req);
    const payload = res.locals.validatedBody as {
      player_id: number;
      contract_millions: number;
      decision: 'signed' | 'declined';
    };
    const now = new Date().toISOString();
    let updatedRun: OffseasonRunState | null = null;
    let signingResult: ReturnType<typeof applyFreeAgencyOfferToRun>['signing'] | null =
      null;

    try {
      await updateStore((store) => {
        const runs = store.offseason_runs_by_user[userId] ?? [];
        const index = runs.findIndex((candidate) => candidate.run_id === runId);
        if (index < 0) {
          return;
        }

        const migrated = migrateOffseasonRunState(runs[index]).state;
        if (migrated.phase !== 'free_agency') {
          return;
        }

        const freeAgencyResult = applyFreeAgencyOfferToRun(migrated, payload, now);
        updatedRun = freeAgencyResult.run;
        signingResult = freeAgencyResult.signing;
        runs[index] = updatedRun;
        store.offseason_runs_by_user[userId] = sortRunsByRecency(runs);
      });
    } catch (error) {
      res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : 'Unable to process free-agency offer.',
      });
      return;
    }

    if (!updatedRun || !signingResult) {
      res.status(409).json({
        error:
          'Unable to process free-agency offer. Ensure the run is in Free Agency.',
      });
      return;
    }

    res.json({
      run: updatedRun,
      signing: signingResult,
    });
  }
);

router.get(
  '/:run_id/recap',
  async (req: Request, res: Response): Promise<void> => {
    if (!isDecisionLoopEnabled()) {
      res.status(404).json({
        error: 'Offseason Decision Loop recap is disabled by feature flag.',
      });
      return;
    }

    const runId = req.params.run_id;
    const userId = getRequestUserId(req);
    const runs = await readUserRuns(userId);
    const run = runs.find((candidate) => candidate.run_id === runId) ?? null;

    if (!run) {
      res.status(404).json({ error: 'Offseason run not found.' });
      return;
    }

    if (run.phase !== 'post_offseason_recap' && run.phase !== 'complete') {
      res.status(409).json({
        error:
          'Run is not currently in Post-Offseason Recap. Complete Free Agency first.',
      });
      return;
    }

    const recap = buildOffseasonRecap(run);
    res.json({ run, recap });
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

      if (
        payload.next_phase === 'coaching_market' &&
        !isCoachingMarketEnabled()
      ) {
        res.status(404).json({
          error: 'Offseason Coaching Market is disabled by feature flag.',
        });
        return;
      }

      if (
        payload.next_phase === 'scouting_pre_draft' &&
        !isScoutingEnabled()
      ) {
        res.status(404).json({
          error: 'Offseason Scouting is disabled by feature flag.',
        });
        return;
      }

      if (
        payload.next_phase === 'trade_market' &&
        !isTradeMarketEnabled()
      ) {
        res.status(404).json({
          error: 'Offseason Trade Market is disabled by feature flag.',
        });
        return;
      }

      if (
        payload.next_phase === 'draft_night' &&
        !isDraftNightEnabled()
      ) {
        res.status(404).json({
          error: 'Offseason Draft Night is disabled by feature flag.',
        });
        return;
      }

      if (
        payload.next_phase === 'free_agency' &&
        !isFreeAgencyEnabled()
      ) {
        res.status(404).json({
          error: 'Offseason Free Agency is disabled by feature flag.',
        });
        return;
      }

      if (
        (payload.next_phase === 'post_offseason_recap' ||
          payload.next_phase === 'complete') &&
        !isDecisionLoopEnabled()
      ) {
        res.status(404).json({
          error: 'Offseason Decision Loop recap is disabled by feature flag.',
        });
        return;
      }

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
