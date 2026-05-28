import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog — Spectrum Connect',
  description: 'Insights, guides, and stories for creative professionals.',
};

const posts = [
  {
    slug: 'how-to-price-your-creative-work',
    title: 'How to Price Your Creative Work Without Underselling',
    excerpt: 'Stop guessing your rates. Here\'s a framework for pricing your services based on value, market data, and your unique expertise.',
    category: 'Freelance Advice',
    categoryColor: 'bg-blue-100 text-blue-700',
    author: 'Priya Nair',
    authorRole: 'Co-founder & CPO',
    date: 'May 8, 2026',
    readTime: '6 min read',
    gradient: 'from-blue-500 to-cobalt',
  },
  {
    slug: 'building-a-winning-creative-brief',
    title: 'The Art of a Winning Creative Brief',
    excerpt: 'Great creative work starts with a great brief. Learn how top clients communicate their vision to get exactly what they want.',
    category: 'Client Guides',
    categoryColor: 'bg-purple-100 text-purple-700',
    author: 'Jamie Rivera',
    authorRole: 'Co-founder & CEO',
    date: 'Apr 25, 2026',
    readTime: '5 min read',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    slug: 'escrow-payments-explained',
    title: 'Escrow Payments Explained: Why They Protect Everyone',
    excerpt: 'Payment anxiety kills creative collaboration. Here\'s exactly how Spectrum Connect\'s escrow system works and why it\'s better for both sides.',
    category: 'Platform',
    categoryColor: 'bg-green-100 text-green-700',
    author: 'Tom Osei',
    authorRole: 'Head of Engineering',
    date: 'Apr 14, 2026',
    readTime: '4 min read',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    slug: 'top-creator-portfolio-tips',
    title: '10 Portfolio Tips That Actually Get You Hired',
    excerpt: 'Your portfolio is your best sales tool. These 10 evidence-backed tips will make it impossible for clients to scroll past you.',
    category: 'Creator Tips',
    categoryColor: 'bg-orange-100 text-orange-700',
    author: 'Priya Nair',
    authorRole: 'Co-founder & CPO',
    date: 'Mar 30, 2026',
    readTime: '7 min read',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    slug: 'ai-matching-explained',
    title: 'How Smart Connect AI Finds Your Perfect Match',
    excerpt: 'Keyword search is dead. Discover how Spectrum\'s matching engine learns from every project to surface the right collaborators at the right time.',
    category: 'Platform',
    categoryColor: 'bg-green-100 text-green-700',
    author: 'Tom Osei',
    authorRole: 'Head of Engineering',
    date: 'Mar 15, 2026',
    readTime: '8 min read',
    gradient: 'from-cyan-500 to-blue-500',
  },
  {
    slug: 'creative-contracts-guide',
    title: 'The Creative Contractor\'s Guide to Contracts',
    excerpt: 'A solid contract protects your work, your time, and your income. Here\'s what every freelancer needs to include.',
    category: 'Freelance Advice',
    categoryColor: 'bg-blue-100 text-blue-700',
    author: 'Jamie Rivera',
    authorRole: 'Co-founder & CEO',
    date: 'Feb 28, 2026',
    readTime: '9 min read',
    gradient: 'from-indigo-500 to-purple-500',
  },
];

const categories = ['All', 'Freelance Advice', 'Creator Tips', 'Client Guides', 'Platform'];

export default function BlogPage() {
  const featured = posts[0];
  const rest = posts.slice(1);

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
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {categories.map(c => (
              <span key={c} style={{ padding: '6px 14px', borderRadius: 20, background: c === 'All' ? '#195ad7' : 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.15)' }}>
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '56px 24px' }}>
        {/* Featured post */}
        <div style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 24 }}>Featured</h2>
          <Link href={`/blog/${featured.slug}`} style={{ display: 'block', textDecoration: 'none', borderRadius: 24, overflow: 'hidden', border: '1px solid #e5e7eb', background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }} className="group">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 300 }}>
              <div style={{ background: `linear-gradient(135deg,${featured.gradient.replace('from-','').replace('to-','').split(' ').map((c,i) => `${c}${i===0?' 0%':' 100%'}`).join(',')})`, background: 'linear-gradient(135deg,#3b82f6,#195ad7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                <div style={{ textAlign: 'center' }}>
                  <i className="fa-solid fa-newspaper" style={{ fontSize: 64, color: 'rgba(255,255,255,0.3)' }}></i>
                </div>
              </div>
              <div style={{ padding: '40px 44px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }} className={featured.categoryColor}>{featured.category}</span>
                </div>
                <h3 style={{ fontSize: 'clamp(1.2rem,2.5vw,1.8rem)', fontWeight: 800, color: '#111827', lineHeight: 1.25, marginBottom: 12 }}>{featured.title}</h3>
                <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.65, marginBottom: 20 }}>{featured.excerpt}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#9ca3af' }}>
                  <span style={{ fontWeight: 600, color: '#374151' }}>{featured.author}</span>
                  <span>·</span>
                  <span>{featured.date}</span>
                  <span>·</span>
                  <span>{featured.readTime}</span>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Post Grid */}
        <h2 style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 24 }}>Latest Posts</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
          {rest.map(post => (
            <Link key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: 'none', borderRadius: 20, overflow: 'hidden', border: '1px solid #e5e7eb', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }} className="group">
              <div style={{ height: 140, background: 'linear-gradient(135deg,#195ad7,#4178e7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fa-solid fa-pen-nib" style={{ fontSize: 40, color: 'rgba(255,255,255,0.3)' }}></i>
              </div>
              <div style={{ padding: '24px 24px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }} className={post.categoryColor}>{post.category}</span>
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#111827', lineHeight: 1.3, marginBottom: 8, flex: 1 }}>{post.title}</h3>
                <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, marginBottom: 16 }}>{post.excerpt}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9ca3af', marginTop: 'auto' }}>
                  <span style={{ fontWeight: 600, color: '#374151' }}>{post.author}</span>
                  <span>·</span>
                  <span>{post.date}</span>
                  <span>·</span>
                  <span>{post.readTime}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
