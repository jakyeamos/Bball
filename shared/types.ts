/**
 * Shared types for NBA Draft + League Simulation - V2 UPDATE
 * Used by both client and server
 *
 * CHANGELOG:
 * - Phase 1A: Added SeasonFormat, isPublic to LobbyState, rotationDepth to LobbyConfig
 * - Phase 1B: Added RoundState, RoundPhase, CoachingWindow
 * - Phase 2: Added CoachingDecision, LineupStrategy, DefensiveStrategy
 * - Phase 2.5: Added TradeProposal, TradeProposalStatus
 */

// ============================================================================
// PLAYER TYPES (UNCHANGED)
// ============================================================================

export interface PlayerRawStats {
  // Identification
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
  ORB: number;
  DRB: number;
  PF: number;

  // Shot selection detail
  TWO_PA: number;
  TWO_PM: number;
  TWO_P_PCT: number;

  // Playmaking detail (optional)
  POTENTIAL_AST?: number;
  SECONDARY_AST?: number;
  PASSES_MADE?: number;
  PASSES_RECEIVED?: number;

  // Defensive detail (optional)
  DEFLECTIONS?: number;
  CHARGES_DRAWN?: number;
  CONTESTED_SHOTS?: number;

  // Advanced stats (optional)
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

export interface PlayerFeatures {
  R: number;
  TS: number;
  THREE_P_PCT: number;
  THREE_PA_RATE: number;
  TWO_P_PCT: number;
  TWO_PA_RATE: number;
  FT_PCT: number;
  FT_RATE: number;
  EFG: number;
  THREE_P_VOLUME: number;
  AST: number;
  AST_RATE: number;
  POTENTIAL_AST: number;
  AST_TO_PASS_RATE: number;
  SECONDARY_AST: number;
  PAR: number;
  TOV: number;
  TOV_RATE: number;
  A2T: number;
  STL: number;
  BLK: number;
  STL_RATE: number;
  BLK_RATE: number;
  DEFLECTIONS: number;
  PF_RATE: number;
  CHARGES_DRAWN: number;
  OREB_PCT: number;
  DREB_PCT: number;
  REB_TOTAL: number;
  USG: number;
  VI: number;
  [key: string]: number | undefined;
}

export type ArchetypeName =
  | 'PrimaryCreator'
  | 'SecondaryPlaymaker'
  | 'VolumeSniper'
  | 'EfficientSpacer'
  | 'ShotMaker'
  | 'AdvantageDriver'
  | 'Connector'
  | 'PointOfAttackMenace'
  | 'Disruptor'
  | 'RimDeterrent'
  | 'ReboundEnforcer'
  | 'HustleEngine'
  | 'WinDriver';

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
// PHASE 1A: SEASON FORMATS & PUBLIC LOBBIES
// ============================================================================

export type SeasonFormat = 'single_round_robin' | 'double_round_robin' | 'playoffs_only';

export type PickTimer = 60 | 120 | 300;

export interface LobbyConfig {
  teamCount: number;  // 4-12
  rosterSize: number;  // 10-15
  pickTimer: PickTimer;
  seasonFormat: SeasonFormat;  // NEW - Phase 1A
  rotationDepth: number;  // NEW - Phase 2 (5 to rosterSize)
}

export interface LobbyState {
  lobbyId: string;
  commissionerId: string;
  config: LobbyConfig;
  users: LobbyUser[];
  inviteCode: string;
  canStart: boolean;
  isPublic: boolean;  // NEW - Phase 1A
}

export interface PublicLobbyInfo {
  lobbyId: string;
  inviteCode: string;
  commissionerName: string;
  teamCount: number;
  currentPlayers: number;
  config: LobbyConfig;
  createdAt: string;
}

// ============================================================================
// PHASE 1B: ROUND-BASED EXECUTION
// ============================================================================

export type RoundPhase =
  | 'coaching_window'    // Coach makes decisions
  | 'simulating'         // Server running simulations
  | 'results'            // Showing results
  | 'complete';          // Round finished

export interface RoundState {
  roundNumber: number;
  phase: RoundPhase;
  coachingWindowEndsAt: string | null;
  matchups: RoundMatchup[];
  coachingDecisions: Map<string, CoachingDecision>;  // teamId -> decision
  roundResults: RoundResult | null;
}

export interface RoundMatchup {
  matchupId: string;
  teamAId: string;
  teamBId: string;
  homeTeam: 'A' | 'B';
}

export interface RoundResult {
  roundNumber: number;
  games: RegularSeasonGame[];
  updatedStandings: TeamRecord[];
}

// ============================================================================
// PHASE 2: COACHING DECISIONS
// ============================================================================

export type LineupStrategy =
  | 'balanced'           // Neutral (no modifiers)
  | 'small_ball'         // +Pace, +Shooting, -Rebounding
  | 'big_lineup'         // +Rebounding, +Defense, -Pace
  | 'offense_first'      // +Offense, -Defense
  | 'defense_first';     // +Defense, -Offense

export type DefensiveStrategy =
  | 'standard'           // Neutral
  | 'switch_everything'  // +Versatility bonus, -Size mismatch
  | 'protect_paint'      // +Rim protection, -Perimeter
  | 'pressure_ball'      // +Steals, +Turnovers forced, +Fouls
  | 'pack_paint';        // +Rim protection, -Three point defense

export type OffensiveStrategy =
  | 'balanced_attack'    // Neutral
  | 'pace_and_space'     // +3PA, +Pace, -Paint scoring
  | 'inside_out'         // +Paint scoring, +FT rate, -3PA
  | 'motion_offense'     // +Assists, +Ball movement
  | 'isolation';         // +Top player usage, -Team synergy

export interface CoachingDecision {
  teamId: string;
  roundNumber: number;
  rotation: string[];  // playerIds in rotation (length = rotationDepth)
  lineupStrategy: LineupStrategy;
  defensiveStrategy: DefensiveStrategy;
  offensiveStrategy: OffensiveStrategy;
  submittedAt: string;
}

export interface CoachingWindowConfig {
  durationSeconds: number;  // Default 120 (2 minutes)
  autoSubmitOnExpire: boolean;  // Default true
}

// ============================================================================
// PHASE 2.5: TRADE PROPOSALS
// ============================================================================

export type TradeProposalStatus =
  | 'pending'      // Awaiting other team's response
  | 'accepted'     // Both teams agreed
  | 'rejected'     // Other team declined
  | 'cancelled'    // Proposer cancelled
  | 'expired';     // Time limit passed

export interface TradeProposal {
  proposalId: string;
  fromTeamId: string;
  toTeamId: string;
  fromPlayerIds: string[];
  toPlayerIds: string[];
  status: TradeProposalStatus;
  createdAt: string;
  expiresAt: string;  // 5 minute expiry
  respondedAt?: string;
}

export interface TradeProposalNotification {
  proposal: TradeProposal;
  fromTeamName: string;
  toTeamName: string;
}

// ============================================================================
// DRAFT TYPES (UNCHANGED)
// ============================================================================

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
  roster: string[];
  queue: string[];
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
  availablePlayers: string[];
  leagueSnapshotId: string;
}

