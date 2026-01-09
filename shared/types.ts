/**
 * Shared types for NBA Draft + League Simulation
 * Used by both client and server
 */

// ============================================================================
// PLAYER TYPES
// ============================================================================

export interface PlayerRawStats {
  // Identification
  playerId: string;
  name: string;
  team: string;
  position: string;

  // Displayed stats (UI)
  PTS: number;
  REB: number;      // Total rebounds for display
  AST: number;
  STL: number;
  BLK: number;
  TS_PCT: number;

  // Core stats
  MP_TOTAL: number;
  GP: number;
  FGA: number;
  FTA: number;
  FTM: number;
  TOV: number;
  THREE_PA: number;
  THREE_PM: number;
  THREE_P_PCT: number;
  FT_PCT: number;
  ORB: number;      // Phase 2: Split rebounds for backend
  DRB: number;      // Phase 2: Split rebounds for backend
  PF: number;

  // Phase 2: Shot selection detail
  TWO_PA: number;
  TWO_PM: number;
  TWO_P_PCT: number;

  // Phase 2: Playmaking detail (optional - if available from NBA API)
  POTENTIAL_AST?: number;
  SECONDARY_AST?: number;
  PASSES_MADE?: number;
  PASSES_RECEIVED?: number;

  // Phase 2: Defensive detail (optional)
  DEFLECTIONS?: number;
  CHARGES_DRAWN?: number;
  CONTESTED_SHOTS?: number;

  // Phase 2: Advanced stats (optional, can be computed)
  POSSESSIONS?: number;
  TOUCHES?: number;
  SCREEN_ASSISTS?: number;

  // Computed proxies (optional)
  USG_PROXY?: number;
  AST_PCT_PROXY?: number;
  TOV_PCT_PROXY?: number;
  OREB_PCT?: number;
  DREB_PCT?: number;
  REB_PCT?: number;
}

// ============================================================================
// PLAYER FEATURES - Phase 2 Expanded (30 features)
// ============================================================================

export interface PlayerFeatures {
  // Reliability
  R: number;

  // Shooting (9 features)
  TS: number;
  THREE_P_PCT: number;
  THREE_PA_RATE: number;
  TWO_P_PCT: number;
  TWO_PA_RATE: number;
  FT_PCT: number;
  FT_RATE: number;
  EFG: number;              // Effective FG%
  THREE_P_VOLUME: number;   // 3PA per 36 minutes

  // Playmaking (6 features)
  AST: number;
  AST_RATE: number;         // AST per 100 possessions
  POTENTIAL_AST: number;
  AST_TO_PASS_RATE: number;
  SECONDARY_AST: number;
  PAR: number;              // Pomeroy Assist Ratio

  // Ball Security (3 features)
  TOV: number;
  TOV_RATE: number;         // TOV per 100 possessions
  A2T: number;

  // Defense (7 features)
  STL: number;
  BLK: number;
  STL_RATE: number;         // STL per 100 possessions
  BLK_RATE: number;         // BLK per 100 possessions
  DEFLECTIONS: number;
  PF_RATE: number;          // PF per 36 minutes
  CHARGES_DRAWN: number;

  // Rebounding (3 features)
  OREB_PCT: number;         // Offensive rebound percentage
  DREB_PCT: number;         // Defensive rebound percentage
  REB_TOTAL: number;        // Total rebounds (display only, not used in archetypes)

  // Usage & Impact (2 features)
  USG: number;
  VI: number;

  // Allow indexing
  [key: string]: number | undefined;
}


// ============================================================================
// ARCHETYPES - Phase 2 Positionless (13 total)
// ============================================================================

export type ArchetypeName =
  // Creation & Offense (7)
  | 'PrimaryCreator'
  | 'SecondaryPlaymaker'
  | 'VolumeSniper'
  | 'EfficientSpacer'
  | 'ShotMaker'
  | 'AdvantageDriver'
  | 'Connector'
  // Defense & Activity (6)
  | 'PointOfAttackMenace'
  | 'Disruptor'
  | 'RimDeterrent'
  | 'ReboundEnforcer'
  | 'HustleEngine'
  | 'WinDriver';


