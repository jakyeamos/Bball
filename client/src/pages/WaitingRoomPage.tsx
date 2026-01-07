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

export function WaitingRoomPage() {
  const navigate = useNavigate();
  const { lobby, draft, league } = useApp();

  // Redirect when draft starts
  React.useEffect(() => {
    if (draft) {
      navigate('/draft');
    }
  }, [draft, navigate]);

  // Redirect if no lobby
  React.useEffect(() => {
    if (!lobby) {
      navigate('/');
    }
  }, [lobby, navigate]);

  if (!lobby) return null;

  const isCommissioner = lobby.users.some(
    (u) => u.isCommissioner && u.isConnected
  );

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
              Players ({lobby.users.length}/{lobby.config.teamCount})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lobby.users.map((user, index) => (
                <div
                  key={user.userId}
                  className={`
                    p-4 rounded-lg border-2
                    ${user.isConnected ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">
                        {user.displayName}
                        {user.isCommissioner && (
                          <span className="ml-2 text-xs bg-primary-600 text-white px-2 py-1 rounded">
                            Commissioner
                          </span>
                        )}
                      </div>
                      {user.teamId && (
                        <div className="text-sm text-gray-600">
                          {user.teamId}
                        </div>
                      )}
                    </div>
                    <div className={`w-3 h-3 rounded-full ${user.isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                  </div>
                </div>
              ))}

              {/* Empty slots */}
              {Array.from({ length: lobby.config.teamCount - lobby.users.length }).map((_, index) => (
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
                <div className="text-2xl font-bold text-primary-600">
                  {lobby.config.teamCount}
                </div>
                <div className="text-sm text-gray-600">Teams</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary-600">
                  {lobby.config.rosterSize}
                </div>
                <div className="text-sm text-gray-600">Roster Size</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary-600">
                  {lobby.config.pickTimer / 60}m
                </div>
                <div className="text-sm text-gray-600">Pick Timer</div>
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
              Waiting for {lobby.config.teamCount - lobby.users.length} more player(s)...
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
