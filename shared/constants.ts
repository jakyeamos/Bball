/**
 * Shared constants for NBA Draft + League Simulation
 * Tunable parameters for simulation balance
 */

import { ArchetypeName } from './types';

// ============================================================================
// RELIABILITY SHRINKAGE PARAMETERS
// ============================================================================

export const RELIABILITY_PARAMS = {
  MP_MIDPOINT: 1000,    // Minutes played midpoint for sigmoid
  MP_SCALE: 300,        // Scale factor for minutes sigmoid
  GP_MIDPOINT: 50,      // Games played midpoint for sigmoid
  GP_SCALE: 15,         // Scale factor for games sigmoid
  MP_WEIGHT: 0.75,      // Weight for minutes in reliability
  GP_WEIGHT: 0.25,      // Weight for games in reliability
};

// ============================================================================
// ARCHETYPE WEIGHTS
// ============================================================================

export const ARCHETYPE_WEIGHTS: Record<ArchetypeName, Record<string, number>> = {
  PrimaryCreator: { USG: 1.4, AST: 1.2, A2T: 0.6, TS: 0.2, TOV: -0.6 },
  SecondaryCreator: { USG: 0.8, AST: 0.8, TS: 0.4, TOV: -0.3 },
  Connector: { A2T: 1.2, TOV: -0.7, TS: 0.4, AST: 0.4 },
  OffBallShooter: { THREE_PA_RATE: 1.4, TS: 0.9, USG: -0.2 },
  MovementShooter: { THREE_PA_RATE: 1.1, TS: 0.7, USG: 0.2 },
  Slasher: { FT_RATE: 1.2, USG: 0.6, TS: 0.2, THREE_PA_RATE: -0.3 },
  PostScorer: { USG: 0.6, TS: 0.3, FT_RATE: 0.3 },
  PlaymakingBig: { AST: 1.0, USG: 0.4, REB: 0.4 },
  POAStopper: { STL: 0.8 },
  HelpDefender: { STL: 0.6, BLK: 0.4 },
  RimProtector: { BLK: 1.6, REB: 0.5 },
  DefAnchor: { BLK: 1.0, REB: 1.0 },
  DefPlaymaker: { STL: 1.4, BLK: 0.6 },
  ThreeAndD: { THREE_PA_RATE: 0.9, TS: 0.5, STL: 0.4, BLK: 0.2 },
  StretchBig: { THREE_PA_RATE: 1.0, REB: 0.2, BLK: 0.2 },
  VerticalRoller: { FT_RATE: 0.7, REB: 0.6, BLK: 0.2 },
  Rebounder: { REB: 1.7, BLK: 0.2 },
  UtilityWing: { TS: 0.5, THREE_PA_RATE: 0.4, AST: 0.4, STL: 0.4, REB: 0.3 },
};

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
];

// ============================================================================
// IMPACT RATING WEIGHTS (for rotation selection & auto-pick)
// ============================================================================

export const IMPACT_WEIGHTS = {
  TS: 0.35,
  AST: 0.20,
  TOV: -0.15,
  THREE_PA_RATE: 0.10,
  BLK: 0.10,
  STL: 0.10,
};

// ============================================================================
// TEAM AGGREGATION
// ============================================================================

export const ROTATION_SIZE = 8;  // Top 8 players by impact rating

// ============================================================================
// ANTI-DOMINATION MODIFIERS
// ============================================================================

export const TEAM_MODIFIER_PARAMS = {
  CREATOR_TARGET: 30,      // Target % for Primary + Secondary creators
  CREATOR_CAP: 0.07,       // Max penalty for too many creators
  CREATOR_K: 0.05,         // Diminishing returns steepness

  SHOOT_CAP: 0.05,         // Max bonus for shooting
  SHOOT_K: 0.04,           // Diminishing returns steepness

  RIMPROT_MIN: 10,         // Minimum % for rim protection
  RIMPROT_PENALTY_RATE: 0.002,  // Penalty per % below minimum
  RIMPROT_MAX_PENALTY: 0.06,    // Max penalty for lack of rim protection

  TOTAL_MIN: -0.07,        // Min total modifier
  TOTAL_MAX: 0.07,         // Max total modifier
};

// ============================================================================
// TEAM STRENGTH CALCULATION
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
};

// ============================================================================
// MATCHUP SIMULATION PARAMETERS
// ============================================================================