// ============================================================================
// SIMULATION TYPES (UNCHANGED)
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
  homeCourtAdvantage: number;
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
// REGULAR SEASON
// ============================================================================

export interface RegularSeasonGame {
  gameId: string;
  teamAId: string;
  teamBId: string;
  homeTeam: 'A' | 'B';
  result: MatchupResult;
  editorial: string;
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
  summary: string;
}

// ============================================================================
// PLAYOFFS
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
  seriesEditorial: string;
  gameEditorials: string[];
}

export interface PlayoffResults {
  semiFinal1: PlayoffSeries;
  semiFinal2: PlayoffSeries;
  finals: PlayoffSeries;
  champion: string;
  championshipEditorial: string;
}

// ============================================================================
// LEAGUE STATE - UPDATED FOR ROUND-BASED
// ============================================================================

export type LeaguePhase =
  | 'draft'
  | 'draft_recap'
  | 'regular_season'      // Now subdivided into rounds
  | 'playoffs'
  | 'complete';

export interface LeagueState {
  leagueId: string;
  phase: LeaguePhase;
  draftState: DraftState | null;

  // Round-based season (Phase 1B)
  currentRound: RoundState | null;
  totalRounds: number | null;

  // Full season results (populated when complete)
  regularSeasonResults: RegularSeasonResults | null;
  playoffResults: PlayoffResults | null;

