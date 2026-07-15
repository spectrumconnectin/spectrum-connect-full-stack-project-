'use client';

import { useEffect, useState } from 'react';
import { blogPublic } from '@/lib/api';
import { formatViews } from '@/lib/blog';

const DEDUPE_HOURS = 6; // one counted view per reader per post within this window

/**
 * Shows a post's view count and records one view per real reader. The count is
 * deduped per browser via localStorage so a refresh doesn't inflate it. Starts
 * from the server-rendered `initial` count and updates to the fresh total after
 * the beacon returns.
 */
export default function ViewCounter({ slug, initial = 0 }: { slug: string; initial?: number }) {
  const [views, setViews] = useState(initial);

  useEffect(() => {
    const key = `sc_viewed_${slug}`;
    let recent = false;
    try {
      const ts = Number(localStorage.getItem(key) || 0);
      recent = Date.now() - ts < DEDUPE_HOURS * 3600_000;
    } catch { /* ignore */ }

    if (recent) return; // already counted this reader recently — just show the number

    blogPublic.countView(slug)
      .then(r => {
        if (r?.ok && typeof r.views === 'number') setViews(r.views);
        try { localStorage.setItem(key, String(Date.now())); } catch { /* ignore */ }
      })
      .catch(() => { /* best-effort */ });
  }, [slug]);

  return (
    <span className="text-xs text-gray-400 flex items-center gap-1.5" title={`${views.toLocaleString()} views`}>
      <i className="fa-regular fa-eye" />
      {formatViews(views)} view{views === 1 ? '' : 's'}
    </span>
  );
}
