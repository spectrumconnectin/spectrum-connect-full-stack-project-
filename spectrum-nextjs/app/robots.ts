import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // Private app surfaces — block the whole sections, not just dashboards
          '/creator/',
          '/client/',
          '/admin/',
          '/api/',
          '/backend/',
          // Thin auth-flow pages with no search value (login/signup stay
          // crawlable — they catch navigational "spectrum connect login" queries)
          '/oauth-callback',
          '/oauth-error',
          '/verify-email',
          '/reset-password',
          '/forgot-password',
          '/onboarding/',
        ],
      },
    ],
    sitemap: 'https://spectrumconect.com/sitemap.xml',
    host: 'https://spectrumconect.com',
  };
}
