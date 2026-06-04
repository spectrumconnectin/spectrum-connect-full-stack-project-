'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { jobs, messaging, proposals, escrow, auth, JobPostItem, JobProposalItem, EscrowListItem } from '@/lib/api';
import ProjectWorkspace from '@/components/ProjectWorkspace';

const STATUS_STYLE: Record<string, string> = {
  open:               'bg-green-100 text-green-700',
  in_review:          'bg-amber-100 text-amber-700',
  pending_funding:    'bg-orange-100 text-orange-700',
  draft:              'bg-gray-100 text-gray-600',
  in_progress:        'bg-blue-100 text-blue-700',
  delivered:          'bg-indigo-100 text-indigo-700',
  revision_requested: 'bg-orange-100 text-orange-700',
  approved:           'bg-teal-100 text-teal-700',
  closed:             'bg-blue-100 text-blue-700',
  completed:          'bg-emerald-100 text-emerald-700',
};

function jobStatusLabel(status: string): string {
  const map: Record<string, string> = {
    open:               'Open',
    in_review:          'In Review',
    pending_funding:    'Pending Funding',
    in_progress:        'Active',
    delivered:          'Delivered',
    revision_requested: 'Revision Requested',
    approved:           'Approved',
    closed:             'Active',
    completed:          'Completed',
    draft:              'Draft',
  };
  return map[status] ?? status;
}

