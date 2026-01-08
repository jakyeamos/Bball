import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { wsService } from '../services/websocket';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { RegularSeasonGame, TeamRecord } from '@nba-draft-sim/shared';

export function ResultsPage() {
  const navigate = useNavigate();
  const { league, regularSeasonResults, playoffResults, draft, lobby } = useApp();

  // Animation State
  const [visibleGameIndex, setVisibleGameIndex] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simSpeed, setSimSpeed] = useState(100); // ms per game
  const scrollRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!league) {
      navigate('/');
    }
  }, [league, navigate]);

  // Start simulation when results arrive
  useEffect(() => {
    if (regularSeasonResults && !playoffResults && visibleGameIndex === 0) {
      setIsSimulating(true);
    } else if (playoffResults) {
      // If playoffs exist, skip regular season animation
      setIsSimulating(false);
      if (regularSeasonResults) {
        setVisibleGameIndex(regularSeasonResults.games.length);
      }
    }
  }, [regularSeasonResults, playoffResults]);

  // Animation Loop
  useEffect(() => {
    if (!isSimulating || !regularSeasonResults) return;

    if (visibleGameIndex >= regularSeasonResults.games.length) {
      setIsSimulating(false);
      return;
    }

    const timer = setTimeout(() => {
      setVisibleGameIndex((prev) => prev + 1);
      // Auto-scroll the game log
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, simSpeed);

    return () => clearTimeout(timer);
  }, [isSimulating, visibleGameIndex, regularSeasonResults, simSpeed]);

  if (!league) return null;

  const isCommissioner = lobby?.users?.some(u => u.isCommissioner) || false;

  const handleStartPlayoffs = () => {
    wsService.startPlayoffs();
  };

  const getTeamName = (teamId: string) => {
    const team = draft?.teams.find((t) => t.teamId === teamId);
    return team?.displayName || teamId;
  };

  // --- Dynamic Standings Calculation ---
  const liveStandings = useMemo(() => {
    if (!regularSeasonResults) return [];

    // Initialize empty records for all teams
    const records: Record<string, TeamRecord> = {};
    draft?.teams.forEach(t => {
      records[t.teamId] = { teamId: t.teamId, wins: 0, losses: 0, winPct: 0 };
    });

    // Process games up to visible index
    const gamesToProcess = regularSeasonResults.games.slice(0, visibleGameIndex);
    
    gamesToProcess.forEach(game => {
      const winnerId = game.result.winner === 'A' ? game.teamAId : game.teamBId;
      const loserId = game.result.winner === 'A' ? game.teamBId : game.teamAId;

      if (records[winnerId]) records[winnerId].wins++;
      if (records[loserId]) records[loserId].losses++;
    });

    // Calculate Win % and Sort
    return Object.values(records)
      .map(r => ({
        ...r,
        winPct: (r.wins + r.losses) > 0 ? r.wins / (r.wins + r.losses) : 0
      }))
      .sort((a, b) => {
        if (b.winPct !== a.winPct) return b.winPct - a.winPct;
        return b.wins - a.wins;
      });
  }, [regularSeasonResults, visibleGameIndex, draft]);

  const currentGame = regularSeasonResults?.games[visibleGameIndex - 1];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">
          {playoffResults ? "League History" : isSimulating ? "Simulating Season..." : "Regular Season Results"}
        </h1>

        {/* --- SIMULATION CONTROLS --- */}
        {isSimulating && (
          <div className="flex justify-center gap-4 mb-6">
            <Button size="sm" variant="secondary" onClick={() => setSimSpeed(500)}>1x Speed</Button>
            <Button size="sm" variant="secondary" onClick={() => setSimSpeed(100)}>5x Speed</Button>
            <Button size="sm" variant="secondary" onClick={() => setSimSpeed(10)}>Turbo</Button>
            <Button size="sm" variant="primary" onClick={() => {
              setIsSimulating(false);
              setVisibleGameIndex(regularSeasonResults?.games.length || 0);
            }}>Skip to End</Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: STANDINGS */}
          <div className="lg:col-span-2">
            {regularSeasonResults && (
              <Card padding="lg">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Standings {isSimulating && <span className="text-primary-600 animate-pulse">● LIVE</span>}
                  </h2>
                  <div className="text-sm text-gray-500">
                    Games Played: {visibleGameIndex} / {regularSeasonResults.games.length}
                  </div>
                </div>
                
                <div className="overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="px-4 py-3 text-left">Rank</th>
                        <th className="px-4 py-3 text-left">Team</th>
                        <th className="px-4 py-3 text-center">W</th>
                        <th className="px-4 py-3 text-center">L</th>
                        <th className="px-4 py-3 text-center">Pct</th>
                        <th className="px-4 py-3 text-center">Diff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {liveStandings.map((record, index) => (
                        <tr
                          key={record.teamId}
                          className={`border-b transition-colors duration-300 ${
                            index < 4 ? 'bg-green-50/50' : ''
                          }`}
                        >
                          <td className="px-4 py-3 font-bold text-gray-500">{index + 1}</td>
                          <td className="px-4 py-3 font-medium">
                            {getTeamName(record.teamId)}
                            {/* Show Playoff Badge only when simulation is done */}
                            {!isSimulating && index < 4 && (
                              <span className="ml-2 text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded uppercase tracking-wider">
                                Clinched
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-green-700">{record.wins}</td>
                          <td className="px-4 py-3 text-center text-red-600">{record.losses}</td>
                          <td className="px-4 py-3 text-center text-gray-600">
                            {(record.winPct * 100).toFixed(1)}%
                          </td>
                          <td className="px-4 py-3 text-center text-xs text-gray-400">
                            {/* Use games back logic here if desired */}
                            -
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Commissioner Actions */}
                {!isSimulating && !playoffResults && league.phase === 'regular_season' && (
                  <div className="mt-8 text-center border-t pt-6">
                    {isCommissioner ? (
                      <Button size="lg" onClick={handleStartPlayoffs} className="animate-bounce">
                        🏆 Start Playoffs
                      </Button>
                    ) : (
                      <div className="text-gray-500 italic">Waiting for commissioner...</div>
                    )}
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* RIGHT: GAME TICKER / LOG */}
          <div className="lg:col-span-1">
            <Card padding="md" className="h-[600px] flex flex-col">
              <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">Game Log</h3>
              
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto space-y-3 pr-2 scroll-smooth"
              >
                {regularSeasonResults?.games.slice(0, visibleGameIndex).map((game, idx) => {
                  const winnerName = getTeamName(game.result.winner === 'A' ? game.teamAId : game.teamBId);
                  const loserName = getTeamName(game.result.winner === 'A' ? game.teamBId : game.teamAId);
                  
                  return (
                    <div key={game.gameId} className="p-3 bg-white border rounded shadow-sm text-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-400">Game {idx + 1}</span>
                        {/* If you have score data in result drivers, use it, otherwise simplify */}
                        <span className="text-xs font-bold text-green-600">FINAL</span>
                      </div>
                      <div className="flex justify-between items-center font-medium">
                        <span className="text-gray-900">{winnerName}</span>
                        <span className="text-green-600">W</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-500">
                        <span>{loserName}</span>
                        <span>L</span>
                      </div>
                      {/* Optional: Show key matchup driver */}
                      {game.result.drivers?.[0] && (
                        <div className="mt-2 text-xs text-gray-500 border-t pt-1 italic">
                          Key: {game.result.drivers[0].category} (+{game.result.drivers[0].impact.toFixed(1)})
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {visibleGameIndex === 0 && (
                  <div className="text-center text-gray-400 py-10">
                    Season starting...
                  </div>
                )}
              </div>
            </Card>
          </div>

        </div>

        {/* PLAYOFFS SECTION (Only shows after sim) */}
        {!isSimulating && playoffResults && (
          <div className="mt-12 animate-in fade-in duration-700">
             {/* ... Existing Playoffs Code ... */}
             <Card padding="lg">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Playoffs Bracket</h2>
                {/* ... (Keep your existing playoff rendering logic here) ... */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Semi-Final 1 */}
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <h3 className="font-bold text-gray-900 mb-4 text-center border-b pb-2">Semi-Final 1</h3>
                    <div className="space-y-4">
                      {/* Team A */}
                      <div className={`p-3 rounded flex justify-between items-center ${
                          playoffResults.semiFinal1.winner === playoffResults.semiFinal1.teamAId ? 'bg-green-100 font-bold border border-green-300' : 'bg-white border'
                        }`}>
                        <span>{getTeamName(playoffResults.semiFinal1.teamAId)}</span>
                        <span className="text-xl">{playoffResults.semiFinal1.winsA}</span>
                      </div>
                      {/* Team B */}
                      <div className={`p-3 rounded flex justify-between items-center ${
                          playoffResults.semiFinal1.winner === playoffResults.semiFinal1.teamBId ? 'bg-green-100 font-bold border border-green-300' : 'bg-white border'
                        }`}>
                        <span>{getTeamName(playoffResults.semiFinal1.teamBId)}</span>
                        <span className="text-xl">{playoffResults.semiFinal1.winsB}</span>
                      </div>
                    </div>
                    {/* Series path visualization */}
                    <div className="mt-4 flex justify-center gap-1">
                        {playoffResults.semiFinal1.seriesPath.map((winner, i) => (
                            <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${
                                winner === 'A' ? 'bg-blue-500' : 'bg-red-500'
                            }`}>
                                {winner}
                            </div>
                        ))}
                    </div>
                  </div>

                  {/* Semi-Final 2 */}
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <h3 className="font-bold text-gray-900 mb-4 text-center border-b pb-2">Semi-Final 2</h3>
                    <div className="space-y-4">
                       {/* Team A */}
                       <div className={`p-3 rounded flex justify-between items-center ${
                          playoffResults.semiFinal2.winner === playoffResults.semiFinal2.teamAId ? 'bg-green-100 font-bold border border-green-300' : 'bg-white border'
                        }`}>
                        <span>{getTeamName(playoffResults.semiFinal2.teamAId)}</span>
                        <span className="text-xl">{playoffResults.semiFinal2.winsA}</span>
                      </div>
                      {/* Team B */}
                      <div className={`p-3 rounded flex justify-between items-center ${
                          playoffResults.semiFinal2.winner === playoffResults.semiFinal2.teamBId ? 'bg-green-100 font-bold border border-green-300' : 'bg-white border'
                        }`}>
                        <span>{getTeamName(playoffResults.semiFinal2.teamBId)}</span>
                        <span className="text-xl">{playoffResults.semiFinal2.winsB}</span>
                      </div>
                    </div>
                     {/* Series path visualization */}
                     <div className="mt-4 flex justify-center gap-1">
                        {playoffResults.semiFinal2.seriesPath.map((winner, i) => (
                            <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${
                                winner === 'A' ? 'bg-blue-500' : 'bg-red-500'
                            }`}>
                                {winner}
                            </div>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Finals */}
                <div className="max-w-2xl mx-auto p-6 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                  <h3 className="text-2xl font-bold text-yellow-800 mb-6 text-center">🏆 FINALS 🏆</h3>
                  <div className="space-y-4">
                      {/* Team A */}
                      <div className={`p-4 rounded-lg flex justify-between items-center text-lg ${
                          playoffResults.finals.winner === playoffResults.finals.teamAId ? 'bg-yellow-200 font-bold border border-yellow-400 shadow-md' : 'bg-white border'
                        }`}>
                        <span>{getTeamName(playoffResults.finals.teamAId)}</span>
                        <span className="text-2xl">{playoffResults.finals.winsA}</span>
                      </div>
                      {/* Team B */}
                      <div className={`p-4 rounded-lg flex justify-between items-center text-lg ${
                          playoffResults.finals.winner === playoffResults.finals.teamBId ? 'bg-yellow-200 font-bold border border-yellow-400 shadow-md' : 'bg-white border'
                        }`}>
                        <span>{getTeamName(playoffResults.finals.teamBId)}</span>
                        <span className="text-2xl">{playoffResults.finals.winsB}</span>
                      </div>
                  </div>
                  
                  <div className="mt-8 text-center">
                    <div className="text-gray-600 mb-1">League Champion</div>
                    <div className="text-4xl font-black text-gray-900">{getTeamName(playoffResults.champion)}</div>
                  </div>
                </div>
             </Card>
          </div>
        )}
      </div>
    </div>
  );
}