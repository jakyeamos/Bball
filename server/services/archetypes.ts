/**
 * Archetype Service
 * Handles archetype profile computation and aggregation
 */

import { ArchetypeProfile, PlayerFeatures, Player } from '@nba-draft-sim/shared';
import { ARCHETYPE_WEIGHTS } from '@nba-draft-sim/shared';

/**
 * Compute archetype profile for a player
 */
export function computeArchetypeProfile(features: PlayerFeatures): ArchetypeProfile {
  const profile: ArchetypeProfile = {} as ArchetypeProfile;
  let totalScore = 0;

  for (const archetype in ARCHETYPE_WEIGHTS) {
    let score = 0;
    for (const feature in ARCHETYPE_WEIGHTS[archetype]) {
      score += features[feature] * ARCHETYPE_WEIGHTS[archetype][feature];
    }
    profile[archetype] = score;
    totalScore += score;
  }

  // Normalize scores
  if (totalScore > 0) {
    for (const archetype in profile) {
      profile[archetype] /= totalScore;
    }
  }

  return profile;
}

/**
 * Aggregate archetype profiles for a team
 */
export function aggregateArchetypeProfiles(
  profiles: ArchetypeProfile[],
  weights: number[]
): ArchetypeProfile {
  const teamProfile: ArchetypeProfile = {} as ArchetypeProfile;

  profiles.forEach((profile, i) => {
    for (const archetype in profile) {
      if (!teamProfile[archetype]) {
        teamProfile[archetype] = 0;
      }
      teamProfile[archetype] += profile[archetype] * weights[i];
    }
  });

  return teamProfile;
}
