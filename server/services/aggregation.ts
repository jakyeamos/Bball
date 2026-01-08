/**
 * server/services/aggregation.ts
 * 
 * FIXED for Phase 2: REB → REB_TOTAL, correct function signatures
 */

import { Player, PlayerFeatures, TeamAggregation, TeamModifiers } from '@nba-draft-sim/shared';
import { aggregateArchetypeProfiles } from './archetypes';
import { computeTeamModifiers } from './modifiers';

/**
 * Aggregate a roster of players into a team
 */
export function aggregateTeam(
  roster: Player[],
  teamId: string
): TeamAggregation {
  if (roster.length === 0) {
    throw new Error(`Cannot aggregate empty roster for team ${teamId}`);
  }

  // Sort by impact rating (descending)
  const sortedRoster = [...roster].sort((a, b) => b.impactRating - a.impactRating);

  // Take top players as rotation (e.g., top 8-10)
  const rotationSize = Math.min(10, sortedRoster.length);
  const rotation = sortedRoster.slice(0, rotationSize);

  // Aggregate features (weighted average by impact rating)
  const teamFeatures = aggregateFeatures(rotation);

  // Aggregate archetypes
  const teamArchetypes = aggregateArchetypeProfiles(
    rotation.map(p => p.archetypes)
  );

  // Compute modifiers
  const modifiers = computeTeamModifiers({
    teamId,
    features: teamFeatures,
    archetypes: teamArchetypes,
    modifiers: { 
      total: 0, 
      shootBonus: 0, 
      creatorPen: 0, 
      rimPen: 0,
      offenseBonus: 0,
      offensePenalty: 0,
      defenseBonus: 0,
      defensePenalty: 0,
      variancePenalty: 0,
    },
    overallRating: 0,
    rotation: [],
  });

  // Calculate overall rating
  const baseRating = calculateBaseRating(rotation);
  const overallRating = baseRating + modifiers.total;

  return {
    teamId,
    features: teamFeatures,
    archetypes: teamArchetypes,
    modifiers,
    overallRating,
    rotation: rotation.map(p => ({
      playerId: p.playerId,
      name: p.name,
      impactRating: p.impactRating,
    })),
  };
}

/**
 * Aggregate player features into team features (weighted by impact)
 */
function aggregateFeatures(rotation: Player[]): PlayerFeatures {
  if (rotation.length === 0) {
    throw new Error('Cannot aggregate features from empty rotation');
  }

  // Sum all impact ratings for weighting
  const totalImpact = rotation.reduce((sum, p) => sum + p.impactRating, 0);

  // Initialize aggregated features
  const aggregated: Record<string, number> = {
    R: 1.0, // Team reliability is always 1.0
  };

  // Feature keys to aggregate
  const featureKeys: (keyof PlayerFeatures)[] = [
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
    'OREB_PCT', 'DREB_PCT', 'REB_TOTAL', // ✅ FIXED: Changed from 'REB' to 'REB_TOTAL'
    // Usage
    'USG', 'VI',
  ];

  // Weighted average for each feature
  for (const key of featureKeys) {
    let weightedSum = 0;
    
    for (const player of rotation) {
      const value = player.features[key] ?? 0;
      const weight = player.impactRating / totalImpact;
      weightedSum += value * weight;
    }
    
    aggregated[key] = weightedSum;
  }

  return aggregated as PlayerFeatures;
}

/**
 * Calculate base team rating from rotation
 */
function calculateBaseRating(rotation: Player[]): number {
  if (rotation.length === 0) return 0;
  
  // Weighted average of impact ratings
  const totalImpact = rotation.reduce((sum, p) => sum + p.impactRating, 0);
  return totalImpact / rotation.length;
}

/**
 * Calculate player impact rating
 * Exported for use in snapshot.ts
 */
export function calculateImpactRating(features: PlayerFeatures): number {
  // Weight key stats
  const scoring = (features.TS ?? 0) * 2.0;
  const playmaking = (features.AST ?? 0) * 1.5;
  const defense = ((features.STL ?? 0) + (features.BLK ?? 0)) * 1.0;
  const efficiency = (features.PAR ?? 0) * 1.0;
  const usage = (features.USG ?? 0) * 0.5;
  
  return scoring + playmaking + defense + efficiency + usage;
}

/**
 * Debug team aggregation
 */
export function debugTeamAggregation(team: TeamAggregation): void {
  console.log(`\n📊 Team Aggregation: ${team.teamId}`);
  console.log(`Overall Rating: ${team.overallRating.toFixed(2)}`);
  console.log(`Rotation (${team.rotation.length} players):`);
  
  team.rotation.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name} (${p.impactRating.toFixed(2)})`);
  });
  
  console.log('\nTop Archetypes:');
  const sortedArchetypes = Object.entries(team.archetypes)
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
    .slice(0, 5);
  
  for (const [archetype, value] of sortedArchetypes) {
    if (value && value >= 0.05) {
      console.log(`  ${archetype}: ${(value * 100).toFixed(1)}%`);
    }
  }
  
  console.log('\nModifiers:');
  console.log(`  Total: ${team.modifiers.total.toFixed(3)}`);
  console.log(`  Spacing Bonus: ${team.modifiers.shootBonus.toFixed(3)}`);
  console.log(`  Creator Penalty: ${team.modifiers.creatorPen.toFixed(3)}`);
  console.log(`  Rim Penalty: ${team.modifiers.rimPen.toFixed(3)}`);
  console.log('');
}