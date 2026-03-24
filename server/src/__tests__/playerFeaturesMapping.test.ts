import { describe, expect, it } from 'vitest';
import type { NbaScraperSeasonStatsRow } from '@nba-draft-sim/shared';
import { PLAYER_FEATURES_CORE_KEYS } from '@nba-draft-sim/shared';
import { mapSeasonRowToPlayerFeatures, nbaSeasonJsonRowToPlayerRawStats } from '../../services/playerFeaturesMapping';
import type { RoleSummary } from '../../services/features';

function stubRoleSummary(): RoleSummary {
  const role = {} as RoleSummary;
  for (const k of PLAYER_FEATURES_CORE_KEYS) {
    if (k === 'R') continue;
    role[k] = 0.22;
  }
  return role;
}

const SAMPLE_ROW: NbaScraperSeasonStatsRow = {
  playerId: '42',
  name: 'Test Player',
  team: 'TST',
  position: 'PG',
  GP: 82,
  MIN: 2000,
  PTS: 1200,
  REB: 400,
  AST: 400,
  STL: 80,
  BLK: 20,
  FGA: 900,
  FGM: 400,
  FTA: 200,
  FTM: 150,
  THREE_PA: 400,
  THREE_PM: 140,
  TOV: 150,
  ORB: 60,
  DRB: 340,
  PF: 180,
  TWO_PA: 500,
  TWO_PM: 260,
  TWO_P_PCT: 0.52,
  THREE_P_PCT: 0.35,
  FT_PCT: 0.75,
  TS_PCT: 0.58,
  POSS_EST: 1800,
  USG_PCT: 28.5,
  OREB_PCT: 4.2,
  DREB_PCT: 15.1,
  REB_PCT: 9.5,
  AST_PCT: 22.0,
  TOV_PCT: 12.0,
};

describe('playerFeaturesMapping', () => {
  it('normalizes scrape JSON to PlayerRawStats with numeric advanced fields', () => {
    const raw = nbaSeasonJsonRowToPlayerRawStats(SAMPLE_ROW);
    expect(raw.USG_PROXY).toBeCloseTo(0.285, 5);
    expect(raw.OREB_PCT).toBeCloseTo(4.2, 5);
    expect(raw.TS_PCT).toBeCloseTo(0.58, 5);
  });

  it('maps every PlayerFeatures core key from a full scrape row', () => {
    const role = stubRoleSummary();
    const features = mapSeasonRowToPlayerFeatures(SAMPLE_ROW, role);
    for (const key of PLAYER_FEATURES_CORE_KEYS) {
      const v = features[key];
      expect(v, key).toBeDefined();
      expect(Number.isFinite(v as number), key).toBe(true);
    }
  });

  it('keeps PLAYER_FEATURES_CORE_KEYS in sync with buildPlayerFeatures output shape', () => {
    expect(PLAYER_FEATURES_CORE_KEYS).toContain('R');
    expect(PLAYER_FEATURES_CORE_KEYS).toContain('VI');
    expect(PLAYER_FEATURES_CORE_KEYS.length).toBe(31);
  });
});
