'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
export default function Nav() {
  const pathname = usePathname();
  const active = (href: string) => pathname === href ? 'active' : '';

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="nav-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/spectrum-logo.svg" alt="Spectrum" className="nb-logo" style={{width:36,height:36,borderRadius:8}} />
          <span className="nb-name">Spectrum Connect</span>
        </Link>
        <div className="nav-links">
          <Link href="/#features">Features</Link>
          <Link href="/how-it-works" className={active('/how-it-works')}>How It Works</Link>
          <Link href="/pricing" className={active('/pricing')}>Pricing</Link>
          <Link href="/community" className={active('/community')}>Community</Link>
          <Link href="/blog" className={active('/blog')}>Blog</Link>
        </div>
        <div className="nav-cta">
          <Link href="/login" className="login-link">Log in</Link>
          <Link href="/signup" className="btn btn-primary">Get Started</Link>
        </div>
      </div>
    </nav>
  );
}
