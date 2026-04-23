/**
 * shared/schemas.ts
 * Phase 02-02: Validated payload schemas for Court Vision API routes.
 * Phase 02-03: Added lesson, progress, and offseason payload schemas.
 *
 * Uses manual type-guard validation rather than a runtime library (zod/yup) to
 * keep the shared package dependency-free. Server-side route handlers call these
 * validators and return 400 errors on failure before any database work begins.
 *
 * Each schema object exposes a `safeParse(body)` method that returns a
 * ValidationResult, compatible with the middleware in
 * server/src/middleware/validateBody.ts.
 *
 * Schemas exported here:
 *   AccountUpgradePayload        — body for POST /internal/account-upgrade
 *   LessonRecord                 — server-returned lesson shape
 *   ProgressWritePayload         — body for POST /api/progress
 *   OffseasonRunPayload          — body for POST /api/offseason/runs
 *   lessonRecordSchema           — safeParse adapter for LessonRecord
 *   progressWriteSchema          — safeParse adapter for ProgressWritePayload
 *   offseasonRunSchema           — safeParse adapter for OffseasonRunPayload
 *   validateAccountUpgradePayload() — returns parsed payload or ValidationError
 */
import {
  CoachingHirePayload,
  OffseasonScoutingState,
  OffseasonScoutingProspect,
  OffseasonTradeMarketState,
  OffseasonTradeProposal,
  ScoutingBoardUpdatePayload,
  TradeProposalPayload,
  TradeProposalDecision,
  TradeProposalVerdict,
  OffseasonCoachProfile,
  OffseasonCoachTendencyProfile,
  OffseasonCoachingMarketState,
  OffseasonDecisionRecord,
  OffseasonDecisionVerdict,
  OffseasonPhaseTransitionPayload,
  OffseasonRunState,
  StartOffseasonRunPayload,
  TeamContextUpdatePayload,
  validateCoachingHirePayload,
  validateScoutingBoardUpdatePayload,
  validateTradeProposalPayload,
  validateOffseasonPhaseTransitionPayload,
  validateOffseasonRunState,
  validateStartOffseasonRunPayload,
  validateTeamContextUpdatePayload,
} from './src/offseason/schema';
export type {
  OffseasonCoachProfile,
  OffseasonCoachPace,
  OffseasonCoachTendencyProfile,
  OffseasonCoachingMarketState,
  OffseasonDecisionRecord,
  OffseasonDecisionVerdict,
  OffseasonScoutingProspect,
  OffseasonScoutingSignals,
  OffseasonScoutingState,
  OffseasonTradeMarketState,
  OffseasonTradeProposal,
  ProspectUncertaintyBand,
  ScoutingStage,
  ScoutingBoardUpdatePayload,
  TradeMarketStage,
  TradeProposalDecision,
  TradeProposalPayload,
  TradeProposalVerdict,
  OffseasonPhase,
  OffseasonRunState,
  OffseasonTeamContextState,
  OffseasonTeamSummary,
  OffseasonRosterPlayer,
  OffseasonDraftAsset,
  OffseasonTimeline,
  TeamContextStage,
  StartOffseasonRunPayload,
  TeamContextUpdatePayload,
  CoachingHirePayload,
  OffseasonPhaseTransitionPayload,
} from './src/offseason/schema';

// ---------------------------------------------------------------------------
// Shared error type
// ---------------------------------------------------------------------------

export interface ValidationError {
  valid: false;
  errors: string[];
}

