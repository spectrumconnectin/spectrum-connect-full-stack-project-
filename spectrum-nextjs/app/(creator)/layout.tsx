'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import PageTransition from '@/components/PageTransition';
import { profile as profileApi, auth, tokenStore } from '@/lib/api';

const navLinks = [
  { href: '/creator/dashboard', label: 'Dashboard' },
  { href: '/creator/find-projects', label: 'Find Projects' },
  { href: '/creator/applications', label: 'Applications' },
  { href: '/creator/projects', label: 'Projects' },
  { href: '/creator/services', label: 'Services' },
  { href: '/creator/disputes', label: 'Disputes' },
  {
    href: '/creator/ai-assistant',
    label: 'Miya',
    isMiya: true,
  },
];

function CreatorHeader() {
  const pathname = usePathname();
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

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand */}
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/spectrum-logo.svg" alt="Spectrum" className="w-10 h-10 rounded-xl" />
              <span className="text-xl font-bold text-gray-900 hidden lg:block">Spectrum Connect</span>
            </Link>

            {/* Nav links */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(({ href, label, isMiya: isAi }) => {
                const active = pathname === href || (href !== '/creator/dashboard' && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`relative px-4 py-2.5 text-sm font-medium rounded-xl transition-all ${
                      isAi
                        ? active
                          ? 'bg-gradient-to-r from-violet-600 to-blue-500 text-white shadow-md shadow-blue-200'
                          : 'bg-gradient-to-r from-violet-50 to-blue-50 text-violet-700 border border-violet-200 hover:shadow-sm hover:shadow-blue-100'
                        : active
                        ? 'font-semibold text-cobalt bg-blue-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {isAi && (
                      <span className="mr-1.5">✦</span>
                    )}
                    {label}
                    {isAi && !active && (
                      <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold bg-violet-500 text-white px-1.5 py-0.5 rounded-full leading-none">AI</span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Messages icon */}
            <div className="relative">
              <Link
                href="/creator/messaging"
                className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
                  pathname === '/creator/messaging'
                    ? 'text-cobalt bg-blue-50'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title="Messages"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </Link>
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-cobalt rounded-full border-2 border-white pointer-events-none"></span>
            </div>

            {/* Notifications */}
            <button className="relative p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all">
              <i className="fa-solid fa-bell text-[18px]"></i>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            {/* Profile */}
            <div className="relative ml-1">
              <button onClick={() => setMenuOpen(o => !o)} className="flex items-center gap-2 focus:outline-none group">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={displayName}
                    className="w-10 h-10 rounded-xl border-2 border-gray-200 group-hover:border-cobalt transition-colors object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-xl border-2 border-gray-200 group-hover:border-cobalt bg-blue-100 flex items-center justify-center text-cobalt font-bold text-sm transition-colors">
                    {displayName[0]?.toUpperCase()}
                  </div>
                )}
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-2xl shadow-xl py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                    <p className="text-xs text-gray-500">Creator</p>
                  </div>
                  <Link href="/creator/profile" onClick={() => setMenuOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                    <i className="fa-solid fa-user w-5 text-gray-400 mr-2.5"></i>My Profile
                  </Link>
                  <Link href="/creator/earnings" onClick={() => setMenuOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                    <i className="fa-solid fa-wallet w-5 text-gray-400 mr-2.5"></i>Earnings
                  </Link>
                  <button onClick={() => { setMenuOpen(false); window.location.href = '/creator/profile#settings'; }}
                    className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                    <i className="fa-solid fa-gear w-5 text-gray-400 mr-2.5"></i>Settings
                  </button>
                  <Link href="/client/dashboard" onClick={() => setMenuOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                    <i className="fa-solid fa-arrow-right-arrow-left w-5 text-gray-400 mr-2.5"></i>Switch to Client
                  </Link>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button onClick={() => { auth.logout(); window.location.href = '/login'; }}
                    className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition">
                    <i className="fa-solid fa-right-from-bracket w-5 mr-2.5"></i>Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function CreatorFooter() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-5 gap-8 mb-8">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/spectrum-logo.svg" alt="Spectrum" className="w-9 h-9 rounded-lg" />
              <span className="text-xl font-bold text-gray-900">Spectrum Connect</span>
            </Link>
            <p className="text-sm text-gray-600 max-w-sm leading-relaxed">A creative marketplace built on trust — verified creators, fair payments, and AI-powered matching.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">Workspace</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/creator/dashboard" className="hover:text-cobalt transition">Dashboard</Link></li>
              <li><Link href="/creator/projects" className="hover:text-cobalt transition">Projects</Link></li>
              <li><Link href="/creator/services" className="hover:text-cobalt transition">Services</Link></li>
              <li><Link href="/creator/messaging" className="hover:text-cobalt transition">Messages</Link></li>
              <li><Link href="/creator/disputes" className="hover:text-cobalt transition">Disputes</Link></li>
              <li><Link href="/creator/skill-challenges" className="hover:text-cobalt transition">Challenges</Link></li>
              <li><Link href="/creator/ai-assistant" className="hover:text-cobalt transition">Miya AI</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">Company</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/about" className="hover:text-cobalt transition">About</Link></li>
              <li><Link href="/community" className="hover:text-cobalt transition">Community</Link></li>
              <li><Link href="/pricing" className="hover:text-cobalt transition">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">Account</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/client/dashboard" className="hover:text-cobalt transition">Switch to Client</Link></li>
              <li><Link href="/login" className="hover:text-cobalt transition">Sign Out</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-100 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">© 2026 Spectrum Connect. All rights reserved.</p>
          <div className="flex items-center gap-4 text-gray-400">
            <a href="#" aria-label="Twitter" className="hover:text-cobalt transition"><i className="fa-brands fa-twitter"></i></a>
            <a href="#" aria-label="LinkedIn" className="hover:text-cobalt transition"><i className="fa-brands fa-linkedin"></i></a>
            <a href="#" aria-label="Instagram" className="hover:text-cobalt transition"><i className="fa-brands fa-instagram"></i></a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-off-white min-h-screen" style={{fontFamily:"'Inter',sans-serif"}}>
      <CreatorHeader />
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <PageTransition>{children}</PageTransition>
      </main>
      <CreatorFooter />
    </div>
  );
}
