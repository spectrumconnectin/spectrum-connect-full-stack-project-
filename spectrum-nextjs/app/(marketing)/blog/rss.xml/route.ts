import { getPublishedPosts } from '@/lib/blog';

const BASE = 'https://spectrumconect.com';

// Rebuild the feed hourly.
export const revalidate = 3600;

function esc(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export async function GET() {
  const { posts } = await getPublishedPosts(50);
  const items = posts.map((p) => {
    const url = `${BASE}/blog/${p.slug}`;
    const date = new Date(p.published_at || p.created_at).toUTCString();
    return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${date}</pubDate>
      ${p.category ? `<category>${esc(p.category)}</category>` : ''}
      ${p.author?.name ? `<dc:creator>${esc(p.author.name)}</dc:creator>` : ''}
      <description>${esc(p.excerpt)}</description>
    </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Spectrum Connect Blog</title>
    <link>${BASE}/blog</link>
    <description>Guides, stories, and advice for creators and the clients who work with them.</description>
    <language>en-us</language>
    <atom:link href="${BASE}/blog/rss.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  });
}
