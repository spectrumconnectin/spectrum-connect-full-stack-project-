'use client';

import { useState, useEffect, useCallback } from 'react';
import { escrow, EscrowDetail, EscrowMilestone } from '../../../../lib/api';

// ── Status mapping (milestone status → display) ──────────────────────────────
const MILESTONE_STATUS_LABEL: Record<string, string> = {
  funded:   'In Escrow',
  released: 'Released',
  pending:  'Pending',
  disputed: 'Disputed',
  refunded: 'Refunded',
};

const MILESTONE_STATUS_STYLE: Record<string, string> = {
  funded:   'bg-blue-100 text-blue-700',
  released: 'bg-green-100 text-green-700',
  pending:  'bg-yellow-100 text-yellow-700',
  disputed: 'bg-red-100 text-red-600',
  refunded: 'bg-gray-100 text-gray-600',
};

const MILESTONE_ICON: Record<string, string> = {
  funded:   'fa-lock',
  released: 'fa-check',
  pending:  'fa-clock',
  disputed: 'fa-triangle-exclamation',
  refunded: 'fa-rotate-left',
};

const MILESTONE_ICON_BG: Record<string, string> = {
  funded:   'bg-blue-100 text-cobalt',
  released: 'bg-green-100 text-green-600',
  pending:  'bg-yellow-100 text-yellow-600',
  disputed: 'bg-red-100 text-red-600',
  refunded: 'bg-gray-100 text-gray-500',
};

// ── Tab filter options (using internal milestone status names) ─────────────────
const TABS = ['All', 'funded', 'released', 'pending'];
const TAB_LABEL: Record<string, string> = { All: 'All', funded: 'In Escrow', released: 'Released', pending: 'Pending' };

