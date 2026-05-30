'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { creatorProjects, proposals, ProjectItem, ProposalItem } from '@/lib/api';

const STATUS_FILTERS = ['all', 'in_progress', 'active', 'on_hold', 'completed'];

const STATUS_STYLE: Record<string, string> = {
  in_progress: 'bg-green-100 text-green-700',
  active:      'bg-green-100 text-green-700',
  on_hold:     'bg-yellow-100 text-yellow-700',
  completed:   'bg-blue-100 text-blue-700',
  draft:       'bg-gray-100 text-gray-500',
};

const STATUS_LABEL: Record<string, string> = {
  in_progress: 'Active',
  active:      'Active',
  on_hold:     'On Hold',
  completed:   'Completed',
  draft:       'Draft',
};

const APP_STATUS_TABS = ['All', 'submitted', 'shortlisted', 'interviewing', 'accepted', 'rejected', 'withdrawn'];

const APP_STATUS_STYLE: Record<string, string> = {
  submitted:    'bg-blue-50 text-blue-700',
  shortlisted:  'bg-purple-50 text-purple-700',
  interviewing: 'bg-amber-50 text-amber-700',
  accepted:     'bg-emerald-50 text-emerald-700',
  rejected:     'bg-rose-50 text-rose-700',
  withdrawn:    'bg-gray-100 text-gray-500',
};

const APP_STATUS_LABEL: Record<string, string> = {
  submitted:    'Under Review',
  shortlisted:  'Shortlisted',
  interviewing: 'Interviewing',
  accepted:     'Hired',
  rejected:     'Declined',
  withdrawn:    'Withdrawn',
};

function formatRelative(dateStr?: string): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return 'Just now';
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5">
      <div className="bg-cobalt h-1.5 rounded-full transition-all" style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

type TopTab = 'projects' | 'applications';

