/**
 * Lobby Page - FIXED VERSION
 * Entry point - create or join a lobby
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LobbyConfig } from '@nba-draft-sim/shared';
import { DRAFT_CONSTRAINTS } from '@nba-draft-sim/shared';
import { wsService } from '../services/websocket';
import { useApp } from '../context/AppContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { WS_EVENTS } from '@nba-draft-sim/shared';
console.log('Client WS_EVENTS.CREATE_LOBBY:', WS_EVENTS.CREATE_LOBBY);

export function LobbyPage() {
  const navigate = useNavigate();
  const { lobby, isConnected } = useApp(); // ← Get connection status

  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string>(''); // ← Add local error state

  // Create lobby form
  const [teamCount, setTeamCount] = useState(6);
  const [rosterSize, setRosterSize] = useState(12);
  const [pickTimer, setPickTimer] = useState<60 | 120 | 300>(120);

  // Join lobby form
  const [inviteCode, setInviteCode] = useState('');

  // Redirect when lobby is created/joined
  React.useEffect(() => {
    if (lobby) {
      navigate('/waiting-room');
    }
  }, [lobby, navigate]);

  const handleCreateLobby = (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // Clear previous errors

    console.log('🔵 Create Lobby button clicked');
    console.log('🔵 isConnected:', isConnected);

    // Check if connected
    if (!isConnected) {
      setError('Not connected to server. Please wait and try again.');
      console.error('🔴 Socket not connected!');
      return;
    }

    try {
      const config: LobbyConfig = {
        teamCount,
        rosterSize,
        pickTimer,
      };

      console.log('🔵 Calling createLobby with config:', config);
      wsService.createLobby(config);
      console.log('🔵 createLobby called successfully');
    } catch (err: any) {
      console.error('🔴 Error creating lobby:', err);
      setError(err.message || 'Failed to create lobby');
    }
  };

  const handleJoinLobby = (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // Clear previous errors

    console.log('🔵 Join Lobby button clicked');
    console.log('🔵 isConnected:', isConnected);

    // Check if connected
    if (!isConnected) {
      setError('Not connected to server. Please wait and try again.');
      console.error('🔴 Socket not connected!');
      return;
    }

    try {
      console.log('🔵 Calling joinLobby');
      wsService.joinLobby(inviteCode.toUpperCase(), displayName || 'Player');
      console.log('🔵 joinLobby called successfully');
    } catch (err: any) {
      console.error('🔴 Error joining lobby:', err);
      setError(err.message || 'Failed to join lobby');
    }
  };

  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full" padding="lg">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              NBA Draft Simulator
            </h1>
            <p className="text-gray-600">
              Draft your team, simulate the season, win the championship
            </p>
            
            {/* Connection Status */}
            <div className="mt-4">
              {isConnected ? (
                <span className="text-green-600 text-sm">✅ Connected</span>
              ) : (
                <span className="text-orange-600 text-sm">⏳ Connecting to server...</span>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => setMode('create')}
              disabled={!isConnected} // ← Disable if not connected
            >
              Create Lobby
            </Button>

            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => setMode('join')}
              disabled={!isConnected} // ← Disable if not connected
            >
              Join Lobby
            </Button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <Input
              label="Team Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your team name"
              fullWidth
              required
            />
          </div>
        </Card>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full" padding="lg">
          <div className="mb-6">
            <button
              onClick={() => setMode('select')}
              className="text-primary-600 hover:text-primary-700 flex items-center gap-2"
            >
              ← Back
            </button>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Create Lobby
          </h2>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleCreateLobby} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Teams ({DRAFT_CONSTRAINTS.TEAMS_MIN}-{DRAFT_CONSTRAINTS.TEAMS_MAX})
              </label>
              <input
                type="range"
                min={DRAFT_CONSTRAINTS.TEAMS_MIN}
                max={DRAFT_CONSTRAINTS.TEAMS_MAX}
                value={teamCount}
                onChange={(e) => setTeamCount(Number(e.target.value))}
                className="w-full"
              />
              <div className="text-center text-2xl font-bold text-primary-600 mt-2">
                {teamCount}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Roster Size ({DRAFT_CONSTRAINTS.ROSTER_MIN}-{DRAFT_CONSTRAINTS.ROSTER_MAX})
              </label>
              <input
                type="range"
                min={DRAFT_CONSTRAINTS.ROSTER_MIN}
                max={DRAFT_CONSTRAINTS.ROSTER_MAX}
                value={rosterSize}
                onChange={(e) => setRosterSize(Number(e.target.value))}
                className="w-full"
              />
              <div className="text-center text-2xl font-bold text-primary-600 mt-2">
                {rosterSize}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pick Timer
              </label>
              <select
                value={pickTimer}
                onChange={(e) => setPickTimer(Number(e.target.value) as 60 | 120 | 300)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={60}>1 minute</option>
                <option value={120}>2 minutes</option>
                <option value={300}>5 minutes</option>
              </select>
            </div>

            <div className="pt-4">
              <Button 
                type="submit" 
                variant="primary" 
                size="lg" 
                fullWidth
                disabled={!isConnected} // ← Disable if not connected
              >
                Create Lobby
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  // Join mode
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full" padding="lg">
        <div className="mb-6">
          <button
            onClick={() => setMode('select')}
            className="text-primary-600 hover:text-primary-700 flex items-center gap-2"
          >
            ← Back
          </button>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Join Lobby
        </h2>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleJoinLobby} className="space-y-4">
          <Input
            label="Invite Code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="Enter 6-character code"
            maxLength={6}
            fullWidth
            required
          />

          <Input
            label="Team Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your team name"
            fullWidth
            required
          />

          <div className="pt-4">
            <Button 
              type="submit" 
              variant="primary" 
              size="lg" 
              fullWidth
              disabled={!isConnected} // ← Disable if not connected
            >
              Join Lobby
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}