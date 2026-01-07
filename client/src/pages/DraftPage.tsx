/**
 * Draft Page
 * Main draft interface with player board and pick timer
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { wsService } from '../services/websocket';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { getTopArchetypes, getArchetypeColor, formatArchetypeName } from '../archetypes';

export function DraftPage() {
  const navigate = useNavigate();
  const { draft, allPlayers, timeRemaining, league } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  // Redirect if no draft
  React.useEffect(() => {
    if (!draft) {
      navigate('/');
    }
  }, [draft, navigate]);

  // Redirect when draft completes
  React.useEffect(() => {
    if (draft?.status === 'completed' && league?.phase === 'draft_recap') {
      navigate('/draft-recap');
    }
  }, [draft, league, navigate]);

  // Get available players
  const availablePlayers = useMemo(() => {
    if (!draft || !allPlayers) return [];

    const available = allPlayers.filter((p) =>
      draft.availablePlayers.includes(p.playerId)
    );

    // Filter by search
    if (searchTerm) {
      return available.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.team.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return available;
  }, [draft, allPlayers, searchTerm]);

  // Get current pick info
  const currentPick = useMemo(() => {
    if (!draft) return null;
    return draft.draftOrder[draft.currentPickIndex];
  }, [draft]);

  const currentTeam = useMemo(() => {
    if (!draft || !currentPick) return null;
    return draft.teams.find((t) => t.teamId === currentPick.teamId);
  }, [draft, currentPick]);

  const isMyPick = useMemo(() => {
    // In a real app, you'd track userId
    // For now, just check if it's your team
    return currentTeam !== null;
  }, [currentTeam]);

  const handleMakePick = (playerId: string) => {
    wsService.makePick(playerId);
  };

  if (!draft) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Card className="mb-4" padding="md">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">NBA Draft</h1>
              <p className="text-gray-600">
                Pick {currentPick?.pickNumber || '?'} of {draft.draftOrder.length} - Round {currentPick?.round || '?'}
              </p>
            </div>

            {draft.status === 'active' && timeRemaining !== null && (
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600">
                  {formatTime(timeRemaining)}
                </div>
                <div className="text-sm text-gray-600">Time Remaining</div>
              </div>
            )}

            {draft.status === 'paused' && (
              <div className="text-orange-600 font-bold">
                PAUSED
              </div>
            )}
          </div>

          {currentTeam && (
            <div className="mt-4 p-4 bg-primary-50 rounded-lg">
              <div className="text-lg font-bold text-primary-900">
                On the Clock: {currentTeam.displayName}
              </div>
              {isMyPick && (
                <div className="text-sm text-primary-700 mt-1">
                  It's your pick! Select a player below.
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Search and Player Board */}
        <Card padding="md">
          <Input
            placeholder="Search players by name, position, or team..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth
            className="mb-4"
          />

          <div className="overflow-auto max-h-[600px]">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Player</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pos</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Archetypes</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">PTS</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">REB</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">AST</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">TS%</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {availablePlayers.map((player) => {
                  const topArchetypes = getTopArchetypes(player.archetypes, 3);

                  return (
                    <tr key={player.playerId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{player.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{player.position}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{player.team}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {topArchetypes.map((arch) => (
                            <span
                              key={arch.name}
                              className={`inline-block px-2 py-0.5 text-xs rounded border ${getArchetypeColor(arch.name)}`}
                              title={`${formatArchetypeName(arch.name)}: ${arch.percentage.toFixed(1)}%`}
                            >
                              {formatArchetypeName(arch.name)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">{player.rawStats.PTS.toFixed(1)}</td>
                      <td className="px-4 py-3 text-sm text-right">{player.rawStats.REB.toFixed(1)}</td>
                      <td className="px-4 py-3 text-sm text-right">{player.rawStats.AST.toFixed(1)}</td>
                      <td className="px-4 py-3 text-sm text-right">{(player.rawStats.TS_PCT * 100).toFixed(1)}%</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          onClick={() => handleMakePick(player.playerId)}
                          disabled={!isMyPick || draft.status !== 'active'}
                        >
                          Pick
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {availablePlayers.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No players found
              </div>
            )}
          </div>
        </Card>

        {/* Recent Picks */}
        {draft.picks.length > 0 && (
          <Card className="mt-4" padding="md">
            <h3 className="font-bold text-gray-900 mb-4">Recent Picks</h3>
            <div className="space-y-2">
              {draft.picks.slice(-5).reverse().map((pick) => {
                const player = allPlayers.find((p) => p.playerId === pick.playerId);
                const team = draft.teams.find((t) => t.teamId === pick.teamId);

                return (
                  <div key={pick.pickNumber} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-gray-600">
                        #{pick.pickNumber}
                      </span>
                      <span className="font-medium text-gray-900">
                        {player?.name || 'Unknown'}
                      </span>
                      <span className="text-sm text-gray-600">
                        {player?.position} - {player?.team}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {team?.displayName}
                      {pick.isAutoPick && (
                        <span className="ml-2 text-xs text-orange-600">(Auto)</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
