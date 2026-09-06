import type { Metadata } from 'next';
import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { HIRE_CATEGORIES } from '@/lib/hireCategories';

const BASE = 'https://spectrumconect.com';

export const metadata: Metadata = {
  title: 'Hire Verified Creative Professionals',
  description:
    'Hire verified videographers, designers, photographers, writers, and more on Spectrum Connect. AI-powered matching, milestone escrow, and a 12% total fee — half of Fiverr. Post a project free.',
  keywords: [
    'hire creative professionals',
    'hire a videographer',
    'hire a designer',
    'hire a photographer',
    'hire freelancers',
    'creative marketplace',
    'hire creators',
  ],
  openGraph: {
    title: 'Hire Verified Creative Professionals',
    description:
      'Post a project free and get matched with verified creators. Milestone escrow, a 12% total fee, and work that ships.',
    url: `${BASE}/hire`,
    type: 'website',
    siteName: 'Spectrum Connect',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hire Verified Creative Professionals',
    description:
      'Post a project free and get matched with verified creators. Milestone escrow, a 12% total fee.',
  },
  alternates: { canonical: `${BASE}/hire` },
};

const STEPS = [
  { icon: 'fa-pen-to-square', title: 'Post your project', desc: 'Describe what you need and your budget. It’s free, and takes a few minutes.' },
  { icon: 'fa-wand-magic-sparkles', title: 'Get matched', desc: 'AI matching surfaces verified creators who fit your brief — or invite anyone directly.' },
  { icon: 'fa-shield-halved', title: 'Fund milestones', desc: 'Money sits safely in escrow and is only released when you approve the work.' },
  { icon: 'fa-circle-check', title: 'Approve & release', desc: 'Review deliverables, request changes, and release payment when you’re happy.' },
];

export default function HireHubPage() {
  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Hire Verified Creative Professionals',
    url: `${BASE}/hire`,
    description:
      'Categories of verified creative professionals available to hire on Spectrum Connect — videographers, designers, photographers, writers, animators, and more.',
    hasPart: HIRE_CATEGORIES.map((c) => ({
      '@type': 'WebPage',
      name: `Hire a ${c.role}`,
      url: `${BASE}/hire/${c.slug}`,
    })),
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Hire Creative Professionals', item: `${BASE}/hire` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Nav />

      <main className="bg-white">
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-5 sm:px-6 pt-16 pb-12 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-cobalt mb-4">Hire on Spectrum Connect</p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900 mb-5 text-balance">
            Hire verified creative professionals
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Post a project free and get matched with verified videographers, designers, photographers, and more.
            Your money stays in milestone escrow until you approve the work — with a 12% total fee, half of Fiverr.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup"
              className="inline-flex items-center gap-2 bg-cobalt text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition">
              <i className="fa-solid fa-pen-to-square" /> Post a project — free
            </Link>
            <Link href="/how-it-works"
              className="inline-flex items-center gap-2 bg-gray-100 text-gray-800 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition">
              How it works
            </Link>
          </div>
        </section>

        {/* Category grid */}
        <section className="max-w-5xl mx-auto px-5 sm:px-6 pb-16">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-5">Browse by what you need</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {HIRE_CATEGORIES.map((c) => (
              <Link key={c.slug} href={`/hire/${c.slug}`}
                className="group block rounded-2xl border border-gray-200 p-5 hover:border-cobalt hover:shadow-sm transition">
                <div className="w-11 h-11 rounded-xl bg-cobalt/10 text-cobalt flex items-center justify-center mb-3.5">
                  <i className={`fa-solid ${c.icon} text-lg`} />
                </div>
                <h3 className="font-bold text-gray-900 mb-1 group-hover:text-cobalt transition">Hire a {c.role}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{c.blurb}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="bg-gray-50 border-y border-gray-100">
          <div className="max-w-5xl mx-auto px-5 sm:px-6 py-14">
            <h2 className="text-2xl font-black tracking-tight text-gray-900 mb-8 text-center">How hiring works</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {STEPS.map((s, i) => (
                <div key={s.title} className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 text-cobalt flex items-center justify-center mx-auto mb-3">
                    <i className={`fa-solid ${s.icon} text-lg`} />
                  </div>
                  <div className="text-xs font-bold text-gray-400 mb-1">STEP {i + 1}</div>
                  <h3 className="font-bold text-gray-900 mb-1.5">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-3xl mx-auto px-5 sm:px-6 py-16 text-center">
          <h2 className="text-3xl font-black tracking-tight text-gray-900 mb-3 text-balance">
            Ready to hire?
          </h2>
          <p className="text-gray-600 mb-7">
            Post a project and get matched with verified creators today. No cost to post, and escrow protects every payment.
          </p>
          <Link href="/signup"
            className="inline-flex items-center gap-2 bg-cobalt text-white px-7 py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition">
            <i className="fa-solid fa-pen-to-square" /> Post a project — free
          </Link>
        </section>
      </main>

      <Footer />
    </>
  );
}
