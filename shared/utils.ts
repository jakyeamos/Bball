import { TeamRecord } from './types';

/**
 * Calculates the win percentage for a team.
 * @param record - The team's record, containing wins and losses.
 * @returns The win percentage as a number between 0 and 1. Returns 0 if no games have been played.
 */
export function calculateWinPercentage(record: Pick<TeamRecord, 'wins' | 'losses'>): number {
  const totalGames = record.wins + record.losses;
  if (totalGames === 0) {
    return 0;
  }
  return record.wins / totalGames;
}
