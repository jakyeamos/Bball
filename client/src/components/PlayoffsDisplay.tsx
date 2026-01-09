import React from 'react';
// FIXED: Changed 'Team' to 'DraftTeam' - Team type doesn't exist in shared types
import { PlayoffResults, DraftTeam } from '@nba-draft-sim/shared';
import { Card } from './Card';

interface PlayoffsDisplayProps {
  playoffResults: PlayoffResults;
  teams: DraftTeam[];  // FIXED: Changed Team[] to DraftTeam[]
}

// FIXED: Changed Team[] to DraftTeam[]
const getTeamName = (teamId: string, teams: DraftTeam[]) => {
  return teams.find(t => t.teamId === teamId)?.displayName || teamId;
};

export const PlayoffsDisplay: React.FC<PlayoffsDisplayProps> = ({ playoffResults, teams }) => {
  const { semiFinal1, semiFinal2, finals, champion } = playoffResults;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-center mb-4">Playoffs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Semifinals */}
          <Card>
            <h3 className="font-bold text-lg mb-2">Semifinal 1</h3>
            <p>{getTeamName(semiFinal1.teamAId, teams)} vs {getTeamName(semiFinal1.teamBId, teams)}</p>
            <p>Winner: {getTeamName(semiFinal1.winner, teams)}</p>
            <p>Score: {semiFinal1.winsA} - {semiFinal1.winsB}</p>
            <p className="text-sm mt-2">{semiFinal1.seriesEditorial}</p>
          </Card>
          <Card>
            <h3 className="font-bold text-lg mb-2">Semifinal 2</h3>
            <p>{getTeamName(semiFinal2.teamAId, teams)} vs {getTeamName(semiFinal2.teamBId, teams)}</p>
            <p>Winner: {getTeamName(semiFinal2.winner, teams)}</p>
            <p>Score: {semiFinal2.winsA} - {semiFinal2.winsB}</p>
            <p className="text-sm mt-2">{semiFinal2.seriesEditorial}</p>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-center mb-4">Finals</h2>
        <div className="flex justify-center">
          <Card>
            <h3 className="font-bold text-lg mb-2">Finals</h3>
            <p>{getTeamName(finals.teamAId, teams)} vs {getTeamName(finals.teamBId, teams)}</p>
            <p>Winner: {getTeamName(finals.winner, teams)}</p>
            <p>Score: {finals.winsA} - {finals.winsB}</p>
            <p className="text-sm mt-2">{finals.seriesEditorial}</p>
          </Card>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-3xl font-bold">🏆 Champion: {getTeamName(champion, teams)} 🏆</h2>
        <p className="text-lg mt-2">{playoffResults.championshipEditorial}</p>
      </div>
    </div>
  );
};