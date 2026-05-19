import React from 'react';
import { useNavigate } from 'react-router-dom';
import { featureFlags } from '@nba-draft-sim/shared';
import { useCoachingMarket } from '../../features/offseason/useCoachingMarket';
import { SimulatorButton, SimulatorPanel } from '../../components/sim/SimulatorShell';
import { OffseasonNotice, OffseasonShell } from './OffseasonShell';

export function CoachingMarketPage(): JSX.Element {
  const navigate = useNavigate();
  const coachingEnabled =
    featureFlags.offseasonFoundationEnabled &&
    featureFlags.offseasonTeamContextEnabled &&
    featureFlags.offseasonCoachingMarketEnabled;
  const { activeRunQuery, coachingMarketQuery, hireCoach, continueToScouting } =
    useCoachingMarket(coachingEnabled);

  if (!coachingEnabled) {
    return (
      <OffseasonNotice
        title="Coaching Market is not enabled in this environment."
        description="Enable `VITE_ENABLE_OFFSEASON_COACHING_MARKET` to continue this phase."
        actionTo="/offseason/team-context"
        actionLabel="Back to Team Context"
        tone="warning"
      />
    );
  }

  if (activeRunQuery.isLoading) {
    return <OffseasonNotice title="Loading active offseason run..." actionTo="/offseason/team-context" actionLabel="Back to Team Context" />;
  }

  if (activeRunQuery.isError) {
    return (
      <OffseasonNotice
        title="Failed to load offseason run."
        description={activeRunQuery.error.message}
        actionTo="/offseason/team-context"
        actionLabel="Back to Team Context"
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

  if (run.phase !== 'coaching_market') {
    return (
      <OffseasonNotice
        title="Coaching Market is not active yet."
        description={`Current phase: ${run.phase}`}
        actionTo="/offseason/team-context"
        actionLabel="Return to Team Context"
      />
    );
  }

  return (
    <OffseasonShell
      title="Coaching Market"
      description="Hire a coach and lock in the tendency profile that will shape scouting and grading through the rest of this run."
      activePhase="Coaching Market"
    >
      {coachingMarketQuery.isError ? (
        <p className="mb-4 text-sm text-red-300">
          Failed to load coach pool: {coachingMarketQuery.error.message}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <SimulatorPanel title="Coach Pool">
          {coachingMarketQuery.isLoading ? (
            <p className="text-sm text-cv-chalk/70">Loading coaching options...</p>
          ) : null}
          <div className="max-h-[34rem] space-y-3 overflow-auto pr-1">
            {coachingMarketQuery.data?.map((coach) => {
              const isSelected =
                run.coaching_market.selected_coach?.id === coach.id;
              return (
                <article
                  key={coach.id}
                  className={`rounded-cv border p-4 ${
                    isSelected
                      ? 'border-cv-accent bg-cv-accent/10'
                      : 'border-cv-court/20 bg-cv-navy/40'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-cv-chalk">
                        {coach.head_coach_name}
                      </h3>
                      <p className="text-xs uppercase tracking-[0.12em] text-cv-chalk/60">
                        {coach.team_abbreviation} • {coach.scheme} • {coach.pace} pace
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        hireCoach.mutate({ runId: run.run_id, coachId: coach.id })
                      }
                      className={`rounded-cv px-3 py-1.5 text-xs font-semibold ${
                        isSelected
                          ? 'bg-emerald-500/30 text-emerald-100'
                          : 'bg-cv-accent text-white'
                      }`}
                      disabled={hireCoach.isPending}
                    >
                      {isSelected ? 'Hired' : 'Hire Coach'}
                    </button>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-cv-chalk/75 sm:grid-cols-2">
                    <p>
                      Driver-Friendly:{' '}
                      <span className="font-semibold">
                        {coach.driver_friendly ? 'Yes' : 'No'}
                      </span>
                    </p>
                    <p>
                      Shooter-Friendly:{' '}
                      <span className="font-semibold">
                        {coach.shooter_friendly ? 'Yes' : 'No'}
                      </span>
                    </p>
                    <p>
                      Youth Development:{' '}
                      <span className="font-semibold">
                        {coach.youth_development ? 'High' : 'Limited'}
                      </span>
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </SimulatorPanel>

        <SimulatorPanel title="Hire Impact">
          {run.coaching_market.selected_coach ? (
            <>
              <p className="text-sm text-cv-chalk/75 mb-3">
                Hired coach:{' '}
                <span className="font-semibold text-cv-chalk">
                  {run.coaching_market.selected_coach.head_coach_name}
                </span>
              </p>
              <div className="rounded-cv border border-cv-court/15 bg-cv-navy/40 p-3">
                <h3 className="text-xs uppercase tracking-[0.16em] text-cv-accent mb-2">
                  Downstream Effects
                </h3>
                <ul className="space-y-2 text-sm text-cv-chalk/80">
                  {run.coaching_market.hiring_notes.map((note) => (
                    <li key={note}>• {note}</li>
                  ))}
                </ul>
              </div>
              <SimulatorButton
                type="button"
                onClick={async () => {
                  await continueToScouting.mutateAsync(run.run_id);
                  navigate('/offseason/scouting');
                }}
                className="mt-5"
                disabled={continueToScouting.isPending}
              >
                Continue to Scouting
              </SimulatorButton>
            </>
          ) : (
            <p className="text-sm text-cv-chalk/72">
              Choose a coach to unlock tendency-adjusted valuations for the next phases.
            </p>
          )}

          {hireCoach.isError ? (
            <p className="mt-4 text-sm text-red-300">
              Unable to hire coach: {hireCoach.error.message}
            </p>
          ) : null}
          {continueToScouting.isError ? (
            <p className="mt-4 text-sm text-red-300">
              Unable to transition to scouting: {continueToScouting.error.message}
            </p>
          ) : null}
        </SimulatorPanel>
      </div>
    </OffseasonShell>
  );
}
