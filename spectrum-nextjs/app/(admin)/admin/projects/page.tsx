'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi, type AdminJob } from '@/lib/api';

export default function AdminProjectsPage() {
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getJobs({ page, page_size: PAGE_SIZE, search: search || undefined, status: status || undefined });
      setJobs(res.jobs);
      setTotal(res.total);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await adminApi.updateJobStatus(id, newStatus);
      load();
    } catch { /* ignore */ }
  };

  const statusColor = (s: string) => ({
    open: 'bg-green-900/60 text-green-300',
    draft: 'bg-gray-700 text-gray-300',
    in_progress: 'bg-blue-900/60 text-blue-300',
    completed: 'bg-purple-900/60 text-purple-300',
    cancelled: 'bg-red-900/60 text-red-300',
  }[s] || 'bg-gray-700 text-gray-300');

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-gray-400 text-sm mt-1">{total.toLocaleString()} total projects</p>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by title or department…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="draft">Draft</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">Loading…</div>
        ) : jobs.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-500">No projects found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Title</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Department</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Posted</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Status</th>
                <th className="text-right px-5 py-3 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(j => (
                <tr key={j.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition">
                  <td className="px-5 py-3">
                    <p className="text-white font-medium truncate max-w-xs">{j.title}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{j.department || '—'}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {j.published_at ? new Date(j.published_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(j.status)}`}>
                      {j.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {j.status === 'open' && (
                        <button onClick={() => updateStatus(j.id, 'cancelled')}
                          className="px-3 py-1 rounded-lg text-xs font-medium bg-red-900/40 text-red-300 hover:bg-red-900/60 transition">
                          Cancel
                        </button>
                      )}
                      {j.status === 'cancelled' && (
                        <button onClick={() => updateStatus(j.id, 'open')}
                          className="px-3 py-1 rounded-lg text-xs font-medium bg-green-900/40 text-green-300 hover:bg-green-900/60 transition">
                          Reopen
                        </button>
                      )}
                    </div>
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
