'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import PageTransition from '@/components/PageTransition';
import NotificationBell from '@/components/NotificationBell';
import { profile as profileApi, auth, tokenStore } from '@/lib/api';

const navLinks = [
  { href: '/creator/dashboard',    label: 'Dashboard',     icon: 'fa-gauge-high' },
  { href: '/creator/find-projects',label: 'Find Projects', icon: 'fa-search' },
  { href: '/creator/smart-connect',label: 'Smart Connect', icon: 'fa-bolt' },
  { href: '/creator/projects',     label: 'My Work',       icon: 'fa-briefcase' },
  { href: '/creator/services',     label: 'Services',      icon: 'fa-store' },
  { href: '/creator/disputes',     label: 'Disputes',      icon: 'fa-scale-balanced' },
  { href: '/creator/ai-assistant', label: 'Miya',          icon: 'fa-sparkles', isMiya: true },
];

const bottomNav = [
  { href: '/creator/dashboard',    label: 'Home',    icon: 'fa-house' },
  { href: '/creator/find-projects',label: 'Discover',icon: 'fa-search' },
  { href: '/creator/smart-connect',label: 'Match',   icon: 'fa-bolt', primary: true },
  { href: '/creator/projects',     label: 'My Work', icon: 'fa-briefcase' },
  { href: '/creator/messaging',    label: 'Messages',icon: 'fa-comment' },
];

