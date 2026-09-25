/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: '/auth/:path*', destination: 'http://127.0.0.1:3001/auth/:path*' },
      { source: '/email/:path*', destination: 'http://127.0.0.1:3001/email/:path*' },
      { source: '/campaigns/:path*', destination: 'http://127.0.0.1:3001/campaigns/:path*' },
      { source: '/attachments/:path*', destination: 'http://127.0.0.1:3001/attachments/:path*' },
    ];
  },
}

module.exports = nextConfig
