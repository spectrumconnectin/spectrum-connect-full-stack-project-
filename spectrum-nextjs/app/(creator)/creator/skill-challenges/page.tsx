'use client';

import { useState, useEffect, useCallback } from 'react';
import { skillChallenges, SkillChallengeItem, SkillBadge, SkillSubmissionItem } from '../../../../lib/api';

const DIFFICULTY_COLOR: Record<string, string> = {
  beginner: 'bg-green-50 text-green-700',
  intermediate: 'bg-amber-50 text-amber-700',
  advanced: 'bg-red-50 text-red-700',
};

const BADGE_COLOR: Record<string, string> = {
  bronze: 'bg-orange-50 text-orange-700',
  silver: 'bg-gray-100 text-gray-600',
  gold: 'bg-yellow-50 text-yellow-700',
  platinum: 'bg-indigo-50 text-indigo-700',
  diamond: 'bg-sky-50 text-sky-700',
};

function diffColor(d: string) {
  return DIFFICULTY_COLOR[d.toLowerCase()] ?? 'bg-gray-100 text-gray-600';
}

function badgeColor(level: string) {
  return BADGE_COLOR[level.toLowerCase()] ?? 'bg-gray-100 text-gray-600';
}

function deriveStatus(id: string, map: Map<string, SkillSubmissionItem>): 'available' | 'submitted' | 'completed' {
  const sub = map.get(id);
  if (!sub) return 'available';
  if (sub.evaluation_status === 'passed') return 'completed';
  if (sub.evaluation_status === 'failed') return 'available';
  return 'submitted';
}

function getSubmission(id: string, map: Map<string, SkillSubmissionItem>) {
  return map.get(id);
}

