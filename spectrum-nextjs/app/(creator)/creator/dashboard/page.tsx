'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { dashboard, auth, type CreatorDashboardResponse } from '../../../../lib/api';

const difficultyStyles: Record<string, string> = {
  Beginner: 'bg-green-50 text-green-700 border-green-200',
  Intermediate: 'bg-amber-50 text-amber-700 border-amber-200',
  Advanced: 'bg-red-50 text-red-700 border-red-200',
};

export default function CreatorDashboardPage() {
  const [data, setData] = useState<CreatorDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboard.getCreator()
      .then(setData)
      .catch(() => {
        // if auth fails, let it silently show empty state (user may not be logged in yet)
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = data?.stats;
  const opportunities = data?.opportunities ?? [];
  const activeTeams = data?.active_teams ?? [];
  const messages = data?.messages ?? [];
  const tasks = data?.tasks ?? [];

  const displayName = stats?.name || 'Creator';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading dashboard…
      </div>
    );
  }

  return (
    <>
      {/* Welcome Hero */}
      <section className="mb-10">
        <div className="bg-gradient-to-br from-cobalt via-blue-600 to-blue-500 rounded-3xl p-10 lg:p-12 text-white relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-400 rounded-full opacity-20 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-300 rounded-full opacity-20 blur-3xl" />
          <div className="relative z-10 max-w-3xl">
            <p className="text-blue-200 font-semibold uppercase tracking-widest text-sm mb-2">Welcome back</p>
            <h1 className="text-4xl lg:text-5xl font-bold mb-3">{displayName}</h1>
            <p className="text-blue-100 text-lg">
              {stats?.active_projects
                ? `You have ${stats.active_projects} active project${stats.active_projects !== 1 ? 's' : ''}.`
                : 'Complete your profile to start getting matched with projects.'}
            </p>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {[
          { label: 'Total Earnings', value: `$${(stats?.total_earnings ?? 0).toLocaleString()}`, icon: 'fa-wallet', color: 'bg-green-100 text-green-600' },
          { label: 'Active Projects', value: String(stats?.active_projects ?? 0), icon: 'fa-briefcase', color: 'bg-blue-100 text-cobalt' },
          { label: 'Completed', value: String(stats?.projects_completed ?? 0), icon: 'fa-check-circle', color: 'bg-purple-100 text-purple-600' },
          { label: 'Satisfaction', value: stats?.client_satisfaction ? `${stats.client_satisfaction}%` : '—', icon: 'fa-star', color: 'bg-amber-100 text-amber-600' },
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
        {/* Opportunities */}
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-900">Matched Opportunities</h2>
            <Link href="/creator/smart-connect" className="text-sm text-cobalt font-semibold hover:underline">
              View all
            </Link>
          </div>

          {opportunities.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400 shadow-sm">
              <i className="fa-solid fa-wand-magic-sparkles text-3xl mb-3 block text-gray-300" />
              No opportunities yet. Add skills to your profile to get matched.
            </div>
          ) : (
            <div className="space-y-4">
              {opportunities.map(op => (
                <div key={op.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:border-cobalt transition">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{op.title}</h3>
                      {op.department && <p className="text-sm text-gray-400">{op.department}</p>}
                    </div>
                    {op.match_percent > 0 && (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-cobalt">
                        {op.match_percent}% match
                      </span>
                    )}
                  </div>
                  {op.description && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{op.description}</p>
                  )}
                  {op.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {op.skills.slice(0, 5).map(sk => (
                        <span key={sk} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{sk}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    {op.deadline && (
                      <span className="text-xs text-gray-400">
                        <i className="fa-regular fa-calendar mr-1" />
                        {new Date(op.deadline).toLocaleDateString()}
                      </span>
                    )}
                    <Link href={`/creator/projects/${op.id}/apply`}
                      className="ml-auto text-xs font-semibold text-cobalt hover:underline">
                      View & Apply →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right column: Active Teams + Messages */}
        <section className="space-y-6">
          {/* Active Teams */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Active Teams</h2>
            {activeTeams.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center text-gray-400 shadow-sm text-sm">
                No active projects yet.
              </div>
            ) : (
              <div className="space-y-3">
                {activeTeams.map(team => (
                  <div key={team.project_id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:border-cobalt transition">
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">{team.title}</h3>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{team.role ?? 'Member'}</span>
                      {team.time_remaining_days != null && (
                        <span className="text-amber-600 font-semibold">{team.time_remaining_days}d left</span>
                      )}
                    </div>
                    {team.status && (
                      <span className="mt-2 inline-block text-xs px-2 py-0.5 rounded-full bg-blue-50 text-cobalt">
                        {team.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Messages */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Messages</h2>
              <Link href="/creator/messaging" className="text-sm text-cobalt font-semibold hover:underline">View all</Link>
            </div>
            {messages.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center text-gray-400 shadow-sm text-sm">
                No messages yet.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3">
                {messages.map(msg => (
                  <div key={msg.id} className="flex items-start gap-3">
                    {msg.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={msg.avatar} alt={msg.name} className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-cobalt font-bold text-sm">
                        {msg.name[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{msg.name}</p>
                      <p className="text-xs text-gray-500 truncate">{msg.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Tasks */}
      {tasks.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-5">Upcoming Tasks</h2>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="space-y-3">
              {tasks.map(task => (
                <div key={task.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{task.title}</p>
                    {task.project_name && <p className="text-xs text-gray-400">{task.project_name}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    {task.priority && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        task.priority === 'high' ? 'bg-red-50 text-red-600' :
                        task.priority === 'medium' ? 'bg-amber-50 text-amber-600' :
                        'bg-gray-100 text-gray-500'
                      }`}>{task.priority}</span>
                    )}
                    {task.due_date && (
                      <span className="text-xs text-gray-400">
                        {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Smart Connect CTA (shown when no opportunities) */}
      {opportunities.length === 0 && (
        <section className="mb-10">
          <div className="bg-white rounded-3xl border border-gray-200 p-10 shadow-lg">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-gradient-to-br from-cobalt to-blue-600 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                <i className="fa-solid fa-wand-magic-sparkles text-white text-2xl" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Enable Smart Connect</h2>
                <p className="text-gray-600 mb-5">Our AI analyzes your profile and automatically matches you with projects that fit your skills.</p>
                <Link href="/creator/smart-connect"
                  className="inline-flex items-center gap-2 bg-cobalt text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition shadow-md">
                  <i className="fa-solid fa-bolt" />
                  Enable Smart Connect
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Quick actions */}
      <section className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200 p-8">
        <h2 className="text-lg font-bold text-gray-900 mb-5">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { href: '/creator/projects', icon: 'fa-search', label: 'Find Projects', color: 'bg-blue-100 text-cobalt' },
            { href: '/creator/smart-connect', icon: 'fa-bolt', label: 'Smart Connect', color: 'bg-purple-100 text-purple-600' },
            { href: '/creator/profile', icon: 'fa-user', label: 'Edit Profile', color: 'bg-green-100 text-green-600' },
            { href: '/creator/earnings', icon: 'fa-wallet', label: 'Earnings', color: 'bg-orange-100 text-orange-600' },
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
