'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { auth, profile as profileApi } from '@/lib/api';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard',    icon: 'fa-gauge-high' },
  { href: '/admin/users',     label: 'Users',        icon: 'fa-users' },
  { href: '/admin/projects',  label: 'Projects',     icon: 'fa-briefcase' },
  { href: '/admin/disputes',  label: 'Disputes',     icon: 'fa-scale-balanced' },
  { href: '/admin/transactions', label: 'Transactions', icon: 'fa-dollar-sign' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [adminName, setAdminName] = useState('Admin');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    profileApi.getMe().then(u => {
      const name = u.profile?.display_name ||
        [u.profile?.first_name, u.profile?.last_name].filter(Boolean).join(' ') ||
        u.username;
      setAdminName(name);
      // Redirect non-admins away
      if (!['admin', 'moderator'].includes(u.user_role || '')) {
        router.replace('/');
      }
    }).catch(() => router.replace('/login'));
  }, [router]);

  const signOut = () => { auth.logout(); window.location.href = '/login'; };

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 flex flex-col w-64 bg-gray-900 border-r border-gray-800
        transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/spectrum-logo.svg" alt="Spectrum" className="w-8 h-8 rounded-lg" />
          <div>
            <p className="text-sm font-bold text-white leading-none">Spectrum</p>
            <p className="text-xs text-indigo-400 font-semibold mt-0.5">Admin Panel</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ href, label, icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <i className={`fa-solid ${icon} w-4 text-center`} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
              {adminName[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{adminName}</p>
              <p className="text-xs text-indigo-400">Administrator</p>
            </div>
          </div>
          <Link href="/" className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition mb-1">
            <i className="fa-solid fa-arrow-left w-4 text-center" /> Back to Site
          </Link>
          <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition">
            <i className="fa-solid fa-right-from-bracket w-4 text-center" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-4 px-6 py-4 bg-gray-900 border-b border-gray-800 shrink-0">
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <i className="fa-solid fa-bars text-lg" />
          </button>
          <div className="flex-1">
            <h1 className="text-sm font-semibold text-white">
              {navItems.find(n => pathname.startsWith(n.href))?.label ?? 'Admin'}
            </h1>
          </div>
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-full font-medium">
            <i className="fa-solid fa-shield-halved text-xs" /> Admin Mode
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
