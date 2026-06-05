'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { escrow as escrowApi, jobs, proposals, JobPostItem, JobProposalItem } from '@/lib/api';

type DeliveryData = Awaited<ReturnType<typeof escrowApi.getDeliveryStatus>>;

// ── Review step progress ───────────────────────────────────────────────────────
// 1. open    – client must click "Open Drive Link"
// 2. review  – client checks "I have reviewed the work"
// 3. decide  – client picks "Request Revisions" or "Approve Delivery"
// 4. release – client releases funds (after approval)
type ReviewStep = 'open' | 'review' | 'decide' | 'release';

function deriveStep(delivery: DeliveryData): ReviewStep {
  if (delivery.status === 'approved') return 'release';
  if (delivery.client_reviewed_at) return 'decide';
  if (delivery.drive_link_opened_at) return 'review';
  return 'open';
}

// ── Countdown ─────────────────────────────────────────────────────────────────
function Countdown({ autoReleaseAt }: { autoReleaseAt: string }) {
  const [remaining, setRemaining] = useState('');
  const [urgency, setUrgency] = useState<'normal' | 'warning' | 'critical'>('normal');

  useEffect(() => {
    const target = new Date(autoReleaseAt).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) { setRemaining('Releasing now…'); setUrgency('critical'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h}h ${m}m ${s}s`);
      setUrgency(h < 6 ? 'critical' : h < 24 ? 'warning' : 'normal');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [autoReleaseAt]);

  const colours = {
    normal: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-amber-50 border-amber-300 text-amber-800',
    critical: 'bg-red-50 border-red-300 text-red-800',
  };
  const icons = { normal: 'fa-clock', warning: 'fa-triangle-exclamation', critical: 'fa-fire' };

  return (
    <div className={`rounded-2xl border-2 p-4 ${colours[urgency]}`}>
      <div className="flex items-center gap-3">
        <i className={`fa-solid ${icons[urgency]} text-xl`}></i>
        <div>
          <p className="font-bold">{remaining}</p>
          <p className="text-xs opacity-80">until automatic payment release if no action taken</p>
        </div>
      </div>
    </div>
  );
}

// ── Step indicator ─────────────────────────────────────────────────────────────
function StepBar({ step }: { step: ReviewStep }) {
  const steps = [
    { id: 'open',    label: 'Open Link',   icon: 'fa-arrow-up-right-from-square' },
    { id: 'review',  label: 'Review Work', icon: 'fa-magnifying-glass' },
    { id: 'decide',  label: 'Decision',    icon: 'fa-thumbs-up' },
    { id: 'release', label: 'Release',     icon: 'fa-coins' },
  ] as const;
  const order = ['open', 'review', 'decide', 'release'];
  const current = order.indexOf(step);

  return (
    <div className="flex items-center gap-0 w-full">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={s.id} className="flex items-center flex-1">
            <div className={`flex flex-col items-center flex-1 ${i > 0 ? '' : ''}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold mb-1 transition-all ${
                done    ? 'bg-emerald-500 text-white' :
                active  ? 'bg-cobalt text-white shadow-lg shadow-blue-200' :
                          'bg-gray-100 text-gray-400'
              }`}>
                {done
                  ? <i className="fa-solid fa-check text-xs"></i>
                  : <i className={`fa-solid ${s.icon} text-xs`}></i>}
              </div>
              <span className={`text-xs font-semibold hidden sm:block ${
                done ? 'text-emerald-600' : active ? 'text-cobalt' : 'text-gray-400'
              }`}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 -mt-5 transition-all ${i < current ? 'bg-emerald-400' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Approve confirmation modal ─────────────────────────────────────────────────
function ApproveModal({
  amount,
  onConfirm,
  onCancel,
  busy,
}: {
  amount: number;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [checked, setChecked] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={() => { if (!busy) onCancel(); }} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md z-10 overflow-hidden">
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <i className="fa-solid fa-circle-check text-xl"></i>
            </div>
            <div>
              <h3 className="font-bold text-lg">Approve Delivery</h3>
              <p className="text-teal-100 text-xs">Confirm your review before approving</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-teal-900 mb-2">
              Have you reviewed the delivered work and confirmed it meets your requirements?
            </p>
            <p className="text-xs text-teal-700 leading-relaxed">
              By approving, you confirm the delivered files match the agreed project scope.
              After approval, you can release the ${amount.toLocaleString()} escrow payment.
            </p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded accent-teal-600 flex-shrink-0 cursor-pointer"
            />
            <span className="text-sm text-gray-700 leading-relaxed">
              Yes — I have reviewed the delivered work and it meets the project requirements.
            </span>
          </label>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
            <i className="fa-solid fa-triangle-exclamation text-amber-500 text-sm mt-0.5 flex-shrink-0"></i>
            <p className="text-xs text-amber-700 leading-relaxed">
              Approving means you are satisfied with this version of the work.
              You will still need to release funds in the next step.
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onCancel} disabled={busy}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition disabled:opacity-50">
              Go Back
            </button>
            <button onClick={onConfirm} disabled={!checked || busy}
              className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-bold text-sm hover:bg-teal-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
              {busy
                ? <><i className="fa-solid fa-spinner animate-spin"></i>Approving…</>
                : <><i className="fa-solid fa-circle-check"></i>Approve Delivery</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Release funds modal ────────────────────────────────────────────────────────
function ReleaseModal({
  amount,
  creatorName,
  onConfirm,
  onCancel,
  busy,
}: {
  amount: number;
  creatorName: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [checked, setChecked] = useState(false);
  const creatorEarns = +(amount * 0.92).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={() => { if (!busy) onCancel(); }} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md z-10 overflow-hidden">
        <div className="bg-gradient-to-r from-cobalt to-blue-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <i className="fa-solid fa-coins text-xl"></i>
            </div>
            <div>
              <h3 className="font-bold text-lg">Release Funds</h3>
              <p className="text-blue-200 text-xs">This action cannot be undone</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Escrow amount</span>
              <span className="font-semibold text-gray-900">${amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Platform fee (8%)</span>
              <span className="font-semibold text-rose-500">−${(amount * 0.08).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
              <span className="font-bold text-gray-900">{creatorName} receives</span>
              <span className="font-bold text-emerald-600">${creatorEarns.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
            <i className="fa-solid fa-triangle-exclamation text-red-500 text-sm mt-0.5 flex-shrink-0"></i>
            <p className="text-xs text-red-700 leading-relaxed font-medium">
              This action is permanent and cannot be reversed.
              Once released, funds are immediately transferred to the creator.
            </p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded accent-cobalt flex-shrink-0 cursor-pointer"
            />
            <span className="text-sm text-gray-700 leading-relaxed">
              I understand this is permanent. I confirm releasing <strong>${amount.toLocaleString()}</strong> to <strong>{creatorName}</strong>.
            </span>
          </label>

          <div className="flex gap-3 pt-1">
            <button onClick={onCancel} disabled={busy}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition disabled:opacity-50">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={!checked || busy}
              className="flex-1 py-3 bg-cobalt text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
              {busy
                ? <><i className="fa-solid fa-spinner animate-spin"></i>Releasing…</>
                : <><i className="fa-solid fa-coins"></i>Release ${amount.toLocaleString()}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Revision modal ─────────────────────────────────────────────────────────────
function RevisionModal({
  onClose,
  onSubmit,
  busy,
}: {
  onClose: () => void;
  onSubmit: (feedback: string) => void;
  busy: boolean;
}) {
  const [feedback, setFeedback] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={() => { if (!busy) onClose(); }} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md z-10 flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Request Revision</h3>
            <p className="text-sm text-gray-500 mt-0.5">Describe what needs to change</p>
          </div>
          <button onClick={onClose} disabled={busy}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
            <i className="fa-solid fa-lock text-orange-500 text-sm mt-0.5 flex-shrink-0"></i>
            <p className="text-xs text-orange-700 leading-relaxed">
              Funds remain locked in escrow. The creator will be notified and can resubmit updated work.
              You will need to review the new delivery before approving.
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              What needs to change? <span className="text-red-500">*</span>
            </label>
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              rows={5}
              placeholder="Be specific: describe exactly what needs to be changed, added, or removed…"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 resize-none"
            />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose} disabled={busy}
            className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={() => onSubmit(feedback)}
            disabled={!feedback.trim() || busy}
            className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
            {busy
              ? <><i className="fa-solid fa-spinner animate-spin"></i>Sending…</>
              : <><i className="fa-solid fa-rotate-left"></i>Request Revision</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DeliveryReviewPage() {
  const { id: jobId, milestoneId } = useParams<{ id: string; milestoneId: string }>();
  const router = useRouter();

  const [delivery, setDelivery] = useState<DeliveryData | null>(null);
  const [job, setJob] = useState<JobPostItem | null>(null);
  const [hiredCreator, setHiredCreator] = useState<JobProposalItem | null>(null);
  const [escrowId, setEscrowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Step state
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [markingOpen, setMarkingOpen] = useState(false);
  const [confirmingReview, setConfirmingReview] = useState(false);

  // Modal state
  const [showRevision, setShowRevision] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [showRelease, setShowRelease] = useState(false);

  // Action state
  const [approvingBusy, setApprovingBusy] = useState(false);
  const [releasingBusy, setReleasingBusy] = useState(false);
  const [revisionBusy, setRevisionBusy] = useState(false);
  const [actionDone, setActionDone] = useState<'revision' | 'released' | null>(null);

  const load = useCallback(async () => {
    if (!jobId || !milestoneId) return;
    setLoading(true);
    setError(null);
    try {
      const [jobData, escList] = await Promise.all([
        jobs.getById(jobId),
        escrowApi.list({ role: 'client', limit: 50 }),
      ]);
      setJob(jobData);
      const linked = escList.escrows.find(e => e.job_post_id === jobId);
      if (!linked) { setError('No escrow found for this project.'); return; }
      setEscrowId(linked.escrow_id);

      const deliveryData = await escrowApi.getDeliveryStatus(linked.escrow_id, milestoneId);
      setDelivery(deliveryData);

      const appData = await proposals.getForJob(jobId);
      const appList = appData?.proposals ?? (Array.isArray(appData) ? appData : []);
      const accepted = appList.find((a: { status: string }) => a.status === 'accepted');
      if (accepted) setHiredCreator(accepted);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [jobId, milestoneId]);

  useEffect(() => { load(); }, [load]);

  // Derived step
  const reviewStep: ReviewStep = delivery ? deriveStep(delivery) : 'open';

  // ── Step 1: client clicks "Open Drive Link" ────────────────────────────────
  const handleOpenDriveLink = async () => {
    if (!escrowId || !milestoneId || !delivery?.google_drive_link) return;
    // Open the link in a new tab immediately
    window.open(delivery.google_drive_link, '_blank', 'noopener,noreferrer');
    // Record the open if not already recorded
    if (!delivery.drive_link_opened_at) {
      setMarkingOpen(true);
      try {
        const result = await escrowApi.markDriveLinkOpened(escrowId, milestoneId);
        setDelivery(prev => prev ? { ...prev, drive_link_opened_at: result.drive_link_opened_at } : prev);
      } catch {
        // Non-blocking — link is still opened even if recording fails
      } finally {
        setMarkingOpen(false);
      }
    }
  };

  // ── Step 2: client checks "I have reviewed" ────────────────────────────────
  const handleConfirmReview = async () => {
    if (!escrowId || !milestoneId) return;
    setConfirmingReview(true);
    try {
      const result = await escrowApi.confirmReview(escrowId, milestoneId);
      setDelivery(prev => prev ? { ...prev, client_reviewed_at: result.client_reviewed_at } : prev);
      setReviewConfirmed(true);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setConfirmingReview(false);
    }
  };

  // ── Step 3: Approve ────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!escrowId || !milestoneId) return;
    setApprovingBusy(true);
    try {
      await escrowApi.approveMilestone(escrowId, milestoneId);
      setDelivery(prev => prev ? { ...prev, status: 'approved' } : prev);
      setShowApprove(false);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setApprovingBusy(false);
    }
  };

  // ── Step 4: Release ────────────────────────────────────────────────────────
  const handleRelease = async () => {
    if (!escrowId || !milestoneId) return;
    setReleasingBusy(true);
    try {
      await escrowApi.releaseMilestone(escrowId, milestoneId);
      setActionDone('released');
      setShowRelease(false);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setReleasingBusy(false);
    }
  };

  // ── Revision ───────────────────────────────────────────────────────────────
  const handleRevision = async (feedback: string) => {
    if (!escrowId || !milestoneId) return;
    setRevisionBusy(true);
    try {
      await escrowApi.requestRevision(escrowId, milestoneId, feedback);
      setActionDone('revision');
      setShowRevision(false);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setRevisionBusy(false);
    }
  };

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">Loading delivery…</p>
    </div>
  );

  if (error || !delivery) return (
    <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
      <i className="fa-solid fa-circle-exclamation text-4xl text-red-300 mb-4 block"></i>
      <p className="text-red-500 text-sm mb-4">{error || 'Delivery not found'}</p>
      <Link href={`/client/projects/${jobId}`}
        className="px-5 py-2.5 bg-cobalt text-white rounded-xl text-sm font-semibold">
        ← Back to Project
      </Link>
    </div>
  );

  // ── Action complete screens ────────────────────────────────────────────────
  if (actionDone === 'released') return (
    <div className="max-w-xl mx-auto text-center py-16">
      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <i className="fa-solid fa-circle-check text-emerald-600 text-4xl"></i>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-3">Payment Released!</h1>
      <p className="text-gray-500 mb-8">The funds have been released to the creator. The project is now complete.</p>
      <Link href={`/client/projects/${jobId}`}
        className="px-6 py-3 bg-cobalt text-white rounded-xl font-semibold hover:bg-blue-700 transition">
        Back to Project
      </Link>
    </div>
  );

  if (actionDone === 'revision') return (
    <div className="max-w-xl mx-auto text-center py-16">
      <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <i className="fa-solid fa-rotate-left text-orange-600 text-4xl"></i>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-3">Revision Requested</h1>
      <p className="text-gray-500 mb-8">
        The creator has been notified. When they resubmit, you will need to review the new version.
        Funds remain locked in escrow.
      </p>
      <Link href={`/client/projects/${jobId}`}
        className="px-6 py-3 bg-cobalt text-white rounded-xl font-semibold hover:bg-blue-700 transition">
        Back to Project
      </Link>
    </div>
  );

  const isDelivered = delivery.status === 'delivered';
  const isApproved = delivery.status === 'approved';
  const isTerminal = ['released', 'refunded', 'disputed'].includes(delivery.status);
  const isRevisionRequested = delivery.status === 'revision_requested';
  const creatorName = hiredCreator?.creator_name ?? 'Creator';

  // Optimistic state — if user just confirmed locally but API hasn't confirmed yet
  const driveOpened   = !!(delivery.drive_link_opened_at);
  const reviewDone    = !!(delivery.client_reviewed_at) || reviewConfirmed;
  const effectiveStep: ReviewStep = isApproved ? 'release'
    : reviewDone ? 'decide'
    : driveOpened ? 'review'
    : 'open';

  return (
    <>
      {/* Back nav */}
      <div className="mb-6">
        <Link href={`/client/projects/${jobId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-cobalt transition font-medium">
          <i className="fa-solid fa-arrow-left text-xs"></i>Back to Project
        </Link>
      </div>

      <div className="max-w-2xl mx-auto space-y-5">

        {/* ── Header ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <i className="fa-solid fa-box-open text-indigo-600 text-xl"></i>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900">Delivery Review</h1>
              <p className="text-sm text-gray-500 mt-0.5 truncate">{delivery.title}</p>
              {job && <p className="text-xs text-gray-400 mt-0.5 truncate">{job.title}</p>}
            </div>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0 ${
              isDelivered        ? 'bg-indigo-50 text-indigo-700' :
              isApproved         ? 'bg-teal-50 text-teal-700' :
              isRevisionRequested ? 'bg-orange-50 text-orange-700' :
              delivery.status === 'released' ? 'bg-emerald-50 text-emerald-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {isDelivered         ? 'Awaiting Review' :
               isApproved          ? 'Approved' :
               isRevisionRequested ? 'Revision Requested' :
               delivery.status === 'released' ? 'Released' :
               delivery.status}
            </span>
          </div>
        </div>

        {/* ── Step bar (only for deliveries awaiting action) ── */}
        {(isDelivered || isApproved) && !delivery.auto_released && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Review Progress</p>
            <StepBar step={effectiveStep} />
          </div>
        )}

        {/* ── Auto-release countdown ── */}
        {isDelivered && delivery.auto_release_at && !delivery.auto_released && (
          <Countdown autoReleaseAt={delivery.auto_release_at} />
        )}
        {delivery.auto_released && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-center">
            <i className="fa-solid fa-robot text-gray-400 text-2xl mb-2 block"></i>
            <p className="text-sm font-semibold text-gray-600">Payment was automatically released</p>
            <p className="text-xs text-gray-400 mt-1">The 48-hour review window expired without action.</p>
          </div>
        )}

        {/* ── Creator card ── */}
        {hiredCreator && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex items-center gap-4">
            {hiredCreator.creator_avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hiredCreator.creator_avatar} alt={creatorName}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-gray-100" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-cobalt flex items-center justify-center text-white font-bold flex-shrink-0">
                {creatorName[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{creatorName}</p>
              <p className="text-xs text-gray-400">{hiredCreator.creator_title || 'Creator'}</p>
            </div>
            {delivery.delivered_at && (
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-gray-400">Delivered</p>
                <p className="text-sm font-semibold text-gray-700">
                  {new Date(delivery.delivered_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Deliverable card ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-gray-900">Delivered Files</h2>

          {delivery.google_drive_link ? (
            <div className={`border rounded-xl p-4 transition-all ${
              driveOpened ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <i className="fa-brands fa-google-drive text-xl flex-shrink-0 text-emerald-600"></i>
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold mb-0.5 ${driveOpened ? 'text-emerald-800' : 'text-cobalt'}`}>
                      Google Drive Delivery
                    </p>
                    <p className="text-xs text-gray-500 truncate max-w-xs">{delivery.google_drive_link}</p>
                    {driveOpened && delivery.drive_link_opened_at && (
                      <p className="text-xs text-emerald-600 mt-0.5 font-medium">
                        <i className="fa-solid fa-check mr-1"></i>
                        Opened {new Date(delivery.drive_link_opened_at).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleOpenDriveLink}
                  disabled={markingOpen}
                  className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
                    driveOpened
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-cobalt text-white hover:bg-blue-700 shadow-lg shadow-blue-200 animate-pulse'
                  }`}>
                  {markingOpen
                    ? <><i className="fa-solid fa-spinner animate-spin text-xs"></i>Opening…</>
                    : driveOpened
                      ? <><i className="fa-solid fa-arrow-up-right-from-square text-xs"></i>Open Again</>
                      : <><i className="fa-solid fa-arrow-up-right-from-square text-xs"></i>Open Drive Link</>}
                </button>
              </div>
              {!driveOpened && (
                <p className="text-xs text-cobalt font-semibold mt-3 flex items-center gap-1.5">
                  <i className="fa-solid fa-circle-info"></i>
                  Click "Open Drive Link" above to view the deliverables and unlock the review process.
                </p>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center text-gray-400">
              <i className="fa-solid fa-link-slash block text-2xl mb-2"></i>
              <p className="text-sm">No Google Drive link provided.</p>
            </div>
          )}

          {delivery.delivery_notes && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Creator&apos;s Notes</p>
              <p className="text-sm text-gray-700 leading-relaxed">&ldquo;{delivery.delivery_notes}&rdquo;</p>
            </div>
          )}

          {delivery.delivery_history && delivery.delivery_history.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3">
                <i className="fa-solid fa-clock-rotate-left mr-1"></i>Previous Versions
              </p>
              <div className="space-y-2">
                {delivery.delivery_history.map((v, i) => (
                  <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-100">
                    <span className="text-xs text-gray-500 font-medium">Version {v.version}</span>
                    <div className="flex items-center gap-3">
                      {v.submitted_at && (
                        <span className="text-xs text-gray-400">{new Date(v.submitted_at).toLocaleDateString()}</span>
                      )}
                      <a href={v.google_drive_link} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-cobalt font-semibold hover:underline flex items-center gap-1">
                        <i className="fa-brands fa-google-drive text-[10px]"></i>View
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Payment amount ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Escrow Amount</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">${delivery.amount.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">After 8% platform fee</p>
              <p className="text-lg font-bold text-emerald-600">
                ${(delivery.amount * 0.92).toFixed(2)} to creator
              </p>
            </div>
          </div>
        </div>

        {/* ── STEP 2: Review confirmation checkbox ─────────────────────────────
            Shown only after drive link has been opened, before review is confirmed */}
        {isDelivered && driveOpened && !reviewDone && !delivery.auto_released && (
          <div className="bg-white rounded-2xl border-2 border-cobalt p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-magnifying-glass text-cobalt text-lg"></i>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Confirm Your Review</h3>
                <p className="text-sm text-gray-500">You&apos;ve opened the Drive link — have you reviewed the work?</p>
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer select-none bg-blue-50 border border-blue-200 rounded-xl p-4">
              <input
                type="checkbox"
                checked={reviewConfirmed}
                onChange={e => setReviewConfirmed(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded accent-cobalt flex-shrink-0 cursor-pointer"
              />
              <span className="text-sm text-gray-800 leading-relaxed">
                I have reviewed the delivered files and I&apos;m ready to make a decision.
              </span>
            </label>

            <button
              onClick={handleConfirmReview}
              disabled={!reviewConfirmed || confirmingReview}
              className="w-full py-3 bg-cobalt text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition disabled:opacity-40 flex items-center justify-center gap-2">
              {confirmingReview
                ? <><i className="fa-solid fa-spinner animate-spin"></i>Confirming…</>
                : <><i className="fa-solid fa-check"></i>Confirm Review — Proceed to Decision</>}
            </button>
          </div>
        )}

        {/* ── STEP 3: Action buttons (after review confirmed) ── */}
        {isDelivered && reviewDone && !delivery.auto_released && (
          <div className="space-y-3">
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 flex items-center gap-2">
              <i className="fa-solid fa-circle-check text-teal-600 text-sm flex-shrink-0"></i>
              <p className="text-sm text-teal-800 font-semibold">Review confirmed — choose your next action</p>
            </div>
            <button
              onClick={() => setShowApprove(true)}
              className="w-full py-4 bg-teal-600 text-white rounded-2xl font-bold text-base hover:bg-teal-700 transition flex items-center justify-center gap-3 shadow-lg shadow-teal-200">
              <i className="fa-solid fa-circle-check"></i>Approve Delivery
            </button>
            <button
              onClick={() => setShowRevision(true)}
              className="w-full py-3.5 bg-white border-2 border-orange-300 text-orange-700 rounded-2xl font-bold text-base hover:bg-orange-50 transition flex items-center justify-center gap-3">
              <i className="fa-solid fa-rotate-left"></i>Request Revision
            </button>
            <p className="text-xs text-center text-gray-400">
              Payment will auto-release after the countdown if no action is taken.
            </p>
          </div>
        )}

        {/* ── STEP 1 hint: must open link first ── */}
        {isDelivered && !driveOpened && !delivery.auto_released && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 text-center space-y-3">
            <i className="fa-solid fa-arrow-up-right-from-square text-cobalt text-2xl block"></i>
            <p className="font-bold text-cobalt">Open the Drive Link to Begin Review</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              You must open the Google Drive delivery link and review the work before you can approve or request revisions.
            </p>
            <button
              onClick={handleOpenDriveLink}
              disabled={markingOpen}
              className="inline-flex items-center gap-2 px-6 py-3 bg-cobalt text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition shadow-lg shadow-blue-200">
              {markingOpen
                ? <><i className="fa-solid fa-spinner animate-spin"></i>Opening…</>
                : <><i className="fa-brands fa-google-drive"></i>Open Drive Link to Review</>}
            </button>
          </div>
        )}

        {/* ── STEP 4: Release funds (after approval) ── */}
        {isApproved && (
          <div className="space-y-3">
            <div className="bg-teal-50 border-2 border-teal-300 rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-circle-check text-teal-600 text-lg"></i>
                <p className="font-bold text-teal-900">Delivery Approved</p>
              </div>
              <p className="text-sm text-teal-700 leading-relaxed">
                You have approved the work. Release the escrow funds to complete the project.
              </p>
            </div>
            <button
              onClick={() => setShowRelease(true)}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-base hover:bg-emerald-700 transition flex items-center justify-center gap-3 shadow-lg shadow-emerald-200">
              <i className="fa-solid fa-coins"></i>Release Payment — ${delivery.amount.toLocaleString()}
            </button>
          </div>
        )}

        {/* ── Terminal / revision-requested states ── */}
        {isRevisionRequested && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 text-center">
            <i className="fa-solid fa-rotate-left text-orange-500 text-2xl mb-2 block"></i>
            <p className="text-sm font-semibold text-orange-800">Revision Requested</p>
            <p className="text-xs text-orange-600 mt-1">The creator has been notified and will resubmit. You will need to review the new version.</p>
          </div>
        )}

        {isTerminal && !delivery.auto_released && delivery.status === 'released' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
            <i className="fa-solid fa-circle-check text-emerald-600 text-2xl mb-2 block"></i>
            <p className="text-sm font-semibold text-emerald-800">Payment has been released. Project complete.</p>
          </div>
        )}

        {/* ── Audit timeline ── */}
        {(delivery.delivered_at || delivery.drive_link_opened_at || delivery.client_reviewed_at) && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Review Timeline</h3>
            <div className="space-y-3">
              {[
                { label: 'Delivery submitted', ts: delivery.delivered_at, icon: 'fa-box-open', color: 'text-indigo-600 bg-indigo-50' },
                { label: 'Drive link opened', ts: delivery.drive_link_opened_at, icon: 'fa-arrow-up-right-from-square', color: 'text-cobalt bg-blue-50' },
                { label: 'Review confirmed',  ts: delivery.client_reviewed_at, icon: 'fa-magnifying-glass', color: 'text-teal-600 bg-teal-50' },
              ].map(({ label, ts, icon, color }) => (
                <div key={label} className={`flex items-center gap-3 p-3 rounded-xl ${ts ? color + ' border border-opacity-40' : 'bg-gray-50 text-gray-400'}`}>
                  <i className={`fa-solid ${icon} text-sm flex-shrink-0`}></i>
                  <span className="text-sm font-medium flex-1">{label}</span>
                  {ts ? (
                    <span className="text-xs font-semibold">
                      {new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Pending</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ── Modals ── */}
      {showRevision && (
        <RevisionModal
          onClose={() => setShowRevision(false)}
          onSubmit={handleRevision}
          busy={revisionBusy}
        />
      )}
      {showApprove && (
        <ApproveModal
          amount={delivery.amount}
          onConfirm={handleApprove}
          onCancel={() => setShowApprove(false)}
          busy={approvingBusy}
        />
      )}
      {showRelease && (
        <ReleaseModal
          amount={delivery.amount}
          creatorName={creatorName}
          onConfirm={handleRelease}
          onCancel={() => setShowRelease(false)}
          busy={releasingBusy}
        />
      )}
    </>
  );
}
