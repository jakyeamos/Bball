import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

interface OffseasonEntryCardProps {
  enabled: boolean;
  recommended: boolean;
  currentCompletedLessons: number;
  minimumCompletedLessons: number;
}

export function OffseasonEntryCard({
  enabled,
  recommended,
  currentCompletedLessons,
  minimumCompletedLessons,
}: OffseasonEntryCardProps): JSX.Element {
  return (
    <section className="cv-surface overflow-hidden rounded-cv p-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-cv-accent">
        Advanced GM Module
      </p>
      <h2 className="mb-2 text-2xl font-semibold text-cv-chalk">
        Offseason Simulator
      </h2>
      <p className="mb-4 max-w-3xl text-sm leading-6 text-cv-chalk/75">
        Take over a real NBA team and move through Team Context, coaching, scouting, trades, draft night, and free agency in the refreshed live shell.
      </p>

      <p className="mb-4 text-xs text-cv-chalk/60">
        Typical session length: 15–25 minutes
      </p>

      {enabled ? (
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/offseason/team-context"
            className="inline-flex items-center gap-2 rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(255,107,53,0.22)] transition-colors hover:bg-orange-500"
          >
            Open Offseason Simulator
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
          {recommended ? (
            <span className="rounded-full border border-emerald-400/50 px-2 py-1 text-xs text-emerald-200">
              Recommended now
            </span>
          ) : (
            <span className="text-xs text-cv-chalk/60">
              Recommended after {minimumCompletedLessons} core GM lessons
              ({currentCompletedLessons}/{minimumCompletedLessons} complete)
            </span>
          )}
        </div>
      ) : (
        <p className="text-sm text-cv-chalk/65">
          Offseason Simulator is currently disabled by feature flag.
        </p>
      )}
    </section>
  );
}
