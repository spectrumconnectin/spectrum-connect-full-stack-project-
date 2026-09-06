import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { HIRE_CATEGORIES, getHireCategory } from '@/lib/hireCategories';

const BASE = 'https://spectrumconect.com';

export function generateStaticParams() {
  return HIRE_CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: { params: { category: string } }): Promise<Metadata> {
  const c = getHireCategory(params.category);
  if (!c) return { title: 'Hire Creative Professionals', robots: { index: false } };

  const title = `Hire a ${c.role} — Verified ${c.role}s for Hire`;
  const description =
    `Hire a verified ${c.role.toLowerCase()} on Spectrum Connect. ${c.blurb} AI-powered matching, milestone escrow, and a 12% total fee. Post a project free.`;
  const url = `${BASE}/hire/${c.slug}`;

  return {
    title,
    description,
    keywords: [`hire a ${c.role.toLowerCase()}`, `hire ${c.rolePlural}`, `freelance ${c.role.toLowerCase()}`, `${c.platformCategory.toLowerCase()} freelancers`],
    openGraph: { title, description, url, type: 'website', siteName: 'Spectrum Connect' },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { canonical: url },
  };
}

export default function HireCategoryPage({ params }: { params: { category: string } }) {
  const c = getHireCategory(params.category);
  if (!c) notFound();

  const url = `${BASE}/hire/${c.slug}`;
  const others = HIRE_CATEGORIES.filter((x) => x.slug !== c.slug).slice(0, 4);

  const serviceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: `${c.role} for hire`,
    name: `Hire a ${c.role}`,
    description: `${c.blurb} Hire verified ${c.rolePlural} on Spectrum Connect with milestone escrow and a 12% total fee.`,
    url,
    areaServed: 'Worldwide',
    provider: { '@type': 'Organization', name: 'Spectrum Connect', url: BASE },
    category: c.platformCategory,
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Hire Creative Professionals', item: `${BASE}/hire` },
      { '@type': 'ListItem', position: 3, name: `Hire a ${c.role}`, item: url },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Nav />

      <main className="bg-white">
        {/* Breadcrumb */}
        <div className="max-w-4xl mx-auto px-5 sm:px-6 pt-8">
          <nav className="text-sm text-gray-400 flex items-center gap-2" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-gray-600">Home</Link>
            <span>/</span>
            <Link href="/hire" className="hover:text-gray-600">Hire</Link>
            <span>/</span>
            <span className="text-gray-600">{c.role}</span>
          </nav>
        </div>

        {/* Hero */}
        <section className="max-w-4xl mx-auto px-5 sm:px-6 pt-8 pb-10">
          <div className="w-14 h-14 rounded-2xl bg-cobalt/10 text-cobalt flex items-center justify-center mb-5">
            <i className={`fa-solid ${c.icon} text-2xl`} />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900 mb-4 text-balance">
            Hire a {c.role}
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mb-7">
            {c.blurb} Post a project free and get matched with verified {c.rolePlural} — your payment stays in
            milestone escrow until you approve the work, with a 12% total fee that’s half of Fiverr’s.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/signup"
              className="inline-flex items-center gap-2 bg-cobalt text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition">
              <i className="fa-solid fa-pen-to-square" /> Post a project — free
            </Link>
            <Link href="/portfolios"
              className="inline-flex items-center gap-2 bg-gray-100 text-gray-800 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition">
              See creator portfolios
            </Link>
          </div>
        </section>

        {/* What you can hire for */}
        <section className="max-w-4xl mx-auto px-5 sm:px-6 pb-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">What you can hire {c.rolePlural} for</h2>
          <div className="flex flex-wrap gap-2 mb-8">
            {c.deliverables.map((d) => (
              <span key={d} className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3.5 py-1.5 text-sm text-gray-700">
                <i className="fa-solid fa-check text-cobalt text-xs" /> {d}
              </span>
            ))}
          </div>
        </section>

        {/* Skills */}
        <section className="max-w-4xl mx-auto px-5 sm:px-6 pb-12">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Skills you can brief for</h2>
          <div className="flex flex-wrap gap-2">
            {c.skills.map((s) => (
              <span key={s} className="inline-flex items-center bg-cobalt/5 text-cobalt border border-cobalt/15 rounded-lg px-3 py-1.5 text-sm font-medium">
                {s}
              </span>
            ))}
          </div>
        </section>

        {/* Why Spectrum Connect */}
        <section className="bg-gray-50 border-y border-gray-100">
          <div className="max-w-4xl mx-auto px-5 sm:px-6 py-12 grid sm:grid-cols-3 gap-6">
            {[
              { icon: 'fa-shield-halved', title: 'Milestone escrow', desc: `Your payment is held safely and only released when you approve the ${c.role.toLowerCase()}’s work.` },
              { icon: 'fa-user-check', title: 'Verified creators', desc: `Every ${c.role.toLowerCase()} is verified, with real portfolios and client reviews you can check first.` },
              { icon: 'fa-percent', title: '12% total fee', desc: 'Half of Fiverr’s take — split between client and creator, with no surprise markups.' },
            ].map((f) => (
              <div key={f.title}>
                <div className="w-11 h-11 rounded-xl bg-white border border-gray-200 text-cobalt flex items-center justify-center mb-3">
                  <i className={`fa-solid ${f.icon} text-lg`} />
                </div>
                <h3 className="font-bold text-gray-900 mb-1.5">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Related categories — internal links */}
        <section className="max-w-4xl mx-auto px-5 sm:px-6 py-12">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Also hire</h2>
          <div className="flex flex-wrap gap-2.5">
            {others.map((o) => (
              <Link key={o.slug} href={`/hire/${o.slug}`}
                className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 hover:border-cobalt hover:text-cobalt transition">
                <i className={`fa-solid ${o.icon} text-cobalt`} /> {o.role}
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-3xl mx-auto px-5 sm:px-6 pb-16 text-center">
          <h2 className="text-3xl font-black tracking-tight text-gray-900 mb-3 text-balance">
            Hire a {c.role.toLowerCase()} today
          </h2>
          <p className="text-gray-600 mb-7">
            Post your project free and get matched with verified {c.rolePlural} in minutes.
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
