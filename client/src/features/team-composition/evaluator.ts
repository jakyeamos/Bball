/**
 * client/src/utils/teamComposition.ts
 * 
 * UPDATED for Phase 2: New positionless archetype system
 */

import { Player } from '@nba-draft-sim/shared';

// ============================================================================
// TEAM ARCHETYPE DEFINITIONS (Phase 2: Updated)
// ============================================================================

const ARCHETYPE_DEFINITIONS = {
  'Pace & Space': {
    weights: {
      VolumeSniper: 1.0,
      EfficientSpacer: 1.0,
      SecondaryPlaymaker: 0.8,
      AdvantageDriver: 0.7,
      Connector: 0.6,
    },
    description: 'A fast-paced offense that emphasizes speed, three-point shooting, and floor spacing.',
  },
  
  'Grit & Grind': {
    weights: {
      PointOfAttackMenace: 1.0,
      Disruptor: 1.0,
      RimDeterrent: 0.9,
      LowMistakeRolePlayer: 0.8,
      HustleEngine: 0.8,
    },
    description: 'A defensive-minded team that focuses on physicality, forcing turnovers, and controlling the paint.',
  },
  
  'Interior Dominance': {
    weights: {
      RimDeterrent: 1.0,
      ReboundEnforcer: 1.0,
      AdvantageDriver: 0.8,
      ShotMaker: 0.7,
      HustleEngine: 0.6,
    },
    description: 'A team that dominates the paint through scoring, rebounding, and rim protection.',
  },
  
  'Balanced Attack': {
    weights: {
      PrimaryCreator: 0.9,
      SecondaryPlaymaker: 0.9,
      EfficientSpacer: 0.8,
      ShotMaker: 0.8,
      Connector: 1.0,
    },
    description: 'A versatile team with multiple scoring options and balanced offensive capabilities.',
  },
  
  'Defensive Fortress': {
    weights: {
      RimDeterrent: 1.0,
      PointOfAttackMenace: 1.0,
      Disruptor: 1.0,
      ReboundEnforcer: 0.8,
      HustleEngine: 0.9,
    },
    description: 'An elite defensive unit that excels at rim protection, perimeter defense, and generating turnovers.',
  },
  
  'Playmaking First': {
    weights: {
      PrimaryCreator: 1.0,
      SecondaryPlaymaker: 1.0,
      Connector: 0.9,
      EfficientSpacer: 0.7,
      LowMistakeRolePlayer: 0.6,
    },
    description: 'A team built around ball movement, passing, and creating opportunities for others.',
  },
};

// ============================================================================
// TRAIT EVALUATION THRESHOLDS
// ============================================================================

const TRAIT_THRESHOLDS = {
  'Three-Point Shooting': [
    { tier: 'Elite', min: 0.38 },
    { tier: 'Good', min: 0.35 },
    { tier: 'Average', min: 0.32 },
    { tier: 'Poor', min: 0 },
  ],
  'Ball Security': [
    { tier: 'Elite', min: 2.5 }, // Assist-to-turnover ratio
    { tier: 'Good', min: 2.0 },
    { tier: 'Average', min: 1.5 },
    { tier: 'Poor', min: 0 },
  ],
  'Defensive Activity': [
    { tier: 'Elite', min: 3.0 }, // Combined STL + BLK per 36
    { tier: 'Good', min: 2.5 },
    { tier: 'Average', min: 2.0 },
    { tier: 'Poor', min: 0 },
  ],
};

// ============================================================================
// TYPES
// ============================================================================

export type TeamArchetype = {
  name: keyof typeof ARCHETYPE_DEFINITIONS;
  score: number;
  description: string;
};

export type TraitEvaluation = {
  name: keyof typeof TRAIT_THRESHOLDS;
  tier: 'Elite' | 'Good' | 'Average' | 'Poor' | 'N/A';
  value?: number; // Optional: display the actual value
};

