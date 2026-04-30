import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { featureFlags } from '@nba-draft-sim/shared';
import { useFreeAgency } from '../../features/offseason/useFreeAgency';

export function FreeAgencyPage(): JSX.Element {
  const navigate = useNavigate();
  const freeAgencyEnabled =
    featureFlags.offseasonFoundationEnabled &&
    featureFlags.offseasonTeamContextEnabled &&
    featureFlags.offseasonCoachingMarketEnabled &&
    featureFlags.offseasonScoutingEnabled &&
    featureFlags.offseasonTradeMarketEnabled &&
    featureFlags.offseasonDraftNightEnabled &&
    featureFlags.offseasonFreeAgencyEnabled;
  const { activeRunQuery, targetsQuery, submitOffer, continueToRecap } =
    useFreeAgency(freeAgencyEnabled);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [contractMillions, setContractMillions] = useState<number>(8);
  const [decision, setDecision] = useState<'signed' | 'declined'>('signed');

  if (!freeAgencyEnabled) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-cv border border-cv-court/20 bg-cv-steel p-6">
          <h1 className="text-3xl font-semibold text-cv-chalk mb-3">
            Free Agency is not enabled in this environment.
          </h1>
          <p className="text-cv-chalk/70 mb-5">
            Enable `VITE_ENABLE_OFFSEASON_FREE_AGENCY` to continue.
          </p>
          <Link
            to="/offseason/draft-night"
            className="rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Back to Draft Night
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

  if (run.phase !== 'free_agency') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-cv border border-cv-court/20 bg-cv-steel p-6">
          <h1 className="text-2xl font-semibold text-cv-chalk mb-3">
            Free Agency is not active.
          </h1>
          <p className="text-cv-chalk/70 mb-4">
            Current phase: <span className="font-semibold">{run.phase}</span>
          </p>
          <Link
            to="/offseason/draft-night"
            className="rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Return to Draft Night
          </Link>
        </div>
      </div>
    );
  }

  const targets = targetsQuery.data ?? [];
  const selectedTarget = targets.find((target) => target.player_id === selectedPlayerId);
  const canSubmit =
    selectedPlayerId !== null &&
    contractMillions > 0 &&
    !submitOffer.isPending &&
    contractMillions <= run.free_agency.cap_space_millions;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-cv-accent mb-2">
          Offseason Simulator
        </p>
        <h1 className="text-4xl font-semibold text-cv-chalk mb-4">Free Agency</h1>
        <p className="max-w-3xl text-cv-chalk/72">
          Sign targets under simplified cap and roster constraints with explanation-first outcomes.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-cv border border-cv-court/20 bg-cv-steel p-5">
          <h2 className="text-xl font-semibold text-cv-chalk mb-3">Offer Builder</h2>
          <p className="mb-2 text-sm text-cv-chalk/75">
            Cap space: {run.free_agency.cap_space_millions.toFixed(1)}M /{' '}
            {run.free_agency.salary_cap_millions.toFixed(1)}M
          </p>
          <p className="mb-4 text-sm text-cv-chalk/75">
            Roster: {run.team_context.roster.length} / {run.free_agency.roster_limit}
          </p>

          <label className="mb-3 block text-sm text-cv-chalk/80">
            Target player
            <select
              className="mt-1 w-full rounded-cv border border-cv-court/20 bg-cv-navy/50 px-3 py-2 text-cv-chalk"
              value={selectedPlayerId ?? ''}
              onChange={(event) =>
                setSelectedPlayerId(
                  event.target.value ? Number(event.target.value) : null
                )
              }
            >
              <option value="">Select target</option>
              {targets.map((target) => (
                <option key={target.player_id} value={target.player_id}>
                  {target.player_name} ({target.position}) — ask {target.asking_price_millions}
                  M
                </option>
              ))}
            </select>
          </label>

          <label className="mb-3 block text-sm text-cv-chalk/80">
            Offer (millions)
            <input
              type="number"
              min={1}
              step={0.5}
              value={contractMillions}
              onChange={(event) =>
                setContractMillions(Number(event.target.value))
              }
              className="mt-1 w-full rounded-cv border border-cv-court/20 bg-cv-navy/50 px-3 py-2 text-cv-chalk"
            />
          </label>

          <label className="mb-4 block text-sm text-cv-chalk/80">
            Decision
            <select
              className="mt-1 w-full rounded-cv border border-cv-court/20 bg-cv-navy/50 px-3 py-2 text-cv-chalk"
              value={decision}
              onChange={(event) =>
                setDecision(event.target.value as 'signed' | 'declined')
              }
            >
              <option value="signed">Sign Player</option>
              <option value="declined">Decline Offer</option>
            </select>
          </label>

          <button
            type="button"
            className="rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={!canSubmit}
            onClick={() => {
              submitOffer.mutate({
                runId: run.run_id,
                playerId: selectedPlayerId!,
                contractMillions,
                decision,
              });
            }}
          >
            Process Offer
          </button>

          {selectedTarget ? (
            <p className="mt-3 text-xs text-cv-chalk/65">
              Target ask: {selectedTarget.asking_price_millions.toFixed(1)}M
            </p>
          ) : null}
        </section>

        <section className="rounded-cv border border-cv-court/20 bg-cv-steel p-5">
          <h2 className="text-xl font-semibold text-cv-chalk mb-3">Signing Outcomes</h2>
          <div className="space-y-3">
            {run.free_agency.signings.slice().reverse().map((signing) => (
              <article
                key={signing.id}
                className="rounded-cv border border-cv-court/20 bg-cv-navy/35 p-4"
              >
                <h3 className="text-lg font-semibold text-cv-chalk">
                  {signing.player_name}
                </h3>
                <p className="text-sm text-cv-chalk/75 mb-2">
                  {signing.decision.toUpperCase()} • {signing.contract_millions.toFixed(1)}M
                  {' '}• fit score {signing.fit_score}
                </p>
                <ul className="space-y-1 text-sm text-cv-chalk/75">
                  {signing.explanation.map((line) => (
                    <li key={line}>• {line}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          {submitOffer.isError ? (
            <p className="mt-4 text-sm text-red-300">
              Unable to process offer: {submitOffer.error.message}
            </p>
          ) : null}

          <button
            type="button"
            onClick={async () => {
              await continueToRecap.mutateAsync(run.run_id);
              navigate('/offseason/recap');
            }}
            className="mt-6 rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white"
            disabled={continueToRecap.isPending}
          >
            Continue to Recap
          </button>
        </section>
      </div>
    </div>
  );
}
