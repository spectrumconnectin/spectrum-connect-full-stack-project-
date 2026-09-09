import * as React from 'react';

export interface StatProps {
  label: string;
  value: string | number;
  /** Font Awesome class, e.g. `fa-solid fa-paper-plane`. */
  icon?: string;
  /** Tailwind classes for the icon tile, e.g. `bg-blue-50 text-cobalt`. */
  iconClass?: string;
  /** A short note under the value — a delta, a currency, a timeframe. */
  note?: string;
}

/** One headline number. Used in rows of four across the dashboards. */
export function Stat({ label, value, icon, iconClass = 'bg-blue-50 text-cobalt', note }: StatProps) {
  return (
    <div className="bg-white rounded-[20px] p-6 shadow-[0_1px_2px_rgba(15,23,42,.05)]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-600">{label}</span>
        {icon && (
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconClass}`}>
            <i className={icon} aria-hidden />
          </div>
        )}
      </div>
      <p className="text-3xl font-bold text-gray-900 leading-none">{value}</p>
      {note && <p className="text-xs text-gray-400 mt-2">{note}</p>}
    </div>
  );
}

export interface EmptyStateProps {
  /** Font Awesome class, e.g. `fa-solid fa-briefcase`. */
  icon: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/** The dashed placeholder shown where a list has nothing in it yet. */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 sm:p-16 text-center">
      <i className={`${icon} text-4xl text-gray-300 mb-4 block`} aria-hidden />
      <h3 className="font-semibold text-gray-600 mb-2">{title}</h3>
      {description && <p className="text-gray-400 text-sm mb-6">{description}</p>}
      {action}
    </div>
  );
}

export interface ProgressBarProps {
  /** 0–100. Clamped, so an out-of-range value can never draw outside the track. */
  percent: number;
  /** Emerald instead of the cobalt gradient — for a finished state. */
  complete?: boolean;
}

/** The thin progress rail used by escrow milestones and the setup checklist. */
export function ProgressBar({ percent, complete }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, percent));
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-r-full transition-all duration-700 ease-out ${
          complete ? 'bg-emerald-500' : 'bg-gradient-to-r from-cobalt to-blue-400'
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
