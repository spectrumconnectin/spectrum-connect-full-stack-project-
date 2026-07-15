'use client';

import { useEffect, useState } from 'react';
import { pushSupported, pushPermission, isSubscribed, enablePush } from '@/lib/push';

const DISMISS_KEY = 'sc_push_prompt_dismissed';

/**
 * A premium prompt card inviting creators to turn on browser notifications so
 * they're alerted the instant a new project is posted. Self-manages visibility:
 * hides on unsupported browsers, when already subscribed, when blocked, or once
 * dismissed. Place near the top of the dashboard / find-projects pages.
 */
export default function PushPromptCard({ forceShow = false }: { forceShow?: boolean }) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (forceShow) { setShow(true); return; }
    if (!pushSupported()) return;
    if (pushPermission() === 'denied') return;
    let dismissed = false;
    try { dismissed = localStorage.getItem(DISMISS_KEY) === '1'; } catch {}
    if (dismissed) return;
    isSubscribed().then(sub => { if (!sub) setShow(true); }).catch(() => {});
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch {}
    setShow(false);
  };

  const turnOn = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await enablePush();
      if (r.ok) {
        setDone(true);
        try { localStorage.setItem(DISMISS_KEY, '1'); } catch {}
        setTimeout(() => setShow(false), 2600);
      } else if (r.error === 'denied') {
        setError('Notifications are blocked. Enable them in your browser’s site settings.');
      } else if (r.error === 'unsupported' || r.error === 'server-disabled') {
        setShow(false);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  if (!show) return null;

  return (
    <div
      className="relative overflow-hidden rounded-2xl text-white shadow-lg mb-6"
      style={{ background: 'linear-gradient(130deg,#1d4ed8 0%,#4f46e5 55%,#6d28d9 100%)' }}
    >
      {/* soft glow accents */}
      <div className="absolute inset-0 opacity-25 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 12% 20%, #ffffff66, transparent 42%), radial-gradient(circle at 88% 120%, #ffffff44, transparent 45%)' }} />

      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-3 right-3 w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/15 flex items-center justify-center transition z-10"
      >
        <i className="fa-solid fa-xmark" />
      </button>

      <div className="relative flex items-center gap-4 sm:gap-5 p-5 sm:p-6">
        {/* Icon */}
        <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-white/15 border border-white/25 items-center justify-center flex-shrink-0">
          <i className={`fa-solid ${done ? 'fa-circle-check' : 'fa-bell'} text-2xl`} />
        </div>

        <div className="min-w-0 flex-1">
          {done ? (
            <>
              <p className="font-extrabold text-lg leading-tight">You’re all set! 🎉</p>
              <p className="text-sm text-blue-100 mt-1 leading-relaxed">
                We’ll ping this device the moment a new project is posted.
              </p>
            </>
          ) : (
            <>
              <p className="font-extrabold text-lg leading-tight flex items-center gap-2">
                <i className="fa-solid fa-bell sm:hidden" /> Never miss a new project
              </p>
              <p className="text-sm text-blue-100 mt-1 leading-relaxed max-w-xl">
                Turn on browser notifications and get alerted the instant a client posts a
                project that fits you — even when this tab is closed.
              </p>
              {error && <p className="text-xs text-amber-200 mt-2">{error}</p>}
            </>
          )}
        </div>

        {!done && (
          <button
            onClick={turnOn}
            disabled={busy}
            className="flex-shrink-0 inline-flex items-center gap-2 bg-white text-cobalt font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-50 active:scale-[0.98] transition disabled:opacity-70 shadow-sm"
          >
            {busy
              ? <><i className="fa-solid fa-circle-notch animate-spin" /> Enabling…</>
              : <><i className="fa-solid fa-bell" /> Turn on notifications</>}
          </button>
        )}
      </div>
    </div>
  );
}
