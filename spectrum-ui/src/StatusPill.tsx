import * as React from 'react';

export type ProjectStatus =
  | 'open' | 'in_review' | 'pending_funding' | 'in_progress' | 'delivered'
  | 'revision_requested' | 'approved' | 'completed' | 'removed' | 'cancelled' | 'draft';

export interface StatusPillProps {
  /** Raw backend status. Rendered with a human label — never the raw enum. */
  status: ProjectStatus | string;
  /** Override the label when context needs different wording. */
  label?: string;
}

const LABELS: Record<string, string> = {
  open: 'Open',
  in_review: 'In Review',
  pending_funding: 'Pending Funding',
  in_progress: 'Active',
  delivered: 'Delivered',
  revision_requested: 'Revision Requested',
  approved: 'Approved',
  completed: 'Completed',
  removed: 'Removed',
  cancelled: 'Cancelled',
  draft: 'Draft',
};

const STYLES: Record<string, string> = {
  open: 'bg-green-100 text-green-700',
  in_review: 'bg-amber-100 text-amber-700',
  pending_funding: 'bg-orange-100 text-orange-700',
  in_progress: 'bg-blue-100 text-blue-700',
  delivered: 'bg-indigo-100 text-indigo-700',
  revision_requested: 'bg-orange-100 text-orange-700',
  approved: 'bg-teal-100 text-teal-700',
  completed: 'bg-emerald-100 text-emerald-700',
  removed: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-rose-100 text-rose-600',
  draft: 'bg-gray-100 text-gray-500',
};

/**
 * A project's state, as the client and creator see it.
 *
 * Falls back to a neutral pill and the raw value for an unknown status rather
 * than rendering nothing — an unrecognised state should be visible, not silent.
 */
export function StatusPill({ status, label }: StatusPillProps) {
  return (
    <span
      className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap ${
        STYLES[status] ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {label ?? LABELS[status] ?? status}
    </span>
  );
}
