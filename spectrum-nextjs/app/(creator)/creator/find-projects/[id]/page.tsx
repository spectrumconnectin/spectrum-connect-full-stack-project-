'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { jobs, proposals, JobPostItem } from '@/lib/api';

function formatBudget(p: JobPostItem): string {
  const fmt = (min?: number, max?: number, sfx = '') => {
    if (!min && !max) return 'Negotiable';
    if (min && max) return `$${min.toLocaleString()}–$${max.toLocaleString()}${sfx}`;
    if (min) return `From $${min.toLocaleString()}${sfx}`;
    return `Up to $${max?.toLocaleString()}${sfx}`;
  };
  if (p.budget_type === 'fixed')  return fmt(p.budget?.min, p.budget?.max);
  if (p.budget_type === 'hourly') return fmt(p.hourly_rate?.min, p.hourly_rate?.max, '/hr');
  if (p.budget_type === 'daily')  return fmt(p.daily_rate?.min, p.daily_rate?.max, '/day');
  if (p.budget_type === 'weekly') return fmt(p.weekly_rate?.min, p.weekly_rate?.max, '/wk');
  return 'Negotiable';
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function timeAgo(iso?: string) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<JobPostItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alreadyApplied, setAlreadyApplied] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.allSettled([
      jobs.getById(id),
      proposals.getMe(),
    ]).then(([jobRes, propRes]) => {
      if (jobRes.status === 'fulfilled') setJob(jobRes.value);
      else setError((jobRes.reason as Error).message);
      if (propRes.status === 'fulfilled') {
        const already = propRes.value.some((p: { job_id: string }) => p.job_id === id);
        setAlreadyApplied(already);
      }
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">Loading project…</p>
    </div>
  );

  if (error || !job) return (
    <div className="text-center py-24">
      <i className="fa-solid fa-circle-exclamation text-5xl text-red-300 mb-4 block"></i>
      <h3 className="font-semibold text-gray-600 text-lg mb-2">Project not found</h3>
      <p className="text-gray-400 text-sm mb-6">{error}</p>
      <Link href="/creator/find-projects"
        className="px-5 py-2.5 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
        Back to Find Projects
      </Link>
    </div>
  );

  const budget = formatBudget(job);

  return (
    <>
      {/* Back */}
      <div className="mb-6">
        <Link href="/creator/find-projects"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm font-medium transition">
          <i className="fa-solid fa-arrow-left text-xs"></i>Back to Find Projects
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">

        {/* ── Main content ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Header */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-green-100 text-green-700">
                    Open
                  </span>
                  {(job.created_at && Date.now() - new Date(job.created_at).getTime() < 86400000 * 3) && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">New</span>
                  )}
                </div>
                <p className="text-gray-500 text-sm">
                  {job.department}{job.role ? ` · ${job.role}` : ''}
                  {job.created_at && <> · Posted {timeAgo(job.created_at)}</>}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-cobalt">{budget}</div>
                <div className="text-xs text-gray-400 capitalize">{job.budget_type || 'fixed'}</div>
              </div>
            </div>

            {/* Meta chips */}
            <div className="flex flex-wrap gap-2 mt-2">
              {job.experience_level && (
                <span className="text-xs px-3 py-1.5 bg-blue-50 text-cobalt rounded-full font-medium capitalize">
                  <i className="fa-solid fa-star mr-1"></i>{job.experience_level}
                </span>
              )}
              {job.crew_size && (
                <span className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full font-medium capitalize">
                  <i className="fa-solid fa-users mr-1"></i>{job.crew_size}
                </span>
              )}
              {job.complexity && (
                <span className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full font-medium capitalize">
                  <i className="fa-solid fa-gauge-high mr-1"></i>{job.complexity}
                </span>
              )}
              {/* Location chip — amber for on-site work so it stands out */}
              {job.location && (
                <span className="text-xs px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full font-medium border border-amber-200">
                  <i className="fa-solid fa-location-dot mr-1"></i>{job.location}
                </span>
              )}
              {/* Event date — shown prominently for event-based jobs */}
              {(job as JobPostItem & { event_date?: string }).event_date && (
                <span className="text-xs px-3 py-1.5 bg-rose-50 text-rose-700 rounded-full font-semibold border border-rose-200">
                  <i className="fa-solid fa-calendar-day mr-1"></i>
                  Event: {new Date((job as JobPostItem & { event_date?: string }).event_date!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
              {/* Work-type chip */}
              {(job as JobPostItem & { is_remote?: boolean }).is_remote === false && (
                <span className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full font-medium border border-indigo-200">
                  <i className="fa-solid fa-person-walking-arrow-right mr-1"></i>In-Person Required
                </span>
              )}
              {(job as JobPostItem & { is_remote?: boolean }).is_remote === true && (
                <span className="text-xs px-3 py-1.5 bg-green-50 text-green-700 rounded-full font-medium border border-green-200">
                  <i className="fa-solid fa-laptop mr-1"></i>Remote
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Project Description</h2>
            {job.description ? (
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{job.description}</p>
            ) : (
              <p className="text-gray-400 italic">No description provided.</p>
            )}
          </div>

          {/* Skills */}
          {job.skills && job.skills.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Required Skills</h2>
              <div className="flex flex-wrap gap-2">
                {job.skills.map(s => (
                  <span key={s} className="text-sm px-3 py-1.5 bg-blue-50 text-cobalt rounded-full font-medium">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {job.tags && job.tags.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {job.tags.map(t => (
                  <span key={t} className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full font-medium">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-6">

          {/* Apply CTA */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            {alreadyApplied ? (
              <div className="text-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <i className="fa-solid fa-circle-check text-emerald-600 text-xl"></i>
                </div>
                <p className="font-semibold text-gray-900 text-sm mb-1">Application Submitted</p>
                <p className="text-xs text-gray-500 mb-4">You&apos;ve already applied to this project.</p>
                <Link href="/creator/projects?tab=applications"
                  className="block w-full text-center px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition">
                  View My Applications
                </Link>
              </div>
            ) : (
              <>
                <h3 className="font-bold text-gray-900 mb-4">Interested?</h3>
                <Link href={`/creator/find-projects/${id}/apply`}
                  className="block w-full text-center px-5 py-3 bg-cobalt text-white rounded-xl font-bold hover:bg-blue-700 transition text-sm mb-3">
                  <i className="fa-solid fa-paper-plane mr-2"></i>Apply Now
                </Link>
                <Link href="/creator/messaging"
                  className="block w-full text-center px-5 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition text-sm">
                  <i className="fa-solid fa-comment mr-2"></i>Ask a Question
                </Link>
              </>
            )}
          </div>

          {/* Project Details */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Project Details</h3>
            <div className="space-y-3">
              {[
                { label: 'Budget',      value: budget,                   icon: 'fa-wallet' },
                { label: 'Category',    value: job.department,           icon: 'fa-film' },
                { label: 'Location',    value: job.location,             icon: 'fa-location-dot' },
                { label: 'Event Date',  value: (job as JobPostItem & { event_date?: string }).event_date ? formatDate((job as JobPostItem & { event_date?: string }).event_date) : undefined, icon: 'fa-calendar-day' },
                { label: 'Work Type',   value: (job as JobPostItem & { is_remote?: boolean }).is_remote === true ? 'Remote' : (job as JobPostItem & { is_remote?: boolean }).is_remote === false ? 'In-Person / On-Site' : undefined, icon: 'fa-laptop' },
                { label: 'Experience',  value: job.experience_level,     icon: 'fa-star' },
                { label: 'Crew Size',   value: job.crew_size,            icon: 'fa-users' },
                { label: 'Complexity',  value: job.complexity,           icon: 'fa-gauge-high' },
                { label: 'Posted',      value: formatDate(job.created_at), icon: 'fa-calendar' },
                { label: 'Proposals',   value: `${job.proposal_count || 0} received`, icon: 'fa-paper-plane' },
              ].filter(r => r.value).map(({ label, value, icon }) => (
                <div key={label} className="flex items-start justify-between gap-2 py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <i className={`fa-solid ${icon} w-4 text-center text-gray-400`}></i>
                    {label}
                  </div>
                  <span className="text-sm font-semibold text-gray-900 capitalize text-right">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Competition hint */}
          {(job.proposal_count || 0) < 5 && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-sm text-green-700">
              <i className="fa-solid fa-bolt mr-2 text-green-500"></i>
              <strong>Low competition</strong> — only {job.proposal_count || 0} proposal{job.proposal_count !== 1 ? 's' : ''} so far. Apply now!
            </div>
          )}
        </div>
      </div>
    </>
  );
}
