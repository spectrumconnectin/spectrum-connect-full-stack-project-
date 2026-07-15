'use client';

import { useState } from 'react';

/** Weekly-digest email capture. Stores nothing server-side yet — shows a local
 *  confirmation. Wire to a list provider (Brevo/Mailchimp) when ready. */
export default function DigestSignup() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return;
    setDone(true);
  };

  return (
    <div id="digest" className="rounded-2xl p-6 shadow-sm text-white" style={{ background: 'linear-gradient(150deg,#1d4ed8,#4f46e5 60%,#6d28d9)' }}>
      <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center mb-3">
        <i className="fa-regular fa-envelope text-white" />
      </div>
      <h3 className="font-extrabold text-lg leading-tight">Stay in the loop</h3>
      {done ? (
        <p className="text-sm text-blue-100 leading-relaxed mt-2">
          <i className="fa-solid fa-circle-check mr-1.5" />You&apos;re on the list — look out for our next issue.
        </p>
      ) : (
        <>
          <p className="text-sm text-blue-100 leading-relaxed mt-1.5 mb-4">
            Get the best articles on collaboration, freelancing, and creativity — delivered weekly.
          </p>
          <form onSubmit={submit} className="space-y-2.5">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/15 border border-white/25 text-white placeholder-blue-200 text-sm focus:outline-none focus:bg-white/20 focus:border-white/40 transition" />
            <button type="submit"
              className="w-full py-2.5 rounded-xl bg-white text-cobalt font-bold text-sm hover:bg-blue-50 active:scale-[0.99] transition">
              Subscribe Free
            </button>
          </form>
          <p className="text-[11px] text-blue-200 mt-3 text-center">No spam. Unsubscribe anytime.</p>
        </>
      )}
    </div>
  );
}
