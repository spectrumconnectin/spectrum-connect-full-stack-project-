'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { jobs, proposals, profile, JobPostItem, PublicProfile } from '@/lib/api';

const categories = [
  { key: 'communication', label: 'Communication',     icon: 'fa-comments',    desc: 'Were they clear, responsive, and easy to reach?' },
  { key: 'clarity',       label: 'Brief Clarity',     icon: 'fa-file-lines',  desc: 'Was the project brief clear and detailed?' },
  { key: 'payment',       label: 'Prompt Payment',    icon: 'fa-coins',       desc: 'Did they pay on time and without issues?' },
  { key: 'respect',       label: 'Professionalism',   icon: 'fa-handshake',   desc: 'Did they treat you professionally?' },
  { key: 'recommend',     label: 'Would Work Again',  icon: 'fa-thumbs-up',   desc: 'Would you work with this client again?' },
];

const starLabels = ['', 'Poor', 'Below average', 'Good', 'Very good', 'Excellent'];
const positiveTags = ['Clear brief', 'Quick to respond', 'Paid on time', 'Great feedback', 'Easy to work with', 'Respectful', 'Well-organised', 'Would work again'];
const negativeTags = ['Unclear brief', 'Slow to respond', 'Late payment', 'Changed scope frequently', 'Difficult to work with'];

function StarPicker({ value, hovered, onRate, onHover }: {
  value: number; hovered: number;
  onRate: (n: number) => void;
  onHover: (n: number) => void;
}) {
  return (
    <div className="flex gap-1" onMouseLeave={() => onHover(0)}>
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} type="button"
          onClick={() => onRate(s)}
          onMouseEnter={() => onHover(s)}
          className="text-2xl transition-transform hover:scale-110 focus:outline-none">
          <i className={`fa-star ${(hovered || value) >= s ? 'fa-solid text-yellow-400' : 'fa-regular text-gray-300'}`}></i>
        </button>
      ))}
    </div>
  );
}

