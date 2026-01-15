
import React from 'react';
import { RegularSeasonGame } from '@nba-draft-sim/shared';

interface GameCardProps {
  game: RegularSeasonGame;
}

export const GameCard: React.FC<GameCardProps> = ({ game }) => {
  const isWinnerA = game.result.winner === 'A';

  const teamANameClasses = `text-sm truncate ${
    isWinnerA ? 'font-semibold' : 'text-gray-500'
  }`;
  const teamBNameClasses = `text-sm truncate ${
    !isWinnerA ? 'font-semibold' : 'text-gray-500'
  }`;
  const teamAScoreClasses = `text-xl ${
    isWinnerA ? 'font-bold' : 'text-gray-500'
  }`;
  const teamBScoreClasses = `text-xl ${
    !isWinnerA ? 'font-bold' : 'text-gray-500'
  }`;

  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center justify-between">
        <div className="flex-1 text-left">
          <p className={teamANameClasses}>{game.teamAId}</p>
        </div>
        <div className="flex items-center space-x-2 text-center">
          <p className={teamAScoreClasses}>
            {game.result.finalScoreA?.toFixed(0)}
          </p>
          <p className="text-gray-400">-</p>
          <p className={teamBScoreClasses}>
            {game.result.finalScoreB?.toFixed(0)}
          </p>
        </div>
        <div className="flex-1 text-right">
          <p className={teamBNameClasses}>{game.teamBId}</p>
        </div>
      </div>
    </div>
  );
};
