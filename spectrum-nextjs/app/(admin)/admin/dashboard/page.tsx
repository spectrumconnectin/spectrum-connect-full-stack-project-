'use client';

import { useState, useEffect } from 'react';
import { adminApi, type AdminStats } from '@/lib/api';

function StatCard({ label, value, sub, icon, color }: { label: string; value: string | number; sub?: string | undefined; icon: string; color: string }) {
  return (
    <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
          <i className={`fa-solid ${icon} text-white text-sm`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm font-medium text-gray-300">{label}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getStats().then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <i className="fa-solid fa-spinner fa-spin mr-3" /> Loading stats…
    </div>
  );

  if (!stats) return (
    <div className="bg-gray-800 rounded-2xl p-8 text-center text-gray-400 border border-gray-700">
      <i className="fa-solid fa-triangle-exclamation text-2xl mb-3 block text-amber-400" />
      Could not load stats. Backend may need a redeploy.
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Platform Overview</h2>
        <p className="text-sm text-gray-400">Real-time metrics across the entire platform.</p>
      </div>

      {/* Users */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Users</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={stats.users.total.toLocaleString()} icon="fa-users" color="bg-indigo-600" />
          <StatCard label="Creators" value={stats.users.creators.toLocaleString()} icon="fa-palette" color="bg-violet-600" />
          <StatCard label="Clients" value={stats.users.clients.toLocaleString()} icon="fa-building" color="bg-blue-600" />
          <StatCard label="Verified" value={stats.users.verified.toLocaleString()} icon="fa-badge-check" color="bg-emerald-600" sub={`${Math.round(stats.users.verified / Math.max(stats.users.total, 1) * 100)}% of total`} />
          <StatCard label="New (30 days)" value={stats.users.new_last_30_days.toLocaleString()} icon="fa-user-plus" color="bg-cyan-600" />
          <StatCard label="Suspended" value={stats.users.suspended.toLocaleString()} icon="fa-ban" color="bg-red-600" />
          <StatCard label="Admins" value={stats.users.admins.toLocaleString()} icon="fa-shield-halved" color="bg-amber-600" />
        </div>
      </div>

      {/* Escrow */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Escrow & Revenue</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Total Volume" value={`$${stats.escrow.total_volume_usd.toLocaleString()}`} icon="fa-dollar-sign" color="bg-green-600" />
          <StatCard label="Platform Revenue" value={`$${stats.escrow.platform_fees_usd.toLocaleString()}`} icon="fa-chart-line" color="bg-teal-600" sub="12% total fee" />
          <StatCard label="Client Fees (4%)" value={`$${(stats.escrow.client_fee_usd ?? 0).toLocaleString()}`} icon="fa-building" color="bg-blue-600" sub="Charged to clients" />
          <StatCard label="Creator Fees (8%)" value={`$${(stats.escrow.creator_fee_usd ?? 0).toLocaleString()}`} icon="fa-palette" color="bg-indigo-600" sub="Deducted from payouts" />
          <StatCard label="Active Escrow" value={stats.escrow.active_count.toLocaleString()} icon="fa-lock" color="bg-cyan-600" />
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <StatCard label="Completed Projects" value={stats.escrow.completed_count.toLocaleString()} icon="fa-circle-check" color="bg-emerald-600" />
          <StatCard label="Disputed" value={stats.escrow.disputed_count.toLocaleString()} icon="fa-scale-balanced" color="bg-red-600" />
        </div>
      </div>

      {/* ETF */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">ETF Points</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="Total Points Awarded" value={stats.etf.total_points_awarded.toLocaleString()} icon="fa-medal" color="bg-amber-600" />
          <StatCard label="Gold Users" value={stats.etf.gold_users.toLocaleString()} icon="fa-trophy" color="bg-yellow-600" />
          <StatCard label="Platinum Users" value={stats.etf.platinum_users.toLocaleString()} icon="fa-crown" color="bg-violet-600" />
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { href: '/admin/users', label: 'Manage Users', icon: 'fa-users', color: 'bg-indigo-600' },
          { href: '/admin/projects', label: 'Manage Projects', icon: 'fa-briefcase', color: 'bg-blue-600' },
          { href: '/admin/disputes', label: 'Resolve Disputes', icon: 'fa-scale-balanced', color: 'bg-amber-600' },
          { href: '/admin/transactions', label: 'View Transactions', icon: 'fa-dollar-sign', color: 'bg-green-600' },
        ].map(({ href, label, icon, color }) => (
          <a key={href} href={href}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-2xl p-5 flex flex-col items-center gap-3 text-center transition">
            <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
              <i className={`fa-solid ${icon} text-white text-lg`} />
            </div>
            <span className="text-sm font-semibold text-gray-200">{label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
