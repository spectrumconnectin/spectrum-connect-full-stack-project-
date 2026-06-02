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
    const token = params.get('token');
    const error = params.get('error');

    if (error) {
      setStatus('error');
      setMessage('Google sign-in was cancelled or failed. Please try again.');
      setTimeout(() => router.replace('/login'), 3000);
      return;
    }

    if (!token) {
      setStatus('error');
      setMessage('No token received. Redirecting to login…');
      setTimeout(() => router.replace('/login'), 2000);
      return;
    }

    // Store the JWT
    tokenStore.set(token);

    // Fetch profile to determine account type → redirect to correct dashboard
    setMessage('Almost there…');
    profileApi.getMe()
      .then(user => {
        const accountType = user.account_type;
        if (accountType === 'creator') {
          router.replace('/creator/dashboard');
        } else if (accountType === 'client') {
          router.replace('/client/dashboard');
        } else {
          // First time — go to onboarding
          router.replace('/onboarding/client');
        }
      })
      .catch(() => {
        // Token stored but profile fetch failed — still go to a safe page
        router.replace('/client/dashboard');
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
