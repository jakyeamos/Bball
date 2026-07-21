/**
 * server/services/archetypes.ts
 *
 * UPDATED for Phase 2: Percentile-based caps and softmax temperature
 */

import {
  ArchetypeProfile,
  ARCHETYPE_WEIGHTS,
  ARCHETYPE_CAPS,
  ARCHETYPE_PARAMS,
  ARCHETYPE_NAMES
} from '@nba-draft-sim/shared';
import { zScoreToPercentile } from './features';

// ============================================================================
// COMPUTE ARCHETYPE PROFILE
// ============================================================================

export function computeArchetypeProfile(
  zScores: Record<string, number>
): ArchetypeProfile {

  // Step 1: Convert z-scores to percentiles
  const percentiles: Record<string, number> = {};
  for (const feature in zScores) {
    percentiles[feature] = zScoreToPercentile(zScores[feature]);
  }

  // Step 2: Calculate raw archetype scores
  const rawScores: Record<string, number> = {};

  for (const archetype in ARCHETYPE_WEIGHTS) {
    let score = 0;
    const weights = ARCHETYPE_WEIGHTS[archetype];

    for (const feature in weights) {
      const featureZScore = zScores[feature];
      const weight = weights[feature];

      if (featureZScore !== undefined && weight !== undefined) {
        score += featureZScore * weight;
      }
    }
    
    // Only keep positive scores
    if (score > 0) {
      rawScores[archetype] = score;
    }
  }

  // Step 3: Apply percentile-based caps
  const cappedScores: Record<string, number> = {};

  for (const archetype in rawScores) {
    let finalScore = rawScores[archetype];

    // Check if this archetype has caps
    const caps = ARCHETYPE_CAPS[archetype];
    if (caps && caps.length > 0) {
      for (const cap of caps) {
        const featurePercentile = percentiles[cap.feature];

        // If feature percentile is below threshold, cap the archetype score
        if (featurePercentile !== undefined && featurePercentile < cap.percentileThreshold) {
          finalScore = Math.min(finalScore, cap.capValue);
        }
      }
    }

    cappedScores[archetype] = finalScore;
  }

  // Step 4: Apply softmax with temperature
  const profile = applySoftmaxWithTemperature(
    cappedScores,
    ARCHETYPE_PARAMS.SOFTMAX_TEMPERATURE
  );

  // Step 5: Filter out weak archetypes and renormalize
  const filtered: Record<string, number> = {};
  for (const archetype in profile) {
    if (profile[archetype] >= ARCHETYPE_PARAMS.MIN_ARCHETYPE_SCORE) {
      filtered[archetype] = profile[archetype];
    }
  }

  // Renormalize so filtered archetypes sum to 1
  const total = Object.values(filtered).reduce((sum, val) => sum + val, 0);
  if (total > 0) {
    for (const archetype in filtered) {
      filtered[archetype] /= total;
    }
  }

  return filtered as ArchetypeProfile;
}

// ============================================================================
// SOFTMAX WITH TEMPERATURE
// ============================================================================

function applySoftmaxWithTemperature(
  scores: Record<string, number>,
  temperature: number
): Record<string, number> {
  // Scale scores by temperature
  const scaled: Record<string, number> = {};
  for (const key in scores) {
    scaled[key] = scores[key] / temperature;
  }

  // Subtract max for numerical stability
  const maxScore = Math.max(...Object.values(scaled));

  // Compute exp and sum
  const expScores: Record<string, number> = {};
  let sumExp = 0;
  for (const key in scaled) {
    const expVal = Math.exp(scaled[key] - maxScore);
    expScores[key] = expVal;
    sumExp += expVal;
  }

  // Normalize
  const result: Record<string, number> = {};
  for (const key in expScores) {
    result[key] = expScores[key] / sumExp;
  }

  return result;
}

// ============================================================================
// AGGREGATE TEAM ARCHETYPE PROFILES
// ============================================================================

export function aggregateArchetypeProfiles(
  profiles: ArchetypeProfile[]
): ArchetypeProfile {
  const aggregated: Record<string, number> = {};
  for (const name of ARCHETYPE_NAMES) {
    aggregated[name] = 0;
  }
  if (profiles.length === 0) {
    return aggregated as ArchetypeProfile;
  }

  // Sum up all archetype values
  for (const profile of profiles) {
  for (const archetype in profile) {
    const value = profile[archetype];      // ← ADD THIS LINE
    if (value !== undefined) {             // ← ADD THIS LINE
      if (!aggregated[archetype]) {
        aggregated[archetype] = 0;
      }
      aggregated[archetype] += value;      // ← CHANGE profile[archetype] to value
    }                                      // ← ADD THIS LINE
  }
}

  // Normalize by number of players
  for (const archetype in aggregated) {
    aggregated[archetype] /= profiles.length;
  }

  return aggregated as ArchetypeProfile;
}
