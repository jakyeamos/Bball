
import React from 'react';
import { Matchup } from '@nba-draft-sim/shared';
import { Card } from './Card';
import { GameCard } from './GameCard';

interface MatchupCardProps {
  matchup: Matchup;
}

export const MatchupCard: React.FC<MatchupCardProps> = ({ matchup }) => {
  const getSeriesScoreText = () => {
    if (matchup.winsA === matchup.winsB) {
      return `Series tied ${matchup.winsA}-${matchup.winsB}`;
    }
    const winningTeam =
      matchup.winsA > matchup.winsB ? matchup.teamAId : matchup.teamBId;
    const winningScore = Math.max(matchup.winsA, matchup.winsB);
    const losingScore = Math.min(matchup.winsA, matchup.winsB);
    return `${winningTeam} wins series ${winningScore}-${losingScore}`;
  };

  return (
    <Card>
      <div className="p-4 bg-gray-50 rounded-t-lg">
        <div className="text-center">
          <h3 className="text-xl font-bold text-gray-800">{`${matchup.teamAId} vs ${matchup.teamBId}`}</h3>
          <p className="text-md font-semibold text-indigo-600">
            {getSeriesScoreText()}
          </p>
        </div>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {matchup.games.map(game => (
            <GameCard key={game.gameId} game={game} />
          ))}
        </div>
      </div>
    </Card>
  );
};
