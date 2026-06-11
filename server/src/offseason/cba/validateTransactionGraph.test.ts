import { describe, expect, it } from 'vitest';
import {
  FrontOfficeLeagueDataset,
  FrontOfficeTransactionGraph,
} from '@nba-draft-sim/shared';
import { buildCompleteFrontOfficeDataset } from './fixtures';
import { validateTransactionGraph } from './validateTransactionGraph';

function buildPlayerSwapGraph(
  dataset: FrontOfficeLeagueDataset
): FrontOfficeTransactionGraph {
  const firstTeam = dataset.teams[0];
  const secondTeam = dataset.teams[1];
  const firstPlayerId = firstTeam.active_roster_player_ids[0];
  const secondPlayerId = secondTeam.active_roster_player_ids[0];

  return {
    id: 'fixture-player-swap',
    league_date: '2026-07-06T00:00:00.000Z',
    created_by_team_id: firstTeam.identity.id,
    team_ids: [firstTeam.identity.id, secondTeam.identity.id],
    movements: [
      {
        kind: 'player',
        from_team_id: firstTeam.identity.id,
        to_team_id: secondTeam.identity.id,
        player_id: firstPlayerId,
      },
      {
        kind: 'player',
        from_team_id: secondTeam.identity.id,
        to_team_id: firstTeam.identity.id,
        player_id: secondPlayerId,
      },
    ],
  };
}

describe('validateTransactionGraph', () => {
  it('previews a valid two-team player swap with roster and salary deltas', () => {
    const dataset = buildCompleteFrontOfficeDataset();
    const graph = buildPlayerSwapGraph(dataset);

    const preview = validateTransactionGraph(
      dataset,
      graph,
      '2026-05-19T00:00:00.000Z'
    );

    expect(preview.validation_report.status).toBe('valid');
    expect(preview.validation_report.issues).toEqual([]);
    expect(preview.team_deltas).toHaveLength(2);
    expect(preview.team_deltas[0]).toEqual(
      expect.objectContaining({
        team_id: dataset.teams[0].identity.id,
        outgoing_player_ids: [dataset.teams[0].active_roster_player_ids[0]],
        incoming_player_ids: [dataset.teams[1].active_roster_player_ids[0]],
        standard_roster_count_after: 1,
        salary_delta_millions: 0,
      })
    );
  });

  it('fails closed when a player is not trade eligible on the graph date', () => {
    const dataset = buildCompleteFrontOfficeDataset();
    dataset.contracts[0] = {
      ...dataset.contracts[0],
      trade_eligible_at: '2026-08-01T00:00:00.000Z',
    };

    const preview = validateTransactionGraph(
      dataset,
      buildPlayerSwapGraph(dataset),
      '2026-05-19T00:00:00.000Z'
    );

    expect(preview.validation_report.status).toBe('invalid');
    expect(preview.validation_report.issues).toContainEqual(
      expect.objectContaining({
        id: 'player-trade-eligibility',
        player_id: dataset.teams[0].active_roster_player_ids[0],
        rule_ids: ['trade-player-eligibility'],
      })
    );
    expect(preview.citations.map((citation) => citation.rule_id)).toContain(
      'trade-player-eligibility'
    );
  });

  it('rejects encumbered draft assets before execution', () => {
    const dataset = buildCompleteFrontOfficeDataset();
    const firstTeam = dataset.teams[0];
    const secondTeam = dataset.teams[1];
    const assetId = firstTeam.draft_asset_ids[0];
    dataset.draft_assets[0] = {
      ...dataset.draft_assets[0],
      encumbered: true,
    };

    const graph: FrontOfficeTransactionGraph = {
      id: 'fixture-pick-trade',
      league_date: '2026-07-06T00:00:00.000Z',
      created_by_team_id: firstTeam.identity.id,
      team_ids: [firstTeam.identity.id, secondTeam.identity.id],
      movements: [
        {
          kind: 'draft_asset',
          from_team_id: firstTeam.identity.id,
          to_team_id: secondTeam.identity.id,
          asset_id: assetId,
        },
      ],
    };

    const preview = validateTransactionGraph(
      dataset,
      graph,
      '2026-05-19T00:00:00.000Z'
    );

    expect(preview.validation_report.status).toBe('invalid');
    expect(preview.validation_report.issues).toContainEqual(
      expect.objectContaining({
        id: 'draft-asset-encumbered',
        asset_id: assetId,
        rule_ids: ['draft-pick-ledger'],
      })
    );
    expect(preview.suggested_fixes).toContain(
      'Remove encumbered draft assets or replace them with tradeable picks.'
    );
  });

  it('rejects cash movements above the season trade cash limit', () => {
    const dataset = buildCompleteFrontOfficeDataset();
    const firstTeam = dataset.teams[0];
    const secondTeam = dataset.teams[1];

    const graph: FrontOfficeTransactionGraph = {
      id: 'fixture-cash-limit',
      league_date: '2026-07-06T00:00:00.000Z',
      created_by_team_id: firstTeam.identity.id,
      team_ids: [firstTeam.identity.id, secondTeam.identity.id],
      movements: [
        {
          kind: 'cash',
          from_team_id: firstTeam.identity.id,
          to_team_id: secondTeam.identity.id,
          amount_millions: 8,
        },
      ],
    };

    const preview = validateTransactionGraph(
      dataset,
      graph,
      '2026-05-19T00:00:00.000Z'
    );

    expect(preview.validation_report.status).toBe('invalid');
    expect(preview.validation_report.issues).toContainEqual(
      expect.objectContaining({
        id: 'cash-sent-limit',
        team_id: firstTeam.identity.id,
        rule_ids: ['trade-cash-limit'],
      })
    );
    expect(preview.validation_report.issues).toContainEqual(
      expect.objectContaining({
        id: 'cash-received-limit',
        team_id: secondTeam.identity.id,
        rule_ids: ['trade-cash-limit'],
      })
    );
  });
});
