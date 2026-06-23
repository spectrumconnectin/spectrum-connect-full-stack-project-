'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { dashboard, auth, escrow as escrowApi, type CreatorDashboardResponse } from '@/lib/api';
import EtfWidget from '@/components/EtfWidget';
import SetupJourney from '@/components/SetupJourney';

const difficultyStyles: Record<string, string> = {
  Beginner: 'bg-green-50 text-green-700 border-green-200',
  Intermediate: 'bg-amber-50 text-amber-700 border-amber-200',
  Advanced: 'bg-red-50 text-red-700 border-red-200',
};

export default function CreatorDashboardPage() {
  const [data, setData] = useState<CreatorDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [inEscrow, setInEscrow] = useState(0);
  const [pendingRelease, setPendingRelease] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);

  useEffect(() => {
    Promise.allSettled([
      dashboard.getCreator(),
      escrowApi.list({ role: 'creator', limit: 50 }),
    ]).then(([dashResult, escrowResult]) => {
      if (dashResult.status === 'fulfilled') setData(dashResult.value);
      if (escrowResult.status === 'fulfilled') {
        const escrows = escrowResult.value.escrows || [];
        setInEscrow(escrows.reduce((s, e) => s + (e.funded_amount - e.released_amount), 0));
        setPendingRelease(escrows.filter(e => e.funded_milestones > e.released_milestones).reduce((s, e) => s + (e.funded_amount - e.released_amount), 0));
        setTotalEarned(escrows.reduce((s, e) => s + e.released_amount, 0));
      }
    }).catch(() => {}).finally(() => setLoading(false));
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
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3">{displayName}</h1>
            <p className="text-blue-100 text-lg">
              {stats?.active_projects
                ? `You have ${stats.active_projects} active project${stats.active_projects !== 1 ? 's' : ''}.`
                : 'Complete your profile to start getting matched with projects.'}
            </p>
          </div>
        </div>
      </section>

      {/* Setup journey — guides new creators to first success */}
      <SetupJourney />

      {/* ETF Points widget — loyalty + trust signal */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        <EtfWidget href="/creator/etf" />
      </section>

      {/* Stats strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {[
          {
            label: 'Total Earnings',
            value: `$${(stats?.total_earnings ?? 0).toLocaleString()}`,
            sub: stats?.total_earnings ? 'after platform fees' : 'No payouts yet',
            icon: 'fa-wallet',
            color: 'bg-green-100 text-green-600',
          },
          {
            label: 'Active Projects',
            value: String(stats?.active_projects ?? 0),
            sub: stats?.active_projects ? `project${(stats.active_projects ?? 0) !== 1 ? 's' : ''} in progress` : 'None active',
            icon: 'fa-briefcase',
            color: 'bg-blue-100 text-cobalt',
          },
          {
            label: 'Completed',
            value: String(stats?.projects_completed ?? 0),
            sub: stats?.projects_completed ? `project${(stats.projects_completed ?? 0) !== 1 ? 's' : ''} delivered` : 'None yet',
            icon: 'fa-circle-check',
            color: 'bg-purple-100 text-purple-600',
          },
          {
            label: 'Response Time',
            value: (() => {
              const rt = stats?.response_time_hours;
              if (!rt || rt === 0) return '—';
              if (rt < 1) return '< 1h';
              if (rt < 24) return `~${Math.round(rt)}h`;
              return `~${Math.round(rt / 24)}d`;
            })(),
            sub: stats?.response_time_hours && stats.response_time_hours > 0
              ? 'avg reply time'
              : 'Send messages to track',
            icon: 'fa-clock',
            color: 'bg-sky-100 text-sky-600',
          },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
            <div className={`w-12 h-12 ${s.color} rounded-xl flex items-center justify-center mb-4`}>
              <i className={`fa-solid ${s.icon} text-xl`} />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{s.value}</div>
            <div className="text-sm font-medium text-gray-600">{s.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </section>

      {/* Earnings & Escrow Panel */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Earnings</h2>
          <Link href="/creator/earnings" className="text-sm text-cobalt font-semibold hover:underline">View details →</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-blue-100 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                <i className="fa-solid fa-lock text-cobalt text-sm"></i>
              </div>
              <span className="text-sm font-semibold text-gray-600">In Escrow</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">${inEscrow.toLocaleString()}</div>
            <p className="text-xs text-gray-400 mt-1">Secured — waiting for release</p>
          </div>
          <div className="bg-white rounded-2xl border border-amber-100 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
                <i className="fa-solid fa-hourglass-half text-amber-600 text-sm"></i>
              </div>
              <span className="text-sm font-semibold text-gray-600">Pending Release</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">${pendingRelease.toLocaleString()}</div>
            <p className="text-xs text-gray-400 mt-1">Awaiting client approval</p>
          </div>
          <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                <i className="fa-solid fa-circle-check text-emerald-600 text-sm"></i>
              </div>
              <span className="text-sm font-semibold text-gray-600">Total Released</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">${totalEarned.toLocaleString()}</div>
            <p className="text-xs text-gray-400 mt-1">Paid to your account</p>
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-8 mb-10">
        {/* Opportunities */}
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Matched Opportunities</h2>
              <p className="text-xs text-gray-400 mt-0.5">Ranked by how well they fit your skills</p>
            </div>
            <Link href="/creator/find-projects" className="text-sm text-cobalt font-semibold hover:underline flex items-center gap-1">
              Browse all <i className="fa-solid fa-arrow-right text-xs" />
            </Link>
          </div>

          {opportunities.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center shadow-sm">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-wand-magic-sparkles text-2xl text-cobalt" />
              </div>
              <p className="font-semibold text-gray-700 mb-1">No matches yet</p>
              <p className="text-sm text-gray-400 mb-5">Add skills and a role to your profile so we can match you.</p>
              <Link href="/creator/profile" className="inline-flex items-center gap-2 bg-cobalt text-white text-sm px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition">
                <i className="fa-solid fa-user-pen" /> Complete Profile
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {opportunities.map((op, idx) => {
                const isStrong = op.match_percent >= 80;
                const isGood   = op.match_percent >= 50 && op.match_percent < 80;
                const daysLeft = op.deadline
                  ? Math.ceil((new Date(op.deadline).getTime() - Date.now()) / 86400000)
                  : null;
                const urgent = daysLeft !== null && daysLeft <= 3;

                return (
                  <div key={op.id}
                    className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all group
                      ${isStrong ? 'border-cobalt/30 ring-1 ring-cobalt/10' : 'border-gray-200 hover:border-cobalt/40'}`}>

                    {/* Top bar: match strength indicator */}
                    <div className={`h-1 w-full rounded-t-2xl ${
                      isStrong ? 'bg-gradient-to-r from-cobalt to-blue-400' :
                      isGood   ? 'bg-gradient-to-r from-blue-300 to-sky-300' :
                                 'bg-gray-100'
                    }`} />

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            {idx === 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 uppercase tracking-wide">Best match</span>}
                            {urgent && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-200 uppercase tracking-wide"><i className="fa-solid fa-fire mr-1" />Closing soon</span>}
                          </div>
                          <h3 className="font-bold text-gray-900 text-base leading-tight">{op.title}</h3>
                          {op.department && <p className="text-xs text-gray-400 mt-0.5">{op.department}</p>}
                        </div>

                        {/* Match score ring */}
                        {op.match_percent > 0 && (
                          <div className="flex-shrink-0 text-center">
                            <div className={`text-xl font-extrabold leading-none ${
                              isStrong ? 'text-cobalt' : isGood ? 'text-sky-500' : 'text-gray-400'
                            }`}>{op.match_percent}%</div>
                            <div className="text-[10px] text-gray-400 font-medium">match</div>
                          </div>
                        )}
                      </div>

                      {op.description && (
                        <p className="text-sm text-gray-500 line-clamp-2 mb-3">{op.description}</p>
                      )}

                      {/* Skills — highlighted if they match */}
                      {op.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {op.skills.slice(0, 6).map(sk => (
                            <span key={sk} className="text-xs px-2.5 py-0.5 bg-blue-50 text-cobalt rounded-full font-medium border border-blue-100">
                              {sk}
                            </span>
                          ))}
                          {op.skills.length > 6 && (
                            <span className="text-xs px-2 py-0.5 text-gray-400">+{op.skills.length - 6} more</span>
                          )}
                        </div>
                      )}

                      {/* Footer row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          {daysLeft !== null && (
                            <span className={urgent ? 'text-red-500 font-semibold' : ''}>
                              <i className="fa-regular fa-clock mr-1" />
                              {daysLeft <= 0 ? 'Closing today' : `${daysLeft}d left`}
                            </span>
                          )}
                        </div>
                        <Link
                          href={`/creator/find-projects`}
                          className="inline-flex items-center gap-1.5 bg-cobalt text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition shadow-sm group-hover:shadow-md">
                          View & Apply <i className="fa-solid fa-arrow-right text-[10px]" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right column: Active Teams + Messages */}
        <section className="space-y-6">
          {/* Active Teams */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Active Projects</h2>
                <p className="text-xs text-gray-400 mt-0.5">{activeTeams.length} in progress</p>
              </div>
              <Link href="/creator/projects" className="text-sm text-cobalt font-semibold hover:underline">View all</Link>
            </div>

            {activeTeams.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-6 text-center shadow-sm">
                <i className="fa-solid fa-folder-open text-2xl text-gray-300 mb-2 block" />
                <p className="text-sm text-gray-400">No active projects yet.</p>
                <Link href="/creator/find-projects" className="mt-3 inline-block text-xs font-semibold text-cobalt hover:underline">
                  Browse open jobs →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activeTeams.map(team => {
                  const daysLeft = team.time_remaining_days;
                  const urgent   = daysLeft !== null && daysLeft != null && daysLeft <= 2;
                  const statusColors: Record<string, string> = {
                    accepted:    'bg-blue-50 text-cobalt border-blue-100',
                    in_progress: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                    delivered:   'bg-amber-50 text-amber-700 border-amber-100',
                    completed:   'bg-gray-50 text-gray-500 border-gray-200',
                  };
                  const statusLabels: Record<string, string> = {
                    accepted:    'Hired',
                    in_progress: 'In Progress',
                    delivered:   'Delivered',
                    completed:   'Completed',
                  };
                  const statusAction: Record<string, string> = {
                    accepted:    'Go to workspace →',
                    in_progress: 'Submit delivery →',
                    delivered:   'Awaiting approval',
                    completed:   'View project →',
                  };
                  const statusStyle = statusColors[team.status ?? ''] ?? 'bg-gray-50 text-gray-500 border-gray-200';
                  const statusLabel = statusLabels[team.status ?? ''] ?? (team.status ?? 'Active');
                  const actionText  = statusAction[team.status ?? ''] ?? 'Open →';

                  return (
                    <div key={team.project_id}
                      className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:border-cobalt hover:shadow-md transition-all group">
                      {/* Status bar */}
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${statusStyle}`}>
                          {statusLabel}
                        </span>
                        {daysLeft !== null && daysLeft != null && (
                          <span className={`text-xs font-bold flex items-center gap-1 ${urgent ? 'text-red-500' : 'text-amber-500'}`}>
                            <i className={`fa-solid ${urgent ? 'fa-fire' : 'fa-hourglass-half'} text-[10px]`} />
                            {daysLeft}d left
                          </span>
                        )}
                      </div>

                      <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1 line-clamp-1">{team.title}</h3>
                      <p className="text-xs text-gray-400 mb-3">{team.role ?? 'Member'}</p>

                      <Link
                        href={`/creator/projects`}
                        className="text-xs font-semibold text-cobalt hover:underline group-hover:text-blue-700 transition">
                        {actionText}
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Messages */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Messages</h2>
                {messages.length > 0 && <p className="text-xs text-gray-400 mt-0.5">{messages.length} recent</p>}
              </div>
              <Link href="/creator/messages" className="text-sm text-cobalt font-semibold hover:underline">View all</Link>
            </div>
            {messages.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-6 text-center shadow-sm">
                <i className="fa-regular fa-comment text-2xl text-gray-300 mb-2 block" />
                <p className="text-sm text-gray-400">No messages yet.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-50">
                {messages.map(msg => (
                  <Link key={msg.id} href="/creator/messages"
                    className="flex items-center gap-3 p-4 hover:bg-gray-50 transition first:rounded-t-2xl last:rounded-b-2xl">
                    {msg.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={msg.avatar} alt={msg.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cobalt to-blue-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {msg.name[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{msg.name}</p>
                      <p className="text-xs text-gray-400 truncate">{msg.text}</p>
                    </div>
                    <i className="fa-solid fa-chevron-right text-[10px] text-gray-300 flex-shrink-0" />
                  </Link>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