export interface ArchetypeProfile extends Record<ArchetypeName, number> {
  [key: string]: number | undefined;
}

// Phase 2: Archetype cap configuration
export interface ArchetypeCap {
  feature: string;
  percentileThreshold: number;
  capValue: number;
}

export interface Player {
  playerId: string;
  name: string;
  team: string;
  position: string;
  rawStats: PlayerRawStats;
  features: PlayerFeatures;
  archetypes: ArchetypeProfile;
  impactRating: number;
}

// ============================================================================
// LEAGUE SNAPSHOT
// ============================================================================

export interface LeagueSnapshot {
  snapshotId: string;
  createdAt: string;
  season: string;
  players: Player[];
  populationStats: {
    mean: Record<string, number>;
    std: Record<string, number>;
  };
  roleAverages: {
    [role: string]: Record<string, number>;
  };
}

// ============================================================================
// DRAFT TYPES
// ============================================================================

export type PickTimer = 60 | 120 | 300;  // 1, 2, or 5 minutes in seconds

export interface LobbyConfig {
  teamCount: number;  // 4-12
  rosterSize: number;  // 10-15
  pickTimer: PickTimer;
}

export interface DraftPick {
  pickNumber: number;
  round: number;
  teamId: string;
  playerId: string | null;
  timestamp: string | null;
  isAutoPick: boolean;
}

export interface DraftOrder {
  pickNumber: number;
  round: number;
  teamId: string;
}

export interface DraftTeam {
  teamId: string;
  userId: string;
  displayName: string;
  roster: string[];  // playerIds
  queue: string[];   // playerIds in queue
}

export type DraftStatus = 'waiting' | 'ready' | 'active' | 'paused' | 'completed';

export interface DraftState {
  draftId: string;
  status: DraftStatus;
  config: LobbyConfig;
  teams: DraftTeam[];
  draftOrder: DraftOrder[];
  picks: DraftPick[];
  currentPickIndex: number;
  timeRemaining: number | null;
  pausedBy: string | null;
  availablePlayers: string[];  // playerIds
  leagueSnapshotId: string;
}

// ============================================================================
// SIMULATION TYPES
// ============================================================================

export interface TeamAggregation {
  teamId: string;
  features: PlayerFeatures;
  archetypes: ArchetypeProfile;
  modifiers: TeamModifiers;
  overallRating: number;
  rotation: Array<{
    playerId: string;
    name: string;
    impactRating: number;
  }>;
}

export interface TeamModifiers {
  total: number;
  shootBonus: number;
  creatorPen: number;
  rimPen: number;
  offenseBonus: number;
  offensePenalty: number;
  defenseBonus: number;
  defensePenalty: number;
  variancePenalty: number;
}

export interface MatchupDriver {
  category: string;
  impact: number;
  advantage: 'A' | 'B' | 'neutral';
}

export interface MatchupResult {
  winner: 'A' | 'B';
  winPctA: number;
  winsA: number;
  winsB: number;
  drivers: MatchupDriver[];
}

// ============================================================================
// REGULAR SEASON - Phase 1 with Editorial
// ============================================================================

export interface RegularSeasonGame {
  gameId: string;
  teamAId: string;
  teamBId: string;
  result: MatchupResult;
  editorial: string;  // Phase 1: Added editorial text
}

export interface TeamRecord {
  teamId: string;
  wins: number;
  losses: number;
  winPct: number;
}

export interface RegularSeasonResults {
  standings: TeamRecord[];
  games: RegularSeasonGame[];
  summary: string;  // Phase 1: Added season summary
}

// ============================================================================
// PLAYOFFS - Phase 3 with Editorial
// ============================================================================

