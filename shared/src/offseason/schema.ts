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

export interface OffseasonRunState {
  schemaVersion: number;
  run_id: string;
  season_year: number;
  phase: OffseasonPhase;
  created_at: string;
  updated_at: string;
  team_context: OffseasonTeamContextState;
}

export interface StartOffseasonRunPayload {
  season_year: number;
}

export interface TeamContextUpdatePayload {
  team_id: number;
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

export const OFFSEASON_SCHEMA_VERSION = 2;

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

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: body as unknown as OffseasonRunState,
  };
}
