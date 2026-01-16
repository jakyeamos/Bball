
import { RegularSeasonGame, Matchup } from '@nba-draft-sim/shared';

export const groupGamesByMatchup = (games: RegularSeasonGame[]): Matchup[] => {
  const matchups: Record<string, Matchup> = {};

  games.forEach(game => {
    // Sort team IDs to create a consistent matchup ID regardless of who is home/away
    const [teamAId, teamBId] = [game.teamAId, game.teamBId].sort();
    const matchupId = `${teamAId}-vs-${teamBId}`;

    if (!matchups[matchupId]) {
      matchups[matchupId] = {
        matchupId,
        teamAId,
        teamBId,
        winsA: 0,
        winsB: 0,
        games: [],
      };
    }

    matchups[matchupId].games.push(game);

    // Determine the winner in the context of the sorted matchup IDs
    const isTeamAWinner = (game.result.winner === 'A' && game.teamAId === teamAId) ||
                         (game.result.winner === 'B' && game.teamBId === teamAId);

    if (isTeamAWinner) {
      matchups[matchupId].winsA++;
    } else {
      matchups[matchupId].winsB++;
    }
  });

  return Object.values(matchups);
};