export interface SeriesGame {
  gameNumber: number;
  winner: 'A' | 'B';
  result: MatchupResult;
}

export interface PlayoffSeries {
  seriesId: string;
  teamAId: string;
  teamBId: string;
  winsA: number;
  winsB: number;
  winner: string;
  games: SeriesGame[];
  displayedSeriesLength: [number, number];
  seriesPath: ('A' | 'B')[];
  seriesEditorial: string;      // Phase 3: Added series editorial
  gameEditorials: string[];     // Phase 3: Added game editorials
}

export interface PlayoffResults {
  semiFinal1: PlayoffSeries;
  semiFinal2: PlayoffSeries;
  finals: PlayoffSeries;
  champion: string;
  championshipEditorial: string;  // Phase 3: Added championship editorial
}

// ============================================================================
// LEAGUE STATE - Phase 0 Updated
// ============================================================================

export type LeaguePhase =
  | 'draft'
  | 'draft_recap'
  | 'trade_window'
  | 'regular_season'
  | 'playoffs'
  | 'complete';

export interface LeagueState {
  leagueId: string;
  phase: LeaguePhase;
  draftState: DraftState | null;
  regularSeasonResults: RegularSeasonResults | null;
  playoffResults: PlayoffResults | null;
  tradeWindowEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// SESSION & USER TYPES
// ============================================================================

export interface UserSession {
  userId: string;
  displayName: string;
  createdAt: string;
}

export interface LobbyUser {
  userId: string;
  displayName: string;
  teamId: string | null;
  isCommissioner: boolean;
  isConnected: boolean;
}

export interface LobbyState {
  lobbyId: string;
  commissionerId: string;
  config: LobbyConfig;
  users: LobbyUser[];
  inviteCode: string;
  canStart: boolean;
}

// ============================================================================
// WEBSOCKET MESSAGE TYPES
// ============================================================================

export type ClientMessage =
  | { type: 'CREATE_LOBBY'; payload: { config: LobbyConfig } }
  | { type: 'JOIN_LOBBY'; payload: { inviteCode: string; displayName: string } }
  | { type: 'READY_UP' }
  | { type: 'START_DRAFT' }
  | { type: 'MAKE_PICK'; payload: { playerId: string } }
  | { type: 'PAUSE_DRAFT' }
  | { type: 'UNPAUSE_DRAFT' }
  | { type: 'UPDATE_QUEUE'; payload: { pickQueue: string[] } }
  | { type: 'START_TRADE_WINDOW' }
  | { type: 'EXECUTE_TRADE'; payload: { teamAId: string; teamBId: string; playerAIds: string[]; playerBIds: string[] } }
  | { type: 'START_REGULAR_SEASON' }
  | { type: 'START_PLAYOFFS' }
  | { type: 'COMPLETE_LEAGUE' };  // Phase 0: New event

export type ServerMessage =
  | { type: 'LOBBY_CREATED'; payload: LobbyState }
  | { type: 'LOBBY_UPDATED'; payload: LobbyState }
  | { type: 'DRAFT_STARTED'; payload: DraftState }
  | { type: 'DRAFT_UPDATED'; payload: DraftState }
  | { type: 'DRAFT_COMPLETED'; payload: DraftState }
  | { type: 'PICK_MADE'; payload: { pickNumber: number; teamId: string; playerId: string | null } }
  | { type: 'TIMER_TICK'; payload: { timeRemaining: number } }
  | { type: 'TRADE_WINDOW_STARTED'; payload: { endsAt: string } }
  | { type: 'TRADE_TIMER_TICK'; payload: { timeRemaining: number } }  // Phase 0: New event
  | { type: 'TRADE_EXECUTED'; payload: LeagueState }
  | { type: 'REGULAR_SEASON_STARTED'; payload: RegularSeasonResults }
  | { type: 'PLAYOFFS_STARTED'; payload: PlayoffResults }
  | { type: 'LEAGUE_UPDATED'; payload: LeagueState }
  | { type: 'LEAGUE_COMPLETED'; payload: LeagueState }  // Phase 0: New event
  | { type: 'ERROR'; payload: { message: string } };

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// WEBSOCKET EVENTS - Phase 0 Updated
// ============================================================================

export const WS_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',

