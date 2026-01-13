
import React from 'react';
import { Standings } from '@nba-draft-sim/shared';

interface StandingsTableProps {
  standings: Standings[];
}

export const StandingsTable: React.FC<StandingsTableProps> = ({ standings }) => {
  // Sort standings by wins in descending order
  const sortedStandings = [...standings].sort((a, b) => b.wins - a.wins);

  return (
    <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
      <table className="w-full text-sm text-left text-gray-400">
        <thead className="text-xs uppercase bg-gray-700 text-gray-400">
          <tr>
            <th scope="col" className="py-3 px-6">
              Rank
            </th>
            <th scope="col" className="py-3 px-6">
              Team
            </th>
            <th scope="col" className="py-3 px-6">
              Wins
            </th>
            <th scope="col" className="py-3 px-6">
              Losses
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedStandings.map((team, index) => (
            <tr key={team.teamId} className="border-b bg-gray-800 border-gray-700">
              <td className="py-4 px-6">{index + 1}</td>
              <td className="py-4 px-6 font-medium whitespace-nowrap text-white">
                {/* TODO: Replace teamId with a human-readable team name once available in the data */}
                {team.teamId}
              </td>
              <td className="py-4 px-6">{team.wins}</td>
              <td className="py-4 px-6">{team.losses}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
