'use client';

// Client-side ETF page. Identical structure to the creator page (same
// /etf/me endpoint, same widgets) — kept as a separate route so future
// client-specific copy or rewards can diverge without affecting creators.

import { useEffect, useState } from 'react';
import { etfPoints, type EtfBalance, type EtfEvent, type EtfCashoutEligibility } from '@/lib/api';
import EtfBadge from '@/components/EtfBadge';

const ACTION_META: Record<string, { label: string; icon: string; color?: string }> = {
  'project.posted':                 { label: 'Posted a project',            icon: 'fa-bullhorn',             color: 'text-cobalt' },
  'project.hired':                  { label: 'Hired a creator',             icon: 'fa-handshake',            color: 'text-cobalt' },
  'milestone.funded':               { label: 'Funded a milestone',          icon: 'fa-lock',                 color: 'text-cobalt' },
  'milestone.released.client':      { label: 'Released milestone payment',  icon: 'fa-unlock',               color: 'text-emerald-600' },
  'milestone.released.creator':     { label: 'Milestone payment received',  icon: 'fa-flag-checkered',       color: 'text-emerald-600' },
  'project.completed.client':       { label: 'Project completed',           icon: 'fa-check-double',         color: 'text-emerald-600' },
  'project.completed.creator':      { label: 'Project completed',           icon: 'fa-trophy',               color: 'text-amber-500' },
  'on_time_delivery':               { label: 'On-time delivery bonus',      icon: 'fa-clock',                color: 'text-amber-500' },
  'positive_review':                { label: 'Positive review bonus',       icon: 'fa-star',                 color: 'text-amber-400' },
  'review.submitted':               { label: 'Left a review',               icon: 'fa-pen-to-square',        color: 'text-blue-500' },
  'review.given':                   { label: 'Left a review',               icon: 'fa-pen-to-square',        color: 'text-blue-500' },
  'repeat_client.bonus':            { label: 'Repeat creator bonus',        icon: 'fa-rotate-right',         color: 'text-purple-500' },
  'platform.activity':              { label: 'Platform engagement',         icon: 'fa-bolt',                 color: 'text-sky-500' },
  'profile.verified':               { label: 'Profile verified',            icon: 'fa-shield-halved',        color: 'text-green-600' },
  'cashout.requested':              { label: 'Cash-out requested',          icon: 'fa-arrow-right-from-bracket', color: 'text-gray-500' },
};

