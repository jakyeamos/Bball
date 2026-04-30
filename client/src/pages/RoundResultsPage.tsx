import React from 'react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

export function RoundResultsPage() {
  const { league, lobby, userId } = useApp();
  const isCommissioner = lobby?.users?.some((user) => user.userId === userId && user.isCommissioner) ?? false;

  const handleNextRound = () => {
    // Logic to start the next round will be added here
  };

  if (!league || !league.roundState || league.roundState.phase !== 'results') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600">Waiting for round results...</p>
      </div>
    );
  }

  const { roundResults } = league.roundState;
  if (!roundResults) {
    return (
      <div className="min-h-screen bg-cv-navy p-8 flex items-center justify-center">
        <p className="text-cv-chalk/70">Waiting for round results...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Round {roundResults.roundNumber} Results
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Matchups</h2>
            <div className="space-y-4">
              {roundResults.games.map((game) => (
                <Card key={game.gameId} padding="md">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{game.teamAId}</p>
                      <p className="text-sm text-gray-500">vs</p>
                      <p className="font-semibold">{game.teamBId}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${game.result.winner === 'A' ? 'text-green-600' : 'text-red-600'}`}>
                        {game.result.winsA}
                      </p>
                      <p className="text-sm text-gray-500">-</p>
                      <p className={`font-bold ${game.result.winner === 'B' ? 'text-green-600' : 'text-red-600'}`}>
                        {game.result.winsB}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Standings</h2>
            <Card padding="md">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm font-semibold text-gray-600 border-b">
                    <th className="p-2">Team</th>
                    <th className="p-2">Wins</th>
                    <th className="p-2">Losses</th>
                  </tr>
                </thead>
                <tbody>
                  {roundResults.updatedStandings.map((record) => (
                    <tr key={record.teamId} className="border-b last:border-0">
                      <td className="p-2 font-medium">{record.teamId}</td>
                      <td className="p-2">{record.wins}</td>
                      <td className="p-2">{record.losses}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </div>

        {isCommissioner && (
          <div className="mt-8 text-center">
            <Button onClick={handleNextRound} size="lg">
              Start Next Round
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
