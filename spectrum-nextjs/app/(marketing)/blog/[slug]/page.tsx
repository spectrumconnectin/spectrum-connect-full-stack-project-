import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Link from 'next/link';
import type { Metadata } from 'next';

const posts: Record<string, {
  title: string;
  excerpt: string;
  category: string;
  categoryColor: string;
  author: string;
  authorRole: string;
  date: string;
  readTime: string;
  content: string;
}> = {
  'how-to-price-your-creative-work': {
    title: 'How to Price Your Creative Work Without Underselling',
    excerpt: 'Stop guessing your rates. Here\'s a framework for pricing your services based on value, market data, and your unique expertise.',
    category: 'Freelance Advice',
    categoryColor: 'bg-blue-100 text-blue-700',
    author: 'Priya Nair',
    authorRole: 'Co-founder & CPO',
    date: 'May 8, 2026',
    readTime: '6 min read',
    content: `Pricing is one of the most difficult skills for creative professionals to develop — and one of the most valuable. Getting it wrong costs you money, energy, and sometimes your best clients.

Here's the framework we recommend at Spectrum Connect.

## Start with your minimum viable rate

Calculate what you need to earn to cover your costs, taxes, time off, and savings — then work backwards from your billable hours. Most freelancers significantly underestimate non-billable time.

A rough formula: (Annual salary target + expenses) ÷ (billable hours per year).

## Factor in your experience and portfolio

A designer with 10 years and a strong portfolio of recognised brands commands 3–5× what a new graduate charges. This isn't arrogance — it's market reality. Don't price against beginners.

## Price by value, not time

For projects with a clear business impact — a rebrand, a product launch video, a conversion-focused landing page — price based on the value you're creating, not the hours you'll spend. A 30-second video that sells $500k of product is worth more than the 20 hours it took.

## Never just drop your rate

When clients push back on price, never simply reduce your rate. Instead: reduce scope, defer the second payment to a later milestone, or offer a small volume discount if they book multiple projects. Dropping your rate signals that you were overcharging — and it sets a precedent.

## Review and raise annually

Your rates should increase at least as fast as inflation, and ideally faster as your skills and reputation grow. Schedule a rate review every 12 months.`,
  },
  'building-a-winning-creative-brief': {
    title: 'The Art of a Winning Creative Brief',
    excerpt: 'Great creative work starts with a great brief. Learn how top clients communicate their vision to get exactly what they want.',
    category: 'Client Guides',
    categoryColor: 'bg-purple-100 text-purple-700',
    author: 'Jamie Rivera',
    authorRole: 'Co-founder & CEO',
    date: 'Apr 25, 2026',
    readTime: '5 min read',
    content: `The single biggest source of creative project failures isn't skill — it's miscommunication. A well-written creative brief eliminates ambiguity before work begins.

## What every brief needs

**Objective**: What business problem are you solving? "We need a logo" is a request, not a brief. "We need a logo that positions us as premium to enterprise clients" is a brief.

**Audience**: Who is this for? Age, job, values, pain points. The more specific, the better.

**Tone**: List 3–5 adjectives that describe the desired feel. Provide 3 examples of work you admire and 3 you don't.

**Deliverables**: Be explicit. "A logo" vs. "Primary logo, secondary mark, wordmark in vector format with dark and light variants."

**Constraints**: Budget, deadline, brand guidelines, technical specs, platforms.

## What to avoid

Don't say "I'll know it when I see it." Don't say "be creative" without any direction. Don't reference trends without explaining why they fit your brand.

## The golden rule

If a creator can start working from your brief without emailing you a single question, it's a great brief.`,
  },
};

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = posts[params.slug];
  if (!post) return { title: 'Post Not Found — Spectrum Connect' };
  return {
    title: `${post.title} — Spectrum Connect Blog`,
    description: post.excerpt,
  };
}

function renderContent(content: string) {
  return content.split('\n\n').map((block, i) => {
    if (block.startsWith('## ')) {
      return <h2 key={i} style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginTop: 36, marginBottom: 12 }}>{block.slice(3)}</h2>;
    }
    if (block.startsWith('**') && block.includes('**:')) {
      const [boldPart, ...rest] = block.split('**:');
      return (
        <p key={i} style={{ fontSize: 16, lineHeight: 1.75, color: '#374151', marginBottom: 16 }}>
          <strong style={{ color: '#111827' }}>{boldPart.replace(/\*\*/g, '')}:</strong>
          {rest.join('**:').replace(/\*\*/g, '')}
        </p>
      );
    }
    return <p key={i} style={{ fontSize: 16, lineHeight: 1.75, color: '#374151', marginBottom: 16 }}>{block.replace(/\*\*/g, '')}</p>;
  });
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = posts[params.slug];

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

  return (
    <div>
      <Nav />

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#0f172a,#1e3a6e)', padding: '56px 24px 48px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <Link href="/blog" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 14, fontWeight: 500, marginBottom: 24 }}>
            <i className="fa-solid fa-arrow-left"></i> Back to Blog
          </Link>
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.1)', color: '#93c5fd' }}>{post.category}</span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.5rem,4vw,2.5rem)', fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 16 }}>{post.title}</h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 24 }}>{post.excerpt}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
            <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{post.author}</span>
            <span>—</span>
            <span>{post.authorRole}</span>
            <span>·</span>
            <span>{post.date}</span>
            <span>·</span>
            <span>{post.readTime}</span>
          </div>
        </div>
      </div>

      {/* Article */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>
        <article>
          {renderContent(post.content)}
        </article>

        {/* CTA */}
        <div style={{ marginTop: 56, padding: 40, background: 'linear-gradient(135deg,#eef4ff,#e0eaff)', borderRadius: 24, textAlign: 'center', border: '1px solid #c7d9f8' }}>
          <h3 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Ready to put this into practice?</h3>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>Join 18,000+ creators and clients already building great work on Spectrum Connect.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" style={{ padding: '12px 28px', background: '#195ad7', color: '#fff', borderRadius: 12, fontWeight: 700, textDecoration: 'none', fontSize: 15 }}>
              Get started free
            </Link>
            <Link href="/blog" style={{ padding: '12px 28px', background: '#fff', color: '#374151', borderRadius: 12, fontWeight: 600, textDecoration: 'none', fontSize: 15, border: '1.5px solid #e5e7eb' }}>
              More articles
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
