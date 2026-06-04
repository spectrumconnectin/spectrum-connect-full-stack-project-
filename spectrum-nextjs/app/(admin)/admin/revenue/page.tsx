'use client';

import { useState, useEffect } from 'react';
import { adminApi, type AdminRevenueStats, type AdminRevenueMonth } from '@/lib/api';

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function MonthLabel({ m }: { m: string }) {
  const [y, mo] = m.split('-');
  const label = new Date(Number(y), Number(mo) - 1).toLocaleString('en-US', { month: 'short', year: '2-digit' });
  return <span>{label}</span>;
}

function RevenueBarChart({ data }: { data: AdminRevenueMonth[] }) {
  const maxFee = Math.max(...data.map(d => d.total_fees), 1);
  return (
    <div className="flex items-end justify-between gap-2 h-44 mt-4">
      {data.map(d => {
        const clientH = Math.max((d.client_fees / maxFee) * 152, d.client_fees > 0 ? 3 : 0);
        const creatorH = Math.max((d.creator_fees / maxFee) * 152, d.creator_fees > 0 ? 3 : 0);
        return (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1 group relative">
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-2.5 py-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10 border border-gray-700">
              <p className="font-bold mb-0.5"><MonthLabel m={d.month} /></p>
              <p className="text-blue-300">Client fees: ${fmt(d.client_fees)}</p>
              <p className="text-emerald-300">Creator fees: ${fmt(d.creator_fees)}</p>
              <p className="text-gray-400">Volume: ${fmt(d.volume)}</p>
              <p className="text-gray-400">{d.count} transactions</p>
            </div>

            {/* Stacked bars */}
            <div className="w-full flex flex-col-reverse items-stretch justify-start" style={{ height: 152 }}>
              <div className="w-full bg-blue-500 rounded-b-sm transition-all duration-500" style={{ height: clientH }} />
              <div className="w-full bg-emerald-500 rounded-t-sm transition-all duration-500" style={{ height: creatorH }} />
            </div>

            <MonthLabel m={d.month} />
          </div>
        );
      })}
    </div>
  );
}

