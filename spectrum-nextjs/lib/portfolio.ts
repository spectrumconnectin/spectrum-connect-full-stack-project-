/**
 * Server-side data access for the public portfolio pages.
 * Fetches directly from the backend origin (server-to-server) so the pages can
 * render with SEO + ISR. Never import this into a client component.
 */
import type { PublicPortfolio, PublicProject } from '@/lib/api';

const API = process.env.BACKEND_ORIGIN
  || 'http://spectrum-connect-single.ap-south-1.elasticbeanstalk.com';

/** Next may hand route params already URL-encoded (e.g. an email-based
 * username → "name%40gmail.com"). Decode first so we never double-encode
 * (%40 → %2540) and miss the lookup. decodeURIComponent is a no-op on an
 * already-decoded value. */
export function decodeParam(v: string): string {
  try { return decodeURIComponent(v); } catch { return v; }
}

export async function getPublicPortfolio(username: string): Promise<PublicPortfolio | null> {
  const slug = decodeParam(username);
  try {
    const res = await fetch(
      `${API}/portfolio-builder/public/${encodeURIComponent(slug)}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getPublicProject(username: string, projectSlug: string): Promise<PublicProject | null> {
  const u = decodeParam(username);
  const s = decodeParam(projectSlug);
  try {
    const res = await fetch(
      `${API}/portfolio-builder/public/${encodeURIComponent(u)}/projects/${encodeURIComponent(s)}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** "Mar 2026" style formatting for completion dates. */
export function formatMonthYear(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

export function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_\-]{11})/);
  return m ? m[1] : null;
}

export function vimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

/** Best displayable cover image URL for a project (or null). */
export function projectCover(p: { media: { id: string; type: string; media_type: string; url: string; thumbnail?: string }[]; cover_media_id?: string }): string | null {
  const media = p.media || [];
  const cover = media.find(m => m.id === p.cover_media_id) || media[0];
  if (!cover) return null;
  if (cover.type === 'image') return cover.url;
  if (cover.thumbnail) return cover.thumbnail;
  if (cover.media_type === 'youtube') {
    const id = youtubeId(cover.url);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
  }
  return null;
}
