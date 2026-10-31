import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
