'use client';

import { useCallback, useEffect, useState } from 'react';
import { portfolioBuilder, type PortfolioAnalytics } from '@/lib/api';

/** Owner-facing view analytics — total views, this week, and top projects. */
export default function PortfolioAnalyticsWidget({ refreshKey = 0 }: { refreshKey?: number }) {
  const [data, setData] = useState<PortfolioAnalytics | null>(null);

  const load = useCallback(() => {
    portfolioBuilder.getAnalytics().then(setData).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  if (!data) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-4">Portfolio analytics</h3>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-blue-50/60 rounded-xl p-3.5">
          <p className="text-2xl font-extrabold text-gray-900 leading-none">{data.total_views.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1.5 font-semibold">Total views</p>
        </div>
        <div className="bg-emerald-50/60 rounded-xl p-3.5">
          <p className="text-2xl font-extrabold text-gray-900 leading-none">{data.this_week_views.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1.5 font-semibold">This week</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-amber-50/60 rounded-xl p-3.5">
          <p className="text-2xl font-extrabold text-gray-900 leading-none">{data.contact_clicks.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1.5 font-semibold">Contact clicks</p>
        </div>
        <div className="bg-violet-50/60 rounded-xl p-3.5">
          <p className="text-2xl font-extrabold text-gray-900 leading-none">{data.conversations_started.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1.5 font-semibold">Conversations</p>
        </div>
      </div>

      {data.total_views > 0 && (
        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3.5 py-2.5 mb-4">
          <span className="text-xs font-semibold text-gray-500">Portfolio → message conversion</span>
          <span className="text-sm font-extrabold text-gray-900">{data.conversion_rate}%</span>
        </div>
      )}

      {data.top_projects.length > 0 ? (
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2.5">Top projects</p>
          <ul className="space-y-2">
            {data.top_projects.map((p, i) => (
              <li key={i} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-gray-700 truncate">{p.title}</span>
                <span className="text-gray-400 font-semibold flex-shrink-0">{p.view_count.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-gray-400 border-t border-gray-100 pt-4">
          No views yet — share your portfolio link to start tracking.
        </p>
      )}
    </div>
  );
}
