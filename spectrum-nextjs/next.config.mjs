/** @type {import('next').NextConfig} */

// Security headers applied to every response. Tuned to be safe defaults
// without breaking existing CDN/asset usage. Adjust CSP if you start
// loading scripts from new domains.
const securityHeaders = [
  // Prevent click-jacking by disallowing the app from being framed.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Don't let browsers guess MIME types — they should obey what the server says.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Limit cross-origin information disclosure via Referer.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disable powerful browser features the app doesn't need.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // Pin HTTPS for two years on apex+subdomains. Vercel terminates TLS for us.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig = {
  images: {
    domains: [],
  },
  // Don't broadcast the framework version in the X-Powered-By header.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: 'http://spectrum-connect-prod.eba-dnnmz6mt.ap-south-1.elasticbeanstalk.com/:path*',
      },
    ];
  },
};

export default nextConfig;
