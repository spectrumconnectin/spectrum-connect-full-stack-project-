'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { smartConnect, SmartCreativeProfile, MatchHistoryItem } from '@/lib/api';
import EtfBadge from '@/components/EtfBadge';

const ROLE_OPTIONS = [
  'Graphic Designer', 'UI/UX Designer', 'Product Designer', 'Motion Designer', '3D Designer', 'Brand Identity Designer',
  'Video Editor', 'Videographer', 'Animator', 'VFX Artist', 'Film Director', 'Sound Designer',
  'Copywriter', 'Scriptwriter / Screenwriter', 'Content Writer', 'Editor',
  'Creative Director', 'Art Director', 'Brand Strategist', 'Social Media Manager',
  'Music Producer', 'Voice Actor', 'Composer',
  'Game Designer', '3D Modeler', 'AR/VR Designer',
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

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ClientSmartConnectPage() {
  const [creatives, setCreatives] = useState<SmartCreativeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [location, setLocation] = useState('');
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [activeTab, setActiveTab] = useState<'discover' | 'history'>('discover');
  const [history, setHistory] = useState<MatchHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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

  useEffect(() => {
    if (activeTab === 'history' && history.length === 0) {
      setHistoryLoading(true);
      smartConnect.getHistory()
        .then(res => setHistory(res.history))
        .catch(() => {})
        .finally(() => setHistoryLoading(false));
    }
  }, [activeTab, history.length]);

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

  const handleSave = async (c: SmartCreativeProfile) => {
    if (savedIds.has(c.user_id) || savingId === c.user_id) return;
    setSavingId(c.user_id);
    try {
      await smartConnect.save(c.user_id);
      setSavedIds(prev => { const s = new Set(prev); s.add(c.user_id); return s; });
      smartConnect.recordHistory({ match_title: c.name, match_subtitle: c.title || c.role, match_avatar: c.avatar, match_user_id: c.user_id, action: 'saved' }).catch(() => {});
    } catch { /* ignore */ } finally {
      setSavingId(null);
    }
  };

  const handleReset = () => {
    setQuery(''); setSelectedRole(''); setLocation('');
    setHasSearched(false);
    loadFeatured();
  };

  const ACTION_COLOR: Record<string, string> = { saved: 'bg-blue-100 text-blue-700', invited: 'bg-amber-100 text-amber-700', messaged: 'bg-purple-100 text-purple-700', applied: 'bg-green-100 text-green-700' };
  const ACTION_ICON: Record<string, string> = { saved: 'fa-bookmark', invited: 'fa-user-plus', messaged: 'fa-comment', applied: 'fa-paper-plane' };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Smart Connect</h1>
        <p className="text-lg text-gray-600">Discover and connect with top creative talent for your projects.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <section className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-200 p-7 sticky top-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Find Creators</h2>
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Keywords</label>
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. documentary, wedding video…"
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
                <input value={location} onChange={e => setLocation(e.target.value)} placeholder="City or country"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-cobalt" />
              </div>
              <button type="submit" disabled={searching}
                className={`w-full px-5 py-3 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition ${searching ? 'opacity-60 cursor-not-allowed' : ''}`}>
                {searching ? 'Searching…' : <><i className="fa-solid fa-magnifying-glass mr-2"></i>Search Creators</>}
              </button>
              {hasSearched && (
                <button type="button" onClick={handleReset}
                  className="w-full px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">
                  Reset to Featured
                </button>
              )}
            </form>
            <div className="mt-6 pt-5 border-t border-gray-100 space-y-3">
              <Link href="/client/collaborators" className="flex items-center gap-2 text-sm text-cobalt font-semibold hover:underline">
                <i className="fa-solid fa-users text-xs"></i> View all collaborators
              </Link>
              <p className="text-xs text-gray-400">Use Smart Connect to discover new talent. Saved creators appear in your collaborators list.</p>
            </div>
          </div>
        </section>

        <section className="lg:col-span-2">
          {/* Tabs */}
          <div className="flex items-center gap-2 mb-5">
            {([
              { key: 'discover' as const, label: 'Discover Creators', icon: 'fa-bolt' },
              { key: 'history' as const, label: 'Match History', icon: 'fa-clock-rotate-left' },
            ]).map(({ key, label, icon }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition ${activeTab === key ? 'bg-cobalt text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                <i className={`fa-solid ${icon} text-xs`}></i>
                {label}
                {key === 'history' && history.length > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>{history.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* History Tab Content */}
          {activeTab === 'history' && (
            historyLoading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-500 text-sm">Loading history…</p>
              </div>
            ) : history.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <i className="fa-solid fa-clock-rotate-left text-gray-400 text-2xl"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No match history yet</h3>
                <p className="text-gray-500 text-sm">Creators you save or contact via Smart Connect will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map(h => (
                  <div key={h.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4 hover:border-gray-300 transition">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {h.match_avatar
                        ? <img src={h.match_avatar} alt="" className="w-full h-full object-cover rounded-xl" />
                        : <span className="text-cobalt font-bold text-lg">{(h.match_title || '?')[0].toUpperCase()}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{h.match_title}</p>
                      {h.match_subtitle && <p className="text-sm text-gray-500 truncate">{h.match_subtitle}</p>}
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 flex-shrink-0 ${ACTION_COLOR[h.action] ?? 'bg-gray-100 text-gray-600'}`}>
                      <i className={`fa-solid ${ACTION_ICON[h.action] ?? 'fa-circle'} text-xs`}></i>
                      {h.action}
                    </span>
                    <span className="text-xs text-gray-400 hidden sm:inline flex-shrink-0">{timeAgo(h.created_at)}</span>
                    {h.match_user_id && (
                      <Link href={`/client/collaborators/${h.match_user_id}`} className="text-cobalt hover:text-blue-700 flex-shrink-0">
                        <i className="fa-solid fa-arrow-right text-sm"></i>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          {/* Discover Tab Content */}
          {activeTab === 'discover' && (
            loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-500 text-sm">Loading creators…</p>
              </div>
            ) : error ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
                <i className="fa-solid fa-circle-exclamation text-4xl text-red-300 mb-4 block"></i>
                <p className="text-red-500 text-sm mb-4">{error}</p>
                <button onClick={loadFeatured} className="px-5 py-2.5 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">Try Again</button>
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
              <>
                <p className="text-sm text-gray-500 mb-4">
                  {hasSearched ? `${totalResults} creator${totalResults !== 1 ? 's' : ''} found` : `${creatives.length} top-rated creators`}
                </p>
                <div className="space-y-4">
                  {creatives.map(c => {
                    const isSaved = savedIds.has(c.user_id);
                    const isSaving = savingId === c.user_id;
                    const rate = formatRate(c.daily_rate);
                    const loc = locationStr(c.location as string | { city?: string; country?: string });
                    return (
                      <div key={c.user_id} className="bg-white rounded-2xl border border-gray-200 p-6 hover:border-cobalt hover:shadow-md transition">
                        <div className="flex items-start gap-4">
                          <div className="relative flex-shrink-0">
                            {c.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={c.avatar} alt={c.name} className="w-14 h-14 rounded-xl object-cover border border-gray-200" />
                            ) : (
                              <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center text-cobalt text-xl font-bold border border-gray-200">{c.name[0]}</div>
                            )}
                            {c.availability && c.availability !== 'not_available' && (
                              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" title="Available now"></span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-bold text-gray-900">{c.name}</h3>
                                  <TrustBadge tier={c.trust_tier} />
                                  {c.etf_level ? (
                                    <EtfBadge level={{ name: c.etf_level, label: c.etf_level.charAt(0).toUpperCase() + c.etf_level.slice(1), icon: '', color: '', min_points: 0, next_min_points: null, progress_pct: 0 }} size="xs" />
                                  ) : (
                                    <EtfBadge userId={c.user_id} size="xs" />
                                  )}
                                </div>
                                <p className="text-sm text-cobalt font-medium">{c.title || c.role}</p>
                                {loc && <p className="text-xs text-gray-500 mt-0.5"><i className="fa-solid fa-location-dot mr-1"></i>{loc}</p>}
                                {c.availability && (
                                  <span className={`inline-flex items-center gap-1 text-xs font-medium mt-1 ${
                                    c.availability === 'available' ? 'text-green-600' :
                                    c.availability === 'busy' ? 'text-amber-600' : 'text-gray-400'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                      c.availability === 'available' ? 'bg-green-500' :
                                      c.availability === 'busy' ? 'bg-amber-400' : 'bg-gray-300'
                                    }`}></span>
                                    {c.availability === 'available' ? 'Available now' :
                                     c.availability === 'busy' ? 'Busy' : 'Unavailable'}
                                  </span>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0">
                                {c.rating > 0 && (
                                  <div className="text-sm font-bold text-gray-900">
                                    <i className="fa-solid fa-star text-yellow-400 mr-1"></i>{c.rating.toFixed(1)}
                                    <span className="text-gray-400 font-normal text-xs ml-1">({c.total_reviews})</span>
                                  </div>
                                )}
                                {rate && <div className="text-xs text-gray-500 mt-1">{rate}</div>}
                              </div>
                            </div>
                            {c.bio && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{c.bio}</p>}
                            {c.skills.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {c.skills.slice(0, 4).map(s => (
                                  <span key={s} className="text-xs px-2.5 py-1 bg-blue-50 text-cobalt rounded-full font-medium">{s}</span>
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
                          <Link href={`/client/collaborators/${c.user_id}`} className="flex-1 bg-cobalt text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition text-center">
                            View Profile
                          </Link>
                          <Link href={`/client/messaging?userId=${c.user_id}`} className="flex-1 bg-gray-50 text-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-100 transition border border-gray-200 text-center">
                            <i className="fa-solid fa-comment mr-1"></i>Message
                          </Link>
                          <button onClick={() => handleSave(c)} disabled={isSaved || isSaving}
                            className={`px-4 py-2.5 rounded-xl text-sm transition border ${isSaved ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'} ${isSaving ? 'opacity-60' : ''}`}
                            title={isSaved ? 'Saved' : 'Save creator'}>
                            <i className={`fa-solid fa-${isSaved ? 'check' : 'bookmark'}`}></i>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )
          )}
        </section>
      </div>
    </>
  );
}
