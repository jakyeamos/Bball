import React from 'react';
import { useNavigate } from 'react-router-dom';
import { featureFlags } from '@nba-draft-sim/shared';
import { useTeamContext } from '../../features/offseason/useTeamContext';
import { SimulatorButton, SimulatorPanel } from '../../components/sim/SimulatorShell';
import { OffseasonNotice, OffseasonShell } from './OffseasonShell';

export function TeamContextPage(): JSX.Element {
  const navigate = useNavigate();
  const offseasonEnabled =
    featureFlags.offseasonFoundationEnabled &&
    featureFlags.offseasonTeamContextEnabled;
  const coachingMarketEnabled = featureFlags.offseasonCoachingMarketEnabled;
  const {
    teamsQuery,
    activeRunQuery,
    selectTeam,
    continueToCoachingMarket,
  } = useTeamContext(offseasonEnabled);

  if (!offseasonEnabled) {
    return (
      <OffseasonNotice
        title="Team Context is not enabled in this environment."
        description="Enable `VITE_ENABLE_OFFSEASON_FOUNDATION` and `VITE_ENABLE_OFFSEASON_TEAM_CONTEXT` to access this flow."
        actionTo="/gm-iq"
        actionLabel="Back to GM IQ"
        tone="warning"
      />
    );
  }
  const run = activeRunQuery.data;

  return (
    <OffseasonShell
      title="Team Context"
      description="Select a real NBA team to load roster context, draft capital, timeline pressure, and immediate needs before entering the decision loop."
      activePhase="Team Context"
      aside={
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cv-accent">
            Resume-safe
          </p>
          <p className="mt-2 text-sm leading-6 text-cv-chalk/70">
            Team selection writes the run state immediately, so users can leave and continue from the same phase.
          </p>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <SimulatorPanel title="Choose Team">
          {teamsQuery.isLoading ? (
            <p className="text-sm text-cv-chalk/70">Loading NBA teams...</p>
          ) : null}
          {teamsQuery.isError ? (
            <p className="text-sm text-red-300">
              Failed to load teams: {teamsQuery.error.message}
            </p>
          ) : null}
          <div className="max-h-[26rem] space-y-2 overflow-auto pr-1">
            {teamsQuery.data?.map((team) => {
              const selected = run?.team_context.selected_team_id === team.id;
              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => selectTeam.mutate(team.id)}
                  className={`w-full rounded-cv border px-3 py-2 text-left ${
                    selected
                      ? 'border-cv-accent bg-cv-accent/10 text-cv-chalk'
                      : 'border-cv-court/20 bg-cv-navy/40 text-cv-chalk/80 hover:border-cv-accent/50'
                  }`}
                >
                  <p className="text-sm font-semibold">{team.full_name}</p>
                  <p className="text-xs text-cv-chalk/60">
                    {team.conference} • {team.division}
                  </p>
                </button>
              );
            })}
          </div>
        </SimulatorPanel>

        <SimulatorPanel>
          {run?.team_context.team ? (
            <>
              <p className="text-xs uppercase tracking-[0.2em] text-cv-accent mb-2">
                Active Run
              </p>
              <h2 className="text-2xl font-semibold text-cv-chalk mb-2">
                {run.team_context.team.full_name}
              </h2>
              <p className="text-sm text-cv-chalk/65 mb-5">
                Timeline: <span className="font-semibold text-cv-chalk">{run.team_context.timeline}</span>
              </p>

              <div className="mb-5">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-cv-accent mb-2">
                  Obvious Needs
                </h3>
                <ul className="space-y-1">
                  {run.team_context.needs.map((need) => (
                    <li key={need} className="text-sm text-cv-chalk/80">
                      • {need}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-5">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-cv-accent mb-2">
                  Draft Picks
                </h3>
                <ul className="space-y-1">
                  {run.team_context.picks.map((pick) => (
                    <li key={pick.id} className="text-sm text-cv-chalk/80">
                      {pick.year} Round {pick.round} • {pick.note}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-cv-accent mb-2">
                  Roster ({run.team_context.roster.length})
                </h3>
                <div className="max-h-52 overflow-auto rounded-cv border border-cv-court/15 bg-cv-navy/40 p-3">
                  {run.team_context.roster.map((player) => (
                    <p key={player.id} className="text-sm text-cv-chalk/75">
                      {player.full_name} • {player.position}
                    </p>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <SimulatorButton
                  type="button"
                  onClick={async () => {
                    const nextRun = await continueToCoachingMarket.mutateAsync();
                    if (nextRun?.phase === 'coaching_market') {
                      navigate('/offseason/coaching-market');
                    }
                  }}
                  disabled={!coachingMarketEnabled || continueToCoachingMarket.isPending}
                >
                  Continue to Coaching Market
                </SimulatorButton>
                <span className="self-center text-xs text-cv-chalk/60">
                  Resume-safe: state is saved on every step.
                </span>
              </div>
              {!coachingMarketEnabled ? (
                <p className="mt-3 text-xs text-cv-chalk/60">
                  Coaching Market is currently disabled by feature flag.
                </p>
              ) : null}
            </>
          ) : (
            <div className="rounded-cv border border-cv-court/20 bg-cv-navy/35 p-5">
              <p className="text-sm text-cv-chalk/72">
                Select a team to load roster, picks, timeline, and needs.
              </p>
            </div>
          )}

          {selectTeam.isError ? (
            <p className="mt-4 text-sm text-red-300">
              Could not save Team Context: {selectTeam.error.message}
            </p>
          ) : null}
        </SimulatorPanel>
      </div>
    </OffseasonShell>
  );
}
