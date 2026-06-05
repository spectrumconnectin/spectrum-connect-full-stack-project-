'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { escrow as escrowApi, jobs, proposals, JobPostItem, JobProposalItem } from '@/lib/api';

// ── Countdown component ───────────────────────────────────────────────────────
function Countdown({ autoReleaseAt }: { autoReleaseAt: string }) {
  const [remaining, setRemaining] = useState('');
  const [urgency, setUrgency] = useState<'normal' | 'warning' | 'critical'>('normal');

  useEffect(() => {
    const target = new Date(autoReleaseAt).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setRemaining('Releasing now…');
        setUrgency('critical');
        return;
      }
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
    normal:   'bg-blue-50 border-blue-200 text-blue-800',
    warning:  'bg-amber-50 border-amber-300 text-amber-800',
    critical: 'bg-red-50 border-red-300 text-red-800',
  };
  const icons = { normal: 'fa-clock', warning: 'fa-triangle-exclamation', critical: 'fa-fire' };

  return (
    <div className={`rounded-2xl border-2 p-5 ${colours[urgency]}`}>
      <div className="flex items-center gap-3">
        <i className={`fa-solid ${icons[urgency]} text-2xl`}></i>
        <div>
          <p className="font-bold text-lg">{remaining}</p>
          <p className="text-sm opacity-80">until automatic payment release</p>
        </div>
      </div>
      {urgency === 'critical' && (
        <p className="text-xs mt-2 font-semibold opacity-90">
          ⚡ Payment will be auto-released very soon. Take action now.
        </p>
      )}
      {urgency === 'warning' && (
        <p className="text-xs mt-2 opacity-80">
          Review the delivery and take action before the deadline.
        </p>
      )}
    </div>
  );
}

