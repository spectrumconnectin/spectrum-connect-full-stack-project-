'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { jobs, JobPostItem } from '../../../../lib/api';

const DEPARTMENTS = [
  'All Departments', 'Camera', 'Cinematography', 'Directing', 'Editing',
  'Post-Production', 'Sound', 'Sound Design', 'Music Composition',
  'Motion Graphics', 'Animation', 'VFX', 'Lighting', 'Grip',
  'Art Department', 'Production Management', 'Scripting', 'Storyboarding',
  '3D Modeling', 'Producing', 'Other',
];
const SORT_OPTIONS = ['Most Recent', 'Lowest Competition', 'Highest Budget', 'Lowest Budget'];
const BUDGET_RANGES = ['Any Budget', 'Under $1,000', '$1,000 – $3,000', '$3,000 – $6,000', '$6,000+'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBudget(p: JobPostItem): string {
  const fmt = (min?: number, max?: number, suffix = '') => {
    if (min && max) return `$${min.toLocaleString()} – $${max.toLocaleString()}${suffix}`;
    if (min) return `From $${min.toLocaleString()}${suffix}`;
    return `Rate TBD`;
  };
  if (p.budget_type === 'fixed') return fmt(p.budget?.min, p.budget?.max);
  if (p.budget_type === 'hourly') return fmt(p.hourly_rate?.min, p.hourly_rate?.max, '/hr');
  if (p.budget_type === 'daily') return fmt(p.daily_rate?.min, p.daily_rate?.max, '/day');
  if (p.budget_type === 'weekly') return fmt(p.weekly_rate?.min, p.weekly_rate?.max, '/wk');
  return 'Rate TBD';
}

function getBudgetMin(p: JobPostItem): number {
  if (p.budget_type === 'fixed') return p.budget?.min ?? 0;
  if (p.budget_type === 'hourly') return (p.hourly_rate?.min ?? 0) * 8;
  if (p.budget_type === 'daily') return p.daily_rate?.min ?? 0;
  if (p.budget_type === 'weekly') return (p.weekly_rate?.min ?? 0) / 5;
  return 0;
}

function formatPosted(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return 'Just now';
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(diff / 86400000);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FindProjectsPage() {
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All Departments');
  const [budget, setBudget] = useState('Any Budget');
  const [sort, setSort] = useState('Most Recent');
  const [projects, setProjects] = useState<JobPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const toggleSave = (id: string) =>
    setSaved(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  useEffect(() => {
    let cancelled = false;
    const delay = search ? 400 : 0;
    const timeout = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string | number | undefined> = { status: 'open', limit: 40 };
        if (search.trim()) params.search = search.trim();
        if (department !== 'All Departments') params.department = department;
        if (budget === 'Under $1,000') { params.max_budget = 1000; }
        else if (budget === '$1,000 – $3,000') { params.min_budget = 1000; params.max_budget = 3000; }
        else if (budget === '$3,000 – $6,000') { params.min_budget = 3000; params.max_budget = 6000; }
        else if (budget === '$6,000+') { params.min_budget = 6000; }
        if (sort === 'Lowest Competition') { params.sort_by = 'proposals'; params.sort_order = 'asc'; }
        else if (sort === 'Highest Budget') { params.sort_by = 'budget'; params.sort_order = 'desc'; }
        else if (sort === 'Lowest Budget') { params.sort_by = 'budget'; params.sort_order = 'asc'; }

        const result = await jobs.search(params);
        if (!cancelled) setProjects(result.jobs || []);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, delay);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [search, department, budget, sort, refreshKey]);

  // Client-side sort for proposals (API might not sort by proposals correctly)
  const sorted = sort === 'Lowest Competition'
    ? [...projects].sort((a, b) => a.proposal_count - b.proposal_count)
    : sort === 'Highest Budget'
      ? [...projects].sort((a, b) => getBudgetMin(b) - getBudgetMin(a))
      : sort === 'Lowest Budget'
        ? [...projects].sort((a, b) => getBudgetMin(a) - getBudgetMin(b))
        : projects;

  return (
    <>
      {/* ── Hero search ── */}
      <section className="mb-8">
        <div className="max-w-3xl mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Find Projects</h1>
          <p className="text-lg text-gray-500">Browse film & creative opportunities that match your skills.</p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-60">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by skill, keyword, or department…"
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cobalt focus:ring-2 focus:ring-blue-100 shadow-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            )}
          </div>

          <select value={department} onChange={e => setDepartment(e.target.value)}
            className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-cobalt shadow-sm">
            {DEPARTMENTS.map(c => <option key={c}>{c}</option>)}
          </select>

          <select value={budget} onChange={e => setBudget(e.target.value)}
            className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-cobalt shadow-sm">
            {BUDGET_RANGES.map(b => <option key={b}>{b}</option>)}
          </select>

          <select value={sort} onChange={e => setSort(e.target.value)}
            className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-cobalt shadow-sm">
            {SORT_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </section>

      {/* ── Stats row ── */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-600">
          {loading ? (
            <span className="text-gray-400">Searching…</span>
          ) : error ? (
            <span className="text-red-500">Error loading</span>
          ) : (
            <>
              <span className="font-semibold text-gray-900">{sorted.length}</span> projects found
              {search && <span> for <span className="font-semibold text-cobalt">"{search}"</span></span>}
            </>
          )}
        </p>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span><i className="fa-solid fa-circle text-green-400 mr-1 text-[8px]"></i>Live opportunities</span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading projects…</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-circle-exclamation text-red-400 text-2xl"></i>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Failed to load projects</h3>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <button onClick={() => setRefreshKey(k => k + 1)}
            className="px-5 py-2.5 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
            Try again
          </button>
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-magnifying-glass text-gray-400 text-2xl"></i>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">No projects found</h3>
          <p className="text-gray-500 text-sm mb-4">Try adjusting your filters or search terms.</p>
          <button onClick={() => { setSearch(''); setDepartment('All Departments'); setBudget('Any Budget'); }}
            className="px-5 py-2.5 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(p => (
            <ProjectCard key={p.id} project={p} saved={saved} onSave={toggleSave} expanded={expanded} onExpand={setExpanded} />
          ))}
        </div>
      )}
    </>
  );
}

