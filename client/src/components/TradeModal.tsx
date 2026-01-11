import React, { useState, useEffect } from 'react';
// FIXED: Changed 'Team' to 'DraftTeam' - Team type doesn't exist in shared types
import { Player, DraftTeam } from '@nba-draft-sim/shared';

interface TradeModalProps {
  teams: DraftTeam[];  // FIXED: Changed Team[] to DraftTeam[]
  allPlayers: Player[];
  isOpen: boolean;
  onClose: () => void;
  onTrade: (team1Id: string, team2Id: string, team1PlayerIds: string[], team2PlayerIds: string[]) => void;
}

export const TradeModal: React.FC<TradeModalProps> = React.memo(({ teams, allPlayers, isOpen, onClose, onTrade }) => {
  const [team1Id, setTeam1Id] = useState<string>('');
  const [team2Id, setTeam2Id] = useState<string>('');
  const [team1PlayerIds, setTeam1PlayerIds] = useState<string[]>([]);
  const [team2PlayerIds, setTeam2PlayerIds] = useState<string[]>([]);

  // Only log when modal is actually open
  useEffect(() => {
    if (isOpen) {
      console.log('🔄 TradeModal opened:', {
        teamsCount: teams?.length,
        allPlayersCount: allPlayers?.length,
      });
    }
  }, [isOpen, teams?.length, allPlayers?.length]);

  if (!isOpen) return null;

  const handleTrade = () => {
    console.log('🔄 handleTrade called:', {
      team1Id,
      team2Id,
      team1PlayerIds,
      team2PlayerIds
    });

    if (!team1Id || !team2Id || team1PlayerIds.length === 0 || team2PlayerIds.length === 0) {
      console.warn('⚠️ Trade validation failed - missing data');
      return; // Don't allow empty trades
    }

    console.log('✅ Trade validation passed - executing trade');
    onTrade(team1Id, team2Id, team1PlayerIds, team2PlayerIds);

    // Reset state
    setTeam1Id('');
    setTeam2Id('');
    setTeam1PlayerIds([]);
    setTeam2PlayerIds([]);
    onClose();
  };

  const handleTeam1Change = (newTeamId: string) => {
    console.log('🔄 Team 1 changed:', newTeamId);
    setTeam1Id(newTeamId);
    setTeam1PlayerIds([]); // Reset player selections when team changes
  };

  const handleTeam2Change = (newTeamId: string) => {
    console.log('🔄 Team 2 changed:', newTeamId);
    setTeam2Id(newTeamId);
    setTeam2PlayerIds([]); // Reset player selections when team changes
  };

  const getPlayerById = (playerId: string) => {
    const player = allPlayers.find(p => p.playerId === playerId);
    if (!player) {
      console.warn('⚠️ Player not found:', playerId);
    }
    return player;
  };

  const isTradeValid = team1Id && team2Id && team1PlayerIds.length > 0 && team2PlayerIds.length > 0;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
      <div className="relative mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3 text-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Propose a Trade</h3>
          <div className="mt-2 px-7 py-3">
            <div className="flex justify-between">
              {/* Team 1 Selection */}
              <div className="w-1/2 pr-2">
                <select 
                  value={team1Id}
                  onChange={(e) => handleTeam1Change(e.target.value)} 
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select Team 1</option>
                  {teams.map(team => (
                    <option 
                      key={team.teamId} 
                      value={team.teamId}
                      disabled={team.teamId === team2Id}
                    >
                      {team.displayName}
                    </option>
                  ))}
                </select>
                {team1Id && (
                  <div className="mt-2 border p-2 h-64 overflow-y-auto text-left">
                    {teams.find(t => t.teamId === team1Id)?.roster.map(playerId => {
                      const player = getPlayerById(playerId);
                      const isSelected = team1PlayerIds.includes(playerId);
                      return (
                        <div key={playerId} className="flex items-center py-1 hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            value={playerId}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTeam1PlayerIds([...team1PlayerIds, playerId]);
                              } else {
                                setTeam1PlayerIds(team1PlayerIds.filter(id => id !== playerId));
                              }
                            }}
                            className="mr-2"
                          />
                          <span className={isSelected ? 'font-semibold text-blue-600' : ''}>
                            {player?.name || playerId}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {team1PlayerIds.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    Selected: {team1PlayerIds.length} player(s)
                  </div>
                )}
              </div>

              {/* Team 2 Selection */}
              <div className="w-1/2 pl-2">
                <select 
                  value={team2Id}
                  onChange={(e) => handleTeam2Change(e.target.value)} 
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select Team 2</option>
                  {teams.map(team => (
                    <option 
                      key={team.teamId} 
                      value={team.teamId}
                      disabled={team.teamId === team1Id}
                    >
                      {team.displayName}
                    </option>
                  ))}
                </select>
                {team2Id && (
                  <div className="mt-2 border p-2 h-64 overflow-y-auto text-left">
                    {teams.find(t => t.teamId === team2Id)?.roster.map(playerId => {
                      const player = getPlayerById(playerId);
                      const isSelected = team2PlayerIds.includes(playerId);
                      return (
                        <div key={playerId} className="flex items-center py-1 hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            value={playerId}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTeam2PlayerIds([...team2PlayerIds, playerId]);
                              } else {
                                setTeam2PlayerIds(team2PlayerIds.filter(id => id !== playerId));
                              }
                            }}
                            className="mr-2"
                          />
                          <span className={isSelected ? 'font-semibold text-blue-600' : ''}>
                            {player?.name || playerId}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {team2PlayerIds.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    Selected: {team2PlayerIds.length} player(s)
                  </div>
                )}
              </div>
            </div>

            {/* Trade Summary */}
            {isTradeValid && (
              <div className="mt-4 p-3 bg-gray-50 rounded border">
                <h4 className="font-semibold mb-2">Trade Summary</h4>
                <div className="flex justify-between text-sm">
                  <div>
                    <strong>{teams.find(t => t.teamId === team1Id)?.displayName} sends:</strong>
                    <ul className="list-disc list-inside">
                      {team1PlayerIds.map(id => (
                        <li key={id}>{getPlayerById(id)?.name}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="text-2xl self-center">⇄</div>
                  <div>
                    <strong>{teams.find(t => t.teamId === team2Id)?.displayName} sends:</strong>
                    <ul className="list-disc list-inside">
                      {team2PlayerIds.map(id => (
                        <li key={id}>{getPlayerById(id)?.name}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="items-center px-4 py-3">
            <button
              onClick={handleTrade}
              disabled={!isTradeValid}
              className={`px-4 py-2 text-white text-base font-medium rounded-md w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isTradeValid 
                  ? 'bg-blue-500 hover:bg-blue-700' 
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {isTradeValid ? 'Execute Trade' : 'Select players from both teams'}
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
});