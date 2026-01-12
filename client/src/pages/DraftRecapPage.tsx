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
import { TeamAnalysis } from '../components/TeamAnalysis';
import { PlayerCard } from '../components/PlayerCard';
import { TradePanel } from '../components/TradePanel';
import { TeamAggregation, Player, DraftPick } from '@nba-draft-sim/shared';

export function DraftRecapPage() {
  const navigate = useNavigate();
  const { draft, league, allPlayers, lobby, userId } = useApp();
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
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
    <div className="min-h-screen bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-[1920px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🏀 Draft Complete!</h1>
            <p className="text-gray-400 text-sm">Review rosters and prepare for the season</p>
          </div>

          {/* Commissioner Controls */}
          {league.phase === 'draft_recap' && isCommissioner && (
            <div className="flex gap-3">
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

      {/* Main Content - Responsive Grid */}
      <div className="h-auto lg:h-[calc(100vh-85px)] max-w-[1920px] mx-auto p-4">
        {selectedTeam ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">

            {/* COLUMN 1: Team Identity & Analysis (Fixed/Scrollable side) */}
            <div className="lg:col-span-3 bg-gray-800 rounded-lg border border-gray-700 p-4 h-[500px] lg:h-full overflow-y-auto flex flex-col gap-6">
              {/* Team Selector moved here */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 block">
                  Viewing Team
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {sortedTeams.map(team => (
                    <option key={team.teamId} value={team.teamId}>
                      {team.displayName} {team.userId === userId ? '(You)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-center text-gray-500 mt-2">{leagueSettings}</p>
              </div>

              {/* Team Identity Summary */}
              <div className="text-center pb-4 border-b border-gray-700">
                <div className="w-20 h-20 bg-gray-700 rounded-full mx-auto mb-3 flex items-center justify-center text-3xl shadow-lg">
                  🏀
                </div>
                <h2 className="text-xl font-bold text-white mb-1">{selectedTeam.displayName}</h2>
                <div className="text-sm text-gray-400">
                  {selectedTeam.userId === userId ? 'Your Team' : 'Managed by User'}
                </div>
              </div>

              {/* Deep Analysis (Traits & Weaknesses) */}
              <div className="flex-1">
                {teamAggregations[selectedTeam.teamId] ? (
                  <TeamAnalysis aggregation={teamAggregations[selectedTeam.teamId]} />
                ) : (
                  <div className="text-gray-400 text-center py-8 animate-pulse">
                    Analyzing roster composition...
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 2: Roster Grid (Widest) */}
            <div className="lg:col-span-6 bg-gray-800 rounded-lg border border-gray-700 flex flex-col h-[600px] lg:h-full overflow-hidden">
              <div className="p-4 border-b border-gray-700 bg-gray-800 z-10 sticky top-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">Roster Overview</h3>
                  <span className="text-sm text-gray-400">
                    {sortedRoster.length} Players
                  </span>
                </div>
              </div>

              <div className="p-4 overflow-y-auto h-full scrollbar-thin scrollbar-thumb-gray-600">
                {sortedRoster.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
                    {sortedRoster.map(player => (
                      <PlayerCard
                        key={player.playerId}
                        player={player}
                        teamAggregation={teamAggregations[selectedTeam.teamId]}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 text-gray-500">
                    <div>No players on this roster yet</div>
                    <div className="text-sm mt-2">Trades will appear here when completed</div>
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 3: Trade Center (Medium) */}
            <div className="lg:col-span-3 h-[500px] lg:h-full">
              <TradePanel
                teams={draft.teams}
                allPlayers={allPlayers}
                tradeProposals={league.tradeProposals}
                currentUserId={userId}
                onTrade={(t1, t2, p1s, p2s) => {
                  console.log('🔄 Executing trade from Panel:', { t1, t2, p1s, p2s });
                  wsService.executeTrade(t1, t2, p1s, p2s);
                }}
              />
            </div>

          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-500">
            Loading draft data...
          </div>
        )}
      </div>
    </div>
  );
}