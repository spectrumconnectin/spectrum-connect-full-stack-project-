import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'The Spectrum Journal — Insights for Creators & Collaborators';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Social share card for the blog — Apple-keynote aesthetic: near-black canvas,
 * one huge gradient headline, quiet supporting type, generous negative space.
 * Real PNG via Satori (SVG og:images are ignored by scrapers).
 */
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#050507',
          color: '#f5f5f7',
          fontFamily: 'sans-serif',
          overflow: 'hidden',
        }}
      >
        {/* Aurora glow — soft, low-key, behind everything */}
        <div
          style={{
            position: 'absolute',
            top: 180,
            left: 150,
            width: 900,
            height: 520,
            borderRadius: 999,
            background:
              'radial-gradient(closest-side, rgba(37,99,235,0.35), rgba(109,40,217,0.18) 60%, transparent 75%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -300,
            left: 300,
            width: 600,
            height: 400,
            borderRadius: 999,
            background: 'radial-gradient(closest-side, rgba(147,51,234,0.25), transparent 70%)',
            filter: 'blur(50px)',
          }}
        />
        {/* Hairline top edge */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
          }}
        />

        {/* Eyebrow */}
        <div
          style={{
            display: 'flex',
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: 8,
            color: 'rgba(245,245,247,0.55)',
            textTransform: 'uppercase',
            marginBottom: 34,
          }}
        >
          The Spectrum Journal
        </div>

        {/* Headline — gradient ink, tight tracking */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            fontSize: 84,
            fontWeight: 800,
            lineHeight: 1.06,
            letterSpacing: -3,
            textAlign: 'center',
            backgroundImage: 'linear-gradient(100deg, #ffffff 15%, #93c5fd 50%, #c4b5fd 85%)',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          <div style={{ display: 'flex' }}>Insights for creators</div>
          <div style={{ display: 'flex' }}>&amp; collaborators.</div>
        </div>

        {/* Supporting line */}
        <div
          style={{
            display: 'flex',
            fontSize: 27,
            fontWeight: 400,
            color: 'rgba(245,245,247,0.6)',
            marginTop: 34,
            letterSpacing: -0.3,
          }}
        >
          Stories, guides, and ideas for doing your best creative work.
        </div>

        {/* Footer — quiet brand mark */}
        <div
          style={{
            position: 'absolute',
            bottom: 44,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 21,
            color: 'rgba(245,245,247,0.45)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 9,
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              color: '#fff',
              fontSize: 17,
              fontWeight: 700,
            }}
          >
            S
          </div>
          spectrumconect.com/blog
        </div>
      </div>
    ),
    { ...size },
  );
}
