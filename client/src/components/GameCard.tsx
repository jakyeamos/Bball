
import React from 'react';
import { RegularSeasonGame } from '@nba-draft-sim/shared';
import { Card } from './Card';

interface GameCardProps {
  game: RegularSeasonGame;
}

export const GameCard: React.FC<GameCardProps> = ({ game }) => {
  const teamAName = game.teamAId.substring(0, 4);
  const teamBName = game.teamBId.substring(0, 4);

  return (
    <Card>
      <div className="flex justify-between items-center">
        <div>
          <span className="font-bold">
            {teamAName} {game.homeTeam === 'A' ? '(Home)' : '(Away)'}
          </span>
          <p>Win Pct: {(game.result.winPctA * 100).toFixed(0)}%</p>
        </div>
        <div>
          <span className="font-bold">
            {teamBName} {game.homeTeam === 'B' ? '(Home)' : '(Away)'}
          </span>
          <p>Win Pct: {((1 - game.result.winPctA) * 100).toFixed(0)}%</p>
        </div>
      </div>
      <div className="text-center mt-2">
        Winner: {game.result.winner === 'A' ? teamAName : teamBName}
      </div>
    </Card>
  );
};
