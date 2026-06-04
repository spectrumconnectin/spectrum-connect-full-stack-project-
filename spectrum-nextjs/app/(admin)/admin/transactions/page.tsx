'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi, type AdminTransaction } from '@/lib/api';

export default function AdminTransactionsPage() {
  const [txns, setTxns] = useState<AdminTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getTransactions({ page, page_size: PAGE_SIZE, status: status || undefined });
      setTxns(res.transactions);
      setTotal(res.total);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => { load(); }, [load]);

  const statusColor = (s: string) => ({
    pending: 'bg-yellow-900/60 text-yellow-300',
    completed: 'bg-green-900/60 text-green-300',
    failed: 'bg-red-900/60 text-red-300',
    refunded: 'bg-gray-700 text-gray-300',
  }[s] || 'bg-gray-700 text-gray-300');

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-gray-400 text-sm mt-1">{total.toLocaleString()} total transactions</p>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">Loading…</div>
        ) : txns.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-500">No transactions found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wide">ID</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wide">Type</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wide">Amount</th>
                <th className="text-right px-4 py-3 text-blue-400 font-medium text-xs uppercase tracking-wide">Client Fee</th>
                <th className="text-right px-4 py-3 text-emerald-400 font-medium text-xs uppercase tracking-wide">Creator Fee</th>
                <th className="text-right px-4 py-3 text-indigo-400 font-medium text-xs uppercase tracking-wide">Platform</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t: AdminTransaction) => (
                <tr key={t.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition">
                  <td className="px-4 py-3">
                    <span className="text-gray-400 font-mono text-xs">{t.id.slice(-10)}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-xs capitalize">{t.type?.replace('_', ' ') || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-white">${Math.abs(t.amount || 0).toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(t.client_fee || 0) > 0
                      ? <span className="text-blue-400 font-medium">+${(t.client_fee || 0).toFixed(2)}</span>
                      : <span className="text-gray-600">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(t.creator_fee || 0) > 0
                      ? <span className="text-emerald-400 font-medium">−${(t.creator_fee || 0).toFixed(2)}</span>
                      : <span className="text-gray-600">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(t.platform_fee || 0) > 0
                      ? <span className="text-indigo-300 font-bold">${(t.platform_fee || 0).toFixed(2)}</span>
                      : <span className="text-gray-600">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(t.status)}`}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Totals footer */}
            <tfoot>
              <tr className="border-t border-gray-600 bg-gray-700/40">
                <td colSpan={2} className="px-4 py-3 text-xs font-bold text-gray-300">Page Total ({txns.length})</td>
                <td className="px-4 py-3 text-right text-xs font-bold text-white">
                  ${txns.reduce((s, t) => s + (t.amount || 0), 0).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-xs font-bold text-blue-300">
                  ${txns.reduce((s, t) => s + (t.client_fee || 0), 0).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-xs font-bold text-emerald-300">
                  ${txns.reduce((s, t) => s + (t.creator_fee || 0), 0).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-xs font-bold text-indigo-200">
                  ${txns.reduce((s, t) => s + (t.platform_fee || 0), 0).toFixed(2)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-sm disabled:opacity-40 hover:bg-gray-700 transition">← Prev</button>
          <span className="text-gray-400 text-sm">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-sm disabled:opacity-40 hover:bg-gray-700 transition">Next →</button>
        </div>
      )}
    </div>
  );
}
