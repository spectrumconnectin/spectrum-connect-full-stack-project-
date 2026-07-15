'use client';

import { useEffect, useState } from 'react';
import { pushSupported, pushPermission, isSubscribed, enablePush, disablePush } from '@/lib/push';

/** Compact toggle to enable/disable browser push notifications. Renders inside
 *  the notification dropdown. Hides itself on browsers that don't support push. */
export default function PushOptIn() {
  const [supported, setSupported] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pushSupported()) { setSupported(false); return; }
    setDenied(pushPermission() === 'denied');
    isSubscribed().then(setSubscribed).catch(() => {});
  }, []);

  if (!supported) return null;

  const toggle = async () => {
    setBusy(true);
    try {
      if (subscribed) {
        await disablePush();
        setSubscribed(false);
      } else {
        const r = await enablePush();
        if (r.ok) setSubscribed(true);
        else if (r.error === 'denied') setDenied(true);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3 bg-blue-50/50 border-b border-gray-100">
      <div className="flex items-center gap-2.5 min-w-0">
        <i className="fa-solid fa-bell text-cobalt text-sm" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-800 leading-tight">Browser notifications</p>
          <p className="text-[11px] text-gray-500 leading-tight">
            {denied
              ? 'Blocked — enable them in your browser settings'
              : subscribed
                ? 'On — you’ll be alerted when new projects are posted'
                : 'Get alerted the moment a new project is posted'}
          </p>
        </div>
      </div>
      {!denied && (
        <button
          onClick={toggle}
          disabled={busy}
          role="switch"
          aria-checked={subscribed}
          aria-label="Toggle browser notifications"
          className={`relative w-10 h-6 rounded-full transition flex-shrink-0 ${subscribed ? 'bg-cobalt' : 'bg-gray-300'} ${busy ? 'opacity-60 cursor-wait' : ''}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${subscribed ? 'left-[18px]' : 'left-0.5'}`} />
        </button>
      )}
    </div>
  );
}
