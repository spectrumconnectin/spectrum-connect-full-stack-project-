'use client';

import { useEffect, useState } from 'react';
import { portfolioBuilder, dashboard, type PortfolioAnalytics } from '@/lib/api';

// Deliberately does NOT show "Search Appearances" (no backing field anywhere
// in the API) or a 7-day per-day view chart (no time-series endpoint exists)
// — both appear in the design mockup but have no real data behind them.
// Every tile here maps to a real field.
export default function CreatorAnalyticsPage() {
  const [data, setData] = useState<PortfolioAnalytics | null>(null);
  const [responseHours, setResponseHours] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      portfolioBuilder.getAnalytics(),
      dashboard.getCreator(),
    ]).then(([analyticsRes, dashRes]) => {
      if (cancelled) return;
      if (analyticsRes.status === 'fulfilled') setData(analyticsRes.value);
      if (dashRes.status === 'fulfilled') setResponseHours(dashRes.value.stats?.response_time_hours ?? null);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const formatResponse = (hrs: number | null) => {
    if (!hrs || hrs <= 0) return '—';
    if (hrs < 1) return '< 1h';
    if (hrs < 24) return `~${Math.round(hrs)}h`;
    return `~${Math.round(hrs / 24)}d`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Loading analytics…</p>
      </div>
    );
  }

  const tiles = [
    { label: 'Profile Views', value: (data?.total_views ?? 0).toLocaleString(), sub: `${(data?.this_week_views ?? 0).toLocaleString()} this week` },
    { label: 'Contact Clicks', value: (data?.contact_clicks ?? 0).toLocaleString() },
    { label: 'Conversations Started', value: (data?.conversations_started ?? 0).toLocaleString() },
    { label: 'Avg. Response Time', value: formatResponse(responseHours) },
  ];

  return (
    <>
      <section className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">How clients are finding and engaging with your profile.</p>
      </section>

      <div className="grid grid-cols-2 gap-3 mb-5">
        {tiles.map(t => (
          <div key={t.label} className="bg-white rounded-[16px] p-4 shadow-[0_1px_2px_rgba(15,23,42,.05)]">
            <div className="text-[11.5px] text-gray-400 font-semibold mb-1.5">{t.label}</div>
            <div className="text-[22px] font-extrabold text-gray-900">{t.value}</div>
            {t.sub && <div className="text-[11.5px] text-emerald-600 font-bold mt-0.5">{t.sub}</div>}
          </div>
        ))}
      </div>

      {(data?.total_views ?? 0) > 0 && (
        <div className="flex items-center justify-between bg-white rounded-[16px] px-4 py-3.5 mb-5 shadow-[0_1px_2px_rgba(15,23,42,.05)]">
          <span className="text-[13px] font-semibold text-gray-500">Profile → message conversion</span>
          <span className="text-[15px] font-extrabold text-gray-900">{data?.conversion_rate}%</span>
        </div>
      )}

      <div className="bg-white rounded-[18px] p-[18px] shadow-[0_1px_2px_rgba(15,23,42,.05)]">
        <div className="text-[13.5px] font-bold text-gray-900 mb-3.5">Top content</div>
        {data?.top_projects && data.top_projects.length > 0 ? (
          <ul className="flex flex-col gap-2.5">
            {data.top_projects.map((p, i) => (
              <li key={i} className="flex items-center justify-between gap-3">
                <span className="text-[13.5px] text-gray-700 truncate">{p.title}</span>
                <span className="text-[13px] font-bold text-gray-400 flex-shrink-0">{p.view_count.toLocaleString()} views</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-gray-400">No portfolio views yet — publish a project to start tracking views.</p>
        )}
      </div>
    </>
  );
}
