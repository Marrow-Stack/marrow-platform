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
  doduProductId?:  string   // Dodo Payments product ID from dashboard
}

export const BLOCKS: Block[] = [
  {
    id: 'auth',
    name: 'Auth System',
    tagline: 'Email + GitHub + Google OAuth with RBAC',
    description: 'The value is in the extras, not the setup: typed RBAC helpers (hasRole, requireRole, withAuth wrapper), full auth event audit log, password reset + email verification flows, and clean Supabase profile sync. The NextAuth config itself is a starting point — customise providers as needed.',
    price: 29,
    category: 'Core',
    tags: ['auth', 'oauth', 'rbac', 'nextauth'],
    repoName: 'ms-block-auth',
    doduProductId:   'pdt_0Nb8ctTSkNUsgTGezEdCm',
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
    tagline: 'One-time + recurring billing + invoices',
    description: 'PayPal REST API billing: one-time orders, monthly/yearly subscription plans, usage-based limits, refunds, HTML invoice generation, and webhook handler. Note: PayPal-only — adapt the patterns for your payment provider of choice.',
    price: 39,
    category: 'Monetization',
    tags: ['subscriptions', 'billing', 'payments'],
    repoName: 'ms-block-billing',
    doduProductId:   'pdt_0Nb8cx0KYZOSZzZKdn5GV',
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
    price: 39,
    category: 'Core',
    tags: ['admin', 'analytics', 'dashboard', 'feature-flags'],
    repoName: 'ms-block-admin',
    doduProductId:   'pdt_0Nb8d0HG8vNRd34NEPvbN',
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
    description: 'Full HTML email suite using Resend: welcome, password reset, email verification, team invite (sendTeamInvite), purchase receipt, refund confirmation, affiliate payout, and batch sending. All templates are mobile-responsive with a shared brand layout. Includes escaping, preview text, and from-name config.',
    price: 19,
    category: 'Utility',
    tags: ['email', 'resend', 'transactional', 'templates'],
    repoName: 'ms-block-email',
    doduProductId:   'pdt_0Nb8d2ZU0vjX1IV3GXeKt',
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
    description: 'Full multi-tenancy: workspace creation, email-based member invitations with 7-day expiring tokens, role hierarchy (owner/admin/member/viewer), role-checking helpers, and RLS policies that isolate data per workspace. Includes invite accept, removeMember, transferOwnership, updateMemberRole, and workspace settings helpers.',
    price: 39,
    category: 'Core',
    tags: ['multi-tenant', 'teams', 'workspaces', 'invites'],
    repoName: 'ms-block-team',
    doduProductId:   'pdt_0Nb8d54FDwCkO2tqwh1DN',
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
    description: 'Standalone PayPal checkout without the billing suite overhead: order creation, capture, full/partial refunds, HMAC webhook verification, token caching, INR display helpers, and a pending_orders table for idempotent capture. Use this if you need one-time payments only, not subscriptions.',
    price: 29,
    category: 'Monetization',
    tags: ['checkout', 'payments', 'one-time'],
    repoName: 'ms-block-payments',
    doduProductId:   'pdt_0Nb8d7b8g29cx7ppl2MH5',
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
    doduProductId:   'pdt_0Nb8dA97L3eq4PLm4gwuI',
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
    description: 'Full notification stack: real-time in-app via Supabase Realtime, unread badge, mark-as-read, bulk archive, and NotificationBell component. Web Push is fully implemented — browser subscription, service worker template, server-side send via web-push npm package, and automatic cleanup of expired subscriptions. Requires VAPID keys (free, generate with npx web-push generate-vapid-keys).',
    price: 19,
    category: 'Utility',
    tags: ['notifications', 'realtime', 'push', 'supabase'],
    repoName: 'ms-block-notifications',
    doduProductId:   'pdt_0Nb8dGX0aPPKnlFxJZ8Vp',
    complexity: 'Intermediate',
    linesOfCode: 489,
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
    description: 'Powerful search on Postgres: generated tsvector columns with GIN indexes, fullTextSearch(), autocomplete(), getFacetCounts(), highlightMatches(), recent searches history, and a debounced useSearch() React hook. Zero external dependencies — uses your existing Supabase instance.',
    price: 19,
    category: 'Utility',
    tags: ['search', 'postgresql', 'full-text', 'tsvector'],
    repoName: 'ms-block-search',
    doduProductId:   'pdt_0Nb8dJxSDc76d0TdigxTF',
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
    doduProductId:   'pdt_0Nb8dOOlM39Mvj5CHLI8L',
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
    doduProductId:   'pdt_0Nb8dRFCa3ldhL8OVec6j',
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
    doduProductId:   'pdt_0Nb8dTpxTjQgelaHmFmt8',
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
    doduProductId:   'pdt_0Nb8dWGkRShBfrLRao3vk',
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
    doduProductId:   'pdt_0Nb8dYrZ7yAY02uTDBybe',
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
    description: 'Full i18n with next-intl 3.x: locale detection, URL-based routing, RTL support for Arabic, INR/USD auto-conversion for Hindi locale, relative time formatting, complete message files for all 5 languages (EN, FR, DE, HI, AR — every key translated), LanguageSwitcher component, and middleware/config templates.',
    price: 19,
    category: 'Utility',
    tags: ['i18n', 'localization', 'rtl', 'next-intl'],
    repoName: 'ms-block-i18n',
    doduProductId:   'pdt_0Nb8di4m6KahbZeLxFuQU',
    complexity: 'Intermediate',
    linesOfCode: 427,
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
    tagline: 'Theme engine: accent colors, auto schedule, contrast checker, animated toggle',
    description: 'Full theme engine beyond a toggle: ThemeProvider with CSS variable injection, custom accent color picker with 6 presets + hex input, auto dark/light by sunrise/sunset (no API — pure math from geolocation), animated sliding pill toggle, ThemedImage (different image per theme), useContrastRatio hook for WCAG accessibility checking, per-brand color config, and hydration-safe no-flash script.',
    price: 19,
    category: 'UI',
    tags: ['dark-mode', 'theme', 'tailwind', 'ux'],
    repoName: 'ms-block-darkmode',
    doduProductId:   'pdt_0Nb8dmTrjX7gs1OEtTyaJ',
    complexity: 'Beginner',
    linesOfCode: 521,
    timeSavedHours: 8,
    deps: [],
    preview: `// Animated sliding pill toggle:
<ThemeToggle variant="pill" />

// Accent color picker — users brand it to their taste:
<AccentPicker presets={['#EFA020', '#3B82F6', '#10B981']} />

// Auto dark at sunset, light at sunrise (no API):
const { sunTimes } = useThemeSchedule(true)

// WCAG contrast ratio checker:
const { ratio, level } = useContrastRatio()
// → { ratio: 7.2, level: 'AAA' }

// Different image per theme:
<ThemedImage light="/logo-light.svg" dark="/logo-dark.svg" alt="Logo" />`,
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
    doduProductId:   'pdt_0Nb8cnyA1pVWgxQYJqcga',
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
    description:  'Auth + Billing + Admin + Email + Teams — all 5 blocks pre-wired with a shared Supabase schema and no import conflicts. The fastest path from idea to paying customers. Saves $86 vs buying individually. 52% off.',
    price:         79,
    category:     'Bundle',
    tags:         ['bundle', 'saas', 'mvp', 'complete'],
    repoName:     'ms-bundle-saas-mvp',
    doduProductId:   'pdt_0Nb8dq4LqoPJoGA9xPHq7',
    complexity:   'Advanced',
    linesOfCode:  1944,  // 487+405+365+302+385
    timeSavedHours: 70,
    deps:         ['next-auth', '@supabase/supabase-js', 'resend', 'bcryptjs', 'zod'],
    isBundle:     true,
    bundleIds:    ['auth', 'billing', 'admin', 'email', 'team'],
    bundleDiscount: 52,
    preview:      `// 5 blocks · shared schema · 0 conflicts
// auth + billing + admin + email + team
// Deploy-ready — just fill in .env.local`,
  },
  {
    id:           'bundle-growth',
    name:         '📈 Growth Stack',
    tagline:      'Analytics, search, notifications, rate limiting',
    description:  'Four blocks for apps that scale: Analytics Tracker + Full-Text Search + Notifications System + Rate Limiting. All use the same Supabase instance and share no conflicting table names. Saves $17 vs buying individually. 30% off.',
    price:         39,
    category:     'Bundle',
    tags:         ['bundle', 'growth', 'scale', 'analytics'],
    repoName:     'ms-bundle-growth',
    doduProductId:   'pdt_0Nb8dsQe3jCwzVcRjM79A',
    complexity:   'Intermediate',
    linesOfCode:  1203,  // 279+327+369+228
    timeSavedHours: 28,
    deps:         ['@supabase/supabase-js', 'posthog-js'],
    isBundle:     true,
    bundleIds:    ['analytics', 'notifications', 'search', 'ratelimit'],
    bundleDiscount: 30,
    preview:      `// Track events → Search content → Alert users → Protect APIs
// Drop into any Next.js + Supabase project — no conflicts`,
  },
]

export const ALL_BLOCKS   = [...BLOCKS, ...BUNDLES]
export const CATEGORIES   = [...new Set(BLOCKS.map(b => b.category))] as Block['category'][]
export const getBlock     = (id: string) => ALL_BLOCKS.find(b => b.id === id)
export const totalTimeSaved = BLOCKS.reduce((s, b) => s + b.timeSavedHours, 0)
export const totalLOC       = BLOCKS.reduce((s, b) => s + b.linesOfCode, 0)
