import React, { useState } from 'react';
import { Player, DraftTeam, TradeProposal } from '@nba-draft-sim/shared';

interface TradePanelProps {
    teams: DraftTeam[];
    allPlayers: Player[];
    tradeProposals?: TradeProposal[];
    onTrade: (team1Id: string, team2Id: string, team1PlayerIds: string[], team2PlayerIds: string[]) => void;
    currentUserId?: string | null;
}

export const TradePanel: React.FC<TradePanelProps> = ({ teams, allPlayers, tradeProposals = [], onTrade, currentUserId }) => {
    const [team1Id, setTeam1Id] = useState<string>('');
    const [team2Id, setTeam2Id] = useState<string>('');
    const [team1PlayerIds, setTeam1PlayerIds] = useState<string[]>([]);
    const [team2PlayerIds, setTeam2PlayerIds] = useState<string[]>([]);

    const handleTrade = () => {
        if (!team1Id || !team2Id || team1PlayerIds.length === 0 || team2PlayerIds.length === 0) {
            return;
        }
        onTrade(team1Id, team2Id, team1PlayerIds, team2PlayerIds);
        // Reset state
        setTeam1PlayerIds([]);
        setTeam2PlayerIds([]);
        // We keep teams selected for convenience
    };

    const getPlayerById = (playerId: string) => {
        return allPlayers.find(p => p.playerId === playerId);
    };

    const isTradeValid = team1Id && team2Id && team1PlayerIds.length > 0 && team2PlayerIds.length > 0;

    return (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 h-full flex flex-col">
            <h2 className="text-xl font-bold mb-4 text-white">Trade Center</h2>

            {/* Incoming Offers & Notifications */}
            <div className="mb-6 bg-gray-900/50 rounded-lg p-3 border border-gray-700 flex-none max-h-60 overflow-y-auto">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2 sticky top-0 bg-gray-900/90 py-1 backdrop-blur-sm z-10">
                    Incoming Offers
                </h3>
                {tradeProposals.length > 0 ? (
                    <div className="space-y-2">
                        {tradeProposals.map(proposal => (
                            <div key={proposal.proposalId} className="bg-gray-800 p-2 rounded text-sm border border-gray-600">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-semibold text-blue-300">
                                        {teams.find(t => t.teamId === proposal.fromTeamId)?.displayName || 'Unknown'}
                                    </span>
                                    <span className="text-gray-500">→</span>
                                    <span className="font-semibold text-blue-300">
                                        {teams.find(t => t.teamId === proposal.toTeamId)?.displayName || 'Unknown'}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-400">
                                    {proposal.status} • Expires in {Math.max(0, Math.floor((new Date(proposal.expiresAt).getTime() - Date.now()) / 1000 / 60))}m
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-4 text-gray-500 text-sm">
                        No new trade offers pending
                    </div>
                )}
            </div>

            {/* Trade Creator */}
            <div className="flex-1 flex flex-col">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Propose Trade
                </h3>

                <div className="space-y-4 flex-1">
                    {/* Team 1 */}
                    <div>
                        <select
                            value={team1Id}
                            onChange={(e) => {
                                setTeam1Id(e.target.value);
                                setTeam1PlayerIds([]);
                            }}
                            className="w-full bg-gray-700 text-white border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">Select Sending Team...</option>
                            {teams.map(team => (
                                <option
                                    key={team.teamId}
                                    value={team.teamId}
                                    disabled={team.teamId === team2Id}
                                >
                                    {team.displayName} {team.userId === currentUserId ? '(You)' : ''}
                                </option>
                            ))}
                        </select>

                        {team1Id && (
                            <div className="mt-2 text-white bg-gray-900 border border-gray-700 rounded h-32 overflow-y-auto">
                                {teams.find(t => t.teamId === team1Id)?.roster.map(playerId => {
                                    const player = getPlayerById(playerId);
                                    const isSelected = team1PlayerIds.includes(playerId);
                                    return (
                                        <div
                                            key={playerId}
                                            onClick={() => {
                                                if (isSelected) setTeam1PlayerIds(ids => ids.filter(id => id !== playerId));
                                                else setTeam1PlayerIds(ids => [...ids, playerId]);
                                            }}
                                            className={`flex items-center px-3 py-1.5 cursor-pointer text-sm hover:bg-gray-800 ${isSelected ? 'bg-blue-900/30 text-blue-200' : 'text-gray-300'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                readOnly
                                                className="mr-2 pointer-events-none"
                                            />
                                            <span className="truncate">{player?.name || playerId}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-center text-gray-500">
                        ↓ Sends to ↓
                    </div>

                    {/* Team 2 */}
                    <div>
                        <select
                            value={team2Id}
                            onChange={(e) => {
                                setTeam2Id(e.target.value);
                                setTeam2PlayerIds([]);
                            }}
                            className="w-full bg-gray-700 text-white border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">Select Receiving Team...</option>
                            {teams.map(team => (
                                <option
                                    key={team.teamId}
                                    value={team.teamId}
                                    disabled={team.teamId === team1Id}
                                >
                                    {team.displayName} {team.userId === currentUserId ? '(You)' : ''}
                                </option>
                            ))}
                        </select>

                        {team2Id && (
                            <div className="mt-2 text-white bg-gray-900 border border-gray-700 rounded h-32 overflow-y-auto">
                                {teams.find(t => t.teamId === team2Id)?.roster.map(playerId => {
                                    const player = getPlayerById(playerId);
                                    const isSelected = team2PlayerIds.includes(playerId);
                                    return (
                                        <div
                                            key={playerId}
                                            onClick={() => {
                                                if (isSelected) setTeam2PlayerIds(ids => ids.filter(id => id !== playerId));
                                                else setTeam2PlayerIds(ids => [...ids, playerId]);
                                            }}
                                            className={`flex items-center px-3 py-1.5 cursor-pointer text-sm hover:bg-gray-800 ${isSelected ? 'bg-blue-900/30 text-blue-200' : 'text-gray-300'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                readOnly
                                                className="mr-2 pointer-events-none"
                                            />
                                            <span className="truncate">{player?.name || playerId}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Button */}
                <div className="mt-4 pt-4 border-t border-gray-700">
                    <button
                        onClick={handleTrade}
                        disabled={!isTradeValid}
                        className={`w-full py-2 px-4 rounded font-medium transition-colors ${isTradeValid
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        Propose Trade
                    </button>
                </div>
            </div>
        </div>
    );
};
