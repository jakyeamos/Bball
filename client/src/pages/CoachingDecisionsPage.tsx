/**
 * Coaching Decisions Page - V3 UPDATE
 * 
 * CHANGELOG:
 * - V3: Added pre-game scouting report display
 * - Added rotation depth slider (6-10 players) as per-game decision
 * - Prepared for quarter-by-quarter coaching flow
 * - Enhanced strategy selection with contextual tips
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { wsService } from '../services/websocket';
import {
  Player,
  LineupStrategy,
  DefensiveStrategy,
  OffensiveStrategy,
  CoachingDecision,
  ScoutingReport,
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
  ROSTER_MAX: 15,
};

// Strategy descriptions for UI
const LINEUP_STRATEGY_INFO: Record<LineupStrategy, { label: string; description: string; tip: string }> = {
  balanced: {
    label: 'Balanced',
    description: 'No specific emphasis - let the players play',
    tip: 'Good default choice when unsure',
  },
  small_ball: {
    label: 'Small Ball',
    description: '+Pace, +Shooting, -Rebounding',
    tip: 'Use against slow teams or when you have shooting',
  },
  big_lineup: {
    label: 'Big Lineup',
    description: '+Rebounding, +Defense, -Pace',
    tip: 'Counter small ball or dominate the glass',
  },
  offense_first: {
    label: 'Offense First',
    description: '+Offense, -Defense',
    tip: 'When you need to outscore the opponent',
  },
  defense_first: {
    label: 'Defense First',
    description: '+Defense, -Offense',
    tip: 'Grind it out and limit their scoring',
  },
};

const DEFENSIVE_STRATEGY_INFO: Record<DefensiveStrategy, { label: string; description: string; tip: string }> = {
  standard: {
    label: 'Standard',
    description: 'Balanced defensive approach',
    tip: 'Solid choice for most matchups',
  },
  switch_everything: {
    label: 'Switch Everything',
    description: '+Versatility, -Size mismatch risk',
    tip: 'Need versatile defenders for this to work',
  },
  protect_paint: {
    label: 'Protect Paint',
    description: '+Rim protection, -Perimeter defense',
    tip: 'Against teams that attack the basket',
  },
  pressure_ball: {
    label: 'Pressure Ball',
    description: '+Steals/Turnovers, +Fouls',
    tip: 'Disrupt playmakers but risk foul trouble',
  },
  pack_paint: {
    label: 'Pack the Paint',
    description: '+Rim protection, -Three point defense',
    tip: 'Dare them to shoot from outside',
  },
};

const OFFENSIVE_STRATEGY_INFO: Record<OffensiveStrategy, { label: string; description: string; tip: string }> = {
  balanced_attack: {
    label: 'Balanced Attack',
    description: 'Standard offensive flow',
    tip: 'Let the offense develop naturally',
  },
  pace_and_space: {
    label: 'Pace & Space',
    description: '+3PA, +Pace, -Paint scoring',
    tip: 'When you have shooters - stretch the floor',
  },
  inside_out: {
    label: 'Inside Out',
    description: '+Paint scoring, +FT rate, -3PA',
    tip: 'Pound it inside when you have size',
  },
  motion_offense: {
    label: 'Motion Offense',
    description: '+Assists, +Ball movement',
    tip: 'When your team has good chemistry',
  },
  isolation: {
    label: 'Isolation',
    description: '+Top player usage, -Team synergy',
    tip: 'Ride your best player - high risk/reward',
  },
};

export function CoachingDecisionsPage() {
  const navigate = useNavigate();
  const { draft, league, allPlayers, userId } = useApp();

  // Core state
  const [selectedRotation, setSelectedRotation] = useState<string[]>([]);
  const [rotationDepth, setRotationDepth] = useState<number>(CONSTRAINTS.ROTATION_DEFAULT);
  const [lineupStrategy, setLineupStrategy] = useState<LineupStrategy>('balanced');
  const [defensiveStrategy, setDefensiveStrategy] = useState<DefensiveStrategy>('standard');
  const [offensiveStrategy, setOffensiveStrategy] = useState<OffensiveStrategy>('balanced_attack');
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // V3: Scouting report state
  const [scoutingReport, setScoutingReport] = useState<ScoutingReport | null>(null);
  const [showScoutingReport, setShowScoutingReport] = useState(true);

  const myTeam = useMemo(() => {
    if (!draft || !userId) return null;
    return draft.teams.find(t => t.userId === userId);
  }, [draft, userId]);

  const myRoster = useMemo(() => {
    if (!myTeam || !allPlayers) return [];
    return myTeam.roster
      .map(pid => allPlayers.find(p => p.playerId === pid))
      .filter((p): p is Player => p !== undefined);
  }, [myTeam, allPlayers]);

  // Initialize rotation with top players by impact
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
      // Trim to new depth
      setSelectedRotation(prev => prev.slice(0, rotationDepth));
    } else if (selectedRotation.length < rotationDepth && myRoster.length > 0) {
      // Add more players if needed
      const currentIds = new Set(selectedRotation);
      const additionalPlayers = myRoster
        .filter(p => !currentIds.has(p.playerId))
        .sort((a, b) => b.impactRating - a.impactRating)
        .slice(0, rotationDepth - selectedRotation.length)
        .map(p => p.playerId);
      setSelectedRotation(prev => [...prev, ...additionalPlayers]);
    }
  }, [rotationDepth, myRoster]);

  // Listen for coaching window timer
  useEffect(() => {
    const unsubscribe = wsService.on('round:coaching_tick', (data: any) => {
      setTimeRemaining(data.payload.timeRemaining);
    });
    return unsubscribe;
  }, []);

  // V3: Listen for scouting report
  useEffect(() => {
    const unsubscribe = wsService.on('game:scouting_report', (data: any) => {
      setScoutingReport(data.payload.scoutingReport);
      setShowScoutingReport(true);
    });
    return unsubscribe;
  }, []);

  const handlePlayerToggle = (playerId: string) => {
    if (selectedRotation.includes(playerId)) {
      setSelectedRotation(selectedRotation.filter(id => id !== playerId));
    } else {
      if (selectedRotation.length < rotationDepth) {
        setSelectedRotation([...selectedRotation, playerId]);
      }
    }
  };

  // State for submission confirmation
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  const handleSubmit = async () => {
    if (!myTeam || !league?.currentRound) return;

    if (selectedRotation.length !== rotationDepth) {
      alert(`Please select exactly ${rotationDepth} players for your rotation`);
      return;
    }

    setSubmitStatus('submitting');

    const decision: CoachingDecision = {
      teamId: myTeam.teamId,
      roundNumber: league.currentRound,
      rotation: selectedRotation,
      rotationDepth,
      lineupStrategy,
      defensiveStrategy,
      offensiveStrategy,
      submittedAt: new Date().toISOString(),
    };

    try {
      wsService.emit('round:submit_coaching', { decision });

      // Simulate confirmation delay/listener (ideally listen for ACK)
      setSubmitStatus('success');
      setSubmitMessage('Strategy submitted successfully!');

      setTimeout(() => setSubmitStatus('idle'), 3000); // Clear after 3s
    } catch (err) {
      setSubmitStatus('error');
      setSubmitMessage('Failed to submit strategy. Please try again.');
    }
  };

  const isRotationComplete = selectedRotation.length === rotationDepth;
  const canSubmit = isRotationComplete && myTeam && league?.currentRound;

  if (!draft || !myTeam) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Determine max rotation depth from config
  const maxRotationDepth = useMemo(() => {
    // Try to get from lobby config or draft config
    const configRosterSize = (draft?.config?.rosterSize) || (league?.draftState?.config?.rosterSize) || CONSTRAINTS.ROSTER_MAX;
    return configRosterSize;
  }, [draft, league]);

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 overflow-hidden h-screen flex flex-col relative">
      {/* SUCCESS TOAST */}
      {submitStatus === 'success' && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-full shadow-lg z-[100] animate-bounce flex items-center gap-2">
          <span>✅</span>
          <span className="font-bold">{submitMessage}</span>
        </div>
      )}

      {/* ERROR TOAST */}
      {submitStatus === 'error' && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-full shadow-lg z-[100] flex items-center gap-2">
          <span>⚠️</span>
          <span className="font-bold">{submitMessage}</span>
        </div>
      )}

      <div className="max-w-[1920px] mx-auto w-full flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="mb-6 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Coaching Decisions</h1>
              <p className="text-gray-600 mt-1">
                Round {league?.currentRound || 1} - Set your rotation and strategies
              </p>
            </div>
            {timeRemaining !== null && (
              <div className={`text-2xl font-mono font-bold ${timeRemaining <= 30 ? 'text-red-600 animate-pulse' : 'text-gray-900'
                }`}>
                {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
              </div>
            )}
          </div>

          {/* Progress Indicator */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Rotation Selection
              </span>
              <span className={`text-sm font-bold ${isRotationComplete ? 'text-green-600' : 'text-orange-600'
                }`}>
                {selectedRotation.length} / {rotationDepth} selected
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${isRotationComplete ? 'bg-green-500' : 'bg-orange-500'
                  }`}
                style={{ width: `${Math.min(100, (selectedRotation.length / rotationDepth) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* V3: Scouting Report Modal */}
        {scoutingReport && showScoutingReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* ... Scouting report content remains same ... */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">📋 Scouting Report</h2>
                  <button
                    onClick={() => setShowScoutingReport(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="text-center mb-6">
                  <div className="text-lg font-semibold">
                    {scoutingReport.teamAName} vs {scoutingReport.teamBName}
                  </div>
                  <p className="text-sm text-gray-600 mt-2 italic">
                    {scoutingReport.styleClash}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6">
                  {/* Team A Analysis */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">{scoutingReport.teamAName}</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs font-medium text-green-700">Strengths:</span>
                        <ul className="text-xs text-gray-600 list-disc list-inside">
                          {scoutingReport.teamAStrengths.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-red-700">Weaknesses:</span>
                        <ul className="text-xs text-gray-600 list-disc list-inside">
                          {scoutingReport.teamAWeaknesses.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Team B Analysis */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">{scoutingReport.teamBName}</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs font-medium text-green-700">Strengths:</span>
                        <ul className="text-xs text-gray-600 list-disc list-inside">
                          {scoutingReport.teamBStrengths.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-red-700">Weaknesses:</span>
                        <ul className="text-xs text-gray-600 list-disc list-inside">
                          {scoutingReport.teamBWeaknesses.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button in Modal */}
                <div className="mt-6">
                  <Button variant="primary" fullWidth onClick={() => setShowScoutingReport(false)}>
                    Got it - Set My Strategy
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0">
          {/* LEFT PANEL: Rotation Selection (Flexible main area) */}
          <div className="lg:w-[65%] flex flex-col min-h-0 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-gray-900">
                Select Rotation ({rotationDepth} players)
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">Depth:</span>
                <input
                  type="range"
                  min={CONSTRAINTS.ROTATION_MIN}
                  max={maxRotationDepth}
                  value={rotationDepth}
                  onChange={(e) => setRotationDepth(Number(e.target.value))}
                  className="w-32 accent-blue-600 cursor-pointer"
                />
                <span className="text-sm font-bold text-primary-600 w-4">{rotationDepth}</span>
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-sm text-gray-500 mb-4">
                Select which players to include in your rotation. More players = deeper bench but less minutes for stars.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
            </div>
          </div>

          {/* RIGHT PANEL: Strategy Selection (Fixed, Scrollable) */}
          <div className="lg:w-[35%] flex flex-col gap-4 overflow-y-auto pr-2 pb-4">
            {/* View Scouting Report Button */}
            {scoutingReport && (
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setShowScoutingReport(true)}
              >
                📋 View Scouting Report
              </Button>
            )}

            {/* Lineup Strategy */}
            <Card>
              <h3 className="font-bold text-gray-900 mb-3">Lineup Strategy</h3>
              <div className="space-y-2">
                {(Object.keys(LINEUP_STRATEGY_INFO) as LineupStrategy[]).map(strategy => {
                  const info = LINEUP_STRATEGY_INFO[strategy];
                  return (
                    <label
                      key={strategy}
                      className={`flex items-start p-3 rounded-lg cursor-pointer border-2 transition-all ${lineupStrategy === strategy
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <input
                        type="radio"
                        name="lineup"
                        value={strategy}
                        checked={lineupStrategy === strategy}
                        onChange={() => setLineupStrategy(strategy)}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{info.label}</div>
                        <div className="text-xs text-gray-500">{info.description}</div>
                        <div className="text-xs text-blue-600 mt-1 italic">{info.tip}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </Card>

            {/* Defensive Strategy */}
            <Card>
              <h3 className="font-bold text-gray-900 mb-3">Defensive Strategy</h3>
              <div className="space-y-2">
                {(Object.keys(DEFENSIVE_STRATEGY_INFO) as DefensiveStrategy[]).map(strategy => {
                  const info = DEFENSIVE_STRATEGY_INFO[strategy];
                  return (
                    <label
                      key={strategy}
                      className={`flex items-start p-3 rounded-lg cursor-pointer border-2 transition-all ${defensiveStrategy === strategy
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <input
                        type="radio"
                        name="defense"
                        value={strategy}
                        checked={defensiveStrategy === strategy}
                        onChange={() => setDefensiveStrategy(strategy)}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{info.label}</div>
                        <div className="text-xs text-gray-500">{info.description}</div>
                        <div className="text-xs text-blue-600 mt-1 italic">{info.tip}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </Card>

            {/* Offensive Strategy */}
            <Card>
              <h3 className="font-bold text-gray-900 mb-3">Offensive Strategy</h3>
              <div className="space-y-2">
                {(Object.keys(OFFENSIVE_STRATEGY_INFO) as OffensiveStrategy[]).map(strategy => {
                  const info = OFFENSIVE_STRATEGY_INFO[strategy];
                  return (
                    <label
                      key={strategy}
                      className={`flex items-start p-3 rounded-lg cursor-pointer border-2 transition-all ${offensiveStrategy === strategy
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <input
                        type="radio"
                        name="offense"
                        value={strategy}
                        checked={offensiveStrategy === strategy}
                        onChange={() => setOffensiveStrategy(strategy)}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{info.label}</div>
                        <div className="text-xs text-gray-500">{info.description}</div>
                        <div className="text-xs text-blue-600 mt-1 italic">{info.tip}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </Card>

            {/* Submit Button */}
            <div className="sticky bottom-0 bg-gray-100 pt-2 pb-1">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleSubmit}
                disabled={!canSubmit || submitStatus === 'submitting'}
                className="shadow-lg"
              >
                {submitStatus === 'submitting' ? 'Submitting...' :
                  isRotationComplete
                    ? 'Submit Decisions'
                    : `Select ${rotationDepth - selectedRotation.length} More Player${rotationDepth - selectedRotation.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}