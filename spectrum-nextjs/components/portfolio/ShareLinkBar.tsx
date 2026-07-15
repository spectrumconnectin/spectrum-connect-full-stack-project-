'use client';

import { useEffect, useRef, useState } from 'react';
import { profile as profileApi, portfolioBuilder } from '@/lib/api';

/** Mirror the backend slug normalizer so what you type is what gets saved. */
function normalizeSlug(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '').slice(0, 30);
}

/**
 * Shareable portfolio link bar — clean handle, copy, open, publish toggle.
 * If the account's username is an email (or no handle is set), it nudges the
 * creator to pick a clean handle so their email never appears in the URL.
 */
export default function ShareLinkBar({
  username,
  initialSlug = null,
  initialPublished = true,
  initialAccess = 'public',
}: {
  username: string;
  initialSlug?: string | null;
  initialPublished?: boolean;
  initialAccess?: 'public' | 'password';
}) {
  const emailLike = username.includes('@');
  const [slug, setSlug] = useState<string | null>(initialSlug);
  const [copied, setCopied] = useState(false);
  const [published, setPublished] = useState(initialPublished);
  const [busy, setBusy] = useState(false);

  // Password protection
  const [access, setAccess] = useState<'public' | 'password'>(initialAccess);
  const [passcodeDraft, setPasscodeDraft] = useState('');
  const [passcodeBusy, setPasscodeBusy] = useState(false);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [passcodeSaved, setPasscodeSaved] = useState(false);

  // Handle editor state
  const [editing, setEditing] = useState(emailLike && !initialSlug);
  const [draft, setDraft] = useState(initialSlug || (emailLike ? normalizeSlug(username.split('@')[0]) : ''));
  const [check, setCheck] = useState<{ available: boolean; reason?: string | null } | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handle = slug || username;
  const url = `spectrumconect.com/portfolio/${handle}`;

  // Debounced availability check as the user types.
  useEffect(() => {
    if (!editing) return;
    setCheck(null);
    const norm = normalizeSlug(draft);
    if (norm.length < 3) return;
    if (debounce.current) clearTimeout(debounce.current);
    setChecking(true);
    debounce.current = setTimeout(async () => {
      try {
        const r = await portfolioBuilder.checkSlug(norm);
        setCheck({ available: r.available, reason: r.reason });
      } catch { setCheck(null); } finally { setChecking(false); }
    }, 400);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [draft, editing]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`https://${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  };

  const togglePublish = async () => {
    setBusy(true);
    const next = !published;
    try {
      await profileApi.updateMe({ profile: { portfolio_published: next } });
      setPublished(next);
    } catch { /* keep old state */ } finally { setBusy(false); }
  };

  const saveSlug = async () => {
    const norm = normalizeSlug(draft);
    if (norm.length < 3 || (check && !check.available)) return;
    setSaving(true);
    try {
      const r = await portfolioBuilder.setSlug(norm);
      setSlug(r.slug);
      setEditing(false);
    } catch { /* leave editor open */ } finally { setSaving(false); }
  };

  const normDraft = normalizeSlug(draft);
  const canSave = normDraft.length >= 3 && (check?.available ?? false) && !saving;

  const setPublicAccess = async () => {
    setPasscodeBusy(true);
    setPasscodeError(null);
    try {
      await portfolioBuilder.setPasscode('public');
      setAccess('public');
      setPasscodeDraft('');
    } catch { setPasscodeError('Could not update access. Try again.'); } finally { setPasscodeBusy(false); }
  };

  const savePasscode = async () => {
    if (passcodeDraft.trim().length < 4) { setPasscodeError('Passcode must be at least 4 characters.'); return; }
    setPasscodeBusy(true);
    setPasscodeError(null);
    try {
      await portfolioBuilder.setPasscode('password', passcodeDraft.trim());
      setAccess('password');
      setPasscodeDraft('');
      setPasscodeSaved(true);
      setTimeout(() => setPasscodeSaved(false), 2200);
    } catch { setPasscodeError('Could not save passcode. Try again.'); } finally { setPasscodeBusy(false); }
  };

  return (
    <div className="bg-gradient-to-r from-gray-900 to-slate-800 rounded-2xl p-5 text-white">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-1.5">Your portfolio link</p>
          <div className="flex items-center gap-2 min-w-0">
            <p className="font-mono text-sm text-gray-200 truncate">{url}</p>
            {!editing && (
              <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-white text-xs flex-shrink-0" title="Edit handle">
                <i className="fa-solid fa-pen" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={copy}
            className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-white/20 transition">
            <i className={`fa-solid ${copied ? 'fa-check text-emerald-400' : 'fa-link'}`} />
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <a href={`/portfolio/${handle}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-gray-900 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-100 transition">
            <i className="fa-regular fa-eye" /> View
          </a>
          <button onClick={togglePublish} disabled={busy} role="switch" aria-checked={published}
            title={published ? 'Public — click to unpublish' : 'Private — click to publish'}
            className={`relative w-11 h-6 rounded-full transition flex-shrink-0 ${published ? 'bg-emerald-500' : 'bg-gray-600'} ${busy ? 'opacity-60 cursor-wait' : ''}`}>
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${published ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Email-in-URL warning */}
      {emailLike && !slug && !editing && (
        <p className="text-xs text-amber-300/90 mt-3">
          <i className="fa-solid fa-triangle-exclamation mr-1.5" />
          Your link currently shows your email address.{' '}
          <button onClick={() => setEditing(true)} className="underline font-semibold hover:text-amber-200">Set a clean handle</button>.
        </p>
      )}

      {/* Handle editor */}
      {editing && (
        <div className="mt-4 bg-black/25 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-300 mb-2">Choose your portfolio handle</p>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-white/10 border border-white/20 rounded-lg overflow-hidden flex-1 min-w-[240px]">
              <span className="pl-3 pr-1 py-2 text-xs text-gray-400 font-mono whitespace-nowrap">spectrumconect.com/portfolio/</span>
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="your-handle"
                autoFocus
                className="flex-1 min-w-0 bg-transparent py-2 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none font-mono"
              />
            </div>
            <button onClick={saveSlug} disabled={!canSave}
              className="bg-cobalt text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed">
              {saving ? 'Saving…' : 'Save'}
            </button>
            {(slug || !emailLike) && (
              <button onClick={() => { setEditing(false); setDraft(slug || ''); }}
                className="text-gray-400 hover:text-white px-2 py-2 text-sm">Cancel</button>
            )}
          </div>
          <div className="mt-2 text-xs min-h-[16px]">
            {normDraft.length > 0 && normDraft.length < 3 && <span className="text-gray-400">Handle must be at least 3 characters.</span>}
            {normDraft.length >= 3 && checking && <span className="text-gray-400">Checking availability…</span>}
            {normDraft.length >= 3 && !checking && check?.available && (
              <span className="text-emerald-400"><i className="fa-solid fa-check mr-1" />spectrumconect.com/portfolio/{normDraft} is available</span>
            )}
            {normDraft.length >= 3 && !checking && check && !check.available && (
              <span className="text-red-400"><i className="fa-solid fa-xmark mr-1" />{check.reason || 'Not available'}</span>
            )}
          </div>
        </div>
      )}

      {!published && (
        <p className="text-xs text-amber-300/90 mt-3">
          <i className="fa-solid fa-eye-slash mr-1.5" />Your portfolio is currently private — visitors see a “portfolio is private” page.
        </p>
      )}

      {/* Password protection */}
      <div className="mt-4 bg-black/25 rounded-xl p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-300">
              <i className="fa-solid fa-lock mr-1.5" />Password protection
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {access === 'password' ? 'Visitors need a passcode to view your portfolio.' : 'Anyone with the link can view your portfolio.'}
            </p>
          </div>
          {access === 'password' && (
            <button onClick={setPublicAccess} disabled={passcodeBusy}
              className="text-xs font-semibold text-gray-300 hover:text-white border border-white/20 px-3 py-1.5 rounded-lg transition disabled:opacity-50">
              Make public
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <input
            type="password"
            value={passcodeDraft}
            onChange={e => { setPasscodeDraft(e.target.value); setPasscodeError(null); }}
            placeholder={access === 'password' ? 'Set a new passcode…' : 'Set a passcode…'}
            className="flex-1 min-w-[180px] bg-white/10 border border-white/20 rounded-lg py-2 px-3 text-sm text-white placeholder-gray-500 focus:outline-none"
          />
          <button onClick={savePasscode} disabled={passcodeBusy || passcodeDraft.trim().length < 4}
            className="bg-cobalt text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed">
            {passcodeBusy ? 'Saving…' : 'Set passcode'}
          </button>
        </div>
        {passcodeError && <p className="text-xs text-red-400 mt-2">{passcodeError}</p>}
        {passcodeSaved && <p className="text-xs text-emerald-400 mt-2"><i className="fa-solid fa-check mr-1" />Passcode saved.</p>}
      </div>
    </div>
  );
}
