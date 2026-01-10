/**
 * Lobby Page - UPDATED FOR V2
 * Phase 1A: Added isPublic checkbox, Browse Public Lobbies button
 * Phase 2: Added rotation depth slider (5 to rosterSize)
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LobbyConfig, SeasonFormat } from '@nba-draft-sim/shared';
import { DRAFT_CONSTRAINTS } from '@nba-draft-sim/shared';
import { wsService } from '../services/websocket';
import { useApp } from '../context/AppContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';

export function LobbyPage() {
  const navigate = useNavigate();
  const { lobby, isConnected } = useApp();

  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string>('');

  // Create lobby form
  const [teamCount, setTeamCount] = useState(6);
  const [rosterSize, setRosterSize] = useState(12);
  const [pickTimer, setPickTimer] = useState<60 | 120 | 300>(120);
  const [seasonFormat, setSeasonFormat] = useState<SeasonFormat>('double_round_robin');
  const [isPublic, setIsPublic] = useState(false); // Phase 1A

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
    setError('');

    if (!isConnected) {
      setError('Not connected to server. Please wait and try again.');
      return;
    }

    if (!displayName.trim()) {
      setError('Please enter a team name');
      return;
    }

    try {
      const config: LobbyConfig = {
        teamCount,
        rosterSize,
        pickTimer,
        seasonFormat,
      };

      wsService.emit('lobby:create', { config, isPublic, displayName: displayName.trim() });
    } catch (err: any) {
      setError(err.message || 'Failed to create lobby');
    }
  };

  const handleJoinLobby = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isConnected) {
      setError('Not connected to server. Please wait and try again.');
      return;
    }

    try {
      wsService.joinLobby(inviteCode.toUpperCase(), displayName || 'Player');
    } catch (err: any) {
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
              Draft your team, coach to victory, win the championship
            </p>

            {/* Connection Status */}
            <div className="mt-4">
              {isConnected ? (
                <span className="text-green-600 text-sm">✓ Connected</span>
              ) : (
                <span className="text-orange-600 text-sm">⏳ Connecting to server...</span>
              )}
            </div>
          </div>

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
              disabled={!isConnected}
            >
              Create Lobby
            </Button>

            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => navigate('/browse')}
              disabled={!isConnected}
            >
              Browse Public Lobbies
            </Button>

            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => setMode('join')}
              disabled={!isConnected}
            >
              Join with Code
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
        <Card className="max-w-2xl w-full" padding="lg">
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

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleCreateLobby} className="space-y-6">
            {/* Phase 1A: Public/Private Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Public Lobby
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
                <p className="text-xs text-gray-500 mt-1">
                  {isPublic ? 'Visible in lobby browser' : 'Private - invite code only'}
                </p>
              </div>
            </div>

            {/* Team Count Slider */}
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

            {/* Roster Size Slider */}
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

            {/* Pick Timer Dropdown */}
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

            {/* Phase 1A: Season Format Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Season Format
              </label>
              <select
                value={seasonFormat}
                onChange={(e) => setSeasonFormat(e.target.value as SeasonFormat)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="double_round_robin">Double Round Robin (Standard)</option>
                <option value="single_round_robin">Single Round Robin (Faster)</option>
                <option value="playoffs_only">Playoffs Only (Fastest)</option>
              </select>
              <p className="text-xs text-gray-500 mt-2">
                {seasonFormat === 'double_round_robin' && 'Each team plays every other team twice'}
                {seasonFormat === 'single_round_robin' && 'Each team plays every other team once'}
                {seasonFormat === 'playoffs_only' && 'Skip straight to playoffs'}
              </p>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={!isConnected}
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
              disabled={!isConnected}
            >
              Join Lobby
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
