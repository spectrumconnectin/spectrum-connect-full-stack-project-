'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { jobs, proposals, messaging, JobPostItem, JobProposalItem, ProposalItem } from '@/lib/api';

const categories = [
  { key: 'quality',       label: 'Quality of Work',     icon: 'fa-star',          desc: 'How good was the final deliverable?' },
  { key: 'communication', label: 'Communication',        icon: 'fa-comments',      desc: 'How responsive and clear were they?' },
  { key: 'timeliness',    label: 'Timeliness',           icon: 'fa-clock',         desc: 'Did they meet deadlines?' },
  { key: 'expertise',     label: 'Skills & Expertise',   icon: 'fa-medal',         desc: 'How skilled were they in their craft?' },
  { key: 'recommend',     label: 'Would Recommend',      icon: 'fa-thumbs-up',     desc: 'Would you hire them again?' },
];

const starLabels = ['', 'Poor', 'Below average', 'Good', 'Very good', 'Excellent'];
const positiveTags = ['Great communication', 'Delivered on time', 'Exceeded expectations', 'Creative problem solver', 'Easy to work with', 'High attention to detail', 'Professional', 'Would hire again'];
const negativeTags = ['Late delivery', 'Poor communication', 'Needed many revisions', 'Below brief quality'];

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<JobPostItem | null>(null);
  // All accepted creators (may be 1 for solo or 3+ for crew)
  const [creators, setCreators] = useState<JobProposalItem[]>([]);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  // Track review status per creator id
  const [reviewedMap, setReviewedMap] = useState<Record<string, { overall: number; review: string } | null>>({});
  const [loadingData, setLoadingData] = useState(true);

  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [hover, setHover] = useState<Record<string, number>>({});
  const [review, setReview] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [privateNote, setPrivateNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showFutureWork, setShowFutureWork] = useState(false);
  const [futureMessage, setFutureMessage] = useState('');
  const [sendingFutureWork, setSendingFutureWork] = useState(false);
  const [futureWorkSent, setFutureWorkSent] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!id) return;
    Promise.allSettled([
      jobs.getById(id),
      proposals.getForJob(id),
    ]).then(([jobRes, propRes]) => {
      if (jobRes.status === 'fulfilled') setJob(jobRes.value);
      if (propRes.status === 'fulfilled') {
        const list = propRes.value?.proposals ?? (Array.isArray(propRes.value) ? propRes.value : []);
        const accepted = list.filter((p: { status: string }) => p.status === 'accepted');
        if (accepted.length === 0 && list.length > 0) accepted.push(list[0]);
        setCreators(accepted);
        if (accepted.length > 0) setSelectedCreatorId(accepted[0].id);
        // Check review status for all accepted creators in parallel
        Promise.allSettled(accepted.map((a: JobProposalItem) => proposals.getReviews(a.id))).then(results => {
          const map: Record<string, { overall: number; review: string } | null> = {};
          results.forEach((r, i) => {
            const cr = accepted[i];
            if (r.status === 'fulfilled' && r.value?.client_rating) {
              map[cr.id] = { overall: r.value.client_rating.overall ?? 0, review: r.value.client_rating.review ?? '' };
            } else {
              map[cr.id] = null;
            }
          });
          setReviewedMap(map);
        });
      }
    }).finally(() => setLoadingData(false));
  }, [id]);

  // Convenience: currently selected creator
  const creator = creators.find(c => c.id === selectedCreatorId) ?? creators[0] ?? null;
  const alreadyReviewed = !!creator && !!reviewedMap[creator.id];
  const existingReview = creator ? reviewedMap[creator.id] : null;

  // Reset form when switching creators
  useEffect(() => {
    setRatings({});
    setHover({});
    setReview('');
    setTags([]);
    setPrivateNote('');
    setSubmitted(false);
    setSubmitError('');
  }, [selectedCreatorId]);

  const allRated = categories.every(c => ratings[c.key] >= 1);
  const avgRating = allRated
    ? (Object.values(ratings).reduce((a, b) => a + b, 0) / categories.length).toFixed(1)
    : null;

  const toggleTag = (t: string) =>
    setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const handleSubmit = async () => {
    if (!allRated || review.trim().length < 20 || !creator) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await proposals.rate(creator.id, {
        ratings,
        review: review.trim(),
        tags,
        private_note: privateNote.trim() || undefined,
      });
      // Mark this creator as reviewed in the local map
      const overall = parseFloat((Object.values(ratings).reduce((a, b) => a + b, 0) / categories.length).toFixed(1));
      setReviewedMap(prev => ({ ...prev, [creator.id]: { overall, review: review.trim() } }));
      setSubmitted(true);
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // How many creators still need a review
  const pendingReviews = creators.filter(c => !reviewedMap[c.id]).length;

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (submitted) {
    // After submitting, show options: review next creator (if crew) or go back
    const nextUnreviewed = creators.find(c => !reviewedMap[c.id] && c.id !== creator?.id);
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200">
          <i className="fa-solid fa-check text-white text-3xl"></i>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Review Submitted!</h1>
        <p className="text-gray-500 mb-2">Thanks for your feedback{creator ? ` for ${creator.creator_name}` : ''}.</p>
        {nextUnreviewed && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
            <p className="text-sm font-semibold text-amber-900 mb-3">
              <i className="fa-solid fa-users mr-2"></i>
              {pendingReviews} more creator{pendingReviews !== 1 ? 's' : ''} still need{pendingReviews === 1 ? 's' : ''} a review
            </p>
            <button
              onClick={() => { setSelectedCreatorId(nextUnreviewed.id); setSubmitted(false); }}
              className="w-full bg-amber-600 text-white py-3 rounded-xl font-semibold hover:bg-amber-700 transition">
              Review {nextUnreviewed.creator_name} →
            </button>
          </div>
        )}
        <p className="text-gray-400 text-sm mb-8">Your review helps the Spectrum community find great collaborators.</p>
        {avgRating && (
          <div className="flex items-center justify-center gap-1 mb-8">
            {[1, 2, 3, 4, 5].map(s => (
              <i key={s} className={`fa-solid fa-star text-2xl ${parseFloat(avgRating) >= s ? 'text-amber-400' : 'text-gray-200'}`}></i>
            ))}
            <span className="ml-2 text-xl font-bold text-gray-900">{avgRating}</span>
          </div>
        )}
        {/* Request Future Work CTA */}
        {!futureWorkSent ? (
          !showFutureWork ? (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-cobalt rounded-xl flex items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-rotate-right text-white text-sm"></i>
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900">Enjoyed working together?</p>
                  <p className="text-sm text-gray-600">Send {creator?.creator_name || 'this creator'} a message to request future work.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setFutureMessage(`Hi ${creator?.creator_name || 'there'},

I really enjoyed working with you on "${job?.title || 'our project'}". I'd love to work together again on an upcoming project. Would you be available?

Looking forward to hearing from you!`);
                  setShowFutureWork(true);
                }}
                className="w-full bg-cobalt text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-paper-plane"></i>
                Request Future Work
              </button>
            </div>
          ) : (
            <div className="bg-white border border-blue-200 rounded-2xl p-6 mb-6 text-left shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <i className="fa-solid fa-envelope text-cobalt"></i>
                  Message to {creator?.creator_name || 'Creator'}
                </h3>
                <button onClick={() => setShowFutureWork(false)} className="text-gray-400 hover:text-gray-600 text-sm">
                  Cancel
                </button>
              </div>
              <textarea
                value={futureMessage}
                onChange={e => setFutureMessage(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cobalt focus:ring-2 focus:ring-blue-100 resize-none leading-relaxed mb-4"
              />
              <button
                onClick={async () => {
                  if (!creator?.creator_id || !futureMessage.trim()) return;
                  setSendingFutureWork(true);
                  try {
                    await messaging.createConversation(
                      [creator.creator_id],
                      id,
                      futureMessage.trim()
                    );
                    setFutureWorkSent(true);
                    setShowFutureWork(false);
                  } catch { /* ignore */ } finally {
                    setSendingFutureWork(false);
                  }
                }}
                disabled={!futureMessage.trim() || sendingFutureWork}
                className="w-full bg-cobalt text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {sendingFutureWork ? (
                  <><i className="fa-solid fa-spinner animate-spin"></i> Sending…</>
                ) : (
                  <><i className="fa-solid fa-paper-plane"></i> Send Message</>
                )}
              </button>
            </div>
          )
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-6 flex items-center gap-3">
            <div className="w-9 h-9 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <i className="fa-solid fa-check text-white text-sm"></i>
            </div>
            <div className="text-left">
              <p className="font-semibold text-green-800">Message sent to {creator?.creator_name || 'creator'}!</p>
              <p className="text-sm text-green-600">They&apos;ll be notified and can respond in Messages.</p>
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <Link href="/client/messaging" className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition">
            Go to Messages
          </Link>
          <Link href="/client/projects" className="px-6 py-3 bg-cobalt text-white rounded-xl font-semibold hover:bg-blue-700 transition">
            My Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href={`/client/projects/${id}`} className="text-sm text-gray-500 hover:text-cobalt transition flex items-center gap-1.5 mb-4">
          <i className="fa-solid fa-arrow-left text-xs"></i> Back to project
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Leave a Review</h1>
        <p className="text-gray-500">Share your experience to help the Spectrum community.</p>
      </div>

      {/* ── Crew creator picker — shown when multiple creators are hired ── */}
      {creators.length > 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
            <i className="fa-solid fa-users mr-1.5"></i>Crew project — review each creator
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            {creators.map(c => {
              const reviewed = !!reviewedMap[c.id];
              const isSelected = c.id === selectedCreatorId;
              return (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCreatorId(c.id); setSubmitted(false); }}
                  className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition text-left ${
                    isSelected
                      ? 'border-cobalt bg-blue-50'
                      : reviewed
                      ? 'border-emerald-300 bg-emerald-50'
                      : 'border-gray-200 hover:border-cobalt hover:bg-gray-50'
                  }`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    reviewed ? 'bg-emerald-500 text-white' : 'bg-blue-100 text-cobalt'
                  }`}>
                    {reviewed
                      ? <i className="fa-solid fa-check text-xs" />
                      : c.creator_name[0]?.toUpperCase()
                    }
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold truncate ${isSelected ? 'text-cobalt' : 'text-gray-900'}`}>
                      {c.creator_name}
                    </p>
                    <p className={`text-xs truncate ${reviewed ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {reviewed ? 'Reviewed ✓' : c.creator_title ?? 'Creator'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Already reviewed inline card (non-blocking — can still switch creator) */}
      {alreadyReviewed && !submitted && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <i className="fa-solid fa-circle-check text-emerald-600 text-lg"></i>
            <p className="font-semibold text-emerald-900">Review already submitted for {creator?.creator_name}</p>
          </div>
          {existingReview && (
            <div className="flex items-center gap-2 mt-1">
              {[1,2,3,4,5].map(s => (
                <i key={s} className={`fa-star text-sm ${existingReview.overall >= s ? 'fa-solid text-amber-400' : 'fa-regular text-gray-300'}`} />
              ))}
              <span className="text-sm font-bold text-gray-700">{existingReview.overall.toFixed(1)}</span>
            </div>
          )}
          {creators.length === 1 && (
            <Link href={`/client/projects/${id}`} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-cobalt hover:underline">
              <i className="fa-solid fa-arrow-left text-xs"></i> Back to project
            </Link>
          )}
        </div>
      )}

      {/* Only show the review form when the selected creator hasn't been reviewed yet */}
      {alreadyReviewed && !submitted ? null : (
      <>

      {/* Creator / Project card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8 flex items-center gap-5 shadow-sm">
        {creator?.creator_avatar
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={creator.creator_avatar} alt={creator.creator_name} className="w-16 h-16 rounded-2xl border-2 border-gray-200 object-cover flex-shrink-0" />
          : <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center text-cobalt font-bold text-2xl border-2 border-gray-200 flex-shrink-0">
              {creator ? creator.creator_name[0]?.toUpperCase() : '?'}
            </div>
        }
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900">{creator?.creator_name ?? 'Creator'}</h2>
          {creator?.creator_title && <p className="text-sm text-gray-500">{creator.creator_title}</p>}
          {job && <p className="text-xs text-cobalt font-medium mt-1"><i className="fa-solid fa-briefcase mr-1 text-gray-400"></i>{job.title}</p>}
        </div>
        {avgRating && (
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{avgRating}</div>
            <div className="flex items-center justify-center gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map(s => (
                <i key={s} className={`fa-solid fa-star text-xs ${parseFloat(avgRating) >= s ? 'text-amber-400' : 'text-gray-200'}`}></i>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Overall</p>
          </div>
        )}
      </div>

      {/* Star ratings */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-5">Rate Your Experience</h3>
        <div className="space-y-5">
          {categories.map(cat => (
            <div key={cat.key} className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <i className={`fa-solid ${cat.icon} text-cobalt text-sm`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{cat.label}</p>
                <p className="text-xs text-gray-400">{cat.desc}</p>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onMouseEnter={() => setHover(h => ({ ...h, [cat.key]: star }))}
                    onMouseLeave={() => setHover(h => ({ ...h, [cat.key]: 0 }))}
                    onClick={() => setRatings(r => ({ ...r, [cat.key]: star }))}
                    className="text-2xl transition-transform hover:scale-110 focus:outline-none"
                    title={starLabels[star]}
                  >
                    <i className={`fa-star ${(hover[cat.key] || ratings[cat.key] || 0) >= star ? 'fa-solid text-amber-400' : 'fa-regular text-gray-300'}`}></i>
                  </button>
                ))}
                <span className="text-xs text-gray-500 ml-2 w-20">
                  {(ratings[cat.key] || hover[cat.key]) ? starLabels[hover[cat.key] || ratings[cat.key]] : <span className="text-gray-300">Not rated</span>}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Written review */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-1">Written Review</h3>
        <p className="text-xs text-gray-400 mb-4">Minimum 20 characters. Be specific — it helps other clients make informed decisions.</p>
        <textarea
          value={review}
          onChange={e => setReview(e.target.value)}
          rows={5}
          placeholder="Describe your experience working with this creator. What went well? What could have been better? Would you hire them again?"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cobalt focus:ring-2 focus:ring-blue-100 resize-none leading-relaxed"
        />
        <div className="flex items-center justify-between mt-2">
          <p className={`text-xs ${review.length < 20 ? 'text-gray-400' : 'text-green-600'}`}>
            {review.length < 20 ? `${20 - review.length} more characters needed` : `${review.length} characters — looking good!`}
          </p>
          <p className="text-xs text-gray-300">{review.length} / 1000</p>
        </div>
      </div>

      {/* Quick tags */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-4">Quick Tags <span className="text-gray-400 font-normal text-sm">(optional)</span></h3>
        <div className="mb-3">
          <p className="text-xs text-green-600 font-semibold mb-2 uppercase tracking-wide">Positive</p>
          <div className="flex flex-wrap gap-2">
            {positiveTags.map(t => (
              <button key={t} onClick={() => toggleTag(t)}
                className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition ${tags.includes(t) ? 'bg-green-50 border-green-400 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-green-300'}`}>
                {tags.includes(t) && <i className="fa-solid fa-check mr-1 text-green-500"></i>}{t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-red-500 font-semibold mb-2 uppercase tracking-wide">Constructive</p>
          <div className="flex flex-wrap gap-2">
            {negativeTags.map(t => (
              <button key={t} onClick={() => toggleTag(t)}
                className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition ${tags.includes(t) ? 'bg-red-50 border-red-300 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-red-200'}`}>
                {tags.includes(t) && <i className="fa-solid fa-check mr-1 text-red-400"></i>}{t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Private note */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-base font-bold text-gray-900">Private Note</h3>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Only visible to Spectrum team</span>
        </div>
        <p className="text-xs text-gray-400 mb-3">Optional — share anything you&apos;d rather not make public.</p>
        <textarea
          value={privateNote}
          onChange={e => setPrivateNote(e.target.value)}
          rows={2}
          placeholder="E.g. scope creep issues, off-platform payment requests, etc."
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cobalt resize-none leading-relaxed"
        />
      </div>

      {/* Submit */}
      {submitError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          <i className="fa-solid fa-circle-exclamation mr-2"></i>{submitError}
        </div>
      )}
      <div className="flex items-center justify-between gap-4 pb-12">
        <Link href={`/client/projects/${id}`} className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition text-sm">
          Cancel
        </Link>
        <button
          onClick={handleSubmit}
          disabled={!allRated || review.trim().length < 20 || submitting || !creator}
          className={`px-8 py-3 rounded-xl font-semibold text-sm transition flex items-center gap-2 ${allRated && review.trim().length >= 20 && !submitting && creator ? 'bg-cobalt text-white hover:bg-blue-700 shadow-sm' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
        >
          {submitting ? <><i className="fa-solid fa-spinner animate-spin"></i> Submitting…</> : <><i className="fa-solid fa-paper-plane"></i> Submit Review</>}
        </button>
      </div>

      </> /* end conditional review form */
      )}
    </div>
  );
}
