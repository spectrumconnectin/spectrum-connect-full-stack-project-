'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { jobs, proposals, profile as profileApi, JobPostItem, formatJobBudget, currencySymbol } from '@/lib/api';

const DURATION_OPTIONS = [
  { label: 'Less than 1 week', value: 1 },
  { label: '1–2 weeks', value: 2 },
  { label: '3–4 weeks', value: 4 },
  { label: '5–6 weeks', value: 6 },
  { label: '6–8 weeks', value: 8 },
  { label: '2–3 months', value: 12 },
  { label: '3–6 months', value: 20 },
];

const budgetLabel = formatJobBudget;

function isFixedPrice(job: JobPostItem): boolean {
  return job.budget_type === 'fixed' &&
    !!job.budget?.min && !!job.budget?.max &&
    job.budget.min === job.budget.max;
}

export default function ProjectApplicationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const backHref = pathname.includes('/find-projects/')
    ? `/creator/find-projects/${id}`
    : '/creator/find-projects';

  const [job, setJob] = useState<JobPostItem | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [isOwnJob, setIsOwnJob] = useState(false);

  const [coverLetter, setCoverLetter] = useState('');
  const [proposedBudget, setProposedBudget] = useState('');
  const [proposedDuration, setProposedDuration] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([jobs.getById(id), profileApi.getMe()])
      .then(([jobData, me]) => {
        setJob(jobData);
        // For fixed-price jobs, lock the proposed budget to the exact fixed price
        if (isFixedPrice(jobData) && jobData.budget?.min) {
          setProposedBudget(String(jobData.budget.min));
        }
        // Block self-application: job's client_id matches the logged-in user
        if (jobData.client_id && me.id && String(jobData.client_id) === String(me.id)) {
          setIsOwnJob(true);
        }
      })
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
        portfolio_url: portfolioUrl.trim() || undefined,
      });
      setSubmitted(true);
      setTimeout(() => router.push('/creator/projects?tab=applications'), 1800);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="mb-6">
        <Link href={backHref} className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium">
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

        {isOwnJob ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-10 text-center shadow-sm">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-ban text-amber-500 text-3xl"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">You can&apos;t apply to your own job</h2>
            <p className="text-gray-600 text-sm mb-6">This project was posted from your account. You cannot apply to or hire yourself.</p>
            <Link href="/creator/find-projects"
              className="inline-flex items-center gap-2 px-6 py-3 bg-cobalt text-white rounded-xl font-semibold hover:bg-blue-700 transition text-sm">
              <i className="fa-solid fa-magnifying-glass"></i>Find Other Projects
            </Link>
          </div>
        ) : submitted ? (
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
            <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 md:p-8 shadow-sm">
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
            <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
                  <i className="fa-solid fa-wallet text-green-600 text-sm"></i>
                </div>
                <h2 className="text-lg font-bold text-gray-900">Your Proposal</h2>
              </div>

              {/* Fixed-price notice — rate is not negotiable */}
              {job && isFixedPrice(job) ? (
                <div className="mb-6">
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3.5 mb-4">
                    <i className="fa-solid fa-tag text-emerald-600 text-lg flex-shrink-0"></i>
                    <div>
                      <p className="text-sm font-bold text-emerald-900">Fixed Price Project</p>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        This project has a fixed price of{' '}
                        <strong>{currencySymbol(job.budget?.currency)}{job.budget!.min!.toLocaleString()}</strong>.
                        The rate is non-negotiable — you apply at this price or not at all.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                    <span className="text-sm font-semibold text-gray-700">Your payout (after 8% fee)</span>
                    <span className="text-lg font-bold text-emerald-600">
                      {currencySymbol(job.budget?.currency)}{(job.budget!.min! * 0.92).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Your Rate ({currencySymbol(job?.budget?.currency).trim()})</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">{currencySymbol(job?.budget?.currency)}</span>
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
              )}

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

            {/* Portfolio / Drive link */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center">
                  <i className="fa-brands fa-google-drive text-purple-600 text-sm"></i>
                </div>
                <h2 className="text-lg font-bold text-gray-900">Portfolio / Work Samples</h2>
              </div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Google Drive or Portfolio Link <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="url"
                value={portfolioUrl}
                onChange={e => setPortfolioUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cobalt text-gray-900 placeholder-gray-400 text-sm"
              />
              <p className="text-xs text-gray-400 mt-2">
                Paste a link to your Google Drive folder, Vimeo reel, Behance, or any portfolio that showcases your relevant work. Clients can click it directly from your proposal.
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
