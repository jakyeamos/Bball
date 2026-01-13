/**
 * server/managers/roundManager.ts - Phase 1B
 * Round-based execution system
 */

import { v4 as uuidv4 } from 'uuid';
import {
  RoundState,
  RoundPhase,
  RoundMatchup,
  RoundResult,
  CoachingDecision,
  TeamAggregation,
  Player,
  SeasonFormat,
  RegularSeasonGame,
  TeamRecord,
  MatchupResult,
  DRAFT_CONSTRAINTS,
} from '@nba-draft-sim/shared';
import { simulateMatchup } from '../services/simulation';

/**
 * Generate schedule for a round based on season format
 */
export function generateRoundSchedule(
  teamIds: string[],
  roundNumber: number,
  seasonFormat: SeasonFormat
): RoundMatchup[] {
  const matchups: RoundMatchup[] = [];

  if (seasonFormat === 'quick_sim') {
    // Playoffs only - generate bracket matchups
    return generatePlayoffMatchups(teamIds, roundNumber);
  }

  // Round robin scheduling
  const n = teamIds.length;

  // Fixed pivot algorithm for round robin
  let scheduleTeams = teamIds;
  if (n % 2 !== 0) {
    scheduleTeams = [...teamIds, 'BYE']; // Add dummy for odd teams
  }

  const pivotTeam = scheduleTeams[0];
  const rotatingTeams = scheduleTeams.slice(1);

  // Calculate rotation for this round
  const rotation = (roundNumber - 1) % rotatingTeams.length;
  const rotated = [
    ...rotatingTeams.slice(rotation),
    ...rotatingTeams.slice(0, rotation),
  ];

  const roundTeams = [pivotTeam, ...rotated];

  // Generate matchups for this round
  const halfSize = roundTeams.length / 2;
  for (let i = 0; i < halfSize; i++) {
    const teamA = roundTeams[i];
    const teamB = roundTeams[roundTeams.length - 1 - i];

    // Skip BYE matchups
    if (teamA === 'BYE' || teamB === 'BYE') continue;

    // Alternate home team based on round number
    const homeTeam = roundNumber % 2 === 1 ? 'A' : 'B';

    matchups.push({
      matchupId: uuidv4(),
      teamAId: teamA,
      teamBId: teamB,
      homeTeam,
      result: undefined,  // FIX: Use undefined instead of null
    });
  }

  return matchups;
}

/**
 * Generate playoff bracket matchups (for playoffs_only format)
 */
function generatePlayoffMatchups(
  teamIds: string[],
  roundNumber: number
): RoundMatchup[] {
  const matchups: RoundMatchup[] = [];

  // Assume teams are seeded in order
  if (roundNumber === 1) {
    // First round: seed bracket
    for (let i = 0; i < teamIds.length / 2; i++) {
      matchups.push({
        matchupId: uuidv4(),
        teamAId: teamIds[i],
        teamBId: teamIds[teamIds.length - 1 - i],
        homeTeam: 'A',
        result: undefined,  // FIX: Use undefined instead of null
      });
    }
  } else {
    // Subsequent rounds: winners advance
    // This requires tracking previous round results
    // For now, return empty (will be populated by league manager)
  }

  return matchups;
}

/**
 * Calculate total rounds based on season format
 */
export function calculateTotalRounds(
  teamCount: number,
  seasonFormat: SeasonFormat
): number {
  if (seasonFormat === 'quick_sim') {
    // Playoff rounds based on bracket depth
    return Math.ceil(Math.log2(teamCount));
  }

  const roundsInFullCycle = teamCount % 2 === 0 ? teamCount - 1 : teamCount;

  if (seasonFormat === 'single_round_robin') {
    return roundsInFullCycle;
  }

  // double_round_robin
  return roundsInFullCycle * 2;
}

/**
 * Create initial round state
 */
export function createRoundState(
  roundNumber: number,
  matchups: RoundMatchup[]
): RoundState {
  return {
    roundNumber,
    phase: 'scouting', // V3: Start in scouting phase
    matchups,
    coachingDecisions: {},
    roundResults: null,
    // Set scouting window (10s)
    scoutingWindowEndsAt: new Date(Date.now() + DRAFT_CONSTRAINTS.SCOUTING_WINDOW_SECONDS * 1000).toISOString(),
    // Coaching window starts AFTER scouting
    coachingWindowEndsAt: null,
  };
}

/**
 * Submit coaching decision for a team
 */
export function submitCoachingDecision(
  round: RoundState,
  teamId: string,
  decision: CoachingDecision
): RoundState {
  return {
    ...round,
    coachingDecisions: {
      ...round.coachingDecisions,
      [teamId]: decision,
    },
  };
}

/**
 * Check if all teams have submitted coaching decisions
 */
