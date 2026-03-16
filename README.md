# MarrowStack

Production-ready Next.js code blocks marketplace. Buy a block, get instant GitHub repo access, copy the code into your project.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase · NextAuth.js · PayPal REST API · Resend · Claude API · Vercel

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env.local
# Fill in all values (see Environment Variables below)

# 3. Set up Supabase
# Create a new project at supabase.com
# Run scripts/schema.sql in the SQL editor

# 4. Run locally
npm run dev
```

---

## Environment variables

Copy `.env.example` to `.env.local` and fill in every value. Required vars:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `NEXTAUTH_SECRET` | Random string ≥ 32 chars: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Your domain, e.g. `https://marrowstack.dev` |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `GITHUB_PAT` | GitHub Personal Access Token (repo scope) |
| `GITHUB_OWNER` | Your GitHub username/org that owns the block repos |
| `NEXT_PUBLIC_GITHUB_OWNER` | Same as above (exposed to browser for repo links) |
| `PAYPAL_CLIENT_ID` | PayPal app client ID |
| `PAYPAL_CLIENT_SECRET` | PayPal app client secret |
| `PAYPAL_MODE` | `sandbox` or `live` |
| `PAYPAL_WEBHOOK_ID` | PayPal webhook ID (from developer dashboard) |
| `RESEND_API_KEY` | Resend API key |
| `FROM_EMAIL` | Sender address, e.g. `MarrowStack <noreply@yourdomain.com>` |
| `ANTHROPIC_API_KEY` | Anthropic API key (for AI customization feature) |
| `NEXT_PUBLIC_APP_URL` | Your full domain URL |

Optional:
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Enable Google OAuth in auth block |
| `PAYPAL_PRO_MONTHLY_PLAN_ID` / `_YEARLY_PLAN_ID` | For billing block subscriptions |

---

## Project structure

```
app/
├── page.tsx                    # Landing page
├── blocks/
│   ├── page.tsx                # All blocks listing
│   └── [id]/page.tsx           # Block detail + purchase
├── auth/signin  signup         # Authentication
├── dashboard/                  # User dashboard (blocks, affiliate, AI)
├── admin/                      # Admin panel (role-protected)
├── affiliate/                  # Affiliate program page
├── invite/[token]/             # Team workspace invite accept
├── purchase/success  cancel    # PayPal redirect handlers
├── api/
│   ├── auth/[...nextauth]/     # NextAuth handler
│   ├── auth/register/          # User registration
│   ├── purchase/               # create-order, capture, refund
│   ├── webhooks/paypal/        # PayPal webhook (fallback capture)
│   ├── affiliate/              # Affiliate data
│   ├── payout/                 # Affiliate payout request
│   ├── customize/              # AI block customization
│   ├── dashboard/purchases/    # User's purchase history
│   ├── profile/                # Profile update
│   ├── invite/                 # Team invite accept
│   └── og/                     # Dynamic OG image generation
├── not-found.tsx               # 404 page
├── error.tsx                   # Global error boundary
└── loading.tsx                 # Route loading state

blocks/                         # The 17 purchasable blocks (shipped to buyers via GitHub)
├── auth/         billing/      admin/         email/
├── team/         payments/     profile/       notifications/
├── search/       fileupload/   analytics/     ratelimit/
├── errorhandling/ seo/         i18n/          darkmode/
└── formvalidation/

components/
├── Navbar.tsx    BlockCard.tsx    PaymentButton.tsx
├── CodePreview.tsx               GuaranteeBadge.tsx

lib/
├── auth.ts       supabase.ts      paypal.ts
├── github.ts     email.ts         claude.ts
└── blocksData.ts                  (block metadata + pricing)
```

---

## The 17 blocks

| Block | Price | Lines | Description |
|---|---|---|---|
| Auth System | $19 | 487 | Email + GitHub + Google OAuth, RBAC, password reset |
| Billing & Subscriptions | $29 | 405 | PayPal one-time + subscriptions, invoices |
| Admin Dashboard | $24 | 365 | User CRUD, revenue analytics, feature flags |
| Email System | $14 | 302 | 8 HTML email templates via Resend |
| Team & Workspaces | $24 | 385 | Multi-tenant, invites, role hierarchy |
| PayPal Checkout | $19 | 326 | Orders, capture, refunds, webhook verification |
| User Profile | $9 | 193 | Avatar upload, editable fields, Supabase Storage |
| Notifications | $14 | 369 | Real-time Supabase + Web Push |
| Full-Text Search | $14 | 327 | PostgreSQL tsvector, highlights, autocomplete |
| File Upload | $9 | 347 | Drag-and-drop, progress, signed URLs |
| Analytics Tracker | $9 | 279 | PostHog + Supabase fallback, typed events |
| Rate Limiting | $9 | 228 | Sliding window, in-memory + Upstash Redis |
| Error Handling | $9 | 276 | Typed errors, boundaries, structured logging |
| SEO Toolkit | $9 | 284 | Metadata, JSON-LD, sitemap, robots |
| Internationalization | $14 | 290 | next-intl, 5 languages, RTL, INR formatting |
| Dark Mode Toggle | $9 | 217 | No-flash, system-aware, 3-way toggle |
| Form Validation | $9 | 357 | Field components, Zod schemas, pre-built forms |

**Bundles:**
- 🚀 Full SaaS MVP — $69 (Auth + Billing + Admin + Email + Teams)
- 📈 Growth Stack — $35 (Analytics + Search + Notifications + Rate Limiting)

---

## Payment flow

1. User clicks "Pay via PayPal" on a block page
2. `POST /api/purchase/create-order` → creates PayPal order + writes `pending_orders` row
3. User is redirected to PayPal approval page
4. After approval, PayPal redirects to `/purchase/success?token=ORDER_ID`
5. `POST /api/purchase/capture` → captures payment + grants GitHub repo access + sends email
6. Webhook at `/api/webhooks/paypal` provides fallback in case redirect fails

---

## Deployment (Vercel)

```bash
# Deploy
vercel --prod

# Set environment variables
vercel env add NEXTAUTH_SECRET
# ... (add all vars from .env.example)
```

The `vercel.json` sets the region to `sin1` (Singapore) for low latency in India.

---

## Affiliate program

- Users get a unique `?ref=CODE` link on signup
- 25% commission on all referred purchases
- Tracked via `affiliate_earnings` table
- Payout available when balance ≥ $50 (manual PayPal transfer or automate with Payouts API)

---

## AI customization

Uses Claude claude-sonnet-4-5 to modify block code based on natural language instructions.  
Each user gets 3 free credits on signup. Pro subscribers get unlimited.

---

## License

MarrowStack source code is private. Purchased blocks are licensed for unlimited personal and commercial use in your own projects. You may not resell or redistribute block code as standalone products.
