/**
 * Shared types for NBA Draft + League Simulation - V3 UPDATE
 * Used by both client and server
 *
 * CHANGELOG:
 * - Phase 1A: Added SeasonFormat, isPublic to LobbyState
 * - Phase 1B: Added RoundState, RoundPhase, CoachingWindow
 * - Phase 2: Added CoachingDecision, LineupStrategy, DefensiveStrategy
 * - Phase 2.5: Added TradeProposal, TradeProposalStatus
 * - V3: Added quarter-based game simulation types
 *       Renamed playoffs_only to quick_sim
 *       Added ScoutingReport, QuarterResult, QuarterBlurb
 *       Moved rotationDepth from LobbyConfig to CoachingDecision
 */

// ============================================================================
// PLAYER TYPES (UNCHANGED)
// ============================================================================

export interface PlayerRawStats {
  playerId: string;
  name: string;
  team: string;
  position: string;
  PTS: number;
  REB: number;
  AST: number;
  STL: number;
  BLK: number;
  TS_PCT: number;
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
  TWO_PA: number;
  TWO_PM: number;
  TWO_P_PCT: number;
  POTENTIAL_AST?: number;
  SECONDARY_AST?: number;
  PASSES_MADE?: number;
  PASSES_RECEIVED?: number;
  DEFLECTIONS?: number;
  CHARGES_DRAWN?: number;
  CONTESTED_SHOTS?: number;
  POSSESSIONS?: number;
  TOUCHES?: number;
  SCREEN_ASSISTS?: number;
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

// V3 UPDATED: Renamed playoffs_only to quick_sim for clarity
export type SeasonFormat = 'single_round_robin' | 'double_round_robin' | 'quick_sim';

export type PickTimer = 60 | 120 | 300;

export interface LobbyConfig {
  teamCount: number;  // 4-12
  rosterSize: number;  // 10-15
  pickTimer: PickTimer;
  seasonFormat: SeasonFormat;
  // V3 NOTE: rotationDepth removed - now a per-game coaching decision
}

export interface LobbyState {
  lobbyId: string;
  commissionerId: string;
  config: LobbyConfig;
  users: LobbyUser[];
  inviteCode: string;
  canStart: boolean;
  isPublic: boolean;
  draftStarted: boolean;
  createdAt: string;
}

export interface PublicLobbyInfo {
  lobbyId: string;
  inviteCode: string;
  commissionerName: string;
  teamCount: number;
  currentPlayers: number;
  playerCount: number;
  config: LobbyConfig;
  createdAt: string;
}

// ============================================================================
// PHASE 1B: ROUND-BASED EXECUTION
// ============================================================================

export type RoundPhase =
  | 'scouting'           // V3: Pre-game analysis
  | 'coaching_window'    // Coach makes decisions
  | 'simulating'         // Server running simulations
  | 'results'            // Showing results
  | 'complete';          // Round finished

export interface RoundState {
  roundNumber: number;
  phase: RoundPhase;
  scoutingWindowEndsAt?: string | null; // V3
  coachingWindowEndsAt: string | null;
  matchups: RoundMatchup[];
  coachingDecisions: Record<string, CoachingDecision>;
  roundResults: RoundResult | null;
}

export interface RoundMatchup {
  matchupId: string;
  teamAId: string;
  teamBId: string;
  homeTeam: 'A' | 'B';
  result?: MatchupResult;
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
  rotation: string[];  // playerIds in rotation
  rotationDepth: number; // V3 NEW: User chooses 5-15 players per game
  lineupStrategy: LineupStrategy;
  defensiveStrategy: DefensiveStrategy;
  offensiveStrategy: OffensiveStrategy;
  submittedAt: string;
}

export interface CoachingWindowConfig {
  durationSeconds: number;
  autoSubmitOnExpire: boolean;
}

// ============================================================================
// V3: QUARTER-BASED GAME SIMULATION
// ============================================================================

/**
 * Pre-game scouting report shown to coaches before making decisions
 */
export interface ScoutingReport {
  matchupId: string;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;

  // Team strengths/weaknesses analysis
  teamAStrengths: string[];
  teamAWeaknesses: string[];
  teamBStrengths: string[];
  teamBWeaknesses: string[];

  // Key players to watch
  teamAKeyPlayers: Array<{ name: string; role: string; threat: string }>;
  teamBKeyPlayers: Array<{ name: string; role: string; threat: string }>;

  // Predicted style clash
  styleClash: string;

  // Editorial coaching tendency insights (based on recent coaching decisions)
  teamACoachingTendencies: string;
  teamBCoachingTendencies: string;

  // Betting line style prediction (editorial flavor)
  prediction: string;
}

/**
 * Result of a single quarter
 */
export interface QuarterResult {
  quarter: 1 | 2 | 3 | 4;
  scoreA: number;       // Points scored by team A this quarter
  scoreB: number;       // Points scored by team B this quarter
  totalScoreA: number;  // Running total for team A
  totalScoreB: number;  // Running total for team B

