# MarrowStack — Pre-Launch Checklist

Work through every item in order. Each section has a ✅ when done.

---

## 1. Supabase setup

- [ ] Create a new project at supabase.com (choose a region close to Singapore — `ap-southeast-1`)
- [ ] Copy Project URL and API keys to `.env.local`
- [ ] Run `scripts/schema.sql` in the Supabase SQL editor (Dashboard → SQL Editor → New query → paste → Run)
- [ ] Verify tables exist: `profiles`, `purchases`, `pending_orders`, `affiliate_earnings`, `payout_requests`, `notifications`, `workspaces`, `workspace_members`, `workspace_invites`
- [ ] Verify RLS is enabled on all tables (Table Editor → click each table → check RLS badge)
- [ ] Verify `add_affiliate_balance` function exists (Database → Functions)

---

## 2. GitHub setup

### OAuth App (for user login)
- [ ] Go to github.com/settings/developers → OAuth Apps → New OAuth App
- [ ] Homepage URL: `https://yourdomain.com`
- [ ] Authorization callback URL: `https://yourdomain.com/api/auth/callback/github`
- [ ] Copy Client ID and Client Secret to `.env.local`

### Personal Access Token (for granting repo access to buyers)
- [ ] Go to github.com/settings/tokens → Generate new token (classic)
- [ ] Name: `marrowstack-prod`
- [ ] Scopes: check `repo` (Full control of private repositories)
- [ ] Copy token to `GITHUB_PAT` in `.env.local`
- [ ] Set `GITHUB_OWNER` and `NEXT_PUBLIC_GITHUB_OWNER` to your GitHub username

### Block repositories
- [ ] Create all 17 private repos under your account with exact names:
  - `ms-block-auth`, `ms-block-billing`, `ms-block-admin`, `ms-block-email`, `ms-block-team`
  - `ms-block-payments`, `ms-block-profile`, `ms-block-notifications`, `ms-block-search`
  - `ms-block-fileupload`, `ms-block-analytics`, `ms-block-ratelimit`, `ms-block-errors`
  - `ms-block-seo`, `ms-block-i18n`, `ms-block-darkmode`, `ms-block-forms`
  - `ms-bundle-saas-mvp`, `ms-bundle-growth`
- [ ] Push the contents of `blocks/<id>/index.ts` into each corresponding repo's root as `index.ts` (plus a `README.md` with usage instructions)
- [ ] **Test**: Manually invite a test GitHub account to one repo and verify you can see it

---

## 3. PayPal setup

### App credentials
- [ ] Go to developer.paypal.com → My Apps → Create App
- [ ] Name: `MarrowStack`
- [ ] Copy Sandbox Client ID and Secret to `.env.local` (set `PAYPAL_MODE=sandbox` first)

### Webhook
- [ ] In PayPal developer dashboard → Webhooks → Add Webhook
- [ ] URL: `https://yourdomain.com/api/webhooks/paypal`
- [ ] Subscribe to these events:
  - `CHECKOUT.ORDER.APPROVED`
  - `PAYMENT.CAPTURE.COMPLETED`
  - `PAYMENT.CAPTURE.REFUNDED`
  - `BILLING.SUBSCRIPTION.ACTIVATED`
  - `BILLING.SUBSCRIPTION.CANCELLED`
- [ ] Copy Webhook ID to `PAYPAL_WEBHOOK_ID` in `.env.local`

### Sandbox test
- [ ] Create a PayPal sandbox buyer account at developer.paypal.com → Sandbox Accounts
- [ ] Run `npm run dev` locally
- [ ] Sign up for an account with a real GitHub username
- [ ] Buy the cheapest block ($9) using sandbox credentials
- [ ] Verify: `purchases` row created in Supabase
- [ ] Verify: GitHub repo invite sent and accepted
- [ ] Verify: purchase email received
- [ ] Verify: block appears in dashboard

### Go live
- [ ] Switch `PAYPAL_MODE=live` in `.env.local` / Vercel env vars
- [ ] Update webhook URL to production domain in PayPal dashboard
- [ ] Do one real $1 test purchase on live mode before announcing

---

## 4. Email (Resend)

