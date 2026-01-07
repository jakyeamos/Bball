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

export type ArchetypeProfile = Record<ArchetypeName, number>;

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
  TEAMS_MIN: 4,
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
}