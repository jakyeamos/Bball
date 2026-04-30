import React from 'react';
import { Link } from 'react-router-dom';
import { featureFlags } from '@nba-draft-sim/shared';
import { useLessons } from '../features/learning/queries';
import { useDailyChallenge } from '../features/daily/useDailyChallenge';
import { DailyChallengeCard } from '../features/daily/DailyChallengeCard';
import { DailyLeaderboard } from '../features/daily/DailyLeaderboard';
import { readOnboardingState } from '../features/onboarding/onboardingStorage';

export function HomePage() {
  const { data: lessons } = useLessons();
  const daily = useDailyChallenge();
  const onboardingState = readOnboardingState();

  const playerLessons = lessons?.filter((lesson) => lesson.role_lens === 'player').slice(0, 3) ?? [];
  const coachLessons = lessons?.filter((lesson) => lesson.role_lens === 'coach').slice(0, 3) ?? [];
  const gmLessons = lessons?.filter((lesson) => lesson.role_lens === 'gm').slice(0, 3) ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <section className="mb-12 rounded-[1.5rem] border border-cv-court/20 bg-cv-steel/80 p-8 lg:p-10">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.25em] text-cv-accent mb-3">Court Vision</p>
          <h1 className="text-5xl font-semibold text-cv-chalk mb-4">
            Build basketball IQ through lessons, daily reps, and draft decisions.
          </h1>
          <p className="text-lg leading-8 text-cv-chalk/72 mb-6">
            Court Vision now has a full lesson library, guided onboarding, daily challenge loops, a skill profile, and a draft-teaching capstone layered onto the simulator.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/library" className="rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white">
              Browse library
            </Link>
            {featureFlags.onboardingEnabled && !onboardingState.completed && !onboardingState.skipped ? (
              <Link to="/onboarding" className="rounded-cv border border-cv-court/20 px-4 py-2 text-sm font-semibold text-cv-chalk">
                Start onboarding
              </Link>
            ) : null}
            <Link to="/profile" className="rounded-cv border border-cv-court/20 px-4 py-2 text-sm font-semibold text-cv-chalk">
              View profile
            </Link>
          </div>
        </div>
      </section>

      {featureFlags.dailyChallengeEnabled && daily.challenge ? (
        <section className="mb-12 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <DailyChallengeCard
            challenge={daily.challenge}
            result={daily.submitResult}
            isSubmitting={daily.isSubmitting}
            onSubmit={daily.submitAnswer}
          />
          {featureFlags.dailyLeaderboardEnabled ? <DailyLeaderboard /> : null}
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-3">
        <TrackColumn
          id="player-iq"
          title="Player IQ"
          description="Read closeouts, tag help, and live-dribble decisions before the defense finishes rotating."
          lessons={playerLessons}
          route="/player-iq"
        />
        <TrackColumn
          id="coach-iq"
          title="Coach IQ"
          description="Study shell rules, timeout leverage, and lineups that survive real game pressure."
          lessons={coachLessons}
          route="/coach-iq"
        />
        <TrackColumn
          id="gm-iq"
          title="GM IQ"
          description="Think in ranges, fit, and organizational tradeoffs instead of one-number player grades."
          lessons={gmLessons}
          route="/gm-iq"
          secondaryAction={
            <Link to="/draft-sim" className="rounded-cv border border-cv-accent/40 px-4 py-2 text-sm font-semibold text-cv-chalk">
              Open draft simulator
            </Link>
          }
        />
      </section>
    </div>
  );
}

interface TrackColumnProps {
  id: string;
  title: string;
  description: string;
  lessons: Array<{ id: string; title: string }>;
  route: string;
  secondaryAction?: React.ReactNode;
}

function TrackColumn({
  id,
  title,
  description,
  lessons,
  route,
  secondaryAction,
}: TrackColumnProps) {
  return (
    <div id={id} className="flex h-full flex-col rounded-[1.25rem] border border-cv-court/20 bg-cv-steel p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-cv-accent mb-3">{title}</p>
      <h2 className="text-2xl font-semibold text-cv-chalk mb-3">{title === 'GM IQ' ? 'Build the roster with context' : `Train your ${title.toLowerCase()}`}</h2>
      <p className="text-sm leading-6 text-cv-chalk/70 mb-5">{description}</p>
      <div className="space-y-2 mb-6">
        {lessons.map((lesson) => (
          <Link key={lesson.id} to={`/lessons/${lesson.id}`} className="block text-sm text-cv-chalk/75 hover:text-cv-chalk">
            {lesson.title}
          </Link>
        ))}
      </div>
      <div className="mt-auto flex flex-wrap gap-3">
        <Link to={route} className="rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white">
          Explore {title}
        </Link>
        {secondaryAction}
      </div>
    </div>
  );
}
