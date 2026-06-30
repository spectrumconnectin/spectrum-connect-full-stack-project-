import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Link from 'next/link';
import type { Metadata } from 'next';
import DigestSignup from '@/components/blog/DigestSignup';
import { getPublishedPosts, formatPostDate, type BlogListItem } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Blog & Insights — Ideas for Creative Professionals',
  description: 'Guides, stories, and advice for creators and the clients who work with them — freelancing, portfolios, escrow payments, client management, and more.',
  openGraph: {
    title: 'Spectrum Connect Blog & Insights',
    description: 'Guides, stories, and advice for creators and the clients who work with them.',
    url: 'https://spectrumconect.com/blog',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'Spectrum Connect Blog & Insights', description: 'Ideas, guides, and stories for creative professionals.' },
  alternates: {
    canonical: 'https://spectrumconect.com/blog',
    types: { 'application/rss+xml': [{ url: '/blog/rss.xml', title: 'Spectrum Connect Blog' }] },
  },
};

export const revalidate = 60;

// Editorial category set shown as filter tabs + topic chips.
const CATEGORIES = [
  'Freelancing', 'Creator Economy', 'Portfolio Tips', 'Client Management',
  'Escrow & Payments', 'Productivity', 'Remote Work', 'Industry Insights',
];
const TOPICS = [...CATEGORIES, 'ETF / Trust System'];

function Avatar({ name, url, size = 28 }: { name?: string; url?: string; size?: number }) {
  const s = { width: size, height: size };
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name || ''} style={s} className="rounded-full object-cover border border-gray-200 flex-shrink-0" />;
  }
  return (
    <div style={s} className="rounded-full bg-blue-100 text-cobalt font-bold flex items-center justify-center flex-shrink-0" >
      <span style={{ fontSize: size * 0.4 }}>{(name || '?')[0]?.toUpperCase()}</span>
    </div>
  );
}

function MetaRow({ post, className = '' }: { post: BlogListItem; className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Avatar name={post.author?.name} url={post.author?.avatar} />
      <span className="text-sm font-semibold text-gray-700">{post.author?.name || 'Spectrum Connect'}</span>
      <span className="text-gray-300">·</span>
      <span className="text-sm text-gray-400">{formatPostDate(post.published_at || post.created_at)}</span>
    </div>
  );
}

