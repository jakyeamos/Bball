
import React from 'react';
import { RegularSeasonGame } from '@nba-draft-sim/shared';
import { Card } from './Card';
import { useApp } from '../context/AppContext';

interface GameCardProps {
  game: RegularSeasonGame;
}

export const GameCard: React.FC<GameCardProps> = ({ game }) => {
  const { league } = useApp();

  const teamA = league?.draftState?.teams.find(t => t.teamId === game.teamAId);
  const teamB = league?.draftState?.teams.find(t => t.teamId === game.teamBId);

  const teamAName = teamA?.displayName ?? game.teamAId.substring(0, 4);
  const teamBName = teamB?.displayName ?? game.teamBId.substring(0, 4);

  const isWinnerA = game.result.winner === 'A';

  return (
    <Card>
      <div className="flex flex-col space-y-2">
        {/* Team A */}
        <div className={`flex justify-between items-center p-2 rounded ${isWinnerA ? 'bg-green-100' : 'bg-gray-100'}`}>
          <div>
            <span className={`font-bold ${isWinnerA ? 'text-green-800' : 'text-gray-800'}`}>
              {teamAName}
            </span>
            <span className="text-xs text-gray-500 ml-2">
              {game.homeTeam === 'A' ? 'HOME' : 'AWAY'}
            </span>
          </div>
          <div className="font-semibold text-gray-600">
            {(game.result.winPctA * 100).toFixed(0)}%
          </div>
        </div>

        {/* Team B */}
        <div className={`flex justify-between items-center p-2 rounded ${!isWinnerA ? 'bg-green-100' : 'bg-gray-100'}`}>
          <div>
            <span className={`font-bold ${!isWinnerA ? 'text-green-800' : 'text-gray-800'}`}>
              {teamBName}
            </span>
            <span className="text-xs text-gray-500 ml-2">
              {game.homeTeam === 'B' ? 'HOME' : 'AWAY'}
            </span>
          </div>
          <div className="font-semibold text-gray-600">
            {((1 - game.result.winPctA) * 100).toFixed(0)}%
          </div>
        </div>
      </div>
    </Card>
  );
};
