import React from 'react';
import { useNavigate } from 'react-router-dom';
import { featureFlags } from '@nba-draft-sim/shared';
import { useDraftNight } from '../../features/offseason/useDraftNight';
import { SimulatorButton, SimulatorPanel } from '../../components/sim/SimulatorShell';
import { OffseasonNotice, OffseasonShell } from './OffseasonShell';

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
      <OffseasonNotice
        title="Draft Night is not enabled in this environment."
        description="Enable `VITE_ENABLE_OFFSEASON_DRAFT_NIGHT` to continue."
        actionTo="/offseason/trade-market"
        actionLabel="Back to Trade Market"
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

  if (run.phase !== 'draft_night') {
    return (
      <OffseasonNotice
        title="Draft Night is not active."
        description={`Current phase: ${run.phase}`}
        actionTo="/offseason/trade-market"
        actionLabel="Return to Trade Market"
      />
    );
  }

  const pickedPlayerIds = new Set(run.draft_night.picks.map((pick) => pick.player_id));
  const availableProspects = run.scouting_pre_draft.prospects.filter(
    (prospect) => !pickedPlayerIds.has(prospect.player_id)
  );

  return (
    <OffseasonShell
      title="Draft Night"
      description="Make picks from your scouting board and receive explanation-first grading for each decision."
      activePhase="Draft Night"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <SimulatorPanel title="Available Prospects">
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
        </SimulatorPanel>

        <SimulatorPanel title="Pick Grades">
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

          <SimulatorButton
            type="button"
            onClick={async () => {
              await continueToFreeAgency.mutateAsync(run.run_id);
              navigate('/offseason/free-agency');
            }}
            className="mt-6"
            disabled={continueToFreeAgency.isPending}
          >
            Continue to Free Agency
          </SimulatorButton>
        </SimulatorPanel>
      </div>
    </OffseasonShell>
  );
}
