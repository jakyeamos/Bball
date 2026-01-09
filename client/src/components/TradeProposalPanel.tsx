/**
 * Trade Proposal Panel - Phase 2.5
 * Propose trades and respond to incoming proposals
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { wsService } from '../services/websocket';
import {
  Player,
  DraftTeam,
  TradeProposal,
  TradeProposalStatus,
} from '@nba-draft-sim/shared';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

interface TradeProposalPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TradeProposalPanel: React.FC<TradeProposalPanelProps> = ({ isOpen, onClose }) => {
  const { draft, league, allPlayers, userId } = useApp();

  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [myPlayerIds, setMyPlayerIds] = useState<string[]>([]);
  const [theirPlayerIds, setTheirPlayerIds] = useState<string[]>([]);

  const myTeam = useMemo(() => {
    if (!draft || !userId) return null;
    return draft.teams.find(t => t.userId === userId);
  }, [draft, userId]);

  const otherTeams = useMemo(() => {
    if (!draft || !myTeam) return [];
    return draft.teams.filter(t => t.teamId !== myTeam.teamId);
  }, [draft, myTeam]);

  const selectedTeam = useMemo(() => {
    if (!selectedTeamId || !draft) return null;
    return draft.teams.find(t => t.teamId === selectedTeamId);
  }, [selectedTeamId, draft]);

  const myRoster = useMemo(() => {
    if (!myTeam || !allPlayers) return [];
    return myTeam.roster
      .map(pid => allPlayers.find(p => p.playerId === pid))
      .filter((p): p is Player => p !== undefined);
  }, [myTeam, allPlayers]);

  const theirRoster = useMemo(() => {
    if (!selectedTeam || !allPlayers) return [];
    return selectedTeam.roster
      .map(pid => allPlayers.find(p => p.playerId === pid))
      .filter((p): p is Player => p !== undefined);
  }, [selectedTeam, allPlayers]);

  const pendingProposals = useMemo(() => {
    if (!league || !myTeam) return [];
    return league.tradeProposals.filter(
      p => p.status === 'pending' && (p.fromTeamId === myTeam.teamId || p.toTeamId === myTeam.teamId)
    );
  }, [league, myTeam]);

  const handleProposeTrade = () => {
    if (!myTeam || !selectedTeamId || myPlayerIds.length === 0 || theirPlayerIds.length === 0) {
      alert('Please select players from both teams');
      return;
    }

    wsService.emit('trade:propose', {
      toTeamId: selectedTeamId,
      fromPlayerIds: myPlayerIds,
      toPlayerIds: theirPlayerIds,
    });

    // Reset form
    setSelectedTeamId('');
    setMyPlayerIds([]);
    setTheirPlayerIds([]);
  };

  const handleRespondToTrade = (proposalId: string, accept: boolean) => {
    wsService.emit('trade:respond', { proposalId, accept });
  };

  const handleCancelProposal = (proposalId: string) => {
    wsService.emit('trade:cancel_proposal', { proposalId });
  };

  const getPlayerName = (playerId: string): string => {
    const player = allPlayers.find(p => p.playerId === playerId);
    return player?.name || playerId;
  };

  const getTeamName = (teamId: string): string => {
    const team = draft?.teams.find(t => t.teamId === teamId);
    return team?.displayName || teamId;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-primary-600 text-white p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Trade Proposals</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Pending Proposals */}
          {pendingProposals.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                Pending Proposals ({pendingProposals.length})
              </h3>
              <div className="space-y-3">
                {pendingProposals.map(proposal => {
                  const isMyProposal = proposal.fromTeamId === myTeam?.teamId;
                  const otherTeamId = isMyProposal ? proposal.toTeamId : proposal.fromTeamId;

                  return (
                    <Card key={proposal.proposalId} padding="md" className="border-2 border-orange-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-gray-900">
                              {isMyProposal ? 'You' : getTeamName(proposal.fromTeamId)}
                            </span>
                            <span className="text-gray-500">→</span>
                            <span className="font-bold text-gray-900">
                              {isMyProposal ? getTeamName(proposal.toTeamId) : 'You'}
                            </span>
                            <span className="ml-auto text-xs text-gray-500">
                              Expires in {Math.max(0, Math.floor((new Date(proposal.expiresAt).getTime() - Date.now()) / 1000))}s
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="font-medium text-gray-700 mb-1">
                                {isMyProposal ? 'You send:' : 'You receive:'}
                              </div>
                              <ul className="list-disc list-inside text-gray-600">
                                {proposal.fromPlayerIds.map(pid => (
                                  <li key={pid}>{getPlayerName(pid)}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <div className="font-medium text-gray-700 mb-1">
                                {isMyProposal ? 'You receive:' : 'You send:'}
                              </div>
                              <ul className="list-disc list-inside text-gray-600">
                                {proposal.toPlayerIds.map(pid => (
                                  <li key={pid}>{getPlayerName(pid)}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>

                        <div className="ml-4 flex flex-col gap-2">
                          {isMyProposal ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleCancelProposal(proposal.proposalId)}
                            >
                              Cancel
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleRespondToTrade(proposal.proposalId, true)}
                              >
                                Accept
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleRespondToTrade(proposal.proposalId, false)}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Propose New Trade */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">Propose New Trade</h3>

            {/* Team Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trade with:
              </label>
              <select
                value={selectedTeamId}
                onChange={(e) => {
                  setSelectedTeamId(e.target.value);
                  setTheirPlayerIds([]);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select a team...</option>
                {otherTeams.map(team => (
                  <option key={team.teamId} value={team.teamId}>
                    {team.displayName}
                  </option>
                ))}
              </select>
            </div>

            {selectedTeamId && (
              <div className="grid grid-cols-2 gap-4">
                {/* My Players */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your players ({myPlayerIds.length} selected)
                  </label>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-64 overflow-y-auto space-y-2">
                    {myRoster.map(player => {
                      const isSelected = myPlayerIds.includes(player.playerId);
                      return (
                        <label
                          key={player.playerId}
                          className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                            isSelected ? 'bg-primary-100 border border-primary-500' : 'hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setMyPlayerIds([...myPlayerIds, player.playerId]);
                              } else {
                                setMyPlayerIds(myPlayerIds.filter(id => id !== player.playerId));
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm font-medium">{player.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Their Players */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {getTeamName(selectedTeamId)}'s players ({theirPlayerIds.length} selected)
                  </label>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-64 overflow-y-auto space-y-2">
                    {theirRoster.map(player => {
                      const isSelected = theirPlayerIds.includes(player.playerId);
                      return (
                        <label
                          key={player.playerId}
                          className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                            isSelected ? 'bg-primary-100 border border-primary-500' : 'hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTheirPlayerIds([...theirPlayerIds, player.playerId]);
                              } else {
                                setTheirPlayerIds(theirPlayerIds.filter(id => id !== player.playerId));
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm font-medium">{player.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            {selectedTeamId && (
              <div className="mt-4">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleProposeTrade}
                  disabled={myPlayerIds.length === 0 || theirPlayerIds.length === 0}
                >
                  Propose Trade
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
