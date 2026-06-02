'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/#features',    label: 'Features' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/pricing',      label: 'Pricing' },
  { href: '/community',    label: 'Community' },
  { href: '/blog',         label: 'Blog' },
];

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => pathname === href ? 'active' : '';

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

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

          {/* Desktop CTA */}
          <div className="nav-cta">
            <Link href="/login" className="login-link">Log in</Link>
            <Link href="/signup" className="btn btn-primary">Get Started</Link>
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

            <nav className="nav-mobile-links">
              {links.map(({ href, label }) => (
                <Link key={href} href={href} className={`nav-mobile-link ${active(href)}`} onClick={() => setOpen(false)}>
                  {label}
                </Link>
              ))}
            </nav>

            <div className="nav-mobile-cta">
              <Link href="/login" className="nav-mobile-login" onClick={() => setOpen(false)}>Log in</Link>
              <Link href="/signup" className="btn btn-primary" style={{textAlign:'center'}} onClick={() => setOpen(false)}>Get Started Free</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
