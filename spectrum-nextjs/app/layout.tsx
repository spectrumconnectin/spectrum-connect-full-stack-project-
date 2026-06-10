import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Self-hosted via next/font: no render-blocking Google Fonts request,
// zero layout shift, served from our own origin with immutable caching.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});
import CookieBanner from "@/components/CookieBanner";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics } from "@next/third-parties/google";

const BASE_URL = "https://spectrumconect.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Spectrum Connect — Hire Verified Creative Professionals",
    template: "%s | Spectrum Connect",
  },
  description:
    "Spectrum Connect is the premium creative marketplace where clients hire verified designers, videographers, illustrators, and more. AI-powered matching, milestone escrow, 12% total fee — half of Fiverr.",
  keywords: [
    "creative marketplace",
    "hire creative professionals",
    "freelance designers",
    "hire videographers",
    "creative freelancers",
    "escrow payments",
    "AI creator matching",
    "spectrum connect",
  ],
  authors: [
    { name: "Jamie Rivera", url: `${BASE_URL}/about` },
    { name: "Priya Nair", url: `${BASE_URL}/about` },
    { name: "Tom Osei", url: `${BASE_URL}/about` },
  ],
  creator: "Spectrum Connect",
  publisher: "Spectrum Connect",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "Spectrum Connect",
    title: "Spectrum Connect — Hire Verified Creative Professionals",
    description:
      "The premium creative marketplace with AI-powered matching, milestone escrow, and the lowest fees in the industry — just 12% total, split between creator and client.",
    // og:image comes from app/opengraph-image.tsx (real PNG — SVG og images
    // are ignored by Google and every major social scraper).
  },
  twitter: {
    card: "summary_large_image",
    title: "Spectrum Connect — Hire Verified Creative Professionals",
    description:
      "AI-powered creative marketplace. Verified creators. Milestone escrow. Just 12% total fee — half of Fiverr.",
    creator: "@spectrumconect",
    site: "@spectrumconect",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/icon.svg",
  },
  alternates: {
    canonical: BASE_URL,
  },
  verification: {
    google: "XR80nGBlQlsK6W0ImCuz448NXGFBHc_SBpnN0UrEHyw",
  },
};

// Organization JSON-LD — tells Google and AI engines exactly who Spectrum Connect is
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Spectrum Connect",
  // Help Google associate brand-name variants (incl. the domain spelling)
  // with this single entity.
  alternateName: ["SpectrumConnect", "Spectrum Conect", "Spectrum Connect Marketplace"],
  legalName: "Spectrum Connect",
  slogan: "Find trusted creators. Build amazing teams. Work better together.",
  url: BASE_URL,
  logo: `${BASE_URL}/assets/spectrum-logo.svg`,
  description:
    "Spectrum Connect is a premium creative marketplace connecting clients with verified creative professionals using AI-powered matching and milestone-based escrow payments.",
  knowsAbout: [
    "creative marketplace",
    "freelance hiring",
    "escrow payments",
    "AI creator matching",
    "video production",
    "graphic design",
  ],
  foundingDate: "2024",
  founders: [
    { "@type": "Person", name: "Jamie Rivera", jobTitle: "Co-founder & CEO" },
    { "@type": "Person", name: "Priya Nair", jobTitle: "Co-founder & CPO" },
  ],
  contactPoint: {
    "@type": "ContactPoint",
    email: "support@spectrumconect.com",
    contactType: "customer support",
    availableLanguage: "English",
  },
  sameAs: [
    // Add your social media URLs here:
    // "https://www.linkedin.com/company/spectrumconect",
    // "https://twitter.com/spectrumconect",
    // "https://www.instagram.com/spectrumconect",
  ],
};

// WebSite JSON-LD — enables Google sitelinks search box
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Spectrum Connect",
  alternateName: "SpectrumConnect",
  url: BASE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${BASE_URL}/blog?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Open the connection to the icon CDN early — saves DNS+TLS time on first paint */}
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com" />
        {/* Font Awesome — used by dashboard pages */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css"
        />
        {/* Organization structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        {/* WebSite structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body>
        {children}
        {/* Cookie consent banner */}
        <CookieBanner />
        {/* Vercel Speed Insights */}
        <SpeedInsights />
        {/* Google Analytics 4 — tracks visitor behavior and traffic sources */}
        <GoogleAnalytics gaId="G-J07TT69B25" />
      </body>
    </html>
  );
}
