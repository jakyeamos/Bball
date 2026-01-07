/**
 * Draft Recap Page
 * Shows rosters after draft completes
 */

import React from 'react';
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
} from '../archetypes';

export function DraftRecapPage() {
  const navigate = useNavigate();
  const { draft, league, allPlayers } = useApp();

  React.useEffect(() => {
    if (!draft || !league) {
      navigate('/');
    }
  }, [draft, league, navigate]);

  React.useEffect(() => {
    if (league?.phase === 'regular_season') {
      navigate('/results');
    }
  }, [league, navigate]);

  if (!draft || !league) return null;

  const handleStartSeason = () => {
    wsService.startRegularSeason();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Draft Complete!</h1>
          <p className="text-gray-600">Here are your rosters</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {draft.teams.map((team) => {
            const roster = team.roster
              .map((pid) => allPlayers.find((p) => p.playerId === pid))
              .filter((p) => p !== undefined);

            const composition = calculateTeamComposition(roster);
            const creatorStatus = getCompositionStatus(composition.creators, 'creators');
            const shootingStatus = getCompositionStatus(composition.shooting, 'shooting');
            const rimProtStatus = getCompositionStatus(composition.rimProtection, 'rimProtection');

            return (
              <Card key={team.teamId} padding="md">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {team.displayName}
                </h3>

                {/* Team Composition */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-bold text-gray-700 mb-3">Team Composition</h4>

                  {/* Creators */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600">Ball Handlers</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getStatusColor(creatorStatus)}`}>
                        {composition.creators.toFixed(1)}%
                        {composition.hasCreatorPenalty && ' ⚠️'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          creatorStatus === 'danger' ? 'bg-red-500' :
                          creatorStatus === 'warning' ? 'bg-orange-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(composition.creators, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {getCompositionMessage('creators', composition.creators, composition.hasCreatorPenalty, false)}
                    </p>
                  </div>

                  {/* Shooting */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600">Shooting/Spacing</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getStatusColor(shootingStatus)}`}>
                        {composition.shooting.toFixed(1)}%
                        {composition.hasShootingBonus && ' ✨'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          shootingStatus === 'good' ? 'bg-green-500' :
                          shootingStatus === 'warning' ? 'bg-orange-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(composition.shooting * 2, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {getCompositionMessage('shooting', composition.shooting, false, composition.hasShootingBonus)}
                    </p>
                  </div>

                  {/* Rim Protection */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600">Rim Protection</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getStatusColor(rimProtStatus)}`}>
                        {composition.rimProtection.toFixed(1)}%
                        {composition.hasRimProtectionPenalty && ' ⚠️'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          rimProtStatus === 'good' ? 'bg-green-500' :
                          rimProtStatus === 'warning' ? 'bg-orange-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(composition.rimProtection * 5, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {getCompositionMessage('rimProtection', composition.rimProtection, composition.hasRimProtectionPenalty, false)}
                    </p>
                  </div>
                </div>

                {/* Player List */}
                <div className="space-y-2">
                  {roster.map((player) => (
                    <div
                      key={player.playerId}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <div>
                        <div className="font-medium text-gray-900">{player.name}</div>
                        <div className="text-sm text-gray-600">
                          {player.position} - {player.team}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {player.rawStats.PTS.toFixed(1)} PTS
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>

        <div className="text-center">
          <Button size="lg" onClick={handleStartSeason}>
            Start Regular Season
          </Button>
        </div>
      </div>
    </div>
  );
}
