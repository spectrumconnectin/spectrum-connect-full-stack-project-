'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { auth } from '../../../lib/api';

const IconLock = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V8a4 4 0 1 1 8 0v3"/>
  </svg>
);
const IconEye = ({ open }: { open: boolean }) => open ? (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>
  </svg>
) : (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3l18 18"/>
    <path d="M10.6 6.1A10.5 10.5 0 0 1 12 6c6.5 0 10 7 10 7a17.7 17.7 0 0 1-3.3 4.1"/>
    <path d="M6.6 7.6A17.5 17.5 0 0 0 2 13s3.5 7 10 7c1.6 0 3-.3 4.2-.8"/>
    <path d="M9.5 9.7a3 3 0 0 0 4.2 4.2"/>
  </svg>
);

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [invalidToken, setInvalidToken] = useState(false);

  useEffect(() => {
    if (!token) setInvalidToken(true);
  }, [token]);

  const str = strength(password);
  const strLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][str];
  const strColor = ['', '#ef4444', '#f59e0b', '#10b981', '#195ad7'][str];

  const pwError = touched.password && password.length < 8 ? 'Password must be at least 8 characters' : '';
  const confirmError = touched.confirm && confirm !== password ? 'Passwords do not match' : '';
  const formValid = password.length >= 8 && password === confirm;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ password: true, confirm: true });
    setErr('');
    if (!formValid) return;
    setSubmitting(true);
    try {
      await auth.resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'This reset link is invalid or has expired. Please request a new one.');
    } finally {
      setSubmitting(false);
    }
  };

  if (invalidToken) {
    return (
      <div className="page" data-screen-label="Reset Password - Invalid">
        <aside className="brand">
          <div className="brand-mark">
            <div className="logo-tile">
              <Image src="/assets/spectrum-logo.svg" alt="Spectrum Connect" width={44} height={44} />
            </div>
            <div className="name">Spectrum Connect</div>
          </div>
          <div className="brand-hero">
            <h1>Invalid reset link</h1>
            <p>This link is missing or has expired. Request a new one and you&apos;ll be back shortly.</p>
          </div>
        </aside>
        <main className="right">
          <div style={{ width: '100%', maxWidth: 460 }}>
            <div className="card">
              <div className="success" style={{ '--check-color': '#ef4444' } as React.CSSProperties}>
                <div className="check" style={{ background: '#fee2e2' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </div>
                <h2>Link expired or invalid</h2>
                <p>Password reset links expire after 15 minutes. Please request a new one.</p>
                <Link href="/forgot-password" className="submit" style={{ display: 'block', textAlign: 'center', marginTop: 20, textDecoration: 'none' }}>
                  Request new link
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page" data-screen-label="Reset Password">
      <aside className="brand">
        <div className="brand-mark">
          <div className="logo-tile">
            <Image src="/assets/spectrum-logo.svg" alt="Spectrum Connect" width={44} height={44} />
          </div>
          <div className="name">Spectrum Connect</div>
        </div>
        <div className="brand-hero">
          <h1>Create a new password</h1>
          <p>Choose something strong and memorable. Your account security matters to us.</p>
        </div>
        <div className="features">
          <div className="feature">
            <div className="ic">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V8a4 4 0 1 1 8 0v3"/>
              </svg>
            </div>
            <div className="txt">
              <div className="t">Use 8+ characters</div>
              <div className="s">Mix letters, numbers &amp; symbols</div>
            </div>
          </div>
          <div className="feature">
            <div className="ic">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5L16 10"/>
              </svg>
            </div>
            <div className="txt">
              <div className="t">Unique password</div>
              <div className="s">Don&apos;t reuse passwords from other sites</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="right">
        <div style={{ width: '100%', maxWidth: 460 }}>
          <div className="card">
            {done ? (
              <div className="success">
                <div className="check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12l5 5L20 7"/>
                  </svg>
                </div>
                <h2>Password updated!</h2>
                <p>Your password has been reset successfully. Redirecting you to login…</p>
              </div>
            ) : (
              <form noValidate onSubmit={onSubmit}>
                <h2>Set new password</h2>
                <p className="lede">Your new password must be at least 8 characters long.</p>

                {err && (
                  <div className="alert">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                    </svg>
                    <span>{err}</span>
                  </div>
                )}

                <div className="field">
                  <label htmlFor="password">New password</label>
                  <div className="input-wrap">
                    <span className="icon-l"><IconLock /></span>
                    <input id="password" className={`input has-icon-left has-icon-right${pwError ? ' invalid' : ''}`}
                      type={showPw ? 'text' : 'password'} placeholder="Create a password" autoComplete="new-password"
                      value={password} onChange={e => setPassword(e.target.value)}
                      onBlur={() => setTouched(t => ({ ...t, password: true }))} />
                    <button type="button" className="icon-r btn" aria-label={showPw ? 'Hide' : 'Show'}
                      onClick={() => setShowPw(s => !s)}>
                      <IconEye open={!showPw} />
                    </button>
                  </div>
                  {pwError && <div className="help error">{pwError}</div>}
                  {password.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {[1,2,3,4].map(i => (
                          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= str ? strColor : '#e5e7eb', transition: 'background 0.3s' }} />
                        ))}
                      </div>
                      <div style={{ fontSize: 12, color: strColor, marginTop: 4, fontWeight: 600 }}>{strLabel}</div>
                    </div>
                  )}
                </div>

                <div className="field">
                  <label htmlFor="confirm">Confirm password</label>
                  <div className="input-wrap">
                    <span className="icon-l"><IconLock /></span>
                    <input id="confirm" className={`input has-icon-left has-icon-right${confirmError ? ' invalid' : ''}`}
                      type={showConfirm ? 'text' : 'password'} placeholder="Confirm your password" autoComplete="new-password"
                      value={confirm} onChange={e => setConfirm(e.target.value)}
                      onBlur={() => setTouched(t => ({ ...t, confirm: true }))} />
                    <button type="button" className="icon-r btn" aria-label={showConfirm ? 'Hide' : 'Show'}
                      onClick={() => setShowConfirm(s => !s)}>
                      <IconEye open={!showConfirm} />
                    </button>
                  </div>
                  {confirmError && <div className="help error">{confirmError}</div>}
                </div>

                <button className={`submit${submitting ? ' is-loading' : ''}`} type="submit" disabled={submitting}>
                  Reset password
                </button>

                <div className="signin-prompt" style={{ marginTop: 20 }}>
                  <Link href="/login">← Back to sign in</Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
