'use client';

import { useState, useEffect, useCallback } from 'react';
import { etf, EtfVaultSummary, EtfContribution, EtfProjection } from '../../../../lib/api';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatMoney(n: number, currency = 'USD') {
  return n.toLocaleString('en-US', { style: 'currency', currency, maximumFractionDigits: 2 });
}

const PAYOUT_METHODS = ['bank_transfer', 'paypal', 'stripe'] as const;
const REINVEST_TARGETS = [
  { value: 'profile_boost',       label: 'Profile Boost',        desc: 'Increase profile visibility' },
  { value: 'service_boost',       label: 'Service Boost',        desc: 'Boost a gig listing' },
  { value: 'subscription_upgrade',label: 'Subscription Upgrade', desc: 'Apply toward a plan upgrade' },
];

const STATUS_COLOR: Record<string, string> = {
  active:            'bg-blue-50 text-blue-700',
  matured:           'bg-emerald-50 text-emerald-700',
  partially_claimed: 'bg-amber-50 text-amber-700',
  claimed:           'bg-gray-100 text-gray-500',
  forfeited:         'bg-red-50 text-red-700',
};

export default function ETFPage() {
  const [vault, setVault] = useState<EtfVaultSummary | null>(null);
  const [noVault, setNoVault] = useState(false);
  const [noVaultMsg, setNoVaultMsg] = useState('');
  const [contribs, setContribs] = useState<EtfContribution[]>([]);
  const [projection, setProjection] = useState<EtfProjection | null>(null);
  const [loading, setLoading] = useState(true);

  // Claim modal state
  const [showClaim, setShowClaim] = useState(false);
  const [claimAmount, setClaimAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<string>(PAYOUT_METHODS[0]);
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState('');
  const [claimErr, setClaimErr] = useState('');

  // Reinvest modal state
  const [showReinvest, setShowReinvest] = useState(false);
  const [reinvestAmount, setReinvestAmount] = useState('');
  const [reinvestTarget, setReinvestTarget] = useState(REINVEST_TARGETS[0].value);
  const [reinvesting, setReinvesting] = useState(false);
  const [reinvestMsg, setReinvestMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [vaultRes, contribRes] = await Promise.all([
        etf.getVault(),
        etf.getContributions({ page_size: 20 }).catch(() => ({ contributions: [], total: 0, page: 1, page_size: 20, has_more: false })),
      ]);

      if ('has_vault' in vaultRes && !vaultRes.has_vault) {
        setNoVault(true);
        setNoVaultMsg(vaultRes.message);
      } else {
        setVault(vaultRes as EtfVaultSummary);
        setNoVault(false);
      }

      setContribs(contribRes.contributions);

      // Load projections (may 404 if no vault)
      etf.getProjections().then(setProjection).catch(() => {});
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaiming(true); setClaimErr('');
    try {
      const amt = claimAmount ? Number(claimAmount) : undefined;
      const res = await etf.claim(payoutMethod, amt);
      setClaimMsg(`${formatMoney(res.claimed_amount)} claimed via ${payoutMethod.replace('_', ' ')}. ${res.message}`);
      setVault(prev => prev ? { ...prev, total_balance: res.remaining_balance } : prev);
    } catch (e) {
      setClaimErr((e as Error).message);
    } finally {
      setClaiming(false);
    }
  };

  const handleReinvest = async (e: React.FormEvent) => {
    e.preventDefault();
    setReinvesting(true);
    try {
      const res = await etf.reinvest(Number(reinvestAmount), reinvestTarget);
      setReinvestMsg(`${formatMoney(res.reinvested_amount)} reinvested into ${reinvestTarget.replace('_', ' ')}. ${res.message}`);
      setVault(prev => prev ? { ...prev, total_balance: res.remaining_balance } : prev);
    } catch (e) {
      setReinvestMsg((e as Error).message);
    } finally {
      setReinvesting(false);
    }
  };

  // Build chart data from contributions (chronological, last 8)
  const chartItems = [...contribs].reverse().slice(-8);
  const chartMax = Math.max(...chartItems.map(c => c.amount), 1);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Loading your ETF vault…</p>
      </div>
    );
  }

  if (noVault) {
    return (
      <>
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">ETF Trust Fund</h1>
          <p className="text-lg text-gray-600">Your creator savings vault — automatically grows with each project.</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <i className="fa-solid fa-vault text-cobalt text-2xl"></i>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No vault yet</h3>
          <p className="text-gray-500 text-sm leading-relaxed">{noVaultMsg}</p>
          <p className="text-gray-400 text-xs mt-4">A portion of each completed project payment is automatically contributed to your ETF vault.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">ETF Trust Fund</h1>
        <p className="text-lg text-gray-600">Your creator savings vault — automatically grows a portion of your earnings.</p>
      </div>

      {/* Vault Card + Stats */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-gradient-to-br from-cobalt via-blue-600 to-blue-500 rounded-3xl p-10 text-white relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-400 rounded-full opacity-20 blur-3xl pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-sm font-bold uppercase tracking-widest text-blue-100">Vault Balance</span>
              {vault && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[vault.status] ?? 'bg-blue-100 text-blue-700'}`}>
                  {vault.status.replace('_', ' ')}
                </span>
              )}
            </div>
            <p className="text-6xl font-bold mt-2 mb-1">{formatMoney(vault?.total_balance ?? 0)}</p>
            {vault && (
              <p className="text-blue-100 text-sm mb-6">
                {vault.is_matured
                  ? 'Vault matured — funds are claimable'
                  : `Matures in ${vault.days_until_maturity} day${vault.days_until_maturity !== 1 ? 's' : ''} · ${formatDate(vault.maturity_date)}`
                }
              </p>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              {vault?.is_matured && (
                <button onClick={() => setShowClaim(v => !v)}
                  className="px-5 py-2.5 bg-white text-cobalt rounded-xl font-bold hover:bg-blue-50 transition text-sm">
                  <i className="fa-solid fa-arrow-down mr-2"></i>Claim Funds
                </button>
              )}
              {vault?.is_matured && (
                <button onClick={() => setShowReinvest(v => !v)}
                  className="px-5 py-2.5 bg-white/20 backdrop-blur text-white rounded-xl font-semibold hover:bg-white/30 transition border border-white/30 text-sm">
                  <i className="fa-solid fa-rotate mr-2"></i>Reinvest
                </button>
              )}
              {!vault?.is_matured && (
                <button onClick={load}
                  className="px-5 py-2.5 bg-white/20 backdrop-blur text-white rounded-xl font-semibold hover:bg-white/30 transition border border-white/30 text-sm">
                  <i className="fa-solid fa-rotate mr-2"></i>Refresh
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-500">Total Contributions</span>
              <i className="fa-solid fa-coins text-cobalt"></i>
            </div>
            <p className="text-3xl font-bold text-gray-900">{vault?.contribution_count ?? 0}</p>
            <p className="text-xs text-gray-400 mt-1">Earning events recorded</p>
          </div>
          {projection && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-500">Projected at maturity</span>
                <i className="fa-solid fa-chart-line text-emerald-500"></i>
              </div>
              <p className="text-3xl font-bold text-gray-900">{formatMoney(projection.projected_balance_at_maturity)}</p>
              <p className="text-xs text-gray-400 mt-1">{projection.projection_basis}</p>
            </div>
          )}
          {!projection && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-500">Claimed</span>
                <i className="fa-solid fa-check-circle text-emerald-500"></i>
              </div>
              <p className="text-3xl font-bold text-gray-900">{formatMoney(vault?.claimed_amount ?? 0)}</p>
              <p className="text-xs text-gray-400 mt-1">Total funds claimed</p>
            </div>
          )}
        </div>
      </div>

      {/* Claim Modal */}
      {showClaim && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Claim Matured Funds</h3>
          {claimMsg ? (
            <div className="flex items-center gap-3 text-emerald-700 bg-emerald-50 rounded-xl p-4">
              <i className="fa-solid fa-circle-check text-xl"></i>
              <p className="text-sm font-medium">{claimMsg}</p>
            </div>
          ) : (
            <form onSubmit={handleClaim} className="space-y-4">
              {claimErr && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{claimErr}</div>}
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Amount (leave blank to claim all)</label>
                  <input type="number" min="1" max={vault?.total_balance}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-cobalt"
                    placeholder={`Max ${formatMoney(vault?.total_balance ?? 0)}`}
                    value={claimAmount} onChange={e => setClaimAmount(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Payout method</label>
                  <select value={payoutMethod} onChange={e => setPayoutMethod(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-cobalt bg-white capitalize">
                    {PAYOUT_METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <button type="submit" disabled={claiming}
                    className={`flex-1 px-5 py-2.5 rounded-xl font-semibold text-sm transition ${claiming ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-cobalt text-white hover:bg-blue-700'}`}>
                    {claiming ? 'Processing…' : 'Claim'}
                  </button>
                  <button type="button" onClick={() => setShowClaim(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition">
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Reinvest Modal */}
      {showReinvest && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Reinvest Funds</h3>
          {reinvestMsg ? (
            <div className="flex items-center gap-3 text-emerald-700 bg-emerald-50 rounded-xl p-4">
              <i className="fa-solid fa-circle-check text-xl"></i>
              <p className="text-sm font-medium">{reinvestMsg}</p>
            </div>
          ) : (
            <form onSubmit={handleReinvest} className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Amount ($)</label>
                  <input type="number" min="1" max={vault?.total_balance} required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-cobalt"
                    value={reinvestAmount} onChange={e => setReinvestAmount(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Reinvest into</label>
                  <select value={reinvestTarget} onChange={e => setReinvestTarget(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-cobalt bg-white">
                    {REINVEST_TARGETS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={!reinvestAmount || reinvesting}
                    className={`flex-1 px-5 py-2.5 rounded-xl font-semibold text-sm transition ${!reinvestAmount || reinvesting ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-cobalt text-white hover:bg-blue-700'}`}>
                    {reinvesting ? 'Reinvesting…' : 'Reinvest'}
                  </button>
                  <button type="button" onClick={() => setShowReinvest(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition">
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Contribution Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Recent Contributions</h3>
          {chartItems.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-300">
              <p className="text-sm">No contributions yet</p>
            </div>
          ) : (
            <div className="flex items-end gap-2 h-40">
              {chartItems.map((c, i) => (
                <div key={c.id ?? i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-400">${c.amount}</span>
                  <div className="w-full rounded-t-lg bg-gradient-to-t from-cobalt to-blue-400 transition-all"
                    style={{ height: `${(c.amount / chartMax) * 100}%`, minHeight: 4 }} />
                  <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
              ))}
            </div>
          )}
          {projection && (
            <p className="text-xs text-gray-400 mt-4 text-center">{projection.projection_basis}</p>
          )}
        </div>

        {/* Vault Info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">How ETF Works</h3>
          <div className="space-y-3 text-sm text-gray-600">
            {[
              { icon: 'fa-bolt', color: 'text-cobalt', text: 'Automatically funded from each completed project payment' },
              { icon: 'fa-lock', color: 'text-amber-500', text: 'Funds are locked until the vault maturity date' },
              { icon: 'fa-circle-check', color: 'text-emerald-600', text: 'Claim or reinvest into platform features once matured' },
            ].map(({ icon, color, text }) => (
              <div key={text} className="flex items-start gap-3">
                <i className={`fa-solid ${icon} ${color} mt-0.5 flex-shrink-0`}></i>
                <p>{text}</p>
              </div>
            ))}
          </div>
          {vault && (
            <div className="mt-5 pt-5 border-t border-gray-100 text-sm space-y-2 text-gray-600">
              <div className="flex justify-between">
                <span>Vault created</span>
                <span className="font-semibold">{formatDate(vault.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span>Matures</span>
                <span className="font-semibold">{formatDate(vault.maturity_date)}</span>
              </div>
              {vault.claimed_amount > 0 && (
                <div className="flex justify-between">
                  <span>Total claimed</span>
                  <span className="font-semibold text-emerald-600">{formatMoney(vault.claimed_amount)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Contributions Table */}
      <div className="bg-white rounded-2xl border border-gray-200 mt-6 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Contribution History</h3>
          <span className="text-sm text-gray-400">{contribs.length} entries</span>
        </div>
        {contribs.length === 0 ? (
          <div className="p-16 text-center text-gray-400">
            <i className="fa-solid fa-coins text-3xl mb-3 block text-gray-200"></i>
            <p className="text-sm">No contributions yet. Complete a project to start earning trust rewards.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Date</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Source</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Type</th>
                  <th className="text-right px-6 py-3 font-semibold text-gray-600">Amount</th>
                </tr>
              </thead>
              <tbody>
                {contribs.map((c) => (
                  <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-gray-500">{formatDate(c.created_at)}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{c.description || c.source_id || '—'}</td>
                    <td className="px-6 py-4 text-gray-500 capitalize">{c.source_type.replace(/_/g, ' ')}</td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-600">+{formatMoney(c.amount, c.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