function formatBudget(p: JobPostItem): string {
  const fmt = (min?: number, max?: number, sfx = '') => {
    if (!min && !max) return 'TBD';
    if (min && max) return `$${min.toLocaleString()}–$${max.toLocaleString()}${sfx}`;
    if (min) return `$${min.toLocaleString()}+${sfx}`;
    return `Up to $${max?.toLocaleString()}${sfx}`;
  };
  if (p.budget_type === 'fixed')      return fmt(p.budget?.min, p.budget?.max);
  if (p.budget_type === 'hourly')     return fmt(p.hourly_rate?.min, p.hourly_rate?.max, '/hr');
  if (p.budget_type === 'daily')      return fmt(p.daily_rate?.min, p.daily_rate?.max, '/day');
  if (p.budget_type === 'weekly')     return fmt(p.weekly_rate?.min, p.weekly_rate?.max, '/wk');
  return 'Negotiable';
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function ClientProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [job, setJob] = useState<JobPostItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [myUserId, setMyUserId] = useState('');

  useEffect(() => { auth.me().then(u => setMyUserId(u.id)).catch(() => {}); }, []);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [hiredCreator, setHiredCreator] = useState<JobProposalItem | null>(null);
  const [projectEscrow, setProjectEscrow] = useState<EscrowListItem | null>(null);
  const [showFutureWorkModal, setShowFutureWorkModal] = useState(false);
  const [futureWorkMessage, setFutureWorkMessage] = useState('');
  const [sendingFutureWork, setSendingFutureWork] = useState(false);
  const [futureWorkSent, setFutureWorkSent] = useState(false);

  useEffect(() => {
    if (!id) return;
    jobs.getById(id)
      .then(data => {
        setJob(data);
        // Fetch hired creator + escrow status in parallel
        if (data.status !== 'draft') {
          Promise.allSettled([
            proposals.getForJob(data.id),
            escrow.list({ role: 'client', limit: 50 }),
          ]).then(([propResult, escResult]) => {
            if (propResult.status === 'fulfilled') {
              const res = propResult.value;
              const accepted = (Array.isArray(res) ? res : []).find((p: JobProposalItem) => p.status === 'accepted');
              if (accepted) setHiredCreator(accepted);
            }
            if (escResult.status === 'fulfilled') {
              const linked = escResult.value.escrows.find(
                (e: EscrowListItem) => e.job_post_id === data.id
              );
              if (linked) setProjectEscrow(linked);
            }
          });
        }
      })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!job) return;
    setUpdatingStatus(true);
    try {
      const updated = await jobs.updateStatus(id, newStatus);
      setJob(updated);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this job post? This cannot be undone.')) return;
    try {
      await jobs.delete(id);
      router.push('/client/projects');
    } catch (e) {
      alert((e as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Loading project…</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="text-center py-24">
        <i className="fa-solid fa-circle-exclamation text-5xl text-red-300 mb-4 block"></i>
        <h3 className="font-semibold text-gray-600 text-lg mb-2">Could not load project</h3>
        <p className="text-gray-400 text-sm mb-4">{error}</p>
        <Link href="/client/projects" className="px-5 py-2.5 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
          Back to Projects
        </Link>
      </div>
    );
  }

  const budget = formatBudget(job);
  const canPublish  = job.status === 'draft';
  // Can start once escrow is funded (pending_funding → in_progress)
  const canStart    = (job.status === 'open' || job.status === 'closed' || job.status === 'pending_funding') && !!hiredCreator && (!!(projectEscrow && projectEscrow.funded_amount > 0) || job.status !== 'pending_funding');
  const canComplete = job.status === 'in_progress';
  const canDelete   = job.status === 'draft';

  return (
    <>
      {/* Header */}
      <section className="mb-8">
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <Link href="/client/projects"
            className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center hover:bg-gray-50 transition flex-shrink-0">
            <i className="fa-solid fa-arrow-left text-gray-600"></i>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-gray-900 truncate">{job.title}</h1>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0 ${
                job.status === 'open' && (job.proposal_count ?? 0) > 0 ? 'bg-amber-100 text-amber-700' : STATUS_STYLE[job.status] ?? 'bg-gray-100 text-gray-600'
              }`}>
                {jobStatusLabel(job.status)}
              </span>
            </div>
            <p className="text-gray-500 mt-1 text-sm">
              {job.department}{job.role ? ` · ${job.role}` : ''} · Posted {formatDate(job.created_at)}
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {job.proposal_count > 0 && (
              <Link href={`/client/projects/${id}/applicants`}
                className="bg-cobalt text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition text-sm">
                <i className="fa-solid fa-users mr-2"></i>{job.proposal_count} Applicant{job.proposal_count !== 1 ? 's' : ''}
              </Link>
            )}
            <Link href="/client/messaging"
              className="bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-semibold hover:bg-gray-50 transition text-sm">
              <i className="fa-solid fa-comment mr-2"></i>Messages
            </Link>
          </div>
        </div>
      </section>

      {/* Payment completed — project finished + review CTA */}
      {job.status === 'completed' && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl px-6 py-5 mb-6 flex items-start gap-4">
          <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <i className="fa-solid fa-trophy text-white text-xl"></i>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-emerald-900 text-lg">Payment Completed — Project Finished</p>
            <p className="text-emerald-700 text-sm mt-1 leading-relaxed">
              All payments have been released. Help other clients by leaving a review of the creator.
            </p>
            <Link href={`/client/projects/${id}/review`}
              className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition">
              <i className="fa-solid fa-star text-xs"></i>Leave a Review
            </Link>
          </div>
          <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full flex-shrink-0 mt-0.5">
            Completed
          </span>
        </div>
      )}

      {/* Approved — escrow eligible for release */}
      {job.status === 'approved' && (
        <div className="bg-teal-50 border-2 border-teal-300 rounded-2xl px-6 py-5 mb-6 flex items-start gap-4">
          <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <i className="fa-solid fa-circle-check text-white text-xl"></i>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-teal-900 text-lg">Work Approved — Escrow Ready for Release</p>
            <p className="text-teal-700 text-sm mt-0.5 leading-relaxed">
              You have approved the work. The escrow is now eligible for release. Head to the Milestones tab to release payment to the creator.
            </p>
          </div>
          <span className="bg-teal-600 text-white text-xs font-bold px-3 py-1 rounded-full flex-shrink-0 mt-0.5">
            Approved
          </span>
        </div>
      )}

      {/* Revision requested — waiting on creator */}
      {job.status === 'revision_requested' && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl px-6 py-5 mb-6 flex items-start gap-4">
          <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <i className="fa-solid fa-rotate-left text-white text-xl"></i>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-orange-900 text-lg">Revision Requested</p>
            <p className="text-orange-700 text-sm mt-0.5 leading-relaxed">
              You have requested revisions. The creator has been notified and will resubmit updated work. Funds remain locked in escrow.
            </p>
          </div>
          <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full flex-shrink-0 mt-0.5">
            In Progress
          </span>
        </div>
      )}

      {/* Delivery received banner — action required */}
      {job.status === 'delivered' && (
        <div className="bg-indigo-50 border-2 border-indigo-300 rounded-2xl px-6 py-5 mb-6 flex items-start gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <i className="fa-solid fa-box-open text-white text-xl"></i>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-indigo-900 text-lg">Delivery Received — Action Required</p>
            <p className="text-indigo-700 text-sm mt-0.5 leading-relaxed">
              The creator has submitted their work. Review the deliverables in the Milestones tab below and approve or request revisions.
            </p>
          </div>
          <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full flex-shrink-0 mt-0.5">
            Delivered
          </span>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* ── Main content ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Overview */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Job Overview</h2>
            {job.description ? (
              <p className="text-gray-600 leading-relaxed mb-6 whitespace-pre-line">{job.description}</p>
            ) : (
              <p className="text-gray-400 italic mb-6">No description provided.</p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Budget',      value: budget,                           icon: 'fa-wallet' },
                { label: 'Complexity',  value: job.complexity,                   icon: 'fa-gauge-high' },
                { label: 'Crew Size',   value: job.crew_size,                    icon: 'fa-users' },
                { label: 'Experience',  value: job.experience_level,             icon: 'fa-star' },
              ].map(({ label, value, icon }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-4">
                  <i className={`fa-solid ${icon} text-cobalt mb-2 block`}></i>
                  <p className="text-xs text-gray-500 mb-0.5 capitalize">{label}</p>
                  <p className="font-semibold text-gray-900 text-sm capitalize">{value || '—'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Skills */}
          {job.skills && job.skills.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Required Skills</h2>
              <div className="flex flex-wrap gap-2">
                {job.skills.map(s => (
                  <span key={s} className="text-sm px-3 py-1.5 bg-blue-50 text-cobalt rounded-full font-medium">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {job.tags.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Project Tags</h2>
              <div className="flex flex-wrap gap-2">
                {job.tags.map(t => (
                  <span key={t} className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full font-medium">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Project Workspace — Chat, Timeline, Milestones, Deliverables, Files, Progress */}
          <ProjectWorkspace jobId={id} role="client" myUserId={myUserId} />

          {/* Stats */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-5">Activity</h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <div className="text-3xl font-bold text-cobalt">{job.proposal_count}</div>
                <p className="text-sm text-gray-600 mt-1">Proposals received</p>
                {job.proposal_count > 0 && (
                  <Link href={`/client/projects/${id}/applicants`}
                    className="text-xs text-cobalt font-semibold mt-2 block hover:underline">
                    Review all →
                  </Link>
                )}
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <div className="text-3xl font-bold text-gray-700">{job.view_count}</div>
                <p className="text-sm text-gray-600 mt-1">Profile views</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-6">
          {/* Status management */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-4">Manage Job</h2>

            {/* Pending Funding CTA — shown when creator is hired but escrow unfunded */}
            {job.status === 'pending_funding' && (!projectEscrow || projectEscrow.funded_amount === 0) && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <i className="fa-solid fa-hourglass-half text-orange-600"></i>
                  <span className="font-bold text-orange-800 text-sm">Pending Funding</span>
                </div>
                <p className="text-xs text-orange-700 mb-3 leading-relaxed">
                  A creator has been accepted. Fund the escrow to secure their work and allow them to begin.
                </p>
                <Link href="/client/payments"
                  className="block text-center py-2 px-4 bg-orange-600 text-white text-xs font-bold rounded-lg hover:bg-orange-700 transition">
                  <i className="fa-solid fa-lock mr-1.5"></i>Fund Escrow Now
                </Link>
              </div>
            )}

            {/* Escrow funded status (shown once funded) */}
            {hiredCreator && projectEscrow && projectEscrow.funded_amount > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-xl mb-4 text-sm font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700">
                <i className="fa-solid fa-lock"></i>
                <div>
                  <div>Funded — In Escrow</div>
                  <div className="text-xs font-normal opacity-80">${projectEscrow.funded_amount.toLocaleString()} secured</div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {canPublish && (
                <button disabled={updatingStatus} onClick={() => handleStatusChange('open')}
                  className="flex items-center gap-3 w-full bg-cobalt text-white px-4 py-3 rounded-xl font-semibold hover:bg-blue-700 transition text-sm disabled:opacity-50">
                  <i className="fa-solid fa-rocket"></i>
                  {job.status === 'draft' ? 'Publish Job' : 'Re-activate'}
                </button>
              )}
              {canStart && (
                <button disabled={updatingStatus} onClick={() => handleStatusChange('in_progress')}
                  className="flex items-center gap-3 w-full bg-emerald-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition text-sm disabled:opacity-50">
                  <i className="fa-solid fa-play"></i>
                  Start Project
                  {hiredCreator && <span className="ml-auto text-emerald-200 text-xs font-normal truncate max-w-[100px]">with {hiredCreator.creator_name.split(' ')[0]}</span>}
                </button>
              )}
              {canComplete && (
                <button disabled={updatingStatus} onClick={() => handleStatusChange('completed')}
                  className="flex items-center gap-3 w-full bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl font-semibold hover:bg-emerald-100 transition text-sm border border-emerald-200 disabled:opacity-50">
                  <i className="fa-solid fa-circle-check"></i>Mark Completed
                </button>
              )}
              <Link href={`/client/projects/${id}/applicants`}
                className="flex items-center gap-3 w-full bg-gray-50 text-gray-700 px-4 py-3 rounded-xl font-semibold hover:bg-gray-100 transition text-sm border border-gray-200">
                <i className="fa-solid fa-users text-cobalt"></i>
                Review Applicants {job.proposal_count > 0 && `(${job.proposal_count})`}
              </Link>
              {(job.status === 'open' || job.status === 'in_progress') && (
                <Link href={`/client/smart-connect?project=${id}`}
                  className="flex items-center gap-3 w-full bg-purple-50 text-purple-700 px-4 py-3 rounded-xl font-semibold hover:bg-purple-100 transition text-sm border border-purple-200">
                  <i className="fa-solid fa-bolt text-purple-500"></i>
                  Find Matching Creators
                </Link>
              )}
              {canDelete && (
                <button onClick={handleDelete}
                  className="flex items-center gap-3 w-full bg-red-50 text-red-600 px-4 py-3 rounded-xl font-semibold hover:bg-red-100 transition text-sm border border-red-100">
                  <i className="fa-solid fa-trash-can"></i>Delete Draft
                </button>
              )}
              {job.status === 'completed' && (
                <>
                  <Link href={`/client/projects/${id}/review`}
                    className="flex items-center gap-3 w-full bg-amber-50 text-amber-700 px-4 py-3 rounded-xl font-semibold hover:bg-amber-100 transition text-sm border border-amber-200">
                    <i className="fa-solid fa-star"></i>Leave a Review
                  </Link>
                  {hiredCreator && !futureWorkSent && (
                    <button
                      onClick={() => {
                        setFutureWorkMessage(`Hi ${hiredCreator.creator_name},\n\nI really enjoyed working with you on "${job.title}". I\'d love to collaborate again on an upcoming project — would you be available?`);
                        setShowFutureWorkModal(true);
                      }}
                      className="flex items-center gap-3 w-full bg-blue-50 text-cobalt px-4 py-3 rounded-xl font-semibold hover:bg-blue-100 transition text-sm border border-blue-200">
                      <i className="fa-solid fa-rotate-right"></i>Request Future Work
                    </button>
                  )}
                  {futureWorkSent && (
                    <div className="flex items-center gap-2 w-full bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm border border-green-200 font-semibold">
                      <i className="fa-solid fa-check"></i>Message sent!
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Hired creator card — shown when a creator is hired but project not yet started */}
          {hiredCreator && job.status !== 'completed' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-3">Creator Hired</p>
              <div className="flex items-center gap-3 mb-4">
                {hiredCreator.creator_avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={hiredCreator.creator_avatar} alt={hiredCreator.creator_name}
                    className="w-10 h-10 rounded-full border-2 border-emerald-300 object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {hiredCreator.creator_name[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{hiredCreator.creator_name}</p>
                  {hiredCreator.creator_title && <p className="text-xs text-gray-500 truncate">{hiredCreator.creator_title}</p>}
                </div>
              </div>
              <Link href={`/client/messaging?userId=${hiredCreator.creator_id}`}
                className="flex items-center justify-center gap-2 w-full bg-white border border-emerald-300 text-emerald-700 px-4 py-2.5 rounded-xl font-semibold hover:bg-emerald-100 transition text-sm">
                <i className="fa-solid fa-comment"></i>Message
              </Link>
            </div>
          )}

          {/* Job details */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-4">Details</h2>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Budget type',  value: job.budget_type },
                { label: 'Budget',       value: budget },
                { label: 'Department',   value: job.department },
                { label: 'Role',         value: job.role },
                { label: 'Experience',   value: job.experience_level },
                { label: 'Complexity',   value: job.complexity },
                { label: 'Crew size',    value: job.crew_size },
                { label: 'Duration',     value: job.estimated_duration ? `${job.estimated_duration} days` : job.duration },
                { label: 'Published',    value: formatDate(job.published_at) },
              ].filter(r => r.value).map(({ label, value }) => (
                <div key={label} className="flex justify-between items-start gap-2 py-2 border-b border-gray-100 last:border-0">
                  <span className="text-gray-500 capitalize">{label}</span>
                  <span className="font-semibold text-gray-900 text-right capitalize">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Future Work Modal ── */}
      {showFutureWorkModal && hiredCreator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowFutureWorkModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <i className="fa-solid fa-rotate-right text-cobalt"></i>
                Request Future Work
              </h3>
              <button onClick={() => setShowFutureWorkModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-cobalt flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {(hiredCreator.creator_name || '?')[0].toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{hiredCreator.creator_name}</p>
                <p className="text-xs text-gray-500">Previously hired for: {job?.title}</p>
              </div>
            </div>
            <textarea
              value={futureWorkMessage}
              onChange={e => setFutureWorkMessage(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cobalt focus:ring-2 focus:ring-blue-100 resize-none leading-relaxed mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowFutureWorkModal(false)}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition text-sm">
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!hiredCreator.creator_id || !futureWorkMessage.trim()) return;
                  setSendingFutureWork(true);
                  try {
                    await messaging.createConversation([hiredCreator.creator_id], id, futureWorkMessage.trim());
                    setFutureWorkSent(true);
                    setShowFutureWorkModal(false);
                  } catch { /* ignore */ } finally {
                    setSendingFutureWork(false);
                  }
                }}
                disabled={!futureWorkMessage.trim() || sendingFutureWork}
                className="flex-1 bg-cobalt text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition text-sm flex items-center justify-center gap-2"
              >
                {sendingFutureWork
                  ? <><i className="fa-solid fa-spinner animate-spin"></i> Sending…</>
                  : <><i className="fa-solid fa-paper-plane"></i> Send Message</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
