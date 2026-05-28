'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { jobs, proposals, JobPostItem } from '@/lib/api';

const DURATION_OPTIONS = [
  { label: 'Less than 1 week', value: 1 },
  { label: '1–2 weeks', value: 2 },
  { label: '3–4 weeks', value: 4 },
  { label: '5–6 weeks', value: 6 },
  { label: '6–8 weeks', value: 8 },
  { label: '2–3 months', value: 12 },
  { label: '3–6 months', value: 20 },
];

function budgetLabel(job: JobPostItem): string {
  if (job.budget?.min && job.budget?.max) {
    return `$${job.budget.min.toLocaleString()} – $${job.budget.max.toLocaleString()}`;
  }
  if (job.budget?.min) return `From $${job.budget.min.toLocaleString()}`;
  if (job.daily_rate?.min || job.daily_rate?.max) {
    const min = job.daily_rate.min ?? 0;
    const max = job.daily_rate.max;
    return max ? `$${min}–$${max}/day` : `From $${min}/day`;
  }
  if (job.hourly_rate?.min || job.hourly_rate?.max) {
    const min = job.hourly_rate.min ?? 0;
    const max = job.hourly_rate.max;
    return max ? `$${min}–$${max}/hr` : `From $${min}/hr`;
  }
  return 'Negotiable';
}

export default function ProjectApplicationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [job, setJob] = useState<JobPostItem | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);

  const [coverLetter, setCoverLetter] = useState('');
  const [proposedBudget, setProposedBudget] = useState('');
  const [proposedDuration, setProposedDuration] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    jobs.getById(id)
      .then(setJob)
      .catch(() => {})
      .finally(() => setLoadingJob(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await proposals.submit(id, {
        cover_letter: coverLetter,
        proposed_budget: proposedBudget ? Number(proposedBudget) : undefined,
        proposed_duration: proposedDuration ? Number(proposedDuration) : undefined,
      });
      setSubmitted(true);
      setTimeout(() => router.push('/creator/applications'), 1800);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="mb-6">
        <Link href={`/creator/projects/${id}`} className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium">
          <i className="fa-solid fa-arrow-left"></i>Back to Project
        </Link>
      </div>

      <div className="max-w-3xl">
        {/* Project summary */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6 mb-8">
          {loadingJob ? (
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-cobalt border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-gray-500">Loading project details…</span>
            </div>
          ) : job ? (
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="font-bold text-gray-900">{job.title}</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {job.department}
                  {job.role && <> · {job.role}</>}
                  {job.created_at && <> · Posted {new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-cobalt">{budgetLabel(job)}</div>
                <div className="text-xs text-gray-500">Client budget</div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Project details unavailable</p>
          )}
        </div>

        {submitted ? (
          <div className="bg-white rounded-2xl border border-emerald-200 p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-circle-check text-emerald-500 text-3xl"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
            <p className="text-gray-500 text-sm">Redirecting to your applications…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">Submit Application</h1>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            {/* Cover letter */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                  <i className="fa-solid fa-pen text-cobalt text-sm"></i>
                </div>
                <h2 className="text-lg font-bold text-gray-900">Cover Letter</h2>
              </div>
              <textarea
                rows={8}
                required
                value={coverLetter}
                onChange={e => setCoverLetter(e.target.value)}
                placeholder="Tell the client why you're the perfect fit for this project. Describe your relevant experience, your approach, and what makes you stand out…"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cobalt focus:border-transparent text-gray-900 placeholder-gray-400 resize-none text-sm"
              />
              <p className="text-xs text-gray-400 mt-2">Be specific and reference the project brief. Personalised letters get 3× more responses.</p>
            </div>

            {/* Proposal */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
                  <i className="fa-solid fa-wallet text-green-600 text-sm"></i>
                </div>
                <h2 className="text-lg font-bold text-gray-900">Your Proposal</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Your Rate ($)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">$</span>
                    <input
                      type="number"
                      min="1"
                      value={proposedBudget}
                      onChange={e => setProposedBudget(e.target.value)}
                      placeholder={job?.budget?.min ? String(job.budget.min) : '0'}
                      className="w-full pl-8 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cobalt text-gray-900 placeholder-gray-400"
                    />
                  </div>
                  {job && (
                    <p className="text-xs text-gray-400 mt-1.5">Client budget: {budgetLabel(job)}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Estimated Timeline</label>
                  <select
                    value={proposedDuration}
                    onChange={e => setProposedDuration(e.target.value)}
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cobalt text-gray-900"
                  >
                    <option value="">Select timeline</option>
                    {DURATION_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Portfolio note */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center">
                  <i className="fa-solid fa-images text-purple-600 text-sm"></i>
                </div>
                <h2 className="text-lg font-bold text-gray-900">Portfolio</h2>
              </div>
              <p className="text-sm text-gray-500">
                Your profile portfolio is automatically shared with the client.{' '}
                <Link href="/creator/profile" className="text-cobalt font-semibold hover:underline">
                  Update your portfolio
                </Link>{' '}
                to make the best impression.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Link href={`/creator/projects/${id}`} className="px-6 py-3 text-gray-600 font-semibold hover:text-gray-900 transition">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting || !coverLetter.trim()}
                className={`bg-cobalt text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-lg ${submitting || !coverLetter.trim() ? 'opacity-60 cursor-not-allowed' : ''}`}>
                {submitting
                  ? <><i className="fa-solid fa-spinner fa-spin mr-2"></i>Submitting…</>
                  : <>Submit Application <i className="fa-solid fa-paper-plane ml-2"></i></>
                }
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
