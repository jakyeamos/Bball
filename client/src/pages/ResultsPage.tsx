import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { wsService } from '../services/websocket';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { TeamRecord, RegularSeasonGame } from '@nba-draft-sim/shared';
import { PlayoffsDisplay } from '../components/PlayoffsDisplay';

/**
 * Generate realistic NBA game scores based on win probability
 * Higher win probability = larger margin of victory (on average)
 */
function generateGameScore(winPctA: number, seed: number = 0): { scoreA: number; scoreB: number } {
  // Use seed for consistent scores per game
  const pseudoRandom = (s: number) => {
    const x = Math.sin(s * 9999) * 10000;
    return x - Math.floor(x);
  };

  // Base scores (typical NBA game)
  const baseScore = 105 + pseudoRandom(seed + 1) * 20; // 105-125 range
  
  // Point differential based on win probability
  // winPctA = 0.5 -> even game, winPctA = 0.7 -> ~8-10 point spread
  const spread = (winPctA - 0.5) * 30; // -15 to +15 based on probability
  
  // Add variance to the spread
  const variance = (pseudoRandom(seed + 2) - 0.5) * 15; // +/- 7.5 points
  const actualSpread = spread + variance;
  
  // Sometimes the underdog wins (upset)
  const upsetFactor = pseudoRandom(seed + 3);
  const isUpset = upsetFactor > winPctA;
  
  let scoreA = Math.round(baseScore + actualSpread / 2);
  let scoreB = Math.round(baseScore - actualSpread / 2);
  
  if (isUpset) {
    // Swap scores for upset
    [scoreA, scoreB] = [scoreB, scoreA];
  }
  
  // Ensure scores are reasonable (85-140 range)
  scoreA = Math.max(85, Math.min(140, scoreA));
  scoreB = Math.max(85, Math.min(140, scoreB));
  
  return { scoreA, scoreB };
}

/**
 * Format game time (quarter)
 */
function formatGameTime(gameIndex: number): string {
  const quarters = ['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter', 'Final'];
  return quarters[4]; // All completed games show "Final"
}

