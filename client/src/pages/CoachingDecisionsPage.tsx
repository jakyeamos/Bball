/**
 * Coaching Decisions Page - Phase 2
 * Allow users to set rotation and strategies for each round
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
} from '@nba-draft-sim/shared';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { getTopArchetypes, formatArchetypeName, getArchetypeColor } from '../archetypes';

export function CoachingDecisionsPage() {
  const navigate = useNavigate();
  const { draft, league, allPlayers, userId } = useApp();

  const [selectedRotation, setSelectedRotation] = useState<string[]>([]);
  const [lineupStrategy, setLineupStrategy] = useState<LineupStrategy>('balanced');
  const [defensiveStrategy, setDefensiveStrategy] = useState<DefensiveStrategy>('standard');
  const [offensiveStrategy, setOffensiveStrategy] = useState<OffensiveStrategy>('balanced_attack');
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

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

  const rotationDepth = 8;

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

  // Listen for coaching window timer
  useEffect(() => {
    const unsubscribe = wsService.on('round:coaching_tick', (data: any) => {
      setTimeRemaining(data.payload.timeRemaining);
    });
    return unsubscribe;
  }, []);

  const handlePlayerToggle = (playerId: string) => {
    if (selectedRotation.includes(playerId)) {
      // Remove if already selected
      setSelectedRotation(selectedRotation.filter(id => id !== playerId));
    } else {
      // Add if under limit
      if (selectedRotation.length < rotationDepth) {
        setSelectedRotation([...selectedRotation, playerId]);
      }
    }
  };

  const handleSubmit = () => {
    if (!myTeam || !league?.currentRound) return;

    if (selectedRotation.length !== rotationDepth) {
      alert(`Please select exactly ${rotationDepth} players for your rotation`);
      return;
    }

    const decision: CoachingDecision = {
      teamId: myTeam.teamId,
      roundNumber: league.currentRound,
      rotation: selectedRotation,
      lineupStrategy,
      defensiveStrategy,
      offensiveStrategy,
      submittedAt: new Date().toISOString(),
    };

    wsService.emit('round:submit_coaching', decision);
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

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Coaching Decisions</h1>
              <p className="text-gray-600 mt-1">
                Round {league?.currentRound || 1} - Set your rotation and strategies
              </p>
            </div>
            {timeRemaining !== null && (
              <div className={`text-2xl font-mono font-bold ${
                timeRemaining <= 30 ? 'text-red-600 animate-pulse' : 'text-gray-900'
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
              <span className={`text-sm font-bold ${
                isRotationComplete ? 'text-green-600' : 'text-orange-600'
              }`}>
                {selectedRotation.length} / {rotationDepth} selected
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  isRotationComplete ? 'bg-green-600' : 'bg-primary-600'
                }`}
                style={{ width: `${(selectedRotation.length / rotationDepth) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Roster Selection */}
          <div className="lg:col-span-2">
            <Card padding="lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Select Rotation ({rotationDepth} players)
              </h2>

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {myRoster.map((player, index) => {
                  const isSelected = selectedRotation.includes(player.playerId);
                  const selectionOrder = selectedRotation.indexOf(player.playerId) + 1;
                  const topArch = getTopArchetypes(player.archetypes, 1)[0];
                  const ppg = player.rawStats.PTS / player.rawStats.GP;

                  return (
                    <div
                      key={player.playerId}
                      onClick={() => handlePlayerToggle(player.playerId)}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-primary-50 border-primary-500 shadow-md'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Selection Order Badge */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                            isSelected
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-200 text-gray-400'
                          }`}>
                            {isSelected ? selectionOrder : '—'}
                          </div>

                          {/* Player Info */}
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-gray-900 truncate">
                              {player.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {player.position} • {player.team}
                            </div>
                            {topArch && (
                              <div className="mt-1">
                                <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-md border ${
                                  getArchetypeColor(topArch.name)
                                }`}>
                                  {formatArchetypeName(topArch.name)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Stats */}
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-bold text-primary-600">
                              {ppg.toFixed(1)} PPG
                            </div>
                            <div className="text-xs text-gray-600">
                              Impact: {player.impactRating.toFixed(1)}
                            </div>
                          </div>
                        </div>

                        {/* Checkbox */}
                        <div className="ml-3 flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Right Column: Strategy Selection */}
          <div className="space-y-6">
            {/* Lineup Strategy */}
            <Card padding="lg">
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                Lineup Strategy
              </h3>
              <select
                value={lineupStrategy}
                onChange={(e) => setLineupStrategy(e.target.value as LineupStrategy)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 mb-2"
              >
                <option value="balanced">Balanced (Neutral)</option>
                <option value="small_ball">Small Ball (+Pace, +Shooting)</option>
                <option value="big_lineup">Big Lineup (+Rebounding, +Defense)</option>
                <option value="offense_first">Offense First (+Offense)</option>
                <option value="defense_first">Defense First (+Defense)</option>
              </select>
              <p className="text-xs text-gray-500">
                {lineupStrategy === 'balanced' && 'No modifiers applied'}
                {lineupStrategy === 'small_ball' && '+4% pace, +3% shooting, -2% rebounding'}
                {lineupStrategy === 'big_lineup' && '-3% pace, +4% rebounding, +2% defense'}
                {lineupStrategy === 'offense_first' && '+5% offense, -3% defense'}
                {lineupStrategy === 'defense_first' && '+5% defense, -3% offense'}
              </p>
            </Card>

            {/* Defensive Strategy */}
            <Card padding="lg">
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                Defensive Strategy
              </h3>
              <select
                value={defensiveStrategy}
                onChange={(e) => setDefensiveStrategy(e.target.value as DefensiveStrategy)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 mb-2"
              >
                <option value="standard">Standard (Neutral)</option>
                <option value="switch_everything">Switch Everything</option>
                <option value="protect_paint">Protect the Paint</option>
                <option value="pressure_ball">Pressure Ball</option>
                <option value="pack_paint">Pack the Paint</option>
              </select>
              <p className="text-xs text-gray-500">
                {defensiveStrategy === 'standard' && 'No modifiers applied'}
                {defensiveStrategy === 'switch_everything' && '+3% versatility, -2% size mismatches'}
                {defensiveStrategy === 'protect_paint' && '+4% rim protection, -2% perimeter'}
                {defensiveStrategy === 'pressure_ball' && '+3% steals, +2% turnovers forced'}
                {defensiveStrategy === 'pack_paint' && '+5% rim protection, -3% three-point defense'}
              </p>
            </Card>

            {/* Offensive Strategy */}
            <Card padding="lg">
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                Offensive Strategy
              </h3>
              <select
                value={offensiveStrategy}
                onChange={(e) => setOffensiveStrategy(e.target.value as OffensiveStrategy)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 mb-2"
              >
                <option value="balanced_attack">Balanced Attack (Neutral)</option>
                <option value="pace_and_space">Pace & Space</option>
                <option value="inside_out">Inside-Out</option>
                <option value="motion_offense">Motion Offense</option>
                <option value="isolation">Isolation</option>
              </select>
              <p className="text-xs text-gray-500">
                {offensiveStrategy === 'balanced_attack' && 'No modifiers applied'}
                {offensiveStrategy === 'pace_and_space' && '+5% 3PA rate, +3% pace'}
                {offensiveStrategy === 'inside_out' && '+4% paint scoring, +3% FT rate'}
                {offensiveStrategy === 'motion_offense' && '+4% assists, +3% ball movement'}
                {offensiveStrategy === 'isolation' && '+5% top player usage, -3% team synergy'}
              </p>
            </Card>

            {/* Submit Button */}
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {isRotationComplete ? 'Submit Decisions' : `Select ${rotationDepth - selectedRotation.length} More Player${rotationDepth - selectedRotation.length !== 1 ? 's' : ''}`}
            </Button>

            {timeRemaining !== null && timeRemaining <= 30 && (
              <div className="text-center text-sm text-red-600 font-medium">
                ⚠️ Decisions will auto-submit in {timeRemaining}s
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
