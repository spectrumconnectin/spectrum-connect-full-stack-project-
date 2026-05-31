'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// GDPR-friendly cookie consent banner.
//
// Behaviour:
//   - On first visit, the banner appears at the bottom of every page.
//   - Three top-level choices: Accept All / Reject Non-Essential / Customize.
//   - Customize reveals per-category toggles (functional, analytics, marketing).
//     Strictly-necessary is always on and cannot be unchecked.
//   - Choice is saved to localStorage under `spectrum_cookie_consent` and
//     to a cookie of the same name so server-side code can read it.
//   - Once a choice has been made, the banner stays hidden until the user
//     resets it from the /cookies page or clicks "Cookie settings" in the
//     footer (which dispatches a `spectrum:openCookieBanner` event).
//
// The version constant lets us re-prompt if we change the categories.

const STORAGE_KEY = 'spectrum_cookie_consent';
const CONSENT_VERSION = 1;
const OPEN_EVENT = 'spectrum:openCookieBanner';

type Category = 'necessary' | 'functional' | 'analytics' | 'marketing';
type Consent = Record<Category, boolean> & { version: number; ts: string };

const DEFAULT: Consent = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
  version: CONSENT_VERSION,
  ts: '',
};

function loadConsent(): Consent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Consent;
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveConsent(c: Consent) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
    // Mirror to a cookie so server-side code can read it. Lax cookie, 1 year.
    const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${STORAGE_KEY}=${encodeURIComponent(JSON.stringify(c))}; expires=${expires}; path=/; SameSite=Lax`;
  } catch {
    /* localStorage may be disabled — banner just keeps reappearing */
  }
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [choice, setChoice] = useState<Consent>(DEFAULT);

  useEffect(() => {
    const existing = loadConsent();
    if (!existing) setVisible(true);

    const reopen = () => {
      const current = loadConsent() ?? DEFAULT;
      setChoice({ ...current });
      setExpanded(true);
      setVisible(true);
    };
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
  }, []);

  if (!visible) return null;

  const finalize = (next: Consent) => {
    const enriched = { ...next, version: CONSENT_VERSION, ts: new Date().toISOString() };
    saveConsent(enriched);
    setVisible(false);
    setExpanded(false);
  };

  const acceptAll = () => finalize({
    necessary: true, functional: true, analytics: true, marketing: true,
    version: CONSENT_VERSION, ts: '',
  });

  const rejectOptional = () => finalize({
    necessary: true, functional: false, analytics: false, marketing: false,
    version: CONSENT_VERSION, ts: '',
  });

  const saveCustom = () => finalize(choice);

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      style={{
        position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 9999,
        maxWidth: 920, margin: '0 auto',
        background: '#111827', color: '#e5e7eb',
        borderRadius: 16, padding: 20,
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        fontFamily: "'Inter',system-ui,sans-serif",
      }}
    >
      {!expanded ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 6px', color: '#fff' }}>
              About cookies on Spectrum Connect
            </h2>
            <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: '#d1d5db' }}>
              We use essential cookies to keep you logged in. With your permission, we&apos;d
              also like to use a few optional ones to understand how the product is used so we
              can improve it. Read the details in our{' '}
              <Link href="/cookies" style={{ color: '#93c5fd', textDecoration: 'underline' }}>
                Cookie Policy
              </Link>
              .
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => setExpanded(true)}
              style={btnGhost}>
              Customize
            </button>
            <button onClick={rejectOptional} style={btnGhost}>
              Reject non-essential
            </button>
            <button onClick={acceptAll} style={btnPrimary}>
              Accept all
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#fff' }}>
              Manage cookie preferences
            </h2>
            <button onClick={() => setExpanded(false)}
              style={{ background: 'transparent', color: '#9ca3af', border: 0, cursor: 'pointer', fontSize: 18 }}
              aria-label="Close details">×</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            <CookieToggle
              label="Strictly necessary"
              description="Required to keep you logged in and keep the site working. Always on."
              checked={true}
              disabled
              onChange={() => {}}
            />
            <CookieToggle
              label="Functional"
              description="Remembers preferences like which tab you had open."
              checked={choice.functional}
              onChange={v => setChoice(c => ({ ...c, functional: v }))}
            />
            <CookieToggle
              label="Analytics"
              description="Aggregate usage data that helps us find bugs and improve features. No ad tracking."
              checked={choice.analytics}
              onChange={v => setChoice(c => ({ ...c, analytics: v }))}
            />
            <CookieToggle
              label="Marketing"
              description="Off by default. Only enabled if we ever run a campaign that needs a conversion pixel."
              checked={choice.marketing}
              onChange={v => setChoice(c => ({ ...c, marketing: v }))}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button onClick={rejectOptional} style={btnGhost}>Reject non-essential</button>
            <button onClick={acceptAll} style={btnGhost}>Accept all</button>
            <button onClick={saveCustom} style={btnPrimary}>Save preferences</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CookieToggle({
  label, description, checked, disabled, onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '10px 12px', background: '#1f2937', borderRadius: 10,
      cursor: disabled ? 'not-allowed' : 'pointer',
    }}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={e => onChange(e.target.checked)}
        style={{ marginTop: 3, accentColor: '#3b82f6' }}
      />
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#f3f4f6' }}>{label}</span>
        <span style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{description}</span>
      </span>
    </label>
  );
}

const btnPrimary: React.CSSProperties = {
  background: '#3b82f6', color: '#fff', border: 0,
  fontSize: 13, fontWeight: 600,
  padding: '9px 16px', borderRadius: 10, cursor: 'pointer',
};

const btnGhost: React.CSSProperties = {
  background: 'transparent', color: '#e5e7eb',
  border: '1px solid #374151',
  fontSize: 13, fontWeight: 600,
  padding: '9px 14px', borderRadius: 10, cursor: 'pointer',
};

// Re-export the event name + storage key so other components can integrate.
export const COOKIE_CONSENT_STORAGE_KEY = STORAGE_KEY;
export const COOKIE_CONSENT_OPEN_EVENT = OPEN_EVENT;
