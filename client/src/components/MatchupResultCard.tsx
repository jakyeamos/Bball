import React from 'react';
import { UIMatchupResult } from '@nba-draft-sim/shared';

// A simple utility to get a narrative summary
const getNarrative = (matchup: UIMatchupResult) => {
  const score = matchup.seriesScore.split('-').map(Number);
  const diff = Math.abs(score[0] - score[1]);

  if (diff >= 4) return "A dominant sweep.";
  if (diff >= 2) return "A convincing victory.";
  return "A hard-fought battle to the end.";
};

interface MatchupResultCardProps {
  matchup: UIMatchupResult;
  getTeamName: (id: string) => string;
}

export const MatchupResultCard: React.FC<MatchupResultCardProps> = ({ matchup, getTeamName }) => {
  const { teamAId, teamBId, result, seriesScore } = matchup;

  const isTeamAWin = result.winner === 'A';
  const winnerId = isTeamAWin ? teamAId : teamBId;
  const loserId = isTeamAWin ? teamBId : teamAId;

  return (
    <div className="bg-gray-800 p-3 rounded border border-gray-700 text-sm animate-in slide-in-from-right-4 fade-in duration-300">
      <div className="flex justify-between items-center text-xs text-gray-400 mb-2 uppercase tracking-wide">
        <span>Matchup {matchup.matchupIndex}</span>
        <span className="font-bold text-lg text-white">{seriesScore}</span>
      </div>

      {/* WINNER */}
      <div className="flex justify-between items-center p-2 rounded bg-green-900/50 border border-green-700">
        <span className="font-bold text-green-300">{getTeamName(winnerId)}</span>
        <span className="text-xs text-green-300">WINNER</span>
      </div>

      {/* LOSER */}
      <div className="flex justify-between items-center p-2 mt-1 rounded bg-red-900/50">
        <span className="text-gray-400">{getTeamName(loserId)}</span>
        <span className="text-xs text-gray-500"></span>
      </div>

      {/* NARRATIVE */}
      <div className="pt-2 mt-2 border-t border-gray-700 text-xs text-blue-300 text-center italic">
        {getNarrative(matchup)}
      </div>
    </div>
  );
};
