// lib/blocksData.ts
export interface Block {
  id:            string
  name:          string
  tagline:       string
  description:   string
  price:         number
  category:      'Core' | 'Monetization' | 'Utility' | 'UI' | 'Security' | 'Bundle'
  tags:          string[]
  repoName:      string
  complexity:    'Beginner' | 'Intermediate' | 'Advanced'
  linesOfCode:   number
  timeSavedHours: number
  deps:          string[]
  preview:       string
  isBundle?:     boolean
  bundleIds?:    string[]
  bundleDiscount?: number
}

export const BLOCKS: Block[] = [
  {
    id: 'auth',
    name: 'Auth System',
    tagline: 'Email + GitHub + Google OAuth with RBAC',
    description: 'Full NextAuth.js v4 setup with credentials and two OAuth providers, role-based access control (user/admin/super_admin), protected routes via middleware, Supabase profile sync, password reset flow, email verification tokens, audit log, and a withAuth() wrapper for API routes.',
    price: 19,
    category: 'Core',
    tags: ['auth', 'oauth', 'rbac', 'nextauth'],
    repoName: 'ms-block-auth',
    complexity: 'Intermediate',
    linesOfCode: 487,
    timeSavedHours: 14,
    deps: ['next-auth', 'bcryptjs', '@supabase/supabase-js', 'zod'],
    preview: `export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({ /* email + bcrypt */ }),
    GitHubProvider({ clientId, clientSecret }),
    GoogleProvider({ clientId, clientSecret }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const { data } = await supabaseAdmin
          .from('profiles').select('id, role').eq('email', user.email!).single()
        token.id   = data?.id
        token.role = data?.role ?? 'user'
      }
      return token
    },
  },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
}`,
  },
  {
    id: 'billing',
    name: 'Billing & Subscriptions',
    tagline: 'PayPal one-time + recurring + invoices',
    description: 'Complete billing with PayPal REST API: one-time orders, monthly/yearly subscription plans, usage-based limits per plan, automatic refunds, HTML invoice generation, and subscription status checks. India-compatible with INR display helpers. Includes webhook handler and SQL migration.',
    price: 29,
    category: 'Monetization',
    tags: ['paypal', 'subscriptions', 'billing', 'india'],
    repoName: 'ms-block-billing',
    complexity: 'Advanced',
    linesOfCode: 405,
    timeSavedHours: 18,
    deps: ['resend'],
    preview: `const sub = await createSubscription('pro_monthly', user.email)
window.location.href = sub.links.find(l => l.rel === 'approve').href

// Check plan limits:
const limit = await getPlanLimit(userId, 'ai_calls')
if (limit.used >= limit.max) throw new Error('Upgrade required')`,
  },
  {
    id: 'admin',
    name: 'Admin Dashboard',
    tagline: 'User management, revenue analytics, feature flags',
    description: 'Full server-side admin utilities: user CRUD with role promotion, revenue-by-month SQL function, top blocks leaderboard, affiliate rankings, feature flag CRUD with percentage rollout, and daily active user queries. Use with the admin UI page included in the app skeleton.',
    price: 24,
    category: 'Core',
    tags: ['admin', 'analytics', 'dashboard', 'feature-flags'],
    repoName: 'ms-block-admin',
    complexity: 'Advanced',
    linesOfCode: 365,
    timeSavedHours: 14,
    deps: ['@supabase/supabase-js'],
    preview: `const stats = await getDashboardStats()
// → { totalUsers: 312, totalRevenue: 8940.50,
//     totalPurchases: 487, topBlock: 'auth' }

const flagEnabled = await isFeatureFlagEnabled('new_blocks_page', userId)`,
  },
  {
    id: 'email',
    name: 'Email System',
    tagline: 'Beautiful transactional emails via Resend',
    description: 'Full HTML email suite using Resend: welcome, password reset, email verification, team invite, purchase receipt, refund confirmation, batch sending, and unsubscribe tokens. All templates are mobile-responsive with a shared brand layout. Includes escaping, preview text, and from-name config.',
    price: 14,
    category: 'Utility',
    tags: ['email', 'resend', 'transactional', 'templates'],
    repoName: 'ms-block-email',
    complexity: 'Beginner',
    linesOfCode: 302,
    timeSavedHours: 8,
    deps: ['resend'],
    preview: `await sendPurchaseReceipt({
  to: user.email,
  name: user.name,
  itemName: 'Auth System',
  amount: 19,
  currency: 'USD',
  githubRepo: 'github.com/you/ms-block-auth',
})`,
  },
  {
    id: 'team',
    name: 'Team & Workspaces',
    tagline: 'Multi-tenant SaaS with roles and invites',
    description: 'Full multi-tenancy: workspace creation, email-based member invitations with 7-day expiring tokens, role hierarchy (owner/admin/member/viewer), role-checking helpers, and RLS policies that isolate data per workspace. Includes invite accept API, membership CRUD, and workspace settings helpers.',
    price: 24,
    category: 'Core',
    tags: ['multi-tenant', 'teams', 'workspaces', 'invites'],
    repoName: 'ms-block-team',
    complexity: 'Advanced',
    linesOfCode: 385,
    timeSavedHours: 16,
    deps: ['@supabase/supabase-js', 'resend'],
    preview: `await inviteMember(workspaceId, adminId, 'new@user.com', 'member')
// Sends invite email, generates token, sets 7-day expiry

const role = await getMemberRole(workspaceId, userId)
// → 'owner' | 'admin' | 'member' | 'viewer' | null`,
  },
  {
    id: 'payments',
    name: 'PayPal Checkout',
    tagline: 'One-time payments with webhook verification',
    description: 'Plug-and-play PayPal REST API v2 integration: order creation, payment capture, full and partial refunds, HMAC webhook signature verification, and token caching. INR display helpers, sandbox/live mode switching via env var, and a pending_orders table with 24-hour expiry cleanup.',
    price: 19,
    category: 'Monetization',
    tags: ['paypal', 'checkout', 'payments', 'india'],
    repoName: 'ms-block-payments',
    complexity: 'Intermediate',
    linesOfCode: 326,
    timeSavedHours: 10,
    deps: [],
    preview: `const order = await createOrder('19.00', 'Auth System Block')
// → { orderId: 'ORDER_ID', approvalUrl: 'https://paypal.com/...' }

await verifyWebhookSignature(req.headers, rawBody)
// Throws if signature is invalid — blocks spoofed webhooks`,
  },
  {
    id: 'profile',
    name: 'User Profile',
    tagline: 'Editable profiles with avatar upload',
    description: 'Complete profile management React component: avatar upload to Supabase Storage with progress bar, display name and bio editing, social link fields, Zod validation via React Hook Form, and account deletion. Includes uploadAvatar() helper, RLS policies for private storage, and signed URL generation.',
    price: 9,
    category: 'Utility',
    tags: ['profile', 'avatar', 'storage', 'settings'],
    repoName: 'ms-block-profile',
    complexity: 'Beginner',
    linesOfCode: 193,
    timeSavedHours: 6,
    deps: ['@supabase/supabase-js', 'react-hook-form', 'zod'],
    preview: `const url = await uploadAvatar(userId, file)
// Uploads to Supabase Storage → profile_pictures/{userId}/avatar.{ext}
// Returns public signed URL, updates profiles.avatar_url`,
  },
  {
    id: 'notifications',
    name: 'Notifications System',
    tagline: 'Real-time in-app + Web Push notifications',
    description: 'Full notification stack: real-time updates via Supabase Realtime subscription, unread count badge with live updates, mark-as-read and bulk archive, browser Web Push API integration, push subscription management, and server-side notification creation helpers. Includes SQL migration with GIN index.',
    price: 14,
    category: 'Utility',
    tags: ['notifications', 'realtime', 'push', 'supabase'],
    repoName: 'ms-block-notifications',
    complexity: 'Intermediate',
    linesOfCode: 369,
    timeSavedHours: 10,
    deps: ['@supabase/supabase-js'],
    preview: `const { items, unread, markRead, markAllRead } = useNotifications(userId)
// items updates live via Supabase Realtime — no polling needed

await createNotification(supabaseAdmin, userId, {
  type: 'purchase', title: 'Payment confirmed',
  body: 'Auth System repo access granted.', actionUrl: '/dashboard',
})`,
  },
  {
    id: 'search',
    name: 'Full-Text Search',
    tagline: 'PostgreSQL tsvector search with highlighting',
    description: 'Powerful search on Postgres using native full-text: generated tsvector columns with GIN indexes, websearch_to_tsquery format, result highlighting via ts_headline with context extraction, prefix autocomplete, faceted filtering, and a debounced React hook. Zero external dependencies — uses your existing Supabase instance.',
    price: 14,
    category: 'Utility',
    tags: ['search', 'postgresql', 'full-text', 'tsvector'],
    repoName: 'ms-block-search',
    complexity: 'Intermediate',
    linesOfCode: 327,
    timeSavedHours: 8,
    deps: ['@supabase/supabase-js'],
    preview: `const { query, setQuery, results, loading } = useSearch({
  table: 'posts',
  columns: 'id, title, content',
  debounceMs: 250,
})
// results[0].highlight → '…code <b>authentication</b> flow with…'`,
  },
  {
    id: 'fileupload',
    name: 'File Upload',
    tagline: 'Drag-and-drop upload to Supabase Storage',
    description: 'Complete file upload component: drag-and-drop dropzone, MIME type validation, 10 MB size limit, XHR upload with real progress bar, signed URL generation for private files, multi-file support, delete functionality, image preview thumbnails, and per-user storage RLS policies.',
    price: 9,
    category: 'Utility',
    tags: ['upload', 'storage', 'supabase', 'drag-and-drop'],
    repoName: 'ms-block-fileupload',
    complexity: 'Beginner',
    linesOfCode: 347,
    timeSavedHours: 6,
    deps: ['@supabase/supabase-js'],
    preview: `<FileDropzone
  userId={session.user.id}
  accept={{ 'image/*': ['.jpg', '.png', '.webp'], 'application/pdf': ['.pdf'] }}
  maxSizeMb={10}
  onUpload={(file) => console.log(file.url, file.size)}
/>`,
  },
  {
    id: 'analytics',
    name: 'Analytics Tracker',
    tagline: 'Typed event tracking with PostHog + Supabase fallback',
    description: 'Privacy-friendly analytics with a typed event catalogue (20 events), PostHog wrapper with lazy initialization, user identification, usePageTracking() hook for automatic Next.js route tracking, a Supabase self-hosted fallback, and ready-made SQL queries for DAU, WAU, conversion funnel, and retention cohorts.',
    price: 9,
    category: 'Utility',
    tags: ['analytics', 'posthog', 'tracking', 'events'],
    repoName: 'ms-block-analytics',
    complexity: 'Beginner',
    linesOfCode: 279,
    timeSavedHours: 5,
    deps: ['posthog-js'],
    preview: `track('purchase_completed', { blockId: 'auth', amount: 19 })

identifyUser(session.user.id, { email: session.user.email, role: 'user' })

// usePageTracking() in providers.tsx auto-tracks all route changes`,
  },
  {
    id: 'ratelimit',
    name: 'Rate Limiting',
    tagline: 'Sliding window limiter for Next.js API routes',
    description: 'Production rate limiting with in-memory sliding window (works on Vercel, single Lambda) and optional Upstash Redis for multi-instance production. Per-endpoint configs, X-RateLimit headers, 429 responses with Retry-After, withRateLimit() and withAuthRateLimit() wrappers, and a peek function for dashboard display.',
    price: 9,
    category: 'Security',
    tags: ['rate-limit', 'redis', 'upstash', 'api'],
    repoName: 'ms-block-ratelimit',
    complexity: 'Intermediate',
    linesOfCode: 228,
    timeSavedHours: 5,
    deps: ['@upstash/ratelimit', '@upstash/redis'],
    preview: `// Protect an API route:
export const POST = withRateLimit('auth', async (req) => {
  return NextResponse.json({ ok: true })
})
// Automatic 429 + Retry-After on breach. X-RateLimit-* headers on all responses.`,
  },
  {
    id: 'errorhandling',
    name: 'Error Handling',
    tagline: 'Error boundaries, structured logging, typed errors',
    description: 'Complete error handling toolkit: React ErrorBoundary with reset and error ID display, structured JSON logger (debug/info/warn/error), typed custom errors (NotFound, Unauthorized, Forbidden, Validation, RateLimit, ExternalService), handleApiError() for API routes, withErrorHandler() wrapper, and a tryCatch() utility.',
    price: 9,
    category: 'Security',
    tags: ['errors', 'logging', 'boundaries', 'typescript'],
    repoName: 'ms-block-errors',
    complexity: 'Beginner',
    linesOfCode: 276,
    timeSavedHours: 5,
    deps: [],
    preview: `// API route — automatic typed error responses:
export const GET = withErrorHandler(async (req) => {
  const block = getBlock(params.id)
  if (!block) throw new NotFoundError('Block', params.id)
  return Response.json(block)
})

// tryCatch pattern:
const [data, err] = await tryCatch(() => fetchUser(id), 'fetchUser')
if (err) return handleApiError(err)`,
  },
  {
    id: 'seo',
    name: 'SEO Toolkit',
    tagline: 'Metadata, sitemap, robots.txt, JSON-LD schemas',
    description: 'Full SEO setup for Next.js 14: buildMetadata() helper with OG/Twitter Cards, noIndex helper, product/org/article/breadcrumb/software JSON-LD schemas, a JsonLd component for injection, buildSitemapEntry() helper, sitemap.ts and robots.ts templates, and hreflang alternate link support.',
    price: 9,
    category: 'Utility',
    tags: ['seo', 'metadata', 'sitemap', 'json-ld'],
    repoName: 'ms-block-seo',
    complexity: 'Beginner',
    linesOfCode: 284,
    timeSavedHours: 4,
    deps: [],
    preview: `export const metadata = buildMetadata({
  title: 'Auth System — $19',
  description: 'Full NextAuth.js with RBAC…',
  image: '/api/og?title=Auth+System&price=19',
})

// JSON-LD in the page:
<JsonLd schema={productJsonLd({ name: 'Auth System', description: '…', price: 19 })} />`,
  },
  {
    id: 'i18n',
    name: 'Internationalization',
    tagline: 'Locale routing + RTL + currency formatting',
    description: 'Full i18n with next-intl 3.x: locale detection, URL-based routing (as-needed prefix), RTL support for Arabic, INR/USD currency auto-conversion per locale, relative time formatting, ready-made message files for 5 languages (EN/FR/DE/HI/AR), LanguageSwitcher component, and middleware/config templates.',
    price: 14,
    category: 'Utility',
    tags: ['i18n', 'localization', 'rtl', 'next-intl'],
    repoName: 'ms-block-i18n',
    complexity: 'Intermediate',
    linesOfCode: 290,
    timeSavedHours: 8,
    deps: ['next-intl'],
    preview: `formatPrice(19, 'hi', 'USD')  // → ₹1,596
formatPrice(19, 'fr', 'USD')  // → 19 $
formatDate(new Date(), 'ar')  // → ١٦ مارس ٢٠٢٦

// All 5 locales, RTL for Arabic, URL routing built-in`,
  },
  {
    id: 'darkmode',
    name: 'Dark Mode Toggle',
    tagline: 'No-flash system-aware dark mode with 3-way toggle',
    description: 'Polished dark mode: ThemeProvider with system-preference detection and OS change listener, localStorage persistence, no flash on load via inline script, smooth CSS transitions, hydration-safe ThemeToggle button (light/dark/system cycle with SVG icons), useColorScheme hook for raw OS detection without the provider.',
    price: 9,
    category: 'UI',
    tags: ['dark-mode', 'theme', 'tailwind', 'ux'],
    repoName: 'ms-block-darkmode',
    complexity: 'Beginner',
    linesOfCode: 217,
    timeSavedHours: 3,
    deps: [],
    preview: `// app/layout.tsx — zero flash:
<script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />

// In your UI:
<ThemeToggle showLabel />  // cycles: Light → Dark → System

const { theme, resolved, setTheme } = useTheme()`,
  },
  {
    id: 'formvalidation',
    name: 'Form Validation',
    tagline: 'React Hook Form + Zod + reusable Field components',
    description: 'Complete form solution: typed Field, TextareaField (with char counter), SelectField, and CheckboxField components; 6 common Zod schemas (email, password, phone, URL, GitHub username, positive int); pre-built Register, Contact, and ChangePassword forms; multi-step form hook; and a server-side validateBody() helper for API routes.',
    price: 9,
    category: 'UI',
    tags: ['forms', 'zod', 'react-hook-form', 'validation'],
    repoName: 'ms-block-forms',
    complexity: 'Beginner',
    linesOfCode: 357,
    timeSavedHours: 5,
    deps: ['react-hook-form', '@hookform/resolvers', 'zod'],
    preview: `<Field form={form} name="email" label="Email" type="email" required />
<TextareaField form={form} name="bio" label="Bio" maxLength={280} showCount />
<SelectField form={form} name="role" label="Role" options={roleOptions} />
<CheckboxField form={form} name="terms" label="I agree to the terms" />`,
  },
]

