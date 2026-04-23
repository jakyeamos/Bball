export interface OffseasonValidationError {
  valid: false;
  errors: string[];
}

export interface OffseasonValidationSuccess<T> {
  valid: true;
  data: T;
}

export type OffseasonValidationResult<T> =
  | OffseasonValidationError
  | OffseasonValidationSuccess<T>;

export type OffseasonPhase =
  | 'team_context'
  | 'coaching_market'
  | 'scouting_pre_draft'
  | 'trade_market'
  | 'draft_night'
  | 'free_agency'
  | 'post_offseason_recap'
  | 'complete';

export type TeamContextStage =
  | 'select_team'
  | 'review_context'
  | 'ready_for_coaching_market';

export type OffseasonTimeline = 'rebuilding' | 'transitioning' | 'contending';
export type OffseasonCoachPace = 'slow' | 'medium' | 'fast';
export type CoachingMarketStage = 'evaluate_pool' | 'coach_hired';
export type ScoutingStage = 'build_board' | 'ready_for_trade_market';
export type TradeMarketStage = 'explore_market' | 'ready_for_draft_night';
export type ProspectUncertaintyBand = 'high' | 'medium' | 'low';
export type OffseasonDecisionVerdict =
  | 'selected'
  | 'accepted'
  | 'rejected'
  | 'graded'
  | 'signed'
  | 'summary';

export interface OffseasonTeamSummary {
  id: number;
  abbreviation: string;
  city: string;
  name: string;
  full_name: string;
  conference: string;
  division: string;
}

export interface OffseasonRosterPlayer {
  id: number;
  full_name: string;
  position: string;
  jersey_number?: string;
  draft_year?: number | null;
}

export interface OffseasonDraftAsset {
  id: string;
  year: number;
  round: 1 | 2;
  owner_team_abbreviation: string;
  original_team_abbreviation: string;
  note: string;
}

export interface OffseasonTeamContextState {
  stage: TeamContextStage;
  selected_team_id: number | null;
  team: OffseasonTeamSummary | null;
  roster: OffseasonRosterPlayer[];
  picks: OffseasonDraftAsset[];
  timeline: OffseasonTimeline | null;
  needs: string[];
}

export interface OffseasonCoachProfile {
  id: string;
  team_abbreviation: string;
  head_coach_name: string;
  pace: OffseasonCoachPace;
  scheme: string;
  youth_development: boolean;
  driver_friendly: boolean;
  shooter_friendly: boolean;
}

export interface OffseasonCoachTendencyProfile {
  pace_bias: number;
  spacing_bias: number;
  rim_pressure_bias: number;
  defense_bias: number;
  development_bias: number;
}

export interface OffseasonCoachingMarketState {
  stage: CoachingMarketStage;
  selected_coach: OffseasonCoachProfile | null;
  tendency_profile: OffseasonCoachTendencyProfile | null;
  hiring_notes: string[];
}

export interface OffseasonDecisionRecord {
  id: string;
  phase: Exclude<OffseasonPhase, 'team_context' | 'complete'>;
  title: string;
  verdict: OffseasonDecisionVerdict;
  summary: string;
  details: string[];
  created_at: string;
}

export interface OffseasonScoutingSignals {
  production: number;
  workout: number;
  interview: number;
  tools: number;
}

export interface OffseasonScoutingProspect {
  player_id: number;
  full_name: string;
  position: string;
  draft_year: number | null;
  board_rank: number;
  scouting_score: number;
  uncertainty_score: number;
  uncertainty_band: ProspectUncertaintyBand;
  signals: OffseasonScoutingSignals;
}

export interface OffseasonScoutingState {
  stage: ScoutingStage;
  prospects: OffseasonScoutingProspect[];
  last_board_update_at: string | null;
}

export type TradeProposalDecision = 'accepted' | 'rejected';
export type TradeProposalVerdict = 'helps' | 'neutral' | 'hurts';

export interface OffseasonTradeProposal {
  id: string;
  offered_player_ids: number[];
  offered_pick_ids: string[];
  requested_player_ids: number[];
  requested_pick_ids: string[];
  decision: TradeProposalDecision;
  verdict: TradeProposalVerdict;
  fit_score: number;
  rationale: string[];
  created_at: string;
}

export interface OffseasonTradeMarketState {
  stage: TradeMarketStage;
  proposals: OffseasonTradeProposal[];
}

