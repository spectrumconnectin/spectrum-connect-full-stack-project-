'use client';

/**
 * SetupJourney — a premium, milestone-based "getting started" tracker.
 *
 * Driven by GET /onboarding/journey (computed from the user's real data), so it
 * shows genuine progression toward first success, not a fake percentage. Each
 * incomplete step deep-links to the action. Hides itself once everything is done
 * (after a brief celebration), and can be dismissed.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { onboarding, type SetupJourney as Journey } from '@/lib/api';

const DISMISS_KEY = 'sc_journey_dismissed';

export default function SetupJourney() {
  const [data, setData] = useState<Journey | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try { if (localStorage.getItem(DISMISS_KEY) === '1') setDismissed(true); } catch {}
    onboarding.getJourney().then(setData).catch(() => {});
  }, []);

  if (dismissed || !data) return null;

  const { steps, completed_count, total, all_done, next_key } = data;
  const pct = Math.round((completed_count / total) * 100);

  // Once finished, show a celebratory state but let the user dismiss it.
  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch {}
    setDismissed(true);
  };

  return (
    <section className="mb-6 sc-journey-in">
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${all_done ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-cobalt'}`}>
              <i className={`fa-solid ${all_done ? 'fa-trophy' : 'fa-rocket'}`} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-gray-900 leading-tight">
                {all_done ? "You're all set 🎉" : 'Get started'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {all_done ? 'Your account is fully set up.' : `${completed_count} of ${total} complete · keep going`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setCollapsed(c => !c)} aria-label={collapsed ? 'Expand' : 'Collapse'}
              className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition">
              <i className={`fa-solid fa-chevron-${collapsed ? 'down' : 'up'} text-xs`} />
            </button>
            {all_done && (
              <button onClick={dismiss} aria-label="Dismiss"
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition">
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100">
          <div className={`h-full rounded-r-full transition-all duration-700 ease-out ${all_done ? 'bg-emerald-500' : 'bg-gradient-to-r from-cobalt to-blue-400'}`}
            style={{ width: `${pct}%` }} />
        </div>

        {/* Steps */}
        {!collapsed && (
          <ol className="divide-y divide-gray-50">
            {steps.map((s, idx) => {
              const isNext = s.key === next_key;
              return (
                <li key={s.key}
                  className={`flex items-center gap-3.5 px-5 py-3.5 transition-colors ${isNext ? 'bg-blue-50/40' : ''}`}>
                  {/* Status node */}
                  <div className="relative flex flex-col items-center flex-shrink-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all ${
                      s.done ? 'bg-emerald-500 text-white'
                        : isNext ? 'bg-white border-2 border-cobalt text-cobalt'
                        : 'bg-gray-100 text-gray-300 border border-gray-200'
                    }`}>
                      {s.done ? <i className="fa-solid fa-check" /> : <i className={`fa-solid ${s.icon}`} />}
                    </div>
                    {idx < steps.length - 1 && (
                      <span className={`absolute top-7 w-0.5 h-[calc(100%+0px)] ${s.done ? 'bg-emerald-200' : 'bg-gray-200'}`}
                        style={{ height: 18 }} />
                    )}
                  </div>

                  {/* Copy */}
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold leading-tight ${s.done ? 'text-gray-400 line-through decoration-gray-300' : 'text-gray-900'}`}>
                      {s.title}
                    </p>
                    {!s.done && <p className="text-xs text-gray-500 mt-0.5 leading-snug">{s.subtitle}</p>}
                  </div>

                  {/* Action */}
                  {!s.done && s.href && s.cta && (
                    <Link href={s.href}
                      className={`flex-shrink-0 text-xs font-bold px-3 py-2 rounded-lg transition active:scale-95 ${
                        isNext ? 'bg-cobalt text-white hover:bg-blue-700 shadow-sm' : 'text-cobalt hover:bg-blue-50'
                      }`}>
                      {s.cta}
                    </Link>
                  )}
                  {s.done && <span className="flex-shrink-0 text-[11px] font-semibold text-emerald-600 hidden sm:block">Done</span>}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
