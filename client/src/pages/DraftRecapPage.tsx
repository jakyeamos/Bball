/**
 * Draft Recap Page - COMPLETE REDESIGN
 * Beautiful layout with:
 * - Proper card styling
 * - Team composition working
 * - Per-game stats displayed nicely
 * - Professional appearance
 */

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { wsService } from '../services/websocket';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import {
  calculateTeamComposition,
  getCompositionStatus,
  getStatusColor,
  getCompositionMessage,
  getTopArchetypes,
  getArchetypeColor,
  formatArchetypeName,
} from '../archetypes';

export function DraftRecapPage() {
  const navigate = useNavigate();
  const { draft, league, allPlayers, lobby } = useApp();
  const [startingTrade, setStartingTrade] = useState(false);
  const [startingSeason, setStartingSeason] = useState(false);
  const tradeClickedRef = useRef(false);
  const seasonClickedRef = useRef(false);

  React.useEffect(() => {
    if (!draft || !league) {
      navigate('/');
    }
  }, [draft, league, navigate]);

  React.useEffect(() => {
    if (league?.phase === 'regular_season' || league?.phase === 'trade_window') {
      navigate('/results');
    }
  }, [league, navigate]);

  if (!draft || !league) return null;

  const isCommissioner = lobby?.users?.some(u => u.isCommissioner) || false;

  const handleStartSeason = () => {
    if (seasonClickedRef.current || startingSeason) return;
    seasonClickedRef.current = true;
    setStartingSeason(true);
    wsService.startRegularSeason();
  };

  const handleStartTradeWindow = () => {
    if (tradeClickedRef.current || startingTrade) return;
    if (league.phase !== 'draft_recap') {
      alert('Trade window can only be started after draft recap');
      return;
    }
    tradeClickedRef.current = true;
    setStartingTrade(true);
    wsService.startTradeWindow();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-3">🏀 Draft Complete!</h1>
          <p className="text-lg text-gray-600">Review your rosters and prepare for the season</p>
        </div>

        {/* Commissioner Controls */}
        {isCommissioner && league.phase === 'draft_recap' && (
          <Card className="mb-8" padding="lg">
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Ready to Begin?</h3>
              <div className="flex items-center justify-center gap-6">
                <Button 
                  onClick={handleStartSeason} 
                  variant="primary" 
                  size="lg"
                  disabled={startingTrade || startingSeason}
                >
                  {startingSeason ? '⏳ Starting...' : '▶️ Start Season'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Non-commissioner waiting message */}
        {!isCommissioner && league.phase === 'draft_recap' && (
          <Card className="mb-8" padding="md">
            <p className="text-center text-gray-600 text-lg">
              ⏳ Waiting for commissioner to start the season...
            </p>
          </Card>
        )}

        {/* Team Rosters */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {draft.teams.map((team) => {
            const roster = team.roster
              .map((pid) => allPlayers.find((p) => p.playerId === pid))
              .filter((p) => p !== undefined);

            const composition = calculateTeamComposition(roster);
            const creatorStatus = getCompositionStatus(composition.creators, 'creators');
            const shootingStatus = getCompositionStatus(composition.shooting, 'shooting');
            const rimProtStatus = getCompositionStatus(composition.rimProtection, 'rimProtection');

            return (
              <Card key={team.teamId} padding="none" className="overflow-hidden hover:shadow-xl transition-shadow">
                {/* Team Header */}
                <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
                  <h3 className="text-2xl font-bold text-white">
                    {team.displayName}
                  </h3>
                  <p className="text-primary-100 text-sm mt-1">
                    {roster.length} Players
                  </p>
                </div>

                {/* Team Composition */}
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <h4 className="text-sm font-bold text-gray-700 mb-3">📊 Team Analysis</h4>

                  {/* Ball Handlers */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600">Ball Handlers</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getStatusColor(creatorStatus)}`}>
                        {composition.creators.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          creatorStatus === 'danger' ? 'bg-red-500' :
                          creatorStatus === 'warning' ? 'bg-orange-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(composition.creators, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Shooting */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600">Shooting/Spacing</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getStatusColor(shootingStatus)}`}>
                        {composition.shooting.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          shootingStatus === 'good' ? 'bg-green-500' :
                          shootingStatus === 'warning' ? 'bg-orange-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(composition.shooting * 2, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Rim Protection */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600">Rim Protection</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getStatusColor(rimProtStatus)}`}>
                        {composition.rimProtection.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          rimProtStatus === 'good' ? 'bg-green-500' :
                          rimProtStatus === 'warning' ? 'bg-orange-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(composition.rimProtection * 5, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Player List */}
                <div className="p-4 max-h-96 overflow-y-auto">
                  <div className="space-y-2">
                    {roster.map((player, idx) => {
                      const ppg = player.rawStats.PTS / player.rawStats.GP;
                      const rpg = player.rawStats.REB / player.rawStats.GP;
                      const apg = player.rawStats.AST / player.rawStats.GP;
                      const topArch = getTopArchetypes(player.archetypes, 1)[0];

                      return (
                        <div
                          key={player.playerId}
                          className="p-3 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              {/* Player Number and Name */}
                              <div className="flex items-center gap-2 mb-1">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
                                  {idx + 1}
                                </span>
                                <span className="font-bold text-sm text-gray-900 truncate">
                                  {player.name}
                                </span>
                              </div>
                              
                              {/* Position and Team */}
                              <div className="text-xs text-gray-500 ml-8">
                                {player.position} • {player.team}
                              </div>
                              
                              {/* Top Archetype */}
                              {topArch && (
                                <div className="ml-8 mt-2">
                                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border ${getArchetypeColor(topArch.name)}`}>
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
                                {rpg.toFixed(1)} RPG
                              </div>
                              <div className="text-xs text-gray-600">
                                {apg.toFixed(1)} APG
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}