export interface ValidationSuccess<T> {
  valid: true;
  data: T;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationError;

// ---------------------------------------------------------------------------
// AccountUpgradePayload
// ---------------------------------------------------------------------------
//
// Sent by the client when an anonymous user wants to link their session to
// an email/password account.  The anonymous_user_id MUST match the caller's
// current Supabase anonymous session id — the server verifies this to prevent
// session hijacking.
//
// Fields:
//   anonymous_user_id  — Supabase user.id of the current anonymous session
//   email              — desired email for the new account (normalized to lowercase)
//   password           — must be >= 8 characters; server does NOT store this
// ---------------------------------------------------------------------------

export interface AccountUpgradePayload {
  anonymous_user_id: string;
  email: string;
  password: string;
}

// ---------------------------------------------------------------------------
// Schema helper — wraps a validator function with a safeParse entry-point
// so callers can use the same pattern as zod: schema.safeParse(body)
// ---------------------------------------------------------------------------

export interface Schema<T> {
  safeParse(body: unknown): ValidationResult<T>;
}

function makeSchema<T>(
  validator: (body: unknown) => ValidationResult<T>
): Schema<T> {
  return { safeParse: validator };
}

// ---------------------------------------------------------------------------
// LessonRecord — shape returned by GET /api/lessons and GET /api/lessons/:id
// ---------------------------------------------------------------------------
//
// This is primarily a response type but having a shared validator lets the
// client sanity-check API responses before rendering them.
//
// Fields:
//   id           — UUID primary key
//   title        — display title for the lesson card
//   role_lens    — one of "player" | "coach" | "gm"
//   difficulty   — one of "beginner" | "intermediate" | "advanced"
//   description  — short plaintext summary shown on the card
//   content_url  — optional YouTube embed URL or external link
// ---------------------------------------------------------------------------

export type RoleLens = 'player' | 'coach' | 'gm';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type InteractionType =
  | 'film'
  | 'pause_predict'
  | 'scenario'
  | 'article'
  | 'quiz';
export type ContentType = 'lesson' | 'recap';

export interface TimestampAnnotation {
  timestamp: number;
  note: string;
  title?: string;
}

export interface LessonChoice {
  id: string;
  label: string;
}

export interface PausePredictPayload {
  pause_at: number;
  prompt: string;
  choices: LessonChoice[];
  correct_choice_id: string;
  explanation: string;
}

export interface ScenarioOption {
  id: string;
  title: string;
  description: string;
}

export interface ScenarioSimulationPayload {
  prompt: string;
  options: ScenarioOption[];
  correct_option_id: string;
  explanation: string;
}

export interface LearnMoreSection {
  title: string;
  body: string;
}

export interface LessonRecord {
  id: string;
  title: string;
  role_lens: RoleLens;
  difficulty: Difficulty;
  description: string;
  content_url?: string;
  media_url?: string;
  takeaway?: string;
  interaction_type?: InteractionType;
  annotations?: TimestampAnnotation[];
  published?: boolean;
  subcategory?: string;
  tags?: string[];
  answer_key?: string;
  learn_more?: LearnMoreSection[];
  pause_predict?: PausePredictPayload;
  scenario?: ScenarioSimulationPayload;
  featured?: boolean;
  estimated_minutes?: number;
}

export interface RecapRecord {
  id: string;
  title: string;
  role_lens: RoleLens;
  summary: string;
  body: string;
  tags: string[];
  route: string;
  published: boolean;
}

export interface ContentLibraryItem {
  id: string;
  content_type: ContentType;
  title: string;
  summary: string;
  role_lens: RoleLens;
  route: string;
  tags: string[];
  difficulty?: Difficulty;
  interaction_type?: InteractionType;
  subcategory?: string;
  estimated_minutes?: number;
}

export interface LessonProgressRecord {
  user_id: string;
  lesson_id: string;
  completed: boolean;
  score?: number;
  attempts: number;
  updated_at: string;
  last_attempted_at?: string;
}

export interface OnboardingResponse {
  favorite_team: string;
  knowledge_level: 'new' | 'growing' | 'advanced';
  improvement_goal: RoleLens;
}

export interface RecommendationCard {
  id: string;
  title: string;
  description: string;
  route: string;
  role_lens: RoleLens;
  kind: 'lesson' | 'challenge';
}

export interface AdvancedModuleRecommendation {
  id: string;
  title: string;
  description: string;
  route: string;
  role_lens: RoleLens;
  minimum_completed_lessons: number;
  current_completed_lessons: number;
}

export interface DailyChallengeRecord {
  id: string;
  challenge_date: string;
  title: string;
  prompt: string;
  choices: LessonChoice[];
  correct_choice_id: string;
  explanation: string;
  role_lens: RoleLens;
  lesson_id?: string;
  tags: string[];
}

export interface StreakState {
  current_streak: number;
  best_streak: number;
  last_completed_date?: string;
}

export interface BadgeRecord {
  id: string;
  label: string;
  description: string;
  category: 'streak' | 'track' | 'capstone';
  unlocked_at: string;
}

export interface DailyChallengeResult {
  challenge_id: string;
  challenge_date: string;
  role_lens: RoleLens;
  selected_choice_id: string;
  correct: boolean;
  explanation: string;
  streak: StreakState;
  badges: BadgeRecord[];
  submitted_at: string;
}

export interface FriendCompletionStatus {
  friend_id: string;
  display_name: string;
  completed: boolean;
}

export interface ProfileLensMetrics {
  role_lens: RoleLens;
  completion_count: number;
  accuracy_rate: number;
  weak_tags: string[];
}

export interface ProfileResponse {
  user_id: string;
  auth_mode: 'guest' | 'supabase';
  total_completed_lessons: number;
  track_metrics: ProfileLensMetrics[];
  streak: StreakState;
  badges: BadgeRecord[];
  suggested_lessons: RecommendationCard[];
  recent_challenge?: DailyChallengeResult | null;
}

export interface DiscussionComment {
  id: string;
  lesson_id: string;
  author_id: string;
  author_label: string;
  body: string;
  created_at: string;
}

export interface DraftTeachingMoment {
  id: string;
  title: string;
  prompt: string;
  trigger: 'clock_pressure' | 'fit_conflict' | 'value_reach' | 'positional_scarcity';
  severity: 'info' | 'warning' | 'success';
  lesson_id?: string;
  lesson_title?: string;
}

export interface DraftDecisionInsight {
  id: string;
  verdict: 'strong' | 'weak';
  role_lens: RoleLens;
  title: string;
  summary: string;
  lesson_id?: string;
  lesson_title?: string;
}

const ROLE_LENS_VALUES: RoleLens[] = ['player', 'coach', 'gm'];
const DIFFICULTY_VALUES: Difficulty[] = ['beginner', 'intermediate', 'advanced'];
const INTERACTION_TYPE_VALUES: InteractionType[] = [
  'film',
  'pause_predict',
  'scenario',
  'article',
  'quiz',
];

function validateLessonRecord(body: unknown): ValidationResult<LessonRecord> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { valid: false, errors: ['Lesson body must be a JSON object.'] };
  }

  const raw = body as Record<string, unknown>;
  const errors: string[] = [];

  if (typeof raw.id !== 'string' || raw.id.trim() === '') {
    errors.push('id is required and must be a non-empty string.');
  }

  if (typeof raw.title !== 'string' || raw.title.trim() === '') {
    errors.push('title is required and must be a non-empty string.');
  }

  if (!ROLE_LENS_VALUES.includes(raw.role_lens as RoleLens)) {
    errors.push(`role_lens must be one of: ${ROLE_LENS_VALUES.join(', ')}.`);
  }

  if (!DIFFICULTY_VALUES.includes(raw.difficulty as Difficulty)) {
    errors.push(`difficulty must be one of: ${DIFFICULTY_VALUES.join(', ')}.`);
  }

  if (typeof raw.description !== 'string' || raw.description.trim() === '') {
    errors.push('description is required and must be a non-empty string.');
  }

  if (raw.content_url !== undefined && typeof raw.content_url !== 'string') {
    errors.push('content_url must be a string when provided.');
  }

  if (raw.media_url !== undefined && typeof raw.media_url !== 'string') {
    errors.push('media_url must be a string when provided.');
  }

  if (raw.takeaway !== undefined && typeof raw.takeaway !== 'string') {
    errors.push('takeaway must be a string when provided.');
  }

  if (raw.interaction_type !== undefined && !INTERACTION_TYPE_VALUES.includes(raw.interaction_type as InteractionType)) {
    errors.push(`interaction_type must be one of: ${INTERACTION_TYPE_VALUES.join(', ')}.`);
  }

  if (raw.annotations !== undefined && !Array.isArray(raw.annotations)) {
    errors.push('annotations must be an array when provided.');
  }

  if (raw.published !== undefined && typeof raw.published !== 'boolean') {
    errors.push('published must be a boolean when provided.');
  }

  if (raw.subcategory !== undefined && typeof raw.subcategory !== 'string') {
    errors.push('subcategory must be a string when provided.');
  }

  if (raw.tags !== undefined) {
    if (!Array.isArray(raw.tags) || raw.tags.some((tag) => typeof tag !== 'string')) {
      errors.push('tags must be an array of strings when provided.');
    }
  }

  if (raw.answer_key !== undefined && typeof raw.answer_key !== 'string') {
    errors.push('answer_key must be a string when provided.');
  }

  if (raw.learn_more !== undefined) {
    const validLearnMore =
      Array.isArray(raw.learn_more) &&
      raw.learn_more.every(
        (entry) =>
          typeof entry === 'object' &&
          entry !== null &&
          typeof (entry as LearnMoreSection).title === 'string' &&
          typeof (entry as LearnMoreSection).body === 'string'
      );
    if (!validLearnMore) {
      errors.push('learn_more must be an array of { title, body } objects.');
    }
  }

  if (raw.pause_predict !== undefined) {
    const pausePredict = raw.pause_predict as PausePredictPayload;
    const validPausePredict =
      typeof pausePredict === 'object' &&
      pausePredict !== null &&
      typeof pausePredict.pause_at === 'number' &&
      typeof pausePredict.prompt === 'string' &&
      Array.isArray(pausePredict.choices) &&
      pausePredict.choices.every(
        (choice) =>
          typeof choice === 'object' &&
          choice !== null &&
          typeof choice.id === 'string' &&
          typeof choice.label === 'string'
      ) &&
      typeof pausePredict.correct_choice_id === 'string' &&
      typeof pausePredict.explanation === 'string';

    if (!validPausePredict) {
      errors.push('pause_predict must include pause_at, prompt, choices, correct_choice_id, and explanation.');
    }
  }

  if (raw.scenario !== undefined) {
    const scenario = raw.scenario as ScenarioSimulationPayload;
    const validScenario =
      typeof scenario === 'object' &&
      scenario !== null &&
      typeof scenario.prompt === 'string' &&
      Array.isArray(scenario.options) &&
      scenario.options.every(
        (option) =>
          typeof option === 'object' &&
          option !== null &&
          typeof option.id === 'string' &&
          typeof option.title === 'string' &&
          typeof option.description === 'string'
      ) &&
      typeof scenario.correct_option_id === 'string' &&
      typeof scenario.explanation === 'string';

    if (!validScenario) {
      errors.push('scenario must include prompt, options, correct_option_id, and explanation.');
    }
  }

  if (raw.featured !== undefined && typeof raw.featured !== 'boolean') {
    errors.push('featured must be a boolean when provided.');
  }

  if (
    raw.estimated_minutes !== undefined &&
    (typeof raw.estimated_minutes !== 'number' || !Number.isFinite(raw.estimated_minutes))
  ) {
    errors.push('estimated_minutes must be a finite number when provided.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      id: (raw.id as string).trim(),
      title: (raw.title as string).trim(),
      role_lens: raw.role_lens as RoleLens,
      difficulty: raw.difficulty as Difficulty,
      description: (raw.description as string).trim(),
      ...(raw.content_url !== undefined ? { content_url: (raw.content_url as string).trim() } : {}),
      ...(raw.media_url !== undefined ? { media_url: (raw.media_url as string).trim() } : {}),
      ...(raw.takeaway !== undefined ? { takeaway: (raw.takeaway as string).trim() } : {}),
      ...(raw.interaction_type !== undefined ? { interaction_type: raw.interaction_type as InteractionType } : {}),
      ...(raw.annotations !== undefined ? { annotations: raw.annotations as TimestampAnnotation[] } : {}),
      ...(raw.published !== undefined ? { published: raw.published as boolean } : {}),
      ...(raw.subcategory !== undefined ? { subcategory: (raw.subcategory as string).trim() } : {}),
      ...(raw.tags !== undefined ? { tags: raw.tags as string[] } : {}),
      ...(raw.answer_key !== undefined ? { answer_key: (raw.answer_key as string).trim() } : {}),
      ...(raw.learn_more !== undefined ? { learn_more: raw.learn_more as LearnMoreSection[] } : {}),
      ...(raw.pause_predict !== undefined ? { pause_predict: raw.pause_predict as PausePredictPayload } : {}),
      ...(raw.scenario !== undefined ? { scenario: raw.scenario as ScenarioSimulationPayload } : {}),
      ...(raw.featured !== undefined ? { featured: raw.featured as boolean } : {}),
      ...(raw.estimated_minutes !== undefined ? { estimated_minutes: raw.estimated_minutes as number } : {}),
    },
  };
}

