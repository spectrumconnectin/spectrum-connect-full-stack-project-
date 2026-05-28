'use client';

import { useState, useMemo } from 'react';
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

// ── OTP Step ────────────────────────────────────────────────────────────────
function OtpStep({ email, accountType, onVerified, devOtp: initialDevOtp }: { email: string; accountType: string; onVerified: () => void; devOtp?: string }) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [resending, setResending] = useState(false);
  const [devOtp, setDevOtp] = useState(initialDevOtp);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { setErr('Enter the 6-digit code'); return; }
    setLoading(true); setErr('');
    try {
      await auth.verifyOtp(email, otp);
      onVerified();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResending(true); setErr('');
    try {
      const res = await auth.sendOtp(email, 'verification');
      if (res.dev_otp) setDevOtp(res.dev_otp);
    } catch {
      // ignore
    } finally {
      setResending(false);
    }
  };

  return (
    <form noValidate onSubmit={verify}>
      <h2>Verify your email</h2>
      <p className="lede">Enter the 6-digit code to activate your account.</p>

      {/* DEV MODE: show OTP directly in UI */}
      {devOtp && (
        <div style={{ background: '#fefce8', border: '1.5px solid #fbbf24', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Dev Mode — OTP Code
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '0.3em', color: '#1d4ed8' }}>{devOtp}</div>
          <div style={{ fontSize: 11, color: '#92400e', marginTop: 4 }}>Email not integrated · expires in 10 min</div>
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
        <label htmlFor="otp">6-digit OTP</label>
        <div className="input-wrap">
          <span className="icon-l"><IconMail /></span>
          <input
            id="otp"
            className="input has-icon-left"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="••••••"
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            autoFocus
            style={{ letterSpacing: '0.3em', fontSize: 20, textAlign: 'center' }}
          />
        </div>
        <div className="help" style={{ color: '#6b7280' }}>Sending to: {email}</div>
      </div>

      <button className={`submit${loading ? ' is-loading' : ''}`} type="submit" disabled={loading}>
        {loading ? 'Verifying…' : 'Verify & Continue'}
      </button>

      <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: '#6b7280' }}>
        Didn&apos;t get it?{' '}
        <button type="button" onClick={resend} disabled={resending}
          style={{ background: 'none', border: 'none', color: '#195ad7', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}>
          {resending ? 'Sending…' : 'Resend OTP'}
        </button>
      </div>
    </form>
  );
}

// ── Success Step ────────────────────────────────────────────────────────────
function SuccessView({ first, accountType }: { first: string; accountType: string }) {
  const router = useRouter();
  return (
    <div className="success">
      <div className="check">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l5 5L20 7"/>
        </svg>
      </div>
      <h2>Welcome{first ? `, ${first}` : ''}!</h2>
      <p>Your account is verified. Let&apos;s set up your profile.</p>
      <button className="submit" type="button"
        onClick={() => router.push(accountType === 'producer' ? '/onboarding/client' : '/onboarding/creator')}>
        Complete Profile
      </button>
    </div>
  );
}

