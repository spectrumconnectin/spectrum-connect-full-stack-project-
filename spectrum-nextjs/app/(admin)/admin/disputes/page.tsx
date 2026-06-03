'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi, type AdminDispute } from '@/lib/api';

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getDisputes({ page, page_size: PAGE_SIZE, status: status || undefined });
      setDisputes(res.disputes);
      setTotal(res.total);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => { load(); }, [load]);

  const statusColor = (s: string) => ({
    open: 'bg-yellow-900/60 text-yellow-300',
    under_review: 'bg-blue-900/60 text-blue-300',
    resolved: 'bg-green-900/60 text-green-300',
    closed: 'bg-gray-700 text-gray-300',
  }[s] || 'bg-gray-700 text-gray-300');

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Disputes</h1>
          <p className="text-gray-400 text-sm mt-1">{total.toLocaleString()} total disputes</p>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="under_review">Under Review</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">Loading…</div>
        ) : disputes.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-500">No disputes found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Dispute</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Reason</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Opened</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map((d: AdminDispute) => (
                <tr key={d.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition">
                  <td className="px-5 py-3">
                    <p className="text-white font-medium text-xs font-mono">{d.id.slice(-8)}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-300 max-w-xs">
                    <p className="truncate text-sm">{d.reason || '—'}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {d.created_at ? new Date(d.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(d.status)}`}>
                      {d.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
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
