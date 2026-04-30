/**
 * Quarter Coaching Page - V3 NEW
 *
 * Displays live quarter-by-quarter game updates with coaching windows
 * between quarters for rotation and strategy adjustments
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { wsService } from '../services/websocket';
import {
  Player,
  LiveGameState,
  QuarterResult,
  QuarterBlurb,
  LineupStrategy,
  DefensiveStrategy,
  OffensiveStrategy,
  CoachingDecision,
  DRAFT_CONSTRAINTS,
} from '@nba-draft-sim/shared';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { getTopArchetypes, formatArchetypeName, getArchetypeColor } from '../archetypes';

// Defensive fallback
const CONSTRAINTS = DRAFT_CONSTRAINTS || {
  ROTATION_MIN: 5,
  ROTATION_MAX: 15,
  ROTATION_DEFAULT: 8,
};

export function QuarterCoachingPage() {
  const navigate = useNavigate();
  const { draft, league, allPlayers, userId } = useApp();
  const liveGame = league?.liveGame ?? null;

  // Game state
  const [gameState, setGameState] = useState<LiveGameState | null>(null);
  const [quarterResults, setQuarterResults] = useState<QuarterResult[]>([]);
  const [quarterBlurbs, setQuarterBlurbs] = useState<QuarterBlurb[]>([]);

  // Coaching window state
  const [isCoachingWindow, setIsCoachingWindow] = useState(false);
  const [coachingTimeRemaining, setCoachingTimeRemaining] = useState<number | null>(null);

  // Coaching decision state (can be adjusted between quarters)
  const [selectedRotation, setSelectedRotation] = useState<string[]>([]);
  const [rotationDepth, setRotationDepth] = useState<number>(CONSTRAINTS.ROTATION_DEFAULT);
  const [lineupStrategy, setLineupStrategy] = useState<LineupStrategy>('balanced');
  const [defensiveStrategy, setDefensiveStrategy] = useState<DefensiveStrategy>('standard');
  const [offensiveStrategy, setOffensiveStrategy] = useState<OffensiveStrategy>('balanced_attack');

  const myTeam = useMemo(() => {
    if (!draft || !userId) return null;
    return draft.teams.find(t => t.userId === userId);
  }, [draft, userId]);
  const isSpectator = !myTeam;

  const myRoster = useMemo(() => {
    if (!myTeam || !allPlayers) return [];
    return myTeam.roster
      .map(pid => allPlayers.find(p => p.playerId === pid))
      .filter((p): p is Player => p !== undefined);
  }, [myTeam, allPlayers]);

  // Hydrate from live game state if present
  useEffect(() => {
    if (!liveGame) return;
    setGameState(liveGame);
    setQuarterResults(liveGame.completedQuarters ?? []);
    setQuarterBlurbs(liveGame.quarterBlurbs ?? []);
  }, [liveGame]);

  // Listen for quarter coaching window
  useEffect(() => {
    const unsubscribe = wsService.on('game:quarter_coaching_window', (data: any) => {
      const { gameState: newGameState, timeRemaining } = data.payload;
      setGameState(newGameState);
      setIsCoachingWindow(true);
      setCoachingTimeRemaining(timeRemaining);
    });
    return unsubscribe;
  }, []);

  // Listen for quarter results
  useEffect(() => {
    const unsubscribe = wsService.on('game:quarter_result', (data: any) => {
      const { quarterResult, quarterBlurb, gameState: newGameState } = data.payload;
      setQuarterResults(prev => [...prev, quarterResult]);
      setQuarterBlurbs(prev => [...prev, quarterBlurb]);
      setGameState(newGameState);
      setIsCoachingWindow(false);
    });
    return unsubscribe;
  }, []);

  // Listen for game final
  useEffect(() => {
    const unsubscribe = wsService.on('game:final', () => {
      // Game is over, navigate to results page
      setTimeout(() => {
        navigate('/round-results');
      }, 5000);
    });
    return unsubscribe;
  }, [navigate]);

  // Initialize rotation with top players
  useEffect(() => {
    if (myRoster.length > 0 && selectedRotation.length === 0) {
      const topPlayers = [...myRoster]
        .sort((a, b) => b.impactRating - a.impactRating)
        .slice(0, rotationDepth)
        .map(p => p.playerId);
      setSelectedRotation(topPlayers);
    }
  }, [myRoster, rotationDepth, selectedRotation.length]);

  // Adjust rotation when depth changes
  useEffect(() => {
    if (selectedRotation.length > rotationDepth) {
      setSelectedRotation(prev => prev.slice(0, rotationDepth));
    } else if (selectedRotation.length < rotationDepth && myRoster.length > 0) {
      const currentIds = new Set(selectedRotation);
      const additionalPlayers = myRoster
        .filter(p => !currentIds.has(p.playerId))
        .sort((a, b) => b.impactRating - a.impactRating)
        .slice(0, rotationDepth - selectedRotation.length)
        .map(p => p.playerId);
      setSelectedRotation(prev => [...prev, ...additionalPlayers]);
    }
  }, [rotationDepth, myRoster]);

  const handlePlayerToggle = (playerId: string) => {
    if (isSpectator) return;
    if (selectedRotation.includes(playerId)) {
      setSelectedRotation(selectedRotation.filter(id => id !== playerId));
    } else {
      if (selectedRotation.length < rotationDepth) {
        setSelectedRotation([...selectedRotation, playerId]);
      }
    }
  };

  const handleSubmitQuarterDecision = () => {
    const activeGameState = gameState ?? liveGame;
    if (!myTeam || !activeGameState) return;

    if (selectedRotation.length !== rotationDepth) {
      alert(`Please select exactly ${rotationDepth} players for your rotation`);
      return;
    }

    const decision: CoachingDecision = {
      teamId: myTeam.teamId,
      roundNumber: league?.currentRound || 0,
      rotation: selectedRotation,
      rotationDepth,
      lineupStrategy,
      defensiveStrategy,
      offensiveStrategy,
      submittedAt: new Date().toISOString(),
    };

    wsService.emit('game:submit_quarter_coaching', {
      gameId: activeGameState.gameId,
      quarter: activeGameState.currentQuarter + 1,
      decision,
    });

    setIsCoachingWindow(false);
  };

  if (!userId || !liveGame) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-500">Loading live game...</p>
        </div>
      </div>
    );
  }

  const activeGameState = gameState ?? liveGame;
  const isRotationComplete = selectedRotation.length === rotationDepth;
  const currentScore = quarterResults.length > 0
    ? quarterResults[quarterResults.length - 1]
    : null;
  const teamAName = activeGameState?.scoutingReport?.teamAName ?? 'Team A';
  const teamBName = activeGameState?.scoutingReport?.teamBName ?? 'Team B';

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Live Game</h1>
              <p className="text-gray-600 mt-1">
                Quarter {activeGameState?.currentQuarter ?? 0} of 4
              </p>
            </div>
            {isCoachingWindow && coachingTimeRemaining !== null && (
              <div className={`text-2xl font-mono font-bold ${coachingTimeRemaining <= 30 ? 'text-red-600 animate-pulse' : 'text-gray-900'
                }`}>
                {Math.floor(coachingTimeRemaining / 60)}:{(coachingTimeRemaining % 60).toString().padStart(2, '0')}
              </div>
            )}
          </div>

          {/* Scoreboard */}
          {currentScore && (
            <Card>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-sm text-gray-600">
                    {teamAName}
                  </div>
                  <div className="text-4xl font-bold text-gray-900">
                    {currentScore.totalScoreA}
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <div className="text-gray-400">-</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">
                    {teamBName}
                  </div>
                  <div className="text-4xl font-bold text-gray-900">
                    {currentScore.totalScoreB}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Quarter Blurbs */}
        {quarterBlurbs.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Game Commentary</h2>
            <div className="space-y-3">
              {quarterBlurbs.map((blurb, index) => (
                <Card key={index}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-16 h-16 bg-primary-100 rounded-lg flex items-center justify-center">
                      <div className="text-2xl font-bold text-primary-600">Q{blurb.quarter}</div>
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 mb-2">{blurb.narrative}</p>
                      <p className="text-sm text-blue-600 italic">{blurb.coachingInsight}</p>
                      {blurb.momentum !== 'even' && (
                        <div className="mt-2 text-xs text-gray-600">
                          Momentum: {blurb.momentum === 'A'
                            ? teamAName
                            : teamBName}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Coaching Window */}
        {isCoachingWindow && !isSpectator && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Rotation Adjustment */}
            <div className="lg:col-span-2">
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">
                    Adjust Rotation ({rotationDepth} players)
                  </h3>

                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">Depth:</span>
                    <input
                      type="range"
                      min={CONSTRAINTS.ROTATION_MIN}
                      max={CONSTRAINTS.ROTATION_MAX}
                      value={rotationDepth}
                      onChange={(e) => setRotationDepth(Number(e.target.value))}
                      className="w-24"
                    />
                    <span className="text-sm font-bold text-primary-600 w-4">{rotationDepth}</span>
                  </div>
                </div>

                <p className="text-sm text-gray-500 mb-4">
                  Make adjustments based on the game flow. More players = deeper bench but less minutes for stars.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {myRoster.map(player => {
                    const isSelected = selectedRotation.includes(player.playerId);
                    const topArchetypes = getTopArchetypes(player.archetypes, 2);

                    return (
                      <div
                        key={player.playerId}
                        onClick={() => handlePlayerToggle(player.playerId)}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${isSelected
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-gray-900">{player.name}</div>
                            <div className="text-xs text-gray-500">
                              {player.position} • Impact: {player.impactRating.toFixed(1)}
                            </div>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected
                            ? 'border-primary-500 bg-primary-500 text-white'
                            : 'border-gray-300'
                            }`}>
                            {isSelected && '✓'}
                          </div>
                        </div>

                        <div className="flex gap-1 mt-2">
                          {topArchetypes.map((arch) => (
                            <span
                              key={arch.name}
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: getArchetypeColor(arch.name) + '20',
                                color: getArchetypeColor(arch.name),
                              }}
                            >
                              {formatArchetypeName(arch.name)}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* Strategy Adjustments */}
            <div className="space-y-4">
              <Card>
                <h3 className="font-bold text-gray-900 mb-3">Adjust Strategies</h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600">Lineup</label>
                    <select
                      value={lineupStrategy}
                      onChange={(e) => setLineupStrategy(e.target.value as LineupStrategy)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="balanced">Balanced</option>
                      <option value="small_ball">Small Ball</option>
                      <option value="big_lineup">Big Lineup</option>
                      <option value="offense_first">Offense First</option>
                      <option value="defense_first">Defense First</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600">Defense</label>
                    <select
                      value={defensiveStrategy}
                      onChange={(e) => setDefensiveStrategy(e.target.value as DefensiveStrategy)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="standard">Standard</option>
                      <option value="switch_everything">Switch Everything</option>
                      <option value="protect_paint">Protect Paint</option>
                      <option value="pressure_ball">Pressure Ball</option>
                      <option value="pack_paint">Pack the Paint</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600">Offense</label>
                    <select
                      value={offensiveStrategy}
                      onChange={(e) => setOffensiveStrategy(e.target.value as OffensiveStrategy)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="balanced_attack">Balanced Attack</option>
                      <option value="pace_and_space">Pace & Space</option>
                      <option value="inside_out">Inside Out</option>
                      <option value="motion_offense">Motion Offense</option>
                      <option value="isolation">Isolation</option>
                    </select>
                  </div>
                </div>
              </Card>

              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleSubmitQuarterDecision}
                disabled={!isRotationComplete}
              >
                {isRotationComplete
                  ? 'Submit Adjustments'
                  : `Select ${rotationDepth - selectedRotation.length} More`}
              </Button>
            </div>
          </div>
        )}

        {isCoachingWindow && isSpectator && (
          <Card>
            <div className="text-center py-8">
              <div className="text-xl font-semibold text-gray-900 mb-2">
                Spectator Mode
              </div>
              <div className="text-gray-600">
                Coaching controls are disabled while you watch this matchup.
              </div>
            </div>
          </Card>
        )}

        {/* Waiting for next quarter */}
        {!isCoachingWindow && activeGameState?.phase === 'simulating_quarter' && (
          <Card>
            <div className="text-center py-8">
              <div className="text-xl font-semibold text-gray-900 mb-2">
                Simulating Quarter {activeGameState?.currentQuarter ?? 0}...
              </div>
              <div className="text-gray-600">Please wait while the quarter is being played</div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
