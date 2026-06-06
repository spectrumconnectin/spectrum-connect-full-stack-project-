'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { smartConnect, CreatorSmartMatch, MatchHistoryItem, currencySymbol } from '@/lib/api';

function formatBudget(type?: string, min?: number, max?: number, currency?: string): string | null {
  const sym = currencySymbol(currency);
  if (!type) return null;
  if (type === 'fixed') {
    if (min && max) return min === max ? `${sym}${min.toLocaleString()}` : `${sym}${min.toLocaleString()} – ${sym}${max.toLocaleString()}`;
    if (min) return `${sym}${min.toLocaleString()}+`;
  }
  if (type === 'hourly') {
    if (min && max) return `${sym}${min}–${sym}${max}/hr`;
    if (min) return `${sym}${min}/hr`;
  }
  return null;
}

function matchBadgeColor(pct: number): string {
  if (pct >= 90) return 'bg-green-100 text-green-700';
  if (pct >= 80) return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-600';
}

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function CreatorSmartConnectPage() {
  const [matches, setMatches] = useState<CreatorSmartMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [capacity, setCapacity] = useState(3);
  const [savingCapacity, setSavingCapacity] = useState(false);
  const [capacitySaved, setCapacitySaved] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'saved' | 'history'>('all');
  const [history, setHistory] = useState<MatchHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await smartConnect.getCreatorMatches(12);
      setMatches(res.matches);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (filter === 'history' && history.length === 0) {
      setHistoryLoading(true);
      smartConnect.getHistory()
        .then(res => setHistory(res.history))
        .catch(() => {})
        .finally(() => setHistoryLoading(false));
    }
  }, [filter, history.length]);

  const toggleSave = (id: string) => {
    setSavedIds(prev => {
      const next = new Set(prev);
      const isNowSaving = !next.has(id);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      if (isNowSaving) {
        const m = matches.find(x => x.id === id);
        if (m) {
          smartConnect.recordHistory({
            match_title: m.title,
            match_subtitle: m.tags?.[0],
            match_score: m.match_percent,
            match_job_id: m.id,
            action: 'saved',
          }).catch(() => {});
        }
      }
      return next;
    });
    smartConnect.save(id).catch(() => {});
  };

  const handleSaveCapacity = async () => {
    setSavingCapacity(true);
    try {
      await smartConnect.updateCapacity(capacity);
      setCapacitySaved(true);
      setTimeout(() => setCapacitySaved(false), 3000);
    } catch {
      // ignore
    } finally {
      setSavingCapacity(false);
    }
  };

  const displayed = filter === 'saved'
    ? matches.filter(m => savedIds.has(m.id))
    : matches;

  return (
    <>
      <section className="mb-10">
        <div className="max-w-3xl">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4">Smart Connect</h1>
          <p className="text-lg text-gray-600 mb-1">Projects matched to your skills — no searching, no guesswork.</p>
          <p className="text-sm text-gray-500">Updated automatically as new jobs are posted.</p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Preferences sidebar */}
        <section className="lg:col-span-1 bg-white rounded-2xl border border-gray-200 p-7">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Availability</h2>
            <i className="fa-solid fa-sliders text-cobalt"></i>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Max concurrent projects
                <span className="ml-2 font-bold text-cobalt">{capacity}</span>
              </label>
              <input type="range" min={1} max={10} step={1} value={capacity}
                onChange={e => { setCapacity(Number(e.target.value)); setCapacitySaved(false); }}
                className="w-full accent-cobalt" />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1 project</span><span>10 projects</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                You&apos;ll stop appearing in Smart Connect results once you reach this limit.
              </p>
            </div>

            <button onClick={handleSaveCapacity} disabled={savingCapacity}
              className={`w-full px-5 py-3 rounded-xl text-sm font-semibold transition ${
                capacitySaved ? 'bg-emerald-600 text-white' : 'bg-cobalt text-white hover:bg-blue-700'
              } ${savingCapacity ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {capacitySaved
                ? <><i className="fa-solid fa-circle-check mr-2"></i>Saved!</>
                : savingCapacity ? 'Saving…' : 'Save Availability'}
            </button>

            <div className="pt-4 border-t border-gray-100 space-y-2">
              <p className="text-xs font-semibold text-gray-600">Your skills drive these matches.</p>
              <p className="text-xs text-gray-400">
                Add more skills on your{' '}
                <Link href="/creator/profile" className="text-cobalt underline">profile page</Link>
                {' '}to improve match quality.
              </p>
            </div>
          </div>
        </section>

        {/* Match list */}
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-0.5">Matched Opportunities</h2>
              {!loading && (
                <p className="text-sm text-gray-500">{matches.length} match{matches.length !== 1 ? 'es' : ''} for your skills</p>
              )}
            </div>
            <div className="flex gap-2">
              {([
                { key: 'all', label: 'All Matches' },
                { key: 'saved', label: 'Saved' },
                { key: 'history', label: 'History' },
              ] as const).map(({ key, label }) => (
                <button key={key} onClick={() => setFilter(key)}
                  className={`px-4 py-2 text-sm font-semibold rounded-xl transition ${
                    filter === key ? 'bg-cobalt text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}>
                  {label}
                  {key === 'history' && history.length > 0 && (
                    <span className="ml-1.5 text-xs bg-white/20 px-1.5 py-0.5 rounded-full">{history.length}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500 text-sm">Finding your matches…</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
              <i className="fa-solid fa-circle-exclamation text-4xl text-red-300 mb-4 block"></i>
              <p className="text-red-500 text-sm mb-4">{error}</p>
              <button onClick={load}
                className="px-5 py-2.5 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
                Try Again
              </button>
            </div>
          ) : filter === 'history' ? (
            /* ── History Tab ── */
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
                <h3 className="text-xl font-bold text-gray-900 mb-2">No history yet</h3>
                <p className="text-gray-500 text-sm">When you apply to a matched project, it will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map(h => {
                  const actionColor: Record<string, string> = {
                    applied: 'bg-green-100 text-green-700',
                    saved: 'bg-blue-100 text-blue-700',
                    messaged: 'bg-purple-100 text-purple-700',
                    invited: 'bg-amber-100 text-amber-700',
                  };
                  const actionIcon: Record<string, string> = {
                    applied: 'fa-paper-plane',
                    saved: 'fa-bookmark',
                    messaged: 'fa-comment',
                    invited: 'fa-user-plus',
                  };
                  const timeAgoStr = (() => {
                    const ms = Date.now() - new Date(h.created_at).getTime();
                    const m = Math.floor(ms / 60000);
                    if (m < 60) return `${m}m ago`;
                    const hr = Math.floor(m / 60);
                    if (hr < 24) return `${hr}h ago`;
                    return `${Math.floor(hr / 24)}d ago`;
                  })();
                  return (
                    <div key={h.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4 hover:border-gray-300 transition">
                      {/* Avatar / icon */}
                      <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {h.match_avatar
                          ? <img src={h.match_avatar} alt={h.match_title ?? 'Creator avatar'} className="w-full h-full object-cover" />
                          : <i className="fa-solid fa-briefcase text-cobalt text-lg"></i>}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{h.match_title}</p>
                        {h.match_subtitle && <p className="text-sm text-gray-500 truncate">{h.match_subtitle}</p>}
                      </div>
                      {/* Match score */}
                      {h.match_score && (
                        <span className="hidden sm:inline text-xs font-bold px-2 py-1 rounded-full bg-blue-50 text-cobalt flex-shrink-0">
                          {h.match_score}% match
                        </span>
                      )}
                      {/* Action badge */}
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 flex-shrink-0 ${actionColor[h.action] ?? 'bg-gray-100 text-gray-600'}`}>
                        <i className={`fa-solid ${actionIcon[h.action] ?? 'fa-circle'} text-xs`}></i>
                        {h.action}
                      </span>
                      {/* Time */}
                      <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:inline">{timeAgoStr}</span>
                      {/* Link to job if available */}
                      {h.match_job_id && (
                        <a href={`/creator/projects/${h.match_job_id}`}
                          className="flex-shrink-0 text-cobalt hover:text-blue-700 transition">
                          <i className="fa-solid fa-arrow-right text-sm"></i>
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : displayed.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-bolt text-cobalt text-2xl"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {filter === 'saved' ? 'No saved matches' : 'No matches yet'}
              </h3>
              <p className="text-gray-500 text-sm">
                {filter === 'saved'
                  ? 'Bookmark a match below to save it here.'
                  : 'Add more skills to your profile to improve matching.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayed.map(m => {
                const budget = formatBudget(m.budget_type, m.budget_min, m.budget_max);
                const isSaved = savedIds.has(m.id);
                const tags = [...(m.skills ?? []), ...(m.tags ?? [])];
                return (
                  <div key={m.id}
                    className="bg-white rounded-2xl border border-gray-200 p-6 hover:border-cobalt hover:shadow-md transition">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="text-lg font-bold text-gray-900">{m.title}</h3>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${matchBadgeColor(m.match_percent)}`}>
                            {m.match_percent}% Match
                          </span>
                          {m.project_type && (
                            <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">{m.project_type}</span>
                          )}
                        </div>

                        {m.client_name && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                            {m.client_avatar
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={m.client_avatar} alt={m.client_name} className="w-5 h-5 rounded-full object-cover" />
                              : <span className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs text-cobalt font-bold flex-shrink-0">{m.client_name[0]}</span>
                            }
                            <span>{m.client_name}</span>
                            {m.created_at && (
                              <><span className="text-gray-300">·</span><span className="text-gray-400 text-xs">{timeAgo(m.created_at)}</span></>
                            )}
                          </div>
                        )}

                        {m.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{m.description}</p>
                        )}

                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {tags.slice(0, 6).map(t => (
                              <span key={t} className="px-2.5 py-1 bg-blue-50 text-cobalt text-xs font-medium rounded-lg">{t}</span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-5 text-sm text-gray-500">
                          {budget && (
                            <span><i className="fa-solid fa-dollar-sign mr-1 text-gray-400"></i>{budget}</span>
                          )}
                          {m.roles_open != null && m.roles_open > 0 && (
                            <span><i className="fa-solid fa-users mr-1 text-gray-400"></i>{m.roles_open} role{m.roles_open !== 1 ? 's' : ''} open</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                      <Link
                        href={`/creator/projects/${m.id}/apply`}
                        onClick={() => {
                          smartConnect.recordHistory({
                            match_title: m.title,
                            match_subtitle: m.tags?.[0],
                            match_score: m.match_percent,
                            match_job_id: m.id,
                            action: 'applied',
                          }).catch(() => {});
                        }}
                        className="flex-1 px-5 py-2.5 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition text-center">
                        <i className="fa-solid fa-paper-plane mr-2"></i>Apply Now
                      </Link>
                      <Link href={`/creator/projects/${m.id}/detail`}
                        className="px-5 py-2.5 border border-cobalt text-cobalt rounded-xl text-sm font-semibold hover:bg-blue-50 transition">
                        View Details
                      </Link>
                      <button onClick={() => toggleSave(m.id)}
                        className={`p-2.5 rounded-xl transition ${
                          isSaved ? 'text-cobalt bg-blue-50' : 'text-gray-400 hover:text-cobalt hover:bg-gray-50'
                        }`}
                        title={isSaved ? 'Remove from saved' : 'Save match'}>
                        <i className={`fa-${isSaved ? 'solid' : 'regular'} fa-bookmark text-lg`}></i>
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
