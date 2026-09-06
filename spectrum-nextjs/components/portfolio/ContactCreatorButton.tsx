'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, portfolioBuilder } from '@/lib/api';
import { setContactIntent } from '@/lib/contactIntent';

const DEFAULT_MESSAGE = 'Hello, I found your portfolio on Spectrum Connect and would like to discuss a project.';

type Variant = 'hero' | 'section' | 'sticky';

const VARIANT_CLASS: Record<Variant, string> = {
  hero: 'px-6 py-3 rounded-xl text-sm shadow-sm hover:shadow-md',
  section: 'px-7 py-3 rounded-xl text-sm shadow-sm',
  sticky: 'w-full px-5 py-3.5 rounded-xl text-[15px] shadow-lg shadow-cobalt/20',
};

/**
 * The portfolio's primary CTA. Every placement (hero, closing section, mobile
 * sticky bar) renders this so click tracking and the logged-out resume flow
 * only exist in one place.
 */
export default function ContactCreatorButton({
  username, userId, variant = 'hero', className = '',
}: { username: string; userId?: string; variant?: Variant; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!userId) return null;

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    portfolioBuilder.recordContactClick(username).catch(() => { /* best-effort */ });

    try {
      const me = await auth.me();
      const dashboard = (me.account_type === 'producer' || me.account_type === 'both') ? 'client' : 'creator';
      const qs = new URLSearchParams({ userId, msg: DEFAULT_MESSAGE, source: 'portfolio' });
      router.push(`/${dashboard}/messaging?${qs.toString()}`);
    } catch {
      setContactIntent({ userId, message: DEFAULT_MESSAGE });
      router.push('/login?next=contact');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={`inline-flex items-center justify-center gap-2 bg-cobalt text-white font-bold hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-60 ${VARIANT_CLASS[variant]} ${className}`}
    >
      <i className={`fa-regular ${busy ? 'fa-circle-notch animate-spin' : 'fa-paper-plane'}`} />
      Contact Creator
    </button>
  );
}
