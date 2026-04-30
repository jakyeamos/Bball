/**
 * Draft Page - CSS GRID VERSION
 * Uses CSS Grid with fr units - guaranteed to work
 * 
 * UPDATED: Fixed myTeam identification using userId instead of always taking teams[0]
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useApp } from '../context/AppContext';
import { wsService } from '../services/websocket';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { RouteStateNotice } from '../components/RouteStateNotice';
import { getTopArchetypes, getArchetypeColor, formatArchetypeName } from '../archetypes';
import { featureFlags, Player } from '@nba-draft-sim/shared';
import { TeamIdentityUI } from '../features/team-composition/components/TeamIdentityUI';
import { apiService } from '../services/api';
import { TeachingOverlay } from '../components/draft/TeachingOverlay';

type SortField = 'impact' | 'name' | 'pts' | 'reb' | 'ast' | 'ts' | 'threeP' | 'threePA' | 'ft' | 'stl' | 'blk';
type SortDirection = 'asc' | 'desc';

export function DraftPage() {
  const navigate = useNavigate();
  // 🆕 Get userId from context
  const { draft, allPlayers, timeRemaining, league, userId } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('pts');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showRoster, setShowRoster] = useState(false);
  const [dismissedMomentId, setDismissedMomentId] = useState<string | null>(null);

  const teachingQuery = useQuery({
    queryKey: ['draft-teaching'],
    queryFn: apiService.getDraftTeaching,
    enabled: featureFlags.draftTeachingLayerEnabled,
  });

  React.useEffect(() => {
    if (draft?.status === 'completed' && league?.phase === 'draft_recap') {
      navigate('/draft-recap');
    }
  }, [draft, league, navigate]);

  // ════════════════════════════════════════════════════════════════════════
  // 🆕 FIX: Find MY team by matching userId, not by taking teams[0]
  // ════════════════════════════════════════════════════════════════════════
  const myTeam = useMemo(() => {
    if (!draft || !userId) {
      return null;
    }
    const team = draft.teams.find(t => t.userId === userId);
    return team || null;
  }, [draft, userId]);
  // ════════════════════════════════════════════════════════════════════════

  const myRoster = useMemo(() => {
    if (!draft || !myTeam || !allPlayers) return [];

    const myPicks = draft.picks.filter(p => p.teamId === myTeam.teamId);
    return myPicks.map(pick => {
      const player = allPlayers.find(p => p.playerId === pick.playerId);
      return player;
    }).filter(Boolean) as Player[];
  }, [draft, myTeam, allPlayers]);

  const availablePlayers = useMemo(() => {
    if (!draft || !allPlayers) return [];

    let available = allPlayers.filter((p) =>
      draft.availablePlayers.includes(p.playerId)
    );

    if (searchTerm) {
      available = available.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    available.sort((a, b) => {
      let aVal: number;
      let bVal: number;

      switch (sortField) {
        case 'impact':
          aVal = a.impactRating;
          bVal = b.impactRating;
          break;
        case 'name':
          return sortDirection === 'asc'
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        case 'pts':
          aVal = a.rawStats.PTS / a.rawStats.GP;
          bVal = b.rawStats.PTS / b.rawStats.GP;
          break;
        case 'reb':
          aVal = a.rawStats.REB / a.rawStats.GP;
          bVal = b.rawStats.REB / b.rawStats.GP;
          break;
        case 'ast':
          aVal = a.rawStats.AST / a.rawStats.GP;
          bVal = b.rawStats.AST / b.rawStats.GP;
          break;
        case 'ts':
          aVal = a.rawStats.TS_PCT;
          bVal = b.rawStats.TS_PCT;
          break;
        case 'threeP':
          aVal = a.rawStats.THREE_P_PCT;
          bVal = b.rawStats.THREE_P_PCT;
          break;
        case 'threePA':
          aVal = a.rawStats.THREE_PA / a.rawStats.GP;
          bVal = b.rawStats.THREE_PA / b.rawStats.GP;
          break;
        case 'ft':
          aVal = a.rawStats.FT_PCT;
          bVal = b.rawStats.FT_PCT;
          break;
        case 'stl':
          aVal = a.rawStats.STL / a.rawStats.GP;
          bVal = b.rawStats.STL / b.rawStats.GP;
          break;
        case 'blk':
          aVal = a.rawStats.BLK / a.rawStats.GP;
          bVal = b.rawStats.BLK / b.rawStats.GP;
          break;
        default:
          aVal = a.impactRating;
          bVal = b.impactRating;
      }

      return sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return available;
  }, [draft, allPlayers, searchTerm, sortField, sortDirection]);

  const currentPick = useMemo(() => {
    if (!draft) return null;
    return draft.draftOrder[draft.currentPickIndex];
  }, [draft]);

  const currentTeam = useMemo(() => {
    if (!draft || !currentPick) return null;
    return draft.teams.find((t) => t.teamId === currentPick.teamId);
  }, [draft, currentPick]);

  const picksUntilTurn = useMemo(() => {
    if (!draft || !myTeam) return null;

    // Find the index of the next pick belonging to the user's team
    const nextPickIndex = draft.draftOrder.findIndex(
      (pick, index) => index >= draft.currentPickIndex && pick.teamId === myTeam.teamId
    );

    if (nextPickIndex === -1) return null; // No more picks
    return nextPickIndex - draft.currentPickIndex;
  }, [draft, myTeam]);

  // ════════════════════════════════════════════════════════════════════════
  // 🆕 FIX: Determine if it's MY turn using userId directly
  // This is more robust than comparing team objects
  // ════════════════════════════════════════════════════════════════════════
  const isMyPick = useMemo(() => {
    if (!draft || !userId || !currentPick) {
      return false;
    }
    const pickingTeam = draft.teams.find(t => t.teamId === currentPick.teamId);
    return pickingTeam?.userId === userId;
  }, [draft, userId, currentPick]);
  // ════════════════════════════════════════════════════════════════════════

  const teachingMoment = useMemo(() => {
    if (!featureFlags.draftTeachingLayerEnabled || dismissedMomentId) {
      return null;
    }

    const moments = teachingQuery.data?.moments ?? [];
    if (moments.length === 0) return null;

    if ((timeRemaining ?? 99) <= 15) {
      return moments.find((moment) => moment.trigger === 'clock_pressure') ?? null;
    }

    if (availablePlayers.length > 0 && myRoster.some((player) => player.position === availablePlayers[0].position)) {
      return moments.find((moment) => moment.trigger === 'fit_conflict') ?? null;
    }

    if (availablePlayers.length >= 8 && availablePlayers[0].impactRating - availablePlayers[7].impactRating > 6) {
      return moments.find((moment) => moment.trigger === 'value_reach') ?? null;
    }

    if ((draft?.currentPickIndex ?? 0) % 5 === 0) {
      return moments.find((moment) => moment.trigger === 'positional_scarcity') ?? null;
    }

    return null;
  }, [availablePlayers, dismissedMomentId, draft?.currentPickIndex, myRoster, teachingQuery.data?.moments, timeRemaining]);

  const handleMakePick = (playerId: string) => {
    wsService.makePick(playerId);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  if (!draft) {
    return (
      <RouteStateNotice
        eyebrow="Draft room inactive"
        title="Start from the Draft Sim lobby"
        description="The active draft room only opens after a lobby starts its draft. Create a lobby, join with a code, or browse public rooms to enter the draft board."
        actions={[
          { label: 'Go to Draft Sim', to: '/draft-sim' },
          { label: 'Create or join a lobby', to: '/lobby', variant: 'secondary' },
        ]}
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-cv-navy text-cv-chalk overflow-hidden">
      {/* Main Content - Draft Board */}
      <div
        className="flex-1 transition-all duration-300 ease-in-out min-w-0"
        style={{
          // Ensure main content shrinks properly when sidebar expands
          flexShrink: 1
        }}
      >
        <div style={{ padding: '1.5rem', overflowY: 'auto', height: '100vh' }}>
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cv-accent mb-2">Draft Capstone</p>
              <h1 className="text-3xl font-bold text-cv-chalk">Court Vision Draft Room</h1>
              <p className="text-cv-chalk/60">
                Round {currentPick?.round || 1} • Pick {currentPick?.pickNumber || 1}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Timer */}
              <div className={`text-2xl font-mono font-bold ${(timeRemaining ?? 0) <= 10 ? 'text-red-300' : 'text-cv-chalk'
                }`}>
                {timeRemaining !== null ? `${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, '0')}` : '--:--'}
              </div>

              {/* --- INSERT NOTIFICATION UNDER HEADER --- */}
              {draft.status === 'active' && picksUntilTurn !== null && (
                <div className={`py-2 px-4 rounded-lg flex items-center gap-3 shadow-sm transition-colors ${picksUntilTurn === 0
                    ? 'bg-green-100 border-2 border-green-400 animate-pulse text-gray-900'
                    : picksUntilTurn <= 2
                      ? 'bg-yellow-50 border border-yellow-200 text-gray-900'
                      : 'bg-blue-50 border border-blue-200 text-gray-900'
                  }`}>
                  <span className="text-xl">
                    {picksUntilTurn === 0 ? '🚨' : picksUntilTurn <= 2 ? '⚠️' : '⏳'}
                  </span>
                  <div>
                    <div className={`font-bold ${picksUntilTurn === 0 ? 'text-green-800' : 'text-gray-800'
                      }`}>
                      {picksUntilTurn === 0
                        ? "IT'S YOUR TURN!"
                        : `${picksUntilTurn} pick${picksUntilTurn === 1 ? '' : 's'} until your turn`}
                    </div>
                  </div>
                </div>
              )}

              {/* Toggle Roster */}
              <Button
                variant="secondary"
                onClick={() => setShowRoster(!showRoster)}
              >
                {showRoster ? 'Hide' : 'Show'} Roster
              </Button>
            </div>
          </div>

          {/* 🆕 Debug info - remove in production */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-4 p-2 bg-gray-200 rounded text-xs font-mono">
              <div>userId: {userId || 'null'}</div>
              <div>myTeam: {myTeam?.displayName || 'null'} ({myTeam?.teamId})</div>
              <div>currentTeam: {currentTeam?.displayName || 'null'} ({currentTeam?.userId})</div>
              <div>isMyPick: {String(isMyPick)}</div>
              <div>draft.status: {draft.status}</div>
            </div>
          )}

          {/* Search and Filters */}
          <Card padding="md" className="mb-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search players by name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  fullWidth
                />
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setSearchTerm('');
                  setSortField('pts');
                  setSortDirection('desc');
                }}
              >
                🔄 Reset
              </Button>
              <div className="text-sm text-gray-600">
                Sorted by: <span className="font-medium">{sortField === 'pts' ? 'Pts' : sortField.toUpperCase()}</span>
              </div>
            </div>
          </Card>

          {/* Player Table */}
          <Card padding="md">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>
                      Player <SortIcon field="name" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ minWidth: '350px' }}>Archetypes</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('pts')}>
                      PPG <SortIcon field="pts" />
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('reb')}>
                      RPG <SortIcon field="reb" />
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('ast')}>
                      APG <SortIcon field="ast" />
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('ts')}>
                      TS% <SortIcon field="ts" />
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('threeP')}>
                      3P% <SortIcon field="threeP" />
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('threePA')}>
                      3PA <SortIcon field="threePA" />
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('ft')}>
                      FT% <SortIcon field="ft" />
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('stl')}>
                      STL <SortIcon field="stl" />
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('blk')}>
                      BLK <SortIcon field="blk" />
                    </th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {availablePlayers.map((player) => {
                    const topArchetypes = getTopArchetypes(player.archetypes, 3);
                    const ppg = player.rawStats.PTS / player.rawStats.GP;
                    const rpg = player.rawStats.REB / player.rawStats.GP;
                    const apg = player.rawStats.AST / player.rawStats.GP;

                    return (
                      <tr key={player.playerId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{player.name}</td>
                        <td className="px-4 py-3">
                          {topArchetypes.length > 0 ? (
                            <div className="flex flex-wrap items-center">
                              {topArchetypes.map((arch, index) => (
                                <React.Fragment key={arch.name}>
                                  <span
                                    className={`inline-block px-2.5 py-1 text-xs font-medium rounded-md border whitespace-nowrap ${getArchetypeColor(
                                      arch.name
                                    )}`}
                                    title={`${(arch.percentage * 100).toFixed(1)}%`}
                                  >
                                    {formatArchetypeName(arch.name)}
                                  </span>
                                  {index < topArchetypes.length - 1 && (
                                    <span className="px-2 text-gray-500">•</span>
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">No archetypes</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{ppg.toFixed(1)}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{rpg.toFixed(1)}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{apg.toFixed(1)}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{(player.rawStats.TS_PCT * 100).toFixed(1)}%</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{(player.rawStats.THREE_P_PCT * 100).toFixed(1)}%</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{(player.rawStats.THREE_PA / player.rawStats.GP).toFixed(1)}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{(player.rawStats.FT_PCT * 100).toFixed(1)}%</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{(player.rawStats.STL / player.rawStats.GP).toFixed(1)}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{(player.rawStats.BLK / player.rawStats.GP).toFixed(1)}</td>
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
            </div>
          </Card>
        </div>
      </div>

      {/* Sidebar - Animated Width */}
      <div
        className="bg-white border-l border-gray-200 transition-all duration-300 ease-in-out overflow-hidden"
        style={{
          width: showRoster ? '350px' : '0px',
          opacity: showRoster ? 1 : 0
        }}
      >
        <div className="h-full overflow-y-auto w-[350px]"> {/* Fixed width inner container prevents content squishing during transition */}
          <div className="p-4">
            <div className="sticky top-0 bg-white pb-4 border-b z-10">
              <h2 className="text-xl font-bold text-gray-900">{myTeam?.displayName || 'My Team'}</h2>
              <p className="text-sm text-gray-600">
                {myRoster.length} / {draft.config.rosterSize} players
              </p>
            </div>

            <div className="mt-4">
              <TeamIdentityUI roster={myRoster} />
            </div>

            <div className="mt-4 space-y-2">
              {myRoster.length > 0 ? (
                myRoster.map((player, index) => {
                  const topArch = getTopArchetypes(player.archetypes, 1)[0];

                  return (
                    <Card key={player.playerId} padding="sm" className="hover:shadow-md transition-shadow border border-gray-200">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-gray-900">
                            {index + 1}. {player.name}
                          </div>
                          {topArch && (
                            <span className={`inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded-md border whitespace-nowrap ${getArchetypeColor(topArch.name)}`}>
                              {formatArchetypeName(topArch.name)}
                            </span>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-2">📋</div>
                  <div className="text-sm">No picks yet</div>
                  <div className="text-xs mt-1">Start drafting!</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <TeachingOverlay
        moment={teachingMoment}
        onDismiss={() => setDismissedMomentId(teachingMoment?.id ?? 'dismissed')}
      />
    </div>
  );
}
