import {
  OFFSEASON_SCHEMA_VERSION,
  OffseasonRunState,
  createInitialOffseasonRunState,
  createEmptyTeamContextState,
  validateOffseasonRunState,
} from '@nba-draft-sim/shared';

interface LegacyOffseasonRunStateV1 {
  run_id?: string;
  season_year?: number;
  phase?: string;
  created_at?: string;
  updated_at?: string;
  team_context?: {
    stage?: string;
    selected_team_id?: number | null;
    team?: unknown;
    roster?: unknown[];
    picks?: unknown[];
    timeline?: string | null;
    needs?: string[];
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function detectSchemaVersion(raw: unknown): number {
  if (!isRecord(raw)) {
    return 0;
  }

  if (
    typeof raw.schemaVersion === 'number' &&
    Number.isInteger(raw.schemaVersion)
  ) {
    return raw.schemaVersion;
  }

  return 1;
}

function migrateV1ToV2(raw: LegacyOffseasonRunStateV1): OffseasonRunState {
  const now = new Date().toISOString();
  const fallback = createInitialOffseasonRunState({
    run_id:
      typeof raw.run_id === 'string' && raw.run_id.trim().length > 0
        ? raw.run_id
        : `offseason-${Date.now()}`,
    season_year:
      typeof raw.season_year === 'number' &&
      Number.isInteger(raw.season_year) &&
      raw.season_year >= 2020 &&
      raw.season_year <= 2099
        ? raw.season_year
        : 2026,
    now_iso: now,
  });

  const stage =
    raw.team_context?.stage === 'review_context' ||
    raw.team_context?.stage === 'ready_for_coaching_market'
      ? raw.team_context.stage
      : 'select_team';
  const selectedTeamId =
    typeof raw.team_context?.selected_team_id === 'number'
      ? raw.team_context.selected_team_id
      : null;

  return {
    ...fallback,
    schemaVersion: OFFSEASON_SCHEMA_VERSION,
    phase: raw.phase === 'coaching_market' ? 'coaching_market' : 'team_context',
    created_at:
      typeof raw.created_at === 'string' && raw.created_at.trim().length > 0
        ? raw.created_at
        : fallback.created_at,
    updated_at:
      typeof raw.updated_at === 'string' && raw.updated_at.trim().length > 0
        ? raw.updated_at
        : fallback.updated_at,
    team_context: {
      ...createEmptyTeamContextState(),
      stage,
      selected_team_id: selectedTeamId,
      team: isRecord(raw.team_context?.team)
        ? (raw.team_context?.team as unknown as OffseasonRunState['team_context']['team'])
        : null,
      roster: Array.isArray(raw.team_context?.roster)
        ? (raw.team_context?.roster as OffseasonRunState['team_context']['roster'])
        : [],
      picks: Array.isArray(raw.team_context?.picks)
        ? (raw.team_context?.picks as OffseasonRunState['team_context']['picks'])
        : [],
      timeline:
        raw.team_context?.timeline === 'rebuilding' ||
        raw.team_context?.timeline === 'transitioning' ||
        raw.team_context?.timeline === 'contending'
          ? raw.team_context.timeline
          : null,
      needs: Array.isArray(raw.team_context?.needs)
        ? raw.team_context.needs.filter(
            (need): need is string =>
              typeof need === 'string' && need.trim().length > 0
          )
        : [],
    },
  };
}

export interface MigrationResult {
  migrated: boolean;
  from_version: number;
  to_version: number;
  state: OffseasonRunState;
}

export function migrateOffseasonRunState(raw: unknown): MigrationResult {
  const detectedVersion = detectSchemaVersion(raw);

  if (detectedVersion <= 0) {
    throw new Error('Invalid offseason run state payload.');
  }

  let workingState: unknown = raw;
  let currentVersion = detectedVersion;
  let migrated = false;

  while (currentVersion < OFFSEASON_SCHEMA_VERSION) {
    if (currentVersion === 1) {
      workingState = migrateV1ToV2(workingState as LegacyOffseasonRunStateV1);
      currentVersion = OFFSEASON_SCHEMA_VERSION;
      migrated = true;
      continue;
    }

    throw new Error(
      `No migration path from schema version ${currentVersion} to ${OFFSEASON_SCHEMA_VERSION}.`
    );
  }

  const validation = validateOffseasonRunState(workingState);
  if (!validation.valid) {
    throw new Error(
      `Migrated offseason state failed validation: ${validation.errors.join('; ')}`
    );
  }

  return {
    migrated,
    from_version: detectedVersion,
    to_version: OFFSEASON_SCHEMA_VERSION,
    state: validation.data,
  };
}
