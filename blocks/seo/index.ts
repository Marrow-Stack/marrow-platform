// ============================================================
// MarrowStack Block: SEO Toolkit
// Stack: Next.js 14 Metadata API + JSON-LD schemas + Sitemap
// Covers: buildMetadata helper, product/org/article/breadcrumb
//         JSON-LD, sitemap.ts, robots.ts, canonical URLs,
//         Twitter Cards, OG images, hreflang, noindex helpers
// ============================================================
import type { Metadata } from 'next'

const BASE_URL      = process.env.NEXT_PUBLIC_APP_URL || 'https://yourapp.com'
const SITE_NAME     = process.env.NEXT_PUBLIC_SITE_NAME || 'YourApp'
const TWITTER_HANDLE = (process.env.NEXT_PUBLIC_TWITTER_HANDLE || '@yourhandle')

// ── Types ─────────────────────────────────────────────────────
export interface PageSEO {
  title:       string
  description: string
  image?:      string      // Absolute URL or path. Falls back to og-default.
  noIndex?:    boolean
  type?:       'website' | 'article' | 'profile'
  /** ISO 8601. For articles. */
  publishedAt?: string
  updatedAt?:   string
  authors?:    string[]
  keywords?:   string[]
  /** Overrides canonical path */
  canonicalPath?: string
  /** hreflang alternates: { en: '/blocks', fr: '/fr/blocks' } */
  alternates?: Record<string, string>
}

// ── buildMetadata: drop into any page.tsx ─────────────────────
export function buildMetadata(page: PageSEO, path = '/'): Metadata {
  const image    = page.image?.startsWith('http') ? page.image : `${BASE_URL}${page.image || '/og-default.png'}`
  const canonical = `${BASE_URL}${page.canonicalPath || path}`

  return {
    title:       { absolute: `${page.title} | ${SITE_NAME}` },
    description: page.description,
    keywords:    page.keywords,
    metadataBase: new URL(BASE_URL),
    alternates: {
      canonical,
      ...(page.alternates
        ? { languages: Object.fromEntries(Object.entries(page.alternates).map(([lang, p]) => [lang, `${BASE_URL}${p}`])) }
        : {}),
    },
    robots: page.noIndex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
    openGraph: {
      title:       page.title,
      description: page.description,
      url:         canonical,
      siteName:    SITE_NAME,
      type:        page.type || 'website',
      images:      [{ url: image, width: 1200, height: 630, alt: page.title }],
      ...(page.publishedAt ? { publishedTime: page.publishedAt } : {}),
      ...(page.updatedAt   ? { modifiedTime:  page.updatedAt   } : {}),
      ...(page.authors     ? { authors: page.authors }           : {}),
    },
    twitter: {
      card:        'summary_large_image',
      site:        TWITTER_HANDLE,
      creator:     TWITTER_HANDLE,
      title:       page.title,
      description: page.description,
      images:      [image],
    },
  }
}

// ── noIndexMetadata: for pages you never want indexed ─────────
export function noIndexMetadata(title = SITE_NAME): Metadata {
  return {
    title,
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  }
}

// ── JSON-LD schemas ───────────────────────────────────────────

export function productJsonLd(opts: {
  name:        string
  description: string
  price:       number
  currency?:   string
  image?:      string
  url?:        string
  sku?:        string
  ratingValue?: number
  reviewCount?: number
}) {
  return {
    '@context': 'https://schema.org',
    '@type':    'Product',
    name:        opts.name,
    description: opts.description,
    image:       opts.image,
    url:         opts.url,
    sku:         opts.sku,
    offers: {
      '@type':       'Offer',
      price:         opts.price,
      priceCurrency: opts.currency || 'USD',
      availability:  'https://schema.org/InStock',
      priceValidUntil: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      seller:        { '@type': 'Organization', name: SITE_NAME },
    },
    ...(opts.ratingValue && opts.reviewCount ? {
      aggregateRating: {
        '@type':      'AggregateRating',
        ratingValue:   opts.ratingValue.toString(),
        reviewCount:   opts.reviewCount.toString(),
        bestRating:   '5',
        worstRating:  '1',
      },
    } : {}),
  }
}

export function organizationJsonLd(opts?: {
  name?:    string
  url?:     string
  logo?:    string
  twitter?: string
  github?:  string
}) {
  return {
    '@context':  'https://schema.org',
    '@type':     'Organization',
    name:        opts?.name  || SITE_NAME,
    url:         opts?.url   || BASE_URL,
    logo:        opts?.logo  || `${BASE_URL}/icon-192.svg`,
    sameAs:      [
      opts?.twitter ? `https://twitter.com/${opts.twitter.replace('@', '')}` : null,
      opts?.github  ? `https://github.com/${opts.github}`                    : null,
    ].filter(Boolean),
  }
}

