'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { talent, TalentItem } from '@/lib/api';
import EtfBadge from '@/components/EtfBadge';

/**
 * Returns a "Last seen …" label or null when the gap is ≥ 3 days.
 * Spec:
 *   < 60 min   → "Last seen Xm ago"
 *   < 24 h     → "Last seen Xh ago"
 *   1 day      → "Last seen 1 day ago"
 *   2 days     → "Last seen 2 days ago"
 *   ≥ 3 days   → null  (caller shows "Offline")
 */
function lastSeenLabel(iso?: string | null): string | null {
  if (!iso) return null;
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days  = Math.floor(diffMs / 86_400_000);

  if (mins  < 1)   return 'Last seen just now';
  if (mins  < 60)  return `Last seen ${mins}m ago`;
  if (hours < 24)  return `Last seen ${hours}h ago`;
  if (days  === 1) return 'Last seen 1 day ago';
  if (days  === 2) return 'Last seen 2 days ago';
  return null; // ≥ 3 days → show Offline
}

const ROLES = [
  'All Roles',
  // Design
  'Graphic Designer', 'UI/UX Designer', 'Product Designer', 'Motion Designer', '3D Designer', 'Brand Identity Designer',
  // Film & Video
  'Video Editor', 'Videographer', 'Animator', 'VFX Artist', 'Film Director', 'Sound Designer',
  // Writing & Content
  'Copywriter', 'Scriptwriter / Screenwriter', 'Content Writer', 'Editor',
  // Marketing & Strategy
  'Creative Director', 'Art Director', 'Brand Strategist', 'Social Media Manager',
  // Music & Audio
  'Music Producer', 'Voice Actor', 'Composer',
  // Digital & Interactive
  'Game Designer', '3D Modeler', 'AR/VR Designer',
];

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

  const fetchCreators = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const params: { q?: string; skill?: string; limit: number } = { limit: 40 };
      if (search.trim()) params.q = search.trim();
      if (roleFilter !== 'All Roles') params.skill = roleFilter;
      const result = await talent.search(params);
      setCreators(result.talent || []);
    } catch (e) {
      if (!silent) setError((e as Error).message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [search, roleFilter]);

  // Load on mount, filter change, or manual refresh
  useEffect(() => {
    let cancelled = false;
    const delay = search ? 400 : 0;
    const t = setTimeout(() => { if (!cancelled) fetchCreators(); }, delay);
    return () => { cancelled = true; clearTimeout(t); };
  }, [fetchCreators, refreshKey]);

  // Silent background refresh every 30 s — keeps online badges accurate
  useEffect(() => {
    const interval = setInterval(() => fetchCreators(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchCreators]);

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
            {/* Top 6 popular roles as quick chips */}
            {['All Roles', 'Video Editor', 'Graphic Designer', 'Motion Designer', 'Copywriter', 'Animator'].map(r => (
              <button key={r} onClick={() => setRoleFilter(r)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${roleFilter === r ? 'bg-cobalt text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {r}
              </button>
            ))}
            {/* Dropdown for all other roles */}
            <select
              value={ROLES.slice(7).includes(roleFilter) ? roleFilter : ''}
              onChange={e => e.target.value && setRoleFilter(e.target.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition cursor-pointer ${ROLES.slice(7).includes(roleFilter) ? 'bg-cobalt text-white border-cobalt' : 'bg-gray-100 text-gray-600 border-gray-100 hover:bg-gray-200'}`}
            >
              <option value="">More roles…</option>
              {ROLES.slice(7).map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
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

function AvailabilityDot({ status }: { status?: string }) {
  if (!status) return null;
  const color = status === 'available' ? 'bg-green-500' : status === 'busy' ? 'bg-amber-400' : 'bg-gray-300';
  const label = status === 'available' ? 'Available' : status === 'busy' ? 'Busy' : 'Unavailable';
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${status === 'available' ? 'text-green-600' : status === 'busy' ? 'text-amber-600' : 'text-gray-400'}`}>
      <span className={`w-1.5 h-1.5 rounded-full inline-block ${color}`}></span>
      {label}
    </span>
  );
}

function CreatorCard({ creator: c }: { creator: TalentItem }) {
  const rate = formatRate(c.hourly_rate_min, c.hourly_rate_max);
  const hasPortfolio = (c.portfolio_item_count ?? 0) > 0;

  return (
    <Link href={`/client/collaborators/${c.id}`}
      className="flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm hover:border-cobalt hover:shadow-md transition group overflow-hidden">

      {/* Portfolio preview strip — shows if creator has portfolio */}
      <div className={`h-1.5 w-full ${hasPortfolio ? (c.portfolio_has_video ? 'bg-gradient-to-r from-purple-400 to-blue-500' : 'bg-gradient-to-r from-blue-300 to-cobalt') : 'bg-gray-100'}`} />

      <div className="p-5 flex flex-col flex-1">
        {/* Header: avatar + name + rating */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              {c.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.avatar} alt={c.name}
                  className="w-14 h-14 rounded-xl border-2 border-gray-100 object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-xl border-2 border-gray-100 bg-blue-100 flex items-center justify-center text-cobalt font-bold text-xl">
                  {c.name[0]?.toUpperCase()}
                </div>
              )}
              {/* Avatar corner dot — colour reflects online presence + availability setting */}
              {c.is_online && (
                <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                  c.availability_status === 'busy' ? 'bg-amber-400' :
                  c.availability_status === 'not_available' ? 'bg-gray-400' :
                  'bg-green-500'
                }`} />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 group-hover:text-cobalt transition truncate">{c.name}</h3>
              {c.title && <p className="text-sm text-cobalt font-medium truncate mt-0.5">{c.title}</p>}
              {c.location && <p className="text-xs text-gray-400 mt-0.5 truncate"><i className="fa-solid fa-location-dot mr-1"></i>{c.location}</p>}
            </div>
          </div>
          {/* Rating */}
          {c.rating ? (
            <div className="text-right shrink-0 ml-2">
              <div className="text-base font-bold text-amber-500 flex items-center gap-1">
                <i className="fa-solid fa-star text-sm"></i>{c.rating.toFixed(1)}
              </div>
              <div className="text-xs text-gray-400">{c.review_count ?? 0} reviews</div>
            </div>
          ) : null}
        </div>

        {/* Skills */}
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

        {/* ETF Badge + Availability + Portfolio */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          {c.etf_level && (
            <EtfBadge
              level={{ name: c.etf_level as 'bronze'|'silver'|'gold'|'platinum', label: c.etf_level.charAt(0).toUpperCase() + c.etf_level.slice(1), icon: '', color: '', min_points: 0, next_min_points: null, progress_pct: 0 }}
              size="xs"
            />
          )}
          {/* Status: combines real-time presence with the user's availability setting */}
          {c.is_online
            ? c.availability_status === 'busy'
              ? <span className="flex items-center gap-1 text-xs font-semibold text-amber-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                  Busy
                </span>
              : c.availability_status === 'not_available'
                ? <span className="flex items-center gap-1 text-xs text-gray-500 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
                    Not available
                  </span>
                : <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
                    Online
                  </span>
            : (() => {
                const label = lastSeenLabel(c.last_seen);
                return label
                  ? <span className="flex items-center gap-1 text-xs text-gray-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
                      {label}
                    </span>
                  : <span className="flex items-center gap-1 text-xs text-gray-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
                      Offline
                    </span>;
              })()
          }
          {hasPortfolio && (
            <span className="flex items-center gap-1 text-xs text-purple-600 font-medium">
              <i className={`fa-solid ${c.portfolio_has_video ? 'fa-film' : 'fa-image'} text-[10px]`}></i>
              {c.portfolio_has_video ? 'Video portfolio' : 'Portfolio'}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm border-t border-gray-100 pt-3 mt-auto">
          <span className="font-bold text-gray-900">{rate}</span>
          <span className="text-xs text-gray-500">
            {c.review_count != null && c.review_count > 0
              ? <><i className="fa-solid fa-briefcase text-gray-300 mr-1"></i>{c.review_count} project{c.review_count !== 1 ? 's' : ''}</>
              : <span className="text-emerald-500 font-medium">New</span>
            }
          </span>
        </div>
      </div>
    </Link>
  );
}
