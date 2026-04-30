import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { featureFlags } from '@nba-draft-sim/shared';
import supabase, { isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { user, signOutUser } = useAuth();
  const supabaseClient = isSupabaseConfigured ? supabase : null;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  if (!featureFlags.accountUpgradeEnabled) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-cv-accent mb-2">Account</p>
      <h1 className="text-4xl font-semibold text-cv-chalk mb-4">Sign in</h1>
      {!supabaseClient ? (
        <p className="rounded-cv border border-cv-court/20 bg-cv-steel p-5 text-sm leading-6 text-cv-chalk/70">
          Supabase is not configured in this runtime, so account sign-in is unavailable. The rest of the learning platform still works in guest mode.
        </p>
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
                const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
                setStatus(error ? error.message : 'Signed in successfully.');
              }}
              className="rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white"
            >
              Sign in
            </button>
            {user ? (
              <button
                type="button"
                onClick={signOutUser}
                className="rounded-cv border border-cv-court/20 px-4 py-2 text-sm font-semibold text-cv-chalk"
              >
                Sign out
              </button>
            ) : null}
            {status ? <p className="text-sm text-cv-chalk/70">{status}</p> : null}
          </div>
        </div>
      )}
    </div>
  );
}
