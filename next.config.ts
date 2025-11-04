import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '1000mb', // Increase from default 1MB to 50MB for file uploads
    },
  },
  async headers() {
    return [
      {
        // Allow Telegram Mini App to embed student pages
        source: '/:lang/student/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://*.telegram.org https://web.telegram.org",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
