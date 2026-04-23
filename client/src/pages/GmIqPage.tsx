import React from 'react';
import { featureFlags } from '@nba-draft-sim/shared';
import { OffseasonEntryCard } from '../components/gm/OffseasonEntryCard';
import { useAdvancedModules } from '../features/recommendations/useAdvancedModules';
import { TrackPageLayout } from './TrackPageLayout';

export function GmIqPage(): JSX.Element {
  const advancedModules = useAdvancedModules();
  const offseasonModule = advancedModules.data?.find(
    (module) => module.id === 'offseason-simulator'
  );

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pt-12">
        <OffseasonEntryCard
          enabled={
            featureFlags.offseasonFoundationEnabled &&
            featureFlags.offseasonTeamContextEnabled
          }
          recommended={Boolean(offseasonModule)}
          currentCompletedLessons={
            offseasonModule?.current_completed_lessons ?? 0
          }
          minimumCompletedLessons={
            offseasonModule?.minimum_completed_lessons ?? 3
          }
        />
      </div>
      <TrackPageLayout
        roleLens="gm"
        headline="Build a roster that solves real playoff problems"
        description="GM IQ lessons focus on team-building, asset management, prospect risk, and fit-based decisions that age well beyond the headline move."
      />
    </>
  );
}
