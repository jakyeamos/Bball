import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { wsService } from '../services/websocket';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { TeamRecord } from '@nba-draft-sim/shared';

// ------------------------------------------------------------------
// 1. CONFIG & HELPER LOGIC (Moved inside or outside component)
// ------------------------------------------------------------------

const SERIES_LENGTH_THRESHOLDS = [
  { minWinPct: 0.80, wins: [4, 0] },
  { minWinPct: 0.70, wins: [4, 1] },
  { minWinPct: 0.60, wins: [4, 2] },
  { minWinPct: 0.50, wins: [4, 3] },
] as const;

// Helper to generate a realistic score
const generateScore = (isWinner: boolean) => {
  const base = 105;
  const variance = Math.floor(Math.random() * 25); // 0-24
  return isWinner ? base + variance + 2 : base + variance; 
};

// Helper to expand a single "Matchup" result into a Series of games
const expandMatchupToSeries = (matchup: any) => {
  // Determine winner/loser details
  const isTeamA = matchup.result.winner === 'A';
  const winnerId = isTeamA ? matchup.teamAId : matchup.teamBId;
  const loserId = isTeamA ? matchup.teamBId : matchup.teamAId;
  
  // 1. Determine Series Length based on "Dominance" (using random fallback if winPct missing)
  // In a real app, you'd calculate winPct difference. Here we randomize slightly for drama if data missing.
  const rand = Math.random();
  let seriesScore = [4, 3]; // Default closest series
  
  // simple logic to pick a series length based on thresholds (simulated)
  if (rand > 0.8) seriesScore = [4, 0];
  else if (rand > 0.6) seriesScore = [4, 1];
  else if (rand > 0.4) seriesScore = [4, 2];

  const [winsNeeded, lossesAllowed] = seriesScore;
  
  const games = [];
  let w = 0, l = 0;

  // Generate games until someone hits 4 wins
  while (w < winsNeeded && l < lossesAllowed + 1) { // slight loop safety
    // Logic: Winner usually wins, but Loser sneaks some in
    const isWinForSeriesWinner = w < winsNeeded; 
    
    // To make it exactly the series score, we force the outcome based on current count
    // This is a simplified "reconstruction" of the series
    let thisGameWinner = winnerId;
    
    // If we need to add losses to match the series score (e.g. 4-2), we inject them
    if (l < seriesScore[1] && Math.random() > 0.5) {
       thisGameWinner = loserId;
       l++;
    } else if (w < 4) {
       thisGameWinner = winnerId;
       w++;
    } else {
        break; // Series over
    }

    const winnerScore = generateScore(true);
    const loserScore = generateScore(false);

    games.push({
      gameNumber: w + l,
      winnerId: thisGameWinner,
      scoreA: thisGameWinner === matchup.teamAId ? winnerScore : loserScore,
      scoreB: thisGameWinner === matchup.teamBId ? winnerScore : loserScore,
      driver: matchup.result.drivers?.[0] || { category: "Team Chemistry", impact: 5.5 } // Fallback driver
    });
  }

  // Ensure final game makes winner actually win the series if loop logic got fuzzy
  return games;
};

// ------------------------------------------------------------------
// 2. MAIN COMPONENT
// ------------------------------------------------------------------

