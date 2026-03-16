# Deploy Right Now — Step by Step

Do these in order. Each step takes 5–15 minutes.

---

## Step 1 — Supabase (20 min)

1. Go to supabase.com → New project
   - Name: marrowstack-prod
   - Region: Southeast Asia (Singapore) — closest to India
   - Password: generate a strong one and save it

2. Wait ~2 min for provisioning

3. Dashboard → SQL Editor → New query → paste entire `scripts/schema.sql` → Run
   - Should say "Success. No rows returned"

4. Settings → API → copy three values into `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```

5. Quick verify: Table Editor — you should see profiles, purchases, pending_orders, etc.

---

## Step 2 — GitHub (15 min)

### OAuth App
1. github.com/settings/developers → OAuth Apps → New OAuth App
   - Application name: MarrowStack
   - Homepage URL: https://marrowstack.dev (or your domain)
   - Callback URL: https://marrowstack.dev/api/auth/callback/github
2. Generate client secret → copy both into `.env.local`:
   ```
   GITHUB_CLIENT_ID=
   GITHUB_CLIENT_SECRET=
   ```

### Personal Access Token
1. github.com/settings/tokens → Generate new token (classic)
   - Note: marrowstack-prod
   - Expiration: No expiration (or 1 year)
   - Scopes: check `repo` only
2. Copy into `.env.local`:
   ```
   GITHUB_PAT=ghp_...
   GITHUB_OWNER=your-github-username
   NEXT_PUBLIC_GITHUB_OWNER=your-github-username
   ```

### Create the 19 repos (takes ~10 min — do this once)
Run this in your terminal (replace YOUR_USERNAME):
```bash
gh auth login
for repo in ms-block-auth ms-block-billing ms-block-admin ms-block-email ms-block-team \
            ms-block-payments ms-block-profile ms-block-notifications ms-block-search \
            ms-block-fileupload ms-block-analytics ms-block-ratelimit ms-block-errors \
            ms-block-seo ms-block-i18n ms-block-darkmode ms-block-forms \
            ms-bundle-saas-mvp ms-bundle-growth; do
  gh repo create YOUR_USERNAME/$repo --private --description "MarrowStack: $repo"
  echo "Created $repo"
done
```

Then push each block file into its repo:
```bash
for block in auth billing admin email team payments profile notifications search \
             fileupload analytics ratelimit errorhandling seo i18n darkmode formvalidation; do
  mkdir -p /tmp/ms-$block && cd /tmp/ms-$block
  git init
  cp /path/to/marrowstack-v2/blocks/$block/index.ts* .
  echo "# ms-block-$block\n\nSee usage instructions in the file header." > README.md
  git add . && git commit -m "Initial block"
  git remote add origin git@github.com:YOUR_USERNAME/ms-block-$block.git
  git push -u origin main
  cd /tmp && rm -rf ms-$block
done
```

---

## Step 3 — PayPal (15 min)

1. developer.paypal.com → My Apps & Credentials → Create App
   - App name: MarrowStack
   - Merchant account
2. Copy Sandbox credentials → `.env.local`:
   ```
   PAYPAL_CLIENT_ID=
   PAYPAL_CLIENT_SECRET=
   PAYPAL_MODE=sandbox
   ```

3. Skip webhook for now — register it after Vercel deploy (you need the live URL)

---

## Step 4 — Resend (5 min)

1. resend.com → API Keys → Create API Key → copy:
   ```
   RESEND_API_KEY=re_...
   FROM_EMAIL=MarrowStack <noreply@yourdomain.com>
   ```
2. For testing: use `onboarding@resend.dev` as FROM_EMAIL (no domain verification needed)
3. Add your domain later for production delivery

---

## Step 5 — Anthropic (2 min)

1. console.anthropic.com → API Keys → Create key:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

---

## Step 6 — Generate secrets (1 min)

```bash
# NEXTAUTH_SECRET
openssl rand -base64 32
```
Add to `.env.local`:
```
NEXTAUTH_SECRET=<output from above>
NEXTAUTH_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

---

## Step 7 — Local test before deploy (10 min)

```bash
npm install
npm run dev
```

Check these manually:
- [ ] http://localhost:3000 loads
- [ ] http://localhost:3000/blocks shows all 17 blocks
- [ ] Sign up with email → dashboard loads
- [ ] Sign in with GitHub → github_username captured in Supabase profiles table

---

## Step 8 — Deploy to Vercel (10 min)

```bash
npm i -g vercel
vercel --prod
```

When prompted:
- Link to existing project? No → create new
- Project name: marrowstack
- Framework: Next.js (auto-detected)

Then go to Vercel dashboard → Project → Settings → Environment Variables
Add every variable from your `.env.local` (except DATABASE_URL — you don't have one).

Redeploy after adding env vars:
```bash
vercel --prod
```

---

## Step 9 — Register PayPal webhook (5 min)

Now that you have a live URL:
1. developer.paypal.com → Webhooks → Add Webhook
2. URL: `https://yourdomain.vercel.app/api/webhooks/paypal`
3. Events to subscribe:
   - CHECKOUT.ORDER.APPROVED
   - PAYMENT.CAPTURE.COMPLETED
   - PAYMENT.CAPTURE.REFUNDED
   - BILLING.SUBSCRIPTION.ACTIVATED
   - BILLING.SUBSCRIPTION.CANCELLED
4. Copy Webhook ID → Vercel env vars → redeploy

---

## Step 10 — End-to-end sandbox test (15 min)

1. Visit your live site → sign up → add GitHub username in dashboard
2. Go to /blocks/ratelimit ($9 — cheapest block)
3. Click Pay → use PayPal sandbox credentials → complete purchase
4. Verify:
   - [ ] /purchase/success shows success page
   - [ ] Dashboard shows the block
   - [ ] GitHub repo invite appears in your test account's email
   - [ ] Purchase confirmation email received in Resend logs

If all 4 pass → you're ready for real payments.

---

## Step 11 — Go live

In Vercel env vars, change:
```
PAYPAL_MODE=live
```

Update PayPal live credentials (same dashboard, toggle to Live):
```
PAYPAL_CLIENT_ID=<live client id>
PAYPAL_CLIENT_SECRET=<live client secret>
```

Register a new webhook pointing to your domain with live PayPal credentials.
Redeploy. Done.

---

## Before your first tweet/post

- [ ] Replace testimonials in `app/page.tsx` with real ones (or remove them)
- [ ] Replace `public/og-default.png.txt` with a real 1200×630px PNG
- [ ] Add "last verified" date to your first few block pages
- [ ] Test the refund flow once: buy → email support → admin triggers refund via /api/purchase/refund

**Estimated total time to deploy: 1.5–2 hours if you have no accounts yet. 30–45 min if you already have Supabase/GitHub/PayPal.**
