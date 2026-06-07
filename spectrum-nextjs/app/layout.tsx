import type { Metadata } from "next";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";
import { SpeedInsights } from "@vercel/speed-insights/next";

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
    images: [
      {
        url: `${BASE_URL}/assets/spectrum-logo.svg`,
        width: 1200,
        height: 630,
        alt: "Spectrum Connect — Creative Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Spectrum Connect — Hire Verified Creative Professionals",
    description:
      "AI-powered creative marketplace. Verified creators. Milestone escrow. Just 12% total fee — half of Fiverr.",
    images: [`${BASE_URL}/assets/spectrum-logo.svg`],
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
  url: BASE_URL,
  logo: `${BASE_URL}/assets/spectrum-logo.svg`,
  description:
    "Spectrum Connect is a premium creative marketplace connecting clients with verified creative professionals using AI-powered matching and milestone-based escrow payments.",
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
    <html lang="en">
      <head>
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
      </body>
    </html>
  );
}
