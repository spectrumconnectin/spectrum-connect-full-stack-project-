'use client';

import { useState, useEffect, useCallback } from 'react';
import { earnings, EarningTransaction, EarningsStats, PayoutBalance } from '@/lib/api';

const TXN_STATUS_STYLE: Record<string, string> = {
  completed:  'bg-emerald-50 text-emerald-700',
  pending:    'bg-amber-50 text-amber-700',
  processing: 'bg-blue-50 text-blue-700',
  failed:     'bg-red-50 text-red-600',
  refunded:   'bg-gray-100 text-gray-600',
  cancelled:  'bg-gray-100 text-gray-500',
};

const TYPE_LABEL: Record<string, string> = {
  payment:      'Payment',
  withdrawal:   'Withdrawal',
  refund:       'Refund',
  bonus:        'Bonus',
  team_split:   'Team Split',
  subscription: 'Subscription',
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function BarChart({ data }: { data: { month: string; amount: number }[] }) {
  const max = Math.max(...data.map(d => d.amount), 1);
  return (
    <div className="flex items-end justify-between h-40 gap-2 mt-4">
      {data.map(({ month, amount }) => (
        <div key={month} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-xs text-gray-500 font-medium">${amount > 999 ? `${(amount / 1000).toFixed(1)}k` : amount.toFixed(0)}</span>
          <div className="w-full relative flex items-end" style={{ height: 100 }}>
            <div
              className="w-full bg-gradient-to-t from-cobalt to-blue-400 rounded-t-lg transition-all duration-500"
              style={{ height: `${Math.max((amount / max) * 100, amount > 0 ? 4 : 0)}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{month}</span>
        </div>
      ))}
    </div>
  );
}

export default function EarningsPage() {
  const [txns, setTxns] = useState<EarningTransaction[]>([]);
  const [stats, setStats] = useState<EarningsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  // Payout state
  const [balance, setBalance] = useState<PayoutBalance | null>(null);
  const [paypalEmail, setPaypalEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');

  const loadBalance = useCallback(async () => {
    try {
      const b = await earnings.getBalance();
      setBalance(b);
      setPaypalEmail(b.paypal_email ?? '');
      setEditingEmail(!b.paypal_email);
      setWithdrawAmount(b.available > 0 ? b.available.toFixed(2) : '');
    } catch { /* balance is best-effort */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      earnings.getStats(),
      earnings.getTransactions({ limit: 40 }),
    ])
      .then(([s, t]) => {
        setStats(s);
        setTxns(t);
      })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
    loadBalance();
  }, [loadBalance]);

  const openWithdraw = async () => {
    setWithdrawError('');
    setShowModal(true);
    await loadBalance();
  };

  const handleSaveEmail = async () => {
    setSavingEmail(true); setWithdrawError('');
    try {
      await earnings.savePayoutMethod(paypalEmail.trim());
      setEditingEmail(false);
      await loadBalance();
    } catch (e) { setWithdrawError((e as Error).message); }
    finally { setSavingEmail(false); }
  };

  const handleWithdraw = async () => {
    const amt = Number(withdrawAmount);
    if (!amt || amt <= 0) { setWithdrawError('Enter a valid amount.'); return; }
    setWithdrawing(true); setWithdrawError('');
    try {
      const res = await earnings.withdraw(amt);
      setShowModal(false);
      setWithdrawSuccess(res.message);
      setTimeout(() => setWithdrawSuccess(''), 6000);
      // refresh balance + transactions
      await loadBalance();
      earnings.getTransactions({ limit: 40 }).then(setTxns).catch(() => {});
      earnings.getStats().then(setStats).catch(() => {});
    } catch (e) { setWithdrawError((e as Error).message); }
    finally { setWithdrawing(false); }
  };

  useEffect(() => {
    const params: { status?: string; type?: string; limit: number } = { limit: 40 };
    if (statusFilter) params.status = statusFilter;
    if (typeFilter) params.type = typeFilter;
    earnings.getTransactions(params).then(setTxns).catch(() => {});
  }, [statusFilter, typeFilter]);

  const filtered = txns;

  return (
    <>
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Earnings</h1>
          <p className="text-lg text-gray-600">Your income, payouts, and pending balances at a glance.</p>
        </div>
        <button
          onClick={() => earnings.downloadCreatorCSV()}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition shadow-sm">
          <i className="fa-solid fa-download text-cobalt"></i>
          Download Earnings Report (CSV)
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading earnings…</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <i className="fa-solid fa-circle-exclamation text-4xl text-red-300 mb-4 block"></i>
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      ) : (
        <>
          {/* Balance cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
            <div className="lg:col-span-2 bg-gradient-to-br from-cobalt via-blue-600 to-blue-500 rounded-3xl p-10 text-white relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-96 h-96 bg-purple-400 rounded-full opacity-20 blur-3xl pointer-events-none"></div>
              <div className="relative">
                <span className="text-sm font-bold uppercase tracking-widest text-blue-100">Total Earned</span>
                <p className="text-6xl font-bold mt-3 mb-6">
                  ${(stats?.total_earned ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                {/* Available-to-withdraw line */}
                {balance && (
                  <p className="text-sm text-blue-100 mb-4 -mt-3">
                    <span className="font-semibold text-white">
                      ${balance.available.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span> available to withdraw
                  </p>
                )}
                <div className="flex items-center gap-3 flex-wrap">
                  <button onClick={openWithdraw}
                    className="px-6 py-3 bg-white text-cobalt rounded-xl font-bold hover:bg-blue-50 transition disabled:opacity-60"
                    disabled={!!balance && balance.available <= 0}>
                    <i className="fa-brands fa-paypal mr-2"></i>Withdraw to PayPal
                  </button>
                  {balance?.paypal_email && (
                    <span className="px-4 py-2.5 bg-white/15 text-white rounded-xl text-xs font-medium border border-white/25 flex items-center gap-2">
                      <i className="fa-brands fa-paypal"></i>{balance.paypal_email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Pending</span>
                  <i className="fa-solid fa-clock text-amber-500"></i>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  ${(stats?.pending ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-400 mt-1">Processing / awaiting release</p>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">This Month</span>
                  <i className="fa-solid fa-chart-line text-emerald-500"></i>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  ${(stats?.this_month ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-400 mt-1">{stats?.transaction_count ?? 0} total transactions</p>
              </div>
            </div>
          </div>

          {/* Platform Fee Info Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-cobalt rounded-xl flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-receipt text-white text-sm"></i>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-1">Platform Fee: 8% per payout</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Spectrum Connect deducts an 8% platform fee from each milestone payment. You receive 92% of the agreed project amount.
                </p>
                <div className="flex flex-wrap gap-4 mt-3 text-sm">
                  {[
                    { label: 'Example — $100 project', value: null },
                    { label: 'Project amount',    value: '$100.00',   color: 'text-gray-700' },
                    { label: 'Platform fee (8%)', value: '−$8.00',    color: 'text-rose-600' },
                    { label: 'You receive',       value: '$92.00',    color: 'text-emerald-600 font-bold' },
                  ].map(({ label, value, color }) => value ? (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className="text-gray-500 text-xs">{label}:</span>
                      <span className={`text-xs font-semibold ${color ?? ''}`}>{value}</span>
                    </div>
                  ) : (
                    <span key={label} className="text-xs text-gray-400 italic self-center">{label}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Chart */}
          {stats && stats.monthly_breakdown.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-10">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-gray-900">Earnings Over Time</h2>
                <span className="text-sm text-gray-400">Last 6 months</span>
              </div>
              <BarChart data={stats.monthly_breakdown} />
            </div>
          )}

          {/* Transactions */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200 flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-xl font-bold text-gray-900">Transactions</h2>
              <div className="flex items-center gap-3 flex-wrap">
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-cobalt bg-white text-gray-700">
                  <option value="">All Statuses</option>
                  {['completed', 'pending', 'processing', 'failed', 'refunded'].map(s => (
                    <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-cobalt bg-white text-gray-700">
                  <option value="">All Types</option>
                  {['payment', 'withdrawal', 'refund', 'bonus', 'team_split'].map(t => (
                    <option key={t} value={t}>{TYPE_LABEL[t] ?? t}</option>
                  ))}
                </select>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="p-16 text-center">
                <i className="fa-solid fa-receipt text-4xl text-gray-300 mb-4 block"></i>
                <p className="text-gray-500 font-medium">No transactions yet</p>
                <p className="text-gray-400 text-sm mt-1">Completed payments will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Date', 'Project', 'Type', 'Gross', 'Fee', 'Net', 'Status'].map(h => (
                        <th key={h} className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{formatDate(t.initiated_at)}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900 max-w-[180px] truncate">
                          {t.project_title || t.description || t.transaction_id}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 capitalize whitespace-nowrap">
                          {TYPE_LABEL[t.type] ?? t.type}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                          ${t.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400 whitespace-nowrap">
                          {(() => {
                            // Prefer the new creator_fee field (precise per-creator deduction).
                            // Fall back to platform_fee for legacy records that pre-date the
                            // commission rollout.
                            const fee = (t.creator_fee && t.creator_fee > 0)
                              ? t.creator_fee
                              : t.platform_fee;
                            return fee > 0 ? `-$${fee.toFixed(2)}` : '—';
                          })()}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">
                          ${t.net_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full capitalize ${TXN_STATUS_STYLE[t.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Payout modal */}
      {showModal && (
        <div className="sc-modal-backdrop" onClick={() => !withdrawing && setShowModal(false)}>
          <div className="sc-modal-panel overflow-hidden" style={{ maxWidth: 440, padding: 0 }} onClick={e => e.stopPropagation()}>
            {/* PayPal-branded header */}
            <div className="bg-[#003087] px-7 pt-7 pb-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/15 rounded-2xl flex items-center justify-center">
                    <i className="fa-brands fa-paypal text-white text-lg"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Withdraw to PayPal</h3>
                    <p className="text-xs text-blue-200 mt-0.5">Sent instantly to your PayPal account</p>
                  </div>
                </div>
                {!withdrawing && (
                  <button onClick={() => setShowModal(false)}
                    className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition text-white">
                    <i className="fa-solid fa-xmark text-sm"></i>
                  </button>
                )}
              </div>
            </div>

            <div className="px-7 py-6 space-y-4">
              {withdrawError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                  <i className="fa-solid fa-circle-exclamation mr-1.5"></i>{withdrawError}
                </div>
              )}

              {/* Payouts not yet enabled on the platform */}
              {balance && !balance.payouts_enabled ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                  <p className="font-semibold mb-1"><i className="fa-solid fa-clock mr-1.5"></i>PayPal payouts launching soon</p>
                  <p className="text-xs leading-relaxed text-amber-700">
                    Instant PayPal withdrawals are being finalised. Your balance is safe and will be withdrawable here shortly.
                  </p>
                </div>
              ) : (
                <>
                  {/* PayPal email */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">PayPal email</label>
                    {editingEmail ? (
                      <div className="flex gap-2">
                        <input type="email" value={paypalEmail} onChange={e => setPaypalEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cobalt focus:bg-white transition" />
                        <button onClick={handleSaveEmail} disabled={savingEmail || !paypalEmail.trim()}
                          className="px-4 py-3 bg-cobalt text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition disabled:opacity-50">
                          {savingEmail ? '…' : 'Save'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                        <span className="text-sm font-medium text-gray-800 flex items-center gap-2 min-w-0">
                          <i className="fa-brands fa-paypal text-[#003087]"></i>
                          <span className="truncate">{paypalEmail}</span>
                        </span>
                        <button onClick={() => setEditingEmail(true)} className="text-xs font-semibold text-cobalt hover:underline flex-shrink-0 ml-2">Change</button>
                      </div>
                    )}
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">$</span>
                      <input type="number" min="0" step="0.01" value={withdrawAmount}
                        onChange={e => setWithdrawAmount(e.target.value)}
                        disabled={editingEmail}
                        className="w-full pl-8 pr-20 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xl font-bold text-gray-900 focus:outline-none focus:border-cobalt focus:bg-white transition disabled:opacity-60" />
                      <button type="button" onClick={() => balance && setWithdrawAmount(balance.available.toFixed(2))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-cobalt hover:underline">MAX</button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5 ml-1">
                      Available: <span className="font-semibold text-gray-600">
                        ${(balance?.available ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {balance && <> · Min ${balance.min_withdrawal.toFixed(2)}</>}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">You&apos;ll receive</span>
                      <span className="font-bold text-gray-900">${(Number(withdrawAmount) || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Payout fee</span>
                      <span className="font-semibold text-emerald-600">Free</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Arrives</span>
                      <span className="font-semibold text-gray-700">Within minutes</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="px-7 pb-7">
              {balance?.payouts_enabled && (
                <button onClick={handleWithdraw}
                  disabled={withdrawing || editingEmail || !balance || balance.available <= 0 || Number(withdrawAmount) <= 0}
                  className="w-full py-3.5 bg-[#0070ba] text-white rounded-xl font-bold text-sm hover:bg-[#003087] transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {withdrawing
                    ? <><i className="fa-solid fa-spinner animate-spin"></i> Sending…</>
                    : <><i className="fa-brands fa-paypal"></i> Withdraw ${(Number(withdrawAmount) || 0).toFixed(2)}</>}
                </button>
              )}
              <button onClick={() => setShowModal(false)} disabled={withdrawing}
                className="w-full py-2.5 mt-2 text-sm font-semibold text-gray-500 hover:text-gray-700 transition disabled:opacity-50">
                {balance?.payouts_enabled ? 'Cancel' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {withdrawSuccess && (
        <div className="fixed bottom-6 right-6 left-6 sm:left-auto z-50 bg-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-xl flex items-center gap-3 text-sm font-semibold animate-fade-in">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          {withdrawSuccess}
        </div>
      )}
    </>
  );
}
