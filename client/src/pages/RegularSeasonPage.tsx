/**
 * Regular Season Page
 * Displays the results of the regular season simulation.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useLeague } from '../context/LeagueContext';
import { PageContainer } from '../components/PageContainer';
import { Header } from '../components/Header';
import { StandingsTable } from '../components/StandingsTable';
import { Button } from '../components/Button';
import { MatchupCard } from '../components/MatchupCard';
import { RegularSeasonGame } from '@nba-draft-sim/shared';

interface Matchup {
  matchupId: string;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  games: RegularSeasonGame[];
}

const groupGamesIntoMatchups = (
  games: RegularSeasonGame[],
  teamMap: Record<string, string>
): Matchup[] => {
  const matchups: Record<string, Matchup> = {};

  games.forEach(game => {
    const teamIds = [game.teamAId, game.teamBId].sort();
    const matchupId = teamIds.join('-');

    if (!matchups[matchupId]) {
      matchups[matchupId] = {
        matchupId,
        teamAId: teamIds[0],
        teamBId: teamIds[1],
        teamAName: teamMap[teamIds[0]] || 'Unknown Team',
        teamBName: teamMap[teamIds[1]] || 'Unknown Team',
        games: [],
      };
    }
    matchups[matchupId].games.push(game);
  });

  return Object.values(matchups);
};

export const RegularSeasonPage: React.FC = () => {
  const { league } = useLeague();
  const [revealedMatchups, setRevealedMatchups] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  const games = league?.regularSeasonResults?.games ?? [];
  const standings = league?.regularSeasonResults?.standings ?? [];
  const summary = league?.regularSeasonResults?.summary ?? '';

  const teamMap = useMemo(() => {
    return league?.teams.reduce((acc, team) => {
      acc[team.teamId] = team.displayName;
      return acc;
    }, {} as Record<string, string>);
  }, [league?.teams]);

  const matchups = useMemo(
    () => (teamMap ? groupGamesIntoMatchups(games, teamMap) : []),
    [games, teamMap]
  );

  useEffect(() => {
    if (isAnimating) {
      const interval = setInterval(() => {
        setRevealedMatchups(prev => {
          if (prev < matchups.length) {
            return prev + 1;
          }
          setIsAnimating(false);
          clearInterval(interval);
          return prev;
        });
      }, 200); // Faster reveal for matchups
      return () => clearInterval(interval);
    }
  }, [matchups.length, isAnimating]);

  const handleSkipAnimation = () => {
    setIsAnimating(false);
    setRevealedMatchups(matchups.length);
  };

  return (
    <PageContainer>
      <Header
        title="Regular Season"
        subtitle="The regular season is underway! Watch the games unfold."
      />
      <div className="flex justify-end mb-4">
        {isAnimating && (
          <Button onClick={handleSkipAnimation}>Skip Animation</Button>
        )}
      </div>
      <div className="space-y-4">
        {matchups
          .slice(0, revealedMatchups)
          .map(matchup => (
            <MatchupCard
              key={matchup.matchupId}
              matchup={matchup}
              teamAName={matchup.teamAName}
              teamBName={matchup.teamBName}
            />
          ))}
      </div>
      {!isAnimating && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-center mb-4">{summary}</h2>
          <StandingsTable standings={standings} />
        </div>
      )}
    </PageContainer>
  );
};
