/**
 * Draft Page - CSS GRID VERSION
 * Uses CSS Grid with fr units - guaranteed to work
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

type SortField = 'impact' | 'name' | 'pts' | 'reb' | 'ast' | 'ts';
type SortDirection = 'asc' | 'desc';

export function DraftPage() {
  const navigate = useNavigate();
  const { draft, allPlayers, timeRemaining, league, lobby } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('impact');
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

  const myTeam = useMemo(() => {
    if (!draft) return null;
    return draft.teams[0] || null;
  }, [draft]);

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

    const composition = Object.entries(archetypeCounts)
      .map(([name, total]) => ({
        name,
        percentage: totalPercentage > 0 ? (total / totalPercentage) * 100 : 0
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);

    return composition;
  }, [myRoster]);

  const availablePlayers = useMemo(() => {
    if (!draft || !allPlayers) return [];

    let available = allPlayers.filter((p) =>
      draft.availablePlayers.includes(p.playerId)
    );

    if (searchTerm) {
      available = available.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.team.toLowerCase().includes(searchTerm.toLowerCase())
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

  const isMyPick = useMemo(() => {
    if (!myTeam || !currentTeam) return false;
    return myTeam.teamId === currentTeam.teamId;
  }, [myTeam, currentTeam]);

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

  const handleResetFilters = () => {
    setSearchTerm('');
    setSortField('impact');
    setSortDirection('desc');
  };

  const handlePauseDraft = () => {
    wsService.pauseDraft();
  };

  const handleUnpauseDraft = () => {
    wsService.unpauseDraft();
  };

  if (!draft) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-gray-400">⇅</span>;
    return sortDirection === 'desc' ? <span>↓</span> : <span>↑</span>;
  };

  // Grid layout: main content takes remaining space, sidebar fixed width
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: showRoster ? '1fr 384px' : '1fr',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#f9fafb',
  };

  return (
    <div style={gridStyle}>
      {/* Main Content */}
      <div style={{ padding: '1rem', overflowY: 'auto' }}>
        {/* Header */}
        <Card className="mb-4" padding="md">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">NBA Draft</h1>
              <p className="text-gray-600">
                Pick {currentPick?.pickNumber || '?'} of {draft.draftOrder.length} - Round {currentPick?.round || '?'}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {draft.status === 'active' && timeRemaining !== null && (
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary-600">
                    {formatTime(timeRemaining)}
                  </div>
                  <div className="text-sm text-gray-600">Time Remaining</div>
                </div>
              )}

              {draft.status === 'paused' && (
                <div className="text-orange-600 font-bold text-xl">⏸ PAUSED</div>
              )}

              {isCommissioner && (
                <div className="flex gap-2">
                  {draft.status === 'active' && (
                    <Button size="sm" variant="secondary" onClick={handlePauseDraft}>
                      ⏸ Pause
                    </Button>
                  )}
                  {draft.status === 'paused' && (
                    <Button size="sm" variant="primary" onClick={handleUnpauseDraft}>
                      ▶ Resume
                    </Button>
                  )}
                </div>
              )}

              <Button size="sm" variant="secondary" onClick={() => setShowRoster(!showRoster)}>
                {showRoster ? '→ Hide' : '← Show'} Roster
              </Button>
            </div>
          </div>

          {currentTeam && (
            <div className="mt-4 p-4 bg-primary-50 rounded-lg">
              <div className="text-lg font-bold text-primary-900">
                On the Clock: {currentTeam.displayName}
              </div>
              {isMyPick && (
                <div className="text-sm text-primary-700 mt-1">
                  🔔 It's your pick! Select a player below.
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Search */}
        <Card padding="md" className="mb-4">
          <div className="flex gap-4 items-center">
            <Input
              placeholder="Search players"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button size="sm" variant="secondary" onClick={handleResetFilters}>
              🔄 Reset
            </Button>
            <div className="text-sm text-gray-600">
              Sorted by: <span className="font-medium">{sortField === 'impact' ? 'Impact' : sortField.toUpperCase()}</span>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pos</th>
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
                      <td className="px-4 py-3 text-sm text-gray-600">{player.position}</td>
                      <td className="px-4 py-3">
                        {topArchetypes.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {topArchetypes.map((arch) => (
                              <span
                                key={arch.name}
                                className={`inline-block px-2.5 py-1 text-xs font-medium rounded-md border whitespace-nowrap ${getArchetypeColor(arch.name)}`}
                                title={`${(arch.percentage * 100).toFixed(1)}%`}
                              >
                                {formatArchetypeName(arch.name)}
                              </span>
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

            {teamComposition && teamComposition.length > 0 && (
              <div className="mt-4">
                <Card padding="sm" className="bg-gray-50">
                  <h3 className="font-bold text-sm text-gray-900 mb-3">Team Composition</h3>
                  <div className="space-y-2">
                    {teamComposition.map((comp) => (
                      <div key={comp.name} className="flex items-center justify-between">
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-md border whitespace-nowrap ${getArchetypeColor(comp.name)}`}>
                          {formatArchetypeName(comp.name)}
                        </span>
                        <span className="text-sm font-semibold text-gray-700">{comp.percentage.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

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
                          <div className="text-xs text-gray-500 mt-0.5">{player.position} • {player.team}</div>
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