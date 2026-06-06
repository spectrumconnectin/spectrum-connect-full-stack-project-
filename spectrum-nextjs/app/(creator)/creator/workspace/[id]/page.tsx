'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { proposals, escrow as escrowApi, messaging, ProposalDetail, EscrowMilestone, currencySymbol } from '@/lib/api';

// ── Deadline countdown ────────────────────────────────────────────────────────
function useDeadlineCountdown(deadlineAt?: string) {
  const [label, setLabel] = useState('');
  const [expired, setExpired] = useState(false);
  const [urgency, setUrgency] = useState<'ok' | 'soon' | 'overdue'>('ok');

  useEffect(() => {
    if (!deadlineAt) return;
    const tick = () => {
      const diff = new Date(deadlineAt).getTime() - Date.now();
      if (diff <= 0) {
        setExpired(true);
        setUrgency('overdue');
        const over = Math.abs(diff);
        const d = Math.floor(over / 86400000);
        setLabel(d > 0 ? `${d}d overdue` : 'Due today — overdue');
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (diff < 86400000) setUrgency('soon');         // < 24 h
      else if (diff < 3 * 86400000) setUrgency('soon'); // < 3 days
      else setUrgency('ok');
      if (d > 0) setLabel(`${d}d ${h}h left`);
      else if (h > 0) setLabel(`${h}h ${m}m left`);
      else setLabel(`${m}m left`);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [deadlineAt]);

  return { label, expired, urgency };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function validateGoogleDriveLink(link: string): string | null {
  if (!link.trim()) return 'A Google Drive link is required.';
  const valid = [
    'https://drive.google.com/',
    'https://docs.google.com/',
    'https://sheets.google.com/',
    'https://slides.google.com/',
  ];
  if (!valid.some(prefix => link.trim().startsWith(prefix))) {
    return 'Link must start with https://drive.google.com/ or https://docs.google.com/';
  }
  return null;
}

function statusColor(status: string) {
  const map: Record<string, string> = {
    pending:            'bg-gray-100 text-gray-500',
    funded:             'bg-blue-50 text-blue-700',
    delivered:          'bg-amber-50 text-amber-700',
    revision_requested: 'bg-orange-50 text-orange-700',
    approved:           'bg-emerald-50 text-emerald-700',
    released:           'bg-green-100 text-green-700',
    disputed:           'bg-red-50 text-red-700',
    refunded:           'bg-gray-100 text-gray-500',
  };
  return map[status] ?? 'bg-gray-100 text-gray-500';
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending:            'Pending',
    funded:             'Funded — Work in Progress',
    delivered:          'Delivered — Awaiting Review',
    revision_requested: 'Revision Requested',
    approved:           'Approved',
    released:           'Payment Released',
    disputed:           'Disputed',
    refunded:           'Refunded',
  };
  return map[status] ?? status;
}

// Returns badge colour based on the combo of application status + job status
function getWorkspaceBadge(appStatus: string, jobStatus?: string): { label: string; style: string } {
  // For hired creators, job_status is the real current stage
  if (appStatus === 'accepted' && jobStatus) {
    const jobLabels: Record<string, string> = {
      in_progress:        'Active',
      pending_funding:    'Awaiting Funding',
      delivered:          'Delivered — Awaiting Review',
      revision_requested: 'Revision Requested',
      approved:           'Approved',
      completed:          'Completed',
      cancelled:          'Cancelled',
    };
    const jobStyles: Record<string, string> = {
      in_progress:        'bg-emerald-50 text-emerald-700',
      pending_funding:    'bg-amber-50 text-amber-700',
      delivered:          'bg-indigo-50 text-indigo-700',
      revision_requested: 'bg-orange-50 text-orange-700',
      approved:           'bg-teal-50 text-teal-700',
      completed:          'bg-gray-100 text-gray-600',
      cancelled:          'bg-red-50 text-red-600',
    };
    if (jobLabels[jobStatus]) {
      return { label: jobLabels[jobStatus], style: jobStyles[jobStatus] ?? 'bg-gray-100 text-gray-600' };
    }
  }
  const appMap: Record<string, { label: string; style: string }> = {
    submitted:    { label: 'Under Review',  style: 'bg-blue-50 text-blue-700' },
    shortlisted:  { label: 'Shortlisted',   style: 'bg-purple-50 text-purple-700' },
    interviewing: { label: 'Interviewing',  style: 'bg-amber-50 text-amber-700' },
    accepted:     { label: 'Hired',         style: 'bg-emerald-50 text-emerald-700' },
    rejected:     { label: 'Declined',      style: 'bg-rose-50 text-rose-700' },
    withdrawn:    { label: 'Withdrawn',     style: 'bg-gray-100 text-gray-500' },
  };
  return appMap[appStatus] ?? { label: appStatus, style: 'bg-gray-100 text-gray-600' };
}

// ── Delivery Modal ────────────────────────────────────────────────────────────
function DeliveryModal({
  milestone,
  escrowId,
  onClose,
  onSuccess,
}: {
  milestone: EscrowMilestone;
  escrowId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [driveLink, setDriveLink] = useState(milestone.google_drive_link || '');
  const [notes, setNotes] = useState(milestone.delivery_notes || '');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isResubmit = milestone.status === 'revision_requested';

  const handleSubmit = async () => {
    const err = validateGoogleDriveLink(driveLink);
    if (err) { setLinkError(err); return; }
    setLinkError(null);
    setSubmitting(true);
    setError(null);
    try {
      await escrowApi.deliverMilestone(escrowId, milestone.milestone_id, {
        google_drive_link: driveLink.trim(),
        delivery_notes: notes.trim() || undefined,
      });
      onSuccess();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => { if (!submitting) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <i className="fa-solid fa-box-open text-lg"></i>
            </div>
            <div>
              <h2 className="text-lg font-bold">{isResubmit ? 'Resubmit Delivery' : 'Submit Delivery'}</h2>
              <p className="text-emerald-100 text-xs truncate max-w-xs">{milestone.title}</p>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 space-y-5">
          {/* Info */}
          <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <i className="fa-solid fa-info-circle text-blue-500 mt-0.5 flex-shrink-0"></i>
            <p className="text-xs text-blue-800 leading-relaxed">
              Upload your work to Google Drive and share the link below. The client will be notified and can review your delivery before releasing payment.
            </p>
          </div>

          {isResubmit && (
            <div className="flex gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
              <i className="fa-solid fa-rotate text-orange-500 mt-0.5 flex-shrink-0"></i>
              <p className="text-xs text-orange-800 leading-relaxed">
                The client requested revisions. Update your Google Drive link with the revised work.
              </p>
            </div>
          )}

          {/* Google Drive Link — REQUIRED */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Google Drive Link <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <i className="fa-brands fa-google-drive absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type="url"
                value={driveLink}
                onChange={e => { setDriveLink(e.target.value); setLinkError(null); }}
                placeholder="https://drive.google.com/file/d/..."
                className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition ${
                  linkError
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                    : 'border-gray-200 focus:border-emerald-500 focus:ring-emerald-100'
                }`}
              />
            </div>
            {linkError && (
              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                <i className="fa-solid fa-circle-exclamation"></i>{linkError}
              </p>
            )}
            {driveLink && !linkError && validateGoogleDriveLink(driveLink) === null && (
              <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
                <i className="fa-solid fa-circle-check"></i>Valid Google Drive link
              </p>
            )}
          </div>

          {/* Delivery Notes — optional */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Delivery Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Describe what you've delivered — what's in the folder, how to access the files, any notes for the client…"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{notes.length}/1000</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              <i className="fa-solid fa-circle-exclamation mr-2"></i>{error}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} disabled={submitting}
              className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition text-sm disabled:opacity-50">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 transition text-sm flex items-center justify-center gap-2">
              {submitting
                ? <><i className="fa-solid fa-spinner animate-spin"></i>Submitting…</>
                : <><i className="fa-solid fa-paper-plane"></i>{isResubmit ? 'Resubmit' : 'Submit Delivery'}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Workspace Page ───────────────────────────────────────────────────────
export default function CreatorWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [data, setData] = useState<ProposalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'deliverables' | 'payment'>('overview');
  const [deliveringMilestone, setDeliveringMilestone] = useState<EscrowMilestone | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    proposals.getDetail(id)
      .then(d => setData(d))
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Deadline countdown — must be declared before any early return
  const deadlineData = useDeadlineCountdown((data as (typeof data & { deadline_at?: string }) | null)?.deadline_at);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">Loading workspace…</p>
    </div>
  );

  if (error || !data) return (
    <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
      <i className="fa-solid fa-circle-exclamation text-4xl text-red-300 mb-4 block"></i>
      <p className="text-red-500 text-sm mb-4">{error || 'Workspace not found'}</p>
      <button onClick={() => router.push('/creator/projects')}
        className="px-5 py-2.5 bg-cobalt text-white rounded-xl text-sm font-semibold">
        ← Back to My Work
      </button>
    </div>
  );

  const { escrow } = data;
  const fundedMilestones = escrow?.milestones.filter(m => m.status === 'funded') ?? [];
  const deliveredMilestones = escrow?.milestones.filter(m => ['delivered','revision_requested'].includes(m.status)) ?? [];
  const releasedMilestones = escrow?.milestones.filter(m => m.status === 'released') ?? [];
  const canDeliver = fundedMilestones.length > 0 || deliveredMilestones.some(m => m.status === 'revision_requested');
  const isJobCompleted = data.job_status === 'completed';
  const { label: statusBadgeLabel, style: statusBadgeStyle } = getWorkspaceBadge(data.status, data.job_status);
  const isOverdue = deadlineData.expired && !['completed', 'delivered', 'approved'].includes(data.job_status ?? '');

  return (
    <>
      {/* Back nav */}
      <div className="mb-6">
        <Link href="/creator/projects"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-cobalt transition font-medium">
          <i className="fa-solid fa-arrow-left text-xs"></i>Back to My Work
        </Link>
      </div>

      {/* Overdue banner — deadline passed, work not yet delivered */}
      {isOverdue && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl px-6 py-5 mb-6 flex items-start gap-4">
          <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <i className="fa-solid fa-clock text-white text-xl"></i>
          </div>
          <div>
            <p className="font-bold text-red-900 text-lg">Deadline Passed — Deliver ASAP</p>
            <p className="text-red-700 text-sm mt-1 leading-relaxed">
              Your agreed delivery deadline has passed. Submit your work immediately to avoid a negative review.
              The client may cancel the project or hire a replacement creator.
            </p>
          </div>
          <span className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0 mt-0.5 whitespace-nowrap">
            {deadlineData.label}
          </span>
        </div>
      )}

      {/* Completion banner */}
      {isJobCompleted && (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl px-6 py-5 mb-6 flex items-start gap-4">
          <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <i className="fa-solid fa-trophy text-white text-xl"></i>
          </div>
          <div>
            <p className="font-bold text-emerald-900 text-lg">Project Completed!</p>
            <p className="text-emerald-700 text-sm mt-1">
              This project has been marked as complete by the client. Payment has been released to your account.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{data.job_title}</h1>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${statusBadgeStyle}`}>
                {statusBadgeLabel}
              </span>
              {data.job_department && (
                <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full capitalize">{data.job_department}</span>
              )}
              {/* Deadline countdown badge */}
              {(data as ProposalDetail & { deadline_at?: string }).deadline_at && !isJobCompleted && deadlineData.label && (
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${
                  deadlineData.urgency === 'overdue' ? 'bg-red-100 text-red-700' :
                  deadlineData.urgency === 'soon'    ? 'bg-amber-100 text-amber-700' :
                                                       'bg-blue-50 text-cobalt'
                }`}>
                  <i className="fa-solid fa-clock text-[10px]"></i>
                  {deadlineData.label}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
              {data.client && (
                <span className="flex items-center gap-1.5">
                  <i className="fa-solid fa-user text-cobalt text-xs"></i>
                  Client: <span className="font-medium text-gray-900">{data.client.display_name || data.client.username}</span>
                </span>
              )}
              {(data.job_budget_min || data.job_budget_max) && (
                <span className="flex items-center gap-1.5">
                  <i className="fa-solid fa-wallet text-cobalt text-xs"></i>
                  {(() => {
                    const sym = currencySymbol((data as ProposalDetail & { currency?: string }).currency);
                    if (data.job_budget_min && data.job_budget_max)
                      return data.job_budget_min === data.job_budget_max
                        ? `${sym}${data.job_budget_min.toLocaleString()}`
                        : `${sym}${data.job_budget_min.toLocaleString()}–${sym}${data.job_budget_max.toLocaleString()}`;
                    if (data.job_budget_min) return `${sym}${data.job_budget_min.toLocaleString()}+`;
                    return `${sym}${data.job_budget_max?.toLocaleString()}`;
                  })()}
                </span>
              )}
              {data.job_location && (
                <span className="flex items-center gap-1.5">
                  <i className="fa-solid fa-location-dot text-gray-400 text-xs"></i>{data.job_location}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {data.client_id && (
              <Link href={`/creator/messages?with=${data.client_id}`}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition flex items-center gap-2">
                <i className="fa-solid fa-message"></i>Message Client
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Escrow status bar (if hired) */}
      {data.status === 'accepted' && escrow && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Total Escrow</p>
            <p className="text-2xl font-bold text-gray-900">${escrow.total_amount.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Funded</p>
            <p className={`text-2xl font-bold ${escrow.funded_amount > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
              ${escrow.funded_amount.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Released to You</p>
            <p className="text-2xl font-bold text-gray-900">${escrow.released_amount.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="flex border-b border-gray-200 px-2">
          {([
            { key: 'overview',     label: 'Overview',     icon: 'fa-circle-info' },
            { key: 'deliverables', label: 'Deliverables', icon: 'fa-box-open' },
            { key: 'payment',      label: 'Payment',      icon: 'fa-shield-halved' },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-6 py-4 text-sm font-semibold whitespace-nowrap flex items-center gap-2 transition border-b-2 ${
                activeTab === t.key
                  ? 'text-cobalt border-cobalt'
                  : 'text-gray-500 border-transparent hover:text-gray-900'
              }`}>
              <i className={`fa-solid ${t.icon} text-xs`}></i>{t.label}
            </button>
          ))}
        </div>

        <div className="p-6">

          {/* ── Overview Tab ── */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Project Details</h3>
                {data.job_description ? (
                  <p className="text-sm text-gray-600 leading-relaxed">{data.job_description}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No description provided.</p>
                )}
              </div>

              {data.job_skills && data.job_skills.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Skills Required</h3>
                  <div className="flex flex-wrap gap-2">
                    {data.job_skills.map(s => (
                      <span key={s} className="text-xs px-2.5 py-1 bg-blue-50 text-cobalt rounded-full font-medium">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Your Application</h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  {data.cover_letter && (
                    <p className="text-sm text-gray-600 italic">&ldquo;{data.cover_letter}&rdquo;</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap pt-1">
                    {data.proposed_budget && (
                      <span><i className="fa-solid fa-wallet mr-1"></i>Proposed: ${data.proposed_budget.toLocaleString()}</span>
                    )}
                    {data.role && (
                      <span><i className="fa-solid fa-briefcase mr-1"></i>{data.role}</span>
                    )}
                    {data.submitted_at && (
                      <span><i className="fa-regular fa-calendar mr-1"></i>Applied {new Date(data.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Application status progress */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Application Status</h3>
                <div className="flex items-center gap-0 flex-wrap">
                  {['submitted', 'shortlisted', 'interviewing', 'accepted'].map((step, i) => {
                    const statusOrder = ['submitted', 'shortlisted', 'interviewing', 'accepted'];
                    const currentIdx = statusOrder.indexOf(data.status);
                    const stepIdx = statusOrder.indexOf(step);
                    const done = currentIdx >= stepIdx;
                    const labels: Record<string, string> = {
                      submitted: 'Applied', shortlisted: 'Shortlisted',
                      interviewing: 'Interviewing', accepted: 'Hired',
                    };
                    return (
                      <div key={step} className="flex items-center">
                        <div className={`flex flex-col items-center gap-1`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            done ? 'bg-cobalt text-white' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {done ? <i className="fa-solid fa-check text-xs"></i> : i + 1}
                          </div>
                          <span className={`text-xs whitespace-nowrap ${done ? 'text-cobalt font-semibold' : 'text-gray-400'}`}>
                            {labels[step]}
                          </span>
                        </div>
                        {i < 3 && (
                          <div className={`w-12 h-0.5 -mt-5 mx-1 ${done && currentIdx > stepIdx ? 'bg-cobalt' : 'bg-gray-200'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Deliverables Tab ── */}
          {activeTab === 'deliverables' && (
            <div className="space-y-6">
              {data.status !== 'accepted' ? (
                <div className="text-center py-12 text-gray-400">
                  <i className="fa-solid fa-lock text-4xl mb-3 block text-gray-300"></i>
                  <p className="text-sm font-medium text-gray-500">Deliverables available after you&apos;re hired</p>
                  <p className="text-xs mt-1">Once the client hires you, you can submit your work here.</p>
                </div>
              ) : !escrow ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                  <div className="flex gap-3">
                    <i className="fa-solid fa-hourglass-half text-amber-500 mt-0.5"></i>
                    <div>
                      <p className="text-sm font-semibold text-amber-800">Waiting for escrow setup</p>
                      <p className="text-xs text-amber-700 mt-0.5">The client needs to create and fund escrow before you can submit deliveries.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Milestone list with deliver buttons */}
                  <div className="space-y-4">
                    {escrow.milestones.map(m => (
                      <div key={m.milestone_id} className="border border-gray-200 rounded-xl p-5">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">{m.title}</h4>
                            <p className="text-sm text-gray-500">${m.amount.toLocaleString()}</p>
                          </div>
                          <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0 ${statusColor(m.status)}`}>
                            {statusLabel(m.status)}
                          </span>
                        </div>

                        {/* Show delivered work */}
                        {m.google_drive_link && (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-3">
                            <p className="text-xs font-semibold text-emerald-800 mb-1.5">
                              <i className="fa-brands fa-google-drive mr-1.5"></i>Delivered Work
                            </p>
                            <a href={m.google_drive_link} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-cobalt underline break-all">
                              {m.google_drive_link}
                            </a>
                            {m.delivery_notes && (
                              <p className="text-xs text-emerald-700 mt-2 italic">&ldquo;{m.delivery_notes}&rdquo;</p>
                            )}
                            {m.delivered_at && (
                              <p className="text-xs text-emerald-600 mt-1">
                                <i className="fa-regular fa-clock mr-1"></i>
                                Submitted {new Date(m.delivered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Revision requested notice */}
                        {m.status === 'revision_requested' && (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                            <p className="text-xs font-semibold text-orange-800">
                              <i className="fa-solid fa-rotate mr-1.5"></i>Client requested revisions — please update your work and resubmit.
                            </p>
                          </div>
                        )}

                        {/* Action button */}
                        {(m.status === 'funded' || m.status === 'revision_requested') && (
                          <button
                            onClick={() => setDeliveringMilestone(m)}
                            className="mt-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition flex items-center gap-2">
                            <i className="fa-solid fa-box-open text-xs"></i>
                            {m.status === 'revision_requested' ? 'Resubmit Delivery' : 'Submit Delivery'}
                          </button>
                        )}

                        {m.status === 'delivered' && (
                          <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg mt-2">
                            <i className="fa-solid fa-hourglass-half mr-1.5"></i>Awaiting client review — no action needed.
                          </p>
                        )}

                        {m.status === 'approved' && (
                          <p className="text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg mt-2">
                            <i className="fa-solid fa-circle-check mr-1.5"></i>Work approved — client will release payment soon.
                          </p>
                        )}

                        {m.status === 'released' && (
                          <p className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg mt-2">
                            <i className="fa-solid fa-money-bill-wave mr-1.5"></i>Payment released to your account.
                          </p>
                        )}

                        {m.status === 'pending' && (
                          <p className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg mt-2">
                            <i className="fa-solid fa-clock mr-1.5"></i>Waiting for client to fund this milestone.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Empty funded milestones */}
                  {escrow.milestones.every(m => m.status === 'pending') && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
                      <i className="fa-solid fa-hourglass-half text-amber-500 text-2xl mb-2 block"></i>
                      <p className="text-sm font-semibold text-amber-800">No milestones funded yet</p>
                      <p className="text-xs text-amber-700 mt-1">The client needs to fund milestones before you can submit deliveries.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Payment Tab ── */}
          {activeTab === 'payment' && (
            <div className="space-y-5">
              {!escrow ? (
                <div className="text-center py-12 text-gray-400">
                  <i className="fa-solid fa-shield-halved text-4xl mb-3 block text-gray-300"></i>
                  <p className="text-sm font-medium text-gray-500">No escrow yet</p>
                  <p className="text-xs mt-1">Payment information will appear here once the client sets up escrow.</p>
                </div>
              ) : (
                <>
                  {/* Escrow overview */}
                  <div className="bg-gray-50 rounded-xl p-5">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Escrow Status</p>
                        <p className="font-semibold text-gray-900 capitalize">{escrow.status}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Total Value</p>
                        <p className="font-semibold text-gray-900">${escrow.total_amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Funded</p>
                        <p className={`font-semibold ${escrow.funded_amount > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                          ${escrow.funded_amount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Released to You</p>
                        <p className="font-semibold text-gray-900">${escrow.released_amount.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Fee info */}
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <p className="text-xs font-semibold text-blue-800 mb-1">
                      <i className="fa-solid fa-circle-info mr-1.5"></i>Platform Fee
                    </p>
                    <p className="text-xs text-blue-700">
                      An 8% platform fee is deducted from each milestone payout.
                      Example: a $100 milestone pays you $92.
                    </p>
                  </div>

                  {/* Milestone breakdown */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Milestone Breakdown</h3>
                    <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
                      {escrow.milestones.map(m => {
                        const payout = m.amount * 0.92;
                        return (
                          <div key={m.milestone_id} className="px-4 py-3 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{m.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                You receive: <span className="font-semibold text-gray-700">${payout.toFixed(2)}</span>
                                <span className="text-gray-400 ml-1">(after 8% fee)</span>
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold text-gray-900">${m.amount.toLocaleString()}</p>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor(m.status)}`}>
                                {statusLabel(m.status)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delivery Modal */}
      {deliveringMilestone && escrow && (
        <DeliveryModal
          milestone={deliveringMilestone}
          escrowId={escrow.escrow_id}
          onClose={() => setDeliveringMilestone(null)}
          onSuccess={() => {
            setDeliveringMilestone(null);
            load(); // refresh workspace data
          }}
        />
      )}
    </>
  );
}
