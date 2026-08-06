'use client';

import Avatar from '@/components/Avatar';
import EtfBadge from '@/components/EtfBadge';
import type { TalentItem } from '@/lib/api';

export interface CreatorCardProps {
  item: TalentItem;
  /** The viewing creator's own skill names — used to compute a real "N shared
   *  skills" chip. There is no creator↔creator match-percent anywhere in the
   *  backend, so we deliberately never show a fabricated match score here. */
  viewerSkills?: string[];
  /** Resolve the real public-portfolio username and navigate there. */
  onOpen: () => void;
}

const AVAILABILITY_LABEL: Record<string, string> = {
  available: 'Available now',
  busy: 'Limited availability',
  not_available: 'Not available',
};

/**
 * CreatorCard — browse-card for another creator (Discover → Creators).
 *
 * No component like this existed before this redesign; every page that
 * needed one hand-rolled its own markup. This is the one shared version.
 */
export default function CreatorCard({ item, viewerSkills, onOpen }: CreatorCardProps) {
  const sharedSkills = viewerSkills
    ? item.skills.filter(s => viewerSkills.some(v => v.toLowerCase() === s.toLowerCase()))
    : [];

  return (
    <button
      onClick={onOpen}
      className="w-full text-left bg-white border-0 rounded-[20px] p-4 shadow-[0_1px_2px_rgba(15,23,42,.05)] flex flex-col gap-2.5"
    >
      <div className="flex gap-3 w-full">
        {item.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.avatar} alt={item.name} className="w-[52px] h-[52px] rounded-2xl object-cover flex-shrink-0" />
        ) : (
          <Avatar name={item.name} size={52} />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[15.5px] font-bold text-gray-900 truncate">{item.name}</span>
            {item.is_online && <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" title="Online now" />}
          </div>
          {item.title && <div className="text-[12.5px] text-gray-400 font-semibold mb-1 truncate">{item.title}</div>}
          {typeof item.rating === 'number' && (
            <div className="flex items-center gap-1">
              <i className="fa-solid fa-star text-[11px] text-amber-500"></i>
              <span className="text-[12.5px] font-bold text-gray-900">{item.rating.toFixed(1)}</span>
              {typeof item.review_count === 'number' && (
                <span className="text-[12px] text-gray-300">({item.review_count})</span>
              )}
            </div>
          )}
        </div>
        {sharedSkills.length > 0 && (
          <div className="text-right flex-shrink-0">
            <div className="text-[12px] font-extrabold text-cobalt">{sharedSkills.length}</div>
            <div className="text-[10.5px] text-gray-300 font-semibold">shared</div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {item.etf_level && <EtfBadge userId={item.id} size="xs" iconOnly />}
        {item.availability_status && AVAILABILITY_LABEL[item.availability_status] && (
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
            {AVAILABILITY_LABEL[item.availability_status]}
          </span>
        )}
      </div>

      {item.skills.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {item.skills.slice(0, 3).map(skill => (
            <span key={skill} className="text-[11.5px] font-semibold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full">
              {skill}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
