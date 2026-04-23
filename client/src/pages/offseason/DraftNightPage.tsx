import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { featureFlags } from '@nba-draft-sim/shared';
import { useDraftNight } from '../../features/offseason/useDraftNight';

export function DraftNightPage(): JSX.Element {
  const navigate = useNavigate();
  const draftEnabled =
    featureFlags.offseasonFoundationEnabled &&
    featureFlags.offseasonTeamContextEnabled &&
    featureFlags.offseasonCoachingMarketEnabled &&
    featureFlags.offseasonScoutingEnabled &&
    featureFlags.offseasonTradeMarketEnabled &&
    featureFlags.offseasonDraftNightEnabled;
  const { activeRunQuery, submitPick, continueToFreeAgency } =
    useDraftNight(draftEnabled);

  if (!draftEnabled) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-cv border border-cv-court/20 bg-cv-steel p-6">
          <h1 className="text-3xl font-semibold text-cv-chalk mb-3">
            Draft Night is not enabled in this environment.
          </h1>
          <p className="text-cv-chalk/70 mb-5">
            Enable `VITE_ENABLE_OFFSEASON_DRAFT_NIGHT` to continue.
          </p>
          <Link
            to="/offseason/trade-market"
            className="rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Back to Trade Market
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

  if (run.phase !== 'draft_night') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-cv border border-cv-court/20 bg-cv-steel p-6">
          <h1 className="text-2xl font-semibold text-cv-chalk mb-3">
            Draft Night is not active.
          </h1>
          <p className="text-cv-chalk/70 mb-4">
            Current phase: <span className="font-semibold">{run.phase}</span>
          </p>
          <Link
            to="/offseason/trade-market"
            className="rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Return to Trade Market
          </Link>
        </div>
      </div>
    );
  }

  const pickedPlayerIds = new Set(run.draft_night.picks.map((pick) => pick.player_id));
  const availableProspects = run.scouting_pre_draft.prospects.filter(
    (prospect) => !pickedPlayerIds.has(prospect.player_id)
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-cv-accent mb-2">
          Offseason Simulator
        </p>
        <h1 className="text-4xl font-semibold text-cv-chalk mb-4">Draft Night</h1>
        <p className="max-w-3xl text-cv-chalk/72">
          Make picks from your scouting board and receive explanation-first grading for each decision.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-cv border border-cv-court/20 bg-cv-steel p-5">
          <h2 className="text-xl font-semibold text-cv-chalk mb-3">Available Prospects</h2>
          <div className="space-y-3">
            {availableProspects.map((prospect) => (
              <article
                key={prospect.player_id}
                className="rounded-cv border border-cv-court/20 bg-cv-navy/35 p-4"
              >
                <h3 className="text-lg font-semibold text-cv-chalk">
                  {prospect.full_name}
                </h3>
                <p className="text-sm text-cv-chalk/70 mb-2">
                  Rank {prospect.board_rank} • {prospect.position} • uncertainty{' '}
                  {prospect.uncertainty_band}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    submitPick.mutate({
                      runId: run.run_id,
                      playerId: prospect.player_id,
                    })
                  }
                  className="rounded-cv bg-cv-accent px-3 py-1.5 text-xs font-semibold text-white"
                  disabled={submitPick.isPending}
                >
                  Submit Pick
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-cv border border-cv-court/20 bg-cv-steel p-5">
          <h2 className="text-xl font-semibold text-cv-chalk mb-3">Pick Grades</h2>
          <div className="space-y-3">
            {run.draft_night.picks.map((pick) => (
              <article
                key={pick.id}
                className="rounded-cv border border-cv-court/20 bg-cv-navy/35 p-4"
              >
                <p className="text-xs uppercase tracking-[0.12em] text-cv-chalk/60">
                  Pick {pick.pick_number}
                </p>
                <h3 className="text-lg font-semibold text-cv-chalk">{pick.player_name}</h3>
                <p className="text-sm text-cv-chalk/75 mb-2">
                  Grade {pick.grade} • fit score {pick.fit_score}
                </p>
                <ul className="space-y-1 text-sm text-cv-chalk/75">
                  {pick.explanation.map((line) => (
                    <li key={line}>• {line}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          {submitPick.isError ? (
            <p className="mt-4 text-sm text-red-300">
              Unable to submit pick: {submitPick.error.message}
            </p>
          ) : null}

          <button
            type="button"
            onClick={async () => {
              await continueToFreeAgency.mutateAsync(run.run_id);
              navigate('/offseason/free-agency');
            }}
            className="mt-6 rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white"
            disabled={continueToFreeAgency.isPending}
          >
            Continue to Free Agency
          </button>
        </section>
      </div>
    </div>
  );
}

