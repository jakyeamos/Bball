/**
 * Shared constants for NBA Draft + League Simulation
 * Tunable parameters for simulation balance
 */

import { ArchetypeName } from './types';
import { RoleCategory } from './types';

// ============================================================================
// RELIABILITY SHRINKAGE PARAMETERS
// ============================================================================

export const RELIABILITY_PARAMS = {
  MP_MIDPOINT: 1000,
  MP_SCALE: 300,
  GP_MIDPOINT: 50,
  GP_SCALE: 15,
  MP_WEIGHT: 0.75,  
  GP_WEIGHT: 0.25, 
} as const;

// ============================================================================
// ARCHETYPES
// ============================================================================

export const ARCHETYPE_NAMES: ArchetypeName[] = [
  'PrimaryCreator',
  'SecondaryCreator',
  'Connector',
  'OffBallShooter',
  'MovementShooter',
  'Slasher',
  'PostScorer',
  'PlaymakingBig',
  'POAStopper',
  'HelpDefender',
  'RimProtector',
  'DefAnchor',
  'DefPlaymaker',
  'ThreeAndD',
  'StretchBig',
  'VerticalRoller',
  'Rebounder',
  'UtilityWing',

  // Extra archetypes (requested “more archetypes”)
  'TransitionEngine',
  'BenchMicrowave',
  'LowUsageSniper',
  'SwitchableBig',
  'ScreenHub',
] as unknown as ArchetypeName[];

// NOTE: weights live in archetypes.ts in your project; constants here stay minimal.
// Keep this export because other modules import it.
export const ARCHETYPE_WEIGHTS = {} as Record<string, Record<string, number>>;

// ============================================================================
// IMPACT RATING (autopick + rotation selection)
// ============================================================================

export const IMPACT_WEIGHTS = {
  // Offense
  TS: 0.32,
  AST: 0.12,
  PAR: 0.18,              // NEW (Pomeroy Assist Ratio)
  THREE_PA_RATE: 0.10,
  FT_RATE: 0.06,
  USG: 0.04,

  // Defense
  STL: 0.09,
  BLK: 0.06,
  REB: 0.05,

  // Stability
  VI: 0.10,               // NEW (Versatility Index; positive-only entropy)
  TOV: -0.12,
} as const;

export const ROTATION_SIZE = 10 as const;

// ============================================================================
// TEAM MODIFIERS (anti-domination, floors, diminishing returns)
// ============================================================================

export const TEAM_MODIFIER_PARAMS = {
  // Targets in "archetype percent" space (0..100)
  CREATOR_TARGET: 45,           // too many creators → redundancy
  SPACING_TARGET: 35,           // want meaningful spacing presence
  RIMPROT_MIN: 18,              // floor to avoid no-center cheese

  // Caps (modifiers should not dominate outcomes)
  MAX_TOTAL: 0.07,              // +/- 7% equivalent impact in ratings-space
  MAX_COMPONENT: 0.06,

  // Diminishing return curves
  DIMINISH_K: 0.05,

  // Penalty/bonus strengths (these are applied to ratings, not win-prob directly)
  CREATOR_REDUNDANCY_CAP: 0.06,
  SPACING_BONUS_CAP: 0.05,
  RIM_HOLE_CAP: 0.06,

  // NEW: stability controls
  LOW_VI_PEN_CAP: 0.03,
} as const;

// ============================================================================
// (Legacy) TEAM STRENGTH WEIGHTS
// Kept for compatibility; newer sim uses ratings-based engine.
// ============================================================================

export const STRENGTH_WEIGHTS = {
  OFFENSE: {
    TS: 0.40,
    AST: 0.20,
    THREE_PA_RATE: 0.15,
    FT_RATE: 0.10,
    TOV: -0.15,
  },
  DEFENSE: {
    BLK: 0.25,
    STL: 0.25,
    REB: 0.20,
  },
} as const;

// ============================================================================
// SIMULATION PARAMETERS (ratings + score simulation)
// ============================================================================

export const SIM_PARAMS = {
  SIMS_PER_MATCHUP: 100,

  // Ratings
  LEAGUE_ORtg: 115,        // baseline points / 100 possessions
  LEAGUE_DRtg: 115,
  BASE_PACE: 99,           // possessions per game (fixed v1)

  // Convert feature deltas -> ORtg/DRtg deltas
  ORTG_TS_MULT: 18.0,      // TS difference around league avg
  ORTG_AST_MULT: 1.2,      // AST per game scaled /10 in code
  ORTG_PAR_MULT: 6.0,      // PAR shift matters
  ORTG_3PA_MULT: 4.0,
  ORTG_FT_MULT: 3.0,
  ORTG_TOV_MULT: -6.0,     // turnover hurts ORtg

  DRTG_BLK_MULT: 0.6,
  DRTG_STL_MULT: 0.6,
  DRTG_REB_MULT: 0.3,

  // Offense vs defense interaction strength
  DEF_INTERACTION: 0.55,

  // Score variance controls (to make series look different)
  BASE_SIGMA: 11.5,
  SIGMA_THREES: 6.0,
  SIGMA_TOV: 1.5,
  SIGMA_VI: 4.0,

  // Optional matchup knobs (v1 lightweight)
  MATCHUP_RIM_ALPHA: 1.0,
  MATCHUP_TOV_ALPHA: 0.8,
  MATCHUP_SHOOT_ALPHA: 0.7,

  // Legacy fields (kept so other imports don't break)
  STRENGTH_SCALE: 1.0,
  SHOOT_SIGMA: 0.35,
  TOV_SIGMA: 0.35,
  GAME_SIGMA: 0.35,
} as const;

export const PLAYOFF_PARAMS = {
  TOP_TEAMS: 1,
  WINS_NEEDED: 3, // best-of-5
} as const;

// Series visual mapping thresholds (UI-only)
export const SERIES_LENGTH_THRESHOLDS = [
  { minWinPct: 0.80, wins: [4, 0] },
  { minWinPct: 0.70, wins: [4, 1] },
  { minWinPct: 0.60, wins: [4, 2] },
  { minWinPct: 0.50, wins: [4, 3] },
] as const;

export const SERIES_PATH_PARAMS = {
  MIN_EARLY_P: 0.35,
  MAX_EARLY_P: 0.65,
  BIAS_STRENGTH: 0.15,
  MIN_PROB: 0.35,      
  MAX_PROB: 0.65,
} as const;

// Feature names (used for standardization / debugging)
export const FEATURE_NAMES = [
  'TS',
  'AST',
  'TOV',
  'A2T',
  'THREE_PA_RATE',
  'FT_RATE',
  'BLK',
  'STL',
  'REB',
  'USG',
  'PAR',
  'VI',
] as const;

// Position → broad role bucket (for role averages)
export const POSITION_TO_ROLE: Record<string, RoleCategory> = {
  PG: 'G',
  SG: 'G',
  SF: 'W',
  PF: 'B',
  C: 'B',
};

export const TRADE_WINDOW_DURATION_MS = 10 * 60 * 1000; // 10 minutes
