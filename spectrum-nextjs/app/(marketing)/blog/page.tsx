import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Link from 'next/link';
import type { Metadata } from 'next';
import DigestSignup from '@/components/blog/DigestSignup';
import { getPublishedPosts, formatPostDate, formatViews, categoryClass, type BlogListItem } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Insights for Creators & Collaborators — Spectrum Connect',
  description: 'Stories, guides, and ideas to help you work better, build stronger teams, and grow your creative career — freelancing, collaboration, portfolios, payments, and more.',
  openGraph: {
    title: 'Spectrum Connect — Insights for Creators & Collaborators',
    description: 'Stories, guides, and ideas to help you work better and grow your creative career.',
    url: 'https://spectrumconect.com/blog',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'Spectrum Connect Journal', description: 'Insights for creators and collaborators.' },
  alternates: {
    canonical: 'https://spectrumconect.com/blog',
    types: { 'application/rss+xml': [{ url: '/blog/rss.xml', title: 'Spectrum Connect Blog' }] },
  },
};

export const revalidate = 60;

const PAGE_SIZE = 6;

function Avatar({ name, url, size = 28 }: { name?: string; url?: string; size?: number }) {
  const s = { width: size, height: size };
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name || ''} style={s} className="rounded-full object-cover border border-gray-200 flex-shrink-0" />;
  }
  return (
    <div style={s} className="rounded-full bg-blue-100 text-cobalt font-bold flex items-center justify-center flex-shrink-0">
      <span style={{ fontSize: size * 0.4 }}>{(name || '?')[0]?.toUpperCase()}</span>
    </div>
  );
}

function MetaRow({ post, className = '' }: { post: BlogListItem; className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Avatar name={post.author?.name} url={post.author?.avatar} />
      <span className="text-sm font-semibold text-gray-700 truncate">{post.author?.name || 'Spectrum Connect'}</span>
      <span className="text-gray-300">·</span>
      <span className="text-sm text-gray-400 whitespace-nowrap">{formatPostDate(post.published_at || post.created_at)}</span>
    </div>
  );
}

function CategoryBadge({ category }: { category?: string }) {
  if (!category) return null;
  return <span className={`text-[11px] font-bold tracking-wide uppercase px-2.5 py-1 rounded-md ${categoryClass(category)}`}>{category}</span>;
}

function ReadTime({ post }: { post: BlogListItem }) {
  if (!post.stats?.read_time_minutes) return null;
  return <span className="text-xs text-gray-400 flex items-center gap-1.5"><i className="fa-regular fa-clock" />{post.stats.read_time_minutes} min read</span>;
}

function Views({ post }: { post: BlogListItem }) {
  const v = post.stats?.views ?? 0;
  if (v <= 0) return null;
  return <span className="text-xs text-gray-400 flex items-center gap-1.5"><i className="fa-regular fa-eye" />{formatViews(v)}</span>;
}

