/**
 * Draft Page - CSS GRID VERSION
 * Uses CSS Grid with fr units - guaranteed to work
 * 
 * UPDATED: Fixed myTeam identification using userId instead of always taking teams[0]
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { wsService } from '../services/websocket';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { getTopArchetypes, getArchetypeColor, formatArchetypeName } from '../archetypes';
import { Player } from '@nba-draft-sim/shared';
import { TeamIdentityUI } from '../features/team-composition/components/TeamIdentityUI';

type SortField = 'impact' | 'name' | 'pts' | 'reb' | 'ast' | 'ts' | 'threeP' | 'threePA' | 'ft' | 'stl' | 'blk';
type SortDirection = 'asc' | 'desc';

export function DraftPage() {
  const navigate = useNavigate();
  // 🆕 Get userId from context
  const { draft, allPlayers, timeRemaining, league, lobby, userId } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('pts');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showRoster, setShowRoster] = useState(false);

  React.useEffect(() => {
    if (!draft) {
      navigate('/');
    }
  }, [draft, navigate]);

  React.useEffect(() => {
    if (draft?.status === 'completed' && league?.phase === 'draft_recap') {
      navigate('/draft-recap');
    }
  }, [draft, league, navigate]);

  const isCommissioner = useMemo(() => {
    if (!lobby || !draft) return false;
    return lobby.users?.some(u => u.isCommissioner) || false;
  }, [lobby, draft]);

  // ════════════════════════════════════════════════════════════════════════
  // 🆕 FIX: Find MY team by matching userId, not by taking teams[0]
  // ════════════════════════════════════════════════════════════════════════
  const myTeam = useMemo(() => {
    if (!draft || !userId) {
      console.log('⚠️ myTeam: draft or userId is null', { draft: !!draft, userId });
      return null;
    }
    const team = draft.teams.find(t => t.userId === userId);
    console.log('🏀 myTeam found:', team?.displayName, 'for userId:', userId);
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

  const teamComposition = useMemo(() => {
    if (myRoster.length < 4) return null;

    const archetypeCounts: Record<string, number> = {};
    let totalPercentage = 0;

    myRoster.forEach(player => {
      Object.entries(player.archetypes).forEach(([archetype, percentage]) => {
        const pct = percentage ?? 0;
        archetypeCounts[archetype] = (archetypeCounts[archetype] || 0) + pct;
        totalPercentage += pct;
      });
    });

    return null;
  }, [myRoster]);

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
      console.log('⚠️ isMyPick: missing data', { draft: !!draft, userId, currentPick: !!currentPick });
      return false;
    }
    const pickingTeam = draft.teams.find(t => t.teamId === currentPick.teamId);
    const result = pickingTeam?.userId === userId;
    console.log('🎯 isMyPick:', result, '| pickingTeam.userId:', pickingTeam?.userId, '| my userId:', userId);
    return result;
  }, [draft, userId, currentPick]);
  // ════════════════════════════════════════════════════════════════════════

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading draft...</div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: showRoster ? '1fr 350px' : '1fr',
        minHeight: '100vh',
        backgroundColor: '#f3f4f6',
      }}
    >
      {/* Main Content */}
      <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">NBA Draft</h1>
            <p className="text-gray-600">
              Round {currentPick?.round || 1} • Pick {currentPick?.pickNumber || 1}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Timer */}
            <div className={`text-2xl font-mono font-bold ${
              (timeRemaining ?? 0) <= 10 ? 'text-red-600' : 'text-gray-900'
            }`}>
              {timeRemaining !== null ? `${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, '0')}` : '--:--'}
            </div>

           {/* --- INSERT NOTIFICATION UNDER HEADER --- */}
          {draft.status === 'active' && picksUntilTurn !== null && (
            <div className={`mt-4 p-4 rounded-lg flex items-center justify-between shadow-sm transition-colors ${
              picksUntilTurn === 0 
                ? 'bg-green-100 border-2 border-green-400 animate-pulse' // It's your turn!
                : picksUntilTurn <= 2 
                ? 'bg-yellow-50 border border-yellow-200' // Getting close
                : 'bg-blue-50 border border-blue-200' // Far away
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {picksUntilTurn === 0 ? '🚨' : picksUntilTurn <= 2 ? '⚠️' : '⏳'}
                </span>
                <div>
                  <div className={`font-bold text-lg ${
                    picksUntilTurn === 0 ? 'text-green-800' : 'text-gray-800'
                  }`}>
                    {picksUntilTurn === 0 
                      ? "IT'S YOUR TURN!" 
                      : `${picksUntilTurn} pick${picksUntilTurn === 1 ? '' : 's'} until your turn`}
                  </div>
                  <div className="text-sm text-gray-600">
                    {picksUntilTurn === 0 
                      ? "Make your selection below." 
                      : "Check your queue and get ready."}
                  </div>
                </div>
              </div>
              
              {picksUntilTurn > 0 && (
                <div className="text-right text-gray-500 font-mono text-sm">
                  Est. wait: ~{Math.ceil(picksUntilTurn * (draft.config.pickTimer / 60))}m
                </div>
              )}
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
                        <td className="px-4 py-3 text-sm text-right font-medium">{(player.features.USG * 100).toFixed(1)}%</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{(player.rawStats.STL / player.rawStats.GP).toFixed(1)}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{(player.rawStats.BLK / player.rawStats.GP).toFixed(1)}</td>
                      <td className="px-4 py-3 text-right">
                        {/* ════════════════════════════════════════════════════════════════ */}
                        {/* 🆕 FIX: Button disabled logic now uses proper isMyPick check */}
                        {/* ════════════════════════════════════════════════════════════════ */}
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

      {/* Sidebar */}
      {showRoster && (
        <div style={{ backgroundColor: 'white', borderLeft: '1px solid #e5e7eb', overflowY: 'auto' }}>
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
      )}
    </div>
  );
}