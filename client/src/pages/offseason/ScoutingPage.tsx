import React from 'react';
import { useNavigate } from 'react-router-dom';
import { featureFlags } from '@nba-draft-sim/shared';
import { useScoutingBoard } from '../../features/offseason/useScoutingBoard';
import { SimulatorButton, SimulatorPanel } from '../../components/sim/SimulatorShell';
import { OffseasonNotice, OffseasonShell } from './OffseasonShell';

function uncertaintyToneClass(band: 'high' | 'medium' | 'low'): string {
  if (band === 'high') {
    return 'border-amber-300/60 bg-amber-300/10 text-amber-200';
  }
  if (band === 'medium') {
    return 'border-sky-300/60 bg-sky-300/10 text-sky-200';
  }
  return 'border-emerald-300/60 bg-emerald-300/10 text-emerald-200';
}

export function ScoutingPage(): JSX.Element {
  const navigate = useNavigate();
  const scoutingEnabled =
    featureFlags.offseasonFoundationEnabled &&
    featureFlags.offseasonTeamContextEnabled &&
    featureFlags.offseasonCoachingMarketEnabled &&
    featureFlags.offseasonScoutingEnabled;
  const { activeRunQuery, boardQuery, updateBoardRanking, continueToTradeMarket } =
    useScoutingBoard(scoutingEnabled);

  if (!scoutingEnabled) {
    return (
      <OffseasonNotice
        title="Scouting phase is not enabled in this environment."
        description="Enable `VITE_ENABLE_OFFSEASON_SCOUTING` to continue."
        actionTo="/offseason/coaching-market"
        actionLabel="Back to Coaching Market"
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

  if (run.phase !== 'scouting_pre_draft') {
    return (
      <OffseasonNotice
        title="Scouting board is not active."
        description={`Current phase: ${run.phase}`}
        actionTo="/offseason/coaching-market"
        actionLabel="Return to Coaching Market"
      />
    );
  }

  const prospects = boardQuery.data ?? [];

  return (
    <OffseasonShell
      title="Scouting Pre-Draft"
      description="Build your board with explicit uncertainty for every prospect. No pick is framed as guaranteed."
      activePhase="Scouting"
    >
      {boardQuery.isError ? (
        <p className="mb-4 text-sm text-red-300">
          Failed to load scouting board: {boardQuery.error.message}
        </p>
      ) : null}

      <SimulatorPanel title="Prospect Board">
        <div className="space-y-3">
          {prospects.map((prospect) => (
            <article
              key={prospect.player_id}
              className="rounded-cv border border-cv-court/20 bg-cv-navy/35 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-cv-chalk/60">
                    Rank {prospect.board_rank}
                  </p>
                  <h3 className="text-lg font-semibold text-cv-chalk">
                    {prospect.full_name}
                  </h3>
                  <p className="text-sm text-cv-chalk/70">
                    {prospect.position} • Draft year {prospect.draft_year ?? 'Unknown'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const orderedIds = [
                      prospect.player_id,
                      ...prospects
                        .filter((candidate) => candidate.player_id !== prospect.player_id)
                        .sort((a, b) => a.board_rank - b.board_rank)
                        .map((candidate) => candidate.player_id),
                    ];
                    updateBoardRanking.mutate({
                      runId: run.run_id,
                      rankedPlayerIds: orderedIds,
                    });
                  }}
                  className="rounded-cv bg-cv-accent px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-orange-500 disabled:opacity-60"
                  disabled={updateBoardRanking.isPending}
                >
                  Prioritize On Board
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span
                  className={`rounded-full border px-2 py-1 uppercase tracking-[0.08em] ${uncertaintyToneClass(
                    prospect.uncertainty_band
                  )}`}
                >
                  {prospect.uncertainty_band} uncertainty
                </span>
                <span className="rounded-full border border-cv-court/30 px-2 py-1 text-cv-chalk/75">
                  uncertainty score {prospect.uncertainty_score.toFixed(2)}
                </span>
                <span className="rounded-full border border-cv-court/30 px-2 py-1 text-cv-chalk/75">
                  scouting score {prospect.scouting_score.toFixed(2)}
                </span>
              </div>

              <dl className="mt-3 grid gap-2 text-xs text-cv-chalk/75 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="uppercase tracking-[0.08em]">Production</dt>
                  <dd>{prospect.signals.production.toFixed(2)}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-[0.08em]">Workout</dt>
                  <dd>{prospect.signals.workout.toFixed(2)}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-[0.08em]">Interview</dt>
                  <dd>{prospect.signals.interview.toFixed(2)}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-[0.08em]">Tools</dt>
                  <dd>{prospect.signals.tools.toFixed(2)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>

        <div className="mt-6">
          <SimulatorButton
            type="button"
            onClick={async () => {
              await continueToTradeMarket.mutateAsync(run.run_id);
              navigate('/offseason/trade-market');
            }}
            disabled={continueToTradeMarket.isPending || prospects.length === 0}
          >
            Continue to Trade Market
          </SimulatorButton>
        </div>
      </SimulatorPanel>
    </OffseasonShell>
  );
}
