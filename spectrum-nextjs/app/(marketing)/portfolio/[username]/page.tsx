import Link from 'next/link';
import type { Metadata } from 'next';
import { getPublicPortfolio, decodeParam } from '@/lib/portfolio';
import PortfolioPublicView from '@/components/portfolio/PortfolioPublicView';
import ViewBeacon from '@/components/portfolio/ViewBeacon';
import PortfolioPasscodeGate from '@/components/portfolio/PortfolioPasscodeGate';

const BASE = 'https://spectrumconect.com';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const data = await getPublicPortfolio(params.username);
  if (!data || !data.published || !data.profile) {
    return { title: 'Portfolio — Spectrum Connect', robots: { index: false } };
  }
  const name = data.profile.display_name || params.username;
  const title = `${name} — ${data.profile.headline || data.profile.tagline || 'Creative Portfolio'}`;
  const description = (data.profile.bio || `View ${name}'s portfolio, work, and client reviews on Spectrum Connect.`).slice(0, 160);
  // Canonical always points at the clean handle so an email-based URL never gets indexed.
  const url = `${BASE}/portfolio/${encodeURIComponent(data.profile.handle || decodeParam(params.username))}`;
  const image = data.profile.cover_image || data.profile.profile_picture;
  return {
    title,
    description,
    openGraph: {
      title, description, url, type: 'profile', siteName: 'Spectrum Connect',
      images: image ? [{ url: image }] : undefined,
    },
    twitter: { card: 'summary_large_image', title, description, images: image ? [image] : undefined },
    alternates: { canonical: url },
  };
}

export default async function PublicPortfolioPage({ params }: { params: { username: string } }) {
  const data = await getPublicPortfolio(params.username);

  // Password-protected → client-side gate that unlocks and fetches the real data.
  if (data?.locked) {
    return <PortfolioPasscodeGate username={params.username} />;
  }

  // Not found / unpublished → friendly, quiet page (no site nav noise).
  if (!data || !data.published || !data.profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
            <i className="fa-regular fa-folder-open text-2xl text-gray-300" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {data && !data.published ? 'This portfolio is private' : 'Portfolio not found'}
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            {data && !data.published
              ? 'The creator has unpublished their portfolio for now.'
              : 'This portfolio doesn’t exist or may have moved.'}
          </p>
          <Link href="/" className="inline-flex items-center gap-2 bg-cobalt text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition">
            Explore Spectrum Connect
          </Link>
        </div>
      </div>
    );
  }

  const name = data.profile.display_name || params.username;
  const personJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    url: `${BASE}/portfolio/${encodeURIComponent(data.profile.handle || decodeParam(params.username))}`,
    image: data.profile.profile_picture || undefined,
    jobTitle: data.profile.headline || data.profile.tagline || undefined,
    description: data.profile.bio || undefined,
    address: data.profile.location?.city
      ? { '@type': 'PostalAddress', addressLocality: data.profile.location.city, addressCountry: data.profile.location.country }
      : undefined,
    knowsAbout: (data.profile.skills || []).map(s => s.name),
    ...(data.reviews?.total
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: data.reviews.average,
            reviewCount: data.reviews.total,
            bestRating: 5,
          },
        }
      : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} />
      <ViewBeacon username={params.username} />
      <PortfolioPublicView data={data} />
    </>
  );
}
