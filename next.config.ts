import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The blog was first built under /community/forum (Claire's branch) and the old
  // marketing site had a /community "coming soon" page; keep those URLs working.
  async redirects() {
    return [
      { source: '/community', destination: '/blog', permanent: true },
      { source: '/community/forum', destination: '/blog', permanent: true },
      { source: '/community/forum/:slug', destination: '/blog/:slug', permanent: true },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      // Product photos: any https host (the catalog CDN may change) —
      // next/image still resizes them to thumbnails.
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
