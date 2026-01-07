/**
 * Archetype Service - FIXED
 * Handles archetype profile computation and aggregation
 */

import { ArchetypeProfile, PlayerFeatures, Player } from '@nba-draft-sim/shared';
import { ARCHETYPE_WEIGHTS } from '@nba-draft-sim/shared';

/**
 * Compute archetype profile for a player
 */
export function computeArchetypeProfile(features: PlayerFeatures | Record<string, number>): ArchetypeProfile {
  const profile: Partial<Record<string, number>> = {};
  let totalScore = 0;

  for (const archetype in ARCHETYPE_WEIGHTS) {
    let score = 0;
    for (const feature in ARCHETYPE_WEIGHTS[archetype]) {
      const featureValue = (features as any)[feature];
      const weight = ARCHETYPE_WEIGHTS[archetype][feature];
      if (featureValue !== undefined && weight !== undefined) {
        score += featureValue * weight;
      }
    }
    profile[archetype] = score;
    totalScore += score;
  }

  // Normalize scores
  if (totalScore > 0) {
    for (const archetype in profile) {
      profile[archetype] = (profile[archetype] || 0) / totalScore;
    }
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