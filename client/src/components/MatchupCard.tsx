
import React, { useState } from 'react';
import { RegularSeasonGame } from '@nba-draft-sim/shared';
import { Card } from './Card';
import { GameCard } from './GameCard';

interface Matchup {
  matchupId: string;
  teamAId: string;
  teamBId: string;
  games: RegularSeasonGame[];
}

interface MatchupCardProps {
  matchup: Matchup;
  teamAName: string;
  teamBName: string;
}

export const MatchupCard: React.FC<MatchupCardProps> = ({
  matchup,
  teamAName,
  teamBName,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const winsA = matchup.games.filter(g => {
    const winnerId = g.result.winner === 'A' ? g.teamAId : g.teamBId;
    return winnerId === matchup.teamAId;
  }).length;
  const winsB = matchup.games.length - winsA;

  let seriesScoreText;
  if (winsA > winsB) {
    seriesScoreText = `${teamAName} leads ${winsA}-${winsB}`;
  } else if (winsB > winsA) {
    seriesScoreText = `${teamBName} leads ${winsB}-${winsA}`;
  } else {
    seriesScoreText = `Series tied ${winsA}-${winsB}`;
  }

  return (
    <Card>
      <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <h3 className="text-lg font-bold">{teamAName} vs {teamBName}</h3>
        <div className="text-sm font-semibold">{seriesScoreText}</div>
      </div>
      {isExpanded && (
        <div className="mt-4 space-y-2">
          {matchup.games.map(game => (
            <GameCard key={game.gameId} game={game} />
          ))}
        </div>
      )}
    </Card>
  );
};
