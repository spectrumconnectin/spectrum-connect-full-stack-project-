'use client';

import { useRouter } from 'next/navigation';
import BottomSheet from '@/components/BottomSheet';
import { auth } from '@/lib/api';

export interface CreatorSettingsSheetProps {
  open: boolean;
  onClose: () => void;
}

// Real navigation launcher — every row goes to a destination or action that
// already exists. No settings forms are re-implemented here; this sheet only
// routes to the real pages/toggles that already handle them.
const ROWS: { label: string; href: string }[] = [
  { label: 'Account & Security',        href: '/creator/profile#settings' },
  { label: 'Notification Preferences',  href: '/creator/profile#notifications' },
  { label: 'Disputes',                  href: '/creator/disputes' },
  { label: 'Switch to Client',          href: '/client/dashboard' },
];

export default function CreatorSettingsSheet({ open, onClose }: CreatorSettingsSheetProps) {
  const router = useRouter();

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  const signOut = () => {
    onClose();
    auth.logout();
    window.location.href = '/login';
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Settings">
      <div className="flex flex-col">
        {ROWS.map(row => (
          <button key={row.href} onClick={() => go(row.href)}
            className="flex items-center w-full box-border py-3.5 border-b border-gray-100 last:border-b-0 bg-transparent border-x-0 border-t-0">
            <span className="flex-1 text-left text-[14.5px] font-semibold text-gray-900">{row.label}</span>
            <i className="fa-solid fa-chevron-right text-[11px] text-gray-300"></i>
          </button>
        ))}
        <button onClick={signOut}
          className="text-left py-3.5 text-[14.5px] font-bold text-red-500 bg-transparent border-0">
          Log Out
        </button>
      </div>
    </BottomSheet>
  );
}
