'use client';

import BottomSheet from '@/components/BottomSheet';

export interface DiscoverFiltersSheetProps {
  open: boolean;
  onClose: () => void;
  segment: 'projects' | 'creators';

  // Projects segment — wraps the real filters find-projects already had.
  department: string;
  onDepartmentChange: (v: string) => void;
  departments: string[];
  budget: string;
  onBudgetChange: (v: string) => void;
  budgets: string[];
  sort: string;
  onSortChange: (v: string) => void;
  sorts: string[];

  // Creators segment — wraps talent.search()'s real skill/location params.
  skill: string;
  onSkillChange: (v: string) => void;
  location: string;
  onLocationChange: (v: string) => void;
}

function FilterRow({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="flex items-center justify-between py-3.5 border-b border-gray-100 last:border-b-0 cursor-pointer">
      <span className="text-[14.5px] font-semibold text-gray-900">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="text-[13px] text-gray-500 font-semibold bg-transparent border-0 outline-none text-right pr-1">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function FreeTextRow({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="flex items-center justify-between py-3.5 border-b border-gray-100 last:border-b-0">
      <span className="text-[14.5px] font-semibold text-gray-900">{label}</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="text-[13px] text-gray-700 font-medium bg-transparent border-0 outline-none text-right w-32 placeholder:text-gray-300" />
    </label>
  );
}

/**
 * DiscoverFiltersSheet — real filter controls for Discover, wrapped in the
 * shared BottomSheet. Every field maps to a real query param already
 * supported by jobs.search()/talent.search(); nothing here is decorative.
 */
export default function DiscoverFiltersSheet(props: DiscoverFiltersSheetProps) {
  const { open, onClose, segment } = props;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Filters"
      footer={
        <button onClick={onClose}
          className="block w-full text-center bg-cobalt text-white text-[14.5px] font-bold py-[15px] rounded-2xl">
          Apply Filters
        </button>
      }
    >
      <div className="flex flex-col">
        {segment === 'projects' ? (
          <>
            <FilterRow label="Department" value={props.department} onChange={props.onDepartmentChange} options={props.departments} />
            <FilterRow label="Budget" value={props.budget} onChange={props.onBudgetChange} options={props.budgets} />
            <FilterRow label="Sort by" value={props.sort} onChange={props.onSortChange} options={props.sorts} />
          </>
        ) : (
          <>
            <FreeTextRow label="Skill" value={props.skill} onChange={props.onSkillChange} placeholder="Any" />
            <FreeTextRow label="Location" value={props.location} onChange={props.onLocationChange} placeholder="Any" />
          </>
        )}
      </div>
    </BottomSheet>
  );
}
