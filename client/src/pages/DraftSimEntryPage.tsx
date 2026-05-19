import React from 'react';
import { useApp } from '../context/AppContext';
import {
  SimulatorActionLink,
  SimulatorPanel,
  SimulatorShell,
} from '../components/sim/SimulatorShell';

export function DraftSimEntryPage() {
  const { isConnected, error } = useApp();

  return (
    <SimulatorShell
      eyebrow="Draft Sim"
      title="Apply what you learned in a live draft room."
      description="Start with a lobby, draft against other teams, then carry your roster into the coaching and season loop. The active draft board stays reserved for rooms already in progress."
      actions={
        <>
          <SimulatorActionLink to="/lobby">Create or join a lobby</SimulatorActionLink>
          <SimulatorActionLink to="/browse" variant="secondary">
            Browse public lobbies
          </SimulatorActionLink>
        </>
      }
      activePhase="Lobby setup"
      phases={[
        { label: 'Lobby setup', to: '/lobby' },
        { label: 'Draft room' },
        { label: 'Recap and coach' },
      ]}
      aside={
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cv-accent">
            Connection
          </p>
          <h2 className="mb-3 text-2xl font-semibold text-cv-chalk">
            {isConnected ? 'Server ready' : 'Connecting to draft server'}
          </h2>
          <p className="text-sm leading-6 text-cv-chalk/70">
            {error
              ? `We could not reach the draft server yet: ${error}`
              : isConnected
                ? 'You can create, join, or browse lobbies.'
                : 'Lobby actions will become available once the WebSocket connection opens.'}
          </p>
          <div
            className={`mt-5 h-1.5 rounded-full ${
              isConnected ? 'bg-emerald-400' : 'bg-cv-accent/70'
            }`}
          />
        </div>
      }
    >
      <section className="grid gap-4 lg:grid-cols-3">
        {[
          ['1', 'Lobby setup', 'Name your team, choose roster settings, or join with an invite code.'],
          ['2', 'Draft room', 'Pick from the board once a lobby starts. This is the only place `/draft` is used.'],
          ['3', 'Recap and coach', 'Review the roster, learn from the draft, then move into the season loop.'],
        ].map(([step, title, description]) => (
          <SimulatorPanel key={step} kicker={`Step ${step}`} title={title}>
            <p className="text-sm leading-6 text-cv-chalk/68">{description}</p>
          </SimulatorPanel>
        ))}
      </section>
    </SimulatorShell>
  );
}