// ── Main Signup Page ────────────────────────────────────────────────────────
export default function SignUpPage() {
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+1');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [accountType, setAccountType] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [step, setStep] = useState<'form' | 'otp' | 'done'>('form');
  const [devOtp, setDevOtp] = useState<string | undefined>();

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneValid = /^\+[1-9]\d{6,14}$/.test(phone);

  const pwScore = useMemo(() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s++;
    if (/\d/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    if (password.length >= 12 && s >= 3) s = 4;
    return s;
  }, [password]);
  const pwLabel = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'][pwScore];

  const errors = {
    first: touched.first && !first.trim() ? 'Required' : '',
    last: touched.last && !last.trim() ? 'Required' : '',
    username: touched.username && !username.trim() ? 'Required' : '',
    email: touched.email && email && !emailValid ? 'Enter a valid email' : (touched.email && !email ? 'Required' : ''),
    phone: touched.phone && !phoneValid ? 'Use E.164 format e.g. +12025551234' : '',
    password: touched.password && password.length < 8 ? 'Must be at least 8 characters' : '',
    accountType: touched.accountType && !accountType ? 'Choose an account type' : '',
    agreed: touched.agreed && !agreed ? 'You must agree' : '',
  };
  const formValid = first.trim() && last.trim() && username.trim() && emailValid && phoneValid && password.length >= 8 && accountType && agreed;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ first: true, last: true, username: true, email: true, phone: true, password: true, accountType: true, agreed: true });
    if (!formValid) return;
    setSubmitting(true);
    setErr('');
    try {
      const res = await auth.register({
        email,
        username,
        password,
        phone_number: phone,
        account_type: accountType,
        name: `${first} ${last}`.trim(),
      });
      if (res.dev_otp) setDevOtp(res.dev_otp);
      setStep('otp');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'otp') {
    return (
      <div className="page" data-screen-label="02 Verify OTP">
        <aside className="brand">
          <div className="brand-mark">
            <div className="logo-tile">
              <Image src="/assets/spectrum-logo.svg" alt="Spectrum Connect" width={44} height={44} />
            </div>
            <div className="name">Spectrum Connect</div>
          </div>
          <div className="brand-hero">
            <h1>One last step</h1>
            <p>Verify your email to activate your account.</p>
          </div>
        </aside>
        <main className="right">
          <div style={{ width: '100%', maxWidth: 460 }}>
            <div className="card">
              <OtpStep
                email={email}
                accountType={accountType}
                onVerified={() => setStep('done')}
                devOtp={devOtp}
              />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="page" data-screen-label="03 Done">
        <aside className="brand">
          <div className="brand-mark">
            <div className="logo-tile">
              <Image src="/assets/spectrum-logo.svg" alt="Spectrum Connect" width={44} height={44} />
            </div>
            <div className="name">Spectrum Connect</div>
          </div>
          <div className="brand-hero">
            <h1>You&apos;re in!</h1>
            <p>Let&apos;s build your profile.</p>
          </div>
        </aside>
        <main className="right">
          <div style={{ width: '100%', maxWidth: 460 }}>
            <div className="card">
              <SuccessView first={first} accountType={accountType} />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page" data-screen-label="01 Sign Up">
      <aside className="brand">
        <div className="brand-mark">
          <div className="logo-tile">
            <Image src="/assets/spectrum-logo.svg" alt="Spectrum Connect" width={44} height={44} />
          </div>
          <div className="name">Spectrum Connect</div>
        </div>
        <div className="brand-hero">
          <h1>Start your creative journey today</h1>
          <p>Join thousands of creators and clients building amazing projects together.</p>
        </div>
        <div className="features">
          <div className="feature">
            <div className="ic">
              <svg className="ic-rocket" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 4c4 0 6 2 6 6 0 5-7 9-7 9s-4-1.5-5.5-3S5 11 5 11s4-7 9-7z"/><circle cx="15" cy="9" r="1.6"/>
                <path d="M9 15l-3 3M7 13l-2 2M11 17l-2 2"/>
              </svg>
            </div>
            <div className="txt">
              <div className="t">Quick Setup</div>
              <div className="s">Get started in less than 2 minutes</div>
            </div>
          </div>
          <div className="feature">
            <div className="ic">
              <svg className="ic-spark" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.5 5.5l2.8 2.8M15.7 15.7l2.8 2.8M5.5 18.5l2.8-2.8M15.7 8.3l2.8-2.8"/>
              </svg>
            </div>
            <div className="txt">
              <div className="t">Smart Matching</div>
              <div className="s">AI connects you with the right people</div>
            </div>
          </div>
          <div className="feature">
            <div className="ic">
              <svg className="ic-star" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.6l-5.9 3.1L7.3 14 2.5 9.5l6.6-.9L12 2.5z"/>
              </svg>
            </div>
            <div className="txt">
              <div className="t">Fair Opportunities</div>
              <div className="s">Everyone gets a chance to shine</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="right">
        <div style={{ width: '100%', maxWidth: 460 }}>
          <div className="card">
            <form noValidate onSubmit={onSubmit}>
              <h2>Create your account</h2>
              <p className="lede">Join the creative community and start collaborating.</p>

              {err && (
                <div className="alert">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                  </svg>
                  <span>{err}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label htmlFor="first">First name</label>
                  <input id="first" className={`input${errors.first ? ' invalid' : ''}`}
                    type="text" placeholder="First" value={first}
                    onChange={e => setFirst(e.target.value)}
                    onBlur={() => setTouched(t => ({ ...t, first: true }))} />
                  {errors.first && <div className="help error">{errors.first}</div>}
                </div>
                <div className="field">
                  <label htmlFor="last">Last name</label>
                  <input id="last" className={`input${errors.last ? ' invalid' : ''}`}
                    type="text" placeholder="Last" value={last}
                    onChange={e => setLast(e.target.value)}
                    onBlur={() => setTouched(t => ({ ...t, last: true }))} />
                  {errors.last && <div className="help error">{errors.last}</div>}
                </div>
              </div>

              <div className="field">
                <label htmlFor="username">Username</label>
                <input id="username" className={`input${errors.username ? ' invalid' : ''}`}
                  type="text" placeholder="@yourname" autoComplete="username" value={username}
                  onChange={e => setUsername(e.target.value.replace(/\s/g, '').toLowerCase())}
                  onBlur={() => setTouched(t => ({ ...t, username: true }))} />
                {errors.username && <div className="help error">{errors.username}</div>}
              </div>

              <div className="field">
                <label htmlFor="email">Email address</label>
                <div className="input-wrap">
                  <span className="icon-l"><IconMail /></span>
                  <input id="email" className={`input has-icon-left${errors.email ? ' invalid' : ''}`}
                    type="email" placeholder="you@example.com" autoComplete="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    onBlur={() => setTouched(t => ({ ...t, email: true }))} />
                </div>
                {errors.email && <div className="help error">{errors.email}</div>}
              </div>

              <div className="field">
                <label htmlFor="phone">Phone number <span style={{ color: '#9ca3af', fontWeight: 400 }}>(E.164 format)</span></label>
                <input id="phone" className={`input${errors.phone ? ' invalid' : ''}`}
                  type="tel" placeholder="+12025551234" value={phone}
                  onChange={e => setPhone(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, phone: true }))} />
                {errors.phone && <div className="help error">{errors.phone}</div>}
              </div>

              <div className="field">
                <label htmlFor="password">Password</label>
                <div className="input-wrap">
                  <span className="icon-l"><IconLock /></span>
                  <input id="password" className={`input has-icon-left has-icon-right${errors.password ? ' invalid' : ''}`}
                    type={showPw ? 'text' : 'password'} placeholder="Min. 8 characters" autoComplete="new-password"
                    value={password} onChange={e => setPassword(e.target.value)}
                    onBlur={() => setTouched(t => ({ ...t, password: true }))} />
                  <button type="button" className="icon-r btn" aria-label={showPw ? 'Hide' : 'Show'}
                    onClick={() => setShowPw(s => !s)}>
                    <IconEye open={!showPw} />
                  </button>
                </div>
                {password && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[0,1,2,3].map(i => (
                        <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < pwScore ? ['#ef4444','#f59e0b','#3b82f6','#22c55e'][Math.min(pwScore-1,3)] : '#e5e7eb', transition: 'background .2s' }} />
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>{pwLabel}</div>
                  </div>
                )}
                {errors.password && <div className="help error">{errors.password}</div>}
              </div>

              <div className="field">
                <label>I want to</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
                  {[
                    { value: 'crew', label: 'Work as Creator' },
                    { value: 'producer', label: 'Hire Creators' },
                  ].map(({ value, label }) => (
                    <button key={value} type="button" onClick={() => { setAccountType(value); setTouched(t => ({ ...t, accountType: true })); }}
                      style={{ padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${accountType === value ? '#195ad7' : '#e5e7eb'}`, background: accountType === value ? '#eef4ff' : '#fff', fontWeight: 600, fontSize: 13, color: accountType === value ? '#195ad7' : '#374151', cursor: 'pointer' }}>
                      {label}
                    </button>
                  ))}
                </div>
                {errors.accountType && <div className="help error">{errors.accountType}</div>}
              </div>

              <label className="remember" style={{ alignItems: 'flex-start', gap: 10 }}>
                <input type="checkbox" checked={agreed}
                  onChange={e => { setAgreed(e.target.checked); setTouched(t => ({ ...t, agreed: true })); }}
                  style={{ marginTop: 2 }} />
                <span style={{ fontSize: 13, color: '#374151' }}>
                  I agree to the{' '}
                  <Link href="/terms" className="link">Terms of Service</Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="link">Privacy Policy</Link>
                </span>
              </label>
              {errors.agreed && <div className="help error" style={{ marginTop: 4 }}>{errors.agreed}</div>}

              <button className={`submit${submitting ? ' is-loading' : ''}`} type="submit" disabled={submitting} style={{ marginTop: 16 }}>
                {submitting ? 'Creating account…' : 'Create account'}
              </button>

              <div className="divider">Or sign up with</div>
              <div className="social">
                <button type="button" className="btn-social" onClick={() => auth.googleLogin()}>
                  <IconGoogle /> Google
                </button>
              </div>

              <div className="signin-prompt">
                Already have an account?
                <Link href="/login">Sign in</Link>
              </div>
            </form>
          </div>
          <div className="footer-note">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="ftr-link">Terms of Service</Link> and{' '}
            <Link href="/privacy" className="ftr-link">Privacy Policy</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
