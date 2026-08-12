/**
 * Lobby Page - V3 UPDATE
 * 
 * CHANGELOG:
 * - V3: Renamed "Playoffs Only" to "Quick Sim" with accurate description
 * - Removed rotation depth from lobby config (now per-game coaching decision)
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

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

// Defensive fallback in case shared library import fails in production
const CONSTRAINTS = DRAFT_CONSTRAINTS || {
  TEAMS_MIN: 1,
  TEAMS_MAX: 30,
  ROSTER_MIN: 8,
  ROSTER_MAX: 15,
};

export function LobbyPage() {
  const navigate = useNavigate();
  const { lobby, isConnected, error: connectionError } = useApp();

  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string>('');

  // Create lobby form
  const [teamCount, setTeamCount] = useState(6);
  const [rosterSize, setRosterSize] = useState(12);
  const [pickTimer, setPickTimer] = useState<60 | 120 | 300>(120);
  const [seasonFormat, setSeasonFormat] = useState<SeasonFormat>('double_round_robin');
  const [isPublic, setIsPublic] = useState(false);

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
        // NOTE: rotationDepth removed - now set per-game in coaching decisions
      };

      wsService.createLobby(config, { isPublic, displayName: displayName.trim() });
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to create lobby'));
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
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to join lobby'));
    }
  };

  // Season format descriptions - V3 UPDATED
  const getSeasonFormatDescription = (format: SeasonFormat): string => {
    switch (format) {
      case 'double_round_robin':
        return 'Each team plays every other team twice. Full coaching decisions between rounds.';
      case 'single_round_robin':
        return 'Each team plays every other team once. Coaching decisions between rounds.';
      case 'quick_sim':
        return 'One round-robin season simulated quickly without coaching breaks. Great for testing.';
      default:
        return '';
    }
  };

  const visibleError = error || connectionError;
  const shellClass = 'min-h-screen bg-cv-navy px-4 py-12';
  const panelClass = 'mx-auto w-full';
  const fieldPanelClass = 'rounded-cv border border-cv-court/20 bg-cv-navy/35 p-4';
  const fieldLabelClass = 'mb-2 block text-sm font-medium text-cv-chalk';
  const nativeFieldClass = 'w-full rounded-lg border border-cv-court/20 bg-cv-navy/40 px-3 py-2 text-cv-chalk focus:outline-none focus:ring-2 focus:ring-cv-accent';
  const backButtonClass = 'mb-6 text-sm font-semibold text-cv-chalk/70 hover:text-cv-chalk';
  const errorClass = 'mb-4 rounded-cv border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100';

  if (mode === 'select') {
    return (
      <div className={shellClass}>
        <Card className={`${panelClass} max-w-md border-cv-court/30 bg-cv-steel/90`} padding="lg">
          <div className="mb-8 text-center">
            <p className="mb-3 text-xs uppercase tracking-[0.24em] text-cv-accent">Draft Sim Lobby</p>
            <h1 className="mb-3 text-4xl font-semibold text-cv-chalk">
              Create your draft room
            </h1>
            <p className="text-sm leading-6 text-cv-chalk/70">
              Name your team, create a lobby, or join a public room before entering the active draft board.
            </p>

            {/* Connection Status */}
            <div className="mt-4">
              {isConnected ? (
                <span className="text-sm font-semibold text-emerald-300">Connected to draft server</span>
              ) : (
                <span className="text-sm font-semibold text-amber-200">Connecting to draft server...</span>
              )}
            </div>
          </div>

          {visibleError && (
            <div className={errorClass} role="alert" data-task-state="lobby_error">
              {visibleError}
            </div>
          )}

          {/* Team Name Input - Required first */}
          <div className={fieldPanelClass}>
            <Input
              label="Team Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your team name"
              fullWidth
              required
            />
            {!displayName.trim() && (
              <p className="mt-2 text-sm font-medium text-amber-200">
                Enter a team name to continue.
              </p>
            )}
            {displayName.trim() && (
              <p className="mt-2 text-sm font-medium text-emerald-300">
                Team name set.
              </p>
            )}
          </div>

          <div className="space-y-4 mt-6">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => setMode('create')}
              disabled={!isConnected || !displayName.trim()}
            >
              Create Lobby
            </Button>

            <Button
              data-mac-control-id="bballedu.lobby.browse"
              data-task-state={isConnected && displayName.trim() ? 'browse_ready' : 'browse_disabled'}
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => navigate('/browse')}
              disabled={!isConnected || !displayName.trim()}
            >
              Browse Public Lobbies
            </Button>

            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => setMode('join')}
              disabled={!isConnected || !displayName.trim()}
            >
              Join with Code
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className={shellClass}>
        <Card className={`${panelClass} max-w-2xl border-cv-court/30 bg-cv-steel/90`} padding="lg">
          <button
            onClick={() => setMode('select')}
            className={backButtonClass}
          >
            Back to lobby options
          </button>

          <h2 className="mb-2 text-2xl font-semibold text-cv-chalk">
            Create Lobby
          </h2>
          <p className="mb-6 text-sm leading-6 text-cv-chalk/70">
            Choose a room size and season cadence. Coaching decisions happen later in the season loop.
          </p>

          {visibleError && (
            <div className={errorClass}>
              {visibleError}
            </div>
          )}

          <form onSubmit={handleCreateLobby} className="space-y-6">
            {/* Public/Private Toggle */}
            <div className="flex items-center justify-between rounded-cv border border-cv-court/20 bg-cv-navy/35 p-4">
              <div>
                <p className="text-sm font-semibold text-cv-chalk">
                  Lobby visibility
                </p>
                <p className="mt-1 text-xs text-cv-chalk/60">
                  {isPublic ? 'Visible in lobby browser' : 'Private - invite code only'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="peer h-6 w-11 rounded-full bg-cv-navy/60 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-cv-court/30 after:bg-cv-chalk after:transition-all after:content-[''] peer-checked:bg-cv-accent peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cv-court/30"></div>
              </label>
            </div>

            {/* Team Count Slider */}
            <div>
              <label className={fieldLabelClass}>
                Number of Teams ({CONSTRAINTS.TEAMS_MIN}-{CONSTRAINTS.TEAMS_MAX})
              </label>
              <input
                type="range"
                min={CONSTRAINTS.TEAMS_MIN}
                max={CONSTRAINTS.TEAMS_MAX}
                value={teamCount}
                onChange={(e) => setTeamCount(Number(e.target.value))}
                className="w-full accent-cv-accent"
              />
              <div className="mt-2 text-center text-2xl font-semibold text-cv-accent">
                {teamCount}
              </div>
            </div>

            {/* Roster Size Slider */}
            <div>
              <label className={fieldLabelClass}>
                Roster Size ({CONSTRAINTS.ROSTER_MIN}-{CONSTRAINTS.ROSTER_MAX})
              </label>
              <input
                type="range"
                min={CONSTRAINTS.ROSTER_MIN}
                max={CONSTRAINTS.ROSTER_MAX}
                value={rosterSize}
                onChange={(e) => setRosterSize(Number(e.target.value))}
                className="w-full accent-cv-accent"
              />
              <div className="mt-2 text-center text-2xl font-semibold text-cv-accent">
                {rosterSize}
              </div>
            </div>

            {/* Pick Timer Dropdown */}
            <div>
              <label className={fieldLabelClass}>
                Pick Timer
              </label>
              <select
                value={pickTimer}
                onChange={(e) => setPickTimer(Number(e.target.value) as 60 | 120 | 300)}
                className={nativeFieldClass}
              >
                <option value={60}>1 minute</option>
                <option value={120}>2 minutes</option>
                <option value={300}>5 minutes</option>
              </select>
            </div>

            {/* Season Format Dropdown - V3 UPDATED */}
            <div>
              <label className={fieldLabelClass}>
                Season Format
              </label>
              <select
                value={seasonFormat}
                onChange={(e) => setSeasonFormat(e.target.value as SeasonFormat)}
                className={nativeFieldClass}
              >
                <option value="double_round_robin">Double Round Robin (Full Season)</option>
                <option value="single_round_robin">Single Round Robin (Half Season)</option>
                <option value="quick_sim">Quick Sim (No Coaching Breaks)</option>
              </select>
              <p className="mt-2 text-xs text-cv-chalk/60">
                {getSeasonFormatDescription(seasonFormat)}
              </p>
            </div>
            <div className="pt-4">
              <Button
                data-mac-control-id="bballedu.lobby.create"
                data-task-state={isConnected ? 'create_ready' : 'create_disabled'}
                data-error-state={visibleError ? 'lobby_error' : undefined}
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
    <div className={shellClass}>
      <Card className={`${panelClass} max-w-md border-cv-court/30 bg-cv-steel/90`} padding="lg">
        <button
          onClick={() => setMode('select')}
          className={backButtonClass}
        >
          Back to lobby options
        </button>

        <h2 className="mb-2 text-2xl font-semibold text-cv-chalk">
          Join Lobby
        </h2>
        <p className="mb-6 text-sm leading-6 text-cv-chalk/70">
          Enter the invite code and team name from your commissioner.
        </p>

        {visibleError && (
          <div className={errorClass}>
            {visibleError}
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
              data-mac-control-id="bballedu.lobby.join"
              data-task-state={isConnected && inviteCode.length === 6 ? 'join_ready' : 'join_disabled'}
              data-error-state={visibleError ? 'lobby_error' : undefined}
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
