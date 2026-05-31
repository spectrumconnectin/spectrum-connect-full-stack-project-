'use client';

import { useEffect, useState } from 'react';
import { etfPoints, type EtfLevelInfo, type EtfLevelName } from '@/lib/api';

// Visual styling per level. Kept in the component so the badge stays
// consistent everywhere it's rendered (dashboards, cards, profiles).
const LEVEL_STYLE: Record<EtfLevelName, { chip: string; icon: string; label: string }> = {
  bronze: {
    chip: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: 'fa-medal text-amber-600',
    label: 'Bronze',
  },
  silver: {
    chip: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: 'fa-medal text-gray-500',
    label: 'Silver',
  },
  gold: {
    chip: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    icon: 'fa-award text-yellow-600',
    label: 'Gold',
  },
  platinum: {
    chip: 'bg-violet-50 text-violet-800 border-violet-200',
    icon: 'fa-trophy text-violet-600',
    label: 'Platinum',
  },
};

export interface EtfBadgeProps {
  /** Pass a pre-fetched level (e.g. from a Smart Connect card payload). */
  level?: EtfLevelInfo;
  /** Or fetch by user ID — the badge endpoint is public and cacheable. */
  userId?: string;
  /** Compact pill (default) or larger chip with the label. */
  size?: 'xs' | 'sm' | 'md';
  /** Optional className for the wrapper chip. */
  className?: string;
  /** Hide the label and just show the icon. */
  iconOnly?: boolean;
}

/**
 * EtfBadge — visual chip for a user's ETF level.
 *
 * Renders bronze/silver/gold/platinum with the appropriate Font Awesome
 * icon and color. **Never** renders a USD value — Spectrum ETF Points are
 * shown as points, levels, and progress only.
 */
export default function EtfBadge({
  level,
  userId,
  size = 'sm',
  className = '',
  iconOnly = false,
}: EtfBadgeProps) {
  const [resolved, setResolved] = useState<EtfLevelInfo | null>(level ?? null);

  useEffect(() => {
    if (level || !userId) return;
    let cancelled = false;
    etfPoints
      .badge(userId)
      .then(info => { if (!cancelled) setResolved(info); })
      .catch(() => { /* swallow — badge is decorative */ });
    return () => { cancelled = true; };
  }, [userId, level]);

  if (!resolved) return null;

  const style = LEVEL_STYLE[resolved.name] ?? LEVEL_STYLE.bronze;
  const sizeClass =
    size === 'xs' ? 'text-[10px] px-1.5 py-0.5 gap-1'
    : size === 'md' ? 'text-sm px-3 py-1.5 gap-1.5'
    : 'text-xs px-2 py-1 gap-1';

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${style.chip} ${sizeClass} ${className}`}
      title={`ETF ${style.label}`}
    >
      <i className={`fa-solid ${style.icon}`}></i>
      {!iconOnly && <span>{style.label}</span>}
    </span>
  );
}