- [ ] Sign up at resend.com
- [ ] Add your sending domain (e.g. `marrowstack.dev`) and verify DNS records
  - Or use the Resend subdomain for testing: `onboarding@resend.dev`
- [ ] Create API key → copy to `RESEND_API_KEY`
- [ ] Set `FROM_EMAIL` to `MarrowStack <noreply@yourdomain.com>`
- [ ] Test: trigger a purchase in sandbox → verify email arrives and doesn't land in spam

---

## 5. Anthropic (AI customization)

- [ ] Sign up at console.anthropic.com
- [ ] Create API key → copy to `ANTHROPIC_API_KEY`
- [ ] Test: buy a block in sandbox, go to Dashboard → Customize → pick the block → enter an instruction

---

## 6. Vercel deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Environment variables to set in Vercel dashboard
Go to Project → Settings → Environment Variables and add all of these:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXTAUTH_SECRET          # openssl rand -base64 32
NEXTAUTH_URL             # https://yourdomain.com
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
GITHUB_PAT
GITHUB_OWNER
NEXT_PUBLIC_GITHUB_OWNER
PAYPAL_CLIENT_ID
PAYPAL_CLIENT_SECRET
PAYPAL_MODE              # sandbox → live when ready
PAYPAL_WEBHOOK_ID
RESEND_API_KEY
FROM_EMAIL
ANTHROPIC_API_KEY
NEXT_PUBLIC_APP_URL      # https://yourdomain.com
```

- [ ] All env vars set in Vercel
- [ ] Custom domain connected and SSL active
- [ ] Visit `https://yourdomain.com` — landing page loads
- [ ] Visit `https://yourdomain.com/blocks` — all 17 blocks listed
- [ ] Sign up → dashboard loads
- [ ] `https://yourdomain.com/sitemap.xml` — all URLs present

---

## 7. OG image

- [ ] Replace `public/og-default.png.txt` with an actual `og-default.png` (1200×630px)
  - Quick option: visit `https://yourdomain.com/api/og` after deploy — save the rendered image
  - Or: generate with Figma / Canva using the MarrowStack brand colors (#EFA020 accent, #100F0A dark bg)
- [ ] Test OG preview at cards.twitter.com/validator and opengraph.xyz

---

## 8. Pre-launch smoke test (production)

Run through this exact flow on production before any announcement:

- [ ] Load homepage — hero, stats, blocks grid all render
- [ ] Toggle dark/light mode — no flash, persists on refresh
- [ ] Click a block → detail page loads with correct price, tags, preview code
- [ ] Sign up with email — welcome email arrives, dashboard loads
- [ ] Sign up with GitHub OAuth — GitHub username captured automatically
- [ ] Attempt purchase without GitHub username → warning banner shown
- [ ] Complete a sandbox purchase → success page, GitHub invite, email
- [ ] Check dashboard → block appears, GitHub link works
- [ ] Test affiliate link (`?ref=yourcode`) → commission tracked on purchase
- [ ] Test 404 → custom not-found page shows
- [ ] Test `/admin` as non-admin → redirected to /dashboard
- [ ] Test `/admin` as admin (set role='admin' in Supabase for your account) → stats load

---

## 9. After launch

- [ ] Set up Vercel Analytics (free tier — just enable in dashboard)
- [ ] Add your site to Google Search Console → submit sitemap
- [ ] Monitor Supabase logs for any RLS errors (Dashboard → Logs → Postgres)
- [ ] Monitor Vercel function logs for any webhook failures
- [ ] Set a calendar reminder to manually process payout requests weekly

---

## Known limitations to document for users

- GitHub repo access is granted via collaborator invite (7-day expiry). If the buyer doesn't accept within 7 days, they need to contact support to re-invite. Consider adding a re-invite button to the dashboard as a follow-up feature.
- The affiliate payout is currently manual (you request it, admin sends via PayPal). To automate, integrate the PayPal Payouts API in `/api/payout/route.ts`.
- Rate limiting uses in-memory store on Vercel (resets per Lambda cold start). For production under high load, uncomment the Upstash Redis path in `blocks/ratelimit/index.ts`.