/** Validates a lesson record body or response payload. */
export const lessonRecordSchema: Schema<LessonRecord> =
  makeSchema(validateLessonRecord);

// ---------------------------------------------------------------------------
// ProgressWritePayload — body for POST /api/progress
// ---------------------------------------------------------------------------
//
// Written when a user completes or partially completes a lesson.
//
// Fields:
//   lesson_id    — UUID of the lesson being tracked
//   completed    — whether the lesson was fully completed
//   score        — optional 0–100 accuracy score
// ---------------------------------------------------------------------------

export interface ProgressWritePayload {
  lesson_id: string;
  completed: boolean;
  score?: number;
}

const UUID_REGEX_PROGRESS =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateProgressWritePayload(
  body: unknown
): ValidationResult<ProgressWritePayload> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { valid: false, errors: ['Progress body must be a JSON object.'] };
  }

  const raw = body as Record<string, unknown>;
  const errors: string[] = [];

  if (typeof raw.lesson_id !== 'string' || raw.lesson_id.trim() === '') {
    errors.push('lesson_id is required and must be a non-empty string.');
  } else if (!UUID_REGEX_PROGRESS.test(raw.lesson_id)) {
    errors.push('lesson_id must be a valid UUID.');
  }

  if (typeof raw.completed !== 'boolean') {
    errors.push('completed is required and must be a boolean.');
  }

  if (raw.score !== undefined) {
    if (typeof raw.score !== 'number' || !Number.isFinite(raw.score)) {
      errors.push('score must be a finite number when provided.');
    } else if (raw.score < 0 || raw.score > 100) {
      errors.push('score must be between 0 and 100.');
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      lesson_id: (raw.lesson_id as string).trim(),
      completed: raw.completed as boolean,
      ...(raw.score !== undefined ? { score: raw.score as number } : {}),
    },
  };
}

