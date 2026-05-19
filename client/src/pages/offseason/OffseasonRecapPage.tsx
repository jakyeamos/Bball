import React from 'react';
import { featureFlags } from '@nba-draft-sim/shared';
import { useOffseasonRecap } from '../../features/offseason/useOffseasonRecap';
import { SimulatorButton, SimulatorPanel } from '../../components/sim/SimulatorShell';
import { OffseasonNotice, OffseasonShell } from './OffseasonShell';

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
      <OffseasonNotice
        title="Offseason Recap is not enabled in this environment."
        description="Enable `VITE_ENABLE_OFFSEASON_DECISION_LOOP` to continue."
        actionTo="/offseason/free-agency"
        actionLabel="Back to Free Agency"
        tone="warning"
      />
    );
  }

  const run = activeRunQuery.data;
  if (!run) {
    return (
      <OffseasonNotice
        title="No active offseason run found."
        actionTo="/offseason/team-context"
        actionLabel="Start from Team Context"
      />
    );
  }

  if (run.phase !== 'post_offseason_recap' && run.phase !== 'complete') {
    return (
      <OffseasonNotice
        title="Offseason recap is not active."
        description={`Current phase: ${run.phase}`}
        actionTo="/offseason/free-agency"
        actionLabel="Return to Free Agency"
      />
    );
  }

  if (recapQuery.isLoading) {
    return (
      <OffseasonNotice
        title="Compiling offseason recap..."
        actionTo="/offseason/free-agency"
        actionLabel="Back to Free Agency"
      />
    );
  }

  if (recapQuery.isError || !recapQuery.data) {
    return (
      <OffseasonNotice
        title="Unable to load offseason recap."
        description={recapQuery.error?.message ?? 'Unknown error'}
        actionTo="/offseason/free-agency"
        actionLabel="Back to Free Agency"
        tone="warning"
      />
    );
  }

  const recap = recapQuery.data;

  return (
    <OffseasonShell
      title="Post-Offseason Recap"
      description="Review your full decision loop with grade context, fit outcomes, and projected team direction."
      activePhase="Recap"
    >
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
        <SimulatorPanel title="Fit Report">
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
        </SimulatorPanel>

        <SimulatorPanel title="Key Moments">
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
            <SimulatorButton
              type="button"
              className="mt-6"
              disabled={completeRun.isPending}
              onClick={async () => {
                await completeRun.mutateAsync(run.run_id);
              }}
            >
              Complete Offseason Run
            </SimulatorButton>
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
        </SimulatorPanel>
      </div>
    </OffseasonShell>
  );
}
