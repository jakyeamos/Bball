import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { featureFlags } from '@nba-draft-sim/shared';
import { useScoutingBoard } from '../../features/offseason/useScoutingBoard';

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
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-cv border border-cv-court/20 bg-cv-steel p-6">
          <h1 className="text-3xl font-semibold text-cv-chalk mb-3">
            Scouting phase is not enabled in this environment.
          </h1>
          <p className="text-cv-chalk/70 mb-5">
            Enable `VITE_ENABLE_OFFSEASON_SCOUTING` to continue.
          </p>
          <Link
            to="/offseason/coaching-market"
            className="rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Back to Coaching Market
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

  if (run.phase !== 'scouting_pre_draft') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-cv border border-cv-court/20 bg-cv-steel p-6">
          <h1 className="text-2xl font-semibold text-cv-chalk mb-3">
            Scouting board is not active.
          </h1>
          <p className="text-cv-chalk/70 mb-4">
            Current phase: <span className="font-semibold">{run.phase}</span>
          </p>
          <Link
            to="/offseason/coaching-market"
            className="rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Return to Coaching Market
          </Link>
        </div>
      </div>
    );
  }

  const prospects = boardQuery.data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-cv-accent mb-2">
          Offseason Simulator
        </p>
        <h1 className="text-4xl font-semibold text-cv-chalk mb-4">
          Scouting Pre-Draft
        </h1>
        <p className="max-w-3xl text-cv-chalk/72">
          Build your board with explicit uncertainty for every prospect. No pick is framed as guaranteed.
        </p>
      </div>

      {boardQuery.isError ? (
        <p className="mb-4 text-sm text-red-300">
          Failed to load scouting board: {boardQuery.error.message}
        </p>
      ) : null}

      <section className="rounded-cv border border-cv-court/20 bg-cv-steel p-5">
        <h2 className="text-xl font-semibold text-cv-chalk mb-3">
          Prospect Board
        </h2>
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
                  className="rounded-cv bg-cv-accent px-3 py-1.5 text-xs font-semibold text-white"
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
          <button
            type="button"
            onClick={async () => {
              await continueToTradeMarket.mutateAsync(run.run_id);
              navigate('/offseason/trade-market');
            }}
            className="rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white"
            disabled={continueToTradeMarket.isPending || prospects.length === 0}
          >
            Continue to Trade Market
          </button>
        </div>
      </section>
    </div>
  );
}