/** Validates a progress write request body. */
export const progressWriteSchema: Schema<ProgressWritePayload> =
  makeSchema(validateProgressWritePayload);

// ---------------------------------------------------------------------------
// Offseason payloads and validators
// ---------------------------------------------------------------------------
//
// Offseason Foundation (Phase 9):
// - start a run
// - update Team Context selection
// - validate phase transition requests
// - validate persisted run-state shape
//
// ---------------------------------------------------------------------------

export type OffseasonRunPayload = StartOffseasonRunPayload;

/** Validates offseason run creation payloads. */
export const offseasonRunSchema: Schema<StartOffseasonRunPayload> = makeSchema(
  validateStartOffseasonRunPayload
);

/** Validates Team Context team-selection payloads. */
export const offseasonTeamContextSchema: Schema<TeamContextUpdatePayload> = makeSchema(
  validateTeamContextUpdatePayload
);

/** Validates coaching-hire payloads. */
export const offseasonCoachingHireSchema: Schema<CoachingHirePayload> = makeSchema(
  validateCoachingHirePayload
);

/** Validates scouting board ranking update payloads. */
export const offseasonScoutingBoardUpdateSchema: Schema<ScoutingBoardUpdatePayload> = makeSchema(
  validateScoutingBoardUpdatePayload
);

