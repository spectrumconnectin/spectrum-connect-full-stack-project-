'use client';

import { useEffect } from 'react';
import { portfolioBuilder } from '@/lib/api';

const DEDUPE_HOURS = 6; // one counted view per reader per portfolio/project within this window

/** Invisible — records one view per real reader (deduped via localStorage,
 * same pattern as the blog's view counter). Portfolio view counts are
 * owner-only analytics, never shown publicly, so this renders nothing. */
export default function ViewBeacon({ username, projectSlug }: { username: string; projectSlug?: string }) {
  useEffect(() => {
    const key = `sc_pf_viewed_${username}${projectSlug ? `_${projectSlug}` : ''}`;
    let recent = false;
    try {
      const ts = Number(localStorage.getItem(key) || 0);
      recent = Date.now() - ts < DEDUPE_HOURS * 3600_000;
    } catch { /* ignore */ }

    if (recent) return;

    portfolioBuilder.recordView(username, projectSlug)
      .then(() => { try { localStorage.setItem(key, String(Date.now())); } catch { /* ignore */ } })
      .catch(() => { /* best-effort */ });
  }, [username, projectSlug]);

  return null;
}