function MyWorkInner() {
  const searchParams = useSearchParams();
  const initialTab: TopTab = searchParams.get('tab') === 'applications' ? 'applications' : 'projects';
  const [topTab, setTopTab] = useState<TopTab>(initialTab);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (topTab === 'applications') url.searchParams.set('tab', 'applications');
    else url.searchParams.delete('tab');
    window.history.replaceState({}, '', url.toString());
  }, [topTab]);

  // --- Projects state ---
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [projectList, setProjectList] = useState<ProjectItem[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (topTab !== 'projects') return;
    let cancelled = false;
    setProjectsLoading(true);
    setProjectsError(null);

    const params: { status?: string; search?: string } = {};
    if (filter !== 'all') params.status = filter;
    if (search.trim()) params.search = search.trim();

    creatorProjects.list(params)
      .then(data => { if (!cancelled) setProjectList(data.projects || []); })
      .catch(e => { if (!cancelled) setProjectsError((e as Error).message); })
      .finally(() => { if (!cancelled) setProjectsLoading(false); });

    return () => { cancelled = true; };
  }, [filter, search, refreshKey, topTab]);

  // --- Applications state ---
  const [appTab, setAppTab] = useState('All');
  const [appList, setAppList] = useState<ProposalItem[]>([]);
  const [appLoading, setAppLoading] = useState(true);
  const [appError, setAppError] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [appsFetched, setAppsFetched] = useState(false);

  useEffect(() => {
    if (topTab !== 'applications' || appsFetched) return;
    let cancelled = false;
    setAppLoading(true);
    setAppError(null);
    proposals.getMe()
      .then(data => { if (!cancelled) { setAppList(data || []); setAppsFetched(true); } })
      .catch(e => { if (!cancelled) setAppError((e as Error).message); })
      .finally(() => { if (!cancelled) setAppLoading(false); });
    return () => { cancelled = true; };
  }, [topTab, appsFetched]);

  const filteredApps = appTab === 'All'
    ? appList
    : appList.filter(a => a.status === appTab);

  const appCounts = {
    total:        appList.length,
    submitted:    appList.filter(a => a.status === 'submitted').length,
    shortlisted:  appList.filter(a => a.status === 'shortlisted').length,
    accepted:     appList.filter(a => a.status === 'accepted').length,
  };

  const handleWithdraw = async (id: string) => {
    if (!confirm('Withdraw this proposal? This cannot be undone.')) return;
    setWithdrawing(id);
    try {
      await proposals.withdraw(id);
      setAppList(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setWithdrawing(null);
    }
  };

  return (
    <>
      <section className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Work</h1>
        <p className="text-gray-600">Your active projects and outstanding applications, all in one place.</p>
      </section>

      {/* Top-level sub-tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-1.5 inline-flex items-center gap-1 mb-8">
        <button
          onClick={() => setTopTab('projects')}
          className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition ${topTab === 'projects' ? 'bg-cobalt text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
        >
          <i className="fa-solid fa-briefcase mr-2"></i>
          Projects
        </button>
        <button
          onClick={() => setTopTab('applications')}
          className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition ${topTab === 'applications' ? 'bg-cobalt text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
        >
          <i className="fa-solid fa-paper-plane mr-2"></i>
          Applications
          {appCounts.total > 0 && topTab !== 'applications' && (
            <span className="ml-2 text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{appCounts.total}</span>
          )}
        </button>
      </div>

      {topTab === 'projects' ? (
        <ProjectsView
          filter={filter} setFilter={setFilter}
          search={search} setSearch={setSearch}
          projectList={projectList}
          loading={projectsLoading}
          error={projectsError}
          onRetry={() => setRefreshKey(k => k + 1)}
        />
      ) : (
        <ApplicationsView
          counts={appCounts}
          tabs={APP_STATUS_TABS}
          activeTab={appTab} setActiveTab={setAppTab}
          appList={appList}
          filtered={filteredApps}
          loading={appLoading}
          error={appError}
          withdrawing={withdrawing}
          onWithdraw={handleWithdraw}
        />
      )}
    </>
  );
}

function ProjectsView({
  filter, setFilter, search, setSearch,
  projectList, loading, error, onRetry,
}: {
  filter: string; setFilter: (v: string) => void;
  search: string; setSearch: (v: string) => void;
  projectList: ProjectItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <>
      {/* Filter bar */}
      <section className="mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              {STATUS_FILTERS.map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-4 py-2 text-sm rounded-lg transition font-medium capitalize ${filter === f ? 'text-cobalt bg-blue-50 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
                  {f === 'all' ? 'All' : STATUS_LABEL[f] ?? f}
                </button>
              ))}
            </div>
            <div className="relative">
              <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input type="text" placeholder="Search projects…" value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-cobalt focus:outline-none w-56" />
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading projects…</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <i className="fa-solid fa-circle-exclamation text-4xl text-red-300 mb-4 block"></i>
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <button onClick={onRetry}
            className="px-5 py-2.5 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
            Try again
          </button>
        </div>
      ) : projectList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
          <i className="fa-solid fa-folder-open text-4xl text-gray-300 mb-4 block"></i>
          <h3 className="font-semibold text-gray-600 mb-2">No projects found</h3>
          <p className="text-gray-400 text-sm mb-6">
            {filter === 'all' && !search
              ? 'Once you are hired on a job, your projects will appear here.'
              : 'Try adjusting your filter or search term.'}
          </p>
          <Link href="/creator/find-projects"
            className="px-5 py-2.5 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
            Find Projects
          </Link>
        </div>
      ) : (
        <section className="space-y-4">
          {projectList.map(p => {
            const myRole = p.team_members.find(m => m.invitation_status === 'accepted')?.role || 'Collaborator';
            const statusLabel = STATUS_LABEL[p.status] ?? p.status;
            const statusStyle = STATUS_STYLE[p.status] ?? 'bg-gray-100 text-gray-600';

            return (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:border-cobalt transition">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-bold text-gray-900">{p.title}</h3>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusStyle}`}>{statusLabel}</span>
                      {p.category && (
                        <span className="px-2.5 py-1 text-xs bg-gray-100 text-gray-600 rounded-full capitalize">{p.category}</span>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-sm text-gray-500 line-clamp-1 mb-2">{p.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <i className="fa-solid fa-user text-cobalt text-xs"></i>
                        Role: <span className="font-medium text-gray-900">{myRole}</span>
                      </span>
                      <span className="text-gray-300">·</span>
                      <span className="flex items-center gap-1.5">
                        <i className="fa-solid fa-users text-cobalt text-xs"></i>
                        {p.team_members.length} team member{p.team_members.length !== 1 ? 's' : ''}
                      </span>
                      {p.location && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span className="flex items-center gap-1">
                            <i className="fa-solid fa-location-dot text-gray-400 text-xs"></i>{p.location}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <Link href={`/creator/projects/${p.id}`}
                    className="px-5 py-2.5 bg-cobalt text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition flex-shrink-0 ml-4">
                    View Project
                  </Link>
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                    <span>Progress</span>
                    <span className="font-semibold text-gray-700">{p.progress_percentage}%</span>
                  </div>
                  <ProgressBar value={p.progress_percentage} />
                </div>

                {/* Tags */}
                {p.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {p.tags.slice(0, 5).map(t => (
                      <span key={t} className="text-xs px-2.5 py-1 bg-blue-50 text-cobalt rounded-full">{t}</span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    {p.team_members.slice(0, 4).map((m, i) => (
                      m.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={m.avatar_url} alt={m.username}
                          className="w-7 h-7 rounded-full border-2 border-white -ml-1 first:ml-0 object-cover" />
                      ) : (
                        <div key={i} className="w-7 h-7 rounded-full border-2 border-white -ml-1 first:ml-0 bg-blue-100 flex items-center justify-center text-cobalt text-xs font-bold">
                          {m.username[0]?.toUpperCase()}
                        </div>
                      )
                    ))}
                    {p.team_members.length > 4 && (
                      <span className="text-xs text-gray-500 ml-1">+{p.team_members.length - 4} more</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {p.updated_at && <span className="text-xs">Updated {formatRelative(p.updated_at)}</span>}
                    {(p.budget_min || p.budget_max) && (
                      <span className="font-semibold text-gray-900 text-sm">
                        ${p.budget_min?.toLocaleString()}{p.budget_max ? `–$${p.budget_max.toLocaleString()}` : '+'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {!loading && !error && projectList.length > 0 && (
        <section className="mt-8 bg-blue-50 rounded-xl border border-blue-100 p-5">
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 bg-cobalt rounded-lg flex items-center justify-center flex-shrink-0">
              <i className="fa-solid fa-lightbulb text-white text-sm"></i>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-0.5">Quick Tip</h3>
              <p className="text-sm text-gray-600">Click a project to manage milestones, messages, and deliverables.</p>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function ApplicationsView({
  counts, tabs, activeTab, setActiveTab,
  appList, filtered, loading, error,
  withdrawing, onWithdraw,
}: {
  counts: { total: number; submitted: number; shortlisted: number; accepted: number };
  tabs: string[];
  activeTab: string; setActiveTab: (v: string) => void;
  appList: ProposalItem[];
  filtered: ProposalItem[];
  loading: boolean;
  error: string | null;
  withdrawing: string | null;
  onWithdraw: (id: string) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-end mb-6">
        <Link href="/creator/find-projects"
          className="inline-flex items-center px-5 py-2.5 bg-cobalt text-white rounded-xl font-semibold hover:bg-blue-700 transition text-sm">
          <i className="fa-solid fa-magnifying-glass mr-2"></i>Find More Work
        </Link>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {[
          { label: 'Total Applied',  value: counts.total,       icon: 'fa-paper-plane', bg: 'bg-blue-50',   iconColor: 'text-cobalt' },
          { label: 'Under Review',   value: counts.submitted,   icon: 'fa-clock',       bg: 'bg-amber-50',  iconColor: 'text-amber-600' },
          { label: 'Shortlisted',    value: counts.shortlisted, icon: 'fa-star',        bg: 'bg-purple-50', iconColor: 'text-purple-600' },
          { label: 'Hired',          value: counts.accepted,    icon: 'fa-circle-check',bg: 'bg-emerald-50',iconColor: 'text-emerald-600' },
        ].map(({ label, value, icon, bg, iconColor }) => (
          <div key={label} className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-600">{label}</span>
              <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center`}>
                <i className={`fa-solid ${icon} ${iconColor}`}></i>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading applications…</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <i className="fa-solid fa-circle-exclamation text-4xl text-red-300 mb-4 block"></i>
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Status tabs */}
          <div className="flex items-center border-b border-gray-200 px-2 overflow-x-auto no-scrollbar">
            {tabs.map(tab => {
              const count = tab === 'All' ? appList.length : appList.filter(a => a.status === tab).length;
              return (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-5 py-4 text-sm font-semibold whitespace-nowrap transition ${activeTab === tab ? 'text-cobalt border-b-2 border-cobalt' : 'text-gray-500 hover:text-gray-900'}`}>
                  {tab === 'All' ? 'All' : (APP_STATUS_LABEL[tab] ?? tab)}
                  {count > 0 && (
                    <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <div className="p-20 text-center">
              <i className="fa-solid fa-inbox text-4xl text-gray-300 mb-4 block"></i>
              <h3 className="font-semibold text-gray-600 mb-2">No applications here</h3>
              <p className="text-gray-400 text-sm">
                {appList.length === 0 ? 'Start applying to jobs to see them here.' : 'No applications match this filter.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map(app => (
                <div key={app.id} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between gap-6 flex-wrap">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <i className="fa-solid fa-clapperboard text-cobalt"></i>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 mb-0.5">{app.job_title}</h3>
                        <p className="text-sm text-gray-500 mb-2">
                          {app.job_department}
                          {app.proposed_budget ? ` · Proposed $${app.proposed_budget.toLocaleString()}` : ''}
                          {app.role ? ` · ${app.role}` : ''}
                        </p>
                        {app.cover_letter && (
                          <p className="text-sm text-gray-400 line-clamp-1 italic">&ldquo;{app.cover_letter}&rdquo;</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-2">
                          <span><i className="fa-regular fa-calendar mr-1"></i>Applied {formatDate(app.submitted_at)}</span>
                          <span>·</span>
                          <span>{formatRelative(app.submitted_at)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${APP_STATUS_STYLE[app.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {APP_STATUS_LABEL[app.status] ?? app.status}
                      </span>
                      {['submitted', 'shortlisted', 'interviewing'].includes(app.status) && (
                        <button
                          onClick={() => onWithdraw(app.id)}
                          disabled={withdrawing === app.id}
                          className="px-3 py-1.5 text-xs font-semibold text-red-500 border border-red-100 rounded-lg hover:bg-red-50 transition disabled:opacity-50">
                          {withdrawing === app.id ? 'Withdrawing…' : 'Withdraw'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default function CreatorMyWorkPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <MyWorkInner />
    </Suspense>
  );
}
