import { describe, expect, it } from 'vitest';
import type { PlayerAdvancedProfile, PlayerRawStats } from '@nba-draft-sim/shared';
import { buildPlayerAdvancedProfile, buildPlayerModel } from '../../services/features';

function baseRawStats(overrides: Partial<PlayerRawStats> = {}): PlayerRawStats {
  return {
    playerId: 'player-1',
    name: 'Test Player',
    team: 'TST',
    position: 'SG',
    AGE: 24,
    PTS: 1280,
    REB: 320,
    AST: 280,
    STL: 72,
    BLK: 26,
    TS_PCT: 0.58,
    MP_TOTAL: 1980,
    GP: 66,
    FGA: 980,
    FTA: 240,
    FTM: 190,
    TOV: 132,
    THREE_PA: 360,
    THREE_PM: 132,
    THREE_P_PCT: 0.367,
    FT_PCT: 0.792,
    ORB: 58,
    DRB: 262,
    PF: 142,
    TWO_PA: 620,
    TWO_PM: 298,
    TWO_P_PCT: 0.481,
    POTENTIAL_AST: 520,
    SECONDARY_AST: 72,
    PASSES_MADE: 2650,
    PASSES_RECEIVED: 2310,
    DEFLECTIONS: 118,
    CHARGES_DRAWN: 14,
    CONTESTED_SHOTS: 124,
    POSSESSIONS: 1790,
    TOUCHES: 4280,
    SCREEN_ASSISTS: 22,
    USG_PROXY: 0.27,
    AST_PCT_PROXY: 0.21,
    TOV_PCT_PROXY: 0.118,
    OREB_PCT: 4.8,
    DREB_PCT: 14.2,
    REB_PCT: 9.6,
    ...overrides,
  };
}

function neutralAdvancedRoleSummary(): PlayerAdvancedProfile {
  return {
    reliability: 0.5,
    minutesLoad: 0.5,
    durability: 0.5,
    shotCreation: 0.5,
    rimPressure: 0.5,
    finishing: 0.5,
    shootingGravity: 0.5,
    spacing: 0.5,
    freeThrowPressure: 0.5,
    playmaking: 0.5,
    secondaryCreation: 0.5,
    turnoverResistance: 0.5,
    offensiveRebounding: 0.5,
    defensiveRebounding: 0.5,
    perimeterDefense: 0.5,
    rimDeterrence: 0.5,
    transitionOffense: 0.5,
    transitionDefense: 0.5,
    foulDiscipline: 0.5,
    switchability: 0.5,
    onBallUsage: 0.5,
    offBallValue: 0.5,
    volatility: 0.5,
  };
}

describe('player model pipeline', () => {
  it('shrinks sparse-minute advanced profiles toward role priors and keeps every field bounded', () => {
    const sparseSample = baseRawStats({
      playerId: 'sparse',
      GP: 4,
      MP_TOTAL: 52,
      PTS: 74,
      AST: 24,
      TOV: 13,
      FGA: 44,
      FTA: 16,
      THREE_PA: 22,
      THREE_PM: 10,
      TS_PCT: 0.69,
      USG_PROXY: 0.39,
      AST_PCT_PROXY: 0.34,
      TOV_PCT_PROXY: 0.17,
      TOUCHES: 164,
      TIME_OF_POSSESSION: 238,
      PULL_UP_3PA: 11,
      DRIVE_FGA: 16,
      DRIVE_FTA: 10,
      ISOLATION_FREQ: 0.24,
      PNR_BALL_HANDLER_FREQ: 0.31,
      TRANSITION_FREQ: 0.21,
      TRANSITION_PPP: 1.34,
    });

    const rawProfile = buildPlayerAdvancedProfile(sparseSample);
    const shrunkProfile = buildPlayerAdvancedProfile(sparseSample, neutralAdvancedRoleSummary());

    for (const [key, value] of Object.entries(shrunkProfile)) {
      expect(Number.isFinite(value), key).toBe(true);
      expect(value, key).toBeGreaterThanOrEqual(0);
      expect(value, key).toBeLessThanOrEqual(1);
    }

    expect(shrunkProfile.reliability).toBeLessThan(0.5);
    expect(Math.abs(shrunkProfile.shotCreation - 0.5)).toBeLessThan(Math.abs(rawProfile.shotCreation - 0.5));
    expect(Math.abs(shrunkProfile.playmaking - 0.5)).toBeLessThan(Math.abs(rawProfile.playmaking - 0.5));
    expect(Math.abs(shrunkProfile.transitionOffense - 0.5)).toBeLessThan(Math.abs(rawProfile.transitionOffense - 0.5));
  });

  it('uses public priors as calibration signals without letting them fully override the model', () => {
    const base = baseRawStats({
      playerId: 'priors-base',
      AGE: 23,
      GP: 70,
      MP_TOTAL: 2180,
      PTS: 1490,
      AST: 410,
      REB: 410,
      FGA: 1110,
      FTA: 290,
      TOV: 148,
      USG_PROXY: 0.295,
      AST_PCT_PROXY: 0.255,
      TOV_PCT_PROXY: 0.123,
      TOUCHES: 4820,
      TIME_OF_POSSESSION: 1680,
    });

    const positive = buildPlayerModel({
      ...base,
      playerId: 'positive-priors',
      publicMetricPriors: {
        darkoDpm: 4.1,
        darkoOpm: 3.5,
        darkoDpmDefense: 1.9,
        rapm: 3.0,
        orapm: 2.7,
        drapm: 1.3,
        epm: 4.2,
        sourceCount: 7,
      },
    });

    const negative = buildPlayerModel({
      ...base,
      playerId: 'negative-priors',
      publicMetricPriors: {
        darkoDpm: -2.3,
        darkoOpm: -2.1,
        darkoDpmDefense: -0.8,
        rapm: -1.9,
        orapm: -1.5,
        drapm: -0.5,
        epm: -2.4,
        sourceCount: 7,
      },
    });

    const impactGap = positive.valueModel.gameImpact - negative.valueModel.gameImpact;

    expect(positive.valueModel.gameImpact).toBeGreaterThan(negative.valueModel.gameImpact);
    expect(positive.valueModel.tradeValue).toBeGreaterThan(negative.valueModel.tradeValue);
    expect(positive.advancedProfile.shotCreation).toBeGreaterThan(negative.advancedProfile.shotCreation);
    expect(positive.advancedProfile.perimeterDefense).toBeGreaterThan(negative.advancedProfile.perimeterDefense);
    expect(impactGap).toBeGreaterThan(2);
    expect(impactGap).toBeLessThan(15);
  });
});
