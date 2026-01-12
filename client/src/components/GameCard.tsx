
import React from 'react';
import { RegularSeasonGame } from '@nba-draft-sim/shared';
import { Card } from './Card';

interface GameCardProps {
  game: RegularSeasonGame;
}

export const GameCard: React.FC<GameCardProps> = ({ game }) => {
  const isWinnerA = game.result.winner === 'A';

  const teamAClasses = `text-center ${isWinnerA ? 'font-bold' : 'opacity-50'}`;
  const teamBClasses = `text-center ${!isWinnerA ? 'font-bold' : 'opacity-50'}`;

  return (
    <Card>
      <div className="grid grid-cols-3 items-center text-sm">
        <div className={teamAClasses}>
          <p>{game.teamAId}</p>
          <p className="text-xs">
            ({(game.result.winPctA * 100).toFixed(0)}% to win)
          </p>
        </div>
        <div className="text-center text-xs opacity-75">VS</div>
        <div className={teamBClasses}>
          <p>{game.teamBId}</p>
          <p className="text-xs">
            ({((1 - game.result.winPctA) * 100).toFixed(0)}% to win)
          </p>
        </div>
      </div>
    </Card>
  );
};
