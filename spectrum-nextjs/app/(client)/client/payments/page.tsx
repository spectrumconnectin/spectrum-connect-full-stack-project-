'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { escrow, jobs, earnings as earningsApi, EscrowDetail, EscrowMilestone, JobPostItem, stripeApi, commission, CommissionBreakdown } from '@/lib/api';

// ── Status mapping (milestone status → display) ──────────────────────────────
const MILESTONE_STATUS_LABEL: Record<string, string> = {
  pending:            'Pending Funding',
  funded:             'Funded — In Escrow',
  delivered:          'Delivered',
  revision_requested: 'Revision Requested',
  approved:           'Approved',
  released:           'Payment Released',
  disputed:           'Disputed',
  refunded:           'Refunded',
};

const MILESTONE_STATUS_STYLE: Record<string, string> = {
  pending:            'bg-yellow-100 text-yellow-700',
  funded:             'bg-blue-100 text-blue-700',
  delivered:          'bg-indigo-100 text-indigo-700',
  revision_requested: 'bg-orange-100 text-orange-700',
  approved:           'bg-teal-100 text-teal-700',
  released:           'bg-emerald-100 text-emerald-700',
  disputed:           'bg-red-100 text-red-600',
  refunded:           'bg-gray-100 text-gray-600',
};

const MILESTONE_ICON: Record<string, string> = {
  pending:            'fa-clock',
  funded:             'fa-lock',
  delivered:          'fa-box-open',
  revision_requested: 'fa-rotate-left',
  approved:           'fa-thumbs-up',
  released:           'fa-check',
  disputed:           'fa-triangle-exclamation',
  refunded:           'fa-rotate-left',
};

const MILESTONE_ICON_BG: Record<string, string> = {
  pending:            'bg-yellow-100 text-yellow-600',
  funded:             'bg-blue-100 text-cobalt',
  delivered:          'bg-indigo-100 text-indigo-600',
  revision_requested: 'bg-orange-100 text-orange-600',
  approved:           'bg-teal-100 text-teal-600',
  released:           'bg-emerald-100 text-emerald-600',
  disputed:           'bg-red-100 text-red-600',
  refunded:           'bg-gray-100 text-gray-500',
};

// ── Progress rail — the 4 stages every milestone travels through in order.
// revision_requested rides the "Delivered" node (flagged orange) since it's a
// detour off delivery, not a fifth stage. pending/disputed/refunded aren't on
// this path at all (pre-escrow, or an exception) — they keep the plain badge.
const RAIL_STAGES: { key: string; label: string }[] = [
  { key: 'funded',    label: 'Funded' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'approved',  label: 'Approved' },
  { key: 'released',  label: 'Released' },
];
const RAIL_INDEX: Record<string, number> = {
  funded: 0, delivered: 1, revision_requested: 1, approved: 2, released: 3,
};

