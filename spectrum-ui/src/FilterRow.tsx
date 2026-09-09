import * as React from 'react';

export interface FilterRowProps {
  options: string[];
  active: string;
  onChange: (value: string) => void;
  /** Human label for a raw option value. */
  labelFor?: (value: string) => string;
}

/**
 * A single-select filter row.
 *
 * On a phone this scrolls sideways as one row rather than wrapping: ten status
 * labels wrapping onto five rows pushes the list itself most of a screen down.
 * `scroll-fade-x` puts a fade on the trailing edge so the overflow is visible
 * without restoring a scrollbar. Above 640px it wraps, as before.
 */
export function FilterRow({ options, active, onChange, labelFor }: FilterRowProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-fade-x -mx-1 px-1 sm:mx-0 sm:px-0 sm:overflow-visible sm:flex-wrap">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`shrink-0 whitespace-nowrap px-4 py-2.5 text-sm rounded-lg font-medium transition ${
            active === o ? 'font-semibold text-cobalt bg-blue-50' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          {labelFor ? labelFor(o) : o}
        </button>
      ))}
    </div>
  );
}

export interface ChipProps {
  children: React.ReactNode;
  /** Cobalt fill when selected; light grey otherwise. */
  selected?: boolean;
  onClick?: () => void;
}

/** A skill or category tag. Read-only unless given an `onClick`. */
export function Chip({ children, selected, onClick }: ChipProps) {
  const cls = `shrink-0 whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-medium ${
    selected ? 'bg-cobalt text-white' : 'bg-blue-50 text-cobalt'
  }`;
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} transition`}>{children}</button>
  ) : (
    <span className={cls}>{children}</span>
  );
}
