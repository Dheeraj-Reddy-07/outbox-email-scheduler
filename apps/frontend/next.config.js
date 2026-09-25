/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:3001';

const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // OAuth initiation must be a true browser redirect so the 302 to Google is followed
      {
        source: '/auth/google',
        destination: `${BACKEND_URL}/auth/google`,
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      // All other backend routes (including OAuth callback) are proxied transparently
      { source: '/auth/:path*', destination: `${BACKEND_URL}/auth/:path*` },
      { source: '/email/:path*', destination: `${BACKEND_URL}/email/:path*` },
      { source: '/campaigns/:path*', destination: `${BACKEND_URL}/campaigns/:path*` },
      { source: '/attachments/:path*', destination: `${BACKEND_URL}/attachments/:path*` },
    ];
  },
}

module.exports = nextConfig