export const SIM_PARAMS = {
  SIMS_PER_MATCHUP: 100,
  STRENGTH_SCALE: 2.5,      // Scale factor for team strength difference
  SHOOT_SIGMA: 0.3,         // Shooting variance std dev
  TOV_SIGMA: 0.25,          // Turnover variance std dev
  GAME_SIGMA: 0.4,          // Generic game noise std dev
};

// ============================================================================
// PLAYOFFS PARAMETERS
// ============================================================================

export const PLAYOFF_PARAMS = {
  TOP_TEAMS: 4,
  SERIES_WINS_NEEDED: 2,    // Best of 3
  SIMS_PER_GAME: 100,       // Each game is 100 sims
};

// ============================================================================
// SERIES LENGTH MAPPING (UI)
// ============================================================================

export const SERIES_LENGTH_THRESHOLDS = [
  { minWinPct: 0.80, seriesLength: [4, 0] as [number, number] },
  { minWinPct: 0.70, seriesLength: [4, 1] as [number, number] },
  { minWinPct: 0.60, seriesLength: [4, 2] as [number, number] },
  { minWinPct: 0.00, seriesLength: [4, 3] as [number, number] },
];

export const SERIES_PATH_PARAMS = {
  BIAS_STRENGTH: 0.15,      // How much to bias early games
  MIN_PROB: 0.35,           // Minimum probability for any single game
  MAX_PROB: 0.65,           // Maximum probability for any single game
};

// ============================================================================
// DRAFT CONFIGURATION CONSTRAINTS
// ============================================================================

export const DRAFT_CONSTRAINTS = {
  MIN_TEAMS: 4,
  MAX_TEAMS: 12,
  MIN_ROSTER: 10,
  MAX_ROSTER: 15,
  PICK_TIMERS: [60, 120, 300] as const,
  TOP_20_AUTO_PICK: 20,     // Auto-pick from top 20 by impact if timer expires
};

// ============================================================================
// FEATURE NAMES (for standardization)
// ============================================================================

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
] as const;

// ============================================================================
// ROLE CATEGORIES (for shrinkage)
// ============================================================================

export type RoleCategory = 'G' | 'W' | 'B';  // Guard, Wing, Big

export const POSITION_TO_ROLE: Record<string, RoleCategory> = {
  'PG': 'G',
  'SG': 'G',
  'G': 'G',
  'SF': 'W',
  'PF': 'W',
  'F': 'W',
  'C': 'B',
};

// ============================================================================
// TRADE WINDOW
// ============================================================================

export const TRADE_WINDOW_DURATION_MS = 5 * 60 * 1000;  // 5 minutes

// ============================================================================
// WEBSOCKET EVENTS
// ============================================================================

export const WS_EVENTS = {
  // Client -> Server
  CREATE_LOBBY: 'CREATE_LOBBY',
  JOIN_LOBBY: 'JOIN_LOBBY',
  START_DRAFT: 'START_DRAFT',
  MAKE_PICK: 'MAKE_PICK',
  UPDATE_QUEUE: 'UPDATE_QUEUE',
  PAUSE_DRAFT: 'PAUSE_DRAFT',
  UNPAUSE_DRAFT: 'UNPAUSE_DRAFT',
  START_TRADE_WINDOW: 'START_TRADE_WINDOW',
  EXECUTE_TRADE: 'EXECUTE_TRADE',
  START_REGULAR_SEASON: 'START_REGULAR_SEASON',
  START_PLAYOFFS: 'START_PLAYOFFS',

  // Server -> Client
  LOBBY_CREATED: 'LOBBY_CREATED',
  LOBBY_UPDATED: 'LOBBY_UPDATED',
  DRAFT_STARTED: 'DRAFT_STARTED',
  DRAFT_UPDATED: 'DRAFT_UPDATED',
  PICK_MADE: 'PICK_MADE',
  TIMER_TICK: 'TIMER_TICK',
  DRAFT_COMPLETED: 'DRAFT_COMPLETED',
  TRADE_WINDOW_STARTED: 'TRADE_WINDOW_STARTED',
  TRADE_EXECUTED: 'TRADE_EXECUTED',
  REGULAR_SEASON_STARTED: 'REGULAR_SEASON_STARTED',
  PLAYOFFS_STARTED: 'PLAYOFFS_STARTED',
  LEAGUE_UPDATED: 'LEAGUE_UPDATED',
  ERROR: 'ERROR',

  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  RECONNECT: 'reconnect',
} as const;