export default function SkillChallengesPage() {
  const [challenges, setChallenges] = useState<SkillChallengeItem[]>([]);
  const [badges, setBadges] = useState<SkillBadge[]>([]);
  const [submissionsMap, setSubmissionsMap] = useState<Map<string, SkillSubmissionItem>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<'all' | 'available' | 'submitted' | 'completed'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submitTarget, setSubmitTarget] = useState<string | null>(null);
  const [linkInputs, setLinkInputs] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [chalRes, badgeRes, subRes] = await Promise.all([
        skillChallenges.list({ limit: 50 }),
        skillChallenges.getMyBadges(true),
        skillChallenges.getMySubmissions({ limit: 100 }),
      ]);
      setChallenges(chalRes.challenges);
      setBadges(badgeRes.badges);
      const map = new Map<string, SkillSubmissionItem>();
      for (const s of subRes.submissions) map.set(s.challenge_id, s);
      setSubmissionsMap(map);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleSubmit = async (challengeId: string) => {
    const link = (linkInputs[challengeId] ?? '').trim();
    if (!link || submitting) return;
    setSubmitting(challengeId);
    try {
      await skillChallenges.submit(challengeId, link, 'link');
      const subRes = await skillChallenges.getMySubmissions({ limit: 100 });
      const map = new Map<string, SkillSubmissionItem>();
      for (const s of subRes.submissions) map.set(s.challenge_id, s);
      setSubmissionsMap(map);
      setSubmitTarget(null);
      setLinkInputs(prev => { const n = { ...prev }; delete n[challengeId]; return n; });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(null);
    }
  };

  const filtered = challenges.filter(c => {
    if (filter === 'all') return true;
    return deriveStatus(c.challenge_id, submissionsMap) === filter;
  });

  const completedCount = challenges.filter(c => deriveStatus(c.challenge_id, submissionsMap) === 'completed').length;
  const submittedCount = challenges.filter(c => deriveStatus(c.challenge_id, submissionsMap) === 'submitted').length;

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">Loading challenges…</p>
    </div>
  );

  if (error) return (
    <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
      <i className="fa-solid fa-circle-exclamation text-4xl text-red-300 mb-4 block"></i>
      <p className="text-red-500 text-sm mb-4">{error}</p>
      <button onClick={loadAll} className="px-5 py-2.5 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">Try Again</button>
    </div>
  );

  return (
    <>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Skill Challenges</h1>
        <p className="text-lg text-gray-600">Prove your skills, earn badges, and get noticed by top clients.</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Badges Earned', value: badges.length, icon: 'fa-medal', color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Completed', value: completedCount, icon: 'fa-circle-check', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'In Review', value: submittedCount, icon: 'fa-hourglass-half', color: 'text-cobalt', bg: 'bg-blue-50' },
        ].map(({ label, value, icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${bg}`}>
              <i className={`fa-solid ${icon} ${color}`}></i>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-sm text-gray-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* My Badges */}
      {badges.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">My Badges</h3>
          <div className="flex gap-4 flex-wrap">
            {badges.map(b => (
              <div key={b.badge_id} className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${badgeColor(b.badge_level).replace('text-', 'border-').replace('bg-', 'bg-')}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${badgeColor(b.badge_level)}`}>
                  {b.badge_level[0].toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">{b.skill_name}</div>
                  <div className="text-xs text-gray-500">{b.challenge_title}</div>
                  <div className="text-xs text-gray-400">{new Date(b.awarded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['all', 'available', 'submitted', 'completed'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${filter === f ? 'bg-cobalt text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Challenge Cards */}
      <div className="space-y-4">
        {filtered.map(c => {
          const status = deriveStatus(c.challenge_id, submissionsMap);
          const sub = getSubmission(c.challenge_id, submissionsMap);
          const link = linkInputs[c.challenge_id] ?? '';
          const isExpanded = expandedId === c.challenge_id;
          const isSubmitOpen = submitTarget === c.challenge_id;

          return (
            <div key={c.challenge_id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${diffColor(c.difficulty)}`}>
                        {c.difficulty.charAt(0).toUpperCase() + c.difficulty.slice(1)}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">{c.skill_category}</span>
                      {status === 'submitted' && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">In Review</span>
                      )}
                      {status === 'completed' && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                          <i className="fa-solid fa-circle-check mr-1"></i>Completed
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{c.title}</h3>
                    <p className="text-sm text-gray-600">{c.description}</p>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                      <span><i className="fa-solid fa-users mr-1"></i>{c.submission_count.toLocaleString()} submissions</span>
                      <span><i className="fa-solid fa-chart-line mr-1"></i>{Math.round(c.pass_rate * 100)}% pass rate</span>
                      {c.time_limit_minutes && (
                        <span><i className="fa-regular fa-clock mr-1"></i>{c.time_limit_minutes} min limit</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-xl ${badgeColor(c.badge_level)}`}>
                      {c.badge_level.charAt(0).toUpperCase() + c.badge_level.slice(1)} Badge
                    </span>
                    <div className="mt-3 flex flex-col gap-2">
                      {status === 'available' && (
                        <button onClick={() => setSubmitTarget(t => t === c.challenge_id ? null : c.challenge_id)}
                          className="px-4 py-2 bg-cobalt text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition">
                          {isSubmitOpen ? 'Cancel' : sub ? 'Resubmit' : 'Submit entry'}
                        </button>
                      )}
                      <button onClick={() => setExpandedId(id => id === c.challenge_id ? null : c.challenge_id)}
                        className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition">
                        {isExpanded ? 'Hide' : 'Details'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Submit form */}
                {isSubmitOpen && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Submission link</label>
                    <div className="flex gap-3">
                      <input
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-cobalt"
                        placeholder="https://drive.google.com/… or Behance, Vimeo, etc."
                        value={link}
                        onChange={e => setLinkInputs(prev => ({ ...prev, [c.challenge_id]: e.target.value }))}
                      />
                      <button
                        onClick={() => handleSubmit(c.challenge_id)}
                        disabled={!link || submitting === c.challenge_id}
                        className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition ${!link || submitting === c.challenge_id ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-cobalt text-white hover:bg-blue-700'}`}>
                        {submitting === c.challenge_id ? 'Submitting…' : 'Submit'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600 space-y-1.5">
                    <p><span className="font-semibold">Pass threshold:</span> {c.pass_threshold}%</p>
                    <p><span className="font-semibold">Badge level:</span> {c.badge_level.charAt(0).toUpperCase() + c.badge_level.slice(1)}</p>
                    <p><span className="font-semibold">Average score:</span> {c.average_score > 0 ? `${Math.round(c.average_score)}%` : '—'}</p>
                    {c.criteria_count > 0 && <p><span className="font-semibold">Evaluation criteria:</span> {c.criteria_count} criteria</p>}
                    {sub && (
                      <>
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <p className="font-semibold text-gray-800 mb-1">Your submission</p>
                          <p><span className="font-semibold">Status:</span>{' '}
                            <span className={sub.evaluation_status === 'passed' ? 'text-emerald-600' : sub.evaluation_status === 'failed' ? 'text-red-500' : 'text-amber-600'}>
                              {sub.evaluation_status.charAt(0).toUpperCase() + sub.evaluation_status.slice(1)}
                            </span>
                          </p>
                          {sub.overall_score != null && <p><span className="font-semibold">Score:</span> {sub.overall_score}%</p>}
                          <p><span className="font-semibold">Attempt:</span> #{sub.attempt_number}</p>
                          <p><span className="font-semibold">Submitted:</span> {new Date(sub.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-medal text-amber-500 text-2xl"></i>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {filter === 'all' ? 'No challenges available' : `No ${filter} challenges`}
            </h3>
            <p className="text-gray-500 text-sm">
              {filter === 'all' ? 'Check back soon for new challenges.' : 'Try a different filter to see more.'}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
