import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // WordPress media (logos, package thumbnails) served from the main site
      { protocol: "https", hostname: "darelkubra.com", pathname: "/**" },
      { protocol: "https", hostname: "www.darelkubra.com", pathname: "/**" },
      { protocol: "https", hostname: "terbia.darelkubra.com", pathname: "/**" },
      // Telegram profile photos
      { protocol: "https", hostname: "t.me", pathname: "/**" },
      // UploadThing assets
      { protocol: "https", hostname: "utfs.io", pathname: "/**" },
      { protocol: "https", hostname: "*.ufs.sh", pathname: "/**" },
      // Mux thumbnails
      { protocol: "https", hostname: "image.mux.com", pathname: "/**" },
    ],
  },
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
