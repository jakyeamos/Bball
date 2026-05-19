import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { featureFlags } from '@nba-draft-sim/shared';
import { useTradeMarket } from '../../features/offseason/useTradeMarket';
import {
  SimulatorButton,
  SimulatorPanel,
  inputControlClassName,
} from '../../components/sim/SimulatorShell';
import { OffseasonNotice, OffseasonShell } from './OffseasonShell';

export function TradeMarketPage(): JSX.Element {
  const navigate = useNavigate();
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
      <OffseasonNotice
        title="Trade Market is not enabled in this environment."
        description="Enable `VITE_ENABLE_OFFSEASON_TRADE_MARKET` to continue."
        actionTo="/offseason/scouting"
        actionLabel="Back to Scouting"
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

  if (run.phase !== 'trade_market') {
    return (
      <OffseasonNotice
        title="Trade Market is not active."
        description={`Current phase: ${run.phase}`}
        actionTo="/offseason/scouting"
        actionLabel="Return to Scouting"
      />
    );
  }

  const offeredPlayers = run.team_context.roster;
  const requestedPlayers = run.scouting_pre_draft.prospects;
  const latestProposal = submitTradeProposal.data;

  const hasAssets =
    offeredPlayerId !== null ||
    requestedPlayerId !== null ||
    includeOutgoingPick ||
    includeIncomingPick;
  const canSubmit = hasAssets && !submitTradeProposal.isPending;

  return (
    <OffseasonShell
      title="Trade Market"
      description="Build player-for-player or player-for-picks proposals and evaluate each move with fit-based rationale."
      activePhase="Trade Market"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <SimulatorPanel title="Proposal Builder">

          <label className="mb-3 block text-sm text-cv-chalk/80">
            Outgoing player
            <select
              className={inputControlClassName()}
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
              className={inputControlClassName()}
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
              className={inputControlClassName()}
              value={decision}
              onChange={(event) =>
                setDecision(event.target.value as 'accepted' | 'rejected')
              }
            >
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>

          <SimulatorButton
            type="button"
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
          </SimulatorButton>
        </SimulatorPanel>

        <SimulatorPanel title="Fit Explanation">
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

          <SimulatorButton
            type="button"
            onClick={async () => {
              await continueToDraftNight.mutateAsync(run.run_id);
              navigate('/offseason/draft-night');
            }}
            className="mt-6"
            disabled={continueToDraftNight.isPending}
          >
            Continue to Draft Night
          </SimulatorButton>
        </SimulatorPanel>
      </div>
    </OffseasonShell>
  );
}
