/**
 * DraftRecapPage.tsx - COMPLETE REWRITE V3
 * 
 * Changes:
 * - Dropdown for team selection (not tabs)
 * - Header: "TeamName (X team sim, Y man rosters)" 
 * - NO separate "10 Players" line
 * - Roster sorted by draft position (round, then pick)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { wsService } from '../services/websocket';
import { apiService } from '../services/api';
import { Button } from '../components/Button';
import { TradeModal } from '../components/TradeModal';
import { TeamAnalysis } from '../components/TeamAnalysis';
import { PlayerCard } from '../components/PlayerCard';
import { TeamAggregation, Player, DraftPick } from '@nba-draft-sim/shared';

export function DraftRecapPage() {
  const navigate = useNavigate();
  const { draft, league, allPlayers, lobby, userId } = useApp();
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [startingSeason, setStartingSeason] = useState(false);
  const [teamAggregations, setTeamAggregations] = useState<Record<string, TeamAggregation>>({});

  // Redirect if no draft
  useEffect(() => {
    if (!draft || !league) {
      navigate('/');
    }
  }, [draft, league, navigate]);

  // Redirect when season starts
  useEffect(() => {
    if (league?.phase === 'regular_season' || league?.phase === 'trade_window') {
      navigate('/results');
    }
  }, [league, navigate]);

  // Set initial selected team to user's team
  useEffect(() => {
    if (draft && userId && !selectedTeamId) {
      const myTeam = draft.teams.find(t => t.userId === userId);
      if (myTeam) {
        setSelectedTeamId(myTeam.teamId);
      } else if (draft.teams.length > 0) {
        setSelectedTeamId(draft.teams[0].teamId);
      }
    }
  }, [draft, userId, selectedTeamId]);

  // Load team aggregations
  useEffect(() => {
    if (draft) {
      draft.teams.forEach((team) => {
        if (team.roster.length > 0 && !teamAggregations[team.teamId]) {
          apiService
            .aggregateTeam(team.roster, team.teamId)
            .then((aggregation) => {
              setTeamAggregations((prev) => ({
                ...prev,
                [team.teamId]: aggregation,
              }));
            })
            .catch(console.error);
        }
      });
    }
  }, [draft, teamAggregations]);

  // Get selected team
  const selectedTeam = useMemo(() => {
    if (!draft || !selectedTeamId) return null;
    return draft.teams.find(t => t.teamId === selectedTeamId) || null;
  }, [draft, selectedTeamId]);

  // Build pick map for sorting (playerId -> DraftPick)
  const pickMap = useMemo(() => {
    if (!draft) return new Map<string, DraftPick>();
    const map = new Map<string, DraftPick>();
    draft.picks.forEach(pick => {
      if (pick.playerId) {
        map.set(pick.playerId, pick);
      }
    });
    return map;
  }, [draft]);

  // Get sorted roster by draft position
  const sortedRoster = useMemo(() => {
    if (!selectedTeam || !allPlayers) return [];

    const rosterPlayers = selectedTeam.roster
      .map(pid => allPlayers.find(p => p.playerId === pid))
      .filter((p): p is Player => p !== undefined);

    // Sort by draft position: round first, then pick number
    return rosterPlayers.sort((a, b) => {
      const pickA = pickMap.get(a.playerId);
      const pickB = pickMap.get(b.playerId);

      // Players without picks go to end
      if (!pickA && !pickB) return 0;
      if (!pickA) return 1;
      if (!pickB) return -1;

      // Sort by round first
      if (pickA.round !== pickB.round) {
        return pickA.round - pickB.round;
      }
      // Then by pick number within round
      return pickA.pickNumber - pickB.pickNumber;
    });
  }, [selectedTeam, allPlayers, pickMap]);

  // Teams sorted: user's team first, then alphabetical
  const sortedTeams = useMemo(() => {
    if (!draft) return [];
    return [...draft.teams].sort((a, b) => {
      // User's team first
      if (a.userId === userId) return -1;
      if (b.userId === userId) return 1;
      // Then alphabetical
      return a.displayName.localeCompare(b.displayName);
    });
  }, [draft, userId]);

  const isCommissioner = lobby?.users?.some(u => u.isCommissioner && u.userId === userId) || false;

  const handleStartSeason = () => {
    if (startingSeason) return;
    setStartingSeason(true);
    wsService.startRegularSeason();
  };

  if (!draft || !league) return null;

  const leagueSettings = `${draft.teams.length} team sim, ${draft.config.rosterSize} man rosters`;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🏀 Draft Complete!</h1>
            <p className="text-gray-400 text-sm">Review rosters and prepare for the season</p>
          </div>
          
          {/* Commissioner Controls */}
          {isCommissioner && league.phase === 'draft_recap' && (
            <div className="flex gap-3">
              <Button
                onClick={() => setIsTradeModalOpen(true)}
                variant="secondary"
                disabled={startingSeason}
              >
                🔄 Trade
              </Button>
              <Button
                onClick={handleStartSeason}
                variant="primary"
                disabled={startingSeason}
              >
                {startingSeason ? '⏳ Starting...' : '▶️ Start Season'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Team Selector Dropdown */}
        <div className="mb-6">
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-3 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {sortedTeams.map(team => (
              <option key={team.teamId} value={team.teamId}>
                {team.displayName} {team.userId === userId ? '(You)' : ''} — {leagueSettings}
              </option>
            ))}
          </select>
        </div>

        {selectedTeam && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Team Analysis */}
            <div className="lg:col-span-1">
              <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
                {teamAggregations[selectedTeam.teamId] ? (
                  <TeamAnalysis aggregation={teamAggregations[selectedTeam.teamId]} />
                ) : (
                  <div className="text-gray-400 text-center py-8">
                    Loading team analysis...
                  </div>
                )}
              </div>
              <br />
            </div>

            {/* Right: Player Grid */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedRoster.map(player => (
                  <PlayerCard 
                    key={player.playerId} 
                    player={player} 
                    teamAggregation={teamAggregations[selectedTeam.teamId]}
                  />
                ))}
              </div>
              <br />

              {sortedRoster.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No players on this roster yet
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Trade Modal */}
      <TradeModal
        teams={draft.teams}
        allPlayers={allPlayers}
        isOpen={isTradeModalOpen}
        onClose={() => setIsTradeModalOpen(false)}
        onTrade={(team1Id, team2Id, team1PlayerIds, team2PlayerIds) => {
          wsService.executeTrade(team1Id, team2Id, team1PlayerIds, team2PlayerIds);
          setIsTradeModalOpen(false);
        }}
      />
    </div>
  );
}