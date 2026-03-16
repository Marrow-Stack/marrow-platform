import { MetadataRoute } from 'next'
import { ALL_BLOCKS } from '@/lib/blocksData'

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://marrowstack.dev'

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    { url: BASE, priority: 1.0, changeFrequency: 'daily' as const },
    { url: `${BASE}/blocks`, priority: 0.9, changeFrequency: 'weekly' as const },
    { url: `${BASE}/affiliate`, priority: 0.7, changeFrequency: 'monthly' as const },
    { url: `${BASE}/privacy`, priority: 0.3, changeFrequency: 'yearly' as const },
    { url: `${BASE}/terms`, priority: 0.3, changeFrequency: 'yearly' as const },
  ]
  const blockPages = ALL_BLOCKS.map(b => ({
    url: `${BASE}/blocks/${b.id}`, priority: 0.8, changeFrequency: 'weekly' as const,
  }))
  return [...staticPages, ...blockPages].map(p => ({ ...p, lastModified: new Date() }))
}
