'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { smartConnect, SmartCreativeProfile } from '@/lib/api';

const ROLE_OPTIONS = [
  'Cinematographer', 'Director of Photography', 'Video Editor', 'Sound Designer',
  'Motion Designer', 'Graphic Designer', 'Photographer', 'Producer', 'Scriptwriter',
  'Colorist', 'Gaffer', 'Art Director',
];

const TRUST_COLORS: Record<string, string> = {
  Bronze: 'bg-orange-50 text-orange-700',
  Silver: 'bg-gray-100 text-gray-600',
  Gold: 'bg-yellow-50 text-yellow-700',
  Platinum: 'bg-indigo-50 text-indigo-700',
  Diamond: 'bg-sky-50 text-sky-700',
};

function TrustBadge({ tier }: { tier: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${TRUST_COLORS[tier] ?? 'bg-gray-100 text-gray-600'}`}>
      {tier}
    </span>
  );
}

function formatRate(rate?: number): string | null {
  if (!rate) return null;
  return `$${rate.toLocaleString()}/day`;
}

function locationStr(loc?: string | { city?: string; country?: string }): string | null {
  if (!loc) return null;
  if (typeof loc === 'string') return loc;
  return [loc.city, loc.country].filter(Boolean).join(', ') || null;
}

export default function ClientSmartConnectPage() {
  const [creatives, setCreatives] = useState<SmartCreativeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  // Search state
  const [query, setQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [location, setLocation] = useState('');
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  const loadFeatured = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await smartConnect.getFeatured(9);
      setCreatives(res.profiles);
      setTotalResults(res.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFeatured(); }, [loadFeatured]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true); setError(null);
    try {
      const res = await smartConnect.search({
        query: query.trim() || undefined,
        roles: selectedRole ? [selectedRole] : undefined,
        location: location.trim() || undefined,
        limit: 12,
      });
      setCreatives(res.creatives);
      setTotalResults(res.total);
      setHasSearched(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const handleSave = async (userId: string) => {
    if (savedIds.has(userId) || savingId === userId) return;
    setSavingId(userId);
    try {
      await smartConnect.save(userId);
      setSavedIds(prev => { const s = new Set(prev); s.add(userId); return s; });
    } catch {
      // ignore
    } finally {
      setSavingId(null);
    }
  };

  const handleReset = () => {
    setQuery(''); setSelectedRole(''); setLocation('');
    setHasSearched(false);
    loadFeatured();
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Smart Connect</h1>
        <p className="text-lg text-gray-600">Discover and connect with top creative talent for your projects.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Search panel */}
        <section className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-200 p-7 sticky top-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Find Creators</h2>
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Keywords</label>
                <input value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="e.g. documentary, wedding video…"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-cobalt" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
                <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-cobalt bg-white">
                  <option value="">Any role</option>
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Location</label>
                <input value={location} onChange={e => setLocation(e.target.value)}
                  placeholder="City or country"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-cobalt" />
              </div>

              <button type="submit" disabled={searching}
                className={`w-full px-5 py-3 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition ${searching ? 'opacity-60 cursor-not-allowed' : ''}`}>
                {searching
                  ? 'Searching…'
                  : <><i className="fa-solid fa-magnifying-glass mr-2"></i>Search Creators</>
                }
              </button>

              {hasSearched && (
                <button type="button" onClick={handleReset}
                  className="w-full px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">
                  Reset to Featured
                </button>
              )}
            </form>

            <div className="mt-6 pt-5 border-t border-gray-100 space-y-3">
              <Link href="/client/collaborators"
                className="flex items-center gap-2 text-sm text-cobalt font-semibold hover:underline">
                <i className="fa-solid fa-users text-xs"></i> View all collaborators
              </Link>
              <p className="text-xs text-gray-400">
                Use Smart Connect to discover new talent. Saved creators appear in your collaborators list.
              </p>
            </div>
          </div>
        </section>

        {/* Results */}
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {hasSearched ? 'Search Results' : 'Featured Creators'}
              </h2>
              {!loading && (
                <p className="text-sm text-gray-500">
                  {hasSearched ? `${totalResults} creator${totalResults !== 1 ? 's' : ''} found` : `${creatives.length} top-rated creators`}
                </p>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500 text-sm">Loading creators…</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
              <i className="fa-solid fa-circle-exclamation text-4xl text-red-300 mb-4 block"></i>
              <p className="text-red-500 text-sm mb-4">{error}</p>
              <button onClick={loadFeatured}
                className="px-5 py-2.5 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
                Try Again
              </button>
            </div>
          ) : creatives.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-user-slash text-cobalt text-2xl"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No creators found</h3>
              <p className="text-gray-500 text-sm">Try adjusting your search filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {creatives.map(c => {
                const isSaved = savedIds.has(c.user_id);
                const isSaving = savingId === c.user_id;
                const rate = formatRate(c.daily_rate);
                const loc = locationStr(c.location as string | { city?: string; country?: string });

                return (
                  <div key={c.user_id}
                    className="bg-white rounded-2xl border border-gray-200 p-6 hover:border-cobalt hover:shadow-md transition">
                    <div className="flex items-start gap-4">
                      <div className="relative flex-shrink-0">
                        {c.avatar ? (
                          <img src={c.avatar} alt={c.name}
                            className="w-14 h-14 rounded-xl object-cover border border-gray-200" />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center text-cobalt text-xl font-bold border border-gray-200">
                            {c.name[0]}
                          </div>
                        )}
                        {c.availability === 'available' && (
                          <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"
                            title="Available now"></span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-gray-900">{c.name}</h3>
                              <TrustBadge tier={c.trust_tier} />
                            </div>
                            <p className="text-sm text-cobalt font-medium">{c.title || c.role}</p>
                            {loc && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                <i className="fa-solid fa-location-dot mr-1"></i>{loc}
                              </p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            {c.rating > 0 && (
                              <div className="text-sm font-bold text-gray-900">
                                <i className="fa-solid fa-star text-yellow-400 mr-1"></i>
                                {c.rating.toFixed(1)}
                                <span className="text-gray-400 font-normal text-xs ml-1">({c.total_reviews})</span>
                              </div>
                            )}
                            {rate && <div className="text-xs text-gray-500 mt-1">{rate}</div>}
                          </div>
                        </div>

                        {c.bio && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{c.bio}</p>
                        )}

                        {c.skills.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {c.skills.slice(0, 4).map(s => (
                              <span key={s}
                                className="text-xs px-2.5 py-1 bg-blue-50 text-cobalt rounded-full font-medium">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}

                        {c.active_project_count > 0 && (
                          <p className="text-xs text-gray-400 mt-2">
                            <i className="fa-solid fa-briefcase mr-1"></i>
                            {c.active_project_count}/{c.workload_capacity} active project{c.active_project_count !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                      <Link href={`/client/collaborators/${c.user_id}`}
                        className="flex-1 bg-cobalt text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition text-center">
                        View Profile
                      </Link>
                      <Link href={`/client/messaging?userId=${c.user_id}`}
                        className="flex-1 bg-gray-50 text-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-100 transition border border-gray-200 text-center">
                        <i className="fa-solid fa-comment mr-1"></i>Message
                      </Link>
                      <button
                        onClick={() => handleSave(c.user_id)}
                        disabled={isSaved || isSaving}
                        className={`px-4 py-2.5 rounded-xl text-sm transition border ${
                          isSaved
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                        } ${isSaving ? 'opacity-60' : ''}`}
                        title={isSaved ? 'Saved' : 'Save creator'}>
                        <i className={`fa-solid fa-${isSaved ? 'check' : 'bookmark'}`}></i>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
