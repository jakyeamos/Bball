/**
 * Waiting Room Page
 * Users wait here for lobby to fill, then commissioner starts draft
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { wsService } from '../services/websocket';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { RouteStateNotice } from '../components/RouteStateNotice';

export function WaitingRoomPage() {
  const navigate = useNavigate();
  const { lobby, draft } = useApp();

  // Redirect when draft starts
  React.useEffect(() => {
    if (draft) {
      navigate('/draft');
    }
  }, [draft, navigate]);

  // Calculate season details
  const seasonDetails = React.useMemo(() => {
    if (!lobby?.config) {
      return { format: 'N/A', matchups: 0, runtime: 'N/A' };
    }

    const { teamCount, seasonFormat } = lobby.config;
    const n = teamCount;
    let matchups = 0;
    let formatText = '';

    switch (seasonFormat) {
      case 'single_round_robin':
        matchups = (n * (n - 1)) / 2;
        formatText = 'Single Round Robin';
        break;
      case 'double_round_robin':
        matchups = n * (n - 1);
        formatText = 'Double Round Robin';
        break;
      case 'quick_sim':
        matchups = (n * (n - 1)) / 2;
        formatText = 'Playoffs Only';
        break;
      default:
        // Fallback for older lobby configs
        matchups = n * (n - 1);
        formatText = 'Double Round Robin';
        break;
    }

    return { format: formatText, matchups };
  }, [lobby?.config]);

  if (!lobby) {
    return (
      <RouteStateNotice
        eyebrow="Waiting room unavailable"
        title="Join a lobby before waiting for the draft"
        description="The waiting room needs lobby state from a created or joined room. Start from the Draft Sim entry page to create a lobby, browse public lobbies, or join with an invite code."
        actions={[
          { label: 'Go to Draft Sim', to: '/draft-sim' },
          { label: 'Create or join a lobby', to: '/lobby', variant: 'secondary' },
        ]}
      />
    );
  }

  // Safe access with optional chaining
  const isCommissioner = lobby?.users?.some(
    (u) => u.isCommissioner && u.isConnected
  ) || false;

  const handleStartDraft = () => {
    wsService.startDraft();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 p-8">
      <div className="max-w-4xl mx-auto">
        <Card padding="lg">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Waiting Room
            </h1>
            <p className="text-gray-600">
              Invite friends to join with code:
            </p>
            <div className="mt-4 inline-block bg-primary-100 px-8 py-4 rounded-lg">
              <span className="text-4xl font-bold text-primary-600 tracking-wider">
                {lobby.inviteCode}
              </span>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Players ({lobby.users?.length || 0}/{lobby.config?.teamCount || 0})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(lobby.users || []).map((user) => (
                <div
                  key={user.userId}
                  className={`
                    p-4 rounded-lg border-2
                    ${user.isConnected ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {user.teamId && (
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                          {user.teamId.replace('team_', 'Team ')}
                        </div>
                      )}
                      <div className="font-medium text-gray-900">
                        {user.displayName}
                        {user.isCommissioner && (
                          <span className="ml-2 text-xs bg-primary-600 text-white px-2 py-1 rounded">
                            (Commissioner)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${user.isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                  </div>
                </div>
              ))}

              {/* Empty slots */}
              {Array.from({ length: (lobby.config?.teamCount || 0) - (lobby.users?.length || 0) }).map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="p-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50"
                >
                  <div className="text-gray-400 text-center">
                    Waiting for player...
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="font-bold text-gray-900 mb-2">League Settings</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                 <div className="text-sm text-gray-600"><strong>Teams</strong></div>
                <div className="text-2xl font-bold text-primary-600">
                  {lobby.config?.teamCount || 0}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600"><strong>Roster Size</strong></div>
                <div className="text-2xl font-bold text-primary-600">
                  {lobby.config?.rosterSize || 0}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600"><strong>Pick Timer</strong></div>
                <div className="text-2xl font-bold text-primary-600">
                  {(lobby.config?.pickTimer || 0) / 60}m
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 mt-6 pt-6">
            <h3 className="font-bold text-gray-900 mb-2">Season Details</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
                <div className="text-sm text-gray-600"><strong>Format</strong></div>
                <div className="text-lg font-bold text-primary-600 truncate px-2">
                  {seasonDetails.format}
                </div>
              <div>
                <div className="text-sm text-gray-600"><strong>Total Games</strong></div>
                <div className="text-2xl font-bold text-primary-600">
                  {seasonDetails.matchups}
                </div>
              </div>
              <div>
              </div>
            </div>
          </div>

          {isCommissioner && lobby.canStart && (
            <div className="mt-8">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleStartDraft}
              >
                Start Draft
              </Button>
            </div>
          )}

          {!lobby.canStart && (
            <div className="mt-8 text-center text-gray-600">
              Waiting for {(lobby.config?.teamCount || 0) - (lobby.users?.length || 0)} more player(s)...
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}