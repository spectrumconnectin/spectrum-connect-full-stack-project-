import * as React from 'react';

/* ────────────────────────────────────────────────────────────────────────────
   The app's structure: the shell every signed-in screen sits inside, and the
   page-level pieces that go in it. Ported from spectrum-nextjs's (client) and
   (creator) layouts, so a screen designed here has the same skeleton as one
   built in the product.
   ──────────────────────────────────────────────────────────────────────────── */

export interface NavItem {
  label: string;
  /** Font Awesome class, e.g. `fa-solid fa-house`. */
  icon: string;
  active?: boolean;
}

export interface AppHeaderProps {
  /** Shown beside the logo on desktop. Hidden on mobile, where the tab bar leads. */
  links?: string[];
  /** Name for the avatar. */
  user?: string;
  /** Red dot on the bell. */
  hasNotifications?: boolean;
  /** Blue dot on the messages icon. */
  hasMessages?: boolean;
}

/**
 * The sticky top bar. White, hairline bottom border, contents capped at the
 * same `max-w-7xl` as the page body so header and content share a left edge.
 */
export function AppHeader({ links = [], user = 'Epun Manula', hasNotifications, hasMessages }: AppHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8 min-w-0">
            <span className="flex items-center gap-2 flex-shrink-0">
              <span className="w-8 h-8 rounded-lg bg-cobalt grid place-items-center text-white text-sm font-bold">S</span>
              <span className="font-bold text-gray-900 hidden sm:inline">Spectrum Connect</span>
            </span>
            <nav className="hidden md:flex items-center gap-6">
              {links.map((l) => (
                <span key={l} className="text-sm font-medium text-gray-600 hover:text-cobalt cursor-pointer">{l}</span>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button aria-label="Messages" className="relative w-9 h-9 sc-fixed-size sc-tap-target grid place-items-center text-gray-500 hover:text-cobalt">
              <i className="fa-regular fa-comment text-lg" aria-hidden />
              {hasMessages && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cobalt" />}
            </button>
            <button aria-label="Notifications" className="relative w-9 h-9 sc-fixed-size sc-tap-target grid place-items-center text-gray-500 hover:text-cobalt">
              <i className="fa-regular fa-bell text-lg" aria-hidden />
              {hasNotifications && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />}
            </button>
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-cobalt to-blue-400 grid place-items-center text-white text-xs font-semibold">
              {user.split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

export interface BottomNavProps {
  items: NavItem[];
}

/**
 * The five-tab mobile bar. Hidden from `md:` up, where the header nav takes
 * over. Translucent and blurred rather than opaque, and `safe-bottom` keeps it
 * clear of the home indicator.
 */
export function BottomNav({ items }: BottomNavProps) {
  return (
    <nav className="sc-bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200/70 flex items-center safe-bottom">
      {items.map((it) => (
        <span
          key={it.label}
          className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-2 cursor-pointer ${
            it.active ? 'text-cobalt' : 'text-gray-400'
          }`}
        >
          {it.active && <span className="absolute top-0 h-0.5 w-7 rounded-full bg-cobalt" />}
          <i className={`${it.icon} text-lg ${it.active ? 'scale-110' : ''}`} aria-hidden />
          <span className="text-[10px] font-medium">{it.label}</span>
        </span>
      ))}
    </nav>
  );
}

export interface AppShellProps {
  header?: React.ReactNode;
  bottomNav?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * The frame every signed-in screen sits in.
 *
 * `pb-24 md:pb-8` is load-bearing: without the extra bottom padding on mobile,
 * the fixed tab bar covers the last item of any list.
 */
export function AppShell({ header, bottomNav, children }: AppShellProps) {
  return (
    <div className="bg-gray-50 min-h-screen">
      {header}
      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 pb-24 md:pb-8">{children}</main>
      {bottomNav}
    </div>
  );
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Primary action, right-aligned on desktop and stacked below on mobile. */
  action?: React.ReactNode;
}

/** The title block that opens a page. */
export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <section className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{title}</h1>
          {subtitle && <p className="text-gray-600">{subtitle}</p>}
        </div>
        {action}
      </div>
    </section>
  );
}

export interface WelcomeBannerProps {
  name: string;
  message: string;
  action?: React.ReactNode;
}

/** The cobalt gradient banner at the top of both dashboards. */
export function WelcomeBanner({ name, message, action }: WelcomeBannerProps) {
  return (
    <section className="rounded-2xl overflow-hidden mb-8 bg-gradient-to-br from-cobalt via-blue-600 to-blue-500 text-white">
      <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="min-w-0">
          <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-2">Welcome back</p>
          <h1 className="text-2xl md:text-4xl font-bold mb-3">{name}</h1>
          <p className="text-blue-100 text-base md:text-lg max-w-md">{message}</p>
        </div>
        {action}
      </div>
    </section>
  );
}

export interface StatGridProps {
  children: React.ReactNode;
}

/** The four-across stat row. Two columns on a phone, four from `lg:`. */
export function StatGrid({ children }: StatGridProps) {
  return <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">{children}</div>;
}

export interface ListSectionProps {
  /** Uppercase section label, e.g. "ACTIVE PROJECTS (3)". */
  title: string;
  /** Font Awesome class shown before the title. */
  icon?: string;
  children: React.ReactNode;
}

/** A labelled group in a list page, with the hairline rule the product uses. */
export function ListSection({ title, icon, children }: ListSectionProps) {
  return (
    <div className="space-y-3 mb-8">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
          {icon && <i className={`${icon} mr-1.5`} aria-hidden />}
          {title}
        </h2>
        <div className="flex-1 h-px bg-gray-200" />
      </div>
      {children}
    </div>
  );
}

export interface SplitLayoutProps {
  children: React.ReactNode;
  /** Sits beside the content from `lg:` up, and below it on smaller screens. */
  aside: React.ReactNode;
}

/** Content plus a sidebar — the shape of every project detail page. */
export function SplitLayout({ children, aside }: SplitLayoutProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">{children}</div>
      <aside className="space-y-6">{aside}</aside>
    </div>
  );
}
