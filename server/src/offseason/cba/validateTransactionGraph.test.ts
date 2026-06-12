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

function setContractSalary(
  dataset: FrontOfficeLeagueDataset,
  contractIndex: number,
  salaryMillions: number
): void {
  dataset.contracts[contractIndex] = {
    ...dataset.contracts[contractIndex],
    seasons: [
      {
        ...dataset.contracts[contractIndex].seasons[0],
        salary_millions: salaryMillions,
        guaranteed_millions: salaryMillions,
      },
    ],
  };
}

function addStandardPlayer(
  dataset: FrontOfficeLeagueDataset,
  teamIndex: number,
  playerId: number,
  salaryMillions: number
): void {
  const team = dataset.teams[teamIndex];
  const contractId = `${team.identity.abbreviation}-contract-${playerId}`;

  team.active_roster_player_ids.push(playerId);
  team.contract_ids.push(contractId);
  dataset.players.push({
    id: playerId,
    full_name: `Player ${playerId}`,
    position: 'F',
    roster_slot: 'standard',
    contract_id: contractId,
    rights_team_id: null,
  });
  dataset.contracts.push({
    id: contractId,
    player_id: playerId,
    team_id: team.identity.id,
    signed_at: '2025-07-06T00:00:00.000Z',
    seasons: [
      {
        season_year: 2026,
        salary_millions: salaryMillions,
        guarantee_type: 'fully_guaranteed',
        guaranteed_millions: salaryMillions,
        option_type: 'none',
      },
    ],
    bird_rights_type: 'bird',
    years_of_service: 4,
    trade_eligible_at: '2025-12-15T00:00:00.000Z',
    recently_traded_until: null,
  });
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

  it('rejects player trades that miss salary matching', () => {
    const dataset = buildCompleteFrontOfficeDataset();
    dataset.teams[0] = {
      ...dataset.teams[0],
      tax_salary_millions: 150,
    };
    setContractSalary(dataset, 0, 1);
    setContractSalary(dataset, 1, 20);

    const preview = validateTransactionGraph(
      dataset,
      buildPlayerSwapGraph(dataset),
      '2026-05-19T00:00:00.000Z'
    );

    expect(preview.validation_report.status).toBe('invalid');
    expect(preview.validation_report.issues).toContainEqual(
      expect.objectContaining({
        id: 'salary-matching',
        team_id: dataset.teams[0].identity.id,
        rule_ids: ['trade-salary-matching', 'salary-cap-system'],
      })
    );
    expect(preview.suggested_fixes).toContain(
      'Add outgoing salary, remove incoming salary, or create cap room before execution.'
    );
  });

  it('rejects first-apron teams taking back more salary than they send', () => {
    const dataset = buildCompleteFrontOfficeDataset();
    dataset.teams[0] = {
      ...dataset.teams[0],
      apron_status: 'first_apron',
      tax_salary_millions: 196,
    };
    setContractSalary(dataset, 0, 20);
    setContractSalary(dataset, 1, 21);

    const preview = validateTransactionGraph(
      dataset,
      buildPlayerSwapGraph(dataset),
      '2026-05-19T00:00:00.000Z'
    );

    expect(preview.validation_report.status).toBe('invalid');
    expect(preview.validation_report.issues).toContainEqual(
      expect.objectContaining({
        id: 'first-apron-incoming-salary',
        team_id: dataset.teams[0].identity.id,
        rule_ids: ['apron-system', 'trade-salary-matching'],
      })
    );
  });

  it('rejects second-apron aggregation before execution', () => {
    const dataset = buildCompleteFrontOfficeDataset();
    const firstTeam = dataset.teams[0];
    const secondTeam = dataset.teams[1];
    const extraPlayerId = 900001;
    dataset.teams[0] = {
      ...firstTeam,
      apron_status: 'second_apron',
      tax_salary_millions: 220,
      active_roster_player_ids: [...firstTeam.active_roster_player_ids],
      contract_ids: [...firstTeam.contract_ids],
    };
    addStandardPlayer(dataset, 0, extraPlayerId, 5);
    setContractSalary(dataset, 0, 5);
    setContractSalary(dataset, 1, 8);

    const graph: FrontOfficeTransactionGraph = {
      id: 'fixture-second-apron-aggregation',
      league_date: '2026-07-06T00:00:00.000Z',
      created_by_team_id: firstTeam.identity.id,
      team_ids: [firstTeam.identity.id, secondTeam.identity.id],
      movements: [
        {
          kind: 'player',
          from_team_id: firstTeam.identity.id,
          to_team_id: secondTeam.identity.id,
          player_id: firstTeam.active_roster_player_ids[0],
        },
        {
          kind: 'player',
          from_team_id: firstTeam.identity.id,
          to_team_id: secondTeam.identity.id,
          player_id: extraPlayerId,
        },
        {
          kind: 'player',
          from_team_id: secondTeam.identity.id,
          to_team_id: firstTeam.identity.id,
          player_id: secondTeam.active_roster_player_ids[0],
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
        id: 'second-apron-aggregation',
        team_id: firstTeam.identity.id,
        rule_ids: ['apron-system', 'trade-salary-matching'],
      })
    );
  });

  it('rejects second-apron teams sending cash', () => {
    const dataset = buildCompleteFrontOfficeDataset();
    const firstTeam = dataset.teams[0];
    const secondTeam = dataset.teams[1];
    dataset.teams[0] = {
      ...firstTeam,
      apron_status: 'second_apron',
      tax_salary_millions: 210,
    };

    const graph: FrontOfficeTransactionGraph = {
      id: 'fixture-second-apron-cash',
      league_date: '2026-07-06T00:00:00.000Z',
      created_by_team_id: firstTeam.identity.id,
      team_ids: [firstTeam.identity.id, secondTeam.identity.id],
      movements: [
        {
          kind: 'cash',
          from_team_id: firstTeam.identity.id,
          to_team_id: secondTeam.identity.id,
          amount_millions: 1,
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
        id: 'second-apron-cash',
        team_id: firstTeam.identity.id,
        rule_ids: ['apron-system', 'trade-cash-limit'],
      })
    );
  });

  it('rejects future first trades that violate Stepien coverage', () => {
    const dataset = buildCompleteFrontOfficeDataset();
    const firstTeam = dataset.teams[0];
    const secondTeam = dataset.teams[1];
    const assetId = firstTeam.draft_asset_ids[0];

    const graph: FrontOfficeTransactionGraph = {
      id: 'fixture-stepien',
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
        id: 'draft-stepien',
        team_id: firstTeam.identity.id,
        rule_ids: ['draft-stepien', 'draft-pick-ledger'],
      })
    );
  });

  it('rejects protected picks without controlled conversion fallback assets', () => {
    const dataset = buildCompleteFrontOfficeDataset();
    const firstTeam = dataset.teams[0];
    const secondTeam = dataset.teams[1];
    const assetId = firstTeam.draft_asset_ids[0];
    dataset.draft_assets[0] = {
      ...dataset.draft_assets[0],
      protections: [
        {
          year: 2026,
          protected_picks: [1, 2, 3, 4],
          converts_to_asset_ids: ['missing-conversion-pick'],
        },
      ],
    };

    const graph: FrontOfficeTransactionGraph = {
      id: 'fixture-protected-pick',
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
        id: 'draft-asset-protection-conveyance',
        team_id: firstTeam.identity.id,
        asset_id: assetId,
        rule_ids: ['draft-pick-ledger', 'draft-stepien'],
      })
    );
  });
});