export interface OffseasonRunState {
  schemaVersion: number;
  run_id: string;
  season_year: number;
  phase: OffseasonPhase;
  created_at: string;
  updated_at: string;
  team_context: OffseasonTeamContextState;
  coaching_market: OffseasonCoachingMarketState;
  scouting_pre_draft: OffseasonScoutingState;
  trade_market: OffseasonTradeMarketState;
  decision_history: OffseasonDecisionRecord[];
}

export interface StartOffseasonRunPayload {
  season_year: number;
}

export interface TeamContextUpdatePayload {
  team_id: number;
}

export interface CoachingHirePayload {
  coach_id: string;
}

export interface ScoutingBoardUpdatePayload {
  ranked_player_ids: number[];
}

export interface TradeProposalPayload {
  offered_player_ids: number[];
  offered_pick_ids: string[];
  requested_player_ids: number[];
  requested_pick_ids: string[];
  decision: TradeProposalDecision;
}

export interface OffseasonPhaseTransitionPayload {
  expected_phase: OffseasonPhase;
  next_phase: OffseasonPhase;
}

export const OFFSEASON_PHASE_ORDER: OffseasonPhase[] = [
  'team_context',
  'coaching_market',
  'scouting_pre_draft',
  'trade_market',
  'draft_night',
  'free_agency',
  'post_offseason_recap',
  'complete',
];

export const TEAM_CONTEXT_STAGES: TeamContextStage[] = [
  'select_team',
  'review_context',
  'ready_for_coaching_market',
];

export const OFFSEASON_TIMELINES: OffseasonTimeline[] = [
  'rebuilding',
  'transitioning',
  'contending',
];

export const COACHING_MARKET_STAGES: CoachingMarketStage[] = [
  'evaluate_pool',
  'coach_hired',
];

export const SCOUTING_STAGES: ScoutingStage[] = [
  'build_board',
  'ready_for_trade_market',
];

export const TRADE_MARKET_STAGES: TradeMarketStage[] = [
  'explore_market',
  'ready_for_draft_night',
];

export const PROSPECT_UNCERTAINTY_BANDS: ProspectUncertaintyBand[] = [
  'high',
  'medium',
  'low',
];

export const TRADE_PROPOSAL_DECISIONS: TradeProposalDecision[] = [
  'accepted',
  'rejected',
];

export const TRADE_PROPOSAL_VERDICTS: TradeProposalVerdict[] = [
  'helps',
  'neutral',
  'hurts',
];

export const OFFSEASON_DECISION_VERDICTS: OffseasonDecisionVerdict[] = [
  'selected',
  'accepted',
  'rejected',
  'graded',
  'signed',
  'summary',
];

