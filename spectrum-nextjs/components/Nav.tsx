'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { profile as profileApi, auth, tokenStore, type MeResponse } from '@/lib/api';

const links = [
  { href: '/#features',    label: 'Features' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/pricing',      label: 'Pricing' },
  { href: '/community',    label: 'Community' },
  { href: '/blog',         label: 'Blog' },
];

// Backend account types map to the two dashboards: producer/both → client,
// crew → creator. Same rule the login redirect uses.
function areaFor(accountType?: string): 'client' | 'creator' {
  return accountType === 'producer' || accountType === 'both' ? 'client' : 'creator';
}

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // `hasToken` flips on mount so a signed-in visitor doesn't sit looking at a
  // "Log in" button while the profile request is still in flight; `me` fills in
  // once we know who they actually are.
  const [hasToken, setHasToken] = useState(false);
  const [me, setMe] = useState<MeResponse | null>(null);
  const active = (href: string) => pathname === href ? 'active' : '';

  // Resolve the session. This nav used to hard-code the logged-out CTA, so
  // coming back to a marketing page from a dashboard looked like being signed
  // out even though the token was still valid.
  useEffect(() => {
    if (!tokenStore.isLoggedIn()) return;
    setHasToken(true);
    let cancelled = false;
    profileApi.getMeQuiet().then(u => {
      if (cancelled) return;
      // getMeQuiet clears a stale token itself — fall back to the guest CTA.
      if (!u) setHasToken(false);
      setMe(u);
    });
    return () => { cancelled = true; };
  }, []);

  // Close on route change
  useEffect(() => { setOpen(false); setMenuOpen(false); }, [pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const area = areaFor(me?.account_type);
  const roleLabel = area === 'client' ? 'Client' : 'Creator';
  const dashHref = `/${area}/dashboard`;
  const displayName =
    me?.profile?.display_name ||
    [me?.profile?.first_name, me?.profile?.last_name].filter(Boolean).join(' ') ||
    me?.username ||
    '';
  const avatarUrl = me?.profile?.profile_picture || '';

  const signOut = () => { auth.logout(); window.location.href = '/'; };

  const avatarImg = (size: string) => avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatarUrl} alt={displayName} className={`${size} rounded-xl border-2 border-gray-200 group-hover:border-cobalt transition-colors object-cover`} />
  ) : (
    <div className={`${size} rounded-xl border-2 border-gray-200 group-hover:border-cobalt bg-blue-100 flex items-center justify-center text-cobalt font-bold text-base transition-colors`}>
      {displayName[0]?.toUpperCase() || 'U'}
    </div>
  );

  const menuItems = [
    { href: dashHref,             icon: 'fa-gauge-high', label: 'Dashboard' },
    { href: `/${area}/profile`,   icon: 'fa-user',       label: 'My Profile' },
    { href: `/${area}/messaging`, icon: 'fa-comment',    label: 'Messages' },
  ];

  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <Link href="/" className="nav-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/spectrum-logo.svg" alt="Spectrum" className="nb-logo" style={{width:36,height:36,borderRadius:8}} />
            <span className="nb-name">Spectrum Connect</span>
          </Link>

          {/* Desktop nav links */}
          <div className="nav-links">
            {links.map(({ href, label }) => (
              <Link key={href} href={href} className={active(href)}>{label}</Link>
            ))}
          </div>

          {/* Desktop CTA — swaps to the account menu once a session is found */}
          <div className="nav-cta">
            {!hasToken ? (
              <>
                <Link href="/login" className="login-link">Log in</Link>
                <Link href="/signup" className="btn btn-primary">Get Started</Link>
              </>
            ) : !me ? (
              // Token present, profile still loading. Placeholder reserves the
              // same space so the nav doesn't shift when it resolves.
              <div className="w-11 h-11 rounded-xl bg-gray-200 animate-pulse" aria-hidden />
            ) : (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  className="flex items-center focus:outline-none group"
                  aria-label="Account menu"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  {avatarImg('w-11 h-11')}
                </button>

                {menuOpen && (
                  <div role="menu" className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-2xl shadow-xl py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                      <p className="text-xs text-gray-500">{roleLabel}</p>
                    </div>
                    {menuItems.map(({ href, icon, label }) => (
                      <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                        className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                        <i className={`fa-solid ${icon} w-5 text-gray-400 mr-2.5`} />{label}
                      </Link>
                    ))}
                    <div className="border-t border-gray-100 my-1" />
                    <button onClick={signOut}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition">
                      <i className="fa-solid fa-right-from-bracket w-5 mr-2.5" />Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="nav-hamburger"
            onClick={() => setOpen(o => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            <span className={`nav-ham-bar ${open ? 'open' : ''}`} />
            <span className={`nav-ham-bar ${open ? 'open' : ''}`} />
            <span className={`nav-ham-bar ${open ? 'open' : ''}`} />
          </button>
        </div>
      </nav>

      {/* Click-away catcher for the account dropdown */}
      {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />}

      {/* Mobile drawer */}
      {open && (
        <div className="nav-mobile-overlay" onClick={() => setOpen(false)}>
          <div className="nav-mobile-drawer" onClick={e => e.stopPropagation()}>
            <div className="nav-mobile-header">
              <Link href="/" className="nav-brand" onClick={() => setOpen(false)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/spectrum-logo.svg" alt="Spectrum" style={{width:32,height:32,borderRadius:8}} />
                <span className="nb-name">Spectrum Connect</span>
              </Link>
              <button className="nav-mobile-close" onClick={() => setOpen(false)} aria-label="Close">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M6 6l12 12M6 18L18 6"/>
                </svg>
              </button>
            </div>

            {/* Signed-in identity row — doubles as a shortcut to the dashboard */}
            {me && (
              <Link href={dashHref} onClick={() => setOpen(false)}
                className="group flex items-center gap-3 px-5 py-4 border-b border-gray-100 no-underline">
                {avatarImg('w-11 h-11')}
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-gray-900 truncate">{displayName}</span>
                  <span className="block text-xs text-gray-500">{roleLabel}</span>
                </span>
              </Link>
            )}

            <nav className="nav-mobile-links">
              {links.map(({ href, label }) => (
                <Link key={href} href={href} className={`nav-mobile-link ${active(href)}`} onClick={() => setOpen(false)}>
                  {label}
                </Link>
              ))}
            </nav>

            <div className="nav-mobile-cta">
              {!hasToken ? (
                <>
                  <Link href="/login" className="nav-mobile-login" onClick={() => setOpen(false)}>Log in</Link>
                  <Link href="/signup" className="btn btn-primary" style={{textAlign:'center'}} onClick={() => setOpen(false)}>Get Started Free</Link>
                </>
              ) : me ? (
                <>
                  {menuItems.map(({ href, icon, label }) => (
                    <Link key={href} href={href} onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-1 py-3 text-sm font-medium text-gray-700 no-underline">
                      <i className={`fa-solid ${icon} w-5 text-center text-gray-400`} />{label}
                    </Link>
                  ))}
                  <button onClick={signOut}
                    className="flex items-center gap-3 w-full px-1 py-3 text-sm font-medium text-red-600 bg-transparent border-0 cursor-pointer">
                    <i className="fa-solid fa-right-from-bracket w-5 text-center" />Sign Out
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
