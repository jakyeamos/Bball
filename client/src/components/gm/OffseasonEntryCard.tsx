import React from 'react';
import { Link } from 'react-router-dom';

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
    <section className="rounded-cv border border-cv-accent/35 bg-cv-steel p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-cv-accent mb-2">
        Advanced GM Module
      </p>
      <h2 className="text-2xl font-semibold text-cv-chalk mb-2">
        Offseason Simulator
      </h2>
      <p className="text-sm leading-6 text-cv-chalk/75 mb-4">
        Take over a real NBA team and move through Team Context with live roster, pick, and timeline pressure.
      </p>

      <p className="text-xs text-cv-chalk/60 mb-4">
        Typical session length: 15–25 minutes
      </p>

      {enabled ? (
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/offseason/team-context"
            className="rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Open Offseason Simulator
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
