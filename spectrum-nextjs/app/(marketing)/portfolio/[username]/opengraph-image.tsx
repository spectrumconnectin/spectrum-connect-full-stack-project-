import { ImageResponse } from 'next/og';
import { getPublicPortfolio } from '@/lib/portfolio';

export const runtime = 'edge';
export const alt = 'Creator portfolio on Spectrum Connect';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Branded share card for portfolio links — dark minimal canvas with the
 * creator's name/title. Explicit og:images (cover/profile photo) win when the
 * creator has them; this is the polished fallback.
 */
export default async function OgImage({ params }: { params: { username: string } }) {
  let name = params.username;
  let title = 'Creative Portfolio';
  try {
    const data = await getPublicPortfolio(params.username);
    if (data?.published && data.profile) {
      name = data.profile.display_name || name;
      title = data.profile.headline || data.profile.tagline || title;
    }
  } catch { /* fall back to defaults */ }

  return new ImageResponse(
    (
      <div
        style={{
          position: 'relative', width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: '#050507', color: '#f5f5f7', fontFamily: 'sans-serif', overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute', top: 140, left: 200, width: 800, height: 480, borderRadius: 999,
            background: 'radial-gradient(closest-side, rgba(37,99,235,0.35), rgba(109,40,217,0.16) 60%, transparent 75%)',
            filter: 'blur(40px)',
          }}
        />
        <div style={{ display: 'flex', fontSize: 22, fontWeight: 600, letterSpacing: 7, color: 'rgba(245,245,247,0.5)', textTransform: 'uppercase', marginBottom: 30 }}>
          Portfolio
        </div>
        <div
          style={{
            display: 'flex', fontSize: 84, fontWeight: 800, lineHeight: 1.05, letterSpacing: -3,
            textAlign: 'center', maxWidth: 1000,
            backgroundImage: 'linear-gradient(100deg, #ffffff 20%, #93c5fd 60%, #c4b5fd 90%)',
            backgroundClip: 'text', color: 'transparent',
          }}
        >
          {name}
        </div>
        <div style={{ display: 'flex', fontSize: 30, color: 'rgba(245,245,247,0.6)', marginTop: 26 }}>
          {title}
        </div>
        <div style={{ position: 'absolute', bottom: 44, display: 'flex', alignItems: 'center', gap: 12, fontSize: 21, color: 'rgba(245,245,247,0.45)' }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32,
              borderRadius: 9, background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff',
              fontSize: 17, fontWeight: 700,
            }}
          >
            S
          </div>
          spectrumconect.com
        </div>
      </div>
    ),
    { ...size },
  );
}