// ── Project card ──────────────────────────────────────────────────────────────

function ProjectCard({
  project: p,
  saved,
  onSave,
  expanded,
  onExpand,
}: {
  project: JobPostItem;
  saved: string[];
  onSave: (id: string) => void;
  expanded: string | null;
  onExpand: (id: string | null) => void;
}) {
  const isSaved = saved.includes(p.id);
  const isExpanded = expanded === p.id;
  const desc = p.description || '';
  const budgetStr = formatBudget(p);
  const postedStr = formatPosted(p.published_at || p.created_at);
  const durationStr = p.duration || (p.estimated_duration ? `${p.estimated_duration} days` : null);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 hover:border-cobalt hover:shadow-md transition-all">
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Department icon */}
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <i className="fa-solid fa-clapperboard text-cobalt"></i>
          </div>

          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-gray-900">{p.title}</h3>
                {p.complexity === 'complex' && (
                  <span className="text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full">Complex</span>
                )}
                {p.proposal_count === 0 && (
                  <span className="text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">New</span>
                )}
              </div>
              <button onClick={() => onSave(p.id)} title={isSaved ? 'Remove' : 'Save'}
                className={`p-1.5 rounded-lg transition flex-shrink-0 ${isSaved ? 'text-cobalt bg-blue-50' : 'text-gray-400 hover:text-cobalt hover:bg-gray-50'}`}>
                <i className={`fa-${isSaved ? 'solid' : 'regular'} fa-bookmark text-sm`}></i>
              </button>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2 flex-wrap">
              <span className="text-cobalt font-semibold">{p.department}</span>
              {p.role && <><span className="text-gray-300">·</span><span>{p.role}</span></>}
              <span className="text-gray-300">·</span>
              <span className="capitalize">{p.experience_level}</span>
              {p.crew_size && <><span className="text-gray-300">·</span><span className="capitalize">{p.crew_size.replace('_', ' ')}</span></>}
              {postedStr && <><span className="text-gray-300">·</span><span>{postedStr}</span></>}
            </div>

            {/* Description */}
            {desc && (
              <>
                <p className={`text-sm text-gray-600 mb-3 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>{desc}</p>
                {desc.length > 120 && (
                  <button onClick={() => onExpand(isExpanded ? null : p.id)}
                    className="text-xs text-cobalt font-medium hover:underline mb-3 block">
                    {isExpanded ? 'Show less' : 'Read more'}
                  </button>
                )}
              </>
            )}

            {/* Tags + stats */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex flex-wrap gap-1.5">
                {(p.tags || []).slice(0, 5).map(t => (
                  <span key={t} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg">{t}</span>
                ))}
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1 font-medium text-gray-700">
                  <i className="fa-solid fa-dollar-sign text-gray-400"></i>{budgetStr}
                </span>
                {durationStr && (
                  <span className="flex items-center gap-1">
                    <i className="fa-regular fa-clock text-gray-400"></i>{durationStr}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <i className="fa-solid fa-paper-plane text-gray-400"></i>
                  <span className={p.proposal_count < 5 ? 'text-green-600 font-semibold' : ''}>{p.proposal_count} proposals</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 pb-4 flex items-center gap-3 border-t border-gray-100 pt-4">
        <Link href={`/creator/projects/${p.id}/apply`}
          className="px-5 py-2.5 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
          <i className="fa-solid fa-paper-plane mr-2"></i>Apply Now
        </Link>
        <Link href={`/creator/projects/${p.id}`}
          className="px-5 py-2.5 border border-cobalt text-cobalt rounded-xl text-sm font-semibold hover:bg-blue-50 transition">
          View Details
        </Link>
        {postedStr && (
          <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
            <i className="fa-regular fa-calendar text-gray-300"></i>
            Posted {postedStr}
          </span>
        )}
      </div>
    </div>
  );
}
