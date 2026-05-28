'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { jobs, JobPostItem } from '../../../../lib/api';

const STATUS_FILTERS = ['All', 'open', 'draft', 'paused', 'closed', 'completed'];

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-600',
  paused: 'bg-yellow-100 text-yellow-700',
  closed: 'bg-red-100 text-red-600',
  completed: 'bg-blue-100 text-blue-700',
};

function formatBudget(p: JobPostItem): string {
  const fmt = (min?: number, max?: number, suffix = '') => {
    if (!min && !max) return 'TBD';
    if (min && max) return `$${min.toLocaleString()}–$${max.toLocaleString()}${suffix}`;
    if (min) return `$${min.toLocaleString()}+${suffix}`;
    return `$${max?.toLocaleString()}${suffix}`;
  };
  if (p.budget_type === 'fixed') return fmt(p.budget?.min, p.budget?.max);
  if (p.budget_type === 'hourly') return fmt(p.hourly_rate?.min, p.hourly_rate?.max, '/hr');
  if (p.budget_type === 'daily') return fmt(p.daily_rate?.min, p.daily_rate?.max, '/day');
  if (p.budget_type === 'weekly') return fmt(p.weekly_rate?.min, p.weekly_rate?.max, '/wk');
  return 'Negotiable';
}

function formatPosted(dateStr?: string): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return 'Just now';
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export default function ClientProjectsPage() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [allJobs, setAllJobs] = useState<JobPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    jobs.getMe()
      .then(data => { if (!cancelled) setAllJobs(data || []); })
      .catch(e => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const filtered = allJobs.filter(p => {
    const matchFilter = activeFilter === 'All' || p.status === activeFilter;
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <>
      <section className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">My Projects</h1>
            <p className="text-gray-600">Manage and track all your job postings</p>
          </div>
          <Link href="/client/projects/create"
            className="bg-cobalt text-white px-5 py-3 rounded-xl font-semibold hover:bg-blue-700 transition flex items-center gap-2">
            <i className="fa-solid fa-plus"></i>New Project
          </Link>
        </div>
      </section>

      <section className="mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              {STATUS_FILTERS.map(f => (
                <button key={f} onClick={() => setActiveFilter(f)}
                  className={`px-4 py-2.5 text-sm rounded-lg font-medium transition capitalize ${activeFilter === f ? 'font-semibold text-cobalt bg-blue-50' : 'text-gray-700 hover:bg-gray-50'}`}>
                  {f}
                </button>
              ))}
            </div>
            <div className="relative">
              <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input type="text" placeholder="Search projects" value={search} onChange={e => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-cobalt focus:outline-none w-64" />
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
        <div className="text-center py-20">
          <i className="fa-solid fa-circle-exclamation text-5xl text-red-300 mb-4 block"></i>
          <h3 className="font-semibold text-gray-600 text-lg mb-2">Could not load projects</h3>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button onClick={() => setRefreshKey(k => k + 1)}
            className="px-5 py-2.5 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
            Try again
          </button>
        </div>
      ) : (
        <section className="space-y-4">
          {filtered.map(p => (
            <Link key={p.id} href={`/client/projects/${p.id}`}
              className="block bg-white rounded-2xl border border-gray-200 p-6 hover:border-cobalt transition shadow-sm group">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-cobalt transition mb-1">{p.title}</h3>
                  <p className="text-sm text-gray-500 capitalize">{p.department}{p.role ? ` · ${p.role}` : ''}</p>
                </div>
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize ${STATUS_STYLES[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {p.status}
                </span>
              </div>

              {p.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {p.tags.slice(0, 5).map(t => (
                    <span key={t} className="text-xs px-2.5 py-1 bg-blue-50 text-cobalt rounded-full font-medium">{t}</span>
                  ))}
                  {p.tags.length > 5 && (
                    <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full">+{p.tags.length - 5}</span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                <div>
                  <p className="text-gray-500 mb-1">Budget</p>
                  <p className="font-semibold text-gray-900">{formatBudget(p)}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Complexity</p>
                  <p className="font-semibold text-gray-900 capitalize">{p.complexity}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Crew Size</p>
                  <p className="font-semibold text-gray-900 capitalize">{p.crew_size}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Proposals</p>
                  <p className="font-semibold text-gray-900">
                    {p.proposal_count > 0 ? `${p.proposal_count} received` : 'None yet'}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400">Posted {formatPosted(p.created_at)}</span>
                <div className="flex items-center gap-3 text-sm">
                  {p.proposal_count > 0 && p.status === 'open' && (
                    <Link href={`/client/projects/${p.id}/applicants`}
                      className="text-cobalt font-semibold hover:underline"
                      onClick={e => e.stopPropagation()}>
                      Review {p.proposal_count} applicants
                    </Link>
                  )}
                  <span className="text-gray-400">→</span>
                </div>
              </div>
            </Link>
          ))}

          {filtered.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
              <i className="fa-solid fa-briefcase text-4xl text-gray-300 mb-4 block"></i>
              <h3 className="font-semibold text-gray-600 mb-2">
                {allJobs.length === 0 ? 'No projects yet' : 'No projects match your filter'}
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                {allJobs.length === 0 ? 'Post your first job to start finding talented creators' : 'Try a different filter or search term'}
              </p>
              <Link href="/client/projects/create"
                className="bg-cobalt text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition">
                Create a Project
              </Link>
            </div>
          )}
        </section>
      )}
    </>
  );
}
