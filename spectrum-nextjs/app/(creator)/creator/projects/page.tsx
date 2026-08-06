'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { proposals, escrow, ProposalItem, EscrowListItem } from '@/lib/api';
import SegmentedTabs from '@/components/SegmentedTabs';

// Mockup-style Open/Active/Delivered/Completed segments, mapped onto the
// real application-status + job-stage fields below. "All" is kept as an
// escape hatch so rejected/withdrawn/cancelled/closed items are never
// silently hidden — they just don't fit any of the four real-world buckets.
type ProjectSegment = 'all' | 'open' | 'active' | 'delivered' | 'completed';

function matchesSegment(app: ProposalItem, segment: ProjectSegment): boolean {
  if (segment === 'all') return true;
  if (segment === 'open') return ['submitted', 'shortlisted', 'interviewing'].includes(app.status);
  if (app.status !== 'accepted') return false;
  if (segment === 'active') return ['pending_funding', 'in_progress', 'revision_requested'].includes(app.job_status ?? '');
  if (segment === 'delivered') return ['delivered', 'approved'].includes(app.job_status ?? '');
  if (segment === 'completed') return app.job_status === 'completed';
  return false;
}

const APP_STATUS_STYLE: Record<string, string> = {
  submitted:    'bg-blue-50 text-blue-700',
  shortlisted:  'bg-purple-50 text-purple-700',
  interviewing: 'bg-amber-50 text-amber-700',
  accepted:     'bg-emerald-50 text-emerald-700',
  rejected:     'bg-rose-50 text-rose-700',
  withdrawn:    'bg-gray-100 text-gray-500',
};

const APP_STATUS_LABEL: Record<string, string> = {
  submitted:    'Under Review',
  shortlisted:  'Shortlisted',
  interviewing: 'Interviewing',
  accepted:     'Hired',
  rejected:     'Declined',
  withdrawn:    'Withdrawn',
};

// When the app is "accepted" (hired), the meaningful status is the job's status
// not the application status. Map job_status to creator-facing labels.
const JOB_STATUS_LABEL: Record<string, string> = {
  in_progress:        'Active',
  pending_funding:    'Awaiting Funding',
  delivered:          'Delivered — Awaiting Review',
  revision_requested: 'Revision Requested',
  approved:           'Approved',
  completed:          'Completed',
  cancelled:          'Cancelled',
  closed:             'Closed',
};

const JOB_STATUS_STYLE: Record<string, string> = {
  in_progress:        'bg-emerald-50 text-emerald-700',
  pending_funding:    'bg-amber-50 text-amber-700',
  delivered:          'bg-indigo-50 text-indigo-700',
  revision_requested: 'bg-orange-50 text-orange-700',
  approved:           'bg-teal-50 text-teal-700',
  completed:          'bg-gray-100 text-gray-600',
  cancelled:          'bg-red-50 text-red-600',
  closed:             'bg-gray-100 text-gray-500',
};

