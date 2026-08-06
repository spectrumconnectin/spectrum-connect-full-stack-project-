'use client';

import { useEffect, useState } from 'react';
import BottomSheet from '@/components/BottomSheet';
import EtfBadge from '@/components/EtfBadge';
import { profile as profileApi, etfPoints, type EtfLevelInfo } from '@/lib/api';

export interface MatchReasoningTarget {
  title: string;
  match_percent: number;
  /** The project's/match's required skills — intersected against the viewer's
   *  own profile skills to build the one real reasoning row that's actually
   *  computable. There is no backend endpoint that returns a reasoning
   *  breakdown, so every row here is derived from fields that genuinely exist. */
  skills: string[];
}

export interface MatchReasoningSheetProps {
  target: MatchReasoningTarget | null;
  onClose: () => void;
}

const AVAILABILITY_LABEL: Record<string, string> = {
  available: "You're marked Available",
  busy: "You're marked as Limited availability",
  not_available: "You're marked Not available",
};

/**
 * MatchReasoningSheet — "Why this matched you."
 *
 * Every row is computed from real data: the overlap between the match's
 * required skills and the viewer's own profile skills, the viewer's real
 * ETF tier, and the viewer's real availability setting. No fabricated
 * sub-score breakdown of the match_percent itself.
 */
export default function MatchReasoningSheet({ target, onClose }: MatchReasoningSheetProps) {
  const [viewerSkills, setViewerSkills] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string | null>(null);
  const [etfLevel, setEtfLevel] = useState<EtfLevelInfo | null>(null);

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    profileApi.getMe().then(me => {
      if (cancelled) return;
      setViewerSkills((me.profile?.skills || []).map(s => s.name));
      setAvailability(me.settings?.availability_status ?? null);
    }).catch(() => {});
    etfPoints.me().then(bal => { if (!cancelled) setEtfLevel(bal.level); }).catch(() => {});
    return () => { cancelled = true; };
  }, [target]);

  if (!target) return null;

  const shared = target.skills.filter(s => viewerSkills.some(v => v.toLowerCase() === s.toLowerCase()));

  return (
    <BottomSheet open={!!target} onClose={onClose} title="Why this matched">
      <div className="flex items-center gap-3.5 bg-[#F1ECFE] rounded-2xl p-4 mb-4">
        <div className="text-2xl font-extrabold text-purple-600">{target.match_percent}%</div>
        <div className="text-[13px] text-purple-900 font-medium leading-snug">
          Why <b>{target.title}</b> matched you
        </div>
      </div>

      <div className="flex flex-col gap-3.5">
        <div>
          <div className="text-[13px] font-bold text-gray-900 mb-1.5">Skills overlap</div>
          {shared.length > 0 ? (
            <div className="flex gap-1.5 flex-wrap">
              {shared.map(s => (
                <span key={s} className="text-[11.5px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">{s}</span>
              ))}
            </div>
          ) : (
            <p className="text-[12.5px] text-gray-400">No direct skill overlap found in your profile.</p>
          )}
        </div>

        <div className="flex gap-2.5 items-start pt-3 border-t border-gray-100">
          <i className="fa-solid fa-medal text-amber-500 text-sm mt-0.5"></i>
          <div>
            <div className="text-[12.5px] font-bold text-gray-900 mb-0.5">ETF relevance</div>
            <div className="text-[12.5px] text-gray-500 leading-snug">
              {etfLevel ? <>Your <EtfBadge level={etfLevel} size="xs" /> tier — trusted for consistent delivery.</> : 'Loading your trust tier…'}
            </div>
          </div>
        </div>

        <div className="flex gap-2.5 items-start pt-3 border-t border-gray-100">
          <i className="fa-solid fa-clock text-emerald-500 text-sm mt-0.5"></i>
          <div>
            <div className="text-[12.5px] font-bold text-gray-900 mb-0.5">Availability</div>
            <div className="text-[12.5px] text-gray-500 leading-snug">
              {availability && AVAILABILITY_LABEL[availability] ? AVAILABILITY_LABEL[availability] : 'Availability not set on your profile.'}
            </div>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
