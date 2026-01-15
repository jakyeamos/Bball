
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
    const winningTeam = matchup.winsA > matchup.winsB ? matchup.teamAId : matchup.teamBId;
    const winningScore = Math.max(matchup.winsA, matchup.winsB);
    const losingScore = Math.min(matchup.winsA, matchup.winsB);
    return `${winningTeam} wins series ${winningScore}-${losingScore}`;
  };

  return (
    <Card>
      <div className="p-4">
        <div className="text-center mb-4">
          <h3 className="text-lg font-bold">{`${matchup.teamAId} vs ${matchup.teamBId}`}</h3>
          <p className="text-sm text-gray-500">{getSeriesScoreText()}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {matchup.games.map(game => (
            <GameCard key={game.gameId} game={game} />
          ))}
        </div>
      </div>
    </Card>
  );
};
