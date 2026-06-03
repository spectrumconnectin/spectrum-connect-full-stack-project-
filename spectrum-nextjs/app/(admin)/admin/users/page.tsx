'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi, type AdminUser } from '@/lib/api';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers({ page, page_size: PAGE_SIZE, search: search || undefined, account_type: role || undefined });
      setUsers(res.users);
      setTotal(res.total);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [page, search, role]);

  useEffect(() => { load(); }, [load]);

  const doAction = async (id: string, action: 'suspend' | 'activate' | 'verify') => {
    setActionLoading(id + action);
    try {
      if (action === 'suspend') await adminApi.suspendUser(id);
      else if (action === 'activate') await adminApi.activateUser(id);
      else await adminApi.toggleVerify(id);
      load();
    } catch { /* ignore */ } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-gray-400 text-sm mt-1">{total.toLocaleString()} total users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name, email, username…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={role}
          onChange={e => { setRole(e.target.value); setPage(1); }}
          className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All roles</option>
          <option value="crew">Creator (crew)</option>
          <option value="producer">Client (producer)</option>
          <option value="both">Both</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">Loading…</div>
        ) : users.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-500">No users found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left px-5 py-3 text-gray-400 font-medium">User</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Role</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Joined</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Status</th>
                <th className="text-right px-5 py-3 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                        {(u.username || u.email || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-medium">{u.username || 'Unknown'}</p>
                        <p className="text-gray-400 text-xs">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.account_type === 'crew' ? 'bg-purple-900/60 text-purple-300' :
                      u.account_type === 'producer' ? 'bg-blue-900/60 text-blue-300' :
                      'bg-green-900/60 text-green-300'
                    }`}>
                      {u.account_type === 'crew' ? 'Creator' : u.account_type === 'producer' ? 'Client' : 'Both'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {u.is_active !== false ? (
                        <span className="flex items-center gap-1 text-green-400 text-xs"><span className="w-1.5 h-1.5 rounded-full bg-green-400" />Active</span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-400 text-xs"><span className="w-1.5 h-1.5 rounded-full bg-red-400" />Suspended</span>
                      )}
                      {u.is_verified && <span className="text-blue-400 text-xs">✓ Verified</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => doAction(u.id, u.is_active !== false ? 'suspend' : 'activate')}
                        disabled={actionLoading === u.id + (u.is_active !== false ? 'suspend' : 'activate')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                          u.is_active !== false
                            ? 'bg-red-900/40 text-red-300 hover:bg-red-900/60'
                            : 'bg-green-900/40 text-green-300 hover:bg-green-900/60'
                        }`}
                      >
                        {u.is_active !== false ? 'Suspend' : 'Activate'}
                      </button>
                      <button
                        onClick={() => doAction(u.id, 'verify')}
                        disabled={!!actionLoading}
                        className="px-3 py-1 rounded-lg text-xs font-medium bg-blue-900/40 text-blue-300 hover:bg-blue-900/60 transition"
                      >
                        {u.is_verified ? 'Unverify' : 'Verify'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
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
