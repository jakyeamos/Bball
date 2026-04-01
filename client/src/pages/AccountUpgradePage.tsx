import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { featureFlags } from '@nba-draft-sim/shared';
import supabase, { isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function AccountUpgradePage() {
  const { user, authMode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  if (!featureFlags.accountUpgradeEnabled) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-cv-accent mb-2">Account Upgrade</p>
      <h1 className="text-4xl font-semibold text-cv-chalk mb-4">Keep your progress across devices</h1>
      <p className="text-cv-chalk/70 mb-6">
        Upgrade is optional. If Supabase is configured, the anonymous user id stays the same and your progress remains attached to that account.
      </p>

      {!isSupabaseConfigured || !supabase || authMode === 'guest' || !user ? (
        <div className="rounded-cv border border-cv-court/20 bg-cv-steel p-5 text-sm leading-6 text-cv-chalk/70">
          Account upgrade is unavailable in guest-only mode. Configure Supabase and use an anonymous Supabase session to test the continuity flow.
        </div>
      ) : (
        <div className="rounded-cv border border-cv-court/20 bg-cv-steel p-6">
          <div className="grid gap-4">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="rounded-cv border border-cv-court/20 bg-cv-navy/40 px-4 py-3 text-cv-chalk placeholder:text-cv-chalk/40"
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              className="rounded-cv border border-cv-court/20 bg-cv-navy/40 px-4 py-3 text-cv-chalk placeholder:text-cv-chalk/40"
            />
            <button
              type="button"
              onClick={async () => {
                const session = await supabase.auth.getSession();
                const token = session.data.session?.access_token;

                if (!token || !user) {
                  setStatus('Missing active anonymous session.');
                  return;
                }

                const response = await fetch(`${API_URL}/internal/account-upgrade`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    anonymous_user_id: user.id,
                    email,
                    password,
                  }),
                });

                const payload = await response.json();
                setStatus(
                  response.ok
                    ? `Upgrade complete. ${payload.upgrade.migrated_rows.lesson_progress} progress rows preserved.`
                    : payload.errors?.[0] ?? 'Upgrade failed.'
                );
              }}
              className="rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white"
            >
              Upgrade account
            </button>
            {status ? <p className="text-sm text-cv-chalk/70">{status}</p> : null}
          </div>
        </div>
      )}
    </div>
  );
}
