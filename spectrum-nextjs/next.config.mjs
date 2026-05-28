/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [],
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
