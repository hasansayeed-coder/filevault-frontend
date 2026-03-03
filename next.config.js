/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/uploads/**',
      },
      {
        // ── FIXED: also allow Railway backend images in production ──
        protocol: 'https',
        hostname: '**.railway.app',
        pathname: '/uploads/**',
      },
    ],
  },
};

module.exports = nextConfig;