function ReviewForm() {
  const searchParams = useSearchParams();
  const jobId      = searchParams.get('job');
  const proposalId = searchParams.get('proposal');

  const [job, setJob]           = useState<JobPostItem | null>(null);
  const [clientProfile, setClientProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading]   = useState(true);
  const [ratings, setRatings]   = useState<Record<string, number>>({});
  const [hover, setHover]       = useState<Record<string, number>>({});
  const [reviewText, setReviewText] = useState('');
  const [tags, setTags]         = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  useEffect(() => {
    if (!jobId || !proposalId) { setLoading(false); return; }
    Promise.allSettled([
      jobs.getById(jobId),
      proposals.getReviews(proposalId),
    ]).then(([jobRes, reviewsRes]) => {
      if (jobRes.status === 'fulfilled') {
        const j = jobRes.value;
        setJob(j);
        if (j.client_id) {
          profile.getPublic(j.client_id).then(setClientProfile).catch(() => {});
        }
      }
      if (reviewsRes.status === 'fulfilled' && reviewsRes.value.creator_rating) {
        setAlreadyReviewed(true);
      }
    }).finally(() => setLoading(false));
  }, [jobId, proposalId]);

  const allRated = categories.every(c => (ratings[c.key] ?? 0) >= 1);
  const avgRating = allRated
    ? (Object.values(ratings).reduce((a, b) => a + b, 0) / categories.length).toFixed(1)
    : null;

  const toggleTag = (t: string) =>
    setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const handleSubmit = async () => {
    if (!allRated || reviewText.trim().length < 20 || !proposalId) return;
    setSubmitting(true); setError('');
    try {
      await proposals.reviewClient(proposalId, {
        ratings,
        review: reviewText.trim(),
        tags,
      });
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!jobId || !proposalId) return (
    <div className="max-w-lg mx-auto py-20 text-center">
      <i className="fa-solid fa-circle-exclamation text-4xl text-red-300 mb-4 block"></i>
      <p className="text-gray-600 mb-4">Missing project information.</p>
      <Link href="/creator/projects?tab=applications" className="px-5 py-2.5 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
        Back to Projects
      </Link>
    </div>
  );

  if (submitted) return (
    <div className="max-w-lg mx-auto py-20 text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200">
        <i className="fa-solid fa-check text-white text-3xl"></i>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-3">Review Submitted!</h1>
      <p className="text-gray-500 mb-2">Thanks for rating this client. Your feedback helps the Spectrum community.</p>
      {avgRating && (
        <div className="flex items-center justify-center gap-1 my-6">
          {[1,2,3,4,5].map(s => (
            <i key={s} className={`fa-star text-2xl ${parseFloat(avgRating) >= s ? 'fa-solid text-yellow-400' : 'fa-regular text-gray-300'}`}></i>
          ))}
          <span className="text-2xl font-bold text-gray-700 ml-2">{avgRating}</span>
        </div>
      )}
      <Link href="/creator/projects?tab=applications"
        className="inline-flex items-center gap-2 px-6 py-3 bg-cobalt text-white rounded-xl font-semibold hover:bg-blue-700 transition">
        <i className="fa-solid fa-arrow-left"></i>Back to Projects
      </Link>
    </div>
  );

  if (alreadyReviewed) return (
    <div className="max-w-lg mx-auto py-20 text-center">
      <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <i className="fa-solid fa-circle-check text-cobalt text-2xl"></i>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Already Reviewed</h1>
      <p className="text-gray-500 mb-6">You have already submitted a review for this client.</p>
      <Link href="/creator/projects?tab=applications"
        className="px-5 py-2.5 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
        Back to Projects
      </Link>
    </div>
  );

  const clientName = clientProfile?.profile?.display_name ?? clientProfile?.username ?? 'this client';
  const clientAvatar = clientProfile?.profile?.profile_picture;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href="/creator/projects?tab=applications"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-medium transition">
          <i className="fa-solid fa-arrow-left text-xs"></i>Back to Projects
        </Link>
      </div>

      <div className="text-center mb-8">
        {clientAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={clientAvatar} alt={clientName}
            className="w-20 h-20 rounded-2xl object-cover mx-auto mb-4 border-2 border-gray-200" />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cobalt to-blue-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">{clientName[0]?.toUpperCase()}</span>
          </div>
        )}
        <h1 className="text-2xl font-bold text-gray-900">Review Your Client</h1>
        <p className="text-gray-500 mt-1">
          How was working with <strong>{clientName}</strong>
          {job ? ` on "${job.title}"` : ''}?
        </p>
      </div>

      <div className="space-y-5">
        {/* Star ratings */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-5">Rate the Experience</h2>
          <div className="space-y-5">
            {categories.map(cat => (
              <div key={cat.key}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <i className={`fa-solid ${cat.icon} text-cobalt w-5 text-center`}></i>
                    <span className="font-semibold text-gray-900 text-sm">{cat.label}</span>
                  </div>
                  {(hover[cat.key] || ratings[cat.key]) > 0 && (
                    <span className="text-sm text-gray-500">
                      {starLabels[hover[cat.key] || ratings[cat.key]]}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mb-2 ml-7">{cat.desc}</p>
                <div className="ml-7">
                  <StarPicker
                    value={ratings[cat.key] ?? 0}
                    hovered={hover[cat.key] ?? 0}
                    onRate={n => setRatings(prev => ({ ...prev, [cat.key]: n }))}
                    onHover={n => setHover(prev => ({ ...prev, [cat.key]: n }))}
                  />
                </div>
              </div>
            ))}
          </div>
          {allRated && avgRating && (
            <div className="mt-5 pt-5 border-t border-gray-100 flex items-center justify-center gap-2">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => (
                  <i key={s} className={`fa-star text-lg ${parseFloat(avgRating) >= s ? 'fa-solid text-yellow-400' : 'fa-regular text-gray-300'}`}></i>
                ))}
              </div>
              <span className="font-bold text-gray-700 text-lg">{avgRating} overall</span>
            </div>
          )}
        </div>

        {/* Quick tags */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Quick Tags</h2>
          <p className="text-sm text-gray-500 mb-4">Select all that apply</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {positiveTags.map(t => (
              <button key={t} type="button" onClick={() => toggleTag(t)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                  tags.includes(t)
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
                }`}>
                {tags.includes(t) && <i className="fa-solid fa-check mr-1.5 text-xs"></i>}{t}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {negativeTags.map(t => (
              <button key={t} type="button" onClick={() => toggleTag(t)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                  tags.includes(t)
                    ? 'bg-red-500 text-white border-red-500'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-red-300'
                }`}>
                {tags.includes(t) && <i className="fa-solid fa-check mr-1.5 text-xs"></i>}{t}
              </button>
            ))}
          </div>
        </div>

        {/* Written review */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-gray-900">Written Feedback</h2>
            <span className={`text-xs font-medium ${reviewText.length >= 20 ? 'text-emerald-600' : 'text-gray-400'}`}>
              {reviewText.length} / 20 min
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            Share your honest experience working with this client. This will appear on their public profile.
          </p>
          <textarea
            value={reviewText}
            onChange={e => setReviewText(e.target.value)}
            rows={4}
            placeholder="e.g. 'Great communication throughout the project. Clear brief from the start, paid promptly and gave useful feedback at each stage. Would definitely work with them again.'"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cobalt resize-none leading-relaxed"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            <i className="fa-solid fa-circle-exclamation mr-2"></i>{error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!allRated || reviewText.trim().length < 20 || submitting}
          className="w-full py-4 text-base font-bold text-white bg-cobalt rounded-2xl hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {submitting
            ? <><i className="fa-solid fa-spinner animate-spin"></i>Submitting…</>
            : <><i className="fa-solid fa-star"></i>Submit Review</>
          }
        </button>

        {(!allRated || reviewText.trim().length < 20) && (
          <p className="text-center text-xs text-gray-400">
            {!allRated ? 'Rate all categories to continue' : 'Write at least 20 characters to continue'}
          </p>
        )}
      </div>
    </div>
  );
}

export default function CreatorReviewPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ReviewForm />
    </Suspense>
  );
}
