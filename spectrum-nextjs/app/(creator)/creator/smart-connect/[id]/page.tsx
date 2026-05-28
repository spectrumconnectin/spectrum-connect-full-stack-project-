'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { jobs, JobPostItem } from '@/lib/api';

function formatBudget(p: JobPostItem): string {
  const fmt = (min?: number, max?: number, suffix = '') => {
    if (min && max) return `$${min.toLocaleString()} – $${max.toLocaleString()}${suffix}`;
    if (min) return `From $${min.toLocaleString()}${suffix}`;
    return 'Rate TBD';
  };
  if (p.budget_type === 'fixed') return fmt(p.budget?.min, p.budget?.max);
  if (p.budget_type === 'hourly') return fmt(p.hourly_rate?.min, p.hourly_rate?.max, '/hr');
  if (p.budget_type === 'daily') return fmt(p.daily_rate?.min, p.daily_rate?.max, '/day');
  if (p.budget_type === 'weekly') return fmt(p.weekly_rate?.min, p.weekly_rate?.max, '/wk');
  return 'Negotiable';
}

export default function SmartConnectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<JobPostItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    jobs.getById(id)
      .then(setJob)
      .catch(() => setError('Could not load project details.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="text-center py-20 text-gray-500">
        <i className="fa-solid fa-triangle-exclamation text-4xl text-gray-300 mb-4 block"></i>
        <p>{error || 'Project not found.'}</p>
        <Link href="/creator/smart-connect" className="mt-4 inline-block text-cobalt font-semibold hover:underline">
          ← Back to Smart Connect
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <Link href="/creator/smart-connect" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium">
          <i className="fa-solid fa-arrow-left"></i>Back to Smart Connect
        </Link>
      </div>

      {/* Match header */}
      <div className="bg-gradient-to-br from-cobalt to-blue-500 rounded-3xl p-8 text-white mb-8 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl"></div>
        <div className="relative z-10 flex items-start justify-between flex-wrap gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/30">
                <i className="fa-solid fa-bolt mr-1"></i>Smart Match
              </span>
              <span className="capitalize text-xs font-semibold bg-white/20 px-3 py-1 rounded-full border border-white/20">
                {job.experience_level} level
              </span>
            </div>
            <h1 className="text-3xl font-bold mb-2">{job.title}</h1>
            <p className="text-blue-200">{job.department}{job.role ? ` · ${job.role}` : ''}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{formatBudget(job)}</div>
            <div className="text-blue-200 text-sm capitalize">{job.budget_type} · {job.duration || job.estimated_duration ? `${job.estimated_duration ?? ''} ${job.duration ?? ''}`.trim() : 'Duration TBD'}</div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">

          {/* Project details */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Project Details</h2>
            <p className="text-gray-600 leading-relaxed mb-5">{job.description || 'No description provided.'}</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: 'fa-tag', label: 'Department', value: job.department },
                { icon: 'fa-star', label: 'Experience', value: job.experience_level },
                { icon: 'fa-users', label: 'Crew Size', value: job.crew_size },
                { icon: 'fa-chart-bar', label: 'Complexity', value: job.complexity },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
                  <i className={`fa-solid ${icon} text-cobalt`}></i>
                  <div>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="font-semibold text-gray-900 text-sm capitalize">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Skills */}
          {(job.skills ?? []).length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Required Skills</h2>
              <div className="flex flex-wrap gap-2">
                {job.skills!.map(s => (
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
                  <span key={t} className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Project Info</h3>
            {[
              { label: 'Status', value: job.status },
              { label: 'Applications', value: `${job.proposal_count} received` },
              { label: 'Budget Type', value: job.budget_type },
              ...(job.deadline ? [{ label: 'Deadline', value: new Date(job.deadline).toLocaleDateString() }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between py-2 border-b border-gray-100 last:border-0 text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-semibold text-gray-900 capitalize">{value}</span>
              </div>
            ))}
          </div>

          <div className="bg-cobalt text-white rounded-2xl p-6 shadow-lg">
            <div className="text-2xl font-bold mb-1">{formatBudget(job)}</div>
            <p className="text-blue-200 text-sm mb-5 capitalize">{job.budget_type} · {job.crew_size} crew</p>
            <Link href={`/creator/projects/${id}/apply`}
              className="block bg-white text-cobalt px-6 py-3.5 rounded-xl font-bold hover:bg-blue-50 transition mb-3 text-sm text-center">
              <i className="fa-solid fa-paper-plane mr-2"></i>Apply Now
            </Link>
            <Link href="/creator/smart-connect"
              className="block w-full bg-white/20 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30 transition border border-white/30 text-sm text-center">
              <i className="fa-solid fa-arrow-left mr-2"></i>Back to Matches
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