function CreatorHeader() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [displayName, setDisplayName] = useState('Creator');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    profileApi.getMe().then(u => {
      const name = u.profile?.display_name ||
        [u.profile?.first_name, u.profile?.last_name].filter(Boolean).join(' ') ||
        u.username;
      setDisplayName(name);
      if (u.profile?.profile_picture) setAvatarUrl(u.profile.profile_picture);
    }).catch(() => {});
  }, []);

  useEffect(() => { setDrawerOpen(false); setMenuOpen(false); }, [pathname]);

  const isActive = (href: string) =>
    pathname === href || (href !== '/creator/dashboard' && pathname.startsWith(href + '/'));

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">

            {/* Hamburger (mobile only) */}
            <button
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl text-gray-600 hover:bg-gray-100 transition"
              onClick={() => setDrawerOpen(o => !o)}
              aria-label="Open menu"
            >
              <i className={`fa-solid ${drawerOpen ? 'fa-xmark' : 'fa-bars'} text-lg`} />
            </button>

            {/* Brand */}
            <div className="flex items-center gap-4 xl:gap-8 min-w-0 flex-1 md:flex-none">
              <Link href="/" className="flex items-center gap-2.5 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/spectrum-logo.svg" alt="Spectrum" className="w-9 h-9 md:w-10 md:h-10 rounded-xl" />
                <span className="text-lg font-bold text-gray-900 hidden sm:block">Spectrum Connect</span>
              </Link>

              {/* Desktop nav */}
              <nav className="no-scrollbar hidden md:flex items-center gap-0.5 lg:gap-1 min-w-0 overflow-x-auto py-2">
                {navLinks.map(({ href, label, isMiya }) => {
                  const active = isActive(href);
                  return (
                    <Link key={href} href={href}
                      className={`relative shrink-0 whitespace-nowrap px-2.5 lg:px-3.5 py-2.5 text-sm font-medium rounded-xl transition-all ${
                        isMiya
                          ? active
                            ? 'bg-gradient-to-r from-violet-600 to-blue-500 text-white shadow-md shadow-blue-200'
                            : 'bg-gradient-to-r from-violet-50 to-blue-50 text-violet-700 border border-violet-200 hover:shadow-sm'
                          : active
                          ? 'font-semibold text-cobalt bg-blue-50'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      {isMiya && <span className="mr-1.5">✦</span>}
                      {label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              <div className="relative">
                <Link href="/creator/messaging"
                  className={`flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-xl transition-all ${
                    pathname === '/creator/messaging' ? 'text-cobalt bg-blue-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`} title="Messages">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </Link>
                <span className="absolute top-1 right-1 w-2 h-2 bg-cobalt rounded-full border-2 border-white pointer-events-none" />
              </div>

              <NotificationBell />

              <div className="relative">
                <button onClick={() => setMenuOpen(o => !o)} className="flex items-center focus:outline-none group">
                  {avatarUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={avatarUrl} alt={displayName} className="w-9 h-9 md:w-10 md:h-10 rounded-xl border-2 border-gray-200 group-hover:border-cobalt transition-colors object-cover" />
                    : <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl border-2 border-gray-200 group-hover:border-cobalt bg-blue-100 flex items-center justify-center text-cobalt font-bold text-sm transition-colors">
                        {displayName[0]?.toUpperCase()}
                      </div>
                  }
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-2xl shadow-xl py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                      <p className="text-xs text-gray-500">Creator</p>
                    </div>
                    {[
                      { href: '/creator/profile',  icon: 'fa-user', label: 'My Profile' },
                      { href: '/creator/earnings', icon: 'fa-wallet', label: 'Earnings' },
                      { href: '/creator/etf',      icon: 'fa-medal', label: 'ETF — Earn Trust' },
                      { href: '/client/dashboard', icon: 'fa-arrow-right-arrow-left', label: 'Switch to Client' },
                    ].map(({ href, icon, label }) => (
                      <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                        className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                        <i className={`fa-solid ${icon} w-5 text-gray-400 mr-2.5`} />{label}
                      </Link>
                    ))}
                    <button onClick={() => { setMenuOpen(false); window.location.href = '/creator/profile#settings'; }}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                      <i className="fa-solid fa-gear w-5 text-gray-400 mr-2.5" />Settings
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                    <button onClick={() => { auth.logout(); window.location.href = '/login'; }}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition">
                      <i className="fa-solid fa-right-from-bracket w-5 mr-2.5" />Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col shadow-2xl">
            <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/spectrum-logo.svg" alt="" className="w-9 h-9 rounded-xl" />
              <div>
                <p className="font-bold text-gray-900 text-sm">{displayName}</p>
                <p className="text-xs text-gray-500">Creator</p>
              </div>
            </div>
            <nav className="flex-1 overflow-y-auto py-3 px-3">
              {navLinks.map(({ href, label, icon, isMiya }) => {
                const active = isActive(href);
                return (
                  <Link key={href} href={href} onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium mb-1 transition-all ${
                      isMiya
                        ? active ? 'bg-gradient-to-r from-violet-600 to-blue-500 text-white' : 'text-violet-700 bg-violet-50'
                        : active ? 'bg-blue-50 text-cobalt font-semibold' : 'text-gray-700 hover:bg-gray-50'
                    }`}>
                    <i className={`fa-solid ${icon} w-5 text-center ${active ? '' : 'text-gray-400'}`} />
                    {isMiya && <span className="mr-0.5">✦</span>}
                    {label}
                  </Link>
                );
              })}
            </nav>
            <div className="px-3 py-4 border-t border-gray-100 space-y-1">
              <Link href="/creator/earnings" onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-700 hover:bg-gray-50">
                <i className="fa-solid fa-wallet w-5 text-center text-gray-400" />Earnings
              </Link>
              <Link href="/creator/etf" onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-700 hover:bg-gray-50">
                <i className="fa-solid fa-medal w-5 text-center text-gray-400" />ETF — Earn Trust
              </Link>
              <button onClick={() => { auth.logout(); window.location.href = '/login'; }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm text-red-600 hover:bg-red-50">
                <i className="fa-solid fa-right-from-bracket w-5 text-center" />Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />}
    </>
  );
}

function CreatorBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex items-center">
      {bottomNav.map(({ href, label, icon, primary }) => {
        const active = pathname === href || (href !== '/creator/dashboard' && pathname.startsWith(href + '/'));
        return (
          <Link key={href} href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-all ${
              primary ? 'relative' : active ? 'text-cobalt' : 'text-gray-400'
            }`}>
            {primary
              ? <div className="w-12 h-12 bg-cobalt rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 -mt-5">
                  <i className="fa-solid fa-bolt text-white text-lg" />
                </div>
              : <i className={`fa-solid ${icon} text-lg`} />
            }
            {!primary && <span className={`text-[10px] font-medium ${active ? 'text-cobalt' : 'text-gray-400'}`}>{label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function CreatorFooter() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-12 mb-16 md:mb-0">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-8 mb-8">
          <div className="col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/spectrum-logo.svg" alt="Spectrum" className="w-8 h-8 rounded-lg" />
              <span className="text-lg font-bold text-gray-900">Spectrum Connect</span>
            </Link>
            <p className="text-sm text-gray-600 leading-relaxed">A creative marketplace built on trust — verified creators, fair payments, and AI-powered matching.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Workspace</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/creator/dashboard" className="hover:text-cobalt transition">Dashboard</Link></li>
              <li><Link href="/creator/find-projects" className="hover:text-cobalt transition">Find Projects</Link></li>
              <li><Link href="/creator/projects" className="hover:text-cobalt transition">My Work</Link></li>
              <li><Link href="/creator/services" className="hover:text-cobalt transition">Services</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Company</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/about" className="hover:text-cobalt transition">About</Link></li>
              <li><Link href="/pricing" className="hover:text-cobalt transition">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Account</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/client/dashboard" className="hover:text-cobalt transition">Switch to Client</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-100 pt-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">© 2026 Spectrum Connect. All rights reserved.</p>
          <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap justify-center">
            <Link href="/terms" className="hover:text-cobalt">Terms</Link>
            <Link href="/privacy" className="hover:text-cobalt">Privacy</Link>
            <Link href="/refunds" className="hover:text-cobalt">Refunds</Link>
            <Link href="/legal" className="hover:text-cobalt">All Legal</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-off-white min-h-screen" style={{ fontFamily: "'Inter',sans-serif" }}>
      <CreatorHeader />
      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        <PageTransition>{children}</PageTransition>
      </main>
      <CreatorFooter />
      <CreatorBottomNav />
    </div>
  );
}
