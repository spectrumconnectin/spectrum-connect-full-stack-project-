'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { dashboard, jobs as jobsApi, profile as profileApi, escrow as escrowApi, type ClientDashboardResponse, type JobPostItem } from '@/lib/api';
import EtfWidget from '@/components/EtfWidget';

const STATUS_LABEL: Record<string, string> = {
  open:        'Open',
  in_progress: 'Active',
  closed:      'Active',
  completed:   'Completed',
  draft:       'Draft',
};
const STATUS_COLOR: Record<string, string> = {
  open:        'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  closed:      'bg-blue-100 text-blue-700',
  completed:   'bg-emerald-100 text-emerald-700',
  draft:       'bg-gray-100 text-gray-500',
};

export default function ClientDashboardPage() {
  const [data, setData]           = useState<ClientDashboardResponse | null>(null);
  const [myJobs, setMyJobs]       = useState<JobPostItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [userName, setUserName]   = useState('');
  const [totalInEscrow, setTotalInEscrow]       = useState(0);
  const [totalReleased, setTotalReleased]       = useState(0);
  const [activeEscrowCount, setActiveEscrowCount] = useState(0);

  useEffect(() => {
    Promise.allSettled([
      dashboard.getClient(),
      jobsApi.getMe(),
      profileApi.getMe(),
      escrowApi.list({ role: 'client', limit: 50 }),
    ]).then(([dashResult, jobsResult, meResult, escResult]) => {
      if (dashResult.status === 'fulfilled') setData(dashResult.value);
      if (jobsResult.status  === 'fulfilled') setMyJobs(jobsResult.value);
      if (meResult.status    === 'fulfilled') {
        const me = meResult.value;
        setUserName(
          me.profile?.display_name ||
          [me.profile?.first_name, me.profile?.last_name].filter(Boolean).join(' ') ||
          me.username
        );
      }
      if (escResult.status === 'fulfilled') {
        const escrows = escResult.value.escrows || [];
        setTotalInEscrow(escrows.reduce((s, e) => s + (e.funded_amount - e.released_amount), 0));
        setTotalReleased(escrows.reduce((s, e) => s + e.released_amount, 0));
        setActiveEscrowCount(escrows.filter(e => e.status === 'active').length);
      }
    }).finally(() => setLoading(false));
  }, []);

  const jobs      = myJobs.length > 0 ? myJobs : (data?.jobs ?? []);
  const deadlines = data?.deadlines ?? [];
  const activity  = data?.activity_feed ?? [];
  const hasProjects = jobs.length > 0;
  const hasPayments = totalInEscrow > 0 || totalReleased > 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Loading your dashboard…</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Hero ── */}
      <section className="mb-8">
        <div className="bg-gradient-to-br from-cobalt via-blue-600 to-blue-500 rounded-3xl p-10 text-white relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-400 rounded-full opacity-15 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between gap-6 flex-wrap">
            <div>
              <p className="text-blue-200 text-sm font-semibold uppercase tracking-widest mb-2">
                {hasProjects ? 'Welcome back' : 'Welcome to Spectrum Connect'}
              </p>
              <h1 className="text-4xl font-bold mb-3">{userName || 'Client'}</h1>
              <p className="text-blue-100 text-lg max-w-md">
                {hasProjects
                  ? `You have ${jobs.filter(j => j.status !== 'draft' && j.status !== 'completed').length} active project${jobs.filter(j => j.status !== 'draft' && j.status !== 'completed').length !== 1 ? 's' : ''}.`
                  : 'Post your first project and start connecting with talented creators.'}
              </p>
            </div>
            {/* Primary CTA — always prominent */}
            <Link href="/client/projects/create"
              className="flex-shrink-0 bg-white text-cobalt px-8 py-4 rounded-xl font-bold text-base hover:bg-blue-50 transition shadow-lg flex items-center gap-2">
              <i className="fa-solid fa-plus" /> Create a Project
            </Link>
          </div>
        </div>
      </section>

      {/* ── New user: focused empty state ── */}
      {!hasProjects && (
        <section className="mb-8">
          <div className="bg-white rounded-2xl border-2 border-dashed border-cobalt/30 p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <i className="fa-solid fa-briefcase text-cobalt text-2xl"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Post your first project</h2>
            <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
              Describe what you need, set a budget, and Smart Connect will match you with the right creator.
            </p>
            <Link href="/client/projects/create"
              className="inline-flex items-center gap-2 bg-cobalt text-white px-7 py-3.5 rounded-xl font-bold hover:bg-blue-700 transition shadow-md">
              <i className="fa-solid fa-plus" /> Create a Project
            </Link>
            <div className="flex items-center justify-center gap-8 mt-8 text-sm text-gray-400">
              {[
                { icon: 'fa-clock', label: 'Takes 2 minutes' },
                { icon: 'fa-bolt',  label: 'AI-matched creators' },
                { icon: 'fa-lock',  label: 'Safe escrow payments' },
              ].map(({ icon, label }) => (
                <span key={label} className="flex items-center gap-1.5">
                  <i className={`fa-solid ${icon} text-cobalt`}></i>{label}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Active projects ── */}
      {hasProjects && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-900">My Projects</h2>
            <Link href="/client/projects" className="text-sm text-cobalt font-semibold hover:underline">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {jobs.slice(0, 5).map(j => (
              <Link key={j.id} href={`/client/projects/${j.id}`}
                className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 px-6 py-4 shadow-sm hover:border-cobalt hover:shadow-md transition group">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-cobalt transition truncate">{j.title}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {j.proposal_count} proposal{j.proposal_count !== 1 ? 's' : ''}
                    {j.deadline && <> · Due {new Date(j.deadline).toLocaleDateString()}</>}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                  {j.proposal_count > 0 && (j.status === 'open' || j.status === 'draft') && (
                    <Link href={`/client/projects/${j.id}/applicants`}
                      onClick={e => e.stopPropagation()}
                      className="text-xs text-cobalt font-semibold bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition">
                      Review applicants
                    </Link>
                  )}
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_COLOR[j.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABEL[j.status] ?? j.status}
                  </span>
                  <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Link href="/client/projects/create"
              className="inline-flex items-center gap-2 text-cobalt font-semibold text-sm hover:underline">
              <i className="fa-solid fa-plus text-xs"></i> Post another project
            </Link>
          </div>
        </section>
      )}

      {/* ── Payments — only shown once there are active escrows ── */}
      {hasPayments && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Payments</h2>
            <Link href="/client/payments" className="text-sm text-cobalt font-semibold hover:underline">View all →</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-blue-100 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                  <i className="fa-solid fa-lock text-cobalt text-sm"></i>
                </div>
                <span className="text-sm font-semibold text-gray-600">In Escrow</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">${totalInEscrow.toLocaleString()}</div>
              <p className="text-xs text-gray-400 mt-1">{activeEscrowCount} project{activeEscrowCount !== 1 ? 's' : ''} funded</p>
            </div>
            <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <i className="fa-solid fa-check text-emerald-600 text-sm"></i>
                </div>
                <span className="text-sm font-semibold text-gray-600">Released</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">${totalReleased.toLocaleString()}</div>
              <p className="text-xs text-gray-400 mt-1">Total paid to creators</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm flex items-center gap-3">
              <i className="fa-solid fa-flask text-amber-500 flex-shrink-0"></i>
              <div>
                <p className="text-xs font-bold text-amber-800">TEST MODE</p>
                <p className="text-xs text-amber-700">Simulated payments — no real money</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Two-column: Activity + Deadlines ── */}
      {hasProjects && (activity.length > 0 || deadlines.length > 0) && (
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {activity.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {activity.slice(0, 5).map(a => (
                  <div key={a.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-50 text-cobalt rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className="fa-solid fa-bell text-xs" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-700 leading-snug">{a.message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(a.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {deadlines.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">Upcoming Deadlines</h3>
              <div className="space-y-3">
                {deadlines.map(d => (
                  <div key={d.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{d.title}</p>
                      <p className="text-xs text-gray-400">{d.project_title}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      d.days_remaining <= 3 ? 'bg-red-50 text-red-600' :
                      d.days_remaining <= 7 ? 'bg-amber-50 text-amber-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>{d.days_remaining}d</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Bottom row: ETF + Quick Access ── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <EtfWidget href="/client/etf" />

        {/* Quick Access — 2 columns wide */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-5">Quick Access</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                href: '/client/projects/create',
                icon: 'fa-plus',
                iconBg: 'bg-blue-100 text-cobalt',
                title: 'Create a Project',
                desc: 'Post a new job and start receiving proposals from creators.',
                primary: true,
              },
              {
                href: '/client/smart-connect',
                icon: 'fa-bolt',
                iconBg: 'bg-purple-100 text-purple-600',
                title: 'Smart Connect',
                desc: 'Let AI find and rank the best creators for your project.',
                primary: false,
              },
              {
                href: '/client/collaborators',
                icon: 'fa-magnifying-glass',
                iconBg: 'bg-emerald-100 text-emerald-600',
                title: 'Find Creators',
                desc: 'Browse verified creator profiles and invite them to apply.',
                primary: false,
              },
              {
                href: '/client/messaging',
                icon: 'fa-comment',
                iconBg: 'bg-amber-100 text-amber-600',
                title: 'Messages',
                desc: 'Chat with creators, negotiate scope, and manage deliverables.',
                primary: false,
              },
            ].map(({ href, icon, iconBg, title, desc, primary }) => (
              <Link key={href} href={href}
                className={`flex items-start gap-4 p-4 rounded-xl border transition hover:shadow-sm group ${
                  primary
                    ? 'border-cobalt/30 bg-blue-50/60 hover:bg-blue-50'
                    : 'border-gray-100 hover:border-gray-200'
                }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                  <i className={`fa-solid ${icon}`}></i>
                </div>
                <div className="min-w-0">
                  <p className={`font-semibold text-sm mb-0.5 ${primary ? 'text-cobalt' : 'text-gray-900'} group-hover:text-cobalt transition`}>{title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
