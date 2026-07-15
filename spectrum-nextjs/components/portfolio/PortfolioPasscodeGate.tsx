'use client';

import { useState } from 'react';
import { portfolioBuilder, type PublicPortfolio } from '@/lib/api';
import PortfolioPublicView from './PortfolioPublicView';
import ViewBeacon from './ViewBeacon';

/**
 * Shown when a portfolio's public aggregator returns `locked: true`. Prompts
 * for the passcode, exchanges it for a short-lived access token, then
 * fetches and renders the real portfolio client-side. Password-protected
 * portfolios are an explicit privacy opt-in, so client-side rendering here
 * (rather than pre-rendered SEO) is the right tradeoff.
 */
export default function PortfolioPasscodeGate({ username }: { username: string }) {
  const [passcode, setPasscode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PublicPortfolio | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { token } = await portfolioBuilder.unlockPortfolio(username, passcode.trim());
      const full = await portfolioBuilder.getPublic(username, token);
      if (full.locked || !full.profile) throw new Error('Incorrect passcode. Please try again.');
      setData(full);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Incorrect passcode. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (data) {
    return (
      <>
        <ViewBeacon username={username} />
        <PortfolioPublicView data={data} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
          <i className="fa-solid fa-lock text-2xl text-gray-400" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2 text-center">This portfolio is private</h1>
        <p className="text-sm text-gray-500 mb-6 text-center">Enter the passcode the creator shared with you.</p>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            value={passcode}
            onChange={e => setPasscode(e.target.value)}
            placeholder="Passcode"
            autoFocus
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-center focus:outline-none focus:border-cobalt"
          />
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <button type="submit" disabled={busy || !passcode.trim()}
            className="w-full inline-flex items-center justify-center gap-2 bg-cobalt text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition disabled:opacity-60">
            {busy ? <><i className="fa-solid fa-circle-notch animate-spin" /> Checking…</> : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  );
}
