import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Internal prototypes and API endpoints should not be crawled.
        disallow: ['/api/', '/community-dev', '/scene'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