export const BUNDLES: Block[] = [
  {
    id:           'bundle-saas-mvp',
    name:         '🚀 Full SaaS MVP',
    tagline:      'Everything to launch in a weekend',
    description:  'Auth + Billing + Admin + Email + Teams — all 5 blocks pre-wired with a shared Supabase schema and no import conflicts. The fastest path from idea to paying customers. Saves $21 vs buying individually.',
    price:         69,
    category:     'Bundle',
    tags:         ['bundle', 'saas', 'mvp', 'complete'],
    repoName:     'ms-bundle-saas-mvp',
    complexity:   'Advanced',
    linesOfCode:  1944,  // 487+405+365+302+385
    timeSavedHours: 70,
    deps:         ['next-auth', '@supabase/supabase-js', 'resend', 'bcryptjs', 'zod'],
    isBundle:     true,
    bundleIds:    ['auth', 'billing', 'admin', 'email', 'team'],
    bundleDiscount: 20,
    preview:      `// 5 blocks · shared schema · 0 conflicts
// auth + billing + admin + email + team
// Deploy-ready — just fill in .env.local`,
  },
  {
    id:           'bundle-growth',
    name:         '📈 Growth Stack',
    tagline:      'Analytics, search, notifications, rate limiting',
    description:  'Four blocks for apps that scale: Analytics Tracker + Full-Text Search + Notifications System + Rate Limiting. All use the same Supabase instance and share no conflicting table names. Saves $8 vs buying individually.',
    price:         35,
    category:     'Bundle',
    tags:         ['bundle', 'growth', 'scale', 'analytics'],
    repoName:     'ms-bundle-growth',
    complexity:   'Intermediate',
    linesOfCode:  1203,  // 279+327+369+228
    timeSavedHours: 28,
    deps:         ['@supabase/supabase-js', 'posthog-js'],
    isBundle:     true,
    bundleIds:    ['analytics', 'notifications', 'search', 'ratelimit'],
    bundleDiscount: 18,
    preview:      `// Track events → Search content → Alert users → Protect APIs
// Drop into any Next.js + Supabase project — no conflicts`,
  },
]

export const ALL_BLOCKS   = [...BLOCKS, ...BUNDLES]
export const CATEGORIES   = [...new Set(BLOCKS.map(b => b.category))] as Block['category'][]
export const getBlock     = (id: string) => ALL_BLOCKS.find(b => b.id === id)
export const totalTimeSaved = BLOCKS.reduce((s, b) => s + b.timeSavedHours, 0)
export const totalLOC       = BLOCKS.reduce((s, b) => s + b.linesOfCode, 0)
