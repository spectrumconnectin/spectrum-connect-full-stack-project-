'use client';

import ContactCreatorButton from './ContactCreatorButton';

/** Mobile-only, always-on-screen contact bar — the sticky action button the
 * spec calls for so "Contact Creator" never scrolls out of reach. Hidden on
 * print and on desktop, where the hero/closing-section buttons are enough. */
export default function StickyContactBar({ username, userId }: { username: string; userId?: string }) {
  if (!userId) return null;

  return (
    <div
      data-no-print
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-6px_20px_rgba(0,0,0,0.08)]"
    >
      <ContactCreatorButton username={username} userId={userId} variant="sticky" className="w-full" />
    </div>
  );
}
