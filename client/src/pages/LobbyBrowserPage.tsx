/**
 * Lobby Browser Page - Phase 1A
 * Browse and join public lobbies
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicLobbyInfo } from '@nba-draft-sim/shared';
import { wsService } from '../services/websocket';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function LobbyBrowserPage() {
  const navigate = useNavigate();
  const [lobbies, setLobbies] = useState<PublicLobbyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [displayName, setDisplayName] = useState('');
  const [selectedLobby, setSelectedLobby] = useState<string | null>(null);

  // Fetch public lobbies
  const fetchLobbies = async () => {
    try {
      const response = await fetch(`${API_URL}/api/lobbies`);
      const data = await response.json();
      setLobbies(data.lobbies || []);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load lobbies');
      setLoading(false);
    }
  };

  // Auto-refresh every 5 seconds
  useEffect(() => {
    fetchLobbies();
    const interval = setInterval(fetchLobbies, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleJoinLobby = (inviteCode: string) => {
    if (!displayName.trim()) {
      setError('Please enter a team name');
      return;
    }

    try {
      wsService.joinLobby(inviteCode, displayName);
      navigate('/waiting-room');
    } catch (err: any) {
      setError(err.message || 'Failed to join lobby');
    }
  };

  const getSeasonFormatLabel = (format: string) => {
    switch (format) {
      case 'double_round_robin': return 'Double Round Robin';
      case 'single_round_robin': return 'Single Round Robin';
      case 'playoffs_only': return 'Playoffs Only';
      default: return format;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Public Lobbies</h1>
            <p className="text-gray-600">Join an existing league or create your own</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => navigate('/')}
          >
            ← Back
          </Button>
        </div>

        {/* Team Name Input */}
        <Card className="mb-6" padding="lg">
          <Input
            label="Your Team Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your team name to join lobbies"
            fullWidth
            required
          />
        </Card>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
            <button
              onClick={() => setError('')}
              className="ml-4 text-sm underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <Card padding="lg" className="text-center">
            <div className="animate-pulse text-gray-500">Loading lobbies...</div>
          </Card>
        )}

        {/* Empty State */}
        {!loading && lobbies.length === 0 && (
          <Card padding="lg" className="text-center">
            <div className="py-12">
              <div className="text-6xl mb-4">🏀</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                No Public Lobbies Available
              </h3>
              <p className="text-gray-600 mb-6">
                Be the first to create a public lobby!
              </p>
              <Button
                variant="primary"
                onClick={() => navigate('/')}
              >
                Create Lobby
              </Button>
            </div>
          </Card>
        )}

        {/* Lobby Grid */}
        {!loading && lobbies.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lobbies.map((lobby) => (
              <Card
                key={lobby.lobbyId}
                padding="lg"
                className={`hover:shadow-xl transition-shadow cursor-pointer border-2 ${
                  selectedLobby === lobby.lobbyId
                    ? 'border-primary-500'
                    : 'border-transparent'
                }`}
                onClick={() => setSelectedLobby(lobby.lobbyId)}
              >
                {/* Lobby Header */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-gray-900 truncate">
                      {lobby.commissionerName}'s League
                    </h3>
                    <div className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                      Open
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    Code: <span className="font-mono font-bold">{lobby.inviteCode}</span>
                  </div>
                </div>

                {/* Player Count */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Players</span>
                    <span className="font-bold text-gray-900">
                      {lobby.currentPlayers} / {lobby.teamCount}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${(lobby.currentPlayers / lobby.teamCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Settings */}
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex justify-between">
                    <span>Roster Size</span>
                    <span className="font-medium text-gray-900">{lobby.config.rosterSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pick Timer</span>
                    <span className="font-medium text-gray-900">
                      {lobby.config.pickTimer / 60}m
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Format</span>
                    <span className="font-medium text-gray-900">
                      {getSeasonFormatLabel(lobby.config.seasonFormat)}
                    </span>
                  </div>
                </div>

                {/* Join Button */}
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={(e) => {
                    e.stopPropagation();
                    handleJoinLobby(lobby.inviteCode);
                  }}
                  disabled={!displayName.trim()}
                >
                  Join League
                </Button>
              </Card>
            ))}
          </div>
        )}

        {/* Refresh Info */}
        {!loading && lobbies.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-500">
            Auto-refreshing every 5 seconds • {lobbies.length} lobby{lobbies.length !== 1 ? 's' : ''} available
          </div>
        )}
      </div>
    </div>
  );
}
