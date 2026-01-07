/**
 * Archetype Service - DOUBLE NORMALIZATION BUG FIX
 * The bug: Normalizes twice, making all values too small
 */

import { ArchetypeProfile, PlayerFeatures, Player } from '@nba-draft-sim/shared';
import { ARCHETYPE_WEIGHTS } from '@nba-draft-sim/shared';

/**
 * Compute archetype profile for a player
 * FIXED: Only normalizes once
 */
export function computeArchetypeProfile(features: PlayerFeatures | Record<string, number>): ArchetypeProfile {
  const profile: Partial<Record<string, number>> = {};
  let totalScore = 0;

  // Calculate raw scores for each archetype
  for (const archetype in ARCHETYPE_WEIGHTS) {
    let score = 0;
    for (const feature in ARCHETYPE_WEIGHTS[archetype]) {
      const featureValue = (features as any)[feature];
      const weight = ARCHETYPE_WEIGHTS[archetype][feature];
      if (featureValue !== undefined && weight !== undefined) {
        score += featureValue * weight;
      }
    }
    
    // Only consider positive scores
    if (score > 0) {
      profile[archetype] = score;
      totalScore += score;
    }
  }

  // Normalize scores to percentages (0-1) - ONLY ONCE!
  if (totalScore > 0) {
    for (const archetype in profile) {
      const normalized = (profile[archetype] || 0) / totalScore;
      // Keep only archetypes above 5% threshold
      if (normalized >= 0.05) {
        profile[archetype] = normalized;
      }
    }
  } else {
    console.warn('⚠️ Player has no positive archetype scores');
  }

  return profile as ArchetypeProfile;
}

/**
 * Aggregate archetype profiles for a team
 */
export function aggregateArchetypeProfiles(
  profiles: ArchetypeProfile[],
  weights: number[]
): ArchetypeProfile {
  const teamProfile: Partial<Record<string, number>> = {};

  profiles.forEach((profile, i) => {
    for (const archetype in profile) {
      if (!teamProfile[archetype]) {
        teamProfile[archetype] = 0;
      }
      const profileValue = (profile as any)[archetype];
      if (profileValue !== undefined) {
        teamProfile[archetype] = (teamProfile[archetype] || 0) + profileValue * weights[i];
      }
    }
  });

  return teamProfile as ArchetypeProfile;
}