  // Session events
  SESSION_INFO: 'session:info',

  // Lobby
  CREATE_LOBBY: 'lobby:create',
  JOIN_LOBBY: 'lobby:join',
  READY_UP: 'lobby:ready',
  LOBBY_CREATED: 'lobby:created',
  LOBBY_UPDATED: 'lobby:updated',

  // Draft
  START_DRAFT: 'draft:start',
  MAKE_PICK: 'draft:pick',
  PAUSE_DRAFT: 'draft:pause',
  UNPAUSE_DRAFT: 'draft:unpause',
  UPDATE_QUEUE: 'draft:update_queue',
  DRAFT_STARTED: 'draft:started',
  DRAFT_UPDATED: 'draft:updated',
  PICK_MADE: 'draft:pick_made',
  TIMER_TICK: 'draft:timer_tick',
  DRAFT_COMPLETED: 'draft:completed',

  // Trade
  START_TRADE_WINDOW: 'trade:start_window',
  EXECUTE_TRADE: 'trade:execute',
  TRADE_WINDOW_STARTED: 'trade:window_started',
  TRADE_EXECUTED: 'trade:executed',
  TRADE_TIMER_TICK: 'trade:timer_tick',  // Phase 0: NEW

  // League
  START_REGULAR_SEASON: 'league:start_season',
  START_PLAYOFFS: 'league:start_playoffs',
  COMPLETE_LEAGUE: 'league:complete',  // Phase 0: NEW
  REGULAR_SEASON_STARTED: 'league:season_started',
  PLAYOFFS_STARTED: 'league:playoffs_started',
  LEAGUE_UPDATED: 'league:updated',
  LEAGUE_COMPLETED: 'league:completed',  // Phase 0: NEW

  // Errors
  ERROR: 'error',
} as const;

export type WSEvent = (typeof WS_EVENTS)[keyof typeof WS_EVENTS];

// Keep these aligned with your product rules
export const DRAFT_CONSTRAINTS = {
  TEAMS_MIN: 1,
  TEAMS_MAX: 12,
  ROSTER_MIN: 10,
  ROSTER_MAX: 15,
  // you said 1,2,5 minutes per pick
  PICK_TIMER_OPTIONS_SECONDS: [60, 120, 300] as const,
  SIMS_PER_MATCHUP: 100,
  PLAYOFF_TEAMS: 4,
  PLAYOFF_BEST_OF: 3, // 3 separate sims, not a series animation
  SERIES_VISUAL_MAX_GAMES: 7, // visual suspense only
  TOP_20_AUTO_PICK: 20,
} as const;

export type RoleCategory = 'G' | 'W' | 'B';

/**
 * Shared constants for NBA Draft + League Simulation
 * Tunable parameters for simulation balance
 */

// ============================================================================
// TIMING CONSTANTS - Phase 0 Updated
// ============================================================================

export const TRADE_WINDOW_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export const DRAFT_TIMER_DURATION_SECONDS = 90; // 90 seconds per pick

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
// ARCHETYPE WEIGHTS - Phase 2 Complete Rewrite
// ============================================================================

