import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getPostBySlug, formatPostDate } from '@/lib/blog';

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
    title,
    description,
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

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);

  if (!post) {
    return (
      <div>
        <Nav />
        <div style={{ maxWidth: 720, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#111827', marginBottom: 12 }}>Post not found</h1>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>This article doesn&apos;t exist or may have moved.</p>
          <Link href="/blog" style={{ display: 'inline-block', padding: '12px 24px', background: '#195ad7', color: '#fff', borderRadius: 12, fontWeight: 600, textDecoration: 'none' }}>
            Back to Blog
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const postUrl = `${BASE}/blog/${params.slug}`;
  const published = post.published_at || post.created_at;

  const articleJsonLd = {
    '@context': 'https://schema.org', '@type': 'BlogPosting',
    headline: post.title, description: post.excerpt, url: postUrl,
    image: post.cover_image || undefined,
    datePublished: published, dateModified: post.updated_at || published,
    author: { '@type': 'Person', name: post.author?.name || 'Spectrum Connect', url: `${BASE}/about` },
    publisher: { '@type': 'Organization', name: 'Spectrum Connect', url: BASE, logo: { '@type': 'ImageObject', url: `${BASE}/assets/spectrum-logo.svg` } },
    mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
    articleSection: post.category, inLanguage: 'en-US',
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
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Nav />

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#0f172a,#1e3a6e)', padding: '56px 24px 48px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <Link href="/blog" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 14, fontWeight: 500, marginBottom: 24 }}>
            <i className="fa-solid fa-arrow-left"></i> Back to Blog
          </Link>
          {post.category && (
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.1)', color: '#93c5fd' }}>{post.category}</span>
            </div>
          )}
          <h1 style={{ fontSize: 'clamp(1.5rem,4vw,2.5rem)', fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 16 }}>{post.title}</h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 24 }}>{post.excerpt}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'rgba(255,255,255,0.5)', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{post.author?.name || 'Spectrum Connect'}</span>
            <span>·</span><span>{formatPostDate(published)}</span>
            {post.stats?.read_time_minutes ? <><span>·</span><span>{post.stats.read_time_minutes} min read</span></> : null}
          </div>
        </div>
      </div>

      {/* Cover image */}
      {post.cover_image && (
        <div style={{ maxWidth: 860, margin: '-28px auto 0', padding: '0 24px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.cover_image} alt={post.title} style={{ width: '100%', borderRadius: 20, border: '1px solid #e5e7eb', boxShadow: '0 8px 30px rgba(0,0,0,0.10)', objectFit: 'cover', maxHeight: 420 }} />
        </div>
      )}

      {/* Article */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>
        <article className="blog-prose" dangerouslySetInnerHTML={{ __html: post.content }} />

        {/* CTA */}
        <div style={{ marginTop: 56, padding: 40, background: 'linear-gradient(135deg,#eef4ff,#e0eaff)', borderRadius: 24, textAlign: 'center', border: '1px solid #c7d9f8' }}>
          <h3 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Ready to put this into practice?</h3>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>Join the creators and clients building great work on Spectrum Connect.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" style={{ padding: '12px 28px', background: '#195ad7', color: '#fff', borderRadius: 12, fontWeight: 700, textDecoration: 'none', fontSize: 15 }}>Get started free</Link>
            <Link href="/blog" style={{ padding: '12px 28px', background: '#fff', color: '#374151', borderRadius: 12, fontWeight: 600, textDecoration: 'none', fontSize: 15, border: '1.5px solid #e5e7eb' }}>More articles</Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
