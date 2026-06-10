import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Spectrum Connect — Hire Verified Creative Professionals';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Social share / search result card. Generated as a real PNG —
 * SVG og:images are ignored by Google, Facebook, Twitter/X, WhatsApp,
 * LinkedIn, Slack and iMessage scrapers.
 */
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 45%, #7c3aed 100%)',
          color: '#fff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 48 }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 24,
              background: 'rgba(255,255,255,0.16)',
              border: '2px solid rgba(255,255,255,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 48,
              fontWeight: 800,
            }}
          >
            S
          </div>
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.02em' }}>
            Spectrum Connect
          </div>
        </div>

        <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.12, letterSpacing: '-0.03em', maxWidth: 980 }}>
          Hire Verified Creative Professionals
        </div>

        <div style={{ fontSize: 28, marginTop: 28, color: 'rgba(255,255,255,0.85)', maxWidth: 900 }}>
          AI-powered matching · Milestone escrow · 12% total fee — half of Fiverr
        </div>

        <div style={{ position: 'absolute', bottom: 48, left: 80, fontSize: 24, color: 'rgba(255,255,255,0.7)' }}>
          spectrumconect.com
        </div>
      </div>
    ),
    { ...size },
  );
}
