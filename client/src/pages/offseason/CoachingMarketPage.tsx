import React from 'react';
import { Link } from 'react-router-dom';
import { featureFlags } from '@nba-draft-sim/shared';
import { useCoachingMarket } from '../../features/offseason/useCoachingMarket';

export function CoachingMarketPage(): JSX.Element {
  const coachingEnabled =
    featureFlags.offseasonFoundationEnabled &&
    featureFlags.offseasonTeamContextEnabled &&
    featureFlags.offseasonCoachingMarketEnabled;
  const { activeRunQuery, coachingMarketQuery, hireCoach, continueToScouting } =
    useCoachingMarket(coachingEnabled);

  if (!coachingEnabled) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-cv border border-cv-court/20 bg-cv-steel p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cv-accent mb-2">
            Offseason Simulator
          </p>
          <h1 className="text-3xl font-semibold text-cv-chalk mb-3">
            Coaching Market is not enabled in this environment.
          </h1>
          <p className="text-cv-chalk/70 mb-5">
            Enable `VITE_ENABLE_OFFSEASON_COACHING_MARKET` to continue this phase.
          </p>
          <Link
            to="/offseason/team-context"
            className="rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Back to Team Context
          </Link>
        </div>
      </div>
    );
  }

  if (activeRunQuery.isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <p className="text-cv-chalk/70">Loading active offseason run...</p>
      </div>
    );
  }

  if (activeRunQuery.isError) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <p className="text-red-300">
          Failed to load offseason run: {activeRunQuery.error.message}
        </p>
      </div>
    );
  }

  const run = activeRunQuery.data;

  if (!run) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-cv border border-cv-court/20 bg-cv-steel p-6">
          <p className="text-sm text-cv-chalk/75 mb-4">
            No active offseason run found.
          </p>
          <Link
            to="/offseason/team-context"
            className="rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Start from Team Context
          </Link>
        </div>
      </div>
    );
  }

  if (run.phase !== 'coaching_market') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-cv border border-cv-court/20 bg-cv-steel p-6">
          <h1 className="text-2xl font-semibold text-cv-chalk mb-3">
            Coaching Market is not active yet.
          </h1>
          <p className="text-cv-chalk/70 mb-4">
            Current phase: <span className="font-semibold">{run.phase}</span>
          </p>
          <Link
            to="/offseason/team-context"
            className="rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Return to Team Context
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-cv-accent mb-2">
          Offseason Simulator
        </p>
        <h1 className="text-4xl font-semibold text-cv-chalk mb-4">
          Coaching Market
        </h1>
        <p className="max-w-3xl text-cv-chalk/72">
          Hire a coach and lock in the tendency profile that will shape scouting and grading through the rest of this run.
        </p>
      </div>

      {coachingMarketQuery.isError ? (
        <p className="mb-4 text-sm text-red-300">
          Failed to load coach pool: {coachingMarketQuery.error.message}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-cv border border-cv-court/20 bg-cv-steel p-5">
          <h2 className="text-xl font-semibold text-cv-chalk mb-3">
            Coach Pool
          </h2>
          {coachingMarketQuery.isLoading ? (
            <p className="text-sm text-cv-chalk/70">Loading coaching options...</p>
          ) : null}
          <div className="max-h-[34rem] space-y-3 overflow-auto pr-1">
            {coachingMarketQuery.data?.map((coach) => {
              const isSelected =
                run.coaching_market.selected_coach?.id === coach.id;
              return (
                <article
                  key={coach.id}
                  className={`rounded-cv border p-4 ${
                    isSelected
                      ? 'border-cv-accent bg-cv-accent/10'
                      : 'border-cv-court/20 bg-cv-navy/40'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-cv-chalk">
                        {coach.head_coach_name}
                      </h3>
                      <p className="text-xs uppercase tracking-[0.12em] text-cv-chalk/60">
                        {coach.team_abbreviation} • {coach.scheme} • {coach.pace} pace
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        hireCoach.mutate({ runId: run.run_id, coachId: coach.id })
                      }
                      className={`rounded-cv px-3 py-1.5 text-xs font-semibold ${
                        isSelected
                          ? 'bg-emerald-500/30 text-emerald-100'
                          : 'bg-cv-accent text-white'
                      }`}
                      disabled={hireCoach.isPending}
                    >
                      {isSelected ? 'Hired' : 'Hire Coach'}
                    </button>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-cv-chalk/75 sm:grid-cols-2">
                    <p>
                      Driver-Friendly:{' '}
                      <span className="font-semibold">
                        {coach.driver_friendly ? 'Yes' : 'No'}
                      </span>
                    </p>
                    <p>
                      Shooter-Friendly:{' '}
                      <span className="font-semibold">
                        {coach.shooter_friendly ? 'Yes' : 'No'}
                      </span>
                    </p>
                    <p>
                      Youth Development:{' '}
                      <span className="font-semibold">
                        {coach.youth_development ? 'High' : 'Limited'}
                      </span>
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-cv border border-cv-court/20 bg-cv-steel p-5">
          <h2 className="text-xl font-semibold text-cv-chalk mb-3">
            Hire Impact
          </h2>
          {run.coaching_market.selected_coach ? (
            <>
              <p className="text-sm text-cv-chalk/75 mb-3">
                Hired coach:{' '}
                <span className="font-semibold text-cv-chalk">
                  {run.coaching_market.selected_coach.head_coach_name}
                </span>
              </p>
              <div className="rounded-cv border border-cv-court/15 bg-cv-navy/40 p-3">
                <h3 className="text-xs uppercase tracking-[0.16em] text-cv-accent mb-2">
                  Downstream Effects
                </h3>
                <ul className="space-y-2 text-sm text-cv-chalk/80">
                  {run.coaching_market.hiring_notes.map((note) => (
                    <li key={note}>• {note}</li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await continueToScouting.mutateAsync(run.run_id);
                }}
                className="mt-5 rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white"
                disabled={continueToScouting.isPending}
              >
                Continue to Scouting
              </button>
            </>
          ) : (
            <p className="text-sm text-cv-chalk/72">
              Choose a coach to unlock tendency-adjusted valuations for the next phases.
            </p>
          )}

          {hireCoach.isError ? (
            <p className="mt-4 text-sm text-red-300">
              Unable to hire coach: {hireCoach.error.message}
            </p>
          ) : null}
          {continueToScouting.isError ? (
            <p className="mt-4 text-sm text-red-300">
              Unable to transition to scouting: {continueToScouting.error.message}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
