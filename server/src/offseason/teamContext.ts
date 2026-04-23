import {
  OffseasonDraftAsset,
  OffseasonRosterPlayer,
  OffseasonTeamContextState,
  OffseasonTeamSummary,
  OffseasonTimeline,
  createEmptyTeamContextState,
} from '@nba-draft-sim/shared';
import { NbaSeedPlayer } from '../../scripts/seedNbaIdentity';
import { getNbaDataCache } from '../../services/dataCache';

function buildTeamSummary(team: {
  id: number;
  abbreviation: string;
  city: string;
  name: string;
  full_name: string;
  conference: string;
  division: string;
}): OffseasonTeamSummary {
  return {
    id: team.id,
    abbreviation: team.abbreviation,
    city: team.city,
    name: team.name,
    full_name: team.full_name,
    conference: team.conference,
    division: team.division,
  };
}

function toRosterPlayer(player: NbaSeedPlayer): OffseasonRosterPlayer {
  return {
    id: player.id,
    full_name: `${player.first_name} ${player.last_name}`.trim(),
    position: player.position || 'UNK',
    jersey_number: player.jersey_number || undefined,
    draft_year:
      typeof player.draft_year === 'number' ? player.draft_year : null,
  };
}

function deriveTimeline(roster: OffseasonRosterPlayer[]): OffseasonTimeline {
  let youngCore = 0;
  let veteranCore = 0;

  for (const player of roster) {
    if (typeof player.draft_year !== 'number') {
      continue;
    }

    if (player.draft_year >= 2021) {
      youngCore += 1;
    }

    if (player.draft_year <= 2016) {
      veteranCore += 1;
    }
  }

  if (youngCore >= veteranCore + 2) {
    return 'rebuilding';
  }

  if (veteranCore >= youngCore + 2) {
    return 'contending';
  }

  return 'transitioning';
}

function deriveNeeds(roster: OffseasonRosterPlayer[]): string[] {
  let guardCount = 0;
  let wingCount = 0;
  let centerCount = 0;

  for (const player of roster) {
    const position = player.position.toUpperCase();
    const isGuard = position.includes('G');
    const isForward = position.includes('F');
    const isCenter = position.includes('C');

    if (isGuard) {
      guardCount += 1;
    }
    if (isForward) {
      wingCount += 1;
    }
    if (isCenter) {
      centerCount += 1;
    }
  }

  const needs: string[] = [];

  if (guardCount < 4) {
    needs.push('Add backcourt shot creation depth');
  }

  if (wingCount < 4) {
    needs.push('Add two-way wing size');
  }

  if (centerCount < 2) {
    needs.push('Add frontcourt rim protection');
  }

  if (needs.length === 0) {
    needs.push('Tighten top-eight playoff rotation fit');
  }

  if (needs.length === 1) {
    needs.push('Add bench shooting consistency');
  }

  return needs;
}

function buildDraftAssetSeed(teamAbbreviation: string): OffseasonDraftAsset[] {
  const currentYear = new Date().getUTCFullYear();
  const draftAssets: OffseasonDraftAsset[] = [];

  for (const year of [currentYear, currentYear + 1]) {
    draftAssets.push({
      id: `${teamAbbreviation}-${year}-R1`,
      year,
      round: 1,
      owner_team_abbreviation: teamAbbreviation,
      original_team_abbreviation: teamAbbreviation,
      note: `${year} first-round pick`,
    });
    draftAssets.push({
      id: `${teamAbbreviation}-${year}-R2`,
      year,
      round: 2,
      owner_team_abbreviation: teamAbbreviation,
      original_team_abbreviation: teamAbbreviation,
      note: `${year} second-round pick`,
    });
  }

  return draftAssets;
}

export async function listAvailableTeams(): Promise<OffseasonTeamSummary[]> {
  const cache = getNbaDataCache();
  await cache.warmUp();

  return cache
    .getTeams()
    .map((team) => buildTeamSummary(team))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export async function buildTeamContextForTeam(
  teamId: number
): Promise<OffseasonTeamContextState> {
  const cache = getNbaDataCache();
  await cache.warmUp();

  const team = cache.getTeamById(teamId);
  if (!team) {
    throw new Error(`Team not found for team_id=${teamId}`);
  }

  const roster = cache
    .getPlayers()
    .filter((player) => player.team_id === team.id)
    .map((player) => toRosterPlayer(player))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  return {
    ...createEmptyTeamContextState(),
    stage: 'review_context',
    selected_team_id: team.id,
    team: buildTeamSummary(team),
    roster,
    picks: buildDraftAssetSeed(team.abbreviation),
    timeline: deriveTimeline(roster),
    needs: deriveNeeds(roster),
  };
}