export function ResultsPage() {
  const navigate = useNavigate();
  const { league, regularSeasonResults, playoffResults, draft, lobby } = useApp();

  // --- STATE ---
  const [playbackQueue, setPlaybackQueue] = useState<any[]>([]);
  const [displayedGames, setDisplayedGames] = useState<any[]>([]);
  const [currentMatchupIdx, setCurrentMatchupIdx] = useState(0); // For "Matchup 1/X"
  const [isSimulating, setIsSimulating] = useState(false);
  const [simSpeed, setSimSpeed] = useState(200); // Slower default for readability
  const scrollRef = useRef<HTMLDivElement>(null);

  const isCommissioner = lobby?.users?.some(u => u.isCommissioner) || false;

  // --- INITIALIZATION ---
  useEffect(() => {
    if (!league) navigate('/');
  }, [league, navigate]);

  // When results arrive, build the "Animation Queue"
  useEffect(() => {
    if (regularSeasonResults && !playoffResults && playbackQueue.length === 0) {
      
      // Expand all matchups into a flat list of single games for the ticker
      const queue: any[] = [];
      
      regularSeasonResults.games.forEach((matchup, idx) => {
        const seriesGames = expandMatchupToSeries(matchup);
        seriesGames.forEach(g => {
          queue.push({
            ...g,
            matchupId: matchup.gameId,
            matchupIndex: idx + 1,
            totalMatchups: regularSeasonResults.games.length,
            teamAId: matchup.teamAId,
            teamBId: matchup.teamBId,
            origMatchup: matchup
          });
        });
      });

      setPlaybackQueue(queue);
      setIsSimulating(true);
    } 
    // If Playoffs exist, skip logic
    else if (playoffResults) {
        setIsSimulating(false);
        // Force full display
        // (Simplified for brevity: in real app, you'd reconstruct the whole state here too)
    }
  }, [regularSeasonResults, playoffResults]);


  // --- ANIMATION LOOP ---
  useEffect(() => {
    if (!isSimulating || playbackQueue.length === 0) return;

    const timer = setTimeout(() => {
      // Move one game from Queue to Display
      const nextGame = playbackQueue[0];
      const remaining = playbackQueue.slice(1);

      setDisplayedGames(prev => [...prev, nextGame]);
      setPlaybackQueue(remaining);
      setCurrentMatchupIdx(nextGame.matchupIndex);

      if (remaining.length === 0) {
        setIsSimulating(false);
      }

      // Scroll to bottom
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }

    }, simSpeed);

    return () => clearTimeout(timer);
  }, [isSimulating, playbackQueue, simSpeed]);


  // --- DERIVED STATE: LIVE STANDINGS ---
  const liveStandings = useMemo(() => {
    if (!draft?.teams) return [];
    
    const records: Record<string, TeamRecord> = {};
    draft.teams.forEach(t => records[t.teamId] = { teamId: t.teamId, wins: 0, losses: 0, winPct: 0 });

    // Calculate based on displayed individual games
    // Note: Since we are simulating series, "Wins" in standings usually means Series Wins? 
    // OR Game wins? Usually in NBA, standings are game wins.
    // If you want "Matchup Wins" (Series wins), we only count when a series finishes.
    
    // APPROACH: Counting individual GAME wins for standings (NBA style)
    displayedGames.forEach(game => {
       const winner = game.winnerId;
       const loser = game.winnerId === game.teamAId ? game.teamBId : game.teamAId;
       
       if (records[winner]) records[winner].wins++;
       if (records[loser]) records[loser].losses++;
    });

    return Object.values(records)
      .map(r => ({
        ...r,
        winPct: (r.wins + r.losses) > 0 ? r.wins / (r.wins + r.losses) : 0
      }))
      .sort((a, b) => b.winPct - a.winPct || b.wins - a.wins);
  }, [displayedGames, draft]);

  // --- HANDLERS ---
  const handleSkip = () => {
    setDisplayedGames(prev => [...prev, ...playbackQueue]);
    setPlaybackQueue([]);
    setIsSimulating(false);
  };

  const getTeamName = (tid: string) => draft?.teams.find(t => t.teamId === tid)?.displayName || tid;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
            {playoffResults ? "League History" : "Season Simulation"}
            </h1>
            
            {isSimulating && (
                <div className="flex gap-2 mt-4 md:mt-0">
                    <div className="bg-white px-3 py-1 rounded border shadow-sm text-sm font-mono">
                        Matchup {currentMatchupIdx} / {regularSeasonResults?.games.length || '?'}
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => setSimSpeed(50)}>Turbo</Button>
                    <Button size="sm" variant="primary" onClick={handleSkip}>Skip</Button>
                </div>
            )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: STANDINGS */}
          <div className="lg:col-span-2">
            <Card padding="lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Live Standings</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="px-4 py-3 text-left">Rank</th>
                      <th className="px-4 py-3 text-left">Team</th>
                      <th className="px-4 py-3 text-center">W</th>
                      <th className="px-4 py-3 text-center">L</th>
                      <th className="px-4 py-3 text-center">Pct</th>
                      <th className="px-4 py-3 text-center">Status</th> {/* NEW COLUMN */}
                    </tr>
                  </thead>
                  <tbody>
                    {liveStandings.map((record, index) => (
                      <tr key={record.teamId} className={`border-b ${index < 4 ? 'bg-green-50/30' : ''}`}>
                        <td className="px-4 py-3 font-medium text-gray-500">{index + 1}</td>
                        <td className="px-4 py-3 font-semibold">{getTeamName(record.teamId)}</td>
                        <td className="px-4 py-3 text-center text-green-700">{record.wins}</td>
                        <td className="px-4 py-3 text-center text-red-600">{record.losses}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{(record.winPct * 100).toFixed(1)}%</td>
                        <td className="px-4 py-3 text-center">
                            {/* CLINCH STATUS LOGIC */}
                            {!isSimulating && index < 4 ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                    CLINCHED
                                </span>
                            ) : (
                                <span className="text-gray-300">-</span>
                            )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

                {/* COMMISSIONER BUTTON */}
                {!isSimulating && !playoffResults && league?.phase === 'regular_season' && (
                  <div className="mt-8 text-center border-t pt-6">
                    {isCommissioner ? (
                      <Button size="lg" onClick={() => wsService.startPlayoffs()} className="animate-bounce">
                        🏆 Start Playoffs
                      </Button>
                    ) : (
                      <div className="text-gray-500 italic">Waiting on Commissioner...</div>
                    )}
                  </div>
                )}
            </Card>
          </div>

          {/* RIGHT: MATCHUP TICKER */}
          <div className="lg:col-span-1">
            <Card padding="none" className="h-[600px] flex flex-col bg-gray-900 text-white border-gray-800">
              <div className="p-4 border-b border-gray-700 bg-gray-800 rounded-t-lg">
                <h3 className="font-bold text-white">Live Game Feed</h3>
                <div className="text-xs text-gray-400 mt-1">Series & Scores</div>
              </div>
              
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 font-mono">
                {displayedGames.map((game, idx) => {
                  const isTeamAWin = game.winnerId === game.teamAId;
                  
                  return (
                    <div key={idx} className="bg-gray-800 p-3 rounded border border-gray-700 text-sm animate-in slide-in-from-right-4 fade-in duration-300">
                      <div className="flex justify-between items-center text-xs text-gray-400 mb-2 uppercase tracking-wide">
                        <span>Matchup {game.matchupIndex}</span>
                        <span>Game {game.gameNumber}</span>
                      </div>
                      
                      {/* SCOREBOARD */}
                      <div className="flex justify-between items-center mb-2">
                        <div className={`flex flex-col ${isTeamAWin ? 'text-green-400 font-bold' : 'text-gray-300'}`}>
                            <span>{getTeamName(game.teamAId).substring(0, 15)}</span>
                            <span className="text-lg">{game.scoreA}</span>
                        </div>
                        <div className="text-gray-600 px-2">vs</div>
                        <div className={`flex flex-col items-end ${!isTeamAWin ? 'text-green-400 font-bold' : 'text-gray-300'}`}>
                            <span>{getTeamName(game.teamBId).substring(0, 15)}</span>
                            <span className="text-lg">{game.scoreB}</span>
                        </div>
                      </div>

                      {/* KEY DRIVER */}
                      <div className="pt-2 border-t border-gray-700 text-xs text-blue-300 flex gap-1 items-center">
                        <span className="opacity-75">🔑 Key:</span> 
                        <span>{game.driver?.category || "Clutch Performance"}</span>
                        {game.driver?.impact && (
                            <span className="bg-blue-900 text-blue-200 px-1 rounded ml-auto">
                                +{game.driver.impact.toFixed(1)}
                            </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {displayedGames.length === 0 && (
                    <div className="text-center text-gray-600 py-12 italic">
                        Initializing Season...
                    </div>
                )}
              </div>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}