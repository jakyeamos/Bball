import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { featureFlags } from '@nba-draft-sim/shared';
import { useTradeMarket } from '../../features/offseason/useTradeMarket';

export function TradeMarketPage(): JSX.Element {
  const tradeEnabled =
    featureFlags.offseasonFoundationEnabled &&
    featureFlags.offseasonTeamContextEnabled &&
    featureFlags.offseasonCoachingMarketEnabled &&
    featureFlags.offseasonScoutingEnabled &&
    featureFlags.offseasonTradeMarketEnabled;
  const { activeRunQuery, submitTradeProposal, continueToDraftNight } =
    useTradeMarket(tradeEnabled);

  const [offeredPlayerId, setOfferedPlayerId] = useState<number | null>(null);
  const [requestedPlayerId, setRequestedPlayerId] = useState<number | null>(null);
  const [includeOutgoingPick, setIncludeOutgoingPick] = useState(false);
  const [includeIncomingPick, setIncludeIncomingPick] = useState(false);
  const [decision, setDecision] = useState<'accepted' | 'rejected'>('accepted');

  if (!tradeEnabled) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-cv border border-cv-court/20 bg-cv-steel p-6">
          <h1 className="text-3xl font-semibold text-cv-chalk mb-3">
            Trade Market is not enabled in this environment.
          </h1>
          <p className="text-cv-chalk/70 mb-5">
            Enable `VITE_ENABLE_OFFSEASON_TRADE_MARKET` to continue.
          </p>
          <Link
            to="/offseason/scouting"
            className="rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Back to Scouting
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

  if (run.phase !== 'trade_market') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-cv border border-cv-court/20 bg-cv-steel p-6">
          <h1 className="text-2xl font-semibold text-cv-chalk mb-3">
            Trade Market is not active.
          </h1>
          <p className="text-cv-chalk/70 mb-4">
            Current phase: <span className="font-semibold">{run.phase}</span>
          </p>
          <Link
            to="/offseason/scouting"
            className="rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Return to Scouting
          </Link>
        </div>
      </div>
    );
  }

  const offeredPlayers = run.team_context.roster;
  const requestedPlayers = run.scouting_pre_draft.prospects;
  const latestProposal = submitTradeProposal.data;

  const canSubmit = useMemo(() => {
    const hasAssets =
      offeredPlayerId !== null ||
      requestedPlayerId !== null ||
      includeOutgoingPick ||
      includeIncomingPick;
    return hasAssets && !submitTradeProposal.isPending;
  }, [
    includeIncomingPick,
    includeOutgoingPick,
    offeredPlayerId,
    requestedPlayerId,
    submitTradeProposal.isPending,
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-cv-accent mb-2">
          Offseason Simulator
        </p>
        <h1 className="text-4xl font-semibold text-cv-chalk mb-4">Trade Market</h1>
        <p className="max-w-3xl text-cv-chalk/72">
          Build player-for-player or player-for-picks proposals and evaluate each move with fit-based rationale.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-cv border border-cv-court/20 bg-cv-steel p-5">
          <h2 className="text-xl font-semibold text-cv-chalk mb-3">
            Proposal Builder
          </h2>

          <label className="mb-3 block text-sm text-cv-chalk/80">
            Outgoing player
            <select
              className="mt-1 w-full rounded-cv border border-cv-court/20 bg-cv-navy/50 px-3 py-2 text-cv-chalk"
              value={offeredPlayerId ?? ''}
              onChange={(event) =>
                setOfferedPlayerId(
                  event.target.value ? Number(event.target.value) : null
                )
              }
            >
              <option value="">None</option>
              {offeredPlayers.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.full_name} ({player.position})
                </option>
              ))}
            </select>
          </label>

          <label className="mb-3 block text-sm text-cv-chalk/80">
            Incoming player target
            <select
              className="mt-1 w-full rounded-cv border border-cv-court/20 bg-cv-navy/50 px-3 py-2 text-cv-chalk"
              value={requestedPlayerId ?? ''}
              onChange={(event) =>
                setRequestedPlayerId(
                  event.target.value ? Number(event.target.value) : null
                )
              }
            >
              <option value="">None</option>
              {requestedPlayers.map((prospect) => (
                <option key={prospect.player_id} value={prospect.player_id}>
                  {prospect.full_name} (rank {prospect.board_rank}, uncertainty{' '}
                  {prospect.uncertainty_band})
                </option>
              ))}
            </select>
          </label>

          <div className="mb-3 flex flex-col gap-2 text-sm text-cv-chalk/80">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeOutgoingPick}
                onChange={(event) => setIncludeOutgoingPick(event.target.checked)}
              />
              Include outgoing first-round pick
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeIncomingPick}
                onChange={(event) => setIncludeIncomingPick(event.target.checked)}
              />
              Request incoming first-round pick
            </label>
          </div>

          <label className="mb-4 block text-sm text-cv-chalk/80">
            Front office decision
            <select
              className="mt-1 w-full rounded-cv border border-cv-court/20 bg-cv-navy/50 px-3 py-2 text-cv-chalk"
              value={decision}
              onChange={(event) =>
                setDecision(event.target.value as 'accepted' | 'rejected')
              }
            >
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>

          <button
            type="button"
            className="rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={!canSubmit}
            onClick={() => {
              submitTradeProposal.mutate({
                runId: run.run_id,
                offered_player_ids: offeredPlayerId ? [offeredPlayerId] : [],
                offered_pick_ids: includeOutgoingPick
                  ? [`${run.team_context.team?.abbreviation ?? 'TEAM'}-future-R1`]
                  : [],
                requested_player_ids: requestedPlayerId ? [requestedPlayerId] : [],
                requested_pick_ids: includeIncomingPick ? ['partner-future-R1'] : [],
                decision,
              });
            }}
          >
            Evaluate Trade Fit
          </button>
        </section>

        <section className="rounded-cv border border-cv-court/20 bg-cv-steel p-5">
          <h2 className="text-xl font-semibold text-cv-chalk mb-3">
            Fit Explanation
          </h2>
          {latestProposal ? (
            <div className="rounded-cv border border-cv-court/20 bg-cv-navy/45 p-4">
              <p className="text-sm text-cv-chalk/80 mb-2">
                Verdict:{' '}
                <span className="font-semibold uppercase tracking-[0.08em]">
                  {latestProposal.verdict}
                </span>
              </p>
              <p className="text-sm text-cv-chalk/80 mb-3">
                Fit score: {latestProposal.fit_score}
              </p>
              <ul className="space-y-2 text-sm text-cv-chalk/75">
                {latestProposal.rationale.map((line) => (
                  <li key={line}>• {line}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-cv-chalk/72">
              Submit a proposal to get fit-based rationale.
            </p>
          )}

          {submitTradeProposal.isError ? (
            <p className="mt-4 text-sm text-red-300">
              Could not evaluate trade: {submitTradeProposal.error.message}
            </p>
          ) : null}

          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-cv-accent mb-2">
              Proposal History
            </h3>
            <ul className="space-y-2 text-sm text-cv-chalk/75">
              {run.trade_market.proposals.slice().reverse().map((proposal) => (
                <li
                  key={proposal.id}
                  className="rounded-cv border border-cv-court/15 bg-cv-navy/35 px-3 py-2"
                >
                  {proposal.decision.toUpperCase()} • {proposal.verdict.toUpperCase()} • score{' '}
                  {proposal.fit_score}
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={async () => {
              await continueToDraftNight.mutateAsync(run.run_id);
            }}
            className="mt-6 rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white"
            disabled={continueToDraftNight.isPending}
          >
            Continue to Draft Night
          </button>
        </section>
      </div>
    </div>
  );
}

