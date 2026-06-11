import { Request, Response, Router } from 'express';
import {
  FrontOfficeLeagueDataset,
  FrontOfficeTransactionGraph,
} from '@nba-draft-sim/shared';
import { validateTransactionGraph } from '../offseason/cba/validateTransactionGraph';

interface FrontOfficeTransactionPreviewRequest {
  dataset: FrontOfficeLeagueDataset;
  transaction_graph: FrontOfficeTransactionGraph;
}

const router = Router();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasDatasetCollections(value: Record<string, unknown>): boolean {
  return (
    Array.isArray(value.teams) &&
    Array.isArray(value.players) &&
    Array.isArray(value.contracts) &&
    Array.isArray(value.free_agent_rights) &&
    Array.isArray(value.exceptions) &&
    Array.isArray(value.draft_assets)
  );
}

function hasTransactionGraphCollections(value: Record<string, unknown>): boolean {
  return Array.isArray(value.team_ids) && Array.isArray(value.movements);
}

function parsePreviewRequest(
  body: unknown
): FrontOfficeTransactionPreviewRequest | null {
  if (!isRecord(body)) {
    return null;
  }

  if (!isRecord(body.dataset) || !isRecord(body.transaction_graph)) {
    return null;
  }

  if (
    !hasDatasetCollections(body.dataset) ||
    !hasTransactionGraphCollections(body.transaction_graph)
  ) {
    return null;
  }

  return {
    dataset: body.dataset as unknown as FrontOfficeLeagueDataset,
    transaction_graph:
      body.transaction_graph as unknown as FrontOfficeTransactionGraph,
  };
}

router.post('/preview', (req: Request, res: Response): void => {
  const payload = parsePreviewRequest(req.body);

  if (!payload) {
    res.status(400).json({
      error:
        'Request body must include dataset and transaction_graph objects for preview.',
    });
    return;
  }

  const preview = validateTransactionGraph(
    payload.dataset,
    payload.transaction_graph
  );

  res.json({ preview });
});

export default router;
