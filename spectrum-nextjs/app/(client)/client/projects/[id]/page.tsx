'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { jobs, JobPostItem } from '@/lib/api';

const STATUS_STYLE: Record<string, string> = {
  open:        'bg-green-100 text-green-700',
  draft:       'bg-gray-100 text-gray-600',
  paused:      'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  closed:      'bg-orange-100 text-orange-600',
  completed:   'bg-purple-100 text-purple-700',
  cancelled:   'bg-red-100 text-red-600',
};

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
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (!id) return;
    jobs.getById(id)
      .then(data => setJob(data))
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
  const canClose    = job.status === 'open';
  const canPublish  = job.status === 'draft' || job.status === 'paused';
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
              <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize flex-shrink-0 ${STATUS_STYLE[job.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {job.status.replace('_', ' ')}
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
            <div className="space-y-3">
              {canPublish && (
                <button disabled={updatingStatus} onClick={() => handleStatusChange('open')}
                  className="flex items-center gap-3 w-full bg-cobalt text-white px-4 py-3 rounded-xl font-semibold hover:bg-blue-700 transition text-sm disabled:opacity-50">
                  <i className="fa-solid fa-rocket"></i>
                  {job.status === 'draft' ? 'Publish Job' : 'Re-activate'}
                </button>
              )}
              {canClose && (
                <button disabled={updatingStatus} onClick={() => handleStatusChange('closed')}
                  className="flex items-center gap-3 w-full bg-gray-50 text-gray-700 px-4 py-3 rounded-xl font-semibold hover:bg-gray-100 transition text-sm border border-gray-200 disabled:opacity-50">
                  <i className="fa-solid fa-lock text-orange-500"></i>Close to New Proposals
                </button>
              )}
              {canClose && (
                <button disabled={updatingStatus} onClick={() => handleStatusChange('paused')}
                  className="flex items-center gap-3 w-full bg-gray-50 text-gray-700 px-4 py-3 rounded-xl font-semibold hover:bg-gray-100 transition text-sm border border-gray-200 disabled:opacity-50">
                  <i className="fa-solid fa-pause text-yellow-500"></i>Pause Job
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
              {canDelete && (
                <button onClick={handleDelete}
                  className="flex items-center gap-3 w-full bg-red-50 text-red-600 px-4 py-3 rounded-xl font-semibold hover:bg-red-100 transition text-sm border border-red-100">
                  <i className="fa-solid fa-trash-can"></i>Delete Draft
                </button>
              )}
            </div>
          </div>

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
    </>
  );
}