/** Grid article card (image top, body below). */
function ArticleCard({ post }: { post: BlogListItem }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group flex flex-col min-w-0 rounded-2xl border border-gray-200 overflow-hidden bg-white hover:shadow-xl hover:-translate-y-0.5 transition-all">
      <div className="h-44 bg-gradient-to-br from-cobalt to-blue-500"
        style={post.cover_image ? { backgroundImage: `url(${post.cover_image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined} />
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-2.5 mb-2.5 flex-wrap">
          <CategoryBadge category={post.category} />
          <ReadTime post={post} />
          <Views post={post} />
        </div>
        <h3 className="font-extrabold text-gray-900 leading-snug group-hover:text-cobalt transition-colors line-clamp-2">{post.title}</h3>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed line-clamp-2">{post.excerpt}</p>
        <div className="mt-auto pt-4 flex items-center justify-between gap-3">
          <MetaRow post={post} className="min-w-0" />
          <span className="text-sm font-bold text-cobalt flex items-center gap-1 whitespace-nowrap">Read <i className="fa-solid fa-arrow-right text-xs group-hover:translate-x-0.5 transition-transform" /></span>
        </div>
      </div>
    </Link>
  );
}

export default async function BlogPage({ searchParams }: { searchParams: { category?: string; q?: string; page?: string } }) {
  const { posts: allPosts, total } = await getPublishedPosts(100);
  const activeCat = (searchParams?.category || '').trim();
  const q = (searchParams?.q || '').trim();
  const page = Math.max(1, parseInt(searchParams?.page || '1', 10) || 1);

  // Filter by category + free-text search across title/excerpt/category/tags.
  const ql = q.toLowerCase();
  const filtered = allPosts.filter(p => {
    if (activeCat && (p.category || '').toLowerCase() !== activeCat.toLowerCase()) return false;
    if (ql) {
      const hay = [p.title, p.excerpt, p.category, ...(p.tags || [])].join(' ').toLowerCase();
      if (!hay.includes(ql)) return false;
    }
    return true;
  });

  const featured = filtered.find(p => p.is_featured) || filtered[0];
  const rest = filtered.filter(p => p.slug !== featured?.slug);
  const totalPages = Math.max(1, Math.ceil(rest.length / PAGE_SIZE));
  const pageItems = rest.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Real categories actually used by published posts (de-duped, A→Z).
  const categories = Array.from(
    new Set(allPosts.map(p => (p.category || '').trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  // Sidebar: popular (most-viewed, fallback recent), authors, editor's picks.
  const popular = [...allPosts].sort((a, b) => (b.stats?.views ?? 0) - (a.stats?.views ?? 0)).slice(0, 4);
  const authorMap = new Map<string, { name: string; bio?: string; avatar?: string; count: number }>();
  for (const p of allPosts) {
    const n = p.author?.name; if (!n) continue;
    const cur = authorMap.get(n) || { name: n, bio: p.author?.bio, avatar: p.author?.avatar, count: 0 };
    cur.count++; authorMap.set(n, cur);
  }
  const authors = Array.from(authorMap.values()).sort((a, b) => b.count - a.count).slice(0, 3);
  const editorsPicks = [...allPosts]
    .filter(p => p.slug !== featured?.slug)
    .sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0))
    .slice(0, 3);

  // Query-string builder that preserves category + q while changing page.
  const qs = (over: { category?: string | null; q?: string | null; page?: string }) => {
    const sp = new URLSearchParams();
    const cat = over.category === null ? '' : (over.category ?? activeCat);
    const query = over.q === null ? '' : (over.q ?? q);
    if (cat) sp.set('category', cat);
    if (query) sp.set('q', query);
    if (over.page && over.page !== '1') sp.set('page', over.page);
    const s = sp.toString();
    return s ? `/blog?${s}` : '/blog';
  };

  const blogJsonLd = {
    '@context': 'https://schema.org', '@type': 'Blog',
    name: 'Spectrum Connect Blog', url: 'https://spectrumconect.com/blog',
    description: 'Stories, guides, and ideas for creators and collaborators.',
    publisher: { '@type': 'Organization', name: 'Spectrum Connect', url: 'https://spectrumconect.com' },
    blogPost: allPosts.slice(0, 20).map(p => ({
      '@type': 'BlogPosting', headline: p.title, description: p.excerpt,
      url: `https://spectrumconect.com/blog/${p.slug}`, image: p.cover_image || undefined,
      datePublished: p.published_at || p.created_at,
      author: { '@type': 'Person', name: p.author?.name || 'Spectrum Connect' },
    })),
  };
  const itemListJsonLd = {
    '@context': 'https://schema.org', '@type': 'ItemList',
    itemListElement: allPosts.slice(0, 20).map((p, i) => ({
      '@type': 'ListItem', position: i + 1, url: `https://spectrumconect.com/blog/${p.slug}`, name: p.title,
    })),
  };

  return (
    <div className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <Nav />

      {/* Hero */}
      <header className="relative overflow-hidden text-white" style={{ background: 'linear-gradient(135deg,#1d4ed8 0%,#4f46e5 55%,#6d28d9 100%)' }}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #ffffff55, transparent 45%), radial-gradient(circle at 80% 0%, #ffffff33, transparent 40%)' }} />
        <div className="relative max-w-3xl mx-auto px-5 sm:px-6 py-16 sm:py-20 text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold leading-[1.1] tracking-tight">Insights for Creators &amp; Collaborators</h1>
          <p className="text-base sm:text-lg text-blue-100 mt-4 max-w-2xl mx-auto leading-relaxed">
            Stories, guides, and ideas to help you work better, build stronger teams, and grow your creative career.
          </p>
          <form action="/blog" method="get" className="mt-8 max-w-xl mx-auto flex gap-2">
            {activeCat && <input type="hidden" name="category" value={activeCat} />}
            <div className="relative flex-1">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input name="q" defaultValue={q} placeholder="Search articles…"
                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white text-gray-800 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-white/60 shadow-lg" />
            </div>
            <button type="submit" className="px-6 py-3.5 rounded-xl bg-gray-900 text-white font-bold text-sm hover:bg-black active:scale-[0.98] transition shadow-lg">Search</button>
          </form>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Category pills */}
        {categories.length > 0 && (
          <nav className="flex items-center gap-2.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-center">
            {['All Posts', ...categories].map(cat => {
              const isAll = cat === 'All Posts';
              const active = isAll ? !activeCat : activeCat.toLowerCase() === cat.toLowerCase();
              const href = qs({ category: isAll ? null : cat, page: '1' });
              return (
                <Link key={cat} href={href}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold border transition ${
                    active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900'
                  }`}>
                  {cat}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Active search/filter notice */}
        {(q || activeCat) && (
          <div className="mt-6 flex items-center justify-center gap-3 text-sm text-gray-500">
            <span>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              {q && <> for “<span className="font-semibold text-gray-800">{q}</span>”</>}
              {activeCat && <> in <span className="font-semibold text-gray-800">{activeCat}</span></>}
            </span>
            <Link href="/blog" className="text-cobalt font-semibold hover:underline">Clear</Link>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-5">
              <i className="fa-solid fa-feather-pointed text-cobalt text-2xl" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {q || activeCat ? 'No matching articles' : 'Stories are on the way'}
            </h2>
            <p className="text-gray-500 max-w-md mx-auto">
              {q || activeCat
                ? <>Try a different search or <Link href="/blog" className="text-cobalt font-semibold hover:underline">view all posts</Link>.</>
                : 'We’re writing our first posts on collaboration, freelancing, portfolios, and building a creative career. Check back soon.'}
            </p>
          </div>
        ) : (
          <>
            {/* Featured story */}
            {featured && (
              <div className="mt-10">
                <p className="flex items-center gap-2 text-xs font-bold tracking-widest text-gray-400 uppercase mb-4">
                  <span className="w-6 h-px bg-gray-300" /> Featured Story
                </p>
                <Link href={`/blog/${featured.slug}`} className="group block rounded-3xl border border-gray-200 overflow-hidden hover:shadow-2xl transition-shadow bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="relative h-52 sm:h-56 md:h-auto md:min-h-[320px] bg-gradient-to-br from-cobalt to-blue-500"
                      style={featured.cover_image ? { backgroundImage: `url(${featured.cover_image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined} />
                    <div className="p-6 sm:p-9 flex flex-col min-w-0">
                      <div className="flex items-center gap-3 mb-4 flex-wrap">
                        <CategoryBadge category={featured.category} />
                        <ReadTime post={featured} />
                        <Views post={featured} />
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight group-hover:text-cobalt transition-colors">{featured.title}</h2>
                      <p className="text-gray-500 mt-4 leading-relaxed line-clamp-3">{featured.excerpt}</p>
                      <div className="mt-auto pt-7 flex items-center justify-between gap-3 flex-wrap">
                        <MetaRow post={featured} />
                        <span className="text-sm font-bold text-cobalt flex items-center gap-1.5">Read Article <i className="fa-solid fa-arrow-right text-xs group-hover:translate-x-0.5 transition-transform" /></span>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            )}

            {/* Latest + sidebar */}
            <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-10">
              {/* Latest articles */}
              <div className="lg:col-span-2 min-w-0">
                <div className="flex items-end justify-between mb-6">
                  <h2 className="flex items-center gap-2 text-xs font-bold tracking-widest text-gray-400 uppercase">
                    <span className="w-6 h-px bg-gray-300" /> Latest Articles
                  </h2>
                  <span className="text-xs text-gray-400">Showing {pageItems.length} of {rest.length}</span>
                </div>

                {pageItems.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {pageItems.map(post => <ArticleCard key={post.slug} post={post} />)}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 py-10 text-center">That’s everything for now.</p>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center flex-wrap gap-1.5 mt-10">
                    <Link href={qs({ page: String(Math.max(1, page - 1)) })} aria-disabled={page === 1}
                      className={`w-11 h-11 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center border text-sm transition ${page === 1 ? 'border-gray-100 text-gray-300 pointer-events-none' : 'border-gray-200 text-gray-600 hover:border-cobalt hover:text-cobalt'}`}>
                      <i className="fa-solid fa-chevron-left text-xs" />
                    </Link>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                      <Link key={n} href={qs({ page: String(n) })}
                        className={`min-w-11 h-11 sm:min-w-9 sm:h-9 px-3 rounded-lg flex items-center justify-center border text-sm font-semibold transition ${
                          n === page ? 'bg-cobalt text-white border-cobalt' : 'border-gray-200 text-gray-600 hover:border-cobalt hover:text-cobalt'
                        }`}>
                        {n}
                      </Link>
                    ))}
                    <Link href={qs({ page: String(Math.min(totalPages, page + 1)) })} aria-disabled={page === totalPages}
                      className={`w-11 h-11 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center border text-sm transition ${page === totalPages ? 'border-gray-100 text-gray-300 pointer-events-none' : 'border-gray-200 text-gray-600 hover:border-cobalt hover:text-cobalt'}`}>
                      <i className="fa-solid fa-chevron-right text-xs" />
                    </Link>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <aside className="space-y-6">
                {/* Stay in the loop */}
                <DigestSignup />

                {/* Popular this week */}
                {popular.length > 0 && (
                  <div className="rounded-2xl border border-gray-200 p-5">
                    <p className="flex items-center gap-2 text-xs font-bold tracking-widest text-gray-400 uppercase mb-4"><i className="fa-solid fa-fire text-cobalt" /> Popular This Week</p>
                    <ol className="space-y-4">
                      {popular.map((p, i) => (
                        <li key={p.slug}>
                          <Link href={`/blog/${p.slug}`} className="group flex gap-3 items-center">
                            <span className={`text-base font-extrabold tabular-nums w-5 flex-shrink-0 ${i === 0 ? 'text-cobalt' : 'text-gray-300'}`}>{i + 1}</span>
                            <div className="w-12 h-12 rounded-lg flex-shrink-0 bg-gradient-to-br from-cobalt to-blue-500"
                              style={p.cover_image ? { backgroundImage: `url(${p.cover_image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined} />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 group-hover:text-cobalt transition-colors">{p.title}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{formatPostDate(p.published_at || p.created_at)}</p>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Browse by topics */}
                {categories.length > 0 && (
                  <div className="rounded-2xl border border-gray-200 p-5">
                    <p className="flex items-center gap-2 text-xs font-bold tracking-widest text-gray-400 uppercase mb-4"><i className="fa-solid fa-tags text-cobalt" /> Browse by Topics</p>
                    <div className="flex flex-wrap gap-2">
                      {categories.map(t => (
                        <Link key={t} href={qs({ category: t, q: null, page: '1' })}
                          className="text-xs font-semibold text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:border-cobalt hover:text-cobalt transition">{t}</Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Meet the authors */}
                {authors.length > 0 && (
                  <div className="rounded-2xl border border-gray-200 p-5">
                    <p className="flex items-center gap-2 text-xs font-bold tracking-widest text-gray-400 uppercase mb-4"><i className="fa-solid fa-feather text-cobalt" /> Meet the Authors</p>
                    <div className="space-y-4">
                      {authors.map(a => (
                        <div key={a.name} className="flex items-center gap-3">
                          <Avatar name={a.name} url={a.avatar} size={40} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-900 truncate">{a.name}</p>
                            <p className="text-xs text-gray-400 truncate">{a.bio || `${a.count} article${a.count !== 1 ? 's' : ''}`}</p>
                          </div>
                          <Link href="/signup" className="text-xs font-bold text-cobalt border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition flex-shrink-0">Follow</Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Collaborate CTA */}
                <div className="rounded-2xl p-6 text-center border border-blue-100" style={{ background: 'linear-gradient(135deg,#eef4ff,#e0eaff)' }}>
                  <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <i className="fa-solid fa-share-nodes text-cobalt" />
                  </div>
                  <p className="font-extrabold text-gray-900">Ready to start collaborating?</p>
                  <p className="text-sm text-gray-500 mt-1 mb-4">Join thousands of verified creators and clients on Spectrum Connect.</p>
                  <Link href="/signup" className="inline-flex items-center gap-2 bg-cobalt text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 active:scale-[0.98] transition">
                    Get Started Free
                  </Link>
                </div>
              </aside>
            </div>

            {/* Editor's picks */}
            {allPosts.length > 3 && editorsPicks.length > 0 && (
              <div className="mt-16">
                <div className="flex items-end justify-between mb-6">
                  <h2 className="flex items-center gap-2 text-xs font-bold tracking-widest text-gray-400 uppercase">
                    <span className="w-6 h-px bg-gray-300" /> Editor’s Picks
                  </h2>
                  <Link href="/blog" className="text-sm font-semibold text-cobalt hover:underline flex items-center gap-1">View all <i className="fa-solid fa-arrow-right text-xs" /></Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {editorsPicks.map(p => <ArticleCard key={p.slug} post={p} />)}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Bottom CTA band */}
      <section className="relative overflow-hidden text-white" style={{ background: 'linear-gradient(135deg,#1d4ed8 0%,#4f46e5 55%,#6d28d9 100%)' }}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #ffffff55, transparent 45%), radial-gradient(circle at 10% 90%, #ffffff33, transparent 40%)' }} />
        <div className="relative max-w-3xl mx-auto px-0 sm:px-6 py-14 sm:py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mx-auto mb-5">
            <i className="fa-solid fa-users text-white text-lg" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">Join a Platform Built for Better Work</h2>
          <p className="text-blue-100 mt-3 max-w-xl mx-auto leading-relaxed">
            Connect with verified creators, build your team, and collaborate on work that actually matters.
          </p>
          <div className="mt-7 flex gap-3 justify-center flex-wrap">
            <Link href="/signup" className="px-7 py-3 bg-white text-cobalt rounded-xl font-bold text-sm hover:bg-blue-50 active:scale-[0.98] transition shadow-lg">Get Started Free</Link>
            <Link href="/blog" className="px-7 py-3 bg-white/10 text-white border border-white/30 rounded-xl font-semibold text-sm hover:bg-white/20 transition">Browse All Articles</Link>
          </div>
          <p className="text-xs text-blue-200 mt-5">Free to join · No credit card required</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
