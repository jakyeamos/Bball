import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { featureFlags } from '@nba-draft-sim/shared';
import { useFreeAgency } from '../../features/offseason/useFreeAgency';
import {
  SimulatorButton,
  SimulatorPanel,
  inputControlClassName,
} from '../../components/sim/SimulatorShell';
import { OffseasonNotice, OffseasonShell } from './OffseasonShell';

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
      <OffseasonNotice
        title="Free Agency is not enabled in this environment."
        description="Enable `VITE_ENABLE_OFFSEASON_FREE_AGENCY` to continue."
        actionTo="/offseason/draft-night"
        actionLabel="Back to Draft Night"
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

  if (run.phase !== 'free_agency') {
    return (
      <OffseasonNotice
        title="Free Agency is not active."
        description={`Current phase: ${run.phase}`}
        actionTo="/offseason/draft-night"
        actionLabel="Return to Draft Night"
      />
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
    <OffseasonShell
      title="Free Agency"
      description="Sign targets under simplified cap and roster constraints with explanation-first outcomes."
      activePhase="Free Agency"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <SimulatorPanel title="Offer Builder">
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
              className={inputControlClassName()}
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
              className={inputControlClassName()}
            />
          </label>

          <label className="mb-4 block text-sm text-cv-chalk/80">
            Decision
            <select
              className={inputControlClassName()}
              value={decision}
              onChange={(event) =>
                setDecision(event.target.value as 'signed' | 'declined')
              }
            >
              <option value="signed">Sign Player</option>
              <option value="declined">Decline Offer</option>
            </select>
          </label>

          <SimulatorButton
            type="button"
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
          </SimulatorButton>

          {selectedTarget ? (
            <p className="mt-3 text-xs text-cv-chalk/65">
              Target ask: {selectedTarget.asking_price_millions.toFixed(1)}M
            </p>
          ) : null}
        </SimulatorPanel>

        <SimulatorPanel title="Signing Outcomes">
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

          <SimulatorButton
            type="button"
            onClick={async () => {
              await continueToRecap.mutateAsync(run.run_id);
              navigate('/offseason/recap');
            }}
            className="mt-6"
            disabled={continueToRecap.isPending}
          >
            Continue to Recap
          </SimulatorButton>
        </SimulatorPanel>
      </div>
    </OffseasonShell>
  );
}
