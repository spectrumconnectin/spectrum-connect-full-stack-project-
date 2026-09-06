'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { jobs, ProjectWorkspaceResponse } from '@/lib/api';

/**
 * The shared workspace for everyone hired onto a project.
 *
 * Rendered for both the client and the hired creators — they see the same
 * roster and the same chat, because collaboration is the point. What differs
 * comes from the API: a creator gets their own tasks separated out and no
 * teammate's payment amounts.
 */

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  funded: 'bg-blue-50 text-cobalt',
  delivered: 'bg-amber-50 text-amber-700',
  revision_requested: 'bg-orange-50 text-orange-700',
  approved: 'bg-emerald-50 text-emerald-700',
  released: 'bg-emerald-100 text-emerald-800',
  refunded: 'bg-rose-50 text-rose-600',
  disputed: 'bg-rose-100 text-rose-700',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Not started',
  funded: 'In progress',
  delivered: 'Submitted',
  revision_requested: 'Revision requested',
  approved: 'Approved',
  released: 'Paid',
  refunded: 'Refunded',
  disputed: 'Disputed',
};

function money(amount?: number | null, currency = 'USD'): string {
  if (amount == null) return '';
  return `${currency === 'USD' ? '$' : ''}${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden" role="progressbar"
      aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full bg-cobalt rounded-full" style={{ width: `${percent}%` }} />
    </div>
  );
}

interface Props {
  jobId: string;
  /** Where the back arrow goes — differs between the client and creator areas. */
  backHref: string;
  messagingHref: string;
}

export default function TeamWorkspace({ jobId, backHref, messagingHref }: Props) {
  const [ws, setWs] = useState<ProjectWorkspaceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    jobs.workspace(jobId)
      .then(setWs)
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [jobId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Loading workspace…</p>
      </div>
    );
  }

  if (error || !ws) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
        <i className="fa-solid fa-circle-exclamation text-4xl text-red-300 mb-4 block"></i>
        <p className="text-red-500 text-sm">{error ?? 'Workspace unavailable'}</p>
        <Link href={backHref}
          className="inline-block mt-5 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:border-cobalt hover:text-cobalt transition">
          Back to project
        </Link>
      </div>
    );
  }

  const currency = ws.currency;

  return (
    <>
      <section className="mb-8">
        <div className="flex items-center gap-4">
          <Link href={backHref}
            className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center hover:bg-gray-50 transition flex-shrink-0">
            <i className="fa-solid fa-arrow-left text-gray-600"></i>
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 truncate">{ws.title}</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {ws.team_size} {ws.team_size === 1 ? 'person' : 'people'} on this project
              {ws.viewer.role && <> · you&apos;re the <span className="font-medium text-gray-700">{ws.viewer.role}</span></>}
            </p>
          </div>
        </div>
      </section>

      {/* Progress + chat */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-sm mb-6">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-3">
          <div>
            <h2 className="font-bold text-gray-900">Progress</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {ws.progress.done} of {ws.progress.total} deliverables complete
              {ws.progress.in_flight > 0 && ` · ${ws.progress.in_flight} awaiting review`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-gray-900 tabular-nums">{ws.progress.percent}%</span>
            {ws.conversation_id && (
              <Link href={messagingHref}
                className="px-4 py-2 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
                <i className="fa-solid fa-comments text-xs mr-2"></i>
                Team chat
              </Link>
            )}
          </div>
        </div>
        <ProgressBar percent={ws.progress.percent} />

        {ws.roles_summary && (
          <p className="text-sm text-gray-500 mt-4 pt-4 border-t border-gray-100">
            <span className="font-semibold text-gray-900">
              {ws.roles_summary.filled_seats}/{ws.roles_summary.total_seats}
            </span>{' '}
            positions filled
            {ws.roles_summary.open_seats > 0 && ` · ${ws.roles_summary.open_seats} still open`}
          </p>
        )}
      </div>

      {/* The viewer's own work, separated from the team's */}
      {ws.my_tasks.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-sm mb-6">
          <h2 className="font-bold text-gray-900 mb-1">Your tasks</h2>
          <p className="text-sm text-gray-500 mb-4">
            What you owe on this project. Everything else below is the team&apos;s.
          </p>
          <div className="space-y-2">
            {ws.my_tasks.map(t => (
              <div key={t.milestone_id}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3">
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 truncate">{t.title}</div>
                  {t.google_drive_link && (
                    <a href={t.google_drive_link} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-cobalt hover:underline">
                      View submitted work
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {t.amount != null && (
                    <span className="text-sm text-gray-500">{money(t.amount, currency)}</span>
                  )}
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[t.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABEL[t.status] ?? t.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Roster */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-sm mb-6">
        <h2 className="font-bold text-gray-900 mb-4">Team</h2>
        <div className="space-y-4">
          {ws.team.map(m => (
            <div key={m.creator_id} className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  {m.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.avatar} alt={m.name}
                      className="w-10 h-10 rounded-xl object-cover border border-gray-200" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-cobalt font-bold flex items-center justify-center">
                      {m.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{m.name}</span>
                      {m.is_you && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-cobalt border border-blue-100">
                          You
                        </span>
                      )}
                    </div>
                    {m.role && <div className="text-xs text-gray-500">{m.role}</div>}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-sm text-gray-500">
                    {m.progress.done}/{m.progress.total} done
                  </div>
                  {/* Amounts only appear where the API supplied them — a creator
                      never receives a teammate's escrow. */}
                  {m.escrow && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {money(m.escrow.released_amount, currency)} of {money(m.escrow.total_amount, currency)} paid
                    </div>
                  )}
                </div>
              </div>

              {m.progress.total > 0 && (
                <div className="mt-3">
                  <ProgressBar percent={m.progress.percent} />
                </div>
              )}

              {m.deliverables.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {m.deliverables.map(d => (
                    <span key={d}
                      className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                      {d}
                    </span>
                  ))}
                </div>
              )}

              {m.milestones.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                  {m.milestones.map(ms => (
                    <div key={ms.milestone_id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-gray-700 min-w-0 truncate">{ms.title}</span>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {ms.amount != null && (
                          <span className="text-gray-500">{money(ms.amount, currency)}</span>
                        )}
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[ms.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABEL[ms.status] ?? ms.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Shared output */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-sm">
        <h2 className="font-bold text-gray-900 mb-1">Delivered work</h2>
        <p className="text-sm text-gray-500 mb-4">Everything the team has submitted so far.</p>

        {ws.deliveries.length === 0 ? (
          <div className="border border-dashed border-gray-300 rounded-xl py-10 text-center">
            <i className="fa-solid fa-folder-open text-3xl text-gray-300 mb-3 block"></i>
            <p className="text-gray-500 text-sm">Nothing has been submitted yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {ws.deliveries.map(d => {
              const author = ws.team.find(m => m.creator_id === d.creator_id);
              return (
                <div key={d.milestone_id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">{d.title}</div>
                    <div className="text-xs text-gray-500">
                      {author?.name ?? 'Team member'}
                      {d.delivered_at && ` · ${new Date(d.delivered_at).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[d.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABEL[d.status] ?? d.status}
                    </span>
                    {d.google_drive_link && (
                      <a href={d.google_drive_link} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-semibold text-cobalt hover:underline">
                        Open
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
