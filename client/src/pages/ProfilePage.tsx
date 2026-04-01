import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { featureFlags } from '@nba-draft-sim/shared';
import { BadgeShelf } from '../components/profile/BadgeShelf';
import { useProfileMetrics } from '../features/profile/useProfileMetrics';
import { recommendNextLesson } from '../features/profile/recommendNextLesson';

export function ProfilePage() {
  const { data, isLoading } = useProfileMetrics();

  if (!featureFlags.profileDashboardEnabled) {
    return <Navigate to="/" replace />;
  }

  if (isLoading || !data) {
    return <div className="mx-auto max-w-6xl px-4 py-16 text-cv-chalk/70">Loading profile...</div>;
  }

  const nextLesson = recommendNextLesson(data);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-cv-accent mb-2">Profile</p>
        <h1 className="text-4xl font-semibold text-cv-chalk">Your Court Vision skill profile</h1>
        <p className="text-cv-chalk/70 mt-3">
          Track completions, accuracy, badges, and the next lesson that fills the biggest gap.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mb-8">
        {data.track_metrics.map((track) => (
          <div key={track.role_lens} className="rounded-cv border border-cv-court/20 bg-cv-steel p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-cv-accent mb-2">
              {track.role_lens} iq
            </p>
            <h2 className="text-2xl font-semibold text-cv-chalk mb-4">
              {track.completion_count} lessons complete
            </h2>
            <p className="text-sm text-cv-chalk/70 mb-2">Accuracy rate: {track.accuracy_rate}%</p>
            <p className="text-sm text-cv-chalk/60">
              Weak tags: {track.weak_tags.length ? track.weak_tags.join(', ') : 'No obvious gaps yet'}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-cv border border-cv-court/20 bg-cv-steel p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cv-accent mb-2">Badges</p>
              <h2 className="text-2xl font-semibold text-cv-chalk">Milestones</h2>
            </div>
            <span className="text-sm text-cv-chalk/60">Streak: {data.streak.current_streak}</span>
          </div>
          <BadgeShelf badges={data.badges} />
        </div>

        <div className="rounded-cv border border-cv-court/20 bg-cv-steel p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cv-accent mb-2">Next Up</p>
          {nextLesson ? (
            <>
              <h2 className="text-2xl font-semibold text-cv-chalk mb-3">{nextLesson.title}</h2>
              <p className="text-sm leading-6 text-cv-chalk/70 mb-4">{nextLesson.description}</p>
              <Link to={nextLesson.route} className="inline-flex rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white">
                Open recommended lesson
              </Link>
            </>
          ) : (
            <p className="text-sm leading-6 text-cv-chalk/70">
              Finish a few lessons or daily challenges and Court Vision will start recommending your next rep.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
