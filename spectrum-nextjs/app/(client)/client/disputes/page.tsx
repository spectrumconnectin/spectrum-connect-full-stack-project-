'use client';

import { useState, useEffect, useCallback } from 'react';
import { disputes, escrow, DisputeListItem, EscrowListItem } from '../../../../lib/api';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  open:                   { label: 'Open',         color: 'bg-blue-50 text-blue-700',       icon: 'fa-circle-dot' },
  under_review:           { label: 'Under Review', color: 'bg-amber-50 text-amber-700',     icon: 'fa-magnifying-glass' },
  escalated:              { label: 'Escalated',    color: 'bg-red-50 text-red-700',         icon: 'fa-triangle-exclamation' },
  resolved_creator_favor: { label: 'Resolved',     color: 'bg-emerald-50 text-emerald-700', icon: 'fa-circle-check' },
  resolved_client_favor:  { label: 'Resolved',     color: 'bg-emerald-50 text-emerald-700', icon: 'fa-circle-check' },
};

const FILTERS = ['all', 'open', 'under_review', 'escalated', 'resolved_client_favor'] as const;

function isResolved(status: string) { return status.startsWith('resolved'); }

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── New Dispute Modal ─────────────────────────────────────────────────────────
function NewDisputeModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (d: DisputeListItem) => void;
}) {
  const [escrows, setEscrows] = useState<EscrowListItem[]>([]);
  const [loadingEscrows, setLoadingEscrows] = useState(true);
  const [escrowId, setEscrowId] = useState('');
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    escrow.list({ role: 'client', limit: 50 })
      .then(res => setEscrows(res.escrows.filter(e => e.status === 'active' || e.status === 'disputed')))
      .catch(() => {})
      .finally(() => setLoadingEscrows(false));
  }, []);

  const valid = escrowId !== '' && reason.trim().length >= 5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true); setErr('');
    try {
      const res = await disputes.create({
        escrow_id: escrowId,
        reason: reason.trim(),
        details: details.trim() || undefined,
      });
      onCreated({
        dispute_id: res.dispute_id ?? '',
        escrow_id: escrowId,
        status: 'open',
        reason: reason.trim(),
        raised_by: '',
        raised_against: '',
        created_at: new Date().toISOString(),
        evidence_count: 0,
      });
    } catch (e) {
      setErr((e as Error).message ?? 'Failed to open dispute. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Open a Dispute</h2>
            <p className="text-sm text-gray-500 mt-0.5">Our team reviews all disputes within 48 hours.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {err && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{err}</div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Project / Escrow <span className="text-red-500">*</span>
            </label>
            {loadingEscrows ? (
              <div className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-400">
                Loading your projects…
              </div>
            ) : escrows.length === 0 ? (
              <div className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-400 bg-gray-50">
                No active projects found. Disputes can only be raised on active escrows.
              </div>
            ) : (
              <select value={escrowId} onChange={e => setEscrowId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-cobalt bg-white">
                <option value="">Select a project</option>
                {escrows.map(e => (
                  <option key={e.escrow_id} value={e.escrow_id}>
                    Escrow #{e.escrow_id.slice(-8)} — ${e.total_amount.toLocaleString()} · {e.milestone_count} milestone{e.milestone_count !== 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Issue description <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-cobalt"
              placeholder="Short summary of the issue (min 5 characters)"
              value={reason}
              onChange={e => setReason(e.target.value)}
              maxLength={500}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Details (optional)</label>
            <textarea rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-cobalt resize-none"
              placeholder="Full explanation of the issue, timeline, and desired resolution…"
              value={details}
              onChange={e => setDetails(e.target.value)}
              maxLength={2000}
            />
          </div>

          <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-700">
            <i className="fa-solid fa-circle-info mr-2"></i>
            Escrowed funds for this project will be held pending dispute resolution.
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={!valid || saving || loadingEscrows}
              className={`flex-1 px-4 py-3 rounded-xl bg-cobalt text-white text-sm font-semibold transition ${!valid || saving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}>
              {saving ? 'Submitting…' : 'Open Dispute'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ClientDisputesPage() {
  const [disputeList, setDisputeList] = useState<DisputeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await disputes.getMyDisputes({ limit: 50 });
      setDisputeList(res.disputes);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all'
    ? disputeList
    : disputeList.filter(d => d.status === filter);

  const activeCount   = disputeList.filter(d => !isResolved(d.status)).length;
  const resolvedCount = disputeList.filter(d => isResolved(d.status)).length;

  const handleCreated = (d: DisputeListItem) => {
    setDisputeList(prev => [d, ...prev]);
    setShowModal(false);
  };

  return (
    <>
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Disputes</h1>
          <p className="text-lg text-gray-600">Manage project issues and track their resolution status.</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="px-5 py-3 bg-cobalt text-white rounded-xl font-semibold hover:bg-blue-700 transition flex items-center gap-2 shadow-sm">
          <i className="fa-solid fa-plus"></i> Open Dispute
        </button>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Active Disputes', value: activeCount,        icon: 'fa-triangle-exclamation', color: 'text-amber-600',   bg: 'bg-amber-50' },
          { label: 'Resolved',        value: resolvedCount,      icon: 'fa-circle-check',          color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total',           value: disputeList.length, icon: 'fa-scale-balanced',        color: 'text-cobalt',      bg: 'bg-blue-50' },
        ].map(({ label, value, icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${bg}`}>
              <i className={`fa-solid ${icon} ${color}`}></i>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{loading ? '—' : value}</div>
              <div className="text-sm text-gray-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              filter === f ? 'bg-cobalt text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}>
            {f === 'all' ? 'All' : STATUS_CONFIG[f]?.label ?? f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading disputes…</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <i className="fa-solid fa-circle-exclamation text-4xl text-red-300 mb-4 block"></i>
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <button onClick={load} className="px-5 py-2.5 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
            Try Again
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-scale-balanced text-cobalt text-2xl"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No disputes</h3>
              <p className="text-gray-500">
                {filter === 'all' ? 'You have no disputes yet.' : 'No disputes in this category.'}
              </p>
            </div>
          ) : (
            filtered.map(d => {
              const cfg = STATUS_CONFIG[d.status] ?? { label: d.status, color: 'bg-gray-100 text-gray-600', icon: 'fa-circle-dot' };
              const expanded = selected === d.dispute_id;
              return (
                <div key={d.dispute_id} className="bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-gray-400">#{d.dispute_id.slice(-8)}</span>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${cfg.color}`}>
                          <i className={`fa-solid ${cfg.icon}`}></i> {cfg.label}
                        </span>
                        {d.evidence_count > 0 && (
                          <span className="text-xs text-gray-400">
                            <i className="fa-solid fa-paperclip mr-1"></i>{d.evidence_count} evidence file{d.evidence_count !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <p className="text-base font-semibold text-gray-900">{d.reason}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Opened {formatDate(d.created_at)}
                        {d.resolved_at && <> · Resolved {formatDate(d.resolved_at)}</>}
                      </p>
                      {d.resolution_type && (
                        <div className="mt-3 p-3 bg-emerald-50 rounded-xl text-sm text-emerald-700">
                          <i className="fa-solid fa-circle-check mr-2"></i>
                          Resolution: {d.resolution_type.replace(/_/g, ' ')}
                        </div>
                      )}
                    </div>
                    <button onClick={() => setSelected(expanded ? null : d.dispute_id)}
                      className="px-4 py-2 text-sm font-semibold text-cobalt border border-cobalt rounded-xl hover:bg-blue-50 transition flex-shrink-0">
                      {expanded ? 'Close' : 'View details'}
                    </button>
                  </div>

                  {expanded && (
                    <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600 space-y-1.5">
                      <p><span className="font-semibold">Dispute ID:</span> {d.dispute_id}</p>
                      <p><span className="font-semibold">Escrow ref:</span> #{d.escrow_id.slice(-12)}</p>
                      <p><span className="font-semibold">Opened:</span> {formatDate(d.created_at)}</p>
                      {d.resolved_at && <p><span className="font-semibold">Resolved:</span> {formatDate(d.resolved_at)}</p>}
                      <p className="pt-2 text-gray-400 text-xs">
                        For urgent escalation contact{' '}
                        <a href="mailto:disputes@spectrumconnect.com" className="text-cobalt underline">disputes@spectrumconnect.com</a>
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {showModal && <NewDisputeModal onClose={() => setShowModal(false)} onCreated={handleCreated} />}
    </>
  );
}
