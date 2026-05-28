'use client';

import { usePathname } from 'next/navigation';

/**
 * Wraps page content and re-mounts on every route change via `key`,
 * which triggers the CSS enter animation in globals.css (.page-enter).
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
