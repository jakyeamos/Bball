import { describe, expect, it } from 'vitest';
import { buildCompleteFrontOfficeDataset } from './fixtures';

describe('front office dataset fixtures', () => {
  it('builds a complete 30-team dataset for validator tests', () => {
    const dataset = buildCompleteFrontOfficeDataset();

    expect(dataset.teams).toHaveLength(30);
    expect(dataset.players).toHaveLength(60);
    expect(dataset.contracts).toHaveLength(30);
    expect(dataset.free_agent_rights).toHaveLength(30);
    expect(dataset.exceptions).toHaveLength(30);
    expect(dataset.draft_assets).toHaveLength(60);
    expect(new Set(dataset.teams.map((team) => team.identity.id)).size).toBe(30);
  });
});
