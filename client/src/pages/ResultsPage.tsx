/**
 * Results Page - V3 UPDATE
 * 
 * CHANGELOG:
 * - V3: Fixed score display to use result.finalScoreA/B when available
 * - Added score guard to ensure winner always shows higher score
 * - Improved generateGameScore function with proper winner alignment
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { wsService } from '../services/websocket';
import { RegularSeasonGame, TeamRecord } from '@nba-draft-sim/shared';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PlayoffsDisplay } from '../components/PlayoffsDisplay';

/**
 * V3: Generate realistic NBA game scores with SCORE GUARD
 * Uses result.finalScoreA/B if available, otherwise generates with guarantee
 * that winner always has the higher score
 */
function generateGameScore(
  winPctA: number, 
  winner: 'A' | 'B',
  seed: number = 0,
  existingScoreA?: number,
  existingScoreB?: number
): { scoreA: number; scoreB: number } {
  // V3: If scores already exist in result, use them (they're already guarded)
  if (existingScoreA !== undefined && existingScoreB !== undefined) {
    return { scoreA: existingScoreA, scoreB: existingScoreB };
  }

  const pseudoRandom = (s: number) => {
    const x = Math.sin(s * 9999) * 10000;
    return x - Math.floor(x);
  };

  // Base scores (typical NBA game)
  const baseScore = 105 + pseudoRandom(seed + 1) * 20;
  
  // Point differential based on win probability
  const dominance = Math.abs(winPctA - 0.5);
  const baseSpread = dominance * 30;
  
  // Add variance
  const variance = (pseudoRandom(seed + 2) - 0.5) * 10;
  let spread = Math.max(1, baseSpread + variance);
  
  // Calculate scores with winner having higher score
  let scoreA: number;
  let scoreB: number;
  
  if (winner === 'A') {
    scoreA = Math.round(baseScore + spread / 2);
    scoreB = Math.round(baseScore - spread / 2);
  } else {
    scoreB = Math.round(baseScore + spread / 2);
    scoreA = Math.round(baseScore - spread / 2);
  }
  
  // SCORE GUARD: Ensure winner always has higher score
  if (winner === 'A' && scoreA <= scoreB) {
    scoreA = scoreB + Math.max(1, Math.round(pseudoRandom(seed + 5) * 5) + 1);
  } else if (winner === 'B' && scoreB <= scoreA) {
    scoreB = scoreA + Math.max(1, Math.round(pseudoRandom(seed + 5) * 5) + 1);
  }
  
  // Clamp to realistic NBA range
  scoreA = Math.max(85, Math.min(140, scoreA));
  scoreB = Math.max(85, Math.min(140, scoreB));
  
  // Final safety check after clamping
  if (winner === 'A' && scoreA <= scoreB) {
    scoreA = scoreB + 1;
  } else if (winner === 'B' && scoreB <= scoreA) {
    scoreB = scoreA + 1;
  }
  
  return { scoreA, scoreB };
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
        setDisplayedGames(prev => [...prev, nextGame]);
        
        if (remaining.length === 0) {
          setIsSimulating(false);
        }
        
        return remaining;
      });
    }, simSpeed);

    return () => clearTimeout(timer);
  }, [isSimulating, playbackQueue, simSpeed]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayedGames]);

  // Team name lookup
  const teamNameMap = useMemo(() => {
    const map = new Map<string, string>();
    draft?.teams.forEach(t => {
      map.set(t.teamId, t.displayName);
    });
    return map;
  }, [draft]);

  const getTeamName = (teamId: string) => teamNameMap.get(teamId) || teamId;

  // Current matchup for display
  const currentMatchupIdx = displayedGames.length;

  // Handlers
  const handleStartPlayoffs = () => {
    wsService.emit('playoffs:start', {});
  };

  const handleSkipAnimation = () => {
    if (regularSeasonResults) {
      setDisplayedGames(regularSeasonResults.games);
      setPlaybackQueue([]);
      setIsSimulating(false);
    }
  };

  if (!league || !regularSeasonResults) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-500">Loading results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {playoffResults ? 'Championship Complete' : 'Season Results'}
            </h1>
            <p className="text-gray-600 mt-1">
              {playoffResults 
                ? `${getTeamName(playoffResults.champion)} wins the championship!` 
                : regularSeasonResults.summary}
            </p>
          </div>
          
          {isSimulating && (
            <div className="flex items-center gap-4">
              <select
                value={simSpeed}
                onChange={(e) => setSimSpeed(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value={1000}>Slow</option>
                <option value={500}>Normal</option>
                <option value={200}>Fast</option>
                <option value={50}>Instant</option>
              </select>
              <Button variant="secondary" onClick={handleSkipAnimation}>
                Skip to End
              </Button>
            </div>
          )}
        </div>

        {/* Playoffs Display */}
        {playoffResults ? (
          <PlayoffsDisplay
            playoffResults={playoffResults}
            teams={draft?.teams || []}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Standings */}
            <div className="lg:col-span-2">
              <Card>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Standings</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">#</th>
                        <th className="text-left py-2 px-3">Team</th>
                        <th className="text-center py-2 px-3">W</th>
                        <th className="text-center py-2 px-3">L</th>
                        <th className="text-center py-2 px-3">PCT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {regularSeasonResults.standings.map((team, idx) => (
                        <tr key={team.teamId} className={idx < 4 ? 'bg-green-50' : ''}>
                          <td className="py-2 px-3 font-medium">{idx + 1}</td>
                          <td className="py-2 px-3 font-semibold">{getTeamName(team.teamId)}</td>
                          <td className="py-2 px-3 text-center">{team.wins}</td>
                          <td className="py-2 px-3 text-center">{team.losses}</td>
                          <td className="py-2 px-3 text-center">{(team.winPct * 100).toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Start Playoffs Button */}
                {!isSimulating && !playoffResults && (
                  <div className="mt-6 pt-4 border-t">
                    {isCommissioner ? (
                      <Button variant="primary" size="lg" fullWidth onClick={handleStartPlayoffs}>
                        Start Playoffs
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
                    
                    // V3: Use result scores if available, otherwise generate with score guard
                    const { scoreA, scoreB } = generateGameScore(
                      game.result.winPctA,
                      game.result.winner,
                      idx + 1,
                      game.result.finalScoreA,
                      game.result.finalScoreB
                    );

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
                          {/* Team A */}
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

                          {/* Team B */}
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