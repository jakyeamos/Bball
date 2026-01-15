
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
          <p className="truncate">{game.teamAId}</p>
          <p className="text-lg">{game.result.finalScoreA?.toFixed(0)}</p>
        </div>
        <div className="text-center text-xs opacity-75 mt-4">VS</div>
        <div className={teamBClasses}>
          <p className="truncate">{game.teamBId}</p>
          <p className="text-lg">{game.result.finalScoreB?.toFixed(0)}</p>
        </div>
      </div>
    </Card>
  );
};
