
import React, { useState } from 'react';
import { Matchup } from '@nba-draft-sim/shared';
import { Card } from './Card';
import { GameCard } from './GameCard';
import { ChevronDownIcon } from '@heroicons/react/24/solid';

interface MatchupCardProps {
  matchup: Matchup;
}

export const MatchupCard: React.FC<MatchupCardProps> = ({ matchup }) => {
  const [isOpen, setIsOpen] = useState(false);

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
      <div
        className="p-4 bg-gray-50 rounded-t-lg cursor-pointer hover:bg-gray-100"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex justify-between items-center">
          <div className="flex-1 text-center">
            <h3 className="text-xl font-bold text-gray-800">{`${matchup.teamAId} vs ${matchup.teamBId}`}</h3>
            <p className="text-md font-semibold text-indigo-600">
              {getSeriesScoreText()}
            </p>
          </div>
          <ChevronDownIcon
            className={`w-6 h-6 text-gray-400 transform transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </div>
      {isOpen && (
        <div className="p-4 border-t border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {matchup.games.map((game, index) => (
              <GameCard
                key={game.gameId}
                game={game}
                gameNumber={index + 1}
              />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
