/**
 * Feature Construction and Standardization
 * Implements Section 3 from pseudocode: builds features from raw stats
 */

import { PlayerRawStats, PlayerFeatures } from '@nba-draft-sim/shared';
import { calculateReliabilityFactor, shrinkToRoleAverage } from './reliability';
import { safeDivide, zscore } from '../utils/utils';

/**
 * Role averages structure (computed from league snapshot)
 */
export interface RoleSummary {
  avg_TS: number;
  avg_AST: number;
  avg_TOV: number;
  avg_3PA_rate: number;
  avg_FT_rate: number;
  avg_BLK: number;
  avg_STL: number;
  avg_REB: number;
  avg_usage_proxy: number;
}

/**
 * Build player features from raw stats with reliability shrinkage
 * Implements the build_player_features function from pseudocode
 */
export function buildPlayerFeatures(
  rawStats: PlayerRawStats,
  roleSummary: RoleSummary
): PlayerFeatures {
  // Calculate reliability factor
  const R = calculateReliabilityFactor(rawStats.GP, rawStats.MP_TOTAL);

  // Calculate and shrink True Shooting %
  const ts = shrinkToRoleAverage(rawStats.TS_PCT, roleSummary.avg_TS, R);

  // Calculate and shrink assists
  const ast = shrinkToRoleAverage(rawStats.AST, roleSummary.avg_AST, R);

  // Calculate and shrink turnovers
  const tov = shrinkToRoleAverage(rawStats.TOV, roleSummary.avg_TOV, R);

  // Assist to turnover ratio
  const a2t = safeDivide(ast, tov);

  // 3PA rate (3-point attempts per field goal attempt)
  const threePARate = safeDivide(rawStats.THREE_PA, rawStats.FGA);
  const shrunkenThreePARate = shrinkToRoleAverage(threePARate, roleSummary.avg_3PA_rate, R);

  // Free throw rate (FTA per FGA)
  const ftRate = safeDivide(rawStats.FTA, rawStats.FGA);
  const shrunkenFTRate = shrinkToRoleAverage(ftRate, roleSummary.avg_FT_rate, R);

  // Defensive stats - shrink blocks and steals
  const blk = shrinkToRoleAverage(rawStats.BLK, roleSummary.avg_BLK, R);
  const stl = shrinkToRoleAverage(rawStats.STL, roleSummary.avg_STL, R);

  // Rebounding - shrink total rebounds
  const reb = shrinkToRoleAverage(rawStats.REB, roleSummary.avg_REB, R);

  // Usage proxy: (FGA + 0.44*FTA + TOV) / MP
  const usageProxyRaw = safeDivide(
    rawStats.FGA + 0.44 * rawStats.FTA + rawStats.TOV,
    rawStats.MP_TOTAL
  );
  const usg = shrinkToRoleAverage(usageProxyRaw, roleSummary.avg_usage_proxy, R);

  return {
    R,
    TS: ts,
    AST: ast,
    TOV: tov,
    A2T: a2t,
    THREE_PA_RATE: shrunkenThreePARate,
    FT_RATE: shrunkenFTRate,
    BLK: blk,
    STL: stl,
    REB: reb,
    USG: usg,
  };
}

/**
 * Standardize features using z-scores
 * Returns a map of feature name to z-score value
 */
export function standardizeFeatures(
  features: PlayerFeatures,
  populationMean: Record<string, number>,
  populationStd: Record<string, number>
): Record<string, number> {
  const zScores: Record<string, number> = {};

  // Exclude reliability factor from standardization
  const featuresToStandardize: (keyof PlayerFeatures)[] = [
    'TS',
    'AST',
    'TOV',
    'A2T',
    'THREE_PA_RATE',
    'FT_RATE',
    'BLK',
    'STL',
    'REB',
    'USG',
  ];

  for (const feature of featuresToStandardize) {
    const value = features[feature];
    const mean = populationMean[feature] ?? 0;
    const std = populationStd[feature] ?? 1;
    zScores[feature] = zscore(value, mean, std);
  }

  return zScores;
}
