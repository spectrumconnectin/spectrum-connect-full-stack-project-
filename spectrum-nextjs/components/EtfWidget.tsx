'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { etfPoints, type EtfBalance } from '@/lib/api';
import EtfBadge from './EtfBadge';

export interface EtfWidgetProps {
  /** Where the "View details" link should go (creator vs client ETF page). */
  href: string;
}

/**
 * Compact ETF dashboard widget.
 *
 * Shows balance, level chip, and progress to the next tier. **Never**
 * displays a USD value — points and levels only.
 */
export default function EtfWidget({ href }: EtfWidgetProps) {
  const [data, setData] = useState<EtfBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    etfPoints.me()
      .then(d => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div className="h-4 w-24 bg-gray-100 rounded animate-pulse mb-3" />
        <div className="h-8 w-32 bg-gray-100 rounded animate-pulse mb-4" />
        <div className="h-2 w-full bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-700">ETF Points</div>
          <i className="fa-solid fa-medal text-cobalt"></i>
        </div>
        <p className="text-xs text-gray-400 mt-2">Earn ETF Points by using Spectrum Connect.</p>
      </div>
    );
  }

  const { balance, level } = data;
  const nextLabel = level.next_min_points
    ? `${level.next_min_points - data.lifetime_points} pts to next level`
    : "You're at the top tier";

  return (
    <Link
      href={href}
      className="block bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:border-cobalt hover:shadow-md transition"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-gray-700">ETF Points</div>
        <EtfBadge level={level} size="xs" />
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <div className="text-3xl font-bold text-gray-900 tabular-nums">
          {balance.toLocaleString('en-US')}
        </div>
        <div className="text-xs text-gray-400">points</div>
      </div>

      {/* Progress bar to next level */}
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1.5">
        <div
          className="bg-gradient-to-r from-cobalt to-blue-500 h-1.5 rounded-full transition-all"
          style={{ width: `${level.progress_pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">{nextLabel}</p>
    </Link>
  );
}
