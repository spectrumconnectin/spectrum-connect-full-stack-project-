import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Link from 'next/link';
import type { Metadata } from 'next';
import ReadingProgress from '@/components/blog/ReadingProgress';
import ShareRow from '@/components/blog/ShareRow';
import { getPostBySlug, getPublishedPosts, formatPostDate, type BlogListItem } from '@/lib/blog';

const BASE = 'https://spectrumconect.com';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);
  if (!post) return { title: 'Post Not Found — Spectrum Connect' };
  const url = `${BASE}/blog/${params.slug}`;
  const title = post.seo?.meta_title || post.title;
  const description = post.seo?.meta_description || post.excerpt;
  const image = post.seo?.og_image || post.cover_image;
  return {
    title, description,
    authors: post.author?.name ? [{ name: post.author.name, url: `${BASE}/about` }] : undefined,
    openGraph: {
      title, description, url, type: 'article',
      publishedTime: post.published_at || post.created_at,
      authors: post.author?.name ? [post.author.name] : undefined,
      section: post.category, siteName: 'Spectrum Connect',
      images: image ? [{ url: image }] : undefined,
    },
    twitter: { card: 'summary_large_image', title, description, images: image ? [image] : undefined },
    alternates: { canonical: url },
  };
}

function Avatar({ name, url, size = 44 }: { name?: string; url?: string; size?: number }) {
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

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);

  if (!post) {
    return (
      <div>
        <Nav />
        <div style={{ maxWidth: 720, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#111827', marginBottom: 12 }}>Post not found</h1>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>This article doesn&apos;t exist or may have moved.</p>
          <Link href="/blog" style={{ display: 'inline-block', padding: '12px 24px', background: '#195ad7', color: '#fff', borderRadius: 12, fontWeight: 600, textDecoration: 'none' }}>Back to Blog</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const postUrl = `${BASE}/blog/${params.slug}`;
  const published = post.published_at || post.created_at;

  // Related: prefer same category, fall back to recent. Exclude the current post.
  const { posts: all } = await getPublishedPosts(50);
  const others = all.filter(p => p.slug !== post.slug);
  const sameCat = others.filter(p => p.category && p.category === post.category);
  const related: BlogListItem[] = [...sameCat, ...others.filter(p => !sameCat.includes(p))].slice(0, 3);

  const articleJsonLd = {
    '@context': 'https://schema.org', '@type': 'BlogPosting',
    headline: post.title, description: post.excerpt, url: postUrl, image: post.cover_image || undefined,
    datePublished: published, dateModified: post.updated_at || published,
    author: { '@type': 'Person', name: post.author?.name || 'Spectrum Connect', url: `${BASE}/about` },
    publisher: { '@type': 'Organization', name: 'Spectrum Connect', url: BASE, logo: { '@type': 'ImageObject', url: `${BASE}/assets/spectrum-logo.svg` } },
    mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl }, articleSection: post.category, inLanguage: 'en-US',
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: postUrl },
    ],
  };

  return (
    <div className="bg-white">
      <ReadingProgress />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Nav />

      <article>
        {/* Header */}
        <header className="max-w-[720px] mx-auto px-5 sm:px-6 pt-10 sm:pt-14">
          <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-cobalt transition mb-6">
            <i className="fa-solid fa-arrow-left" /> Back to Blog
          </Link>
          <div className="flex items-center gap-3 mb-4">
            {post.category && <span className="text-xs font-bold tracking-wide text-cobalt uppercase">{post.category}</span>}
            {post.stats?.read_time_minutes ? (
              <><span className="text-gray-300">·</span><span className="text-xs text-gray-400 flex items-center gap-1.5"><i className="fa-regular fa-clock" />{post.stats.read_time_minutes} min read</span></>
            ) : null}
          </div>
          <h1 className="text-3xl sm:text-[44px] font-extrabold text-gray-900 leading-[1.12] tracking-tight">{post.title}</h1>
          <p className="text-lg sm:text-xl text-gray-500 leading-relaxed mt-5">{post.excerpt}</p>

          {/* Author + share */}
          <div className="flex items-center justify-between gap-4 flex-wrap mt-8 pb-7 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Avatar name={post.author?.name} url={post.author?.avatar} />
              <div>
                <p className="text-sm font-bold text-gray-900">{post.author?.name || 'Spectrum Connect'}</p>
                <p className="text-xs text-gray-400">
                  {post.author?.bio ? `${post.author.bio} · ` : ''}{formatPostDate(published)}
                </p>
              </div>
            </div>
            <ShareRow url={postUrl} title={post.title} />
          </div>
        </header>

        {/* Cover */}
        {post.cover_image && (
          <div className="max-w-[860px] mx-auto px-5 sm:px-6 mt-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.cover_image} alt={post.title} className="w-full rounded-2xl border border-gray-100 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.18)] object-cover" style={{ maxHeight: 460 }} />
          </div>
        )}

        {/* Body */}
        <div className="max-w-[720px] mx-auto px-5 sm:px-6 pt-10 sm:pt-12 pb-12">
          <div className="blog-prose" dangerouslySetInnerHTML={{ __html: post.content }} />

          <hr className="my-10 border-gray-100" />

          {/* Author bio card */}
          <div className="flex items-start gap-4 bg-gray-50 rounded-2xl p-5 sm:p-6">
            <Avatar name={post.author?.name} url={post.author?.avatar} size={52} />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Written by</p>
              <p className="text-base font-bold text-gray-900 mt-0.5">{post.author?.name || 'Spectrum Connect'}</p>
              {post.author?.bio && <p className="text-sm text-gray-500 mt-1 leading-relaxed">{post.author.bio}</p>}
              <div className="mt-3"><ShareRow url={postUrl} title={post.title} /></div>
            </div>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="bg-gray-50/70 border-t border-gray-100">
            <div className="max-w-[1000px] mx-auto px-5 sm:px-6 py-14">
              <h2 className="text-lg font-extrabold text-gray-900 mb-6">Keep reading</h2>
              <div className="grid sm:grid-cols-3 gap-5">
                {related.map(p => (
                  <Link key={p.slug} href={`/blog/${p.slug}`} className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="h-32 bg-gradient-to-br from-cobalt to-blue-500"
                      style={p.cover_image ? { backgroundImage: `url(${p.cover_image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined} />
                    <div className="p-4">
                      {p.category && <p className="text-[11px] font-bold tracking-wide text-cobalt uppercase mb-1.5">{p.category}</p>}
                      <h3 className="text-sm font-bold text-gray-900 leading-snug group-hover:text-cobalt transition-colors line-clamp-2">{p.title}</h3>
                      <p className="text-xs text-gray-400 mt-2">{formatPostDate(p.published_at || p.created_at)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <div className="max-w-[720px] mx-auto px-5 sm:px-6 py-14">
          <div className="rounded-3xl text-center p-9 sm:p-10 border border-blue-100" style={{ background: 'linear-gradient(135deg,#eef4ff,#e0eaff)' }}>
            <h3 className="text-2xl font-extrabold text-gray-900 mb-2">Ready to put this into practice?</h3>
            <p className="text-gray-500 mb-6">Join the creators and clients building great work on Spectrum Connect.</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/signup" className="px-7 py-3 bg-cobalt text-white rounded-xl font-bold text-sm hover:bg-blue-700 active:scale-[0.98] transition">Get started free</Link>
              <Link href="/blog" className="px-7 py-3 bg-white text-gray-700 rounded-xl font-semibold text-sm border border-gray-200 hover:border-gray-300 transition">More articles</Link>
            </div>
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
}