function MilestoneRail({ status }: { status: string }) {
  if (!(status in RAIL_INDEX)) return null;
  const current = RAIL_INDEX[status];
  const isRevision = status === 'revision_requested';

  return (
    <div className="flex items-center gap-0.5 mt-1.5" aria-label={`Progress: ${MILESTONE_STATUS_LABEL[status] ?? status}`}>
      {RAIL_STAGES.map((stage, i) => {
        const isCurrent = i === current;
        const isDone = i < current || (isCurrent && status === 'released');
        return (
          <div key={stage.key} className="flex items-center">
            <span
              title={isCurrent ? (isRevision ? 'Revisions requested' : stage.label) : stage.label}
              className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${
                isCurrent && isRevision ? 'bg-orange-500 ring-2 ring-orange-100'
                : isCurrent ? 'bg-cobalt ring-2 ring-blue-100'
                : isDone ? 'bg-emerald-500'
                : 'bg-gray-200'
              }`}
            />
            {i < RAIL_STAGES.length - 1 && (
              <span className={`w-3.5 h-0.5 ${i < current ? 'bg-emerald-500' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
      <span className={`ml-1.5 text-[11px] font-medium ${isRevision ? 'text-orange-600' : 'text-gray-400'}`}>
        {isRevision ? 'Revisions requested' : RAIL_STAGES[current]?.label}
      </span>
    </div>
  );
}

// ── Tab filter options (using internal milestone status names) ─────────────────
const TABS = ['All', 'funded', 'delivered', 'revision_requested', 'released', 'pending'];
const TAB_LABEL: Record<string, string> = {
  All: 'All',
  funded: 'In Escrow',
  delivered: 'Delivered',
  revision_requested: 'Revision',
  released: 'Released',
  pending: 'Pending',
};

// ── Flat row derived from escrow detail ───────────────────────────────────────
type PaymentRow = {
  escrow_id: string;
  job_post_id?: string | null;
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

// ── Request revisions modal ──────────────────────────────────────────────────
function RequestRevisionsModal({
  row,
  onClose,
  onRequested,
}: {
  row: PaymentRow;
  onClose: () => void;
  onRequested: (escrowId: string, milestoneId: string) => void;
}) {
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleRequest = async () => {
    if (!feedback.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const { escrow: escrowApi } = await import('@/lib/api');
      // Update milestone status to revision_requested
      await escrowApi.requestRevision(row.escrow_id, row.milestone.milestone_id);
      setSent(true);
      setTimeout(() => {
        onRequested(row.escrow_id, row.milestone.milestone_id);
        onClose();
      }, 1500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="sc-modal-backdrop" onClick={onClose}>
        <div className="sc-modal-panel" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-check text-green-600 text-2xl"></i>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Revision Request Sent</h3>
            <p className="text-gray-600 text-sm">
              The creator has been notified about your revision request. They&apos;ll resubmit the work when ready.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sc-modal-backdrop" onClick={() => { if (!busy) onClose(); }}>
      <div className="sc-modal-panel overflow-hidden" style={{ maxWidth: 500, padding: 0 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <i className="fa-solid fa-pen-to-square text-lg"></i>
            </div>
            <div>
              <h2 className="text-lg font-bold">Request Revisions</h2>
              <p className="text-orange-100 text-xs">Provide feedback on the submitted work</p>
            </div>
          </div>
        </div>

        <div className="px-8 py-6">
          {/* Summary */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 font-bold text-sm flex-shrink-0">
                {row.milestone_num}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{row.milestone.title}</p>
                <p className="text-xs text-gray-500">
                  ${row.milestone.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Feedback textarea */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              What revisions do you need?
            </label>
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="Be specific about what you'd like changed. For example: 'Please adjust the color to match the brand guidelines' or 'Reduce the audio levels in the second section'"
              rows={6}
              maxLength={1000}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {feedback.length}/1000 characters
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* Info box */}
          <div className="mb-5 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-xs text-blue-700">
              <i className="fa-solid fa-info-circle mr-2"></i>
              The creator will be notified and can resubmit revised work. You won&apos;t release funds until you approve the changes.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={busy}
              className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleRequest}
              disabled={!feedback.trim() || busy}
              className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-semibold hover:bg-amber-600 disabled:opacity-50 transition text-sm flex items-center justify-center gap-2"
            >
              {busy ? (
                <>
                  <i className="fa-solid fa-spinner animate-spin"></i> Sending…
                </>
              ) : (
                <>
                  <i className="fa-solid fa-paper-plane"></i> Send Revision Request
                </>
              )}
            </button>
          </div>
        </div>
      </div>
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
    <div className="sc-modal-backdrop"
      onClick={() => { if (!busy) onClose(); }}>
      <div className="sc-modal-panel overflow-hidden" style={{maxWidth: 440, padding: 0}}
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

            {/* Fee breakdown (v1 8/4 commission) */}
            {row.milestone.fees && (
              <div className="border-t border-gray-200 pt-3 mt-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-gray-500">
                  <span>Milestone subtotal</span>
                  <span className="font-medium text-gray-700 tabular-nums">${row.milestone.fees.project_subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-gray-500">
                  <span>Platform fee (creator side, 8%)</span>
                  <span className="font-medium text-rose-600 tabular-nums">-${row.milestone.fees.creator_fee.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 pt-1.5">
                  <span className="font-semibold text-gray-900">Creator receives</span>
                  <span className="font-bold text-emerald-600 tabular-nums">${row.milestone.fees.creator_payout.toFixed(2)}</span>
                </div>
              </div>
            )}
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
// ── Fund Project Modal ────────────────────────────────────────────────────────
function FundProjectModal({
  job,
  creatorId,
  onClose,
}: {
  job: JobPostItem;
  creatorId: string;
  onFunded: () => void;
  onClose: () => void;
}) {
  const fixedPrice = job.budget_type === 'fixed' &&
    job.budget?.min && job.budget?.max &&
    job.budget.min === job.budget.max
      ? job.budget.min : null;
  const [amount, setAmount] = useState(
    fixedPrice ? String(fixedPrice) : (job.budget?.min ? String(job.budget.min) : '')
  );
  const [milestoneTitle, setMilestoneTitle] = useState('Project Payment');
  const [step, setStep] = useState<'setup' | 'redirecting'>('setup');
  const [error, setError] = useState('');
  const [fees, setFees] = useState<CommissionBreakdown | null>(null);

  // Preview the exact total the client will be charged at Stripe checkout
  // (subtotal + platform service fee). Mirrors the server-side amount.
  useEffect(() => {
    const n = Number(amount);
    if (!n || n <= 0) { setFees(null); return; }
    let cancelled = false;
    const t = setTimeout(() => {
      commission.preview(n, 'USD')
        .then(b => { if (!cancelled) setFees(b); })
        .catch(() => { if (!cancelled) setFees(null); });
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [amount]);

  const handleFund = async () => {
    if (!amount || Number(amount) <= 0) {
      setError('Please enter a valid amount'); return;
    }
    setError('');
    setStep('redirecting');

    try {
      // Create escrow in MongoDB first to get escrow_id + milestone_id
      const created = await escrow.create({
        creator_id: creatorId,
        job_post_id: job.id,
        description: `Escrow for: ${job.title}`,
        milestones: [{ title: milestoneTitle, amount: Number(amount), currency: 'USD' }],
        currency: 'USD',
      });

      const detail = await escrow.getById(created.escrow_id);
      const milestoneId = detail.milestones[0]?.milestone_id;
      if (!milestoneId) throw new Error('Milestone not found after creation');

      // Create Stripe Checkout Session and redirect
      const { checkout_url } = await stripeApi.createCheckoutSession({
        escrow_id: created.escrow_id,
        milestone_id: milestoneId,
        amount: Number(amount),
        currency: 'USD',
        project_title: job.title,
        milestone_title: milestoneTitle,
      });

      window.location.href = checkout_url;
    } catch (e) {
      setError((e as Error).message);
      setStep('setup');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-md" onClick={step !== 'redirecting' ? onClose : undefined} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden">

        {/* Stripe branding bar */}
        <div className="bg-[#635bff] text-white text-xs font-semibold text-center py-1.5 tracking-wide flex items-center justify-center gap-1.5">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/></svg>
          Secured by Stripe
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Fund Project</h3>
              <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{job.title}</p>
            </div>
            {step !== 'redirecting' && (
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition">
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              <i className="fa-solid fa-circle-exclamation mr-2"></i>{error}
            </div>
          )}

          {step === 'redirecting' ? (
            <div className="flex flex-col items-center py-8 gap-4">
              <div className="w-12 h-12 border-4 border-[#635bff] border-t-transparent rounded-full animate-spin"></div>
              <div className="text-center">
                <p className="font-semibold text-gray-800">Redirecting to secure checkout…</p>
                <p className="text-xs text-gray-400 mt-1">You&apos;ll be taken to Stripe to complete payment</p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Milestone title</label>
                  <input type="text" value={milestoneTitle} onChange={e => setMilestoneTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-cobalt" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Amount (USD) <span className="text-red-500">*</span>
                  </label>
                  {fixedPrice ? (
                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                      <i className="fa-solid fa-tag text-emerald-600"></i>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-emerald-900">Fixed Price</p>
                        <p className="text-xs text-emerald-700">Set at project creation — cannot be changed.</p>
                      </div>
                      <span className="text-xl font-bold text-emerald-700">${fixedPrice.toLocaleString()}</span>
                    </div>
                  ) : (
                    <div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">$</span>
                        <input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full border border-gray-300 rounded-xl pl-7 pr-4 py-2.5 text-sm focus:outline-none focus:border-cobalt" />
                      </div>
                      {job.budget?.min && job.budget?.max && (
                        <p className="text-xs text-gray-400 mt-1">
                          Project budget: ${job.budget.min.toLocaleString()}
                          {job.budget.min !== job.budget.max && `–$${job.budget.max.toLocaleString()}`}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Exact charge breakdown — matches the server-derived Stripe amount */}
              {fees && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Milestone subtotal</span>
                    <span className="font-medium text-gray-700 tabular-nums">${fees.project_subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Platform service fee</span>
                    <span className="font-medium text-gray-700 tabular-nums">${fees.client_fee.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-200 pt-1.5">
                    <span className="text-sm font-bold text-gray-900">Total charged at checkout</span>
                    <span className="text-sm font-bold text-cobalt tabular-nums">${fees.client_total.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 rounded-xl p-3 mt-4 text-xs text-cobalt">
                <i className="fa-solid fa-lock mr-2"></i>
                Funds are held in <strong>secure escrow</strong> and released only when you approve the work.
                You will be redirected to Stripe to complete payment.
              </div>

              <div className="flex gap-3 mt-5">
                <button onClick={onClose}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition">
                  Cancel
                </button>
                <button onClick={handleFund} disabled={!amount}
                  className="flex-1 py-2.5 bg-cobalt text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  <i className="fa-solid fa-lock"></i> Pay with Stripe
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Pending funding section (handles single and multi-creator crew jobs) ──────

type TeamMember = {
  application_id: string;
  creator_id: string;
  creator_name: string;
  creator_username?: string;
  creator_avatar?: string;
  role?: string;
  proposed_budget?: number;
  escrow?: { escrow_id: string; status: string; funded_amount: number } | null;
};

function PendingFundingSection({
  pendingJobs,
  existingEscrows,
  onFundCreator,
}: {
  pendingJobs: JobPostItem[];
  existingEscrows: EscrowDetail[];
  onFundCreator: (job: JobPostItem, creatorId: string) => void;
}) {
  const [teamByJob, setTeamByJob] = useState<Record<string, TeamMember[]>>({});
  const [loadingTeam, setLoadingTeam] = useState<Record<string, boolean>>({});

  useEffect(() => {
    pendingJobs.forEach(async job => {
      if (teamByJob[job.id] || loadingTeam[job.id]) return;
      setLoadingTeam(p => ({ ...p, [job.id]: true }));
      try {
        const { jobs: jobsApi } = await import('@/lib/api');
        const team = await jobsApi.getTeam(job.id);
        setTeamByJob(p => ({ ...p, [job.id]: team }));
      } catch {
        // fallback: show single generic fund button
        setTeamByJob(p => ({ ...p, [job.id]: [] }));
      } finally {
        setLoadingTeam(p => ({ ...p, [job.id]: false }));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingJobs]);

  if (pendingJobs.length === 0) return null;

  // Funded creator_ids across all existing escrows, keyed by job_post_id
  const fundedByJob: Record<string, Set<string>> = {};
  for (const esc of existingEscrows) {
    const jid = (esc as EscrowDetail & { job_post_id?: string }).job_post_id;
    if (!jid) continue;
    if (!fundedByJob[jid]) fundedByJob[jid] = new Set();
    if (esc.creator) fundedByJob[jid].add(esc.creator.user_id);
  }

  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
        <i className="fa-solid fa-hourglass-half text-orange-500"></i>
        Projects Awaiting Funding
      </h2>
      <div className="space-y-3">
        {pendingJobs.map(job => {
          const team = teamByJob[job.id] ?? [];
          const funded = fundedByJob[job.id] ?? new Set();
          // Filter: only show creators who don't have a funded escrow yet
          const unfunded = team.filter(m => !funded.has(m.creator_id));
          const isLoading = loadingTeam[job.id];

          return (
            <div key={job.id} className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                <div>
                  <p className="font-bold text-gray-900">{job.title}</p>
                  <p className="text-sm text-orange-700 mt-0.5">
                    {team.length > 1
                      ? `${unfunded.length} of ${team.length} creators still need funding`
                      : 'Creator hired — fund escrow to begin work'}
                  </p>
                  {(job.budget?.min || job.budget?.max) && (
                    <p className="text-xs text-gray-500 mt-1">
                      Budget: ${job.budget.min?.toLocaleString()}
                      {job.budget.max ? `–$${job.budget.max.toLocaleString()}` : '+'}
                    </p>
                  )}
                </div>
                {isLoading && (
                  <div className="flex items-center gap-2 text-orange-500 text-sm">
                    <i className="fa-solid fa-spinner animate-spin text-xs"></i>
                    <span>Loading team…</span>
                  </div>
                )}
              </div>

              {/* One Fund button per unfunded creator (crew support) */}
              {!isLoading && unfunded.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {unfunded.map(member => (
                    <button
                      key={member.creator_id}
                      onClick={() => onFundCreator(job, member.creator_id)}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl font-semibold text-sm hover:bg-orange-700 transition">
                      <i className="fa-solid fa-lock text-xs"></i>
                      Fund {member.creator_name.split(' ')[0]}
                      {member.proposed_budget ? ` ($${member.proposed_budget.toLocaleString()})` : ''}
                    </button>
                  ))}
                </div>
              )}

              {/* Fallback if team endpoint returned empty (legacy / non-crew job) */}
              {!isLoading && unfunded.length === 0 && team.length === 0 && (
                <button
                  onClick={async () => {
                    try {
                      const { proposals: proposalsApi } = await import('@/lib/api');
                      const appData = await proposalsApi.getForJob(job.id);
                      const applicants = appData?.proposals ?? (Array.isArray(appData) ? appData : []);
                      const hired = applicants.find((a: { status: string; creator_id?: string }) => a.status === 'accepted');
                      if (hired?.creator_id) onFundCreator(job, hired.creator_id);
                    } catch { /* ignore */ }
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition">
                  <i className="fa-solid fa-lock"></i>
                  Fund Escrow
                </button>
              )}

              {/* All funded — job still showing because status hasn't updated yet */}
              {!isLoading && unfunded.length === 0 && team.length > 0 && (
                <div className="flex items-center gap-2 text-emerald-700 text-sm font-semibold">
                  <i className="fa-solid fa-circle-check text-emerald-500"></i>
                  All {team.length} creators funded
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PaymentsPageInner() {
  const searchParams = useSearchParams();
  const stripeResult = searchParams.get('payment'); // 'success' | 'cancelled' | null
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSuccessBanner, setShowSuccessBanner] = useState(stripeResult === 'success');

  const [details, setDetails] = useState<EscrowDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('All');
  const [releasing, setReleasing] = useState<PaymentRow | null>(null);
  const [requestingRevisions, setRequestingRevisions] = useState<PaymentRow | null>(null);
  // Fund project modal
  const [pendingJobs, setPendingJobs] = useState<JobPostItem[]>([]);
  const [fundingJob, setFundingJob] = useState<{ job: JobPostItem; creatorId: string } | null>(null);

  // Auto-dismiss the Stripe success banner after 8 seconds
  useEffect(() => {
    if (showSuccessBanner) {
      bannerTimerRef.current = setTimeout(() => setShowSuccessBanner(false), 8000);
    }
    return () => { if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current); };
  }, [showSuccessBanner]);

  const loadEscrows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, jobsRes] = await Promise.allSettled([
        escrow.list({ role: 'client', limit: 50 }),
        jobs.getMe(),
      ]);
      if (listRes.status === 'fulfilled') {
        const allDetails = await Promise.all(
          listRes.value.escrows.map(e => escrow.getById(e.escrow_id))
        );
        setDetails(allDetails);
      }
      if (jobsRes.status === 'fulfilled') {
        // Show ALL pending_funding jobs — the PendingFundingSection component will
        // call /jobs/{id}/team to find which specific creators still need funding,
        // handling crew projects where some creators are funded and others are not.
        setPendingJobs(
          jobsRes.value.filter((j: JobPostItem) => j.status === 'pending_funding')
        );
      }
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
      job_post_id: (d as EscrowDetail & { job_post_id?: string }).job_post_id,
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
  // Total platform fees charged to the client across all funded milestones.
  const totalClientFees = details.reduce(
    (s, d) => s + (d.fees_summary?.client_fee_total ?? 0),
    0,
  );

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

  const handleRevisionsRequested = (escrowId: string, milestoneId: string) => {
    setRequestingRevisions(null);
    // Show a success notification
    loadEscrows();
  };

  return (
    <>
      {/* Stripe payment return banners */}
      {showSuccessBanner && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3 flex items-center gap-3 mb-6">
          <i className="fa-solid fa-circle-check text-emerald-500 text-lg flex-shrink-0"></i>
          <div className="flex-1">
            <span className="font-bold text-emerald-800 text-sm">Payment successful!</span>
            <span className="text-emerald-700 text-sm ml-2">Your funds are now held in escrow. The creator has been notified and can begin work.</span>
          </div>
          <button onClick={() => setShowSuccessBanner(false)} className="text-emerald-400 hover:text-emerald-600 flex-shrink-0">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}
      {stripeResult === 'cancelled' && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3 flex items-center gap-3 mb-6">
          <i className="fa-solid fa-circle-xmark text-gray-400 text-lg flex-shrink-0"></i>
          <span className="text-gray-600 text-sm">Payment cancelled — no charge was made. You can fund the project any time.</span>
        </div>
      )}

      <section className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Payments</h1>
        <p className="text-gray-600">Manage milestone payments and escrow-protected transactions</p>
      </section>

      {/* Projects awaiting funding */}
      {pendingJobs.length > 0 && (
        <PendingFundingSection
          pendingJobs={pendingJobs}
          existingEscrows={details}
          onFundCreator={(job, creatorId) => setFundingJob({ job, creatorId })}
        />
      )}

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
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
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mb-4 text-purple-600">
                <i className="fa-solid fa-percent text-lg"></i>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                ${totalClientFees.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-gray-500 text-sm">Platform Fees (4%)</div>
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
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden overflow-x-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-wrap gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-gray-900">Transaction History</h2>
                <button
                  onClick={() => earningsApi.downloadClientCSV()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition border border-gray-200"
                  title="Download CSV payment report">
                  <i className="fa-solid fa-download text-xs"></i>
                  Download CSV
                </button>
              </div>
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
                      <MilestoneRail status={row.milestone.status} />
                    </div>

                    {/* Amount + date */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-gray-900">
                        ${row.milestone.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      {row.milestone.fees && row.milestone.fees.client_fee > 0 && (
                        <p className="text-[11px] text-gray-500 leading-tight">
                          + ${row.milestone.fees.client_fee.toFixed(2)} fee
                        </p>
                      )}
                      {/* Transaction reference — real release tx id once paid out */}
                      <p className="text-[10px] text-gray-400 font-mono">
                        {row.milestone.release_transaction_id
                          ? `TXN-${row.milestone.release_transaction_id.slice(0, 8).toUpperCase()}`
                          : `REF-${row.escrow_id.slice(-8).toUpperCase()}`}
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
                    <div className="flex-shrink-0 flex justify-end gap-2">
                      {row.milestone.status === 'delivered' ? (
                        /* Delivered: client must go through the review gate first */
                        row.job_post_id ? (
                          <Link
                            href={`/client/projects/${row.job_post_id}/delivery/${row.milestone.milestone_id}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition shadow-sm">
                            <i className="fa-solid fa-magnifying-glass text-[10px]"></i>Review Delivery
                          </Link>
                        ) : (
                          <span className="text-xs text-indigo-600 font-semibold">Awaiting review</span>
                        )
                      ) : row.milestone.status === 'approved' ? (
                        /* Approved: safe to release — review gate already passed */
                        <button onClick={() => setReleasing(row)}
                          className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 transition shadow-sm hover:shadow-md">
                          <i className="fa-solid fa-coins mr-1.5"></i>Release
                        </button>
                      ) : row.milestone.status === 'funded' ? (
                        /* Funded but not delivered yet — only revisions possible from here */
                        <button onClick={() => setRequestingRevisions(row)}
                          className="px-3 py-2 bg-amber-50 text-amber-700 text-xs font-semibold rounded-xl hover:bg-amber-100 transition border border-amber-200 shadow-sm">
                          <i className="fa-solid fa-pen-to-square mr-1"></i>Revisions
                        </button>
                      ) : row.milestone.status === 'released' ? (
                        <span className="text-xs text-emerald-600 font-semibold">
                          <i className="fa-solid fa-check mr-1"></i>Released
                        </span>
                      ) : row.milestone.status === 'refunded' ? (
                        <span className="text-xs text-gray-400 font-semibold">
                          <i className="fa-solid fa-rotate-left mr-1"></i>Refunded
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
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

      {/* Request revisions modal */}
      {requestingRevisions && (
        <RequestRevisionsModal
          row={requestingRevisions}
          onClose={() => setRequestingRevisions(null)}
          onRequested={handleRevisionsRequested}
        />
      )}

      {/* Release modal */}
      {releasing && (
        <ReleaseModal
          row={releasing}
          onClose={() => setReleasing(null)}
          onReleased={handleReleased}
        />
      )}

      {/* Fund Project modal */}
      {fundingJob && (
        <FundProjectModal
          job={fundingJob.job}
          creatorId={fundingJob.creatorId}
          onFunded={() => { setFundingJob(null); loadEscrows(); }}
          onClose={() => setFundingJob(null)}
        />
      )}
    </>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense>
      <PaymentsPageInner />
    </Suspense>
  );
}
