import {
  OffseasonRunState,
  OffseasonScoutingProspect,
  OffseasonScoutingState,
  createEmptyScoutingState,
} from '@nba-draft-sim/shared';
import { getNbaDataCache } from '../../services/dataCache';

function seededFraction(seed: number): number {
  const raw = Math.sin(seed * 12.9898) * 43758.5453;
  return raw - Math.floor(raw);
}

function clampUnit(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return Math.round(value * 1000) / 1000;
}

function toolsSignalFromPosition(position: string): number {
  const normalized = position.toUpperCase();
  if (normalized.includes('F') && normalized.includes('C')) {
    return 0.7;
  }
  if (normalized.includes('G') && normalized.includes('F')) {
    return 0.66;
  }
  if (normalized.includes('C')) {
    return 0.62;
  }
  if (normalized.includes('G')) {
    return 0.64;
  }
  if (normalized.includes('F')) {
    return 0.63;
  }
  return 0.58;
}

function uncertaintyBandFromScore(
  uncertaintyScore: number
): OffseasonScoutingProspect['uncertainty_band'] {
  if (uncertaintyScore >= 0.67) {
    return 'high';
  }
  if (uncertaintyScore >= 0.4) {
    return 'medium';
  }
  return 'low';
}

function buildProspectProjection(
  player: {
    id: number;
    first_name: string;
    last_name: string;
    position: string;
    draft_year?: number | null;
  },
  index: number
): OffseasonScoutingProspect {
  const ageProxy =
    typeof player.draft_year === 'number'
      ? clampUnit((player.draft_year - 2016) / 10)
      : 0.45;
  const workout = clampUnit(0.35 + seededFraction(player.id + 11) * 0.6);
  const interview = clampUnit(0.3 + seededFraction(player.id + 31) * 0.65);
  const production = clampUnit(0.4 + seededFraction(player.id + 59) * 0.55);
  const tools = clampUnit(toolsSignalFromPosition(player.position) + ageProxy * 0.12);
  const scoutingScore = clampUnit(
    workout * 0.28 + interview * 0.2 + production * 0.34 + tools * 0.18
  );

  const volatility = Math.abs(workout - production) * 0.45;
  const unknowns = seededFraction(player.id + 89) * 0.35;
  const uncertaintyScore = clampUnit(0.2 + volatility + unknowns);

  return {
    player_id: player.id,
    full_name: `${player.first_name} ${player.last_name}`.trim(),
    position: player.position || 'UNK',
    draft_year:
      typeof player.draft_year === 'number' ? player.draft_year : null,
    board_rank: index + 1,
    scouting_score: scoutingScore,
    uncertainty_score: uncertaintyScore,
    uncertainty_band: uncertaintyBandFromScore(uncertaintyScore),
    signals: {
      production,
      workout,
      interview,
      tools,
    },
  };
}

function normalizeScoutingState(
  state: OffseasonRunState['scouting_pre_draft'] | undefined
): OffseasonScoutingState {
  if (!state) {
    return createEmptyScoutingState();
  }
  return state;
}

export async function buildInitialScoutingBoard(
  run: OffseasonRunState
): Promise<OffseasonScoutingProspect[]> {
  const cache = getNbaDataCache();
  await cache.warmUp();

  const selectedTeamId = run.team_context.selected_team_id;
  const prospects = cache
    .getPlayers()
    .filter((player) => player.team_id !== selectedTeamId)
    .sort((a, b) => {
      const draftA = typeof a.draft_year === 'number' ? a.draft_year : 0;
      const draftB = typeof b.draft_year === 'number' ? b.draft_year : 0;
      if (draftA !== draftB) {
        return draftB - draftA;
      }
      return a.id - b.id;
    })
    .slice(0, 24);

  return prospects.map((prospect, index) =>
    buildProspectProjection(prospect, index)
  );
}

export function reorderScoutingBoard(
  prospects: OffseasonScoutingProspect[],
  rankedPlayerIds: number[]
): OffseasonScoutingProspect[] {
  const byId = new Map(prospects.map((prospect) => [prospect.player_id, prospect]));
  const preferred: OffseasonScoutingProspect[] = [];

  for (const playerId of rankedPlayerIds) {
    const prospect = byId.get(playerId);
    if (!prospect) {
      continue;
    }
    preferred.push(prospect);
    byId.delete(playerId);
  }

  const remainder = [...byId.values()].sort(
    (a, b) => a.board_rank - b.board_rank
  );
  const ordered = [...preferred, ...remainder];

  return ordered.map((prospect, index) => ({
    ...prospect,
    board_rank: index + 1,
  }));
}

export function applyScoutingBoardToRun(
  run: OffseasonRunState,
  prospects: OffseasonScoutingProspect[],
  nowIso: string
): OffseasonRunState {
  const scoutingState = normalizeScoutingState(run.scouting_pre_draft);
  return {
    ...run,
    updated_at: nowIso,
    scouting_pre_draft: {
      ...scoutingState,
      stage: 'build_board',
      prospects,
      last_board_update_at: nowIso,
    },
  };
}