export function ResultsPage() {
  const navigate = useNavigate();
  const { league, regularSeasonResults, playoffResults, draft, lobby } = useApp();

  // State
  const [playbackQueue, setPlaybackQueue] = useState<RegularSeasonGame[]>([]);
  const [displayedGames, setDisplayedGames] = useState<RegularSeasonGame[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simSpeed, setSimSpeed] = useState(500);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  const isCommissioner = lobby?.users?.some(u => u.isCommissioner) || false;

  // Redirect if no league
  useEffect(() => {
    if (!league) navigate('/');
  }, [league, navigate]);

  // Initialize animation
  useEffect(() => {
    if (regularSeasonResults && !playoffResults && !hasInitialized.current) {
      console.log('🔵 Initializing regular season animation with', regularSeasonResults.games.length, 'games');
      hasInitialized.current = true;
      setPlaybackQueue(regularSeasonResults.games);
      setDisplayedGames([]);
      setIsSimulating(true);
    } else if (playoffResults) {
      setIsSimulating(false);
      if (regularSeasonResults && displayedGames.length === 0) {
        setDisplayedGames(regularSeasonResults.games);
      }
    }
  }, [regularSeasonResults, playoffResults]);

  // Reset on unmount
  useEffect(() => {
    return () => {
      hasInitialized.current = false;
    };
  }, []);

  // Animation loop
  useEffect(() => {
    if (!isSimulating || playbackQueue.length === 0) return;

    const timer = setTimeout(() => {
      setPlaybackQueue(prevQueue => {
        if (prevQueue.length === 0) return prevQueue;
        
        const [nextGame, ...remaining] = prevQueue;
        
        setDisplayedGames(prevDisplayed => {
          const newDisplayed = [...prevDisplayed, nextGame];
          
          setTimeout(() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
          }, 50);
          
          return newDisplayed;
        });
        
        if (remaining.length === 0) {
          setIsSimulating(false);
        }
        
        return remaining;
      });
    }, simSpeed);

    return () => clearTimeout(timer);
  }, [isSimulating, playbackQueue.length, simSpeed]);

  // Live standings
  const liveStandings = useMemo(() => {
    if (!draft?.teams) return [];
    
    const records: Record<string, TeamRecord> = {};
    draft.teams.forEach(t => records[t.teamId] = { teamId: t.teamId, wins: 0, losses: 0, winPct: 0 });

    displayedGames.forEach(game => {
      if (!game?.result) return;
      
      const winnerId = game.result.winner === 'A' ? game.teamAId : game.teamBId;
      const loserId = game.result.winner === 'A' ? game.teamBId : game.teamAId;
       
      if (records[winnerId]) records[winnerId].wins++;
      if (records[loserId]) records[loserId].losses++;
    });

    return Object.values(records)
      .map(r => ({
        ...r,
        winPct: (r.wins + r.losses) > 0 ? r.wins / (r.wins + r.losses) : 0
      }))
      .sort((a, b) => b.winPct - a.winPct || b.wins - a.wins);
  }, [displayedGames, draft]);

  // Handlers
  const handleSkip = useCallback(() => {
    setPlaybackQueue(prevQueue => {
      setDisplayedGames(prevDisplayed => [...prevDisplayed, ...prevQueue]);
      return [];
    });
    setIsSimulating(false);
  }, []);

  const getTeamName = useCallback((tid: string) => {
    return draft?.teams.find(t => t.teamId === tid)?.displayName || tid;
  }, [draft]);

  const currentMatchupIdx = displayedGames.length;
  const totalGames = regularSeasonResults?.games.length || 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {playoffResults ? "League History" : "Season Simulation"}
            </h1>
            {isSimulating && (
              <p className="text-gray-500 mt-1">Simulating games... {currentMatchupIdx} of {totalGames}</p>
            )}
          </div>
          
          {isSimulating && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border">
                <span className="text-sm text-gray-600">Speed:</span>
                <button 
                  onClick={() => setSimSpeed(800)} 
                  className={`px-2 py-1 rounded text-xs ${simSpeed === 800 ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}
                >
                  Slow
                </button>
                <button 
                  onClick={() => setSimSpeed(500)} 
                  className={`px-2 py-1 rounded text-xs ${simSpeed === 500 ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}
                >
                  Normal
                </button>
                <button 
                  onClick={() => setSimSpeed(100)} 
                  className={`px-2 py-1 rounded text-xs ${simSpeed === 100 ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}
                >
                  Fast
                </button>
                <button 
                  onClick={() => setSimSpeed(20)} 
                  className={`px-2 py-1 rounded text-xs ${simSpeed === 20 ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}
                >
                  Turbo
                </button>
              </div>
              <Button size="sm" variant="primary" onClick={handleSkip}>Skip All</Button>
            </div>
          )}
        </div>

        {/* No results message */}
        {!regularSeasonResults && !playoffResults && (
          <Card padding="lg" className="mb-4 text-center">
            <p className="text-gray-500">Waiting for season results...</p>
            <p className="text-sm text-gray-400 mt-2">League phase: {league?.phase || 'unknown'}</p>
          </Card>
        )}

        {playoffResults && draft ? (
          <PlayoffsDisplay playoffResults={playoffResults} teams={draft.teams} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Standings */}
            <div className="lg:col-span-2">
              <Card padding="lg">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {isSimulating ? 'Live Standings' : 'Final Standings'}
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 border-b">
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Rank</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Team</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-600">W</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-600">L</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-600">Pct</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {liveStandings.length > 0 ? (
                        liveStandings.map((record, index) => (
                          <tr 
                            key={record.teamId} 
                            className={`border-b transition-colors ${index < 4 ? 'bg-green-50/50' : 'hover:bg-gray-50'}`}
                          >
                            <td className="px-4 py-3">
                              <span className={`
                                inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                                ${index < 4 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}
                              `}>
                                {index + 1}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-900">{getTeamName(record.teamId)}</td>
                            <td className="px-4 py-3 text-center text-green-700 font-medium">{record.wins}</td>
                            <td className="px-4 py-3 text-center text-red-600 font-medium">{record.losses}</td>
                            <td className="px-4 py-3 text-center text-gray-600">
                              {(record.winPct * 100).toFixed(1)}%
                            </td>
                            <td className="px-4 py-3 text-center">
                              {!isSimulating && index < 4 ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                  ✓ PLAYOFFS
                                </span>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                            {draft?.teams ? 'No games played yet...' : 'Loading teams...'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Commissioner Button */}
                {!isSimulating && !playoffResults && league?.phase === 'regular_season' && (
                  <div className="mt-8 text-center border-t pt-6">
                    {isCommissioner ? (
                      <Button 
                        size="lg" 
                        onClick={() => wsService.startPlayoffs()} 
                        className="animate-pulse"
                      >
                        🏆 Start Playoffs
                      </Button>
                    ) : (
                      <div className="text-gray-500 italic">Waiting for Commissioner to start playoffs...</div>
                    )}
                  </div>
                )}
              </Card>
            </div>

            {/* Game Feed */}
            <div className="lg:col-span-1">
              <Card padding="none" className="h-[600px] flex flex-col overflow-hidden">
                <div className="p-4 border-b bg-gradient-to-r from-gray-800 to-gray-900 text-white">
                  <h3 className="font-bold text-lg">Live Game Feed</h3>
                  <div className="text-xs text-gray-400 mt-1">
                    {isSimulating ? `Game ${currentMatchupIdx + 1} in progress...` : 'Season Complete'}
                  </div>
                </div>
                
                <div ref={scrollRef} className="flex-1 overflow-y-auto bg-gray-900 p-4 space-y-3">
                  {displayedGames.map((game, idx) => {
                    if (!game?.result) return null;
                    
                    // Generate scores based on win probability and game index as seed
                    const { scoreA, scoreB } = generateGameScore(game.result.winPctA, idx + 1);
                    const winnerId = game.result.winner === 'A' ? game.teamAId : game.teamBId;
                    const loserId = game.result.winner === 'A' ? game.teamBId : game.teamAId;
                    const winnerScore = game.result.winner === 'A' ? scoreA : scoreB;
                    const loserScore = game.result.winner === 'A' ? scoreB : scoreA;

                    return (
                      <div 
                        key={idx} 
                        className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 animate-in slide-in-from-right-4 fade-in duration-300"
                      >
                        {/* Game Header */}
                        <div className="flex items-center justify-between px-3 py-2 bg-gray-700/50 text-xs">
                          <span className="text-gray-400">Game {idx + 1}</span>
                          <span className="text-gray-500 uppercase tracking-wide">Final</span>
                        </div>

                        {/* Scoreboard */}
                        <div className="p-3">
                          {/* Team A (Home) */}
                          <div className={`flex items-center justify-between py-2 ${game.result.winner === 'A' ? 'text-white' : 'text-gray-400'}`}>
                            <div className="flex items-center gap-2">
                              {game.result.winner === 'A' && (
                                <span className="text-green-400 text-xs">▶</span>
                              )}
                              <span className={`font-semibold ${game.result.winner === 'A' ? 'text-white' : 'text-gray-400'}`}>
                                {getTeamName(game.teamAId)}
                              </span>
                              {game.homeTeam === 'A' && (
                                <span className="text-xs text-gray-500">(H)</span>
                              )}
                            </div>
                            <span className={`text-xl font-bold ${game.result.winner === 'A' ? 'text-white' : 'text-gray-500'}`}>
                              {scoreA}
                            </span>
                          </div>

                          {/* Team B (Away) */}
                          <div className={`flex items-center justify-between py-2 border-t border-gray-700 ${game.result.winner === 'B' ? 'text-white' : 'text-gray-400'}`}>
                            <div className="flex items-center gap-2">
                              {game.result.winner === 'B' && (
                                <span className="text-green-400 text-xs">▶</span>
                              )}
                              <span className={`font-semibold ${game.result.winner === 'B' ? 'text-white' : 'text-gray-400'}`}>
                                {getTeamName(game.teamBId)}
                              </span>
                              {game.homeTeam === 'B' && (
                                <span className="text-xs text-gray-500">(H)</span>
                              )}
                            </div>
                            <span className={`text-xl font-bold ${game.result.winner === 'B' ? 'text-white' : 'text-gray-500'}`}>
                              {scoreB}
                            </span>
                          </div>
                        </div>

                        {/* Editorial */}
                        {game.editorial && (
                          <div className="px-3 pb-3">
                            <p className="text-xs text-blue-300 italic leading-relaxed">
                              {game.editorial}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {displayedGames.length === 0 && (
                    <div className="text-center text-gray-600 py-12">
                      <div className="text-3xl mb-2">🏀</div>
                      <div className="text-sm">
                        {isSimulating ? 'Starting season...' : 'Waiting for games...'}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}