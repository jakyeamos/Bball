/**
 * server/services/features.ts
 *
 * UPDATED for Phase 2: 30 expanded features
 */

import { PlayerRawStats, PlayerFeatures } from '@nba-draft-sim/shared';

// ============================================================================
// RELIABILITY CALCULATION
// ============================================================================

export function calculateReliabilityFactor(gp: number, mpTotal: number): number {
  const minGames = 10;
  const minMinutes = 200;

  const gpFactor = Math.min(gp / minGames, 1.0);
  const mpFactor = Math.min(mpTotal / minMinutes, 1.0);

  return Math.sqrt(gpFactor * mpFactor);
}

// ============================================================================
// HELPER: ESTIMATE POSSESSIONS
// ============================================================================

function estimatePossessions(raw: PlayerRawStats): number {
  if (raw.POSSESSIONS) return raw.POSSESSIONS;

  // Estimate: 0.96 * (FGA + 0.44*FTA + TOV - OREB)
  const oreb = raw.ORB ?? 0;
  return Math.max(1, 0.96 * (raw.FGA + 0.44 * raw.FTA + raw.TOV - oreb));
}

// ============================================================================
// BUILD PLAYER FEATURES (30 features)
// ============================================================================

export function buildPlayerFeatures(
  rawStats: PlayerRawStats,
  roleSummary: RoleSummary
): PlayerFeatures {
  const R = calculateReliabilityFactor(rawStats.GP, rawStats.MP_TOTAL);
  const mp = Math.max(1, rawStats.MP_TOTAL);
  const gp = Math.max(1, rawStats.GP);
  const mp36 = mp / gp / 36;

  const possessions = estimatePossessions(rawStats);
  const poss100 = possessions / mp * 100;

  // Reliability shrinkage function
  const shrink = (playerVal: number, roleAvg: number) => {
    return R * playerVal + (1 - R) * roleAvg;
  };

  // ============================================================================
  // SHOOTING (9 features)
  // ============================================================================

  const TS = shrink(rawStats.TS_PCT, roleSummary.TS);
  const THREE_P_PCT = shrink(rawStats.THREE_P_PCT, roleSummary.THREE_P_PCT);
  const THREE_PA_RATE = shrink(rawStats.THREE_PA / mp * 36, roleSummary.THREE_PA_RATE);
  const TWO_P_PCT = shrink(rawStats.TWO_P_PCT, roleSummary.TWO_P_PCT);
  const TWO_PA_RATE = shrink(rawStats.TWO_PA / mp * 36, roleSummary.TWO_PA_RATE);
  const FT_PCT = shrink(rawStats.FT_PCT, roleSummary.FT_PCT);
  const FT_RATE = shrink(rawStats.FTA / rawStats.FGA, roleSummary.FT_RATE);

  // Effective FG%: (FGM + 0.5 * 3PM) / FGA
  const fgm = rawStats.TWO_PM + rawStats.THREE_PM;
  const efg = rawStats.FGA > 0 ? (fgm + 0.5 * rawStats.THREE_PM) / rawStats.FGA : 0;
  const EFG = shrink(efg, roleSummary.EFG);

  const THREE_P_VOLUME = shrink(rawStats.THREE_PA / mp * 36, roleSummary.THREE_P_VOLUME);

  // ============================================================================
  // PLAYMAKING (6 features)
  // ============================================================================

  const AST = shrink(rawStats.AST / mp * 36, roleSummary.AST);
  const AST_RATE = shrink(rawStats.AST / possessions * 100, roleSummary.AST_RATE);

  const potentialAst = rawStats.POTENTIAL_AST ?? (rawStats.AST * 1.5);
  const POTENTIAL_AST = shrink(potentialAst / mp * 36, roleSummary.POTENTIAL_AST);

  const passesMade = rawStats.PASSES_MADE ?? (rawStats.AST * 8);
  const astToPassRate = passesMade > 0 ? rawStats.AST / passesMade : 0;
  const AST_TO_PASS_RATE = shrink(astToPassRate, roleSummary.AST_TO_PASS_RATE);

  const secondaryAst = rawStats.SECONDARY_AST ?? (rawStats.AST * 0.3);
  const SECONDARY_AST = shrink(secondaryAst / mp * 36, roleSummary.SECONDARY_AST);

  // Pomeroy Assist Ratio: AST / (AST + TOV)
  const par = rawStats.AST + rawStats.TOV > 0
    ? rawStats.AST / (rawStats.AST + rawStats.TOV)
    : 0;
  const PAR = shrink(par, roleSummary.PAR);

  // ============================================================================
  // BALL SECURITY (3 features)
  // ============================================================================

  const TOV = shrink(rawStats.TOV / mp * 36, roleSummary.TOV);
  const TOV_RATE = shrink(rawStats.TOV / possessions * 100, roleSummary.TOV_RATE);

  // Assist-to-turnover ratio
  const a2t = rawStats.TOV > 0 ? rawStats.AST / rawStats.TOV : rawStats.AST;
  const A2T = shrink(a2t, roleSummary.A2T);

  // ============================================================================
  // DEFENSE (7 features)
  // ============================================================================

  const STL = shrink(rawStats.STL / mp * 36, roleSummary.STL);
  const BLK = shrink(rawStats.BLK / mp * 36, roleSummary.BLK);
  const STL_RATE = shrink(rawStats.STL / possessions * 100, roleSummary.STL_RATE);
  const BLK_RATE = shrink(rawStats.BLK / possessions * 100, roleSummary.BLK_RATE);

  const deflections = rawStats.DEFLECTIONS ?? (rawStats.STL * 3);
  const DEFLECTIONS = shrink(deflections / mp * 36, roleSummary.DEFLECTIONS);

  const PF_RATE = shrink(rawStats.PF / mp * 36, roleSummary.PF_RATE);

  const chargesDrawn = rawStats.CHARGES_DRAWN ?? 0;
  const CHARGES_DRAWN = shrink(chargesDrawn / mp * 36, roleSummary.CHARGES_DRAWN);

  // ============================================================================
  // REBOUNDING (3 features)
  // ============================================================================

  const OREB_PCT = shrink(rawStats.OREB_PCT ?? 0, roleSummary.OREB_PCT);
  const DREB_PCT = shrink(rawStats.DREB_PCT ?? 0, roleSummary.DREB_PCT);
  const REB_TOTAL = shrink(rawStats.REB / mp * 36, roleSummary.REB_TOTAL);

  // ============================================================================
  // USAGE & IMPACT (2 features)
  // ============================================================================

  const usageProxy = rawStats.USG_PROXY ??
    ((rawStats.FGA + 0.44 * rawStats.FTA + rawStats.TOV) / possessions);
  const USG = shrink(usageProxy, roleSummary.USG);

  // Versatility Index (simplified)
  const viScore = calculateVersatilityIndex(rawStats);
  const VI = shrink(viScore, roleSummary.VI);

  return {
    R,
    // Shooting
    TS,
    THREE_P_PCT,
    THREE_PA_RATE,
    TWO_P_PCT,
    TWO_PA_RATE,
    FT_PCT,
    FT_RATE,
    EFG,
    THREE_P_VOLUME,
    // Playmaking
    AST,
    AST_RATE,
    POTENTIAL_AST,
    AST_TO_PASS_RATE,
    SECONDARY_AST,
    PAR,
    // Ball Security
    TOV,
    TOV_RATE,
    A2T,
    // Defense
    STL,
    BLK,
    STL_RATE,
    BLK_RATE,
    DEFLECTIONS,
    PF_RATE,
    CHARGES_DRAWN,
    // Rebounding
    OREB_PCT,
    DREB_PCT,
    REB_TOTAL,
    // Usage
    USG,
    VI,
  };
}

