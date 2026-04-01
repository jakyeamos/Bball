import React from 'react';
import { Link } from 'react-router-dom';
import { RoleLens, featureFlags } from '@nba-draft-sim/shared';
import { useLessons } from '../features/learning/queries';
import { useProfileMetrics } from '../features/profile/useProfileMetrics';

const TRACK_LABELS: Record<RoleLens, string> = {
  player: 'Player IQ',
  coach: 'Coach IQ',
  gm: 'GM IQ',
};

interface TrackPageLayoutProps {
  roleLens: RoleLens;
  headline: string;
  description: string;
}

export function TrackPageLayout({
  roleLens,
  headline,
  description,
}: TrackPageLayoutProps) {
  const lessonsQuery = useLessons(roleLens);
  const profileQuery = useProfileMetrics();
  const capstoneEligible = (profileQuery.data?.total_completed_lessons ?? 0) >= 3;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-cv-accent mb-2">{TRACK_LABELS[roleLens]}</p>
        <h1 className="text-4xl font-semibold text-cv-chalk mb-4">{headline}</h1>
        <p className="max-w-3xl text-cv-chalk/70">{description}</p>
      </div>

      {featureFlags.draftCapstoneEnabled && capstoneEligible ? (
        <div className="mb-8 rounded-cv border border-cv-accent/30 bg-cv-steel p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cv-accent mb-2">Capstone Ready</p>
          <h2 className="text-2xl font-semibold text-cv-chalk mb-3">Draft simulator teaching layer unlocked</h2>
          <p className="text-sm leading-6 text-cv-chalk/75 mb-4">
            You have enough lesson completions to use the draft simulator as a learning capstone.
          </p>
          <Link to="/draft" className="inline-flex rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white">
            Open draft capstone
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {lessonsQuery.data?.map((lesson) => (
          <Link
            key={lesson.id}
            to={`/lessons/${lesson.id}`}
            className="rounded-cv border border-cv-court/20 bg-cv-steel p-5 hover:border-cv-accent/60"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-cv-accent mb-2">
              {lesson.difficulty} • {lesson.interaction_type}
            </p>
            <h2 className="text-2xl font-semibold text-cv-chalk mb-3">{lesson.title}</h2>
            <p className="text-sm leading-6 text-cv-chalk/70">{lesson.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
