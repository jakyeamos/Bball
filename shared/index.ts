/**
 * Shared types for NBA Draft + League Simulation
 * Used by both client and server
 */

// ============================================================================
// PLAYER TYPES
// ============================================================================

export interface PlayerRawStats {
  // Player identification
  playerId: string;
  name: string;
  team: string;
  position: string;

  // Displayed stats (UI)
  PTS: number;
  REB: number;
  AST: number;
  STL: number;
  BLK: number;
  TS_PCT: number;

  // Internal stats (simulation)
  MP_TOTAL: number;
  GP: number;
  FGA: number;
  FTA: number;
  TOV: number;
  THREE_PA: number;
  THREE_P_PCT: number;
  FT_PCT: number;
  ORB: number;
  DRB: number;
  PF: number;

  // Proxies (can be calculated or scraped)
  USG_PROXY?: number;
  AST_PCT_PROXY?: number;
  TOV_PCT_PROXY?: number;
  RIM_PRESSURE_PROXY?: number;
  SHOOTING_GRAVITY_PROXY?: number;
  DEF_PLAYMAKING_PROXY?: number;
  RIM_PROTECT_PROXY?: number;
  REB_RATE_PROXY?: number;
}

export interface PlayerFeatures {
  R: number;  // Reliability factor
  TS: number;
  AST: number;
  TOV: number;
  A2T: number;  // Assist to turnover ratio
  THREE_PA_RATE: number;
  FT_RATE: number;
  BLK: number;
  STL: number;
  REB: number;
  USG: number;
  PAR?: number;  // Pomeroy Assist Ratio
  VI?: number;   // Versatility Index (positive-only)
  [key: string]: number | undefined;
}

export type ArchetypeName =
  | 'PrimaryCreator'
  | 'SecondaryCreator'
  | 'Connector'
  | 'OffBallShooter'
  | 'MovementShooter'
  | 'Slasher'
  | 'PostScorer'
  | 'PlaymakingBig'
  | 'POAStopper'
  | 'HelpDefender'
  | 'RimProtector'
  | 'DefAnchor'
  | 'DefPlaymaker'
  | 'ThreeAndD'
  | 'StretchBig'
  | 'VerticalRoller'
  | 'Rebounder'
  | 'UtilityWing'
  | 'TransitionEngine'
  | 'BenchMicrowave'
  | 'LowUsageSniper'
  | 'SwitchableBig'
  | 'ScreenHub';

export interface ArchetypeProfile extends Record<ArchetypeName, number> {
  [key: string]: number | undefined;
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
  features: {
    TS: number;
    AST: number;
    TOV: number;
    THREE_PA_RATE: number;
    FT_RATE: number;
    REB: number;
    BLK: number;
    STL: number;
    USG: number;
    PAR: number;
    VI: number;
    A2T?: number;
  };
  archetypes: ArchetypeProfile;
  rotationPlayerIds: string[];  // Top 8 by impact rating
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

export interface RegularSeasonGame {
  gameId: string;
  teamAId: string;
  teamBId: string;
  result: MatchupResult;
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
}

// ============================================================================
// PLAYOFFS TYPES
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
  displayedSeriesLength: [number, number];  // e.g., [4, 2]
  seriesPath: ('A' | 'B')[];  // For UI animation
}

export interface PlayoffResults {
  semiFinal1: PlayoffSeries;
  semiFinal2: PlayoffSeries;
  finals: PlayoffSeries;
  champion: string;
}