  // Coaching effectiveness (hidden from user, used to generate blurb)
  coachingImpactA: number; // -10 to +10
  coachingImpactB: number;
}

/**
 * Editorial blurb shown after each quarter
 * Shrouds coaching wins/losses in "editorial fog"
 */
export interface QuarterBlurb {
  quarter: 1 | 2 | 3 | 4;
  narrative: string;           // What happened this quarter
  coachingInsight: string;     // Hints at coaching decisions without exposing mechanics
  momentum: 'A' | 'B' | 'even'; // Who has momentum going into next quarter
}

/**
 * Full quarter-based game result
 */
export interface QuarterBasedGameResult {
  gameId: string;
  teamAId: string;
  teamBId: string;
  homeTeam: 'A' | 'B';

  // Scouting report (pre-game)
  scoutingReport: ScoutingReport;

  // Quarter-by-quarter results
  quarters: QuarterResult[];
  quarterBlurbs: QuarterBlurb[];

  // Final result
  finalScoreA: number;
  finalScoreB: number;
  winner: 'A' | 'B';

  // Game summary editorial
  gameEditorial: string;

  // Legacy compatibility
  result: MatchupResult;
}

/**
 * In-progress game state for quarter-by-quarter coaching
 */
export interface LiveGameState {
  gameId: string;
  matchupId: string;
  currentQuarter: 0 | 1 | 2 | 3 | 4; // 0 = pre-game
  phase: 'scouting' | 'coaching' | 'simulating_quarter' | 'quarter_results' | 'final';

  scoutingReport: ScoutingReport;
  completedQuarters: QuarterResult[];
  quarterBlurbs: QuarterBlurb[];

  // Current coaching decisions (can be adjusted between quarters)
  coachingDecisionA?: CoachingDecision;
  coachingDecisionB?: CoachingDecision;

  // Timer for coaching window between quarters
  coachingWindowEndsAt?: string;
}

export interface GameStartPayload {
  gameState: LiveGameState;
  seriesId?: string;
  gameNumber?: number;
}

// ============================================================================
// PHASE 2.5: TRADE PROPOSALS
// ============================================================================

export type TradeProposalStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'expired';

export interface TradeProposal {
  proposalId: string;
  fromTeamId: string;
  toTeamId: string;
  fromPlayerIds: string[];
  toPlayerIds: string[];
  status: TradeProposalStatus;
  createdAt: string;
  expiresAt: string;
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
  // V3: Added explicit scores to prevent winner/score mismatch
  finalScoreA?: number;
  finalScoreB?: number;
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
  // V3: Optional quarter-based data
  quarterData?: QuarterBasedGameResult;
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

export interface Matchup {
  matchupId: string;
  teamAId: string;
  teamBId: string;
  winsA: number;
  winsB: number;
  games: RegularSeasonGame[];
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
// LEAGUE STATE
// ============================================================================

export type LeaguePhase =
  | 'draft'
  | 'draft_recap'
  | 'regular_season'
  | 'playoffs'
  | 'complete'
  | 'trade_window';

export interface LeagueState {
  leagueId: string;
  phase: LeaguePhase;
  draftState: DraftState | null;
  currentRound: number | null;
  roundState: RoundState | null;
  totalRounds: number | null;
  regularSeasonResults: RegularSeasonResults | null;
  playoffResults: PlayoffResults | null;
  tradeProposals: TradeProposal[];
  tradeWindowEndsAt: string | null;

  // V3: Live game state for quarter-based simulation
  liveGame?: LiveGameState;

  // V3: Historical coaching decisions for scouting reports
  // Maps teamId -> array of decisions from past rounds
  coachingHistory: Record<string, CoachingDecision[]>;

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
// WEBSOCKET MESSAGE TYPES
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
  | { type: 'COMPLETE_LEAGUE' }
  // V3: Quarter-based game events
  | { type: 'SUBMIT_QUARTER_COACHING'; payload: { decision: CoachingDecision; quarter: number } }
  | { type: 'READY_FOR_QUARTER' };

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
  | { type: 'ERROR'; payload: { message: string } }
  // V3: Quarter-based game events
  | { type: 'GAME_START'; payload: GameStartPayload }
  | { type: 'SCOUTING_REPORT'; payload: { scoutingReport: ScoutingReport; gameState: LiveGameState } }
  | { type: 'QUARTER_COACHING_WINDOW'; payload: { quarter: number; gameState: LiveGameState; timeRemaining: number } }
  | { type: 'QUARTER_RESULT'; payload: { quarterResult: QuarterResult; blurb: QuarterBlurb; gameState: LiveGameState } }
  | { type: 'GAME_FINAL'; payload: { gameResult: QuarterBasedGameResult } };

// ============================================================================
// WEBSOCKET EVENTS
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
  TRADE_NOTIFICATION: 'trade:notification',