function actionMeta(action: string) {
  return ACTION_META[action] ?? { label: action.replace(/\./g, ' '), icon: 'fa-medal' };
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ClientEtfPage() {
  const [balance, setBalance] = useState<EtfBalance | null>(null);
  const [events, setEvents] = useState<EtfEvent[]>([]);
  const [cashout, setCashout] = useState<EtfCashoutEligibility | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      etfPoints.me(),
      etfPoints.events({ limit: 30 }),
      etfPoints.cashoutEligibility(),
    ]).then(([balRes, evRes, coRes]) => {
      if (cancelled) return;
      if (balRes.status === 'fulfilled') setBalance(balRes.value);
      if (evRes.status === 'fulfilled') setEvents(evRes.value.events);
      if (coRes.status === 'fulfilled') setCashout(coRes.value);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Loading your ETF…</p>
      </div>
    );
  }

  const level = balance?.level;
  const pointsToNext = level?.next_min_points
    ? level.next_min_points - (balance?.lifetime_points ?? 0)
    : 0;

  return (
    <>
      <section className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
          <h1 className="text-4xl font-bold text-gray-900">ETF — Earn Trust</h1>
          {level && <EtfBadge level={level} size="md" />}
        </div>
        <p className="text-gray-600">
          You earn ETF Points for posting projects, hiring creators, releasing milestones, and
          completing work on Spectrum Connect — the more you collaborate inside the platform,
          the higher your trust level.
        </p>
      </section>

      <section className="grid lg:grid-cols-3 gap-5 mb-8">
        <div className="bg-gradient-to-br from-cobalt via-blue-600 to-blue-500 text-white rounded-3xl p-8 shadow-xl">
          <p className="text-blue-200 text-sm font-semibold uppercase tracking-widest mb-3">
            Current balance
          </p>
          <div className="flex items-baseline gap-3 mb-2">
            <div className="text-5xl font-bold tabular-nums">
              {(balance?.balance ?? 0).toLocaleString('en-US')}
            </div>
            <div className="text-blue-200 text-base">ETF Points</div>
          </div>
          <p className="text-blue-100 text-sm">
            Lifetime: {(balance?.lifetime_points ?? 0).toLocaleString('en-US')} pts earned
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-3">
            Current level
          </p>
          {level && (
            <>
              <div className="flex items-center gap-3 mb-3">
                <i className={`fa-solid ${level.icon} text-3xl`} style={{ color: level.color }}></i>
                <div className="text-3xl font-bold text-gray-900">{level.label}</div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                <div
                  className="bg-gradient-to-r from-cobalt to-blue-500 h-2 rounded-full"
                  style={{ width: `${level.progress_pct}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">
                {level.next_min_points
                  ? `${pointsToNext.toLocaleString('en-US')} pts to next level`
                  : 'You\'ve reached the top tier'}
              </p>
            </>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-3">
            Cash-out
          </p>
          {cashout?.eligible ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <i className="fa-solid fa-circle-check text-green-500 text-xl"></i>
                <div className="text-lg font-semibold text-gray-900">Eligible</div>
              </div>
              <p className="text-sm text-gray-500">
                You can request a cash-out from your balance.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <i className="fa-solid fa-hourglass-half text-gray-400 text-xl"></i>
                <div className="text-lg font-semibold text-gray-900">Not yet eligible</div>
              </div>
              <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
                {(cashout?.reasons ?? ['Keep being active on Spectrum Connect.']).map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      {/* Level Benefits */}
      <section className="bg-white rounded-3xl border border-gray-200 p-8 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-2">What you unlock at each level</h2>
        <p className="text-sm text-gray-600 mb-6">Higher ETF levels make you a more trusted client — giving you access to top-ranked creators faster.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              level: 'Bronze', icon: 'fa-medal', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200',
              perks: ['Platform access', 'Post projects', 'Standard creator visibility', 'Basic Smart Connect'],
            },
            {
              level: 'Silver', icon: 'fa-medal', color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200',
              perks: ['Silver trust badge', 'Better creator matching', 'Priority escrow support', 'Repeat creator bonus active'],
            },
            {
              level: 'Gold', icon: 'fa-crown', color: 'text-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-200',
              perks: ['Gold trust badge', 'Top Smart Connect results', 'Priority dispute resolution', 'Featured client status'],
            },
            {
              level: 'Platinum', icon: 'fa-gem', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200',
              perks: ['Platinum badge', 'Cash-out eligible', 'Maximum platform visibility', 'Early access to new features'],
            },
          ].map(({ level, icon, color, bg, border, perks }) => (
            <div key={level} className={`rounded-2xl border ${border} ${bg} p-5`}>
              <div className="flex items-center gap-2 mb-3">
                <i className={`fa-solid ${icon} text-xl ${color}`}></i>
                <span className={`font-bold text-base ${color}`}>{level}</span>
              </div>
              <ul className="space-y-2">
                {perks.map(p => (
                  <li key={p} className="flex items-start gap-2 text-xs text-gray-700">
                    <i className="fa-solid fa-check text-emerald-500 mt-0.5 flex-shrink-0"></i>{p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-3xl border border-gray-200 p-8 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-2">How you earn ETF Points</h2>
        <p className="text-sm text-gray-600 mb-6">
          Genuine, on-platform activity is rewarded. Self-jobs, fake projects, and duplicate
          accounts never earn points.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { icon: 'fa-bullhorn',       label: 'Post a project',        pts: '+5' },
            { icon: 'fa-handshake',      label: 'Hire a creator',        pts: '+20' },
            { icon: 'fa-lock',           label: 'Fund a milestone',      pts: '+10' },
            { icon: 'fa-unlock',         label: 'Release payment',       pts: '+15' },
            { icon: 'fa-check-double',   label: 'Complete a project',    pts: '+50' },
            { icon: 'fa-star',           label: 'Leave a review',        pts: '+15' },
          ].map(it => (
            <div key={it.label} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-cobalt flex items-center justify-center flex-shrink-0">
                  <i className={`fa-solid ${it.icon}`}></i>
                </div>
                <span className="text-sm font-medium text-gray-800">{it.label}</span>
              </div>
              <span className="text-xs font-bold text-emerald-600 flex-shrink-0 ml-2">{it.pts}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-3xl border border-gray-200 overflow-hidden">
        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Recent activity</h2>
          <span className="text-xs text-gray-400">{events.length} events</span>
        </div>
        {events.length === 0 ? (
          <div className="p-16 text-center">
            <i className="fa-solid fa-medal text-4xl text-gray-300 mb-4 block"></i>
            <h3 className="font-semibold text-gray-600 mb-1">No activity yet</h3>
            <p className="text-sm text-gray-400">
              Your first ETF Points will appear here once you take an action on Spectrum Connect.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {events.map(ev => {
              const meta = actionMeta(ev.action);
              const positive = ev.points >= 0;
              return (
                <li key={ev.id} className="flex items-center gap-4 px-8 py-4 hover:bg-gray-50 transition">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${positive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    <i className={`fa-solid ${meta.icon}`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{meta.label}</p>
                    <p className="text-xs text-gray-400 truncate">{ev.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold tabular-nums ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {positive ? '+' : ''}{ev.points} pts
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(ev.created_at)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
