'use client';

export interface SegmentedTabOption<T extends string = string> {
  value: T;
  label: string;
  /** Optional count badge, e.g. number of items in that segment. */
  count?: number;
}

export interface SegmentedTabsProps<T extends string = string> {
  options: SegmentedTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * SegmentedTabs — generic pill-style segmented control.
 *
 * Replaces the hand-rolled version of this pattern that existed separately
 * in the "My Work" status filter and the workspace's tab bar — one
 * implementation, one visual language, reused everywhere a small set of
 * mutually-exclusive views needs switching (Discover's Projects/Creators/
 * Companies, Projects' Open/Active/Delivered/Completed, Workspace's
 * Overview/Deliverables/Payment).
 */
export default function SegmentedTabs<T extends string = string>({
  options,
  value,
  onChange,
  className = '',
}: SegmentedTabsProps<T>) {
  return (
    <div className={`flex bg-[#EDF1F8] rounded-2xl p-1 gap-1 ${className}`}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 flex items-center justify-center gap-1.5 text-center py-2.5 rounded-xl text-[13px] font-bold whitespace-nowrap transition ${
              active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {opt.label}
            {typeof opt.count === 'number' && opt.count > 0 && (
              <span className={`text-[10.5px] rounded-full px-1.5 min-w-[18px] ${active ? 'bg-cobalt/10 text-cobalt' : 'bg-gray-200 text-gray-500'}`}>
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