  // Trade proposals (Phase 2.5)
  tradeProposals: TradeProposal[];

  tradeWindowEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// SESSION & USER TYPES (UNCHANGED)
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

// ============================================================================
// WEBSOCKET MESSAGE TYPES - UPDATED
// ============================================================================

export type ClientMessage =
  | { type: 'CREATE_LOBBY'; payload: { config: LobbyConfig; isPublic: boolean } }
  | { type: 'JOIN_LOBBY'; payload: { inviteCode: string; displayName: string } }
  | { type: 'READY_UP' }
  | { type: 'START_DRAFT' }
  | { type: 'MAKE_PICK'; payload: { playerId: string } }
  | { type: 'PAUSE_DRAFT' }
  | { type: 'UNPAUSE_DRAFT' }
  | { type: 'UPDATE_QUEUE'; payload: { pickQueue: string[] } }
  | { type: 'START_TRADE_WINDOW' }
  | { type: 'EXECUTE_TRADE'; payload: { teamAId: string; teamBId: string; playerAIds: string[]; playerBIds: string[] } }
  // Phase 1B: Round-based
  | { type: 'START_REGULAR_SEASON' }
  | { type: 'SUBMIT_COACHING_DECISION'; payload: CoachingDecision }
  | { type: 'SIMULATE_ROUND' }
  // Phase 2.5: Trade proposals
  | { type: 'PROPOSE_TRADE'; payload: { toTeamId: string; fromPlayerIds: string[]; toPlayerIds: string[] } }
  | { type: 'RESPOND_TO_TRADE'; payload: { proposalId: string; accept: boolean } }
  | { type: 'CANCEL_TRADE_PROPOSAL'; payload: { proposalId: string } }
  // Playoffs
  | { type: 'START_PLAYOFFS' }
  | { type: 'COMPLETE_LEAGUE' };

export type ServerMessage =
  | { type: 'LOBBY_CREATED'; payload: LobbyState }
  | { type: 'LOBBY_UPDATED'; payload: LobbyState }
  | { type: 'DRAFT_STARTED'; payload: DraftState }
  | { type: 'DRAFT_UPDATED'; payload: DraftState }
  | { type: 'DRAFT_COMPLETED'; payload: DraftState }
  | { type: 'PICK_MADE'; payload: { pickNumber: number; teamId: string; playerId: string | null } }
  | { type: 'TIMER_TICK'; payload: { timeRemaining: number } }
  | { type: 'TRADE_WINDOW_STARTED'; payload: { endsAt: string } }
  | { type: 'TRADE_TIMER_TICK'; payload: { timeRemaining: number } }
  | { type: 'TRADE_EXECUTED'; payload: LeagueState }
  // Phase 1B: Round-based
  | { type: 'ROUND_STARTED'; payload: RoundState }
  | { type: 'ROUND_UPDATED'; payload: RoundState }
  | { type: 'COACHING_WINDOW_TICK'; payload: { timeRemaining: number } }
  | { type: 'ROUND_SIMULATED'; payload: RoundResult }
  | { type: 'ROUND_COMPLETED'; payload: RoundState }
  // Phase 2.5: Trade proposals
  | { type: 'TRADE_PROPOSED'; payload: TradeProposalNotification }
  | { type: 'TRADE_PROPOSAL_UPDATED'; payload: TradeProposal }
  | { type: 'TRADE_PROPOSAL_EXPIRED'; payload: { proposalId: string } }
  // Regular events
  | { type: 'REGULAR_SEASON_STARTED'; payload: RegularSeasonResults }
  | { type: 'PLAYOFFS_STARTED'; payload: PlayoffResults }
  | { type: 'LEAGUE_UPDATED'; payload: LeagueState }
  | { type: 'LEAGUE_COMPLETED'; payload: LeagueState }
  | { type: 'ERROR'; payload: { message: string } };

// ============================================================================
// WEBSOCKET EVENTS - UPDATED
// ============================================================================

export const WS_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',

  // Session
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