// ============================================================================
// VERSATILITY INDEX CALCULATION
// ============================================================================

function calculateVersatilityIndex(raw: PlayerRawStats): number {
  const mp = Math.max(1, raw.MP_TOTAL);

  // Normalize stats to per-36
  const pts36 = raw.PTS / mp * 36;
  const reb36 = raw.REB / mp * 36;
  const ast36 = raw.AST / mp * 36;
  const stl36 = raw.STL / mp * 36;
  const blk36 = raw.BLK / mp * 36;

  // Count how many categories player contributes to (simplified)
  let categories = 0;
  if (pts36 >= 12) categories++;
  if (reb36 >= 4) categories++;
  if (ast36 >= 3) categories++;
  if (stl36 >= 1) categories++;
  if (blk36 >= 0.5) categories++;

  return categories / 5; // Normalize to 0-1
}

// ============================================================================
// ROLE SUMMARY TYPE
// ============================================================================

export interface RoleSummary {
  // Shooting
  TS: number;
  THREE_P_PCT: number;
  THREE_PA_RATE: number;
  TWO_P_PCT: number;
  TWO_PA_RATE: number;
  FT_PCT: number;
  FT_RATE: number;
  EFG: number;
  THREE_P_VOLUME: number;
  // Playmaking
  AST: number;
  AST_RATE: number;
  POTENTIAL_AST: number;
  AST_TO_PASS_RATE: number;
  SECONDARY_AST: number;
  PAR: number;
  // Ball Security
  TOV: number;
  TOV_RATE: number;
  A2T: number;
  // Defense
  STL: number;
  BLK: number;
  STL_RATE: number;
  BLK_RATE: number;
  DEFLECTIONS: number;
  PF_RATE: number;
  CHARGES_DRAWN: number;
  // Rebounding
  OREB_PCT: number;
  DREB_PCT: number;
  REB_TOTAL: number;
  // Usage
  USG: number;
  VI: number;
}

