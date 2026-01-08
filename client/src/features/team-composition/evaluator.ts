
import { Player } from '@nba-draft-sim/shared';

// Team Archetype Definitions
const ARCHETYPE_DEFINITIONS = {
  'Pace & Space': {
    weights: {
      '3-Point Specialist': 1.0,
      'Athletic Finisher': 0.8,
      'Playmaking Wing': 0.7,
      'Stretch Big': 0.9,
      'Perimeter Defender': 0.6,
    },
    description: 'A fast-paced offense that emphasizes speed, three-point shooting, and floor spacing.',
  },
  'Grit & Grind': {
    weights: {
      'Perimeter Defender': 1.0,
      'Interior Defender': 1.0,
      'Playmaking Wing': 0.6,
      'Athletic Finisher': 0.7,
      'Mid-Range Scorer': 0.8,
    },
    description: 'A defensive-minded team that focuses on physicality, forcing turnovers, and controlling the paint.',
  },
  'Interior Dominance': {
    weights: {
      'Interior Defender': 1.0,
      'Post Scorer': 1.0,
      'Rebounding Specialist': 0.9,
      'Athletic Finisher': 0.8,
      'Stretch Big': 0.5,
    },
    description: 'A team that dominates the paint through scoring, rebounding, and rim protection.',
  },
};

// Trait Evaluation Tiers
const TRAIT_THRESHOLDS = {
  'Three-Point Shooting': [
    { tier: 'Elite', min: 0.38 },
    { tier: 'Good', min: 0.35 },
    { tier: 'Average', min: 0.32 },
    { tier: 'Poor', min: 0 },
  ],
};

// Types
export type TeamArchetype = {
  name: keyof typeof ARCHETYPE_DEFINITIONS;
  score: number;
  description: string;
};

export type TraitEvaluation = {
  name: keyof typeof TRAIT_THRESHOLDS;
  tier: 'Elite' | 'Good' | 'Average' | 'Poor' | 'N/A';
};

export type TeamComposition = {
  archetypes: TeamArchetype[];
  traits: TraitEvaluation[];
};

// Helpers
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

// Main Evaluator Function
export const evaluateTeamComposition = (roster: Player[]): TeamComposition => {
  if (roster.length === 0) {
    return { archetypes: [], traits: [] };
  }

  // Evaluate Archetypes
  const archetypes = (Object.keys(ARCHETYPE_DEFINITIONS) as (keyof typeof ARCHETYPE_DEFINITIONS)[]).map(name => {
    const { weights, description } = ARCHETYPE_DEFINITIONS[name];
    const score = calculateWeightedAverage(roster, weights);
    return { name, score, description };
  }).sort((a, b) => b.score - a.score);

  // Evaluate Traits
  const total3PA = roster.reduce((sum, p) => sum + (p.rawStats?.THREE_PA || 0), 0);
  const total3PM = roster.reduce((sum, p) => sum + ((p.rawStats?.THREE_P_PCT || 0) * (p.rawStats?.THREE_PA || 0)), 0);
  const team3P = total3PA > 0 ? total3PM / total3PA : 0;

  const traits: TraitEvaluation[] = [
    {
      name: 'Three-Point Shooting',
      tier: getTier(team3P, TRAIT_THRESHOLDS['Three-Point Shooting']) as TraitEvaluation['tier'],
    },
  ];

  return { archetypes, traits };
};
