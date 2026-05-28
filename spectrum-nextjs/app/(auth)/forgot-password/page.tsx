'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { auth } from '../../../lib/api';

const IconMail = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>
  </svg>
);

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const emailError = touched && !emailValid ? (email ? 'Enter a valid email' : 'Required') : '';

  const [err, setErr] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!emailValid) return;
    setSubmitting(true);
    setErr('');
    try {
      await auth.forgotPassword(email);
      setDone(true);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page" data-screen-label="Forgot Password">
      <aside className="brand">
        <div className="brand-mark">
          <div className="logo-tile">
            <Image src="/assets/spectrum-logo.svg" alt="Spectrum Connect" width={44} height={44} />
          </div>
          <div className="name">Spectrum Connect</div>
        </div>
        <div className="brand-hero">
          <h1>Reset your password securely</h1>
          <p>We&apos;ll send a secure link to your email. You&apos;ll be back to creating in minutes.</p>
        </div>
        <div className="features">
          <div className="feature">
            <div className="ic">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <div className="txt">
              <div className="t">Secure Reset Link</div>
              <div className="s">Expires in 15 minutes for your protection</div>
            </div>
          </div>
          <div className="feature">
            <div className="ic">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5L16 10"/></svg>
            </div>
            <div className="txt">
              <div className="t">No Data Lost</div>
              <div className="s">Your profile and projects are safe</div>
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
                <h2>Check your email</h2>
                <p>We sent a password reset link to <strong>{email}</strong>. It expires in 15 minutes.</p>
                <p style={{ marginTop: 12, fontSize: 13, color: '#6b7280' }}>
                  Didn&apos;t receive it?{' '}
                  <button onClick={() => { setDone(false); setSubmitting(false); }} style={{ color: '#195ad7', fontWeight: 600, background: 'none', border: 0, cursor: 'pointer', padding: 0 }}>
                    Try again
                  </button>
                </p>
              </div>
            ) : (
              <form noValidate onSubmit={onSubmit}>
                <h2>Forgot password?</h2>
                <p className="lede">No worries — enter your email and we&apos;ll send you a reset link.</p>

                <div className="field">
                  <label htmlFor="email">Email address</label>
                  <div className="input-wrap">
                    <span className="icon-l"><IconMail /></span>
                    <input id="email" className={`input has-icon-left${emailError ? ' invalid' : ''}`}
                      type="email" placeholder="Enter your email" autoComplete="email"
                      value={email} onChange={e => setEmail(e.target.value)}
                      onBlur={() => setTouched(true)} />
                  </div>
                  {emailError && <div className="help error">{emailError}</div>}
                </div>

                <button className={`submit${submitting ? ' is-loading' : ''}`} type="submit" disabled={submitting}>
                  Send Reset Link
                </button>

                <div className="signin-prompt" style={{ marginTop: 20 }}>
                  <Link href="/login">← Back to sign in</Link>
                </div>
              </form>
            )}
          </div>
          <div className="footer-note">
            Remember your password?{' '}
            <Link href="/login" className="ftr-link">Sign in</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
