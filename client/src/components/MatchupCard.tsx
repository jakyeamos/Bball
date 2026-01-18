
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

  const { winsA, winsB, teamAId, teamBId } = matchup;
  const isTie = winsA === winsB;
  const teamAWon = winsA > winsB;

  const winnerId = teamAWon ? teamAId : teamBId;
  const loserId = teamAWon ? teamBId : teamAId;
  const winnerWins = Math.max(winsA, winsB);
  const loserWins = Math.min(winsA, winsB);

  return (
    <Card>
      <div
        className="p-4 bg-gray-50 rounded-t-lg cursor-pointer hover:bg-gray-100"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex justify-between items-center">
          <div className="flex-1 text-center">
            {isTie ? (
              <>
                <h3 className="text-xl font-bold text-gray-800">{`${teamAId} vs ${teamBId}`}</h3>
                <p className="text-md font-semibold text-gray-600">
                  Series Tied {winsA}-{winsB}
                </p>
              </>
            ) : (
              <h3 className="text-xl text-gray-800">
                <span className="font-bold text-indigo-600">
                  {winnerId}{' '}
                  <span className="text-sm font-semibold text-indigo-500">
                    ({winnerWins})
                  </span>
                </span>
                <span className="mx-2 font-normal text-gray-400">vs</span>
                <span className="font-semibold text-gray-500">
                  {loserId}{' '}
                  <span className="text-sm font-normal text-gray-400">
                    ({loserWins})
                  </span>
                </span>
              </h3>
            )}
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