export default async function BlogPage({ searchParams }: { searchParams: { category?: string } }) {
  const { posts: allPosts } = await getPublishedPosts(100);
  const activeCat = searchParams?.category || '';
  const posts = activeCat
    ? allPosts.filter(p => (p.category || '').toLowerCase() === activeCat.toLowerCase())
    : allPosts;

  const featured = posts.find(p => p.is_featured) || posts[0];
  const rest = posts.filter(p => p.slug !== featured?.slug);

  // Sidebar: trending (most-viewed, fallback recent), and authors derived from posts.
  const trending = [...allPosts]
    .sort((a, b) => (b.stats?.views ?? 0) - (a.stats?.views ?? 0))
    .slice(0, 3);
  const authorMap = new Map<string, { name: string; bio?: string; avatar?: string; count: number }>();
  for (const p of allPosts) {
    const n = p.author?.name; if (!n) continue;
    const cur = authorMap.get(n) || { name: n, bio: p.author?.bio, avatar: p.author?.avatar, count: 0 };
    cur.count++; authorMap.set(n, cur);
  }
  const authors = Array.from(authorMap.values()).sort((a, b) => b.count - a.count).slice(0, 3);

  const blogJsonLd = {
    '@context': 'https://schema.org', '@type': 'Blog',
    name: 'Spectrum Connect Blog', url: 'https://spectrumconect.com/blog',
    description: 'Guides, stories, and advice for creators and the clients who work with them.',
    publisher: { '@type': 'Organization', name: 'Spectrum Connect', url: 'https://spectrumconect.com' },
    blogPost: allPosts.slice(0, 20).map(p => ({
      '@type': 'BlogPosting', headline: p.title, description: p.excerpt,
      url: `https://spectrumconect.com/blog/${p.slug}`, image: p.cover_image || undefined,
      datePublished: p.published_at || p.created_at,
      author: { '@type': 'Person', name: p.author?.name || 'Spectrum Connect' },
    })),
  };

  return (
    <div className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }} />
      <Nav />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold tracking-widest text-gray-400 uppercase mb-2">
              <i className="fa-solid fa-newspaper text-cobalt" /> Spectrum Connect <span className="text-gray-300">·</span> Blog
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Blog &amp; Insights</h1>
            <p className="text-gray-500 mt-2">Ideas, guides, and stories for creative professionals.</p>
          </div>
          <a href="#digest" className="inline-flex items-center gap-2 bg-cobalt text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 active:scale-[0.98] transition shadow-sm">
            <i className="fa-regular fa-envelope" /> Subscribe
          </a>
        </div>

        {/* Category tabs */}
        <nav className="mt-8 border-b border-gray-200 flex items-center gap-5 sm:gap-7 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {['All', ...CATEGORIES].map(cat => {
            const isAll = cat === 'All';
            const active = isAll ? !activeCat : activeCat.toLowerCase() === cat.toLowerCase();
            const href = isAll ? '/blog' : `/blog?category=${encodeURIComponent(cat)}`;
            return (
              <Link key={cat} href={href}
                className={`relative whitespace-nowrap pb-3 text-sm font-semibold transition-colors ${active ? 'text-cobalt' : 'text-gray-500 hover:text-gray-800'}`}>
                {cat}
                {active && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-cobalt rounded-full" />}
              </Link>
            );
          })}
        </nav>

        {posts.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-5">
              <i className="fa-solid fa-feather-pointed text-cobalt text-2xl" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {activeCat ? `No posts in “${activeCat}” yet` : 'Stories are on the way'}
            </h2>
            <p className="text-gray-500 max-w-md mx-auto">
              {activeCat ? <>Try another topic or <Link href="/blog" className="text-cobalt font-semibold hover:underline">view all posts</Link>.</>
                : 'We’re writing our first posts on pricing, portfolios, escrow, and building a creative career. Check back soon.'}
            </p>
          </div>
        ) : (
          <div className="mt-8 grid lg:grid-cols-3 gap-8">
            {/* Main column */}
            <div className="lg:col-span-2 space-y-10">
              {/* Featured */}
              {featured && (
                <Link href={`/blog/${featured.slug}`} className="group block rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="grid sm:grid-cols-2">
                    <div className="relative h-48 sm:h-auto sm:min-h-[240px] bg-gradient-to-br from-cobalt to-blue-500"
                      style={featured.cover_image ? { backgroundImage: `url(${featured.cover_image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined} />
                    <div className="p-6 sm:p-7 flex flex-col">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-cobalt bg-blue-50 px-2.5 py-1 rounded-lg"><i className="fa-solid fa-star text-[10px]" /> Featured</span>
                        {featured.category && <span className="text-xs font-bold tracking-wide text-gray-400 uppercase">{featured.category}</span>}
                      </div>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-snug group-hover:text-cobalt transition-colors">{featured.title}</h2>
                      <p className="text-gray-500 mt-3 leading-relaxed line-clamp-3">{featured.excerpt}</p>
                      <div className="mt-auto pt-6 flex items-center justify-between">
                        <MetaRow post={featured} />
                        <span className="flex items-center gap-3 text-gray-400 text-sm">
                          {featured.stats?.read_time_minutes ? <span className="flex items-center gap-1.5"><i className="fa-regular fa-clock" />{featured.stats.read_time_minutes} min</span> : null}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {/* Latest */}
              {rest.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-extrabold text-gray-900">Latest Stories</h2>
                  </div>
                  <div className="divide-y divide-gray-100 border-y border-gray-100">
                    {rest.map(post => (
                      <Link key={post.slug} href={`/blog/${post.slug}`} className="group flex gap-5 py-5 px-3 -mx-3 rounded-2xl items-start hover:bg-gray-50/70 transition-colors">
                        <div className="w-24 h-24 sm:w-28 sm:h-20 rounded-xl flex-shrink-0 bg-gradient-to-br from-cobalt to-blue-500"
                          style={post.cover_image ? { backgroundImage: `url(${post.cover_image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            {post.category && <span className="text-xs font-bold tracking-wide text-cobalt uppercase">{post.category}</span>}
                            {post.stats?.read_time_minutes ? <><span className="text-gray-300 text-xs">·</span><span className="text-xs text-gray-400 flex items-center gap-1"><i className="fa-regular fa-clock" />{post.stats.read_time_minutes} min</span></> : null}
                          </div>
                          <h3 className="font-bold text-gray-900 leading-snug group-hover:text-cobalt transition-colors">{post.title}</h3>
                          <p className="text-sm text-gray-500 mt-1 leading-relaxed line-clamp-2">{post.excerpt}</p>
                          <MetaRow post={post} className="mt-3" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* Trending */}
              {trending.length > 0 && (
                <div className="rounded-2xl border border-gray-200 p-5">
                  <p className="flex items-center gap-2 text-xs font-bold tracking-widest text-gray-400 uppercase mb-4"><i className="fa-solid fa-arrow-trend-up text-cobalt" /> Trending now</p>
                  <ol className="space-y-4">
                    {trending.map((p, i) => (
                      <li key={p.slug}>
                        <Link href={`/blog/${p.slug}`} className="group flex gap-3 items-start">
                          <span className={`text-lg font-extrabold tabular-nums ${i === 0 ? 'text-cobalt' : 'text-gray-300'}`}>{String(i + 1).padStart(2, '0')}</span>
                          <span className="text-sm font-semibold text-gray-800 leading-snug group-hover:text-cobalt transition-colors">{p.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Browse topics */}
              <div className="rounded-2xl border border-gray-200 p-5">
                <p className="flex items-center gap-2 text-xs font-bold tracking-widest text-gray-400 uppercase mb-4"><i className="fa-solid fa-tags text-cobalt" /> Browse topics</p>
                <div className="flex flex-wrap gap-2">
                  {TOPICS.map(t => (
                    <Link key={t} href={`/blog?category=${encodeURIComponent(t)}`}
                      className="text-xs font-semibold text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:border-cobalt hover:text-cobalt transition">{t}</Link>
                  ))}
                </div>
              </div>

              {/* Digest */}
              <DigestSignup />

              {/* Featured authors */}
              {authors.length > 0 && (
                <div className="rounded-2xl border border-gray-200 p-5">
                  <p className="flex items-center gap-2 text-xs font-bold tracking-widest text-gray-400 uppercase mb-4"><i className="fa-solid fa-feather text-cobalt" /> Featured authors</p>
                  <div className="space-y-4">
                    {authors.map(a => (
                      <div key={a.name} className="flex items-center gap-3">
                        <Avatar name={a.name} url={a.avatar} size={36} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-900 truncate">{a.name}</p>
                          {a.bio && <p className="text-xs text-gray-400 truncate">{a.bio}</p>}
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">{a.count} post{a.count !== 1 ? 's' : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Collaborate CTA */}
              <div className="rounded-2xl border border-gray-200 p-6 text-center">
                <i className="fa-solid fa-share-nodes text-cobalt text-xl" />
                <p className="font-bold text-gray-900 mt-2">Ready to collaborate?</p>
                <p className="text-sm text-gray-500 mt-1 mb-4">Find creators and start your next project on Spectrum Connect.</p>
                <Link href="/signup" className="inline-flex items-center gap-2 bg-cobalt text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 active:scale-[0.98] transition">
                  Go to Platform
                </Link>
              </div>
            </aside>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