export const OFFSEASON_SCHEMA_VERSION = 4;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIsoDateString(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

export function createEmptyTeamContextState(): OffseasonTeamContextState {
  return {
    stage: 'select_team',
    selected_team_id: null,
    team: null,
    roster: [],
    picks: [],
    timeline: null,
    needs: [],
  };
}

export function createEmptyCoachingMarketState(): OffseasonCoachingMarketState {
  return {
    stage: 'evaluate_pool',
    selected_coach: null,
    tendency_profile: null,
    hiring_notes: [],
  };
}

export function createEmptyScoutingState(): OffseasonScoutingState {
  return {
    stage: 'build_board',
    prospects: [],
    last_board_update_at: null,
  };
}

export function createEmptyTradeMarketState(): OffseasonTradeMarketState {
  return {
    stage: 'explore_market',
    proposals: [],
  };
}

export function createInitialOffseasonRunState(input: {
  run_id: string;
  season_year: number;
  now_iso?: string;
}): OffseasonRunState {
  const now = input.now_iso ?? new Date().toISOString();

  return {
    schemaVersion: OFFSEASON_SCHEMA_VERSION,
    run_id: input.run_id,
    season_year: input.season_year,
    phase: 'team_context',
    created_at: now,
    updated_at: now,
    team_context: createEmptyTeamContextState(),
    coaching_market: createEmptyCoachingMarketState(),
    scouting_pre_draft: createEmptyScoutingState(),
    trade_market: createEmptyTradeMarketState(),
    decision_history: [],
  };
}

export function validateStartOffseasonRunPayload(
  body: unknown
): OffseasonValidationResult<StartOffseasonRunPayload> {
  if (!isRecord(body)) {
    return {
      valid: false,
      errors: ['Offseason run body must be a JSON object.'],
    };
  }

  const errors: string[] = [];
  const seasonYear = body.season_year;

  if (typeof seasonYear !== 'number' || !Number.isInteger(seasonYear)) {
    errors.push('season_year is required and must be an integer.');
  } else if (seasonYear < 2020 || seasonYear > 2099) {
    errors.push('season_year must be between 2020 and 2099.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      season_year: seasonYear as number,
    },
  };
}

export function validateTeamContextUpdatePayload(
  body: unknown
): OffseasonValidationResult<TeamContextUpdatePayload> {
  if (!isRecord(body)) {
    return {
      valid: false,
      errors: ['Team Context body must be a JSON object.'],
    };
  }

  const errors: string[] = [];
  const teamId = body.team_id;

  if (typeof teamId !== 'number' || !Number.isInteger(teamId)) {
    errors.push('team_id is required and must be an integer.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: { team_id: teamId as number },
  };
}

export function validateCoachingHirePayload(
  body: unknown
): OffseasonValidationResult<CoachingHirePayload> {
  if (!isRecord(body)) {
    return {
      valid: false,
      errors: ['Coaching hire body must be a JSON object.'],
    };
  }

  const errors: string[] = [];
  const coachId = body.coach_id;
  const normalizedCoachId =
    typeof coachId === 'string' ? coachId.trim() : '';

  if (normalizedCoachId.length === 0) {
    errors.push('coach_id is required and must be a non-empty string.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: { coach_id: normalizedCoachId },
  };
}

export function validateScoutingBoardUpdatePayload(
  body: unknown
): OffseasonValidationResult<ScoutingBoardUpdatePayload> {
  if (!isRecord(body)) {
    return {
      valid: false,
      errors: ['Scouting board update body must be a JSON object.'],
    };
  }

  const errors: string[] = [];
  const rankedIds = body.ranked_player_ids;

  if (!Array.isArray(rankedIds) || rankedIds.length === 0) {
    errors.push('ranked_player_ids is required and must be a non-empty array.');
  } else if (
    rankedIds.some((id) => typeof id !== 'number' || !Number.isInteger(id))
  ) {
    errors.push('ranked_player_ids must contain only integer player ids.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      ranked_player_ids: [...new Set(rankedIds as number[])],
    },
  };
}

export function validateTradeProposalPayload(
  body: unknown
): OffseasonValidationResult<TradeProposalPayload> {
  if (!isRecord(body)) {
    return {
      valid: false,
      errors: ['Trade proposal body must be a JSON object.'],
    };
  }

  const errors: string[] = [];
  const offeredPlayerIds = body.offered_player_ids;
  const offeredPickIds = body.offered_pick_ids;
  const requestedPlayerIds = body.requested_player_ids;
  const requestedPickIds = body.requested_pick_ids;
  const decision = body.decision;

  const isIntegerArray = (value: unknown): value is number[] =>
    Array.isArray(value) &&
    value.every((entry) => typeof entry === 'number' && Number.isInteger(entry));
  const isStringArray = (value: unknown): value is string[] =>
    Array.isArray(value) &&
    value.every((entry) => typeof entry === 'string' && entry.trim().length > 0);

  if (!isIntegerArray(offeredPlayerIds)) {
    errors.push('offered_player_ids must be an array of integer ids.');
  }

  if (!isStringArray(offeredPickIds)) {
    errors.push('offered_pick_ids must be an array of non-empty strings.');
  }

  if (!isIntegerArray(requestedPlayerIds)) {
    errors.push('requested_player_ids must be an array of integer ids.');
  }

  if (!isStringArray(requestedPickIds)) {
    errors.push('requested_pick_ids must be an array of non-empty strings.');
  }

  if (
    typeof decision !== 'string' ||
    !TRADE_PROPOSAL_DECISIONS.includes(decision as TradeProposalDecision)
  ) {
    errors.push('decision must be either accepted or rejected.');
  }

  const totalAssets =
    (isIntegerArray(offeredPlayerIds) ? offeredPlayerIds.length : 0) +
    (isStringArray(offeredPickIds) ? offeredPickIds.length : 0) +
    (isIntegerArray(requestedPlayerIds) ? requestedPlayerIds.length : 0) +
    (isStringArray(requestedPickIds) ? requestedPickIds.length : 0);

  if (totalAssets === 0) {
    errors.push('trade proposal must include at least one player or pick asset.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      offered_player_ids: offeredPlayerIds as number[],
      offered_pick_ids: offeredPickIds as string[],
      requested_player_ids: requestedPlayerIds as number[],
      requested_pick_ids: requestedPickIds as string[],
      decision: decision as TradeProposalDecision,
    },
  };
}

export function validateOffseasonPhaseTransitionPayload(
  body: unknown
): OffseasonValidationResult<OffseasonPhaseTransitionPayload> {
  if (!isRecord(body)) {
    return {
      valid: false,
      errors: ['Phase transition body must be a JSON object.'],
    };
  }

  const errors: string[] = [];
  const expectedPhase = body.expected_phase;
  const nextPhase = body.next_phase;

  if (typeof expectedPhase !== 'string' || !OFFSEASON_PHASE_ORDER.includes(expectedPhase as OffseasonPhase)) {
    errors.push('expected_phase must be a valid offseason phase.');
  }

  if (typeof nextPhase !== 'string' || !OFFSEASON_PHASE_ORDER.includes(nextPhase as OffseasonPhase)) {
    errors.push('next_phase must be a valid offseason phase.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      expected_phase: expectedPhase as OffseasonPhase,
      next_phase: nextPhase as OffseasonPhase,
    },
  };
}

export function validateOffseasonRunState(
  body: unknown
): OffseasonValidationResult<OffseasonRunState> {
  if (!isRecord(body)) {
    return {
      valid: false,
      errors: ['Offseason run state must be a JSON object.'],
    };
  }

  const errors: string[] = [];
  const schemaVersion = body.schemaVersion;
  const runId = body.run_id;
  const seasonYear = body.season_year;
  const phase = body.phase;
  const createdAt = body.created_at;
  const updatedAt = body.updated_at;
  const teamContext = body.team_context;
  const coachingMarket = body.coaching_market;
  const scoutingPreDraft = body.scouting_pre_draft;
  const tradeMarket = body.trade_market;
  const decisionHistory = body.decision_history;

  if (typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion) || schemaVersion < 1) {
    errors.push('schemaVersion must be a positive integer.');
  }

  if (typeof runId !== 'string' || runId.trim().length === 0) {
    errors.push('run_id is required and must be a non-empty string.');
  }

  if (typeof seasonYear !== 'number' || !Number.isInteger(seasonYear) || seasonYear < 2020 || seasonYear > 2099) {
    errors.push('season_year must be an integer between 2020 and 2099.');
  }

  if (typeof phase !== 'string' || !OFFSEASON_PHASE_ORDER.includes(phase as OffseasonPhase)) {
    errors.push('phase must be a valid offseason phase.');
  }

  if (!isIsoDateString(createdAt)) {
    errors.push('created_at must be an ISO date string.');
  }

  if (!isIsoDateString(updatedAt)) {
    errors.push('updated_at must be an ISO date string.');
  }

  if (!isRecord(teamContext)) {
    errors.push('team_context must be an object.');
  } else {
    const stage = teamContext.stage;
    const selectedTeamId = teamContext.selected_team_id;
    const team = teamContext.team;
    const roster = teamContext.roster;
    const picks = teamContext.picks;
    const timeline = teamContext.timeline;
    const needs = teamContext.needs;

    if (typeof stage !== 'string' || !TEAM_CONTEXT_STAGES.includes(stage as TeamContextStage)) {
      errors.push('team_context.stage must be a valid Team Context stage.');
    }

    if (selectedTeamId !== null && (typeof selectedTeamId !== 'number' || !Number.isInteger(selectedTeamId))) {
      errors.push('team_context.selected_team_id must be null or an integer.');
    }

    if (team !== null) {
      if (!isRecord(team)) {
        errors.push('team_context.team must be null or an object.');
      } else {
        const requiredTeamKeys: Array<keyof OffseasonTeamSummary> = [
          'id',
          'abbreviation',
          'city',
          'name',
          'full_name',
          'conference',
          'division',
        ];
        for (const key of requiredTeamKeys) {
          if (team[key] === undefined || team[key] === null || team[key] === '') {
            errors.push(`team_context.team.${key} is required when team is set.`);
          }
        }
      }
    }

    if (!Array.isArray(roster)) {
      errors.push('team_context.roster must be an array.');
    }

    if (!Array.isArray(picks)) {
      errors.push('team_context.picks must be an array.');
    }

    if (timeline !== null && (typeof timeline !== 'string' || !OFFSEASON_TIMELINES.includes(timeline as OffseasonTimeline))) {
      errors.push('team_context.timeline must be null or a valid timeline.');
    }

    if (!Array.isArray(needs) || needs.some((need) => typeof need !== 'string')) {
      errors.push('team_context.needs must be an array of strings.');
    }
  }

  if (!isRecord(coachingMarket)) {
    errors.push('coaching_market must be an object.');
  } else {
    const stage = coachingMarket.stage;
    const selectedCoach = coachingMarket.selected_coach;
    const tendencyProfile = coachingMarket.tendency_profile;
    const hiringNotes = coachingMarket.hiring_notes;

    if (
      typeof stage !== 'string' ||
      !COACHING_MARKET_STAGES.includes(stage as CoachingMarketStage)
    ) {
      errors.push('coaching_market.stage must be a valid Coaching Market stage.');
    }

    if (selectedCoach !== null) {
      if (!isRecord(selectedCoach)) {
        errors.push('coaching_market.selected_coach must be null or an object.');
      } else {
        const requiredCoachFields: Array<keyof OffseasonCoachProfile> = [
          'id',
          'team_abbreviation',
          'head_coach_name',
          'pace',
          'scheme',
          'youth_development',
          'driver_friendly',
          'shooter_friendly',
        ];

        for (const field of requiredCoachFields) {
          if (selectedCoach[field] === undefined || selectedCoach[field] === null || selectedCoach[field] === '') {
            errors.push(`coaching_market.selected_coach.${field} is required when selected_coach is set.`);
          }
        }
      }
    }

    if (tendencyProfile !== null) {
      if (!isRecord(tendencyProfile)) {
        errors.push('coaching_market.tendency_profile must be null or an object.');
      } else {
        const requiredBiases: Array<keyof OffseasonCoachTendencyProfile> = [
          'pace_bias',
          'spacing_bias',
          'rim_pressure_bias',
          'defense_bias',
          'development_bias',
        ];

        for (const biasField of requiredBiases) {
          if (typeof tendencyProfile[biasField] !== 'number') {
            errors.push(`coaching_market.tendency_profile.${biasField} must be a number when tendency_profile is set.`);
          }
        }
      }
    }

    if (
      !Array.isArray(hiringNotes) ||
      hiringNotes.some((note) => typeof note !== 'string')
    ) {
      errors.push('coaching_market.hiring_notes must be an array of strings.');
    }
  }

  if (!isRecord(scoutingPreDraft)) {
    errors.push('scouting_pre_draft must be an object.');
  } else {
    const scoutingStage = scoutingPreDraft.stage;
    const prospects = scoutingPreDraft.prospects;
    const lastBoardUpdateAt = scoutingPreDraft.last_board_update_at;

    if (
      typeof scoutingStage !== 'string' ||
      !SCOUTING_STAGES.includes(scoutingStage as ScoutingStage)
    ) {
      errors.push('scouting_pre_draft.stage must be a valid scouting stage.');
    }

    if (!Array.isArray(prospects)) {
      errors.push('scouting_pre_draft.prospects must be an array.');
    } else {
      for (const [index, prospect] of prospects.entries()) {
        if (!isRecord(prospect)) {
          errors.push(`scouting_pre_draft.prospects[${index}] must be an object.`);
          continue;
        }

        const requiredNumericFields = [
          'player_id',
          'board_rank',
          'scouting_score',
          'uncertainty_score',
        ] as const;
        for (const field of requiredNumericFields) {
          if (typeof prospect[field] !== 'number') {
            errors.push(`scouting_pre_draft.prospects[${index}].${field} must be a number.`);
          }
        }

        if (
          typeof prospect.uncertainty_band !== 'string' ||
          !PROSPECT_UNCERTAINTY_BANDS.includes(
            prospect.uncertainty_band as ProspectUncertaintyBand
          )
        ) {
          errors.push(`scouting_pre_draft.prospects[${index}].uncertainty_band must be high, medium, or low.`);
        }

        if (
          !isRecord(prospect.signals) ||
          typeof prospect.signals.production !== 'number' ||
          typeof prospect.signals.workout !== 'number' ||
          typeof prospect.signals.interview !== 'number' ||
          typeof prospect.signals.tools !== 'number'
        ) {
          errors.push(`scouting_pre_draft.prospects[${index}].signals must include numeric production/workout/interview/tools values.`);
        }
      }
    }

    if (
      lastBoardUpdateAt !== null &&
      !isIsoDateString(lastBoardUpdateAt)
    ) {
      errors.push('scouting_pre_draft.last_board_update_at must be null or an ISO date string.');
    }
  }

  if (!isRecord(tradeMarket)) {
    errors.push('trade_market must be an object.');
  } else {
    const tradeStage = tradeMarket.stage;
    const proposals = tradeMarket.proposals;

    if (
      typeof tradeStage !== 'string' ||
      !TRADE_MARKET_STAGES.includes(tradeStage as TradeMarketStage)
    ) {
      errors.push('trade_market.stage must be a valid trade market stage.');
    }

    if (!Array.isArray(proposals)) {
      errors.push('trade_market.proposals must be an array.');
    } else {
      for (const [index, proposal] of proposals.entries()) {
        if (!isRecord(proposal)) {
          errors.push(`trade_market.proposals[${index}] must be an object.`);
          continue;
        }

        if (typeof proposal.id !== 'string' || proposal.id.trim().length === 0) {
          errors.push(`trade_market.proposals[${index}].id must be a non-empty string.`);
        }

        if (
          typeof proposal.decision !== 'string' ||
          !TRADE_PROPOSAL_DECISIONS.includes(
            proposal.decision as TradeProposalDecision
          )
        ) {
          errors.push(`trade_market.proposals[${index}].decision must be accepted or rejected.`);
        }

        if (
          typeof proposal.verdict !== 'string' ||
          !TRADE_PROPOSAL_VERDICTS.includes(
            proposal.verdict as TradeProposalVerdict
          )
        ) {
          errors.push(`trade_market.proposals[${index}].verdict must be helps, neutral, or hurts.`);
        }

        const listFields = [
          'offered_player_ids',
          'offered_pick_ids',
          'requested_player_ids',
          'requested_pick_ids',
          'rationale',
        ] as const;

        for (const field of listFields) {
          if (!Array.isArray(proposal[field])) {
            errors.push(`trade_market.proposals[${index}].${field} must be an array.`);
          }
        }

        if (typeof proposal.fit_score !== 'number') {
          errors.push(`trade_market.proposals[${index}].fit_score must be a number.`);
        }

        if (!isIsoDateString(proposal.created_at)) {
          errors.push(`trade_market.proposals[${index}].created_at must be an ISO date string.`);
        }
      }
    }
  }

  if (!Array.isArray(decisionHistory)) {
    errors.push('decision_history must be an array.');
  } else {
    for (const [index, decision] of decisionHistory.entries()) {
      if (!isRecord(decision)) {
        errors.push(`decision_history[${index}] must be an object.`);
        continue;
      }

      if (typeof decision.id !== 'string' || decision.id.trim().length === 0) {
        errors.push(`decision_history[${index}].id must be a non-empty string.`);
      }

      if (
        typeof decision.phase !== 'string' ||
        !OFFSEASON_PHASE_ORDER.includes(decision.phase as OffseasonPhase) ||
        decision.phase === 'team_context' ||
        decision.phase === 'complete'
      ) {
        errors.push(`decision_history[${index}].phase must be a valid decision-loop phase.`);
      }

      if (typeof decision.title !== 'string' || decision.title.trim().length === 0) {
        errors.push(`decision_history[${index}].title must be a non-empty string.`);
      }

      if (
        typeof decision.verdict !== 'string' ||
        !OFFSEASON_DECISION_VERDICTS.includes(
          decision.verdict as OffseasonDecisionVerdict
        )
      ) {
        errors.push(`decision_history[${index}].verdict must be a valid decision verdict.`);
      }

      if (typeof decision.summary !== 'string' || decision.summary.trim().length === 0) {
        errors.push(`decision_history[${index}].summary must be a non-empty string.`);
      }

      if (
        !Array.isArray(decision.details) ||
        decision.details.some((detail) => typeof detail !== 'string')
      ) {
        errors.push(`decision_history[${index}].details must be an array of strings.`);
      }

      if (!isIsoDateString(decision.created_at)) {
        errors.push(`decision_history[${index}].created_at must be an ISO date string.`);
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: body as unknown as OffseasonRunState,
  };
}
