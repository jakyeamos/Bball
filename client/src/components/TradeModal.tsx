import React, { useState } from 'react';
import { Player, Team } from '@nba-draft-sim/shared';

interface TradeModalProps {
  teams: Team[];
  allPlayers: Player[];
  isOpen: boolean;
  onClose: () => void;
  onTrade: (team1Id: string, team2Id: string, team1PlayerIds: string[], team2PlayerIds: string[]) => void;
}

export const TradeModal: React.FC<TradeModalProps> = ({ teams, allPlayers, isOpen, onClose, onTrade }) => {
  const [team1Id, setTeam1Id] = useState<string>('');
  const [team2Id, setTeam2Id] = useState<string>('');
  const [team1PlayerIds, setTeam1PlayerIds] = useState<string[]>([]);
  const [team2PlayerIds, setTeam2PlayerIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleTrade = () => {
    onTrade(team1Id, team2Id, team1PlayerIds, team2PlayerIds);
    onClose();
  };

  const getPlayerById = (playerId: string) => {
    return allPlayers.find(p => p.playerId === playerId);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
      <div className="relative mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3 text-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Propose a Trade</h3>
          <div className="mt-2 px-7 py-3">
            <div className="flex justify-between">
              {/* Team 1 Selection */}
              <div className="w-1/2 pr-2">
                <select onChange={(e) => setTeam1Id(e.target.value)} className="w-full p-2 border rounded">
                  <option value="">Select Team 1</option>
                  {teams.map(team => <option key={team.teamId} value={team.teamId}>{team.displayName}</option>)}
                </select>
                {team1Id && (
                  <div className="mt-2 border p-2 h-64 overflow-y-auto">
                    {teams.find(t => t.teamId === team1Id)?.roster.map(playerId => {
                      const player = getPlayerById(playerId);
                      return (
                        <div key={playerId}>
                          <input
                            type="checkbox"
                            value={playerId}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTeam1PlayerIds([...team1PlayerIds, playerId]);
                              } else {
                                setTeam1PlayerIds(team1PlayerIds.filter(id => id !== playerId));
                              }
                            }}
                          />
                          {player?.name}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {/* Team 2 Selection */}
              <div className="w-1/2 pl-2">
                <select onChange={(e) => setTeam2Id(e.target.value)} className="w-full p-2 border rounded">
                  <option value="">Select Team 2</option>
                  {teams.map(team => <option key={team.teamId} value={team.teamId}>{team.displayName}</option>)}
                </select>
                {team2Id && (
                  <div className="mt-2 border p-2 h-64 overflow-y-auto">
                    {teams.find(t => t.teamId === team2Id)?.roster.map(playerId => {
                      const player = getPlayerById(playerId);
                      return (
                        <div key={playerId}>
                          <input
                            type="checkbox"
                            value={playerId}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTeam2PlayerIds([...team2PlayerIds, playerId]);
                              } else {
                                setTeam2PlayerIds(team2PlayerIds.filter(id => id !== playerId));
                              }
                            }}
                          />
                          {player?.name}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="items-center px-4 py-3">
            <button
              onClick={handleTrade}
              className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Propose Trade
            </button>
            <button
              onClick={onClose}
              className="mt-2 px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
