/**
 * Regular Season Page
 * Displays the results of the regular season simulation.
 */

import React, { useState, useEffect } from 'react';
import { useLeague } from '../context/LeagueContext';
import { PageContainer } from '../components/PageContainer';
import { Header } from '../components/Header';
import { GameCard } from '../components/GameCard';
import { StandingsTable } from '../components/StandingsTable';
import { Button } from '../components/ui/button';

export const RegularSeasonPage: React.FC = () => {
  const { league } = useLeague();
  const [revealedGames, setRevealedGames] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  const games = league?.regularSeasonResults?.games ?? [];
  const standings = league?.regularSeasonResults?.standings ?? [];
  const summary = league?.regularSeasonResults?.summary ?? '';

  useEffect(() => {
    if (isAnimating) {
      const interval = setInterval(() => {
        setRevealedGames(prev => {
          if (prev < games.length) {
            return prev + 1;
          }
          setIsAnimating(false);
          clearInterval(interval);
          return prev;
        });
      }, 800);
      return () => clearInterval(interval);
    }
  }, [games.length, isAnimating]);

  const handleSkipAnimation = () => {
    setIsAnimating(false);
    setRevealedGames(games.length);
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.slice(0, revealedGames).map(game => (
          <GameCard key={game.gameId} game={game} />
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
