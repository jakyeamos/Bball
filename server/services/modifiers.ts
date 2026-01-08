/**
 * server/services/modifiers.ts
 * 
 * FIXED for Phase 2: Simplified modifier logic using new constants
 */

import { 
  TeamAggregation, 
  TeamModifiers, 
  TEAM_MODIFIER_PARAMS 
} from '@nba-draft-sim/shared';

/**
 * Compute team modifiers based on roster composition
 */
export function computeTeamModifiers(team: TeamAggregation): TeamModifiers {
  const p = TEAM_MODIFIER_PARAMS;
  const arch = team.archetypes;
  const teamFeatures = team.features;

  let shootBonus = 0;
  let creatorPen = 0;
  let rimPen = 0;
  let variancePenalty = 0;
  let offenseBonus = 0;
  let offensePenalty = 0;
  let defenseBonus = 0;
  let defensePenalty = 0;

  // ============================================================================
  // 1. CREATOR REDUNDANCY PENALTY
  // ============================================================================
  const creators = (arch.PrimaryCreator ?? 0) + (arch.SecondaryPlaymaker ?? 0);
  
  if (creators > p.CREATOR_THRESHOLD) {
    creatorPen = p.CREATOR_PENALTY * (creators - p.CREATOR_THRESHOLD);
  }

  // ============================================================================
  // 2. SPACING BONUS
  // ============================================================================
  const shooters = (arch.VolumeSniper ?? 0) + 
                   (arch.EfficientSpacer ?? 0) + 
                   (arch.ShotMaker ?? 0);
  
  const spacing = p.SPACING_WEIGHT_3PA * (teamFeatures.THREE_PA_RATE ?? 0) + 
                  p.SPACING_WEIGHT_SHOOTER * shooters;
  
  if (spacing > p.SPACING_THRESHOLD) {
    shootBonus = p.SPACING_BONUS_MULT * (spacing - p.SPACING_THRESHOLD);
  }

  // ============================================================================
  // 3. RIM PROTECTION PENALTY
  // ============================================================================
  const rimProt = arch.RimDeterrent ?? 0;
  
  if (rimProt < p.RIM_THRESHOLD) {
    rimPen = p.RIM_PENALTY * (p.RIM_THRESHOLD - rimProt);
  }

  // ============================================================================
  // 4. VERSATILITY PENALTY
  // ============================================================================
  if ((teamFeatures.VI ?? 0) < p.VI_THRESHOLD) {
    variancePenalty = p.VI_PENALTY_MULT * (p.VI_THRESHOLD - (teamFeatures.VI ?? 0));
  }

  // ============================================================================
  // 5. COMPOSITION BONUS (simplified)
  // ============================================================================
  // Balanced team gets a small bonus
  const playmakers = (arch.PrimaryCreator ?? 0) + (arch.SecondaryPlaymaker ?? 0) + (arch.Connector ?? 0);
  const scorers = (arch.VolumeSniper ?? 0) + (arch.EfficientSpacer ?? 0) + (arch.ShotMaker ?? 0) + (arch.AdvantageDriver ?? 0);
  const defenders = (arch.PointOfAttackMenace ?? 0) + (arch.Disruptor ?? 0) + (arch.RimDeterrent ?? 0);
  
  const balance = Math.min(playmakers, scorers, defenders);
  
  if (balance > p.COMP_BONUS_THRESHOLD) {
    offenseBonus = p.COMP_BONUS_BASE * (balance - p.COMP_BONUS_THRESHOLD);
  }

  // ============================================================================
  // 6. AGGREGATE COMPONENTS
  // ============================================================================
  // Cap individual components
  shootBonus = Math.min(shootBonus, p.MAX_COMPONENT);
  creatorPen = Math.max(creatorPen, -p.MAX_COMPONENT);
  rimPen = Math.max(rimPen, -p.MAX_COMPONENT);
  variancePenalty = Math.max(variancePenalty, -p.MAX_COMPONENT);
  offenseBonus = Math.min(offenseBonus, p.MAX_COMPONENT);

  // Calculate total
  let total = shootBonus + creatorPen + rimPen + offenseBonus + 
              offensePenalty + defenseBonus + defensePenalty - variancePenalty;

  // Cap total
  total = Math.max(-p.MAX_TOTAL, Math.min(p.MAX_TOTAL, total));

  return {
    total,
    shootBonus,
    creatorPen,
    rimPen,
    offenseBonus,
    offensePenalty,
    defenseBonus,
    defensePenalty,
    variancePenalty,
  };
}

/**
 * Debug team modifiers
 */
export function debugTeamModifiers(
  teamId: string,
  modifiers: TeamModifiers
): void {
  console.log(`\n🎯 Team Modifiers for ${teamId}:`);
  console.log(`  Total: ${modifiers.total.toFixed(3)}`);
  console.log(`  Spacing Bonus: ${modifiers.shootBonus.toFixed(3)}`);
  console.log(`  Creator Penalty: ${modifiers.creatorPen.toFixed(3)}`);
  console.log(`  Rim Penalty: ${modifiers.rimPen.toFixed(3)}`);
  console.log(`  Variance Penalty: ${modifiers.variancePenalty.toFixed(3)}`);
  console.log(`  Offense Bonus: ${modifiers.offenseBonus.toFixed(3)}`);
  console.log('');
}