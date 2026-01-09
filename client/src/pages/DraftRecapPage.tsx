/**
 * Draft Recap Page - Redesigned with Tabs
 * 
 * Features:
 * - Tab-based team navigation (user's team shown first)
 * - Redesigned player cards
 * - Better team analysis with Phase 2 archetypes
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { wsService } from '../services/websocket';
import { apiService } from '../services/api';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { TeamAnalysis } from '../components/TeamAnalysis';
import { TradeModal } from '../components/TradeModal';
import { PlayerCard } from '../components/PlayerCard';
import { TeamAggregation, Player, DraftTeam } from '@nba-draft-sim/shared';

export function DraftRecapPage() {
  const navigate = useNavigate();
  const { draft, league, allPlayers, lobby, userId } = useApp();
  const [startingTrade, setStartingTrade] = useState(false);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [startingSeason, setStartingSeason] = useState(false);
  const tradeClickedRef = useRef(false);
  const seasonClickedRef = useRef(false);
  const [teamAggregations, setTeamAggregations] = useState<Record<string, TeamAggregation>>({});
  
  // Tab state - track which team is being viewed
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);

  // Find user's team and set it as initial active tab
  const myTeam = useMemo(() => {
    if (!draft || !userId) return null;
    return draft.teams.find(t => t.userId === userId) || null;
  }, [draft, userId]);

  // Set initial active team to user's team
  useEffect(() => {
    if (myTeam && !activeTeamId) {
      setActiveTeamId(myTeam.teamId);
    } else if (draft?.teams.length && !activeTeamId) {
      setActiveTeamId(draft.teams[0].teamId);
    }
  }, [myTeam, draft, activeTeamId]);

  // Fetch team aggregations
  useEffect(() => {
    if (draft) {
      draft.teams.forEach((team) => {
        if (team.roster.length > 0) {
          apiService
            .aggregateTeam(team.roster, team.teamId)
            .then((aggregation) => {
              setTeamAggregations((prev) => ({
                ...prev,
                [team.teamId]: aggregation,
              }));
            });
        }
      });
    }
  }, [draft]);

  // Navigation guards
  useEffect(() => {
    if (!draft || !league) {
      navigate('/');
    }
  }, [draft, league, navigate]);

  useEffect(() => {
    if (league?.phase === 'regular_season' || league?.phase === 'trade_window') {
      navigate('/results');
    }
  }, [league, navigate]);

  if (!draft || !league) return null;

  const isCommissioner = lobby?.users?.some(u => u.isCommissioner) || false;

  const handleStartSeason = () => {
    if (seasonClickedRef.current || startingSeason) return;
    seasonClickedRef.current = true;
    setStartingSeason(true);
    wsService.startRegularSeason();
  };

  // Get currently active team
  const activeTeam = draft.teams.find(t => t.teamId === activeTeamId);
  
  // Get roster for active team
  const activeRoster = useMemo(() => {
    if (!activeTeam) return [];
    return activeTeam.roster
      .map((pid) => allPlayers.find((p) => p.playerId === pid))
      .filter((p): p is Player => p !== undefined);
  }, [activeTeam, allPlayers]);

  // Sort teams so user's team is first
  const sortedTeams = useMemo(() => {
    if (!draft) return [];
    const teams = [...draft.teams];
    if (myTeam) {
      const myIndex = teams.findIndex(t => t.teamId === myTeam.teamId);
      if (myIndex > 0) {
        const [removed] = teams.splice(myIndex, 1);
        teams.unshift(removed);
      }
    }
    return teams;
  }, [draft, myTeam]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black tracking-tight">🏀 Draft Complete!</h1>
              <p className="text-gray-400 mt-1">Review rosters and prepare for the season</p>
            </div>
            
            {/* Commissioner Controls */}
            {isCommissioner && league.phase === 'draft_recap' && (
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setIsTradeModalOpen(true)}
                  variant="secondary"
                  disabled={startingTrade || startingSeason}
                >
                  🔄 Propose Trade
                </Button>
                <Button 
                  onClick={handleStartSeason} 
                  variant="primary"
                  disabled={startingTrade || startingSeason}
                >
                  {startingSeason ? '⏳ Starting...' : '▶️ Start Season'}
                </Button>
              </div>
            )}
          </div>

          {/* Non-commissioner message */}
          {!isCommissioner && league.phase === 'draft_recap' && (
            <p className="text-gray-400 mt-4 text-sm">
              ⏳ Waiting for commissioner to start the season...
            </p>
          )}
        </div>
      </div>

      {/* Trade Modal */}
      <TradeModal
        teams={draft.teams}
        allPlayers={allPlayers}
        isOpen={isTradeModalOpen}
        onClose={() => setIsTradeModalOpen(false)}
        onTrade={(team1Id, team2Id, team1PlayerIds, team2PlayerIds) => {
          wsService.executeTrade(team1Id, team2Id, team1PlayerIds, team2PlayerIds);
        }}
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Team Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 bg-white rounded-t-lg">
            <nav className="-mb-px flex overflow-x-auto" aria-label="Teams">
              {sortedTeams.map((team, index) => {
                const isActive = team.teamId === activeTeamId;
                const isMyTeam = team.teamId === myTeam?.teamId;
                
                return (
                  <button
                    key={team.teamId}
                    onClick={() => setActiveTeamId(team.teamId)}
                    className={`
                      whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm transition-colors
                      ${isActive 
                        ? 'border-blue-600 text-blue-600 bg-blue-50' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                      ${index === 0 ? 'rounded-tl-lg' : ''}
                    `}
                  >
                    <span className="flex items-center gap-2">
                      {isMyTeam && <span className="text-yellow-500">⭐</span>}
                      {team.displayName}
                      <span className={`
                        px-2 py-0.5 rounded-full text-xs
                        ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}
                      `}>
                        {team.roster.length}
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Active Team Content */}
        {activeTeam && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Team Analysis Sidebar */}
            <div className="lg:col-span-1">
              <Card padding="none" className="sticky top-6 overflow-hidden">
                {/* Team Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                  <div className="flex items-center gap-2">
                    {activeTeam.teamId === myTeam?.teamId && (
                      <span className="text-yellow-300">⭐</span>
                    )}
                    <h2 className="text-xl font-bold text-white">{activeTeam.displayName}</h2>
                  </div>
                  <p className="text-blue-100 text-sm mt-1">
                    {activeRoster.length} Players
                  </p>
                </div>

                {/* Team Analysis */}
                {teamAggregations[activeTeam.teamId] ? (
                  <TeamAnalysis aggregation={teamAggregations[activeTeam.teamId]} />
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    Loading analysis...
                  </div>
                )}

                {/* Overall Rating */}
                {teamAggregations[activeTeam.teamId] && (
                  <div className="p-4 bg-gray-50 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Overall Rating</span>
                      <span className="text-2xl font-black text-gray-900">
                        {(teamAggregations[activeTeam.teamId].overallRating * 10).toFixed(1)}
                      </span>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Roster Grid */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeRoster.map((player, index) => (
                  <PlayerCard
                    key={player.playerId}
                    player={player}
                    playerIndex={index}
                    teamAggregation={teamAggregations[activeTeam.teamId]}
                  />
                ))}
              </div>

              {activeRoster.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-2">📋</div>
                  <div className="text-sm">No players on this roster yet</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Team Comparison (collapsed by default) */}
        <details className="mt-8">
          <summary className="cursor-pointer text-lg font-bold text-gray-700 hover:text-gray-900 p-4 bg-white rounded-lg shadow-sm">
            📊 Quick Team Comparison
          </summary>
          <div className="mt-4 bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Team</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Players</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Rating</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Top Player</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedTeams.map((team) => {
                  const roster = team.roster
                    .map((pid) => allPlayers.find((p) => p.playerId === pid))
                    .filter((p): p is Player => p !== undefined);
                  const topPlayer = roster.sort((a, b) => b.impactRating - a.impactRating)[0];
                  const agg = teamAggregations[team.teamId];
                  
                  return (
                    <tr 
                      key={team.teamId} 
                      className={`hover:bg-gray-50 cursor-pointer ${team.teamId === activeTeamId ? 'bg-blue-50' : ''}`}
                      onClick={() => setActiveTeamId(team.teamId)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {team.teamId === myTeam?.teamId && <span className="text-yellow-500">⭐</span>}
                          <span className="font-medium text-gray-900">{team.displayName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{roster.length}</td>
                      <td className="px-4 py-3 text-center">
                        {agg ? (
                          <span className="font-bold text-gray-900">
                            {(agg.overallRating * 10).toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {topPlayer?.name || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </div>
  );
}