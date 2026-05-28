'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { dashboard, auth, type ClientDashboardResponse } from '../../../../lib/api';

const statusColors: Record<string, string> = {
  open: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  draft: 'bg-gray-100 text-gray-600',
  completed: 'bg-purple-100 text-purple-700',
};

export default function ClientDashboardPage() {
  const [data, setData] = useState<ClientDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    // Load user name and dashboard in parallel
    Promise.allSettled([
      dashboard.getClient(),
      auth.me(),
    ]).then(([dashResult, meResult]) => {
      if (dashResult.status === 'fulfilled') setData(dashResult.value);
      if (meResult.status === 'fulfilled') {
        const me = meResult.value;
        setUserName(
          me.profile?.display_name ||
          [me.profile?.first_name, me.profile?.last_name].filter(Boolean).join(' ') ||
          me.username
        );
      }
    }).finally(() => setLoading(false));
  }, []);

  const jobs = data?.jobs ?? [];
  const activityFeed = data?.activity_feed ?? [];
  const messages = data?.messages ?? [];
  const deadlines = data?.deadlines ?? [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading dashboard…
      </div>
    );
  }

  return (
    <>
      {/* Hero */}
      <section className="mb-10">
        <div className="bg-gradient-to-br from-cobalt via-blue-600 to-blue-500 rounded-3xl p-10 lg:p-12 text-white relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-400 rounded-full opacity-20 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-300 rounded-full opacity-20 blur-3xl" />
          <div className="relative z-10 flex items-center justify-between flex-wrap gap-6">
            <div>
              <p className="text-blue-200 font-semibold uppercase tracking-widest text-sm mb-2">Welcome back</p>
              <h1 className="text-4xl lg:text-5xl font-bold mb-3">{userName || 'Client'}</h1>
              <p className="text-blue-100 text-lg">
                {jobs.length > 0
                  ? `You have ${jobs.length} active project${jobs.length !== 1 ? 's' : ''}.`
                  : 'Post your first project to start finding creators.'}
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Link href="/client/projects/create"
                className="bg-white text-cobalt px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition shadow-lg">
                <i className="fa-solid fa-plus mr-2" />Post a Project
              </Link>
              <Link href="/client/collaborators"
                className="bg-white/20 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/30 transition backdrop-blur-sm border border-white/30">
                <i className="fa-solid fa-search mr-2" />Find Creators
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {[
          { label: 'Active Projects', value: String(jobs.filter(j => j.status !== 'draft').length), icon: 'fa-briefcase', color: 'bg-blue-100 text-cobalt' },
          { label: 'Total Applications', value: String(jobs.reduce((sum, j) => sum + j.proposal_count, 0)), icon: 'fa-users', color: 'bg-purple-100 text-purple-600' },
          { label: 'Draft Projects', value: String(jobs.filter(j => j.status === 'draft').length), icon: 'fa-file-alt', color: 'bg-gray-100 text-gray-600' },
          { label: 'Upcoming Deadlines', value: String(deadlines.length), icon: 'fa-calendar', color: 'bg-orange-100 text-orange-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
            <div className={`w-12 h-12 ${s.color} rounded-xl flex items-center justify-center mb-4`}>
              <i className={`fa-solid ${s.icon} text-xl`} />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{s.value}</div>
            <div className="text-sm text-gray-500">{s.label}</div>
          </div>
        ))}
      </section>

      <div className="grid lg:grid-cols-3 gap-8 mb-10">
        {/* Active Projects */}
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-900">Active Projects</h2>
            <Link href="/client/projects" className="text-sm text-cobalt font-semibold hover:underline">View all</Link>
          </div>

          {jobs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400 shadow-sm">
              <i className="fa-solid fa-briefcase text-3xl mb-3 block text-gray-300" />
              <p>No projects yet.</p>
              <Link href="/client/projects/create"
                className="mt-4 inline-block px-5 py-2 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
                Post your first project
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map(j => (
                <Link key={j.id} href={`/client/projects/${j.id}`}
                  className="block bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:border-cobalt transition">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{j.title}</h3>
                      <p className="text-sm text-gray-500">{j.proposal_count} application{j.proposal_count !== 1 ? 's' : ''}</p>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColors[j.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {j.status.replace('_', ' ')}
                    </span>
                  </div>

                  {j.workspace && (
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                        <span>Progress</span>
                        <span className="font-semibold text-cobalt">{j.workspace.progress}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-cobalt rounded-full transition-all" style={{ width: `${j.workspace.progress}%` }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        {j.workspace.roles_filled}/{j.workspace.roles_required} roles filled
                      </p>
                    </div>
                  )}

                  {j.deadline && (
                    <p className="text-xs text-gray-400 mt-2">
                      <i className="fa-regular fa-calendar mr-1" />
                      Due {new Date(j.deadline).toLocaleDateString()}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Right column */}
        <section className="space-y-6">
          {/* Activity Feed */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
            {activityFeed.length === 0 && messages.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center text-gray-400 shadow-sm text-sm">
                No activity yet.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                {activityFeed.slice(0, 5).map(a => (
                  <div key={a.id} className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-blue-100 text-cobalt rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className="fa-solid fa-bell text-sm" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-700 leading-snug">{a.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(a.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
                {activityFeed.length === 0 && messages.slice(0, 3).map(m => (
                  <div key={m.id} className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className="fa-solid fa-comment text-sm" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{m.name}</p>
                      <p className="text-xs text-gray-500 truncate">{m.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Deadlines */}
          {deadlines.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Upcoming Deadlines</h2>
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
                {deadlines.map(d => (
                  <div key={d.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{d.title}</p>
                      <p className="text-xs text-gray-400">{d.project_title}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      d.days_remaining <= 3 ? 'bg-red-50 text-red-600' :
                      d.days_remaining <= 7 ? 'bg-amber-50 text-amber-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {d.days_remaining}d
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Quick Actions */}
      <section className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200 p-8">
        <h2 className="text-lg font-bold text-gray-900 mb-5">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { href: '/client/projects/create', icon: 'fa-plus', label: 'Post Project', color: 'bg-blue-100 text-cobalt' },
            { href: '/client/collaborators', icon: 'fa-search', label: 'Find Creators', color: 'bg-purple-100 text-purple-600' },
            { href: '/client/smart-connect', icon: 'fa-bolt', label: 'Smart Connect', color: 'bg-green-100 text-green-600' },
            { href: '/client/payments', icon: 'fa-wallet', label: 'Payments', color: 'bg-orange-100 text-orange-600' },
          ].map(({ href, icon, label, color }) => (
            <Link key={label} href={href}
              className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col items-center gap-3 hover:border-cobalt hover:shadow-md transition text-center">
              <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
                <i className={`fa-solid ${icon} text-lg`} />
              </div>
              <span className="text-sm font-semibold text-gray-900">{label}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
