/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:3001';

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: '/auth/:path*', destination: `${BACKEND_URL}/auth/:path*` },
      { source: '/email/:path*', destination: `${BACKEND_URL}/email/:path*` },
      { source: '/campaigns/:path*', destination: `${BACKEND_URL}/campaigns/:path*` },
      { source: '/attachments/:path*', destination: `${BACKEND_URL}/attachments/:path*` },
    ];
  },
}

module.exports = nextConfig
