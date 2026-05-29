'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { proposals, JobProposalItem } from '@/lib/api';

const STATUS_FILTERS = ['All', 'submitted', 'shortlisted', 'interviewing', 'accepted', 'rejected'];

const STATUS_STYLE: Record<string, string> = {
  submitted:    'bg-blue-100 text-blue-700',
  shortlisted:  'bg-purple-100 text-purple-700',
  interviewing: 'bg-amber-100 text-amber-700',
  accepted:     'bg-emerald-100 text-emerald-700',
  rejected:     'bg-rose-100 text-rose-600',
};

const STATUS_LABEL: Record<string, string> = {
  submitted:    'New',
  shortlisted:  'Shortlisted',
  interviewing: 'Interviewing',
  accepted:     'Hired',
  rejected:     'Declined',
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ApplicantsPage() {
  const { id } = useParams<{ id: string }>();
  const [filter, setFilter] = useState('All');
  const [applicants, setApplicants] = useState<JobProposalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    proposals.getForJob(id)
      .then(data => setApplicants(data || []))
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  const filtered = filter === 'All'
    ? applicants
    : applicants.filter(a => a.status === filter);

  const handleStatus = async (proposalId: string, newStatus: string) => {
    setUpdating(proposalId);
    try {
      await proposals.updateStatus(proposalId, newStatus);
      setApplicants(prev =>
        prev.map(a => a.id === proposalId ? { ...a, status: newStatus } : a)
      );
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <>
      <section className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <Link href={`/client/projects/${id}`}
            className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center hover:bg-gray-50 transition">
            <i className="fa-solid fa-arrow-left text-gray-600"></i>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Applicants</h1>
            <p className="text-gray-500">
              {loading ? 'Loading…' : `${applicants.length} application${applicants.length !== 1 ? 's' : ''} received`}
            </p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-8 flex items-center gap-2 flex-wrap shadow-sm">
        {STATUS_FILTERS.map(f => {
          const count = f === 'All' ? applicants.length : applicants.filter(a => a.status === f).length;
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition ${filter === f ? 'bg-blue-50 text-cobalt font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
              {f === 'All' ? 'All' : (STATUS_LABEL[f] ?? f)}
              {count > 0 && (
                <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading applicants…</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <i className="fa-solid fa-circle-exclamation text-4xl text-red-300 mb-4 block"></i>
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
          <i className="fa-solid fa-users text-4xl text-gray-300 mb-4 block"></i>
          <h3 className="font-semibold text-gray-600 mb-2">
            {applicants.length === 0 ? 'No applications yet' : 'No applicants match this filter'}
          </h3>
          <p className="text-gray-400 text-sm">
            {applicants.length === 0
              ? 'Make sure your job is published and open to receive proposals.'
              : 'Try a different filter tab.'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filtered.map(a => (
            <div key={a.id} className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm hover:border-cobalt transition">
              <div className="flex items-start gap-5">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {a.creator_avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.creator_avatar} alt={a.creator_name}
                      className="w-16 h-16 rounded-2xl border-2 border-gray-200 object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl border-2 border-gray-200 bg-blue-100 flex items-center justify-center text-cobalt font-bold text-2xl">
                      {a.creator_name[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className={`absolute -top-1.5 -right-1.5 text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[a.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABEL[a.status] ?? a.status}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{a.creator_name}</h3>
                      {a.creator_title && <p className="text-cobalt font-semibold text-sm">{a.creator_title}</p>}
                      {a.creator_location && (
                        <p className="text-gray-400 text-xs mt-0.5">
                          <i className="fa-solid fa-location-dot mr-1"></i>{a.creator_location}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      {a.proposed_budget && (
                        <div className="text-xl font-bold text-gray-900">${a.proposed_budget.toLocaleString()}</div>
                      )}
                      <div className="text-xs text-gray-400 mt-0.5">{formatDate(a.submitted_at)}</div>
                    </div>
                  </div>

                  {/* Skills */}
                  {a.creator_skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {a.creator_skills.map(s => (
                        <span key={s} className="text-xs px-2.5 py-1 bg-blue-50 text-cobalt rounded-full font-medium">{s}</span>
                      ))}
                    </div>
                  )}

                  {/* Cover letter */}
                  {a.cover_letter && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-sm text-gray-600 line-clamp-3 italic">"{a.cover_letter}"</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-5 pt-5 border-t border-gray-100 flex-wrap">
                {a.status !== 'accepted' && a.status !== 'rejected' && (
                  <>
                    <button
                      disabled={updating === a.id}
                      onClick={() => handleStatus(a.id, 'accepted')}
                      className="flex-1 min-w-[120px] bg-cobalt text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition text-sm disabled:opacity-50">
                      {updating === a.id ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : <i className="fa-solid fa-check mr-2"></i>}
                      Hire {a.creator_name.split(' ')[0]}
                    </button>
                    {a.status !== 'shortlisted' && (
                      <button
                        disabled={updating === a.id}
                        onClick={() => handleStatus(a.id, 'shortlisted')}
                        className="flex-1 min-w-[120px] bg-purple-50 text-purple-700 py-3 rounded-xl font-semibold hover:bg-purple-100 transition text-sm border border-purple-200 disabled:opacity-50">
                        <i className="fa-solid fa-star mr-2"></i>Shortlist
                      </button>
                    )}
                    <button
                      disabled={updating === a.id}
                      onClick={() => handleStatus(a.id, 'rejected')}
                      className="px-5 py-3 bg-gray-50 text-rose-500 rounded-xl font-semibold hover:bg-rose-50 transition text-sm border border-gray-200 disabled:opacity-50">
                      Decline
                    </button>
                  </>
                )}
                {a.status === 'accepted' && (
                  <div className="flex-1 flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                    <i className="fa-solid fa-circle-check"></i> Hired
                  </div>
                )}
                {a.status === 'rejected' && (
                  <div className="flex-1 flex items-center gap-2 text-rose-400 font-semibold text-sm">
                    <i className="fa-solid fa-circle-xmark"></i> Declined
                    <button
                      onClick={() => handleStatus(a.id, 'submitted')}
                      className="ml-2 text-xs text-cobalt underline font-medium">
                      Undo
                    </button>
                  </div>
                )}
                <Link href={`/client/messaging?userId=${a.creator_id}`}
                  className="px-5 py-3 bg-gray-50 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition text-sm border border-gray-200">
                  <i className="fa-solid fa-comment mr-2"></i>Message
                </Link>
                <Link href={`/client/collaborators/${a.creator_id}`}
                  className="px-5 py-3 bg-gray-50 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition text-sm border border-gray-200">
                  View Profile
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
