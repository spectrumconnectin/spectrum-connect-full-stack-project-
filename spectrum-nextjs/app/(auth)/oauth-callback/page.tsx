'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { tokenStore, profile as profileApi } from '@/lib/api';

function OAuthCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [message, setMessage] = useState('Signing you in…');

  useEffect(() => {
    const error = params.get('error');

    if (error) {
      setStatus('error');
      setMessage('Google sign-in was cancelled or failed. Please try again.');
      setTimeout(() => router.replace('/login'), 3000);
      return;
    }

    // New secure exchange flow: backend redirects with ?code=<opaque>, never ?token=<jwt>
    const exchangeCode = params.get('code');
    // Legacy fallback: direct ?token= (for backward compat during migration)
    const directToken = params.get('token');

    const resolveToken = async (): Promise<string | null> => {
      if (directToken) return directToken;
      if (!exchangeCode) return null;
      // Exchange the opaque code for the actual JWT
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/backend'}/auth/oauth-token?code=${encodeURIComponent(exchangeCode)}`, {
          credentials: 'include',
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.access_token ?? null;
      } catch {
        return null;
      }
    };

    resolveToken().then(token => {
      if (!token) {
        setStatus('error');
        setMessage('Sign-in failed. No credentials received. Redirecting to login…');
        setTimeout(() => router.replace('/login'), 2000);
        return;
      }

      // The httpOnly session cookie was already set by the /auth/oauth-token
      // response above — this just records "logged in" for client-side UI checks.
      tokenStore.markLoggedIn();

      // Fetch profile to determine account type → redirect to correct dashboard
      // Backend stores: 'crew' (creator), 'producer' (client), 'both'
      setMessage('Almost there…');
      profileApi.getMe()
        .then(user => {
          const accountType = user.account_type;
          const hasProfile = !!(user.profile?.first_name || user.profile?.display_name);

          if (accountType === 'producer' || accountType === 'both') {
            router.replace('/client/dashboard');
          } else if (accountType === 'crew') {
            if (hasProfile) {
              router.replace('/creator/dashboard');
            } else {
              router.replace('/onboarding/creator');
            }
          } else {
            router.replace('/onboarding/creator');
          }
        })
        .catch(() => {
          router.replace('/creator/dashboard');
        });
    });
  }, [params, router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f8fafc',
      fontFamily: "'Inter', system-ui, sans-serif",
      gap: 16,
    }}>
      {status === 'loading' ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/spectrum-logo.svg" alt="Spectrum" style={{ width: 48, height: 48, borderRadius: 14, marginBottom: 8 }} />
          <div style={{
            width: 40, height: 40,
            border: '3px solid #e5e7eb',
            borderTop: '3px solid #195ad7',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ fontSize: 15, color: '#6b7280', margin: 0 }}>{message}</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
      ) : (
        <>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </svg>
          </div>
          <p style={{ fontSize: 15, color: '#374151', fontWeight: 600, margin: 0 }}>Sign-in failed</p>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0, textAlign: 'center', maxWidth: 320 }}>{message}</p>
        </>
      )}
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTop: '3px solid #195ad7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <OAuthCallbackInner />
    </Suspense>
  );
}
