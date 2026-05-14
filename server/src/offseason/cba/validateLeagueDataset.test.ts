import { describe, expect, it } from 'vitest';
import { buildCompleteFrontOfficeDataset } from './fixtures';
import { validateLeagueDataset } from './validateLeagueDataset';

describe('validateLeagueDataset', () => {
  it('passes a complete 30-team fixture dataset', () => {
    const report = validateLeagueDataset(
      buildCompleteFrontOfficeDataset(),
      '2026-05-14T00:00:00.000Z'
    );

    expect(report.status).toBe('valid');
    expect(report.issues).toEqual([]);
  });

  it('fails closed when the league does not include all 30 teams', () => {
    const dataset = buildCompleteFrontOfficeDataset();
    dataset.teams = dataset.teams.slice(0, 29);

    const report = validateLeagueDataset(
      dataset,
      '2026-05-14T00:00:00.000Z'
    );

    expect(report.status).toBe('invalid');
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        id: 'league-team-count',
        message: 'League dataset must include exactly 30 teams.',
        rule_ids: ['league-dataset-completeness'],
      })
    );
  });

  it('fails when a roster player references a missing contract', () => {
    const dataset = buildCompleteFrontOfficeDataset();
    dataset.players[0] = {
      ...dataset.players[0],
      contract_id: 'missing-contract',
    };

    const report = validateLeagueDataset(
      dataset,
      '2026-05-14T00:00:00.000Z'
    );

    expect(report.status).toBe('invalid');
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        id: 'player-contract-reference',
        player_id: dataset.players[0].id,
        rule_ids: ['league-dataset-completeness', 'salary-cap-system'],
      })
    );
  });

  it('fails when a team references a missing draft asset', () => {
    const dataset = buildCompleteFrontOfficeDataset();
    dataset.teams[0] = {
      ...dataset.teams[0],
      draft_asset_ids: ['missing-pick'],
    };

    const report = validateLeagueDataset(
      dataset,
      '2026-05-14T00:00:00.000Z'
    );

    expect(report.status).toBe('invalid');
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        id: 'team-draft-asset-reference',
        team_id: dataset.teams[0].identity.id,
        asset_id: 'missing-pick',
        rule_ids: ['league-dataset-completeness', 'draft-pick-ledger'],
      })
    );
  });

  it('fails when duplicate player ids exist', () => {
    const dataset = buildCompleteFrontOfficeDataset();
    dataset.players[1] = {
      ...dataset.players[1],
      id: dataset.players[0].id,
    };

    const report = validateLeagueDataset(
      dataset,
      '2026-05-14T00:00:00.000Z'
    );

    expect(report.status).toBe('invalid');
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        id: 'duplicate-player-id',
        player_id: dataset.players[0].id,
        rule_ids: ['league-dataset-completeness'],
      })
    );
  });
});
