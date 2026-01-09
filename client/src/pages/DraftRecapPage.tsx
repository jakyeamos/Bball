/**
 * Draft Recap Page - COMPLETE REDESIGN
 * Beautiful layout with:
 * - Proper card styling
 * - Team composition working
 * - Per-game stats displayed nicely
 * - Professional appearance
 * 
 * FIXED: TypeScript errors
 * - Removed unused TeamComposition import
 * - Added proper types for SynergyMark component
 * - Fixed player type narrowing in roster mapping
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { wsService } from '../services/websocket';
import { apiService } from '../services/api';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { TeamAnalysis } from '../components/TeamAnalysis';
import { TradeModal } from '../components/TradeModal';
import { PlayerCard } from '../components/PlayerCard';
import {
  getTopArchetypes,
  getArchetypeColor,
  formatArchetypeName,
  getPrimaryTeamIdentity,
} from '../archetypes';
// 🆕 FIX: Removed TeamComposition - it doesn't exist in shared types
import { TeamAggregation, Player } from '@nba-draft-sim/shared';

// 🆕 FIX: Define synergy type
type SynergyLevel = 'great' | 'good' | 'poor' | 'average';

// 🆕 FIX: Add proper props interface for SynergyMark
interface SynergyMarkProps {
  synergy: SynergyLevel;
}

const SynergyMark: React.FC<SynergyMarkProps> = ({ synergy }) => {
  const synergyStyles: Record<SynergyLevel, string> = {
    great: 'bg-green-500',
    good: 'bg-blue-500',
    poor: 'bg-red-500',
    average: 'bg-gray-400',
  };
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${synergyStyles[synergy]}`}
    ></span>
  );
};

const getSynergy = (player: Player, teamAggregation?: TeamAggregation): SynergyLevel => {
  if (!teamAggregation) return 'average';
  const primaryIdentity = getPrimaryTeamIdentity(teamAggregation);
  if ((player.archetypes[primaryIdentity]) ?? 0 > 0.5) {
    return 'great';
  }
  if ((player.archetypes[primaryIdentity]) ?? 0 > 0.25) {
    return 'good';
  }
  return 'poor';
};

export function DraftRecapPage() {
  const navigate = useNavigate();
  const { draft, league, allPlayers, lobby } = useApp();
  const [startingTrade, setStartingTrade] = useState(false);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [startingSeason, setStartingSeason] = useState(false);
  const tradeClickedRef = useRef(false);
  const seasonClickedRef = useRef(false);
  const [teamAggregations, setTeamAggregations] = useState<
    Record<string, TeamAggregation>
  >({});

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

  React.useEffect(() => {
    if (!draft || !league) {
      navigate('/');
    }
  }, [draft, league, navigate]);

  React.useEffect(() => {
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

  const handleStartTradeWindow = () => {
    if (tradeClickedRef.current || startingTrade) return;
    if (league.phase !== 'draft_recap') {
      alert('Trade window can only be started after draft recap');
      return;
    }
    tradeClickedRef.current = true;
    setStartingTrade(true);
    wsService.startTradeWindow();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-2">
            🏀 Draft Complete!
          </h1>
          <p className="text-base sm:text-lg text-gray-600">
            Review your rosters and prepare for the season
          </p>
        </div>

        {/* Commissioner Controls */}
        {isCommissioner && league.phase === 'draft_recap' && (
          <Card className="mb-6" padding="lg">
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Ready to Begin?
              </h3>
              <div className="flex items-center justify-center gap-6">
                <Button 
                  onClick={handleStartSeason} 
                  variant="primary" 
                  size="lg"
                  disabled={startingTrade || startingSeason}
                >
                  {startingSeason ? '⏳ Starting...' : '▶️ Start Season'}
                </Button>
                <Button
                  onClick={() => setIsTradeModalOpen(true)}
                  variant="secondary"
                  size="lg"
                  disabled={startingTrade || startingSeason}
                >
                  🔄 Propose Trade
                </Button>
              </div>
            </div>
          </Card>
        )}

        <TradeModal
          teams={draft.teams}
          allPlayers={allPlayers}
          isOpen={isTradeModalOpen}
          onClose={() => setIsTradeModalOpen(false)}
          onTrade={(team1Id, team2Id, team1PlayerIds, team2PlayerIds) => {
            wsService.executeTrade(team1Id, team2Id, team1PlayerIds, team2PlayerIds);
          }}
        />

        {/* Non-commissioner waiting message */}
        {!isCommissioner && league.phase === 'draft_recap' && (
          <Card className="mb-8" padding="md">
            <p className="text-center text-gray-600 text-lg">
              ⏳ Waiting for commissioner to start the season...
            </p>
          </Card>
        )}

        {/* Team Rosters */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {draft.teams.map((team) => {
            // 🆕 FIX: Use type guard to properly narrow Player type
            const roster = team.roster
              .map((pid) => allPlayers.find((p) => p.playerId === pid))
              .filter((p): p is Player => p !== undefined);

            return (
              <Card key={team.teamId} padding="none" className="overflow-hidden hover:shadow-xl transition-shadow">
                {/* Team Header */}
                <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
                  <h3 className="text-2xl font-bold text-white">
                    {team.displayName}
                  </h3>
                  <p className="text-primary-100 text-sm mt-1">
                    {roster.length} Players
                  </p>
                </div>

                {/* Team Analysis */}
                {teamAggregations[team.teamId] && (
                  <TeamAnalysis aggregation={teamAggregations[team.teamId]} />
                )}

                {/* Player List */}
                <div className="p-4 max-h-96 overflow-y-auto">
                  <div className="space-y-2">
                    {roster.map((player, idx) => (
                      <PlayerCard
                        key={player.playerId}
                        player={player}
                        playerIndex={idx}
                        teamAggregation={teamAggregations[team.teamId]}
                      />
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}