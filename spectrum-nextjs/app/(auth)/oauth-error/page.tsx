'use client';

import Link from 'next/link';

export default function OAuthErrorPage() {
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
      padding: 24,
    }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
        </svg>
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>Google sign-in failed</h1>
      <p style={{ fontSize: 15, color: '#6b7280', margin: 0, textAlign: 'center', maxWidth: 360, lineHeight: 1.6 }}>
        Something went wrong during Google sign-in. This can happen if you cancelled the sign-in or if there was a temporary issue.
      </p>
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <Link href="/login" style={{
          padding: '10px 24px',
          background: '#195ad7',
          color: '#fff',
          borderRadius: 10,
          fontWeight: 600,
          fontSize: 14,
          textDecoration: 'none',
        }}>
          Back to Login
        </Link>
        <Link href="/signup" style={{
          padding: '10px 24px',
          background: '#fff',
          color: '#374151',
          border: '1.5px solid #e5e7eb',
          borderRadius: 10,
          fontWeight: 600,
          fontSize: 14,
          textDecoration: 'none',
        }}>
          Try Sign Up
        </Link>
      </div>
    </div>
  );
}
