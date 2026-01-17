
import React from 'react';
import { RegularSeasonGame } from '@nba-draft-sim/shared';

interface GameCardProps {
  game: RegularSeasonGame;
  gameNumber: number;
}

const TeamRow: React.FC<{
  teamId: string;
  score: number | undefined;
  isWinner: boolean;
}> = ({ teamId, score, isWinner }) => (
  <div className="flex justify-between items-center">
    <div className="flex items-center">
      {isWinner && (
        <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
      )}
      <p
        className={`text-sm ${
          isWinner ? 'font-semibold text-gray-800' : 'text-gray-500'
        }`}
      >
        {teamId}
      </p>
    </div>
    <p
      className={`text-lg ${
        isWinner
          ? 'font-bold text-gray-900'
          : 'font-semibold text-gray-500'
      }`}
    >
      {score !== undefined ? score.toFixed(0) : '-'}
    </p>
  </div>
);

export const GameCard: React.FC<GameCardProps> = ({ game, gameNumber }) => {
  const isWinnerA = game.result.winner === 'A';

  return (
    <div className="rounded-md border border-gray-200 bg-white p-3">
      <h4 className="text-sm font-semibold text-center text-gray-500 mb-2">
        Game {gameNumber}
      </h4>
      <TeamRow
        teamId={game.teamAId}
        score={game.result.finalScoreA}
        isWinner={isWinnerA}
      />
      <TeamRow
        teamId={game.teamBId}
        score={game.result.finalScoreB}
        isWinner={!isWinnerA}
      />
    </div>
  );
};
