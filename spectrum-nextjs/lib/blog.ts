/**
 * Server-side blog data access for the marketing blog pages.
 * Fetches directly from the backend origin (server-to-server) so the pages can
 * render with SEO + ISR. Never import this into a client component.
 */

const API = process.env.BACKEND_ORIGIN
  || 'http://spectrum-connect-single.ap-south-1.elasticbeanstalk.com';

export interface BlogAuthor { name?: string; avatar?: string; bio?: string }
export interface BlogStats { views?: number; likes?: number; comments_count?: number; read_time_minutes?: number }

export interface BlogListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_image?: string;
  author?: BlogAuthor;
  category?: string;
  tags?: string[];
  is_featured?: boolean;
  stats?: BlogStats;
  published_at?: string;
  created_at: string;
}

export interface BlogPostDetail extends BlogListItem {
  content: string;
  seo?: { meta_title?: string; meta_description?: string; keywords?: string[]; og_image?: string } | null;
  updated_at?: string;
}

export async function getPublishedPosts(limit = 50): Promise<{ posts: BlogListItem[]; total: number }> {
  try {
    const res = await fetch(`${API}/blog/posts?status=published&limit=${limit}`, { next: { revalidate: 60 } });
    if (!res.ok) return { posts: [], total: 0 };
    const data = await res.json();
    return { posts: data.posts ?? [], total: data.total ?? 0 };
  } catch {
    return { posts: [], total: 0 };
  }
}

export async function getPostBySlug(slug: string): Promise<BlogPostDetail | null> {
  try {
    const res = await fetch(`${API}/blog/posts/${encodeURIComponent(slug)}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function formatPostDate(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return ''; }
}

// Deterministic category pill colour from a small palette.
const CATEGORY_CLASSES = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-green-100 text-green-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-cyan-100 text-cyan-700',
];
export function categoryClass(category?: string): string {
  if (!category) return CATEGORY_CLASSES[0];
  let h = 0;
  for (let i = 0; i < category.length; i++) h = (h * 31 + category.charCodeAt(i)) >>> 0;
  return CATEGORY_CLASSES[h % CATEGORY_CLASSES.length];
}
