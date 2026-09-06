import { MetadataRoute } from 'next';
import { getPublishedPosts } from '@/lib/blog';
import { getPortfolioSitemapEntries } from '@/lib/portfolio';
import { HIRE_CATEGORIES } from '@/lib/hireCategories';

const BASE = 'https://spectrumconect.com';

// Render on every request so newly-published posts always appear. A statically
// cached sitemap generated before posts existed would hide them from crawlers.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE}/login`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.6,
    },
    {
      url: `${BASE}/signup`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.7,
    },
    {
      url: `${BASE}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE}/pricing`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${BASE}/how-it-works`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE}/portfolios`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE}/hire`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${BASE}/community`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE}/blog`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE}/help`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE}/cookies`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${BASE}/gdpr`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${BASE}/dmca`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${BASE}/refunds`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ];

  // Real published posts, fetched live from the blog API.
  const { posts } = await getPublishedPosts(100); // backend caps limit at 100
  const blogPages: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: p.published_at ? new Date(p.published_at) : (p.created_at ? new Date(p.created_at) : now),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // Public creator portfolios + their individual project case-study pages — the
  // platform's largest surface of unique, indexable content. The handle matches
  // each portfolio page's own canonical URL, so sitemap and canonical agree.
  const portfolios = await getPortfolioSitemapEntries();
  const portfolioPages: MetadataRoute.Sitemap = portfolios.flatMap((pf) => {
    const handle = encodeURIComponent(pf.handle);
    const pfMod = pf.updated_at ? new Date(pf.updated_at) : now;
    return [
      {
        url: `${BASE}/portfolio/${handle}`,
        lastModified: pfMod,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      },
      ...pf.projects.map((pr) => ({
        url: `${BASE}/portfolio/${handle}/${encodeURIComponent(pr.slug)}`,
        lastModified: pr.updated_at ? new Date(pr.updated_at) : pfMod,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      })),
    ];
  });

  // Client-intent "hire a {category}" landing pages.
  const hirePages: MetadataRoute.Sitemap = HIRE_CATEGORIES.map((c) => ({
    url: `${BASE}/hire/${c.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...hirePages, ...blogPages, ...portfolioPages];
}
