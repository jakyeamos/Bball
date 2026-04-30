import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';

export function DraftSimEntryPage() {
  const { isConnected, error } = useApp();

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <section className="mb-8 overflow-hidden rounded-[1.5rem] border border-cv-court/20 bg-cv-steel/90">
        <div className="grid gap-8 p-8 lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-cv-accent">Draft Sim</p>
            <h1 className="mb-4 text-5xl font-semibold text-cv-chalk">
              Draft Sim: apply what you learned in a live draft room.
            </h1>
            <p className="mb-6 max-w-2xl text-lg leading-8 text-cv-chalk/72">
              Start with a lobby, draft against other teams, then carry your roster into the coaching
              and season loop. The active draft board stays reserved for rooms already in progress.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/lobby"
                className="rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-500"
              >
                Create or join a lobby
              </Link>
              <Link
                to="/browse"
                className="rounded-cv border border-cv-court/30 px-4 py-2 text-sm font-semibold text-cv-chalk transition-colors hover:border-cv-accent/60"
              >
                Browse public lobbies
              </Link>
            </div>
          </div>

          <Card className="bg-cv-navy/35" padding="lg">
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-cv-accent">Connection</p>
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
          </Card>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {[
          ['1', 'Lobby setup', 'Name your team, choose roster settings, or join with an invite code.'],
          ['2', 'Draft room', 'Pick from the board once a lobby starts. This is the only place `/draft` is used.'],
          ['3', 'Recap and coach', 'Review the roster, learn from the draft, then move into the season loop.'],
        ].map(([step, title, description]) => (
          <Card key={step} className="bg-cv-steel/80">
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-cv-accent">Step {step}</p>
            <h3 className="mb-2 text-xl font-semibold text-cv-chalk">{title}</h3>
            <p className="text-sm leading-6 text-cv-chalk/68">{description}</p>
          </Card>
        ))}
      </section>
    </main>
  );
}
