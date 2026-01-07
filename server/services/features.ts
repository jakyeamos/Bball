/**
 * Feature Construction and Standardization
 */

import { PlayerRawStats, PlayerFeatures } from '@nba-draft-sim/shared';
import { calculateReliabilityFactor, shrinkToRoleAverage } from './reliability';
import { safeDivide, zscore } from '../utils/utils';

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

  // NEW
  avg_PAR: number;
  avg_VI: number;
}

/**
 * Positive-only Versatility Index (entropy of per-minute contributions)
 * Uses PTS/REB/AST/STL/BLK only.
 * Returns 0..1.
 */
function computeVersatilityIndexPositiveOnly(raw: PlayerRawStats): number {
  const mp = Math.max(1e-9, raw.MP_TOTAL);

  const p = raw.PTS / mp;
  const r = raw.REB / mp;
  const a = raw.AST / mp;
  const s = raw.STL / mp;
  const b = raw.BLK / mp;

  const sum = p + r + a + s + b + 1e-9;
  const w = [p, r, a, s, b].map(x => x / sum);

  const entropy = -w.reduce((acc, wi) => acc + wi * Math.log(wi + 1e-9), 0);
  return entropy / Math.log(5);
}

/**
 * Build player features from raw stats with reliability shrinkage
 */
export function buildPlayerFeatures(
  rawStats: PlayerRawStats,
  roleSummary: RoleSummary
): PlayerFeatures {
  const R = calculateReliabilityFactor(rawStats.GP, rawStats.MP_TOTAL);

  const ts = shrinkToRoleAverage(rawStats.TS_PCT, roleSummary.avg_TS, R);
  const ast = shrinkToRoleAverage(rawStats.AST, roleSummary.avg_AST, R);
  const tov = shrinkToRoleAverage(rawStats.TOV, roleSummary.avg_TOV, R);

  const a2t = safeDivide(ast, tov);

  const threePARateRaw = safeDivide(rawStats.THREE_PA, rawStats.FGA);
  const threePARate = shrinkToRoleAverage(threePARateRaw, roleSummary.avg_3PA_rate, R);

  const ftRateRaw = safeDivide(rawStats.FTA, rawStats.FGA);
  const ftRate = shrinkToRoleAverage(ftRateRaw, roleSummary.avg_FT_rate, R);

  const blk = shrinkToRoleAverage(rawStats.BLK, roleSummary.avg_BLK, R);
  const stl = shrinkToRoleAverage(rawStats.STL, roleSummary.avg_STL, R);
  const reb = shrinkToRoleAverage(rawStats.REB, roleSummary.avg_REB, R);

  const usageProxyRaw = safeDivide(
    rawStats.FGA + 0.44 * rawStats.FTA + rawStats.TOV,
    rawStats.MP_TOTAL
  );
  const usg = shrinkToRoleAverage(usageProxyRaw, roleSummary.avg_usage_proxy, R);

  // NEW: Pomeroy Assist Ratio
  const parRaw = safeDivide(ast, ast + tov); // AST / (AST + TOV)
  const par = shrinkToRoleAverage(parRaw, roleSummary.avg_PAR, R);

  // NEW: Versatility Index (positive-only)
  const viRaw = computeVersatilityIndexPositiveOnly(rawStats);
  const vi = shrinkToRoleAverage(viRaw, roleSummary.avg_VI, R);

  // NOTE: PlayerFeatures in your current shared types does not include PAR/VI yet.
  // This return will typecheck once you add them to PlayerFeatures.
  return {
    R,
    TS: ts,
    AST: ast,
    TOV: tov,
    A2T: a2t,
    THREE_PA_RATE: threePARate,
    FT_RATE: ftRate,
    BLK: blk,
    STL: stl,
    REB: reb,
    USG: usg,
    PAR: par,
    VI: vi,
  };
}

export function standardizeFeatures(
  features: PlayerFeatures,
  populationMean: Record<string, number>,
  populationStd: Record<string, number>
): Record<string, number> {
  const zScores: Record<string, number> = {};

  const keys = [
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
    'PAR',
    'VI',
  ] as const;

  for (const k of keys) {
    const value = (features as any)[k] as number; // allow PAR/VI until types updated
    const mean = populationMean[k] ?? 0;
    const std = populationStd[k] ?? 1;
    zScores[k] = zscore(value, mean, std);
  }

  return zScores;
}
