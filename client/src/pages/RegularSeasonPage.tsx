/**
 * Regular Season Page
 * Displays the results of the regular season simulation.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useLeague } from '../context/LeagueContext';
import { PageContainer } from '../components/PageContainer';
import { Header } from '../components/Header';
import { MatchupCard } from '../components/MatchupCard';
import { StandingsTable } from '../components/StandingsTable';
import { Button } from '../components/Button';
import { groupGamesByMatchup } from '../utils/groupGamesByMatchup';

export const RegularSeasonPage: React.FC = () => {
  const { league } = useLeague();
  const [revealedMatchups, setRevealedMatchups] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  const games = league?.regularSeasonResults?.games ?? [];
  const standings = league?.regularSeasonResults?.standings ?? [];
  const summary = league?.regularSeasonResults?.summary ?? '';

  const matchups = useMemo(() => groupGamesByMatchup(games), [games]);

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
      }, 1200); // Slower reveal for larger matchup cards
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
        subtitle="The regular season is underway! Watch the matchups unfold."
      />
      <div className="flex justify-end mb-4">
        {isAnimating && (
          <Button onClick={handleSkipAnimation}>Skip Animation</Button>
        )}
      </div>
      <div className="space-y-4">
        {matchups.slice(0, revealedMatchups).map(matchup => (
          <MatchupCard key={matchup.matchupId} matchup={matchup} />
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
