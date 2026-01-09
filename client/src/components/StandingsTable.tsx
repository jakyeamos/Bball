
import React from 'react';
import { TeamRecord } from '@nba-draft-sim/shared';
import { Card } from './Card';
import { useApp } from '../context/AppContext';

interface StandingsTableProps {
  standings: TeamRecord[];
}

export const StandingsTable: React.FC<StandingsTableProps> = ({ standings }) => {
  const { league } = useApp();
  const teams = league?.draftState?.teams ?? [];

  const getTeamName = (teamId: string) => {
    const team = teams.find(t => t.teamId === teamId);
    return team?.displayName ?? teamId;
  };

  return (
    <Card>
      <h2 className="text-xl font-bold mb-4">Standings</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Team
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Wins
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Losses
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Win %
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {standings.map((team) => (
              <tr key={team.teamId}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{getTeamName(team.teamId)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{team.wins}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{team.losses}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{team.winPct.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