// ── Flat row derived from escrow detail ───────────────────────────────────────
type PaymentRow = {
  escrow_id: string;
  milestone: EscrowMilestone;
  milestone_num: number;
  total_milestones: number;
  creator_username?: string;
  creator_avatar?: string;
  escrow_description?: string;
  created_at: string;
};

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function Avatar({ username, url, size = 'sm' }: { username?: string; url?: string; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'w-12 h-12' : size === 'md' ? 'w-10 h-10' : 'w-6 h-6';
  const text = size === 'lg' ? 'text-lg' : size === 'md' ? 'text-base' : 'text-xs';
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={username} className={`${dim} rounded-full border border-gray-200 object-cover`} />;
  }
  return (
    <div className={`${dim} rounded-full bg-blue-100 flex items-center justify-center text-cobalt font-bold ${text} flex-shrink-0`}>
      {username?.[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

// ── Release milestone modal ───────────────────────────────────────────────────
function ReleaseModal({
  row,
  onClose,
  onReleased,
}: {
  row: PaymentRow;
  onClose: () => void;
  onReleased: (escrowId: string, milestoneId: string) => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRelease = async () => {
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      await escrow.releaseMilestone(row.escrow_id, row.milestone.milestone_id);
      onReleased(row.escrow_id, row.milestone.milestone_id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={() => { if (!busy) onClose(); }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-gradient-to-r from-cobalt to-blue-600 px-8 py-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <i className="fa-solid fa-unlock text-lg"></i>
            </div>
            <div>
              <h2 className="text-lg font-bold">Release Milestone Funds</h2>
              <p className="text-blue-200 text-xs">This action cannot be undone</p>
            </div>
          </div>
        </div>

        <div className="px-8 py-6">
          {/* Summary */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-5">
            <div className="flex items-center gap-3 mb-3">
              <Avatar username={row.creator_username} url={row.creator_avatar} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">
                  {row.escrow_description || `Escrow …${row.escrow_id.slice(-6)}`}
                </p>
                <p className="text-xs text-gray-500">@{row.creator_username ?? 'Creator'}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xl font-bold text-gray-900">
                  ${row.milestone.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-400">to be released</p>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-3 flex items-center justify-between text-xs text-gray-500">
              <span>
                <i className="fa-solid fa-flag-checkered mr-1 text-gray-400"></i>
                Milestone {row.milestone_num}/{row.total_milestones}
              </span>
              <span className="font-medium text-gray-700 truncate max-w-[180px]">{row.milestone.title}</span>
            </div>
          </div>

          {/* Warning */}
          <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
            <i className="fa-solid fa-triangle-exclamation text-amber-500 mt-0.5 flex-shrink-0"></i>
            <p className="text-xs text-amber-800 leading-relaxed">
              Releasing funds confirms you are satisfied with the delivered work. This is permanent and cannot be reversed.
              If you have concerns, open a dispute first.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">{error}</div>
          )}

          {/* Confirmation checkbox */}
          <label className="flex items-start gap-3 cursor-pointer mb-6 select-none">
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded border-gray-300 accent-cobalt cursor-pointer flex-shrink-0" />
            <span className="text-sm text-gray-700 leading-relaxed">
              I confirm the work meets the agreed requirements and I am ready to release{' '}
              <strong>${row.milestone.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong> to{' '}
              @{row.creator_username ?? 'Creator'}.
            </span>
          </label>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={onClose} disabled={busy}
              className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition disabled:opacity-50">
              Cancel
            </button>
            <button onClick={handleRelease} disabled={!confirmed || busy}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 ${
                confirmed && !busy ? 'bg-cobalt text-white hover:bg-blue-700 shadow-sm' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}>
              {busy ? (
                <><i className="fa-solid fa-spinner animate-spin"></i> Releasing…</>
              ) : (
                <><i className="fa-solid fa-unlock"></i> Release ${row.milestone.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PaymentsPage() {
  const [details, setDetails] = useState<EscrowDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('All');
  const [releasing, setReleasing] = useState<PaymentRow | null>(null);

  const loadEscrows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const listRes = await escrow.list({ role: 'client', limit: 50 });
      const allDetails = await Promise.all(
        listRes.escrows.map(e => escrow.getById(e.escrow_id))
      );
      setDetails(allDetails);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEscrows(); }, [loadEscrows]);

  // Flatten milestones into payment rows
  const rows: PaymentRow[] = details.flatMap(d =>
    d.milestones.map((m, i) => ({
      escrow_id: d.escrow_id,
      milestone: m,
      milestone_num: i + 1,
      total_milestones: d.milestones.length,
      creator_username: d.creator?.username,
      creator_avatar: d.creator?.profile_picture,
      escrow_description: d.description,
      created_at: d.created_at,
    }))
  ).sort((a, b) => {
    const dateA = a.milestone.funded_at || a.created_at;
    const dateB = b.milestone.funded_at || b.created_at;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  const filtered = tab === 'All' ? rows : rows.filter(r => r.milestone.status === tab);

  // Stats
  const totalReleased = details.reduce((s, d) => s + d.released_amount, 0);
  const totalInEscrow = details.reduce((s, d) => s + (d.funded_amount - d.released_amount), 0);
  const awaitingCount = rows.filter(r => r.milestone.status === 'funded').length;

  const handleReleased = (escrowId: string, milestoneId: string) => {
    setDetails(prev => prev.map(d => {
      if (d.escrow_id !== escrowId) return d;
      const updated = d.milestones.map(m =>
        m.milestone_id === milestoneId
          ? { ...m, status: 'released', released_at: new Date().toISOString() }
          : m
      );
      const newReleased = updated.filter(m => m.status === 'released').reduce((s, m) => s + m.amount, 0);
      return { ...d, milestones: updated, released_amount: newReleased };
    }));
    setReleasing(null);
  };

  return (
    <>
      <section className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Payments</h1>
        <p className="text-gray-600">Manage milestone payments and escrow-protected transactions</p>
      </section>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading payments…</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <i className="fa-solid fa-circle-exclamation text-4xl text-red-300 mb-4 block"></i>
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <button onClick={loadEscrows}
            className="px-5 py-2.5 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
            Try Again
          </button>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            <div className="bg-gradient-to-br from-cobalt to-blue-600 text-white rounded-2xl p-6 shadow-lg">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <i className="fa-solid fa-wallet text-lg"></i>
              </div>
              <div className="text-3xl font-bold mb-1">
                ${totalReleased.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-blue-200 text-sm">Total Released</div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-4 text-cobalt">
                <i className="fa-solid fa-lock text-lg"></i>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                ${Math.max(0, totalInEscrow).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-gray-500 text-sm">In Escrow</div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mb-4 text-green-600">
                <i className="fa-solid fa-shield-halved text-lg"></i>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">100%</div>
              <div className="text-gray-500 text-sm">Escrow Protected</div>
            </div>
          </div>

          {/* Awaiting release banner */}
          {awaitingCount > 0 && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-bell text-amber-600"></i>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900">
                  You have {awaitingCount} milestone{awaitingCount !== 1 ? 's' : ''} ready for release
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Review the delivered work and release funds when you&apos;re satisfied.
                </p>
              </div>
            </div>
          )}

          {/* Transactions table */}
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-wrap gap-4">
              <h2 className="text-xl font-bold text-gray-900">Transaction History</h2>
              <div className="flex items-center gap-2 flex-wrap">
                {TABS.map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-3 py-1.5 text-sm rounded-lg font-medium transition ${
                      tab === t ? 'bg-blue-50 text-cobalt font-semibold' : 'text-gray-600 hover:bg-gray-50'
                    }`}>
                    {TAB_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>

            {rows.length === 0 ? (
              <div className="p-16 text-center">
                <i className="fa-solid fa-receipt text-4xl text-gray-300 mb-4 block"></i>
                <p className="text-gray-500 font-medium">No payments yet</p>
                <p className="text-gray-400 text-sm mt-1">Escrow payments will appear here once projects begin.</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-400 text-sm">No {TAB_LABEL[tab].toLowerCase()} transactions.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map((row, idx) => (
                  <div key={`${row.escrow_id}-${row.milestone.milestone_id}-${idx}`}
                    className="flex items-center gap-4 px-6 py-5 hover:bg-gray-50 transition group">

                    {/* Status icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${MILESTONE_ICON_BG[row.milestone.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      <i className={`fa-solid ${MILESTONE_ICON[row.milestone.status] ?? 'fa-circle-dot'} text-sm`}></i>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Avatar username={row.creator_username} url={row.creator_avatar} size="sm" />
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {row.escrow_description || `Escrow …${row.escrow_id.slice(-6)}`}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">
                        @{row.creator_username ?? '—'} · Milestone {row.milestone_num}/{row.total_milestones}: {row.milestone.title}
                      </p>
                      {row.milestone.status === 'funded' && (
                        <p className="text-xs text-amber-600 mt-0.5">
                          <i className="fa-regular fa-clock mr-1"></i>Awaiting your approval
                        </p>
                      )}
                    </div>

                    {/* Amount + date */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-gray-900">
                        ${row.milestone.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(row.milestone.released_at || row.milestone.funded_at || row.created_at)}
                      </p>
                    </div>

                    {/* Status badge */}
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0 ${MILESTONE_STATUS_STYLE[row.milestone.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {MILESTONE_STATUS_LABEL[row.milestone.status] ?? row.milestone.status}
                    </span>

                    {/* Action */}
                    <div className="w-36 flex-shrink-0 flex justify-end">
                      {row.milestone.status === 'funded' ? (
                        <button onClick={() => setReleasing(row)}
                          className="px-4 py-2 bg-cobalt text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition shadow-sm hover:shadow-md">
                          <i className="fa-solid fa-unlock mr-1.5"></i>Release Funds
                        </button>
                      ) : row.milestone.status === 'released' ? (
                        <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition">
                          <i className="fa-solid fa-check mr-1 text-green-500"></i>Released
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 tabular-nums">#{row.escrow_id.slice(-8)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Escrow info footer */}
          <section className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-8">
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 bg-cobalt rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                <i className="fa-solid fa-shield-halved text-white text-xl"></i>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">How Escrow Protection Works</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Your payments are held securely in escrow until you approve each milestone. Funds are only released when you
                  confirm the work meets your requirements. If there&apos;s a dispute, our team steps in to ensure a fair resolution.
                </p>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Release modal */}
      {releasing && (
        <ReleaseModal
          row={releasing}
          onClose={() => setReleasing(null)}
          onReleased={handleReleased}
        />
      )}
    </>
  );
}
