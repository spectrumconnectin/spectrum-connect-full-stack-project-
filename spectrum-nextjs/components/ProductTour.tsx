'use client';

/**
 * ProductTour — a premium, reusable guided product tour.
 *
 * - Spotlight steps highlight a real element (`selector`) by dimming + blurring
 *   everything around it and ringing the target; the tooltip points at it.
 * - Concept steps (no selector) show a centered premium card.
 * - Auto-launches once per role on first dashboard visit (localStorage flag).
 * - Can be re-launched anywhere via `window.dispatchEvent(new Event('sc:start-tour'))`.
 * - Skip is always available; the tour never hard-blocks the user.
 *
 * Mount once per app shell:  <ProductTour role="client" />
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

type Step = {
  key: string;
  title: string;
  body: string;
  icon: string;            // Font Awesome class
  selector?: string;       // spotlight target; omit for a centered concept card
  cta?: { label: string; href: string };
};

const STORAGE_KEY = (role: string) => `sc_tour_v1_${role}`;

const TOURS: Record<'client' | 'creator', Step[]> = {
  creator: [
    { key: 'welcome', icon: 'fa-hand-sparkles', title: 'Welcome to Spectrum Connect',
      body: 'Connect. Collaborate. Grow. Here’s a 30-second tour of where everything lives so you can land your first project faster.' },
    { key: 'discover', icon: 'fa-compass', title: 'Discover projects',
      body: 'Browse open projects that match your skills, then send a proposal in a couple of taps. The more relevant your pitch, the better your odds.',
      cta: { label: 'Browse projects', href: '/creator/find-projects' } },
    { key: 'etf', icon: 'fa-medal', title: 'Earn Trust Framework (ETF)',
      body: 'Trust is earned through completed projects, reliability, and professional collaboration. A higher ETF score surfaces you to more clients.' },
    { key: 'messages', icon: 'fa-comment', title: 'Messages', selector: '[data-tour="messages"]',
      body: 'Every project gets a shared workspace and chat. Keep all communication here — it’s your record if a dispute ever comes up.' },
    { key: 'notifications', icon: 'fa-bell', title: 'Notifications', selector: '[data-tour="bell"]',
      body: 'Hiring decisions, delivery reviews, and payouts land here in real time. Keep an eye on it so you never miss a window.' },
    { key: 'profile', icon: 'fa-user', title: 'Build a standout profile',
      body: 'A complete profile with a portfolio wins more work. Add your bio, skills, and a few best pieces — it only takes a few minutes.',
      cta: { label: 'Complete profile', href: '/creator/profile' } },
    { key: 'done', icon: 'fa-circle-check', title: 'You’re all set',
      body: 'Profile ✓  ·  ETF active ✓  ·  Ready to apply ✓  — your next project is one proposal away.',
      cta: { label: 'Explore projects', href: '/creator/find-projects' } },
  ],
  client: [
    { key: 'welcome', icon: 'fa-hand-sparkles', title: 'Welcome to Spectrum Connect',
      body: 'Connect. Collaborate. Grow. Here’s a quick tour so you can post your first project and hire with confidence.' },
    { key: 'post', icon: 'fa-plus', title: 'Post a project',
      body: 'Describe what you need — title, scope, budget, and timeline. Clear briefs attract stronger proposals from verified creators.',
      cta: { label: 'Post a project', href: '/client/projects/create' } },
    { key: 'smart', icon: 'fa-bolt', title: 'Smart Connect',
      body: 'We match you to creators using skills, portfolio, ETF, ratings, and experience — so you spend less time searching and more time building.' },
    { key: 'messages', icon: 'fa-comment', title: 'Messages', selector: '[data-tour="messages"]',
      body: 'Chat with creators and manage each project from a shared workspace. Everything stays on-platform and on the record.' },
    { key: 'notifications', icon: 'fa-bell', title: 'Notifications', selector: '[data-tour="bell"]',
      body: 'Proposals, deliveries, and milestones show up here in real time so you always know what needs your attention.' },
    { key: 'escrow', icon: 'fa-shield-halved', title: 'Escrow keeps everyone safe',
      body: 'Your funds are held securely and only released when you approve the work. Creators know they’ll be paid; you stay protected.' },
    { key: 'done', icon: 'fa-circle-check', title: 'You’re ready to hire',
      body: 'Profile ✓  ·  Smart Connect ✓  ·  Escrow ✓  — post your first project and the right creators will come to you.',
      cta: { label: 'Create first project', href: '/client/projects/create' } },
  ],
};

type Rect = { top: number; left: number; width: number; height: number } | null;

export default function ProductTour({ role }: { role: 'client' | 'creator' }) {
  const pathname = usePathname();
  const router = useRouter();
  const steps = TOURS[role];

  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect>(null);
  const [closing, setClosing] = useState(false);
  const startedRef = useRef(false);

  const finish = useCallback((completed: boolean) => {
    setClosing(true);
    try { localStorage.setItem(STORAGE_KEY(role), completed ? 'done' : 'skipped'); } catch {}
    setTimeout(() => { setOpen(false); setClosing(false); setI(0); }, 180);
  }, [role]);

  const start = useCallback(() => { setI(0); setClosing(false); setOpen(true); }, []);

  // Auto-launch once, on first dashboard visit.
  useEffect(() => {
    if (startedRef.current) return;
    const onDashboard = pathname === `/${role}/dashboard`;
    if (!onDashboard) return;
    let seen = 'done';
    try { seen = localStorage.getItem(STORAGE_KEY(role)) || ''; } catch {}
    if (!seen) {
      startedRef.current = true;
      const t = setTimeout(start, 700); // let the dashboard paint first
      return () => clearTimeout(t);
    }
  }, [pathname, role, start]);

  // Manual re-launch from anywhere.
  useEffect(() => {
    const h = () => start();
    window.addEventListener('sc:start-tour', h);
    return () => window.removeEventListener('sc:start-tour', h);
  }, [start]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Measure the current step's target (if any).
  const measure = useCallback(() => {
    const sel = steps[i]?.selector;
    if (!sel) { setRect(null); return; }
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    const pad = 8;
    setRect({
      top: Math.max(0, r.top - pad),
      left: Math.max(0, r.left - pad),
      width: r.width + pad * 2,
      height: r.height + pad * 2,
    });
  }, [i, steps]);

  useEffect(() => {
    if (!open) return;
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, i, measure]);

  // Keyboard: Esc to skip, arrows to navigate.
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish(false);
      else if (e.key === 'ArrowRight') setI(v => Math.min(v + 1, steps.length - 1));
      else if (e.key === 'ArrowLeft') setI(v => Math.max(v - 1, 0));
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, finish, steps.length]);

  if (!open) return null;

  const step = steps[i];
  const isLast = i === steps.length - 1;
  const anim = closing ? 'sc-tour-out' : 'sc-tour-in';

  // Tooltip placement: under the target if there's room, else above; centered for concept steps.
  const TT_W = 360;
  let ttStyle: React.CSSProperties;
  let pointer: 'top' | 'bottom' | null = null;
  if (rect) {
    const below = rect.top + rect.height + 16;
    const placeBelow = below + 220 < window.innerHeight;
    const cx = Math.min(Math.max(rect.left + rect.width / 2, TT_W / 2 + 12), window.innerWidth - TT_W / 2 - 12);
    ttStyle = {
      position: 'fixed',
      top: placeBelow ? below : undefined,
      bottom: placeBelow ? undefined : window.innerHeight - rect.top + 16,
      left: cx,
      transform: 'translateX(-50%)',
      width: TT_W,
      maxWidth: 'calc(100vw - 24px)',
    };
    pointer = placeBelow ? 'top' : 'bottom';
  } else {
    ttStyle = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 420,
      maxWidth: 'calc(100vw - 24px)',
    };
  }

  const goCta = () => {
    if (step.cta) { finish(isLast); router.push(step.cta.href); }
  };

  return (
    <div className={`fixed inset-0 z-[100] ${anim}`} aria-modal="true" role="dialog">
      {/* Dim + blur overlay. For spotlight steps we punch a hole with the ring
          element; the four-panel blur keeps the page readable but defocused. */}
      {rect ? (
        <>
          {/* Four blurred panels framing the target (leaves the target crisp). */}
          <div className="sc-tour-scrim" style={{ top: 0, left: 0, width: '100vw', height: rect.top }} />
          <div className="sc-tour-scrim" style={{ top: rect.top + rect.height, left: 0, width: '100vw', height: `calc(100vh - ${rect.top + rect.height}px)` }} />
          <div className="sc-tour-scrim" style={{ top: rect.top, left: 0, width: rect.left, height: rect.height }} />
          <div className="sc-tour-scrim" style={{ top: rect.top, left: rect.left + rect.width, width: `calc(100vw - ${rect.left + rect.width}px)`, height: rect.height }} />
          {/* Highlight ring around the target. */}
          <div style={{
            position: 'fixed', top: rect.top, left: rect.left, width: rect.width, height: rect.height,
            borderRadius: 14, boxShadow: '0 0 0 2px rgba(25,90,215,0.9), 0 0 0 6px rgba(25,90,215,0.25)',
            pointerEvents: 'none', transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)',
          }} />
        </>
      ) : (
        <div className="sc-tour-scrim" style={{ inset: 0, width: '100vw', height: '100vh' }} onClick={() => finish(false)} />
      )}

      {/* Tooltip / card */}
      <div style={ttStyle} className="sc-tour-card">
        {pointer && <span className={`sc-tour-arrow sc-tour-arrow-${pointer}`} />}
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          <div className="p-5">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cobalt to-blue-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <i className={`fa-solid ${step.icon}`} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[16px] font-bold text-gray-900 leading-snug">{step.title}</h3>
                <p className="text-[13.5px] text-gray-500 leading-relaxed mt-1.5">{step.body}</p>
              </div>
            </div>

            {step.cta && (
              <button onClick={goCta}
                className="mt-4 w-full py-2.5 bg-cobalt text-white rounded-xl font-semibold text-sm hover:bg-blue-700 active:scale-[0.99] transition flex items-center justify-center gap-2">
                {step.cta.label} <i className="fa-solid fa-arrow-right text-xs" />
              </button>
            )}
          </div>

          {/* Footer: progress dots + controls */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50/70 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              {steps.map((s, idx) => (
                <button key={s.key} onClick={() => setI(idx)} aria-label={`Step ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all ${idx === i ? 'w-5 bg-cobalt' : 'w-1.5 bg-gray-300 hover:bg-gray-400'}`} />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              {i > 0 && (
                <button onClick={() => setI(v => v - 1)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition">
                  Back
                </button>
              )}
              {isLast ? (
                <button onClick={() => finish(true)}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-cobalt hover:bg-blue-700 rounded-lg transition">
                  Done
                </button>
              ) : (
                <button onClick={() => setI(v => Math.min(v + 1, steps.length - 1))}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-cobalt hover:bg-blue-700 rounded-lg transition">
                  Next
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Skip — always available, never blocks the user */}
        {!isLast && (
          <div className="text-center mt-3">
            <button onClick={() => finish(false)}
              className="text-xs font-medium text-white/80 hover:text-white transition px-3 py-1.5">
              Skip tour
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
