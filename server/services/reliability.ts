/**
 * Reliability Shrinkage Functions
 * Implements Section 2 from pseudocode: prevents low-minutes players from dominating
 */

import { RELIABILITY_PARAMS } from '@nba-draft-sim/shared';
import { clamp, sigmoid } from '../utils/utils';

/**
 * Calculate reliability factor for a player based on games played and minutes
 * Returns value between 0 and 1, where 1 = fully reliable stats
 *
 * Formula from pseudocode:
 * R = 0.75 * sigmoid((MP - MP_MID) / MP_SCALE) + 0.25 * sigmoid((GP - GP_MID) / GP_SCALE)
 */
export function calculateReliabilityFactor(gamesPlayed: number, minutesTotal: number): number {
  const {
    MP_MIDPOINT,
    MP_SCALE,
    GP_MIDPOINT,
    GP_SCALE,
    MP_WEIGHT,
    GP_WEIGHT,
  } = RELIABILITY_PARAMS;

  // Minutes term: sigmoid curve centered at MP_MIDPOINT
  const mpNormalized = (minutesTotal - MP_MIDPOINT) / MP_SCALE;
  const mpTerm = sigmoid(mpNormalized);

  // Games played term: sigmoid curve centered at GP_MIDPOINT
  const gpNormalized = (gamesPlayed - GP_MIDPOINT) / GP_SCALE;
  const gpTerm = sigmoid(gpNormalized);

  // Weighted combination
  const reliability = MP_WEIGHT * mpTerm + GP_WEIGHT * gpTerm;

  // Clamp to [0, 1] for safety
  return clamp(0.0, 1.0, reliability);
}

/**
 * Shrink a player's metric toward the role average based on reliability
 *
 * Formula: R * player_metric + (1 - R) * role_avg_metric
 *
 * When R = 1 (high reliability): returns player_metric
 * When R = 0 (low reliability): returns role_avg_metric
 */
export function shrinkToRoleAverage(
  playerMetric: number,
  roleAvgMetric: number,
  reliabilityFactor: number
): number {
  return reliabilityFactor * playerMetric + (1 - reliabilityFactor) * roleAvgMetric;
}

/**
 * Apply reliability shrinkage to multiple metrics at once
 */
export function shrinkMetrics(
  playerMetrics: Record<string, number>,
  roleAverages: Record<string, number>,
  reliabilityFactor: number
): Record<string, number> {
  const shrunkenMetrics: Record<string, number> = {};

  for (const [key, playerValue] of Object.entries(playerMetrics)) {
    const roleValue = roleAverages[key] ?? playerValue; // Fallback to player value if role avg missing
    shrunkenMetrics[key] = shrinkToRoleAverage(playerValue, roleValue, reliabilityFactor);
  }

  return shrunkenMetrics;
}
