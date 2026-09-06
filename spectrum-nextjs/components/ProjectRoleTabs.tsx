'use client';

import { ProjectRole } from '@/lib/api';

/**
 * Role filter strip for a multi-role project.
 *
 * Shows every role with its staffing state ("Filled", "1/2 filled", "Open") and
 * narrows the applicant list to one role. Clients staff a project role by role,
 * so this is the primary axis of the applicants view — status is secondary.
 */

/** "1/2 filled" while partly staffed, a plain state word otherwise. */
export function roleFillLabel(role: ProjectRole): string {
  if (role.status === 'closed') return 'Closed';
  if (role.filled_count >= role.count) return 'Filled';
  if (role.filled_count > 0) return `${role.filled_count}/${role.count} filled`;
  return 'Open';
}

const FILL_STYLE: Record<string, string> = {
  filled: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  partially_filled: 'bg-amber-50 text-amber-700 border-amber-200',
  open: 'bg-white text-gray-600 border-gray-200',
  closed: 'bg-gray-100 text-gray-500 border-gray-200',
};

interface Props {
  roles: ProjectRole[];
  /** Applicants per role_id, for the count bubbles. */
  countsByRole: Record<string, number>;
  totalCount: number;
  activeRoleId: string | null;
  onSelect: (roleId: string | null) => void;
  /** Currency symbol for the per-seat budget line. */
  currencySymbol?: string;
}

export default function ProjectRoleTabs({
  roles,
  countsByRole,
  totalCount,
  activeRoleId,
  onSelect,
  currencySymbol = '$',
}: Props) {
  if (roles.length === 0) return null;

  const filledSeats = roles.reduce((n, r) => n + Math.min(r.filled_count, r.count), 0);
  const totalSeats = roles.reduce((n, r) => n + r.count, 0);
  const activeRole = roles.find(r => r.role_id === activeRoleId) ?? null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <h2 className="font-bold text-gray-900">Roles</h2>
        <p className="text-sm text-gray-500">
          {filledSeats} of {totalSeats} positions filled
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onSelect(null)}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition ${
            activeRoleId === null ? 'bg-blue-50 text-cobalt font-semibold' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          All roles
          <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5">
            {totalCount}
          </span>
        </button>

        {roles.map(r => {
          const isActive = activeRoleId === r.role_id;
          const count = countsByRole[r.role_id] ?? 0;
          return (
            <button
              key={r.role_id}
              onClick={() => onSelect(r.role_id)}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition flex items-center gap-2 ${
                isActive ? 'bg-blue-50 text-cobalt font-semibold' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {r.title}
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                  FILL_STYLE[r.status] ?? FILL_STYLE.open
                }`}
              >
                {roleFillLabel(r)}
              </span>
              {count > 0 && (
                <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {activeRole && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600">
          {activeRole.budget_per_seat != null && (
            <span>
              <span className="text-gray-400">Budget per person</span>{' '}
              <span className="font-semibold text-gray-900">
                {currencySymbol}
                {activeRole.budget_per_seat.toLocaleString()}
              </span>
            </span>
          )}
          {activeRole.seats_remaining > 0 ? (
            <span>
              <span className="font-semibold text-gray-900">{activeRole.seats_remaining}</span>{' '}
              {activeRole.seats_remaining === 1 ? 'seat' : 'seats'} still to fill
            </span>
          ) : (
            <span className="text-emerald-700 font-medium">
              <i className="fa-solid fa-check text-xs mr-1.5"></i>
              Fully staffed — reject a hire to free a seat
            </span>
          )}
          {(activeRole.skills?.length ?? 0) > 0 && (
            <span className="flex items-center gap-1.5 flex-wrap">
              <span className="text-gray-400">Skills</span>
              {activeRole.skills!.map(s => (
                <span
                  key={s}
                  className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-cobalt border border-blue-100"
                >
                  {s}
                </span>
              ))}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