export type TeamComposition = {
  archetypes: TeamArchetype[];
  traits: TraitEvaluation[];
  primaryArchetype: TeamArchetype | null;
  secondaryArchetype: TeamArchetype | null;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const calculateWeightedAverage = (roster: Player[], weights: Record<string, number>): number => {
  let totalScore = 0;
  let totalWeight = 0;
  
  roster.forEach(player => {
    Object.entries(player.archetypes).forEach(([archetype, percentage]) => {
      const pct = percentage ?? 0;
      if (weights[archetype]) {
        totalScore += pct * weights[archetype];
        totalWeight += weights[archetype];
      }
    });
  });
  
  return totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
};

const getTier = (value: number, thresholds: { tier: string; min: number }[]): string => {
  for (const { tier, min } of thresholds) {
    if (value >= min) {
      return tier;
    }
  }
  return 'N/A';
};

// ============================================================================
// MAIN EVALUATOR FUNCTION
// ============================================================================

export const evaluateTeamComposition = (roster: Player[]): TeamComposition => {
  if (roster.length === 0) {
    return { 
      archetypes: [], 
      traits: [],
      primaryArchetype: null,
      secondaryArchetype: null,
    };
  }

  // Evaluate Team Archetypes
  const archetypes = (Object.keys(ARCHETYPE_DEFINITIONS) as (keyof typeof ARCHETYPE_DEFINITIONS)[])
    .map(name => {
      const { weights, description } = ARCHETYPE_DEFINITIONS[name];
      const score = calculateWeightedAverage(roster, weights);
      return { name, score, description };
    })
    .sort((a, b) => b.score - a.score);

  // Get primary and secondary archetypes
  const primaryArchetype = archetypes[0] || null;
  const secondaryArchetype = archetypes[1] || null;

  // Evaluate Traits
  const traits: TraitEvaluation[] = [];

  // 1. Three-Point Shooting
  const total3PA = roster.reduce((sum, p) => sum + (p.rawStats?.THREE_PA || 0), 0);
  const total3PM = roster.reduce((sum, p) => sum + (p.rawStats?.THREE_PM || 0), 0);
  const team3P = total3PA > 0 ? total3PM / total3PA : 0;
  
  traits.push({
    name: 'Three-Point Shooting',
    tier: getTier(team3P, TRAIT_THRESHOLDS['Three-Point Shooting']) as TraitEvaluation['tier'],
    value: team3P,
  });

  // 2. Ball Security (Assist-to-Turnover Ratio)
  const totalAST = roster.reduce((sum, p) => sum + (p.rawStats?.AST || 0), 0);
  const totalTOV = roster.reduce((sum, p) => sum + (p.rawStats?.TOV || 0), 0);
  const teamA2T = totalTOV > 0 ? totalAST / totalTOV : totalAST;
  
  traits.push({
    name: 'Ball Security',
    tier: getTier(teamA2T, TRAIT_THRESHOLDS['Ball Security']) as TraitEvaluation['tier'],
    value: teamA2T,
  });

  // 3. Defensive Activity (Steals + Blocks per 36)
  const totalMP = roster.reduce((sum, p) => sum + (p.rawStats?.MP_TOTAL || 0), 0);
  const totalSTL = roster.reduce((sum, p) => sum + (p.rawStats?.STL || 0), 0);
  const totalBLK = roster.reduce((sum, p) => sum + (p.rawStats?.BLK || 0), 0);
  const defensiveActivity = totalMP > 0 ? ((totalSTL + totalBLK) / totalMP) * 36 : 0;
  
  traits.push({
    name: 'Defensive Activity',
    tier: getTier(defensiveActivity, TRAIT_THRESHOLDS['Defensive Activity']) as TraitEvaluation['tier'],
    value: defensiveActivity,
  });

  return { 
    archetypes, 
    traits,
    primaryArchetype,
    secondaryArchetype,
  };
};

// ============================================================================
// ADDITIONAL HELPER: Get Team Archetype Summary
// ============================================================================

export const getTeamArchetypeSummary = (composition: TeamComposition): string => {
  if (!composition.primaryArchetype) {
    return 'No clear team identity';
  }

  const primary = composition.primaryArchetype;
  const secondary = composition.secondaryArchetype;

  if (secondary && secondary.score > 50) {
    return `${primary.name} / ${secondary.name}`;
  }

  return primary.name;
};

// ============================================================================
// ADDITIONAL HELPER: Get Player Archetypes Breakdown
// ============================================================================

export const getPlayerArchetypesBreakdown = (roster: Player[]): Record<string, number> => {
  const breakdown: Record<string, number> = {};

  roster.forEach(player => {
    Object.entries(player.archetypes).forEach(([archetype, percentage]) => {
      const pct = percentage ?? 0;
      if (!breakdown[archetype]) {
        breakdown[archetype] = 0;
      }
      breakdown[archetype] += pct;
    });
  });

  // Average by roster size
  for (const archetype in breakdown) {
    breakdown[archetype] /= roster.length;
  }

  return breakdown;
};

// ============================================================================
// EXPORTS
// ============================================================================

export {
  ARCHETYPE_DEFINITIONS,
  TRAIT_THRESHOLDS,
};