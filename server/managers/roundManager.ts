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
  COACHING_WINDOW_SECONDS,
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

  if (seasonFormat === 'playoffs_only') {
    // Playoffs only - generate bracket matchups
    return generatePlayoffMatchups(teamIds, roundNumber);
  }

  // Round robin scheduling
  const n = teamIds.length;

  // Fixed pivot algorithm for round robin
  if (n % 2 !== 0) {
    teamIds = [...teamIds, 'BYE']; // Add dummy for odd teams
  }

  const pivotTeam = teamIds[0];
  const rotatingTeams = teamIds.slice(1);

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
      result: null,
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
        result: null,
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
  if (seasonFormat === 'playoffs_only') {
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
    phase: 'coaching_window',
    matchups,
    coachingDecisions: {},
    results: null,
    coachingWindowEndsAt: new Date(Date.now() + COACHING_WINDOW_SECONDS * 1000).toISOString(),
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
  const results: RoundResult[] = [];

  for (const matchup of round.matchups) {
    const teamA = teamAggregations.get(matchup.teamAId);
    const teamB = teamAggregations.get(matchup.teamBId);

    if (!teamA || !teamB) {
      console.error(`Missing team aggregation for matchup ${matchup.matchupId}`);
      continue;
    }

    // Get coaching decisions for each team
    const coachingA = round.coachingDecisions.get(matchup.teamAId);
    const coachingB = round.coachingDecisions.get(matchup.teamBId);

    // Simulate matchup
    const result = simulateMatchup(
      teamA,
      teamB,
      matchup.homeTeam,
      coachingA,
      coachingB
    );

    results.push({
      matchupId: matchup.matchupId,
      teamAId: matchup.teamAId,
      teamBId: matchup.teamBId,
      winner: result.winner === 'A' ? matchup.teamAId : matchup.teamBId,
      teamAScore: Math.round(result.winsA * 10 + 100), // Placeholder scoring
      teamBScore: Math.round(result.winsB * 10 + 100),
      result,
    });
  }

  return {
    ...round,
    phase: 'results',
    results,
  };
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
  const now = Date.now();
  const endsAt = new Date(round.coachingWindowEndsAt).getTime();
  return Math.max(0, Math.floor((endsAt - now) / 1000));
}
