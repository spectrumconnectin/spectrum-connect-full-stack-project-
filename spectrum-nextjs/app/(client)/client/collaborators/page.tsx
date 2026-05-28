'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { talent, TalentItem } from '../../../../lib/api';

const ROLES = ['All Roles', 'Cinematographer', 'Editor', 'Sound Designer', 'Motion Designer',
  'Director', 'Photographer', 'Animator', 'VFX Artist', 'Colorist'];

const SORT_OPTIONS = ['Best Match', 'Highest Rated', 'Most Projects', 'Lowest Rate'];

function formatRate(min?: number, max?: number): string {
  if (!min && !max) return 'Rate TBD';
  if (min && max) return `$${min}–$${max}/hr`;
  if (min) return `$${min}+/hr`;
  return `$${max}/hr`;
}

export default function CollaboratorsPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [sortBy, setSortBy] = useState('Best Match');
  const [creators, setCreators] = useState<TalentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const delay = search ? 400 : 0;
    const timeout = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params: { q?: string; skill?: string; limit: number } = { limit: 40 };
        if (search.trim()) params.q = search.trim();
        if (roleFilter !== 'All Roles') params.skill = roleFilter;

        const result = await talent.search(params);
        if (!cancelled) setCreators(result.talent || []);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, delay);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [search, roleFilter, refreshKey]);

  const sorted = [...creators].sort((a, b) => {
    if (sortBy === 'Highest Rated') return (b.rating ?? 0) - (a.rating ?? 0);
    if (sortBy === 'Most Projects') return (b.review_count ?? 0) - (a.review_count ?? 0);
    if (sortBy === 'Lowest Rate') return (a.hourly_rate_min ?? 9999) - (b.hourly_rate_min ?? 9999);
    return 0;
  });

  return (
    <>
      {/* Hero */}
      <section className="mb-10">
        <div className="text-center max-w-3xl mx-auto mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Find Your Perfect Collaborator</h1>
          <p className="text-lg text-gray-600">Connect with verified film & creative professionals</p>
        </div>

        {/* Search panel */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl p-6">
          <div className="flex items-center gap-4 mb-5">
            <div className="flex-grow relative">
              <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
              <input type="text" placeholder="Search by name, skills, or headline…"
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-cobalt focus:ring-2 focus:ring-blue-100 transition" />
            </div>
            <button onClick={() => setRefreshKey(k => k + 1)}
              className="bg-cobalt text-white px-8 py-4 rounded-xl font-bold hover:bg-blue-700 transition whitespace-nowrap">
              Search
            </button>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {ROLES.map(r => (
              <button key={r} onClick={() => setRoleFilter(r)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${roleFilter === r ? 'bg-cobalt text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {r}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Results header */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-600">
          {loading ? (
            <span className="text-gray-400 text-sm">Searching…</span>
          ) : (
            <><span className="font-semibold text-gray-900">{sorted.length}</span> creators found</>
          )}
        </p>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-cobalt bg-white">
          {SORT_OPTIONS.map(o => <option key={o}>{o}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Finding creators…</p>
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <i className="fa-solid fa-circle-exclamation text-5xl text-red-300 mb-4 block"></i>
          <h3 className="font-semibold text-gray-600 text-lg mb-2">Could not load creators</h3>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button onClick={() => setRefreshKey(k => k + 1)}
            className="px-5 py-2.5 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
            Try again
          </button>
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-20">
          <i className="fa-solid fa-search text-5xl text-gray-300 mb-4 block"></i>
          <h3 className="font-semibold text-gray-600 text-lg mb-2">No creators found</h3>
          <p className="text-gray-400">Try adjusting your search or role filter</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sorted.map(c => (
            <CreatorCard key={c.id} creator={c} />
          ))}
        </div>
      )}
    </>
  );
}

// ── Creator card ──────────────────────────────────────────────────────────────

function CreatorCard({ creator: c }: { creator: TalentItem }) {
  const rate = formatRate(c.hourly_rate_min, c.hourly_rate_max);

  return (
    <Link href={`/client/collaborators/${c.id}`}
      className="block bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:border-cobalt hover:shadow-md transition group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            {c.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.avatar} alt={c.name}
                className="w-14 h-14 rounded-xl border-2 border-gray-200 object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-xl border-2 border-gray-200 bg-blue-100 flex items-center justify-center text-cobalt font-bold text-xl">
                {c.name[0]?.toUpperCase()}
              </div>
            )}
            {c.location && (
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" title="Available"></span>
            )}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 group-hover:text-cobalt transition">{c.name}</h3>
            {c.title && <p className="text-sm text-cobalt font-medium line-clamp-1">{c.title}</p>}
            {c.location && <p className="text-xs text-gray-400 mt-0.5"><i className="fa-solid fa-location-dot mr-1"></i>{c.location}</p>}
          </div>
        </div>
        {c.rating ? (
          <div className="text-right shrink-0">
            <div className="text-lg font-bold text-amber-500">{c.rating.toFixed(1)}</div>
            <div className="text-xs text-gray-400">★ rating</div>
          </div>
        ) : null}
      </div>

      {c.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {c.skills.slice(0, 4).map(s => (
            <span key={s} className="text-xs px-2.5 py-1 bg-blue-50 text-cobalt rounded-full font-medium">{s}</span>
          ))}
          {c.skills.length > 4 && (
            <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full">+{c.skills.length - 4}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-sm border-t border-gray-100 pt-4">
        <span className="font-bold text-gray-900">{rate}</span>
        <span className="text-gray-500">
          {c.review_count != null && c.review_count > 0
            ? <><i className="fa-solid fa-briefcase text-gray-400 mr-1"></i>{c.review_count} projects</>
            : <span className="text-blue-400 font-medium">New</span>
          }
        </span>
      </div>
    </Link>
  );
}