function getStatusBadge(app: ProposalItem): { label: string; style: string } {
  // For hired creators, show the actual project stage from job_status
  if (app.status === 'accepted' && app.job_status && JOB_STATUS_LABEL[app.job_status]) {
    return {
      label: JOB_STATUS_LABEL[app.job_status],
      style: JOB_STATUS_STYLE[app.job_status] ?? 'bg-gray-100 text-gray-600',
    };
  }
  return {
    label: APP_STATUS_LABEL[app.status] ?? app.status,
    style: APP_STATUS_STYLE[app.status] ?? 'bg-gray-100 text-gray-600',
  };
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelative(dateStr?: string): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return 'Just now';
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

// ── Main inner component ──────────────────────────────────────────────────────
function MyWorkInner() {
  const router = useRouter();

  const [segment, setSegment] = useState<ProjectSegment>('all');
  const [appList, setAppList] = useState<ProposalItem[]>([]);
  const [appLoading, setAppLoading] = useState(true);
  const [appError, setAppError] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [escrowByJob, setEscrowByJob] = useState<Record<string, EscrowListItem>>({});

  useEffect(() => {
    let cancelled = false;
    setAppLoading(true);
    setAppError(null);
    Promise.all([
      proposals.getMe(),
      // Only fetch escrow for hired (accepted) applications — not for submitted/shortlisted
      escrow.list({ role: 'creator', limit: 20 }).catch(() => ({ escrows: [] })),
    ])
      .then(([apps, esc]) => {
        if (cancelled) return;
        setAppList(apps || []);
        const map: Record<string, EscrowListItem> = {};
        (esc.escrows || []).forEach((e: EscrowListItem) => {
          if (e.job_post_id && (e.status === 'active' || e.funded_amount > 0)) {
            map[e.job_post_id] = e;
          }
        });
        setEscrowByJob(map);
      })
      .catch(e => { if (!cancelled) setAppError((e as Error).message); })
      .finally(() => { if (!cancelled) setAppLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filteredApps = appList.filter(a => matchesSegment(a, segment));

  const appCounts = {
    total:        appList.length,
    submitted:    appList.filter(a => a.status === 'submitted').length,
    shortlisted:  appList.filter(a => a.status === 'shortlisted').length,
    accepted:     appList.filter(a => a.status === 'accepted').length,
  };

  const segmentCounts: Record<ProjectSegment, number> = {
    all:       appList.length,
    open:      appList.filter(a => matchesSegment(a, 'open')).length,
    active:    appList.filter(a => matchesSegment(a, 'active')).length,
    delivered: appList.filter(a => matchesSegment(a, 'delivered')).length,
    completed: appList.filter(a => matchesSegment(a, 'completed')).length,
  };

  const handleWithdraw = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Withdraw this proposal? This cannot be undone.')) return;
    setWithdrawing(id);
    try {
      await proposals.withdraw(id);
      setAppList(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setWithdrawing(null);
    }
  };

  return (
    <>
      {/* Header */}
      <section className="mb-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">My Work</h1>
            <p className="text-gray-600">Your applications and active projects, all in one place.</p>
          </div>
          <Link href="/creator/find-projects"
            className="inline-flex items-center px-5 py-2.5 bg-cobalt text-white rounded-xl font-semibold hover:bg-blue-700 transition text-sm">
            <i className="fa-solid fa-magnifying-glass mr-2"></i>Find More Work
          </Link>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {[
          { label: 'Total Applied',  value: appCounts.total,       icon: 'fa-paper-plane',  bg: 'bg-blue-50',    iconColor: 'text-cobalt' },
          { label: 'Under Review',   value: appCounts.submitted,   icon: 'fa-clock',        bg: 'bg-amber-50',   iconColor: 'text-amber-600' },
          { label: 'Shortlisted',    value: appCounts.shortlisted, icon: 'fa-star',         bg: 'bg-purple-50',  iconColor: 'text-purple-600' },
          { label: 'Hired',          value: appCounts.accepted,    icon: 'fa-circle-check', bg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
        ].map(({ label, value, icon, bg, iconColor }) => (
          <div key={label} className="bg-white rounded-[20px] p-6 shadow-[0_1px_2px_rgba(15,23,42,.05)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-600">{label}</span>
              <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center`}>
                <i className={`fa-solid ${icon} ${iconColor}`}></i>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Application list */}
      {appLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading applications…</p>
        </div>
      ) : appError ? (
        <div className="bg-white rounded-[20px] p-16 text-center shadow-[0_1px_2px_rgba(15,23,42,.05)]">
          <i className="fa-solid fa-circle-exclamation text-4xl text-red-300 mb-4 block"></i>
          <p className="text-red-500 text-sm">{appError}</p>
        </div>
      ) : (
        <>
          <SegmentedTabs
            className="mb-4"
            value={segment}
            onChange={setSegment}
            options={[
              { value: 'all',       label: 'All',       count: segmentCounts.all },
              { value: 'open',      label: 'Open',      count: segmentCounts.open },
              { value: 'active',    label: 'Active',    count: segmentCounts.active },
              { value: 'delivered', label: 'Delivered', count: segmentCounts.delivered },
              { value: 'completed', label: 'Done',      count: segmentCounts.completed },
            ]}
          />
          <div className="bg-white rounded-[20px] overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,.05)]">
          {filteredApps.length === 0 ? (
            <div className="p-20 text-center">
              <i className="fa-solid fa-inbox text-4xl text-gray-300 mb-4 block"></i>
              <h3 className="font-semibold text-gray-600 mb-2">No applications here</h3>
              <p className="text-gray-400 text-sm">
                {appList.length === 0
                  ? 'Start applying to jobs to see them here.'
                  : 'No applications match this filter.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredApps.map(app => {
                const esc = escrowByJob[app.job_id];
                const isFunded = esc && esc.funded_amount > 0;
                const isHired = app.status === 'accepted';
                const isCompleted = app.status === 'accepted' && app.job_status === 'completed';
                const { label: statusLabel, style: statusStyle } = getStatusBadge(app);

                return (
                  // ── Entire card is clickable → workspace ──────────────────
                  <div
                    key={app.id}
                    onClick={() => router.push(`/creator/workspace/${app.id}`)}
                    className="p-6 hover:bg-gray-50 cursor-pointer transition group"
                  >
                    <div className="flex items-start gap-4 flex-wrap">
                      {/* Icon */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition ${
                        isCompleted ? 'bg-gradient-to-br from-gray-100 to-gray-200' :
                        isHired ? 'bg-gradient-to-br from-emerald-100 to-teal-100' :
                        'bg-gradient-to-br from-blue-100 to-purple-100'
                      }`}>
                        <i className={`fa-solid ${isCompleted ? 'fa-trophy text-gray-500' : isHired ? 'fa-clapperboard text-emerald-600' : 'fa-clapperboard text-cobalt'}`}></i>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-cobalt transition">{app.job_title}</h3>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusStyle}`}>
                            {statusLabel}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap mb-2">
                          {app.job_department && <span>{app.job_department}</span>}
                          {app.proposed_budget && (
                            <><span className="text-gray-300">·</span>
                            <span>Proposed ${app.proposed_budget.toLocaleString()}</span></>
                          )}
                          {app.role && (
                            <><span className="text-gray-300">·</span>
                            <span>{app.role}</span></>
                          )}
                        </div>

                        {app.cover_letter && (
                          <p className="text-sm text-gray-400 line-clamp-1 italic mb-2">&ldquo;{app.cover_letter}&rdquo;</p>
                        )}

                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span><i className="fa-regular fa-calendar mr-1"></i>Applied {formatDate(app.submitted_at)}</span>
                          <span className="text-gray-300">·</span>
                          <span>{formatRelative(app.submitted_at)}</span>
                        </div>
                      </div>

                      {/* Right side — escrow status + actions */}
                      <div className="flex items-center gap-3 flex-shrink-0 flex-wrap justify-end" onClick={e => e.stopPropagation()}>
                        {isCompleted && (
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-2 rounded-xl">
                            <i className="fa-solid fa-circle-check text-emerald-500"></i>Project Completed
                          </span>
                        )}
                        {isHired && !isCompleted && (
                          <>
                            {isFunded ? (
                              <div className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-sm">
                                <i className="fa-solid fa-shield-halved text-base"></i>
                                <div>
                                  <p className="text-xs font-bold leading-none">Funds Secured</p>
                                  <p className="text-[10px] text-emerald-100 mt-0.5">${esc!.funded_amount.toLocaleString()} in escrow</p>
                                </div>
                              </div>
                            ) : esc ? (
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
                                <i className="fa-solid fa-clock"></i> Awaiting Funding
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-100 px-3 py-2 rounded-xl">
                                <i className="fa-solid fa-hourglass-half"></i> Not Yet Funded
                              </span>
                            )}
                          </>
                        )}

                        {/* Withdraw (non-hired) */}
                        {['submitted', 'shortlisted', 'interviewing'].includes(app.status) && (
                          <button
                            onClick={(e) => handleWithdraw(app.id, e)}
                            disabled={withdrawing === app.id}
                            className="px-3 py-1.5 text-xs font-semibold text-red-500 border border-red-100 rounded-lg hover:bg-red-50 transition disabled:opacity-50">
                            {withdrawing === app.id ? 'Withdrawing…' : 'Withdraw'}
                          </button>
                        )}

                        {/* Open workspace arrow */}
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-cobalt group-hover:text-white transition text-gray-400">
                          <i className="fa-solid fa-arrow-right text-xs"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </>
      )}
    </>
  );
}

export default function CreatorMyWorkPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <MyWorkInner />
    </Suspense>
  );
}
