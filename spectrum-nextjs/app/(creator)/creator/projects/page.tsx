'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { creatorProjects, ProjectItem } from '@/lib/api';

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

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return 'Just now';
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5">
      <div className="bg-cobalt h-1.5 rounded-full transition-all" style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

export default function CreatorProjectsPage() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [projectList, setProjectList] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params: { status?: string; search?: string } = {};
    if (filter !== 'all') params.status = filter;
    if (search.trim()) params.search = search.trim();

    creatorProjects.list(params)
      .then(data => { if (!cancelled) setProjectList(data.projects || []); })
      .catch(e => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [filter, search, refreshKey]);

  return (
    <>
      <section className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Projects</h1>
        <p className="text-gray-600">All your active and completed work</p>
      </section>

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
          <button onClick={() => setRefreshKey(k => k + 1)}
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
                    {p.updated_at && <span className="text-xs">Updated {formatDate(p.updated_at)}</span>}
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

      {/* Tip */}
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
