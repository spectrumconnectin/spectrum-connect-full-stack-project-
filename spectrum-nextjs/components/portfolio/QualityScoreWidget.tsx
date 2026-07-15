'use client';

import { useCallback, useEffect, useState } from 'react';
import { portfolioBuilder, type QualityScore } from '@/lib/api';

/**
 * Portfolio quality score — score ring + actionable improvement checklist
 * (doubles as the guided setup list; suggestions come from the backend
 * scoring service so the two never disagree).
 */
export default function QualityScoreWidget({ refreshKey = 0 }: { refreshKey?: number }) {
  const [data, setData] = useState<QualityScore | null>(null);

  const load = useCallback(() => {
    portfolioBuilder.getQualityScore().then(setData).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  if (!data) return null;

  const pct = Math.max(0, Math.min(100, data.score));
  const ring = pct >= 80 ? '#10b981' : pct >= 50 ? '#2563eb' : '#f59e0b';
  const label = pct >= 80 ? 'Excellent' : pct >= 50 ? 'Good — keep going' : 'Needs work';
  const r = 34;
  const c = 2 * Math.PI * r;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-5">
        {/* Score ring */}
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
            <circle cx="40" cy="40" r={r} fill="none" stroke="#f3f4f6" strokeWidth="8" />
            <circle
              cx="40" cy="40" r={r} fill="none" stroke={ring} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-extrabold text-gray-900 leading-none">{pct}</span>
            <span className="text-[9px] text-gray-400 font-semibold uppercase">/ 100</span>
          </div>
        </div>

        <div className="min-w-0">
          <h3 className="text-sm font-bold text-gray-900">Portfolio quality</h3>
          <p className="text-xs mt-0.5 font-semibold" style={{ color: ring }}>{label}</p>
          <p className="text-xs text-gray-400 mt-1">
            Based on profile completeness, projects, reviews, and verification.
          </p>
        </div>
      </div>

      {data.suggestions.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-gray-100 pt-4">
          {data.suggestions.map((s, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
              <span className="mt-0.5 w-4 h-4 rounded-full bg-blue-50 text-cobalt flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-arrow-up text-[8px]" />
              </span>
              {s}
            </li>
          ))}
        </ul>
      )}
      {data.suggestions.length === 0 && (
        <p className="mt-4 border-t border-gray-100 pt-4 text-sm text-emerald-600 font-semibold">
          <i className="fa-solid fa-circle-check mr-1.5" />Your portfolio checks every box. Share it!
        </p>
      )}
    </div>
  );
}
