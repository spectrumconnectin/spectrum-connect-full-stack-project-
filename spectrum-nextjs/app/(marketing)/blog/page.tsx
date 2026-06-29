import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getPublishedPosts, formatPostDate, categoryClass, type BlogListItem } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Blog — Insights for Creative Professionals & Clients',
  description: 'Practical guides on freelance pricing, creative contracts, escrow payments, portfolio tips, and AI-powered matching — from the Spectrum Connect team.',
  openGraph: {
    title: 'Spectrum Connect Blog — Freelance & Creative Marketplace Insights',
    description: 'Expert advice on freelance pricing, creative briefs, escrow, portfolio tips, and building a sustainable creative career.',
    url: 'https://spectrumconect.com/blog',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Spectrum Connect Blog — Creative Career Insights',
    description: 'Practical guides on pricing, contracts, escrow, and portfolios.',
  },
  alternates: { canonical: 'https://spectrumconect.com/blog' },
};

// Revalidate the list every 60s so new posts appear quickly without a redeploy.
export const revalidate = 60;

function CoverCard({ post, featured }: { post: BlogListItem; featured?: boolean }) {
  const meta = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: featured ? 13 : 12, color: '#9ca3af', marginTop: featured ? 0 : 'auto', flexWrap: 'wrap' }}>
      <span style={{ fontWeight: 600, color: '#374151' }}>{post.author?.name || 'Spectrum Connect'}</span>
      <span>·</span><span>{formatPostDate(post.published_at || post.created_at)}</span>
      {post.stats?.read_time_minutes ? <><span>·</span><span>{post.stats.read_time_minutes} min read</span></> : null}
    </div>
  );
  return (
    <Link href={`/blog/${post.slug}`} className="group"
      style={{ textDecoration: 'none', borderRadius: featured ? 24 : 20, overflow: 'hidden', border: '1px solid #e5e7eb', background: '#fff',
        display: featured ? 'block' : 'flex', flexDirection: 'column', boxShadow: featured ? '0 4px 24px rgba(0,0,0,0.06)' : '0 2px 12px rgba(0,0,0,0.04)' }}>
      <div style={featured ? { display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 300 } : undefined}>
        {/* Cover */}
        <div style={{ height: featured ? 'auto' : 160, minHeight: featured ? 300 : 160, background: 'linear-gradient(135deg,#195ad7,#4178e7)',
          backgroundImage: post.cover_image ? `url(${post.cover_image})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {!post.cover_image && <i className="fa-solid fa-pen-nib" style={{ fontSize: featured ? 64 : 40, color: 'rgba(255,255,255,0.3)' }} />}
        </div>
        {/* Body */}
        <div style={{ padding: featured ? '40px 44px' : '24px 24px 20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: featured ? 'center' : undefined }}>
          {post.category && (
            <div style={{ marginBottom: featured ? 12 : 10 }}>
              <span className={categoryClass(post.category)} style={{ fontSize: featured ? 12 : 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>{post.category}</span>
            </div>
          )}
          <h3 style={{ fontSize: featured ? 'clamp(1.2rem,2.5vw,1.8rem)' : 17, fontWeight: featured ? 800 : 700, color: '#111827', lineHeight: 1.28, marginBottom: featured ? 12 : 8, flex: featured ? undefined : 1 }}>{post.title}</h3>
          <p style={{ fontSize: featured ? 15 : 14, color: '#6b7280', lineHeight: 1.65, marginBottom: featured ? 20 : 16 }}>{post.excerpt}</p>
          {meta}
        </div>
      </div>
    </Link>
  );
}

export default async function BlogPage() {
  const { posts } = await getPublishedPosts(50);
  const categories = ['All', ...Array.from(new Set(posts.map(p => p.category).filter(Boolean)))] as string[];
  const featured = posts.find(p => p.is_featured) || posts[0];
  const rest = posts.filter(p => p.slug !== featured?.slug);

  return (
    <div>
      <Nav />

      {/* Hero */}
      <section style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e3a6e 100%)', padding: '72px 24px 56px', textAlign: 'center' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 700, color: '#93c5fd', letterSpacing: '0.08em', marginBottom: 20 }}>
            SPECTRUM BLOG
          </div>
          <h1 style={{ fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 800, color: '#fff', lineHeight: 1.15, marginBottom: 16 }}>
            Insights for the creative economy
          </h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: 32 }}>
            Guides, stories, and advice for creators and the clients who work with them.
          </p>
          {posts.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {categories.map(c => (
                <span key={c} style={{ padding: '6px 14px', borderRadius: 20, background: c === 'All' ? '#195ad7' : 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 13, fontWeight: 600, border: '1px solid rgba(255,255,255,0.15)' }}>
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '56px 24px' }}>
        {posts.length === 0 ? (
          /* Empty state */
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <i className="fa-solid fa-feather-pointed" style={{ fontSize: 30, color: '#195ad7' }} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Stories are on the way</h2>
            <p style={{ fontSize: 15, color: '#6b7280', maxWidth: 420, margin: '0 auto' }}>
              We&apos;re writing our first posts on pricing, portfolios, escrow, and building a creative career. Check back soon.
            </p>
          </div>
        ) : (
          <>
            {featured && (
              <div style={{ marginBottom: 56 }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 24 }}>Featured</h2>
                <CoverCard post={featured} featured />
              </div>
            )}
            {rest.length > 0 && (
              <>
                <h2 style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 24 }}>Latest posts</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
                  {rest.map(post => <CoverCard key={post.slug} post={post} />)}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