// ============================================================================
// STANDARDIZATION (Z-SCORES)
// ============================================================================

export function standardizeFeatures(
  features: PlayerFeatures,
  populationMean: Record<string, number>,
  populationStd: Record<string, number>
): Record<string, number> {
  const zScores: Record<string, number> = {};

  const featureKeys = [
    // Shooting
    'TS', 'THREE_P_PCT', 'THREE_PA_RATE', 'TWO_P_PCT', 'TWO_PA_RATE',
    'FT_PCT', 'FT_RATE', 'EFG', 'THREE_P_VOLUME',
    // Playmaking
    'AST', 'AST_RATE', 'POTENTIAL_AST', 'AST_TO_PASS_RATE', 'SECONDARY_AST', 'PAR',
    // Ball Security
    'TOV', 'TOV_RATE', 'A2T',
    // Defense
    'STL', 'BLK', 'STL_RATE', 'BLK_RATE', 'DEFLECTIONS', 'PF_RATE', 'CHARGES_DRAWN',
    // Rebounding
    'OREB_PCT', 'DREB_PCT',
    // Usage
    'USG', 'VI',
  ];

  for (const key of featureKeys) {
    const value = (features as any)[key] as number;
    const mean = populationMean[key] ?? 0;
    const std = populationStd[key] ?? 1;
    zScores[key] = (value - mean) / Math.max(std, 0.0001);
  }

  return zScores;
}

// ============================================================================
// Z-SCORE TO PERCENTILE CONVERSION
// ============================================================================

export function zScoreToPercentile(z: number): number {
  // Error function approximation
  const sign = z >= 0 ? 1 : -1;
  const x = Math.abs(z) / Math.sqrt(2);

  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  const t = 1.0 / (1.0 + p * x);
  const erf = sign * (1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x));

  return 0.5 * (1.0 + erf);
}

// ============================================================================
// COMPUTE POPULATION STATISTICS
// ============================================================================

export function computePopulationStats(
  allFeatures: PlayerFeatures[]
): { mean: Record<string, number>; std: Record<string, number> } {
  const featureKeys = [
    'TS', 'THREE_P_PCT', 'THREE_PA_RATE', 'TWO_P_PCT', 'TWO_PA_RATE',
    'FT_PCT', 'FT_RATE', 'EFG', 'THREE_P_VOLUME',
    'AST', 'AST_RATE', 'POTENTIAL_AST', 'AST_TO_PASS_RATE', 'SECONDARY_AST', 'PAR',
    'TOV', 'TOV_RATE', 'A2T',
    'STL', 'BLK', 'STL_RATE', 'BLK_RATE', 'DEFLECTIONS', 'PF_RATE', 'CHARGES_DRAWN',
    'OREB_PCT', 'DREB_PCT',
    'USG', 'VI',
  ];

  const mean: Record<string, number> = {};
  const std: Record<string, number> = {};

  for (const key of featureKeys) {
    const values = allFeatures.map(f => (f as any)[key] as number).filter(v => !isNaN(v));

    if (values.length === 0) {
      mean[key] = 0;
      std[key] = 1;
      continue;
    }

    const sum = values.reduce((a, b) => a + b, 0);
    mean[key] = sum / values.length;

    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean[key], 2), 0) / values.length;
    std[key] = Math.sqrt(variance);
  }

  return { mean, std };
}
