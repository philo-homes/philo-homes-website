import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// Public, indexable pages only. Add new marketing/blog routes here.
const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '', priority: 1.0, changeFrequency: 'weekly' },
  { path: '/about', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/case-study', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/community', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/book-demo', priority: 0.7, changeFrequency: 'yearly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return routes.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }))
}