  // Trade (Phase 2.5)
  START_TRADE_WINDOW: 'trade:start_window',
  EXECUTE_TRADE: 'trade:execute',
  PROPOSE_TRADE: 'trade:propose',
  RESPOND_TO_TRADE: 'trade:respond',
  CANCEL_TRADE_PROPOSAL: 'trade:cancel_proposal',
  TRADE_WINDOW_STARTED: 'trade:window_started',
  TRADE_EXECUTED: 'trade:executed',
  TRADE_TIMER_TICK: 'trade:timer_tick',
  TRADE_PROPOSED: 'trade:proposed',
  TRADE_PROPOSAL_UPDATED: 'trade:proposal_updated',
  TRADE_PROPOSAL_EXPIRED: 'trade:proposal_expired',

  // Round-based season (Phase 1B)
  START_REGULAR_SEASON: 'league:start_season',
  SUBMIT_COACHING_DECISION: 'round:submit_coaching',
  SIMULATE_ROUND: 'round:simulate',
  ROUND_STARTED: 'round:started',
  ROUND_UPDATED: 'round:updated',
  COACHING_WINDOW_TICK: 'round:coaching_tick',
  ROUND_SIMULATED: 'round:simulated',
  ROUND_COMPLETED: 'round:completed',

  // Playoffs
  START_PLAYOFFS: 'league:start_playoffs',
  PLAYOFFS_STARTED: 'league:playoffs_started',

  // League
  COMPLETE_LEAGUE: 'league:complete',
  REGULAR_SEASON_STARTED: 'league:season_started',
  LEAGUE_UPDATED: 'league:updated',
  LEAGUE_COMPLETED: 'league:completed',

  // Errors
  ERROR: 'error',
} as const;

export type WSEvent = (typeof WS_EVENTS)[keyof typeof WS_EVENTS];

// ============================================================================
// CONSTANTS - UPDATED
// ============================================================================

export const DRAFT_CONSTRAINTS = {
  TEAMS_MIN: 1,
  TEAMS_MAX: 12,
  ROSTER_MIN: 10,
  ROSTER_MAX: 15,
  ROTATION_MIN: 5,  // NEW - Phase 2
  ROTATION_MAX: 15, // NEW - Phase 2 (= ROSTER_MAX)
  PICK_TIMER_OPTIONS_SECONDS: [60, 120, 300] as const,
  SIMS_PER_MATCHUP: 100,
  PLAYOFF_TEAMS: 4,
  PLAYOFF_BEST_OF: 3,
  SERIES_VISUAL_MAX_GAMES: 7,
  TOP_20_AUTO_PICK: 20,
  COACHING_WINDOW_SECONDS: 120,  // NEW - Phase 1B (2 minutes)
  TRADE_PROPOSAL_EXPIRY_SECONDS: 300,  // NEW - Phase 2.5 (5 minutes)
} as const;

export const COACHING_STRATEGY_MODIFIERS = {
  // Lineup strategies
  small_ball: { pace: 0.04, shooting: 0.03, rebounding: -0.02 },
  big_lineup: { pace: -0.03, rebounding: 0.04, defense: 0.02 },
  offense_first: { offense: 0.05, defense: -0.03 },
  defense_first: { defense: 0.05, offense: -0.03 },

  // Defensive strategies
  switch_everything: { versatility: 0.03, size_mismatch: -0.02 },
  protect_paint: { rim_protection: 0.04, perimeter: -0.02 },
  pressure_ball: { steals: 0.03, turnovers_forced: 0.02, fouls: 0.02 },
  pack_paint: { rim_protection: 0.05, three_defense: -0.03 },

  // Offensive strategies
  pace_and_space: { three_pa_rate: 0.05, pace: 0.03, paint: -0.02 },
  inside_out: { paint: 0.04, ft_rate: 0.03, three_pa_rate: -0.02 },
  motion_offense: { assists: 0.04, ball_movement: 0.03 },
  isolation: { top_usage: 0.05, synergy: -0.03 },
} as const;

// Keep existing constants
export const TRADE_WINDOW_DURATION_MS = 10 * 60 * 1000;
export const DRAFT_TIMER_DURATION_SECONDS = 90;

export type RoleCategory = 'G' | 'W' | 'B';

export const POSITION_TO_ROLE: Record<string, RoleCategory> = {
  PG: 'G',
  SG: 'G',
  SF: 'W',
  PF: 'B',
  C: 'B',
};

// ... (rest of existing constants - RELIABILITY_PARAMS, ARCHETYPE_WEIGHTS, etc. - unchanged)
