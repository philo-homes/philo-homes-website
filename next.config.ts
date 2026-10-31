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
      // Product photos (catalog CDN) — resized to thumbnails by next/image.
      {
        protocol: 'https',
        hostname: '**.cloudfront.net',
      },
    ],
  },
};

export default nextConfig;
