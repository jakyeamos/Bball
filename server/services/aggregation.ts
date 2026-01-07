/**
 * Impact Rating and Team Aggregation
 * Implements Section 5 from pseudocode: player ranking and team-level aggregation
 */

import { Player, PlayerFeatures, TeamAggregation, ArchetypeProfile } from '@nba-draft-sim/shared';
import { IMPACT_WEIGHTS, ROTATION_SIZE } from '@nba-draft-sim/shared';
import { scale, weightedAverage, normalizeWeights } from '../utils/utils';
import { aggregateArchetypeProfiles } from './archetypes';

/**
 * Calculate player impact rating for ranking and rotation selection
 * This is a simple weighted sum of key features (not z-scored for v1)
 *
 * Formula from pseudocode:
 * 0.35*TS + 0.20*AST - 0.15*TOV + 0.10*3PA_RATE + 0.10*BLK + 0.10*STL
 */
export function calculateImpactRating(features: PlayerFeatures): number {
  // For v1, we'll use a simple weighted sum
  // In production, you'd want to scale these features first
  const rating =
    IMPACT_WEIGHTS.TS * features.TS +
    IMPACT_WEIGHTS.AST * features.AST +
    IMPACT_WEIGHTS.TOV * features.TOV + // Note: weight is already negative
    IMPACT_WEIGHTS.THREE_PA_RATE * features.THREE_PA_RATE +
    IMPACT_WEIGHTS.BLK * features.BLK +
    IMPACT_WEIGHTS.STL * features.STL;

  return rating;
}

/**
 * Select rotation players from roster (top k by impact rating)
 */
export function selectRotation(players: Player[], k: number = ROTATION_SIZE): Player[] {
  // Sort by impact rating descending
  const sorted = [...players].sort((a, b) => b.impactRating - a.impactRating);

  // Take top k
  return sorted.slice(0, Math.min(k, sorted.length));
}

/**
 * Calculate normalized weights for rotation players based on impact ratings
 */
function calculateRotationWeights(rotation: Player[]): number[] {
  const impactRatings = rotation.map(p => p.impactRating);

  // Ensure all weights are positive (add constant if needed)
  const minRating = Math.min(...impactRatings);
  const shiftedRatings = minRating < 0
    ? impactRatings.map(r => r - minRating + 1)
    : impactRatings;

  return normalizeWeights(shiftedRatings);
}

/**
 * Aggregate team features from rotation players
 * Returns weighted average of each feature
 */
function aggregateTeamFeatures(rotation: Player[], weights: number[]): TeamAggregation['features'] {
  const featureNames: (keyof PlayerFeatures)[] = [
    'TS',
    'AST',
    'TOV',
    'THREE_PA_RATE',
    'FT_RATE',
    'REB',
    'BLK',
    'STL',
  ];

  const aggregated: any = {};

  for (const feature of featureNames) {
    const values = rotation.map(p => p.features[feature]);
    aggregated[feature] = weightedAverage(values, weights);
  }

  return aggregated;
}

/**
 * Aggregate full team from roster
 * Selects rotation, computes weighted features and archetypes
 */
export function aggregateTeam(teamId: string, roster: Player[]): TeamAggregation {
  if (roster.length === 0) {
    throw new Error('Cannot aggregate team with empty roster');
  }

  // Select rotation (top 8 by impact)
  const rotation = selectRotation(roster, ROTATION_SIZE);

  // Calculate weights based on impact ratings
  const weights = calculateRotationWeights(rotation);

  // Aggregate features
  const features = aggregateTeamFeatures(rotation, weights);

  // Aggregate archetypes
  const archetypeProfiles = rotation.map(p => p.archetypes);
  const archetypes = aggregateArchetypeProfiles(archetypeProfiles, weights);

  return {
    teamId,
    features,
    archetypes,
    rotationPlayerIds: rotation.map(p => p.playerId),
  };
}

/**
 * Get top N players from a pool by impact rating (for auto-pick)
 */
export function getTopPlayersByImpact(players: Player[], n: number = 20): Player[] {
  const sorted = [...players].sort((a, b) => b.impactRating - a.impactRating);
  return sorted.slice(0, Math.min(n, sorted.length));
}

/**
 * Select random player from top N (for auto-pick when timer expires)
 */
export function selectRandomFromTopN(players: Player[], n: number = 20): Player | null {
  if (players.length === 0) return null;

  const topPlayers = getTopPlayersByImpact(players, n);
  const randomIndex = Math.floor(Math.random() * topPlayers.length);

  return topPlayers[randomIndex];
}