function RevenueCard({ label, value, sub, icon, accent }: { label: string; value: string; sub?: string; icon: string; accent: string }) {
  return (
    <div className={`bg-gray-800 rounded-2xl p-5 border border-gray-700 relative overflow-hidden`}>
      <div className={`absolute top-0 right-0 w-24 h-24 ${accent} rounded-full opacity-10 blur-2xl pointer-events-none`} />
      <div className={`w-10 h-10 ${accent} bg-opacity-20 rounded-xl flex items-center justify-center mb-4`}>
        <i className={`fa-solid ${icon} text-white text-sm`} />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-gray-300 font-medium mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminRevenuePage() {
  const [data, setData] = useState<AdminRevenueStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getRevenue().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <i className="fa-solid fa-spinner fa-spin mr-3" /> Loading revenue data…
    </div>
  );

  if (!data) return (
    <div className="bg-gray-800 rounded-2xl p-8 text-center text-gray-400 border border-gray-700">
      <i className="fa-solid fa-triangle-exclamation text-2xl mb-3 block text-amber-400" />
      Could not load revenue data.
    </div>
  );

  const { totals, monthly, top_projects, commission_info } = data;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Revenue & Platform Fees</h2>
        <p className="text-sm text-gray-400">
          Commission model: <span className="text-white font-semibold">{commission_info.version}</span>
          {' — '}Client pays +{commission_info.client_rate_pct}% · Creator receives amount −{commission_info.creator_rate_pct}%
        </p>
      </div>

      {/* Totals */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">All-Time Totals</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <RevenueCard
            label="Platform Revenue"
            value={`$${fmt(totals.platform_total)}`}
            sub={`${totals.transaction_count} paid transactions`}
            icon="fa-chart-pie"
            accent="bg-indigo-500"
          />
          <RevenueCard
            label="Client Fees Collected"
            value={`$${fmt(totals.client_fees)}`}
            sub={`${commission_info.client_rate_pct}% on each project`}
            icon="fa-building"
            accent="bg-blue-500"
          />
          <RevenueCard
            label="Creator Fees Collected"
            value={`$${fmt(totals.creator_fees)}`}
            sub={`${commission_info.creator_rate_pct}% on each payout`}
            icon="fa-palette"
            accent="bg-emerald-500"
          />
          <RevenueCard
            label="Total Project Volume"
            value={`$${fmt(totals.volume)}`}
            sub="Sum of all project amounts"
            icon="fa-dollar-sign"
            accent="bg-amber-500"
          />
        </div>
      </div>

      {/* Fee split visual */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Fee Split Breakdown</h3>
        {totals.platform_total > 0 ? (
          <div className="space-y-4">
            {/* Client bar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-400 flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 bg-blue-500 rounded-sm"></span>
                  Client Fees (4%)
                </span>
                <span className="text-xs font-bold text-white">${fmt(totals.client_fees)}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div className="bg-blue-500 h-3 rounded-full transition-all duration-700"
                  style={{ width: `${(totals.client_fees / totals.platform_total * 100).toFixed(1)}%` }} />
              </div>
            </div>
            {/* Creator bar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-400 flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span>
                  Creator Fees (8%)
                </span>
                <span className="text-xs font-bold text-white">${fmt(totals.creator_fees)}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div className="bg-emerald-500 h-3 rounded-full transition-all duration-700"
                  style={{ width: `${(totals.creator_fees / totals.platform_total * 100).toFixed(1)}%` }} />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center py-4">No completed transactions yet.</p>
        )}
      </div>

      {/* Monthly chart */}
      {monthly.length > 0 && (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-300">Monthly Revenue</h3>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span>Creator fees
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 bg-blue-500 rounded-sm"></span>Client fees
              </span>
            </div>
          </div>
          <RevenueBarChart data={monthly} />

          {/* Monthly table */}
          <div className="mt-6 border border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-750 border-b border-gray-700">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Month</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Volume</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Client Fee (4%)</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Creator Fee (8%)</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Revenue</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Txns</th>
                </tr>
              </thead>
              <tbody>
                {[...monthly].reverse().map(m => (
                  <tr key={m.month} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition">
                    <td className="px-4 py-3 text-white font-medium"><MonthLabel m={m.month} /></td>
                    <td className="px-4 py-3 text-right text-gray-300">${fmt(m.volume)}</td>
                    <td className="px-4 py-3 text-right text-blue-400">${fmt(m.client_fees)}</td>
                    <td className="px-4 py-3 text-right text-emerald-400">${fmt(m.creator_fees)}</td>
                    <td className="px-4 py-3 text-right text-white font-bold">${fmt(m.total_fees)}</td>
                    <td className="px-4 py-3 text-right text-gray-400">{m.count}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-700/40 border-t border-gray-600">
                  <td className="px-4 py-3 font-bold text-white">Total</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-200">${fmt(totals.volume)}</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-300">${fmt(totals.client_fees)}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-300">${fmt(totals.creator_fees)}</td>
                  <td className="px-4 py-3 text-right font-bold text-white">${fmt(totals.platform_total)}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-300">{totals.transaction_count}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Top projects */}
      {top_projects.length > 0 && (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Top Projects by Revenue</h3>
          <div className="space-y-2">
            {top_projects.map((p, i) => (
              <div key={p.id} className="flex items-center gap-4 bg-gray-750 border border-gray-700/50 rounded-xl px-4 py-3 hover:border-gray-600 transition">
                <span className="text-sm font-bold text-gray-500 w-5 flex-shrink-0">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400">
                    Project Amount: <span className="text-white font-semibold">${fmt(p.amount)}</span>
                  </p>
                  {p.created_at && (
                    <p className="text-[10px] text-gray-600 mt-0.5">{fmtDate(p.created_at)}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-blue-400">+${fmt(p.client_fee)}<span className="text-gray-600 ml-0.5">client</span></span>
                    <span className="text-emerald-400">+${fmt(p.creator_fee)}<span className="text-gray-600 ml-0.5">creator</span></span>
                    <span className="text-white font-bold">${fmt(p.platform_fee)} total</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Commission model info box */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
          <i className="fa-solid fa-circle-info text-indigo-400" /> Commission Model: {commission_info.version}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Client Side', rate: `${commission_info.client_rate_pct}%`, desc: 'Added on top of project amount. Client pays more.', color: 'border-blue-700 text-blue-300' },
            { label: 'Creator Side', rate: `${commission_info.creator_rate_pct}%`, desc: 'Deducted from payout. Creator receives less.', color: 'border-emerald-700 text-emerald-300' },
            { label: 'Total Platform', rate: `${commission_info.total_rate_pct}%`, desc: 'Total platform revenue per project.', color: 'border-indigo-700 text-indigo-300' },
          ].map(({ label, rate, desc, color }) => (
            <div key={label} className={`border rounded-xl p-4 ${color}`}>
              <p className="text-2xl font-bold">{rate}</p>
              <p className="text-xs text-gray-300 font-semibold mt-0.5">{label}</p>
              <p className="text-xs text-gray-500 mt-1">{desc}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-4">
          Example: $100 project → Client pays $104 ($100 + $4 fee). Creator receives $92 ($100 − $8 fee). Platform earns $12.
        </p>
      </div>
    </div>
  );
}
