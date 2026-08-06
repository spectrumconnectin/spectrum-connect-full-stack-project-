'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import EtfWidget from '@/components/EtfWidget';
import CreatorSettingsSheet from '@/components/CreatorSettingsSheet';
import { profile as profileApi, type MeResponse } from '@/lib/api';

// Mockup's "Profile" tab is a stats card + nav-row hub. `/creator/profile`
// (the real edit form) already has its own deep links (header dropdown,
// #portfolio, #settings) that must keep working — so this hub lives at a new
// route rather than replacing it.
const ROWS: { label: string; icon: string; kind: 'link'; href: string }[] = [
  { label: 'My Projects',   icon: 'fa-briefcase', kind: 'link', href: '/creator/projects' },
  { label: 'Edit Profile',  icon: 'fa-user-pen',   kind: 'link', href: '/creator/profile' },
  { label: 'Portfolio',     icon: 'fa-images',     kind: 'link', href: '/creator/profile#portfolio' },
  { label: 'ETF Dashboard', icon: 'fa-medal',      kind: 'link', href: '/creator/etf' },
  { label: 'Analytics',     icon: 'fa-chart-line', kind: 'link', href: '/creator/analytics' },
];

export default function CreatorAccountPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    profileApi.getMe()
      .then(u => { if (!cancelled) setMe(u); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const displayName = me?.profile?.display_name ||
    [me?.profile?.first_name, me?.profile?.last_name].filter(Boolean).join(' ') ||
    me?.username || 'Creator';
  const roleLine = [me?.profile?.headline, me?.profile?.location?.city].filter(Boolean).join(' · ');
  const avatarUrl = me?.profile?.profile_picture;

  return (
    <>
      <section className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Profile</h1>
      </section>

      {/* Stats card */}
      <div className="bg-white rounded-[20px] p-5 shadow-[0_1px_2px_rgba(15,23,42,.05)] mb-4 flex flex-col items-center text-center">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={displayName} className="w-[72px] h-[72px] rounded-3xl object-cover mb-3" />
        ) : (
          <div className="w-[72px] h-[72px] rounded-3xl bg-gradient-to-br from-blue-400 to-cobalt flex items-center justify-center text-white font-bold text-2xl mb-3">
            {displayName[0]?.toUpperCase() || 'U'}
          </div>
        )}
        <div className="text-lg font-extrabold text-gray-900">{loading ? '—' : displayName}</div>
        {roleLine && <div className="text-[13px] text-gray-400 font-semibold mt-0.5">{roleLine}</div>}

        <div className="grid grid-cols-3 w-full border-t border-gray-100 pt-3.5 mt-4">
          <div>
            <div className="text-base font-extrabold text-gray-900">{me?.stats?.projects_completed ?? '—'}</div>
            <div className="text-[10.5px] text-gray-400 font-semibold">Projects</div>
          </div>
          <div>
            <div className="text-base font-extrabold text-gray-900">
              {me?.profile?.rating ? me.profile.rating.toFixed(1) : '—'}
            </div>
            <div className="text-[10.5px] text-gray-400 font-semibold">Rating</div>
          </div>
          <div>
            <div className="text-base font-extrabold text-gray-900">{me?.stats?.active_projects ?? '—'}</div>
            <div className="text-[10.5px] text-gray-400 font-semibold">Active</div>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <EtfWidget href="/creator/etf" />
      </div>

      {/* Nav rows */}
      <div className="bg-white rounded-[20px] overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,.05)] mb-4">
        {/* Reviews — reuses the real public portfolio page's own review data,
            rather than building a second reviews list with no real source. */}
        {me?.username && (
          <Link href={`/portfolio/${me.username}`}
            className="flex items-center w-full box-border px-4 py-[15px] border-b border-gray-100">
            <i className={`fa-solid fa-star w-5 text-gray-400 mr-3`}></i>
            <span className="flex-1 text-left text-[15px] font-semibold text-gray-900">Reviews</span>
            <i className="fa-solid fa-chevron-right text-[11px] text-gray-300"></i>
          </Link>
        )}
        {ROWS.map((row, i) => (
          <Link key={row.href} href={row.href}
            className={`flex items-center w-full box-border px-4 py-[15px] ${i < ROWS.length - 1 ? 'border-b border-gray-100' : ''}`}>
            <i className={`fa-solid ${row.icon} w-5 text-gray-400 mr-3`}></i>
            <span className="flex-1 text-left text-[15px] font-semibold text-gray-900">{row.label}</span>
            <i className="fa-solid fa-chevron-right text-[11px] text-gray-300"></i>
          </Link>
        ))}
        <button onClick={() => setSettingsOpen(true)}
          className="flex items-center w-full box-border px-4 py-[15px] bg-transparent border-0">
          <i className="fa-solid fa-gear w-5 text-gray-400 mr-3"></i>
          <span className="flex-1 text-left text-[15px] font-semibold text-gray-900">Settings</span>
          <i className="fa-solid fa-chevron-right text-[11px] text-gray-300"></i>
        </button>
      </div>

      <CreatorSettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
