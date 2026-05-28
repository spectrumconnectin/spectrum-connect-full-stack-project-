'use client';

import { useState, useEffect } from 'react';
import { earnings, EarningTransaction, EarningsStats } from '@/lib/api';

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
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      earnings.getStats(),
      earnings.getTransactions({ limit: 40 }),
    ])
      .then(([s, t]) => {
        setStats(s);
        setTxns(t);
        setWithdrawAmount(s.total_earned > 0 ? s.total_earned.toFixed(2) : '0.00');
      })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const params: { status?: string; type?: string; limit: number } = { limit: 40 };
    if (statusFilter) params.status = statusFilter;
    if (typeFilter) params.type = typeFilter;
    earnings.getTransactions(params).then(setTxns).catch(() => {});
  }, [statusFilter, typeFilter]);

  const filtered = txns;

  return (
    <>
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Earnings</h1>
        <p className="text-lg text-gray-600">Your income, payouts, and pending balances at a glance.</p>
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
          <div className="grid lg:grid-cols-3 gap-6 mb-10">
            <div className="lg:col-span-2 bg-gradient-to-br from-cobalt via-blue-600 to-blue-500 rounded-3xl p-10 text-white relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-96 h-96 bg-purple-400 rounded-full opacity-20 blur-3xl pointer-events-none"></div>
              <div className="relative">
                <span className="text-sm font-bold uppercase tracking-widest text-blue-100">Total Earned</span>
                <p className="text-6xl font-bold mt-3 mb-6">
                  ${(stats?.total_earned ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <button onClick={() => setShowModal(true)}
                    className="px-6 py-3 bg-white text-cobalt rounded-xl font-bold hover:bg-blue-50 transition">
                    <i className="fa-solid fa-arrow-down mr-2"></i>Withdraw
                  </button>
                  <button className="px-6 py-3 bg-white/20 backdrop-blur text-white rounded-xl font-semibold hover:bg-white/30 transition border border-white/30 text-sm">
                    <i className="fa-solid fa-credit-card mr-2"></i>Payment Methods
                  </button>
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
                          {t.platform_fee > 0 ? `-$${t.platform_fee.toFixed(2)}` : '—'}
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

      {/* Withdraw modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl w-full shadow-2xl overflow-hidden" style={{ maxWidth: 420 }}>
            <div className="px-7 pt-7 pb-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center">
                    <i className="fa-solid fa-arrow-down text-cobalt"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Withdraw Funds</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Funds arrive in 1–2 business days</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition text-gray-500">
                  <i className="fa-solid fa-xmark text-sm"></i>
                </button>
              </div>
            </div>

            <div className="px-7 py-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">$</span>
                  <input type="text" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xl font-bold text-gray-900 focus:outline-none focus:border-cobalt focus:bg-white transition" />
                </div>
                <p className="text-xs text-gray-400 mt-1.5 ml-1">
                  Available: <span className="font-semibold text-gray-600">
                    ${(stats?.total_earned ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Withdraw to</label>
                <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                    <i className="fa-solid fa-building-columns text-gray-700"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">Bank Transfer</p>
                    <p className="text-xs text-gray-400">Add a payment method to withdraw</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Withdrawal amount</span>
                  <span className="font-semibold text-gray-900">${withdrawAmount || '0.00'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Processing fee</span>
                  <span className="font-semibold text-gray-400">Free</span>
                </div>
                <div className="border-t border-gray-200 pt-2.5 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">You&apos;ll receive</span>
                  <span className="text-base font-bold text-gray-900">${withdrawAmount || '0.00'}</span>
                </div>
              </div>
            </div>

            <div className="px-7 pb-7">
              <button onClick={() => setShowModal(false)}
                className="w-full py-3.5 bg-cobalt text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition shadow-sm">
                Confirm Withdrawal
              </button>
              <button onClick={() => setShowModal(false)}
                className="w-full py-2.5 mt-2 text-sm font-semibold text-gray-500 hover:text-gray-700 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
