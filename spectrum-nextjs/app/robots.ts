import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/creator/dashboard',
          '/client/dashboard',
          '/admin/',
          '/api/',
          '/(auth)/',
        ],
      },
    ],
    sitemap: 'https://spectrumconect.com/sitemap.xml',
    host: 'https://spectrumconect.com',
  };
}