/** Validates trade proposal submission payloads. */
export const offseasonTradeProposalSchema: Schema<TradeProposalPayload> = makeSchema(
  validateTradeProposalPayload
);

/** Validates offseason phase transition payloads. */
export const offseasonPhaseTransitionSchema: Schema<OffseasonPhaseTransitionPayload> = makeSchema(
  validateOffseasonPhaseTransitionPayload
);

/** Validates persisted offseason run-state documents. */
export const offseasonRunStateSchema: Schema<OffseasonRunState> = makeSchema(
  validateOffseasonRunState
);

// ---------------------------------------------------------------------------
// AccountUpgradePayload (unchanged from Phase 02-02)
// ---------------------------------------------------------------------------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates an account-upgrade request body.
 * Returns a typed success result or a list of field-level error messages.
 */
export function validateAccountUpgradePayload(
  body: unknown
): ValidationResult<AccountUpgradePayload> {
  const errors: string[] = [];

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { valid: false, errors: ['Request body must be a JSON object.'] };
  }

  const raw = body as Record<string, unknown>;

  // anonymous_user_id
  if (typeof raw.anonymous_user_id !== 'string' || raw.anonymous_user_id.trim() === '') {
    errors.push('anonymous_user_id is required and must be a non-empty string.');
  } else if (!UUID_REGEX.test(raw.anonymous_user_id)) {
    errors.push('anonymous_user_id must be a valid UUID.');
  }

  // email
  if (typeof raw.email !== 'string' || raw.email.trim() === '') {
    errors.push('email is required and must be a non-empty string.');
  } else if (!EMAIL_REGEX.test(raw.email.trim())) {
    errors.push('email must be a valid email address.');
  }

  // password
  if (typeof raw.password !== 'string' || raw.password.length === 0) {
    errors.push('password is required and must be a non-empty string.');
  } else if (raw.password.length < 8) {
    errors.push('password must be at least 8 characters.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      anonymous_user_id: (raw.anonymous_user_id as string).trim(),
      email: (raw.email as string).trim().toLowerCase(),
      password: raw.password as string,
    },
  };
}