export const ARCHETYPE_WEIGHTS: Record<string, Record<string, number>> = {
  // ==========================================================================
  // CREATION & OFFENSE (7 archetypes)
  // ==========================================================================

  PrimaryCreator: {
    AST: 0.35,
    AST_RATE: 0.25,
    USG: 0.20,
    PAR: 0.15,
    TS: 0.10,
    // Negatives
    TOV_RATE: -0.15,
    PF_RATE: -0.05,
  },

  SecondaryPlaymaker: {
    AST: 0.25,
    AST_RATE: 0.20,
    TS: 0.20,
    THREE_PA_RATE: 0.15,
    PAR: 0.15,
    // Negatives
    TOV_RATE: -0.10,
    USG: -0.15,
  },

  VolumeSniper: {
    THREE_PA_RATE: 0.35,
    THREE_P_VOLUME: 0.30,
    THREE_P_PCT: 0.25,
    EFG: 0.10,
  },

  EfficientSpacer: {
    THREE_P_PCT: 0.35,
    TS: 0.25,
    EFG: 0.20,
    THREE_PA_RATE: 0.15,
    // Negatives
    USG: -0.10,
  },

  ShotMaker: {
    USG: 0.30,
    TWO_P_PCT: 0.20,
    TS: 0.15,
    FT_RATE: 0.20,
    TWO_PA_RATE: 0.10,
    // Negatives
    TOV_RATE: -0.15,
  },

  AdvantageDriver: {
    FT_RATE: 0.40,
    USG: 0.25,
    TWO_PA_RATE: 0.20,
    TS: 0.10,
    // Negatives
    THREE_PA_RATE: -0.15,
  },

  Connector: {
    TS: 0.25,
    THREE_PA_RATE: 0.20,
    AST_TO_PASS_RATE: 0.20,
    PAR: 0.20,
    VI: 0.10,
    // Negatives
    USG: -0.25,
    TOV_RATE: -0.15,
  },

  // ==========================================================================
  // DEFENSE & ACTIVITY (6 archetypes)
  // ==========================================================================

  PointOfAttackMenace: {
    STL_RATE: 0.35,
    DEFLECTIONS: 0.30,
    STL: 0.20,
    VI: 0.15,
    // Negatives
    PF_RATE: -0.20,
  },

  Disruptor: {
    STL_RATE: 0.30,
    BLK_RATE: 0.20,
    DEFLECTIONS: 0.25,
    VI: 0.15,
    STL: 0.10,
  },

  RimDeterrent: {
    BLK_RATE: 0.45,
    BLK: 0.25,
  DREB_PCT: 0.20,
    PF_RATE: 0.10,
  },

  ReboundEnforcer: {
    OREB_PCT: 0.40,
    DREB_PCT: 0.40,
    VI: 0.10,
    REB_TOTAL: 0.10,
  },

  HustleEngine: {
    OREB_PCT: 0.30,
    STL_RATE: 0.25,
    DEFLECTIONS: 0.20,
    CHARGES_DRAWN: 0.15,
    VI: 0.10,
  },

  WinDriver: {
    PAR: 0.30,
    TS: 0.20,
    VI: 0.25,
    // Strong negatives
    TOV_RATE: -0.30,
    PF_RATE: -0.20,
    USG: -0.35,
  },
};

// ============================================================================
// ARCHETYPE NAMES - Phase 2
// ============================================================================

export const ARCHETYPE_NAMES: string[] = [
  // Creation & Offense
  'PrimaryCreator',
  'SecondaryPlaymaker',
  'VolumeSniper',
  'EfficientSpacer',
  'ShotMaker',
  'AdvantageDriver',
  'Connector',
  // Defense & Activity
  'PointOfAttackMenace',
  'Disruptor',
  'RimDeterrent',
  'ReboundEnforcer',
  'HustleEngine',
  'WinDriver',
];

// ============================================================================
// ARCHETYPE CAPS - Phase 2
// ============================================================================

export const ARCHETYPE_CAPS: Record<string, Array<{ feature: string; percentileThreshold: number; capValue: number }>> = {
  VolumeSniper: [
    { feature: 'THREE_P_PCT', percentileThreshold: 0.25, capValue: 0.10 }
  ],
  EfficientSpacer: [
    { feature: 'THREE_P_PCT', percentileThreshold: 0.25, capValue: 0.15 }
  ],
  ShotMaker: [
    { feature: 'TS', percentileThreshold: 0.30, capValue: 0.10 }
  ],
  RimDeterrent: [
    { feature: 'BLK_RATE', percentileThreshold: 0.30, capValue: 0.10 }
  ],
  AdvantageDriver: [
    { feature: 'FT_RATE', percentileThreshold: 0.25, capValue: 0.10 }
  ],
};

