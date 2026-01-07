/**
 * Results Page
 * Shows regular season standings and playoffs
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { wsService } from '../services/websocket';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

export function ResultsPage() {
  const navigate = useNavigate();
  const { league, regularSeasonResults, playoffResults, draft } = useApp();

  React.useEffect(() => {
    if (!league) {
      navigate('/');
    }
  }, [league, navigate]);

  if (!league) return null;

  const handleStartPlayoffs = () => {
    wsService.startPlayoffs();
  };

  const getTeamName = (teamId: string) => {
    const team = draft?.teams.find((t) => t.teamId === teamId);
    return team?.displayName || teamId;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">
          League Results
        </h1>

        {/* Regular Season Standings */}
        {regularSeasonResults && (
          <Card className="mb-8" padding="lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Regular Season Standings</h2>
            <div className="overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left">Rank</th>
                    <th className="px-4 py-3 text-left">Team</th>
                    <th className="px-4 py-3 text-center">Wins</th>
                    <th className="px-4 py-3 text-center">Losses</th>
                    <th className="px-4 py-3 text-center">Win %</th>
                  </tr>
                </thead>
                <tbody>
                  {regularSeasonResults.standings.map((record, index) => (
                    <tr
                      key={record.teamId}
                      className={`border-b ${index < 4 ? 'bg-green-50' : ''}`}
                    >
                      <td className="px-4 py-3 font-bold">{index + 1}</td>
                      <td className="px-4 py-3">
                        {getTeamName(record.teamId)}
                        {index < 4 && (
                          <span className="ml-2 text-xs bg-green-600 text-white px-2 py-1 rounded">
                            PLAYOFFS
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">{record.wins}</td>
                      <td className="px-4 py-3 text-center">{record.losses}</td>
                      <td className="px-4 py-3 text-center">
                        {(record.winPct * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!playoffResults && league.phase === 'regular_season' && (
              <div className="mt-6 text-center">
                <Button size="lg" onClick={handleStartPlayoffs}>
                  Start Playoffs
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Playoffs */}
        {playoffResults && (
          <Card padding="lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Playoffs</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Semi-Final 1 */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-bold text-gray-900 mb-4">Semi-Final 1</h3>
                <div className="space-y-2">
                  <div
                    className={`p-3 rounded ${
                      playoffResults.semiFinal1.winner === playoffResults.semiFinal1.teamAId
                        ? 'bg-green-100 font-bold'
                        : 'bg-white'
                    }`}
                  >
                    {getTeamName(playoffResults.semiFinal1.teamAId)} - {playoffResults.semiFinal1.winsA} wins
                  </div>
                  <div
                    className={`p-3 rounded ${
                      playoffResults.semiFinal1.winner === playoffResults.semiFinal1.teamBId
                        ? 'bg-green-100 font-bold'
                        : 'bg-white'
                    }`}
                  >
                    {getTeamName(playoffResults.semiFinal1.teamBId)} - {playoffResults.semiFinal1.winsB} wins
                  </div>
                </div>
              </div>

              {/* Semi-Final 2 */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-bold text-gray-900 mb-4">Semi-Final 2</h3>
                <div className="space-y-2">
                  <div
                    className={`p-3 rounded ${
                      playoffResults.semiFinal2.winner === playoffResults.semiFinal2.teamAId
                        ? 'bg-green-100 font-bold'
                        : 'bg-white'
                    }`}
                  >
                    {getTeamName(playoffResults.semiFinal2.teamAId)} - {playoffResults.semiFinal2.winsA} wins
                  </div>
                  <div
                    className={`p-3 rounded ${
                      playoffResults.semiFinal2.winner === playoffResults.semiFinal2.teamBId
                        ? 'bg-green-100 font-bold'
                        : 'bg-white'
                    }`}
                  >
                    {getTeamName(playoffResults.semiFinal2.teamBId)} - {playoffResults.semiFinal2.winsB} wins
                  </div>
                </div>
              </div>
            </div>

            {/* Finals */}
            <div className="p-6 bg-primary-50 rounded-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">FINALS</h3>
              <div className="space-y-3">
                <div
                  className={`p-4 rounded ${
                    playoffResults.finals.winner === playoffResults.finals.teamAId
                      ? 'bg-yellow-100 font-bold border-2 border-yellow-400'
                      : 'bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{getTeamName(playoffResults.finals.teamAId)}</span>
                    <span>{playoffResults.finals.winsA} wins</span>
                  </div>
                </div>
                <div
                  className={`p-4 rounded ${
                    playoffResults.finals.winner === playoffResults.finals.teamBId
                      ? 'bg-yellow-100 font-bold border-2 border-yellow-400'
                      : 'bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{getTeamName(playoffResults.finals.teamBId)}</span>
                    <span>{playoffResults.finals.winsB} wins</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center">
                <div className="text-3xl font-bold text-yellow-600 mb-2">
                  🏆 CHAMPION 🏆
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {getTeamName(playoffResults.champion)}
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
