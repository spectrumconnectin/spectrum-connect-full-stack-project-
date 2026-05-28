'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { auth } from '../../../lib/api';

const IconGoogle = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.12A6.94 6.94 0 0 1 5.46 12c0-.74.13-1.45.36-2.12V7.04H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.96l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.61 0 3.06.55 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
  </svg>
);
const IconMail = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>
  </svg>
);
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

function SuccessView({ email }: { email: string }) {
  return (
    <div className="success">
      <div className="check">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l5 5L20 7"/>
        </svg>
      </div>
      <h2>Welcome back!</h2>
      <p>Signed in as <strong>{email || 'your account'}</strong>. Taking you to your dashboard…</p>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const [role, setRole] = useState<'creator' | 'client'>('creator');

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const errors = {
    email: touched.email && email && !emailValid ? 'Enter a valid email' : (touched.email && !email ? 'Required' : ''),
    password: touched.password && !password ? 'Required' : '',
  };
  const formValid = emailValid && password.length > 0;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setErr('');
    if (!formValid) return;
    setSubmitting(true);
    try {
      await auth.login(email, password);
      setDone(true);
      setTimeout(() => {
        router.push(role === 'client' ? '/client/dashboard' : '/creator/dashboard');
      }, 900);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Login failed';
      // If email not verified, offer OTP re-send
      if (msg.toLowerCase().includes('verify')) {
        setErr('Email not verified. Please verify with the OTP sent when you registered.');
      } else {
        setErr(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page" data-screen-label="01 Log in">
      <aside className="brand">
        <div className="brand-mark">
          <div className="logo-tile">
            <Image src="/assets/spectrum-logo.svg" alt="Spectrum Connect" width={44} height={44} />
          </div>
          <div className="name">Spectrum Connect</div>
        </div>
        <div className="brand-hero">
          <h1>Welcome back to your creative community</h1>
          <p>Connect with talented creators, build amazing teams, and bring your projects to life.</p>
        </div>
        <div className="features">
          <div className="feature">
            <div className="ic">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/team-icon-white.svg" alt="" width="22" height="22" style={{ display: 'block' }} />
            </div>
            <div className="txt">
              <div className="t">50,000+ Active Creators</div>
              <div className="s">Join a thriving community of professionals</div>
            </div>
          </div>
          <div className="feature">
            <div className="ic">
              <svg className="ic-badge" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle className="ring" cx="12" cy="12" r="9"/>
                <path className="check" d="M8.5 12.5l2.5 2.5L16 10"/>
              </svg>
            </div>
            <div className="txt">
              <div className="t">Verified Profiles</div>
              <div className="s">Work with trusted, qualified professionals</div>
            </div>
          </div>
          <div className="feature">
            <div className="ic">
              <svg className="ic-bag" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect className="case" x="3" y="7" width="18" height="13" rx="2"/>
                <path className="handle" d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                <path d="M3 13h18"/>
              </svg>
            </div>
            <div className="txt">
              <div className="t">100,000+ Projects Completed</div>
              <div className="s">Be part of a proven platform</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="right">
        <div style={{ width: '100%', maxWidth: 460 }}>
          <div className="card">
            {done ? (
              <SuccessView email={email} />
            ) : (
              <form noValidate onSubmit={onSubmit}>
                <h2>Log in to your account</h2>
                <p className="lede">Welcome back! Please enter your details.</p>

                {err && (
                  <div className="alert">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                    </svg>
                    <span>{err}</span>
                  </div>
                )}

                <div className="field">
                  <label htmlFor="email">Email address</label>
                  <div className="input-wrap">
                    <span className="icon-l"><IconMail /></span>
                    <input id="email" className={`input has-icon-left${errors.email ? ' invalid' : ''}`}
                      type="email" placeholder="Enter your email" autoComplete="email"
                      value={email} onChange={e => setEmail(e.target.value)}
                      onBlur={() => setTouched(t => ({ ...t, email: true }))} />
                  </div>
                  {errors.email && <div className="help error">{errors.email}</div>}
                </div>

                <div className="field">
                  <label htmlFor="password">Password</label>
                  <div className="input-wrap">
                    <span className="icon-l"><IconLock /></span>
                    <input id="password" className={`input has-icon-left has-icon-right${errors.password ? ' invalid' : ''}`}
                      type={showPw ? 'text' : 'password'} placeholder="Enter your password" autoComplete="current-password"
                      value={password} onChange={e => setPassword(e.target.value)}
                      onBlur={() => setTouched(t => ({ ...t, password: true }))} />
                    <button type="button" className="icon-r btn" aria-label={showPw ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPw(s => !s)}>
                      <IconEye open={!showPw} />
                    </button>
                  </div>
                  {errors.password && <div className="help error">{errors.password}</div>}
                </div>

                <div className="field">
                  <label>I&apos;m signing in as</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
                    {(['creator', 'client'] as const).map(r => (
                      <button key={r} type="button" onClick={() => setRole(r)}
                        style={{ padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${role === r ? '#195ad7' : '#e5e7eb'}`, background: role === r ? '#eef4ff' : '#fff', fontWeight: 600, fontSize: 13, color: role === r ? '#195ad7' : '#374151', cursor: 'pointer', textTransform: 'capitalize' }}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="row-between">
                  <label className="remember">
                    <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                    <span>Remember me</span>
                  </label>
                  <Link href="/forgot-password" className="link">Forgot password?</Link>
                </div>

                <button className={`submit${submitting ? ' is-loading' : ''}`} type="submit" disabled={submitting}>
                  {submitting ? 'Signing in…' : 'Log in'}
                </button>

                <div className="divider">Or continue with</div>
                <div className="social">
                  <button type="button" className="btn-social" onClick={() => auth.googleLogin()}>
                    <IconGoogle /> Google
                  </button>
                </div>

                <div className="signin-prompt">
                  Don&apos;t have an account?
                  <Link href="/signup">Sign up for free</Link>
                </div>
              </form>
            )}
          </div>
          <div className="footer-note">
            By logging in, you agree to our{' '}
            <Link href="#" className="ftr-link">Terms of Service</Link> and{' '}
            <Link href="#" className="ftr-link">Privacy Policy</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