  // Round-based season (Phase 1B)
  START_REGULAR_SEASON: 'league:start_season',
  SUBMIT_COACHING_DECISION: 'round:submit_coaching',
  SIMULATE_ROUND: 'round:simulate',
  ROUND_STARTED: 'round:started',
  ROUND_UPDATED: 'round:updated',
  COACHING_WINDOW_TICK: 'round:coaching_tick',
  ROUND_SIMULATED: 'round:simulated',
  ROUND_COMPLETED: 'round:completed',
  START_ROUND: 'round:start',

  // Playoffs
  START_PLAYOFFS: 'league:start_playoffs',
  PLAYOFFS_STARTED: 'league:playoffs_started',

  // League
  COMPLETE_LEAGUE: 'league:complete',
  REGULAR_SEASON_STARTED: 'league:season_started',
  LEAGUE_UPDATED: 'league:updated',
  LEAGUE_COMPLETED: 'league:completed',

  // V3: Quarter-based game events
  GAME_START: 'game:start',
  GAME_SCOUTING_REPORT: 'game:scouting_report',
  QUARTER_COACHING_WINDOW: 'game:quarter_coaching_window',
  SUBMIT_QUARTER_COACHING: 'game:submit_quarter_coaching',
  QUARTER_RESULT: 'game:quarter_result',
  GAME_FINAL: 'game:final',

  // Errors
  ERROR: 'error',
} as const;

export type WSEvent = (typeof WS_EVENTS)[keyof typeof WS_EVENTS];

// ============================================================================
// CONSTANTS
// ============================================================================

export const DRAFT_CONSTRAINTS = {
  TEAMS_MIN: 1,
  TEAMS_MAX: 12,
  ROSTER_MIN: 10,
  ROSTER_MAX: 15,
  ROTATION_MIN: 5,  // Phase 2
  ROTATION_MAX: 15, // Phase 2 (= ROSTER_MAX)
  ROTATION_DEFAULT: 8, // V3: Default rotation depth
  PICK_TIMER_OPTIONS_SECONDS: [60, 120, 300] as const,
  SIMS_PER_MATCHUP: 100,
  PLAYOFF_TEAMS: 4,
  PLAYOFF_BEST_OF: 3,
  SERIES_VISUAL_MAX_GAMES: 7,
  TOP_20_AUTO_PICK: 20,
  COACHING_WINDOW_SECONDS: 120,  // Phase 1B (2 minutes)
  TRADE_PROPOSAL_EXPIRY_SECONDS: 300,  // Phase 2.5 (5 minutes)
  SCOUTING_WINDOW_SECONDS: 10,  // V3: 10s analysis
  PREGAME_COACHING_SECONDS: 30, // V3: 30s pre-game coaching
  INTER_QUARTER_COACHING_SECONDS: 10, // V3: 10s between quarters
  QUARTER_COACHING_WINDOW_SECONDS: 60, // V3: Time between quarters
} as const;

// Convenience exports for backward compatibility
export const COACHING_WINDOW_SECONDS = DRAFT_CONSTRAINTS.COACHING_WINDOW_SECONDS;
export const TRADE_PROPOSAL_EXPIRY_SECONDS = DRAFT_CONSTRAINTS.TRADE_PROPOSAL_EXPIRY_SECONDS;

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
  PAR: 0.18,              // Pomeroy Assist Ratio
  THREE_PA_RATE: 0.10,
  FT_RATE: 0.06,
  USG: 0.04,

  // Defense
  STL: 0.09,
  BLK: 0.06,
  REB: 0.05,

  // Stability
  VI: 0.10,               // Versatility Index; positive-only entropy
  TOV: -0.12,
} as const;

// ============================================================================
// TEAM MODIFIER PARAMETERS
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

  // Home court advantage
  HCA_MAX_BONUS: 0.03,
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
// SIMULATION PARAMETERS
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
  SIGMA_IMPACT_STDEV_MULT: 1.5, // For player noise approximation

  // Randomness
  TEAM_PERF_VARIANCE_CLAMP: 0.05,
  STAT_SHOOTING_VARIANCE_CLAMP: 0.04,
  STAT_REBOUNDING_VARIANCE_CLAMP: 0.06,
  STAT_TURNOVER_VARIANCE_CLAMP: 0.08,

  // Matchup advantages
  MATCHUP_ADV_TS: 0.6,
  MATCHUP_ADV_PAR: 0.4,
  MATCHUP_ADV_THREE: 0.5,
  MATCHUP_ADV_VI: 0.3,
} as const;

// ============================================================================
// PLAYOFF PARAMETERS
// ============================================================================

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
