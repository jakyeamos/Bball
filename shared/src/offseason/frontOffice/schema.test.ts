import { describe, expect, it } from 'vitest';
import {
  FRONT_OFFICE_DATASET_SCHEMA_VERSION,
  FRONT_OFFICE_LEAGUE_TEAM_COUNT,
  FRONT_OFFICE_VALIDATION_STATUSES,
  FrontOfficeTransactionGraph,
} from './schema';

describe('front office shared schema constants', () => {
  it('defines stable foundation constants', () => {
    expect(FRONT_OFFICE_DATASET_SCHEMA_VERSION).toBe(1);
    expect(FRONT_OFFICE_LEAGUE_TEAM_COUNT).toBe(30);
    expect(FRONT_OFFICE_VALIDATION_STATUSES).toEqual([
      'valid',
      'warning',
      'invalid',
    ]);
  });

  it('supports directed transaction graph movements', () => {
    const graph: FrontOfficeTransactionGraph = {
      id: 'test-graph',
      league_date: '2026-07-06T00:00:00.000Z',
      created_by_team_id: 1,
      team_ids: [1, 2],
      movements: [
        {
          kind: 'player',
          from_team_id: 1,
          to_team_id: 2,
          player_id: 100,
        },
        {
          kind: 'draft_asset',
          from_team_id: 2,
          to_team_id: 1,
          asset_id: 'pick-1',
        },
        {
          kind: 'cash',
          from_team_id: 1,
          to_team_id: 2,
          amount_millions: 1.5,
        },
      ],
    };

    expect(graph.movements.map((movement) => movement.kind)).toEqual([
      'player',
      'draft_asset',
      'cash',
    ]);
  });
});
