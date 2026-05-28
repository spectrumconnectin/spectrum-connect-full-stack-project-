'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { auth } from '@/lib/api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get('email') ?? '';
  const type  = searchParams.get('type') ?? '';   // 'creator' | 'producer'

  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState<'input' | 'success' | 'resent'>('input');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [err, setErr] = useState('');
  // Auto-send OTP on mount if email is present
  useEffect(() => {
    if (!email) return;
    auth.sendOtp(email, 'verification').catch(() => {});
  }, [email]);

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { setErr('Enter the 6-digit code'); return; }
    setLoading(true); setErr('');
    try {
      await auth.verifyOtp(email, otp);
      setStatus('success');
      const dest = type === 'producer' ? '/onboarding/client' : '/onboarding/creator';
      setTimeout(() => router.push(dest), 1800);
    } catch (e) {
      setErr((e as Error).message ?? 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (resending) return;
    setResending(true); setErr('');
    try {
      await auth.sendOtp(email, 'verification');
      setStatus('resent');
      setTimeout(() => setStatus('input'), 4000);
    } catch (e) {
      setErr((e as Error).message ?? 'Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="page" data-screen-label="Verify Email">
      <aside className="brand">
        <div className="brand-mark">
          <div className="logo-tile">
            <Image src="/assets/spectrum-logo.svg" alt="Spectrum Connect" width={44} height={44} />
          </div>
          <div className="name">Spectrum Connect</div>
        </div>
        <div className="brand-hero">
          <h1>Verify your email address</h1>
          <p>One quick step to unlock your full Spectrum Connect account and start collaborating.</p>
        </div>
        <div className="features">
          <div className="feature">
            <div className="ic">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>
              </svg>
            </div>
            <div className="txt">
              <div className="t">Check Your Inbox</div>
              <div className="s">6-digit code sent to your email</div>
            </div>
          </div>
          <div className="feature">
            <div className="ic">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5L16 10"/>
              </svg>
            </div>
            <div className="txt">
              <div className="t">Secure & Private</div>
              <div className="s">Your email is never shared with third parties</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="right">
        <div style={{ width: '100%', maxWidth: 460 }}>
          <div className="card">

            {status === 'success' ? (
              <div className="success">
                <div className="check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12l5 5L20 7"/>
                  </svg>
                </div>
                <h2>Email verified!</h2>
                <p>Your account is now active. Taking you to profile setup…</p>
              </div>
            ) : (
              <form noValidate onSubmit={onVerify}>
                <h2>Enter your verification code</h2>
                <p className="lede">
                  We sent a 6-digit code to <strong>{email || 'your email'}</strong>.
                  Enter it below to verify your account.
                </p>

                {status === 'resent' && (
                  <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#166534', fontWeight: 500 }}>
                    ✓ New code sent to {email}
                  </div>
                )}

                {err && (
                  <div className="alert">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                    </svg>
                    <span>{err}</span>
                  </div>
                )}

                <div className="field">
                  <label htmlFor="otp">6-digit code</label>
                  <input
                    id="otp"
                    className="input"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••••"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    autoFocus
                    style={{ letterSpacing: '0.3em', fontSize: 22, textAlign: 'center', fontWeight: 700 }}
                  />
                  <div className="help">{otp.length}/6 digits</div>
                </div>

                <button
                  className={`submit${loading ? ' is-loading' : ''}`}
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  style={{ opacity: otp.length === 6 ? 1 : 0.5 }}
                >
                  {loading ? 'Verifying…' : 'Verify & Continue'}
                </button>

                <div style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: '#6b7280' }}>
                  Didn&apos;t receive a code?{' '}
                  <button type="button" onClick={onResend} disabled={resending}
                    style={{ background: 'none', border: 'none', color: '#195ad7', cursor: 'pointer', fontSize: 13, fontWeight: 600, textDecoration: 'underline' }}>
                    {resending ? 'Sending…' : 'Resend code'}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="footer-note">
            Need help?{' '}
            <Link href="/contact" className="ftr-link">Contact support</Link>
            {' · '}
            <Link href="/login" className="ftr-link">Back to login</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="page" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