// ============================================================================
// LEAGUE STATE
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
  | { type: 'CREATE_LOBBY'; payload: LobbyConfig }
  | { type: 'JOIN_LOBBY'; payload: { inviteCode: string; displayName: string } }
  | { type: 'START_DRAFT' }
  | { type: 'MAKE_PICK'; payload: { playerId: string } }
  | { type: 'UPDATE_QUEUE'; payload: { queue: string[] } }
  | { type: 'PAUSE_DRAFT' }
  | { type: 'UNPAUSE_DRAFT' }
  | { type: 'START_TRADE_WINDOW' }
  | { type: 'EXECUTE_TRADE'; payload: { teamAId: string; teamBId: string; playerAIds: string[]; playerBIds: string[] } }
  | { type: 'START_REGULAR_SEASON' }
  | { type: 'START_PLAYOFFS' };

export type ServerMessage =
  | { type: 'LOBBY_CREATED'; payload: LobbyState }
  | { type: 'LOBBY_UPDATED'; payload: LobbyState }
  | { type: 'DRAFT_STARTED'; payload: DraftState }
  | { type: 'DRAFT_UPDATED'; payload: DraftState }
  | { type: 'PICK_MADE'; payload: DraftPick }
  | { type: 'TIMER_TICK'; payload: { timeRemaining: number } }
  | { type: 'DRAFT_COMPLETED'; payload: DraftState }
  | { type: 'TRADE_WINDOW_STARTED'; payload: { endsAt: string } }
  | { type: 'TRADE_EXECUTED'; payload: DraftState }
  | { type: 'REGULAR_SEASON_STARTED'; payload: RegularSeasonResults }
  | { type: 'PLAYOFFS_STARTED'; payload: PlayoffResults }
  | { type: 'LEAGUE_UPDATED'; payload: LeagueState }
  | { type: 'ERROR'; payload: { message: string } };

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const WS_EVENTS = {
  // Socket.io built-in events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',

  // Client → Server events (actions initiated by client)
  CREATE_LOBBY: 'create:lobby',
  JOIN_LOBBY: 'join:lobby',
  START_DRAFT: 'draft:start',
  MAKE_PICK: 'draft:make_pick',
  UPDATE_QUEUE: 'draft:update_queue',
  PAUSE_DRAFT: 'draft:pause',
  UNPAUSE_DRAFT: 'draft:unpause',
  START_TRADE_WINDOW: 'trade:start_window',
  EXECUTE_TRADE: 'trade:execute',
  START_REGULAR_SEASON: 'season:start_regular',
  START_PLAYOFFS: 'playoffs:start',

  // Server → Client events (updates from server)
  LOBBY_CREATED: 'lobby:created',
  LOBBY_UPDATED: 'lobby:updated',
  LOBBY_FULL: 'lobby:full',
  MEMBER_JOINED: 'member:joined',
  MEMBER_LEFT: 'member:left',
  MEMBER_UPDATED: 'member:updated',
  DRAFT_STARTED: 'draft:started',
  DRAFT_UPDATED: 'draft:updated',
  DRAFT_COMPLETED: 'draft:completed',
  PICK_MADE: 'draft:pick_made',
  PICK_AUTO: 'draft:pick_auto',
  TIMER_TICK: 'draft:timer_tick',
  DRAFT_PAUSED: 'draft:paused',
  DRAFT_RESUMED: 'draft:resumed',
  DRAFT_FINISHED: 'draft:finished',
  LEAGUE_UPDATED: 'league:updated',
  TRADE_WINDOW_STARTED: 'trade:window_started',
  REGULAR_SEASON_STARTED: 'season:regular_started',
  PLAYOFFS_STARTED: 'playoffs:started',
  TRADE_EXECUTED: 'trade:executed',
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

export interface RoleSummary {
  avg_TS: number;
  avg_AST: number;
  avg_TOV: number;
  avg_3PA_rate: number;
  avg_FT_rate: number;
  avg_BLK: number;
  avg_STL: number;
  avg_REB: number;
  avg_usage_proxy: number;
  avg_PAR: number;
  avg_VI: number;
  [key: string]: number;
}

/**
 * Shared constants for NBA Draft + League Simulation
 * Tunable parameters for simulation balance
 */

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
  SIGM_TOV: 1.5,
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
