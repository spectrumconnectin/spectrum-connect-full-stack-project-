'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  escrow as escrowApi,
  EscrowAllocationPlan,
  ProjectEscrowOverview,
} from '@/lib/api';

/**
 * Splitting a project budget across the hired team.
 *
 * The client sees exactly who would be allocated what before anything is
 * created, because allocation decides who gets paid. Once allocated, the same
 * page becomes the payout board: each member funds, delivers and is released
 * independently.
 */

const MILESTONE_STYLE: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  funded: 'bg-blue-50 text-cobalt',
  delivered: 'bg-amber-50 text-amber-700',
  revision_requested: 'bg-orange-50 text-orange-700',
  approved: 'bg-emerald-50 text-emerald-700',
  released: 'bg-emerald-100 text-emerald-800',
  refunded: 'bg-rose-50 text-rose-600',
  disputed: 'bg-rose-100 text-rose-700',
};

const MILESTONE_LABEL: Record<string, string> = {
  pending: 'Not funded',
  funded: 'Funded',
  delivered: 'Delivered',
  revision_requested: 'Revision requested',
  approved: 'Approved',
  released: 'Paid',
  refunded: 'Refunded',
  disputed: 'Disputed',
};

function money(amount: number | null | undefined, currency = 'USD'): string {
  if (amount == null) return '—';
  const symbol = currency === 'USD' ? '$' : '';
  return `${symbol}${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function ProjectFundingPage() {
  const { id } = useParams<{ id: string }>();
  const [plan, setPlan] = useState<EscrowAllocationPlan | null>(null);
  const [overview, setOverview] = useState<ProjectEscrowOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const [p, o] = await Promise.all([
        escrowApi.allocationPlan(id),
        escrowApi.projectOverview(id),
      ]);
      setPlan(p);
      setOverview(o);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleAllocate = async () => {
    if (!plan) return;
    setAllocating(true);
    setError(null);
    setNotice(null);
    try {
      const res = await escrowApi.allocateProject(id);
      setNotice(res.message);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAllocating(false);
    }
  };

  const currency = plan?.currency ?? overview?.currency ?? 'USD';
  const pending = plan?.members.filter(m => !m.already_allocated) ?? [];
  const canAllocate = (plan?.allocatable_count ?? 0) > 0 && !plan?.over_budget;

  return (
    <>
      <section className="mb-8">
        <div className="flex items-center gap-4">
          <Link href={`/client/projects/${id}`}
            className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center hover:bg-gray-50 transition flex-shrink-0">
            <i className="fa-solid fa-arrow-left text-gray-600"></i>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Team funding</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {loading ? 'Loading…' : plan?.title ?? overview?.title}
            </p>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading funding…</p>
        </div>
      ) : error && !plan ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <i className="fa-solid fa-circle-exclamation text-4xl text-red-300 mb-4 block"></i>
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Totals */}
          {overview && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6">
                <Figure label="Project budget" value={money(overview.project_budget, currency)} />
                <Figure label="Allocated" value={money(overview.allocated_total, currency)} />
                <Figure label="In escrow" value={money(overview.funded_total, currency)} />
                <Figure label="Paid out" value={money(overview.released_total, currency)} />
              </div>
              {overview.unallocated != null && overview.unallocated !== 0 && (
                <p className="text-sm text-gray-500 mt-4 pt-4 border-t border-gray-100">
                  {overview.unallocated > 0 ? (
                    <>
                      <span className="font-semibold text-gray-900">
                        {money(overview.unallocated, currency)}
                      </span>{' '}
                      of the budget is not yet allocated to anyone.
                    </>
                  ) : (
                    <span className="text-rose-700">
                      Allocations exceed the project budget by{' '}
                      <span className="font-semibold">
                        {money(Math.abs(overview.unallocated), currency)}
                      </span>.
                    </span>
                  )}
                </p>
              )}
            </div>
          )}

          {notice && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <i className="fa-solid fa-check mr-2"></i>{notice}
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {/* Not yet allocated */}
          {pending.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div>
                  <h2 className="font-bold text-gray-900">Ready to allocate</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Each person gets their own escrow, funded and released independently.
                  </p>
                </div>
                <button
                  onClick={handleAllocate}
                  disabled={!canAllocate || allocating}
                  className="px-5 py-2.5 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-40 disabled:hover:bg-cobalt flex-shrink-0">
                  {allocating ? 'Allocating…' : `Allocate ${plan?.allocatable_count ?? 0} escrow${(plan?.allocatable_count ?? 0) === 1 ? '' : 's'}`}
                </button>
              </div>

              {plan?.over_budget && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 mb-4">
                  These allocations total {money(plan.grand_total, currency)}, more than the{' '}
                  {money(plan.project_budget, currency)} project budget. Adjust the role budgets
                  on the project before allocating.
                </div>
              )}

              <div className="divide-y divide-gray-100">
                {pending.map(m => (
                  <div key={m.creator_id} className="py-3 flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{m.creator_name}</span>
                        {m.role && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {m.role}
                          </span>
                        )}
                      </div>
                      {m.milestones.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {m.milestones.map(ms => `${ms.title} (${money(ms.amount, currency)})`).join(' · ')}
                        </p>
                      )}
                      {m.needs_amount && (
                        <p className="text-xs text-amber-700 mt-1">
                          No budget set for this role, and they didn&apos;t propose one — set a role
                          budget on the project to allocate them.
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-gray-900">{money(m.amount, currency)}</div>
                      {m.amount_source && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          {m.amount_source === 'role_budget' ? 'from role budget'
                            : m.amount_source === 'proposed_budget' ? 'their proposed rate'
                            : 'manual amount'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Allocated team */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-1">The team</h2>
            <p className="text-sm text-gray-500 mb-4">
              Approving one person&apos;s work releases only their money — nobody else is held up.
            </p>

            {(overview?.members.length ?? 0) === 0 ? (
              <div className="border border-dashed border-gray-300 rounded-xl py-12 text-center">
                <i className="fa-solid fa-users text-3xl text-gray-300 mb-3 block"></i>
                <p className="text-gray-500 text-sm">Nobody has been hired onto this project yet.</p>
                <Link href={`/client/projects/${id}/applicants`}
                  className="inline-block mt-4 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:border-cobalt hover:text-cobalt transition">
                  Review applicants
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {overview!.members.map(m => (
                  <div key={m.creator_id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        {m.creator_avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.creator_avatar} alt={m.creator_name}
                            className="w-10 h-10 rounded-xl object-cover border border-gray-200" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-blue-100 text-cobalt font-bold flex items-center justify-center">
                            {m.creator_name[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900">{m.creator_name}</div>
                          {m.role && <div className="text-xs text-gray-500">{m.role}</div>}
                        </div>
                      </div>

                      {m.escrow ? (
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-gray-900">
                            {money(m.escrow.total_amount, currency)}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {money(m.escrow.funded_amount, currency)} in escrow ·{' '}
                            {money(m.escrow.released_amount, currency)} paid
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex-shrink-0">
                          Not allocated
                        </span>
                      )}
                    </div>

                    {m.escrow && m.escrow.milestones.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                        {m.escrow.milestones.map(ms => (
                          <div key={ms.milestone_id} className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-gray-700 min-w-0 truncate">{ms.title}</span>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="text-gray-500">{money(ms.amount, currency)}</span>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${MILESTONE_STYLE[ms.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                {MILESTONE_LABEL[ms.status] ?? ms.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-xl font-bold text-gray-900 mt-1">{value}</div>
    </div>
  );
}
