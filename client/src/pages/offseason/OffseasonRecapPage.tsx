import React from 'react';
import { Link } from 'react-router-dom';
import { featureFlags } from '@nba-draft-sim/shared';
import { useOffseasonRecap } from '../../features/offseason/useOffseasonRecap';

export function OffseasonRecapPage(): JSX.Element {
  const recapEnabled =
    featureFlags.offseasonFoundationEnabled &&
    featureFlags.offseasonTeamContextEnabled &&
    featureFlags.offseasonCoachingMarketEnabled &&
    featureFlags.offseasonScoutingEnabled &&
    featureFlags.offseasonTradeMarketEnabled &&
    featureFlags.offseasonDraftNightEnabled &&
    featureFlags.offseasonFreeAgencyEnabled &&
    featureFlags.offseasonDecisionLoopEnabled;

  const { activeRunQuery, recapQuery, completeRun } =
    useOffseasonRecap(recapEnabled);

  if (!recapEnabled) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-cv border border-cv-court/20 bg-cv-steel p-6">
          <h1 className="mb-3 text-3xl font-semibold text-cv-chalk">
            Offseason Recap is not enabled in this environment.
          </h1>
          <p className="mb-5 text-cv-chalk/70">
            Enable `VITE_ENABLE_OFFSEASON_DECISION_LOOP` to continue.
          </p>
          <Link
            to="/offseason/free-agency"
            className="rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Back to Free Agency
          </Link>
        </div>
      </div>
    );
  }

  const run = activeRunQuery.data;
  if (!run) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <p className="text-cv-chalk/75">No active offseason run found.</p>
      </div>
    );
  }

  if (run.phase !== 'post_offseason_recap' && run.phase !== 'complete') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-cv border border-cv-court/20 bg-cv-steel p-6">
          <h1 className="mb-3 text-2xl font-semibold text-cv-chalk">
            Offseason recap is not active.
          </h1>
          <p className="mb-4 text-cv-chalk/70">
            Current phase: <span className="font-semibold">{run.phase}</span>
          </p>
          <Link
            to="/offseason/free-agency"
            className="rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Return to Free Agency
          </Link>
        </div>
      </div>
    );
  }

  if (recapQuery.isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <p className="text-cv-chalk/75">Compiling offseason recap...</p>
      </div>
    );
  }

  if (recapQuery.isError || !recapQuery.data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <p className="text-red-300">
          Unable to load offseason recap:{' '}
          {recapQuery.error?.message ?? 'Unknown error'}
        </p>
      </div>
    );
  }

  const recap = recapQuery.data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-cv-accent">
          Offseason Simulator
        </p>
        <h1 className="mb-4 text-4xl font-semibold text-cv-chalk">
          Post-Offseason Recap
        </h1>
        <p className="max-w-3xl text-cv-chalk/72">
          Review your full decision loop with grade context, fit outcomes, and
          projected team direction.
        </p>
      </div>

      <section className="mb-6 grid gap-4 rounded-cv border border-cv-court/20 bg-cv-steel p-5 md:grid-cols-3">
        <article className="rounded-cv border border-cv-court/20 bg-cv-navy/35 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-cv-chalk/60">
            Team Grade
          </p>
          <p className="text-4xl font-bold text-cv-chalk">{recap.team_grade}</p>
          <p className="text-sm text-cv-chalk/70">
            Overall score {recap.overall_score.toFixed(1)}
          </p>
        </article>

        <article className="rounded-cv border border-cv-court/20 bg-cv-navy/35 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-cv-chalk/60">
            Development Environment
          </p>
          <p className="text-4xl font-bold text-cv-chalk">
            {recap.developmental_environment_score.toFixed(1)}
          </p>
          <p className="text-sm text-cv-chalk/70">100-point scale</p>
        </article>

        <article className="rounded-cv border border-cv-court/20 bg-cv-navy/35 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-cv-chalk/60">
            Projected Direction
          </p>
          <p className="text-sm leading-relaxed text-cv-chalk/80">
            {recap.projected_direction}
          </p>
        </article>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-cv border border-cv-court/20 bg-cv-steel p-5">
          <h2 className="mb-3 text-xl font-semibold text-cv-chalk">Fit Report</h2>
          <ul className="space-y-2 text-sm text-cv-chalk/75">
            {recap.fit_report.map((line) => (
              <li key={line}>• {line}</li>
            ))}
          </ul>

          <h3 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-[0.12em] text-cv-accent">
            Recap Explanation
          </h3>
          <ul className="space-y-2 text-sm text-cv-chalk/75">
            {recap.explanation.map((line) => (
              <li key={line}>• {line}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-cv border border-cv-court/20 bg-cv-steel p-5">
          <h2 className="mb-3 text-xl font-semibold text-cv-chalk">Key Moments</h2>
          <div className="space-y-3">
            {recap.key_moments.map((moment) => (
              <article
                key={moment.id}
                className="rounded-cv border border-cv-court/20 bg-cv-navy/35 p-4"
              >
                <p className="text-xs uppercase tracking-[0.12em] text-cv-chalk/60">
                  {moment.phase.replace(/_/g, ' ')}
                </p>
                <h3 className="text-lg font-semibold text-cv-chalk">{moment.title}</h3>
                <p className="text-sm text-cv-chalk/75">{moment.summary}</p>
              </article>
            ))}
          </div>

          {run.phase === 'post_offseason_recap' ? (
            <button
              type="button"
              className="mt-6 rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white"
              disabled={completeRun.isPending}
              onClick={async () => {
                await completeRun.mutateAsync(run.run_id);
              }}
            >
              Complete Offseason Run
            </button>
          ) : (
            <p className="mt-6 text-sm text-emerald-200">
              Offseason run marked complete.
            </p>
          )}

          {completeRun.isError ? (
            <p className="mt-4 text-sm text-red-300">
              Unable to complete run: {completeRun.error.message}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
