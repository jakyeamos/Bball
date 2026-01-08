/**
 * Playoff Results Page
 * Displays the results of the playoff simulation.
 */

import React, { useState, useEffect } from 'react';
import { useLeague } from '../context/LeagueContext';
import { PageContainer } from '../components/PageContainer';
import { Header } from '../components/Header';
import { SeriesCard } from '../components/SeriesCard';
import { ChampionshipBanner } from '../components/ChampionshipBanner';

export const PlayoffResultsPage: React.FC = () => {
  const { league } = useLeague();
  const [revealedSemis, setRevealedSemis] = useState(0);
  const [revealedFinals, setRevealedFinals] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  const semiFinal1 = league?.playoffResults?.semiFinal1;
  const semiFinal2 = league?.playoffResults?.semiFinal2;
  const finals = league?.playoffResults?.finals;
  const champion = league?.playoffResults?.champion;
  const championshipEditorial = league?.playoffResults?.championshipEditorial ?? '';

  useEffect(() => {
    const semi1Timer = setTimeout(() => {
      setRevealedSemis(1);
    }, 1000);
    const semi2Timer = setTimeout(() => {
      setRevealedSemis(2);
    }, 2000);
    const finalsTimer = setTimeout(() => {
      setRevealedFinals(true);
    }, 3000);
    const bannerTimer = setTimeout(() => {
      setShowBanner(true);
    }, 4000);

    return () => {
      clearTimeout(semi1Timer);
      clearTimeout(semi2Timer);
      clearTimeout(finalsTimer);
      clearTimeout(bannerTimer);
    };
  }, []);

  return (
    <PageContainer>
      <Header
        title="Playoffs"
        subtitle="The championship is on the line. See who takes home the trophy."
      />
      <div className="flex flex-col items-center">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          {semiFinal1 && revealedSemis >= 1 && <SeriesCard series={semiFinal1} />}
          {semiFinal2 && revealedSemis >= 2 && <SeriesCard series={semiFinal2} />}
        </div>
        <div className="mt-8">
          {finals && revealedFinals && <SeriesCard series={finals} isFinals />}
        </div>
        <div className="mt-8 w-full max-w-4xl">
          {champion && showBanner && (
            <ChampionshipBanner
              championId={champion}
              editorial={championshipEditorial}
            />
          )}
        </div>
      </div>
    </PageContainer>
  );
};