export function articleJsonLd(opts: {
  headline:    string
  description: string
  publishedAt: string
  updatedAt?:  string
  author:      string
  image?:      string
  url?:        string
}) {
  return {
    '@context':         'https://schema.org',
    '@type':            'TechArticle',
    headline:            opts.headline,
    description:         opts.description,
    datePublished:       opts.publishedAt,
    dateModified:        opts.updatedAt || opts.publishedAt,
    image:               opts.image,
    url:                 opts.url,
    author: { '@type': 'Person', name: opts.author },
    publisher: {
      '@type': 'Organization',
      name:     SITE_NAME,
      logo: { '@type': 'ImageObject', url: `${BASE_URL}/icon-192.svg` },
    },
  }
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type':    'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type':   'ListItem',
      position:  i + 1,
      name:      item.name,
      item:      item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`,
    })),
  }
}

export function softwareAppJsonLd(opts: {
  name:        string
  description: string
  operatingSystem?: string
  applicationCategory?: string
  price?:      number
}) {
  return {
    '@context':           'https://schema.org',
    '@type':              'SoftwareApplication',
    name:                  opts.name,
    description:           opts.description,
    operatingSystem:       opts.operatingSystem || 'Web',
    applicationCategory:   opts.applicationCategory || 'DeveloperApplication',
    offers: opts.price !== undefined ? {
      '@type': 'Offer', price: opts.price, priceCurrency: 'USD',
    } : undefined,
  }
}

// ── Sitemap helper ─────────────────────────────────────────────
export function buildSitemapEntry(path: string, opts?: {
  priority?:         number
  changeFrequency?:  'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  lastModified?:     Date
}) {
  return {
    url:             `${BASE_URL}${path}`,
    lastModified:    opts?.lastModified || new Date(),
    changeFrequency: opts?.changeFrequency || 'weekly',
    priority:        opts?.priority ?? 0.5,
  }
}

// ── Inject JSON-LD in page.tsx ────────────────────────────────
export function JsonLd({ schema }: { schema: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 0) }}
    />
  ) as any
}

// ── app/sitemap.ts template ───────────────────────────────────
export const SITEMAP_TEMPLATE = `
import { MetadataRoute } from 'next'
import { BLOCKS, BUNDLES } from '@/lib/blocksData'
import { buildSitemapEntry } from '@/blocks/seo'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    buildSitemapEntry('/', { priority: 1, changeFrequency: 'daily' }),
    buildSitemapEntry('/blocks', { priority: 0.9 }),
    buildSitemapEntry('/affiliate', { priority: 0.7 }),
    buildSitemapEntry('/privacy', { priority: 0.3, changeFrequency: 'yearly' }),
    buildSitemapEntry('/terms',   { priority: 0.3, changeFrequency: 'yearly' }),
    ...[...BLOCKS, ...BUNDLES].map(b =>
      buildSitemapEntry('/blocks/' + b.id, { priority: 0.8 })
    ),
  ]
}
`

// ── app/robots.ts template ────────────────────────────────────
export const ROBOTS_TEMPLATE = `
import { MetadataRoute } from 'next'
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/api/', '/dashboard/', '/admin/'] },
    ],
    sitemap: process.env.NEXT_PUBLIC_APP_URL + '/sitemap.xml',
    host:    process.env.NEXT_PUBLIC_APP_URL,
  }
}
`

/*
──────────────────────────────────────────────────────────────
USAGE

// In any page.tsx:
import { buildMetadata, productJsonLd, breadcrumbJsonLd, JsonLd } from '@/blocks/seo'

export const metadata = buildMetadata({
  title: 'Auth System — $19',
  description: 'Full NextAuth.js with RBAC…',
  image: '/api/og?title=Auth+System&price=19',
  keywords: ['nextjs auth', 'nextauth', 'supabase auth'],
})

export default function Page() {
  return (
    <>
      <JsonLd schema={productJsonLd({ name: 'Auth System', description: '...', price: 19 })} />
      <JsonLd schema={breadcrumbJsonLd([{ name: 'Blocks', url: '/blocks' }, { name: 'Auth', url: '/blocks/auth' }])} />
      ...
    </>
  )
}
──────────────────────────────────────────────────────────────
*/