// ---------------------------------------------------------------------------
// NbaScraperSeasonStatsRow — Python league-dash JSON → PlayerRawStats bridge
// ---------------------------------------------------------------------------

/** Season totals row emitted by server/scripts/scrape_nba_stats.py (nba_api). */
export interface NbaScraperSeasonStatsRow {
  playerId: string;
  name: string;
  team: string;
  position: string;
  AGE?: number | null;
  GP: number;
  MIN: number;
  PTS: number;
  REB: number;
  AST: number;
  STL: number;
  BLK: number;
  FGA: number;
  FGM: number;
  FTA: number;
  FTM: number;
  THREE_PA: number;
  THREE_PM: number;
  TOV: number;
  ORB: number;
  DRB: number;
  PF: number;
  TWO_PA: number;
  TWO_PM: number;
  TWO_P_PCT: number;
  THREE_P_PCT: number;
  FT_PCT: number;
  TS_PCT: number;
  POSS_EST: number;
  USG_PCT?: number | null;
  OREB_PCT?: number | null;
  DREB_PCT?: number | null;
  REB_PCT?: number | null;
  AST_PCT?: number | null;
  TOV_PCT?: number | null;
  CATCH_SHOOT_3PA?: number | null;
  CATCH_SHOOT_3PM?: number | null;
  CATCH_SHOOT_3_PCT?: number | null;
  PULL_UP_3PA?: number | null;
  PULL_UP_3PM?: number | null;
  PULL_UP_3_PCT?: number | null;
  DRIVE_FGA?: number | null;
  DRIVE_FGM?: number | null;
  DRIVE_FTA?: number | null;
  DRIVE_PASSES?: number | null;
  PAINT_TOUCHES?: number | null;
  FRONTCOURT_TOUCHES?: number | null;
  TIME_OF_POSSESSION?: number | null;
  AVG_SEC_PER_TOUCH?: number | null;
  AVG_DRIBBLES_PER_TOUCH?: number | null;
  ELBOW_TOUCHES?: number | null;
  POST_TOUCHES?: number | null;
  BOX_OUTS?: number | null;
  LOOSE_BALLS_RECOVERED?: number | null;
  CONTESTED_REB?: number | null;
  TRANSITION_FREQ?: number | null;
  TRANSITION_PPP?: number | null;
  ISOLATION_FREQ?: number | null;
  ISOLATION_PPP?: number | null;
  PNR_BALL_HANDLER_FREQ?: number | null;
  PNR_BALL_HANDLER_PPP?: number | null;
  PNR_ROLL_MAN_FREQ?: number | null;
  PNR_ROLL_MAN_PPP?: number | null;
  SPOT_UP_FREQ?: number | null;
  SPOT_UP_PPP?: number | null;
  HANDOFF_FREQ?: number | null;
  HANDOFF_PPP?: number | null;
  CUT_FREQ?: number | null;
  CUT_PPP?: number | null;
  PUBLIC_PRIORS?: {
    darkoDpm?: number | null;
    darkoOpm?: number | null;
    darkoDpmDefense?: number | null;
    rapm?: number | null;
    orapm?: number | null;
    drapm?: number | null;
    epm?: number | null;
  } | null;
}

/** Keys on PlayerFeatures that must be populated by the mapping pipeline (excludes index signature noise). */
export const PLAYER_FEATURES_CORE_KEYS = [
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

export type PlayerFeaturesCoreKey = (typeof PLAYER_FEATURES_CORE_KEYS)[number];