// ============================================================================
// ARCHETYPE PARAMS - Phase 2
// ============================================================================

export const ARCHETYPE_PARAMS = {
  SOFTMAX_TEMPERATURE: 0.7,
  MIN_ARCHETYPE_SCORE: 0.05,
  USE_PERCENTILES: true,
} as const;


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
// TEAM MODIFIER PARAMS
// ============================================================================

export const TEAM_MODIFIER_PARAMS = {
  // Creator redundancy
  CREATOR_THRESHOLD: 0.45,
  CREATOR_PENALTY: -0.03,

  // Spacing bonus
  SPACING_WEIGHT_3PA: 0.35,
  SPACING_WEIGHT_SHOOTER: 0.65,
  SPACING_THRESHOLD: 0.45,
  SPACING_BONUS_MULT: 0.06,

  // Rim protection
  RIM_THRESHOLD: 0.18,
  RIM_PENALTY: -0.04,

  // Versatility
  VI_THRESHOLD: 0.45,
  VI_PENALTY_MULT: 0.05,

  // Composition bonus
  COMP_BONUS_BASE: 0.02,
  COMP_BONUS_THRESHOLD: 0.60,

  // Caps
  MAX_TOTAL: 0.07,
  MAX_COMPONENT: 0.06,
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
// SIMULATION PARAMS
// ============================================================================

export const SIMULATION_PARAMS = {
  NUM_SIMULATIONS: 100,
  BASE_PACE: 99,
  BASE_ORTG: 113,
  BASE_DRTG: 113,

  // Multipliers
  ORTG_TS_MULT: 30,
  ORTG_AST_MULT: 2.5,
  ORTG_PAR_MULT: 1.5,
  ORTG_3PA_MULT: 15,
  ORTG_FT_MULT: 8,
  ORTG_TOV_MULT: -3,
  ORTG_USAGE_MULT: 1.0,

  DRTG_BLK_MULT: 5,
  DRTG_STL_MULT: 3,
  DRTG_REB_MULT: 2,

  // Variance
  SIGMA_BASE: 5.5,
  SIGMA_THREES: 2.0,
  SIGMA_TOV: 1.5,
  SIGMA_VI_PENALTY: 3.0,

  // Matchup advantages
  MATCHUP_ADV_TS: 0.6,
  MATCHUP_ADV_PAR: 0.4,
  MATCHUP_ADV_THREE: 0.5,
  MATCHUP_ADV_VI: 0.3,
} as const;

export const PLAYOFF_PARAMS = {
  TOP_TEAMS: 4,
  WINS_NEEDED: 3, // Best-of-5 for finals
  SEMIFINALS_WINS_NEEDED: 2, // Phase 3: Best-of-3 for semifinals
  FINALS_WINS_NEEDED: 3, // Phase 3: Best-of-5 for finals
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
  'R',
  'TS',
  'THREE_P_PCT',
  'THREE_PA_RATE',
  'TWO_P_PCT',
  'TWO_PA_RATE',
  'FT_PCT',
  'FT_RATE',
  'EFG',
  'THREE_P_VOLUME',
  'AST',
  'AST_RATE',
  'POTENTIAL_AST',
  'AST_TO_PASS_RATE',
  'SECONDARY_AST',
  'PAR',
  'TOV',
  'TOV_RATE',
  'A2T',
  'STL',
  'BLK',
  'STL_RATE',
  'BLK_RATE',
  'DEFLECTIONS',
  'PF_RATE',
  'CHARGES_DRAWN',
  'OREB_PCT',
  'DREB_PCT',
  'REB_TOTAL',
  'USG',
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