export function allDecisionsSubmitted(
  round: RoundState,
  activeTeamIds: string[]
): boolean {
  return activeTeamIds.every(teamId => round.coachingDecisions[teamId] !== undefined);
}

/**
 * Check if coaching window has expired
 */
export function isCoachingWindowExpired(round: RoundState): boolean {
  if (!round.coachingWindowEndsAt) return true;  // FIX: Handle null case
  return new Date().getTime() >= new Date(round.coachingWindowEndsAt).getTime();
}

/**
 * Simulate all matchups in a round
 */
export function simulateRound(
  round: RoundState,
  teamAggregations: Map<string, TeamAggregation>,
  teamNames: Map<string, string>
): RoundState {
  const games: RegularSeasonGame[] = [];
  const standings: Map<string, { wins: number; losses: number }> = new Map();

  // Initialize standings for all teams
  for (const teamId of teamAggregations.keys()) {
    standings.set(teamId, { wins: 0, losses: 0 });
  }

  for (const matchup of round.matchups) {
    const teamA = teamAggregations.get(matchup.teamAId);
    const teamB = teamAggregations.get(matchup.teamBId);

    if (!teamA || !teamB) {
      console.error(`Missing team aggregation for matchup ${matchup.matchupId}`);
      continue;
    }

    // Get coaching decisions for each team (use bracket notation for Record type)
    const coachingA = round.coachingDecisions[matchup.teamAId];
    const coachingB = round.coachingDecisions[matchup.teamBId];

    // Create unique seed for this matchup to ensure different scores
    const matchupSeed = matchup.matchupId.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0) + round.roundNumber;

    // Simulate matchup
    const result = simulateMatchup(
      teamA,
      teamB,
      matchup.homeTeam,
      coachingA,
      coachingB,
      undefined, // numSims - use default
      matchupSeed
    );

    // Create a RegularSeasonGame record
    const game: RegularSeasonGame = {
      gameId: matchup.matchupId,
      teamAId: matchup.teamAId,
      teamBId: matchup.teamBId,
      homeTeam: matchup.homeTeam,
      result,
      editorial: generateGameEditorial(
        teamNames.get(matchup.teamAId) || matchup.teamAId,
        teamNames.get(matchup.teamBId) || matchup.teamBId,
        result
      ),
    };

    games.push(game);

    // Update standings
    const winnerId = result.winner === 'A' ? matchup.teamAId : matchup.teamBId;
    const loserId = result.winner === 'A' ? matchup.teamBId : matchup.teamAId;

    const winnerRecord = standings.get(winnerId)!;
    const loserRecord = standings.get(loserId)!;
    winnerRecord.wins++;
    loserRecord.losses++;
  }

  // Convert standings map to array
  const updatedStandings: TeamRecord[] = Array.from(standings.entries())
    .map(([teamId, record]) => ({
      teamId,
      wins: record.wins,
      losses: record.losses,
      winPct: record.wins / Math.max(record.wins + record.losses, 1),
    }))
    .sort((a, b) => b.winPct - a.winPct || b.wins - a.wins);

  // Create RoundResult
  const roundResults: RoundResult = {
    roundNumber: round.roundNumber,
    games,
    updatedStandings,
  };

  return {
    ...round,
    phase: 'results',
    roundResults,
    // Update matchups with results
    matchups: round.matchups.map(m => {
      const game = games.find(g => g.gameId === m.matchupId);
      return game ? { ...m, result: game.result } : m;
    }),
  };
}

/**
 * Generate a simple editorial for a game
 */
function generateGameEditorial(
  teamAName: string,
  teamBName: string,
  result: MatchupResult
): string {
  const winner = result.winner === 'A' ? teamAName : teamBName;
  const loser = result.winner === 'A' ? teamBName : teamAName;
  const winPct = result.winner === 'A' ? result.winPctA : (1 - result.winPctA);

  if (winPct > 0.7) {
    return `${winner} dominated ${loser} in a convincing victory.`;
  } else if (winPct > 0.55) {
    return `${winner} secured a solid win over ${loser}.`;
  } else {
    return `${winner} edged out ${loser} in a tight contest.`;
  }
}

/**
 * Transition round to next phase
 */
export function transitionRoundPhase(
  round: RoundState,
  newPhase: RoundPhase
): RoundState {
  return {
    ...round,
    phase: newPhase,
  };
}

/**
 * Get time remaining in coaching window (seconds)
 */
export function getCoachingTimeRemaining(round: RoundState): number {
  if (!round.coachingWindowEndsAt) return 0;  // FIX: Handle null case
  const now = Date.now();
  const endsAt = new Date(round.coachingWindowEndsAt).getTime();
  return Math.max(0, Math.floor((endsAt - now) / 1000));
}