// ── Revision modal ────────────────────────────────────────────────────────────
function RevisionModal({
  onClose,
  onSubmit,
  submitting,
}: {
  onClose: () => void;
  onSubmit: (feedback: string) => void;
  submitting: boolean;
}) {
  const [feedback, setFeedback] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={() => { if (!submitting) onClose(); }} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md z-10 flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Request Revision</h3>
            <p className="text-sm text-gray-500 mt-0.5">Describe what needs to change</p>
          </div>
          <button onClick={onClose} disabled={submitting}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
            <i className="fa-solid fa-lock text-orange-500 text-sm mt-0.5 flex-shrink-0"></i>
            <p className="text-xs text-orange-700 leading-relaxed">
              Funds remain locked in escrow. The creator will be notified and can resubmit updated work.
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
          <button onClick={onClose} disabled={submitting}
            className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={() => onSubmit(feedback)}
            disabled={!feedback.trim() || submitting}
            className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting
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

  const [delivery, setDelivery] = useState<Awaited<ReturnType<typeof escrowApi.getDeliveryStatus>> | null>(null);
  const [job, setJob] = useState<JobPostItem | null>(null);
  const [hiredCreator, setHiredCreator] = useState<JobProposalItem | null>(null);
  const [escrowId, setEscrowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showRevision, setShowRevision] = useState(false);
  const [requestingRevision, setRequestingRevision] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [actionDone, setActionDone] = useState<'revision' | 'released' | null>(null);

  const load = useCallback(async () => {
    if (!jobId || !milestoneId) return;
    setLoading(true);
    setError(null);
    try {
      // Get job + escrow
      const [jobData, escList] = await Promise.all([
        jobs.getById(jobId),
        escrowApi.list({ role: 'client', limit: 50 }),
      ]);
      setJob(jobData);

      const linkedEscrow = escList.escrows.find(e => e.job_post_id === jobId);
      if (!linkedEscrow) { setError('No escrow found for this project.'); return; }
      setEscrowId(linkedEscrow.escrow_id);

      // Get delivery status
      const deliveryData = await escrowApi.getDeliveryStatus(linkedEscrow.escrow_id, milestoneId);
      setDelivery(deliveryData);

      // Get hired creator info
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

  const handleRelease = async () => {
    if (!escrowId || !milestoneId) return;
    if (!confirm('Release payment to the creator? This cannot be undone.')) return;
    setReleasing(true);
    try {
      // Approve first if in 'delivered' state, then release
      if (delivery?.status === 'delivered') {
        await escrowApi.approveMilestone(escrowId, milestoneId);
      }
      await escrowApi.releaseMilestone(escrowId, milestoneId);
      setActionDone('released');
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setReleasing(false);
    }
  };

  const handleRevision = async (feedback: string) => {
    if (!escrowId || !milestoneId) return;
    setRequestingRevision(true);
    try {
      await escrowApi.requestRevision(escrowId, milestoneId, feedback);
      setActionDone('revision');
      setShowRevision(false);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setRequestingRevision(false);
    }
  };

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

  // Action complete states
  if (actionDone === 'released') return (
    <div className="max-w-xl mx-auto text-center py-16">
      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <i className="fa-solid fa-circle-check text-emerald-600 text-4xl"></i>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-3">Payment Released!</h1>
      <p className="text-gray-500 mb-8">
        The funds have been released to the creator. The project is now complete.
      </p>
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
        The creator has been notified and can now resubmit updated work. Funds remain locked in escrow.
      </p>
      <Link href={`/client/projects/${jobId}`}
        className="px-6 py-3 bg-cobalt text-white rounded-xl font-semibold hover:bg-blue-700 transition">
        Back to Project
      </Link>
    </div>
  );

  const isDelivered = delivery.status === 'delivered';
  const isAlreadyActioned = ['approved', 'released', 'revision_requested'].includes(delivery.status);

  return (
    <>
      {/* Back nav */}
      <div className="mb-6">
        <Link href={`/client/projects/${jobId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-cobalt transition font-medium">
          <i className="fa-solid fa-arrow-left text-xs"></i>Back to Project
        </Link>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <i className="fa-solid fa-box-open text-indigo-600 text-xl"></i>
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">Delivery Review</h1>
              <p className="text-sm text-gray-500 mt-0.5">{delivery.title}</p>
              {job && <p className="text-xs text-gray-400 mt-1">{job.title}</p>}
            </div>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0 ${
              delivery.status === 'delivered' ? 'bg-indigo-50 text-indigo-700' :
              delivery.status === 'revision_requested' ? 'bg-orange-50 text-orange-700' :
              delivery.status === 'released' ? 'bg-green-100 text-green-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {delivery.status === 'delivered' ? 'Awaiting Review' :
               delivery.status === 'revision_requested' ? 'Revision Requested' :
               delivery.status === 'released' ? 'Payment Released' :
               delivery.status}
            </span>
          </div>
        </div>

        {/* Auto-release countdown */}
        {isDelivered && delivery.auto_release_at && (
          <Countdown autoReleaseAt={delivery.auto_release_at} />
        )}
        {delivery.auto_released && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-center">
            <i className="fa-solid fa-robot text-gray-400 text-2xl mb-2 block"></i>
            <p className="text-sm font-semibold text-gray-600">Payment was automatically released</p>
            <p className="text-xs text-gray-400 mt-1">The 48-hour review window expired without action.</p>
          </div>
        )}

        {/* Creator info */}
        {hiredCreator && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex items-center gap-4">
            {hiredCreator.creator_avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hiredCreator.creator_avatar} alt={hiredCreator.creator_name}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-cobalt flex items-center justify-center text-white font-bold flex-shrink-0">
                {hiredCreator.creator_name[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900">{hiredCreator.creator_name}</p>
              <p className="text-xs text-gray-400">{hiredCreator.creator_title || 'Creator'}</p>
            </div>
            {delivery.delivered_at && (
              <div className="ml-auto text-right">
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

        {/* The deliverable */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-gray-900">Deliverables</h2>

          {/* Google Drive link */}
          {delivery.google_drive_link ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <i className="fa-brands fa-google-drive text-emerald-600 text-lg flex-shrink-0"></i>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-emerald-800 mb-0.5">Google Drive</p>
                    <p className="text-xs text-emerald-700 truncate max-w-xs">{delivery.google_drive_link}</p>
                  </div>
                </div>
                <a
                  href={delivery.google_drive_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition">
                  <i className="fa-solid fa-arrow-up-right-from-square text-xs"></i>
                  View Delivery
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center text-gray-400">
              <i className="fa-solid fa-link-slash block text-2xl mb-2"></i>
              <p className="text-sm">No Google Drive link provided.</p>
            </div>
          )}

          {/* Delivery notes */}
          {delivery.delivery_notes && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Creator&apos;s Notes</p>
              <p className="text-sm text-gray-700 leading-relaxed">&ldquo;{delivery.delivery_notes}&rdquo;</p>
            </div>
          )}
        </div>

        {/* Payment info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Escrow Amount</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">${delivery.amount.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">After 8% platform fee</p>
              <p className="text-lg font-bold text-emerald-600">${(delivery.amount * 0.92).toFixed(2)} to creator</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {isDelivered && !delivery.auto_released && (
          <div className="space-y-3">
            <button
              onClick={handleRelease}
              disabled={releasing}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-base hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg shadow-emerald-200">
              {releasing
                ? <><i className="fa-solid fa-spinner animate-spin"></i>Releasing…</>
                : <><i className="fa-solid fa-coins"></i>Release Payment — ${delivery.amount.toLocaleString()}</>}
            </button>
            <button
              onClick={() => setShowRevision(true)}
              disabled={releasing}
              className="w-full py-3.5 bg-white border-2 border-orange-300 text-orange-700 rounded-2xl font-bold text-base hover:bg-orange-50 transition disabled:opacity-50 flex items-center justify-center gap-3">
              <i className="fa-solid fa-rotate-left"></i>Request Revision
            </button>
            <p className="text-xs text-center text-gray-400">
              If you don&apos;t take action, payment will be automatically released after the countdown expires.
            </p>
          </div>
        )}

        {isAlreadyActioned && !delivery.auto_released && (
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 text-center">
            <i className="fa-solid fa-circle-check text-teal-600 text-2xl mb-2 block"></i>
            <p className="text-sm font-semibold text-teal-800">
              {delivery.status === 'released' ? 'Payment has been released.' :
               delivery.status === 'approved' ? 'Work approved — payment release in progress.' :
               'Revision has been requested. Awaiting resubmission.'}
            </p>
          </div>
        )}
      </div>

      {showRevision && (
        <RevisionModal
          onClose={() => setShowRevision(false)}
          onSubmit={handleRevision}
          submitting={requestingRevision}
        />
      )}
    </>
  );
}
