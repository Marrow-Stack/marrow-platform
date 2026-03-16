// ============================================================
// MarrowStack Block: Billing & Subscriptions
// Stack: Next.js 14 + PayPal REST API + Supabase
// Covers: one-time, monthly/yearly subscriptions, usage limits,
//         invoices, refunds, upgrade/downgrade, webhook events
// ============================================================

// ── SQL Migration ─────────────────────────────────────────────
/*
CREATE TABLE subscriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  paypal_sub_id       TEXT UNIQUE NOT NULL,
  plan_id             TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','paused','cancelled','expired')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end  TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sub_own"   ON subscriptions FOR SELECT USING (user_id::text = auth.uid()::text);
CREATE POLICY "sub_admin" ON subscriptions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id::text = auth.uid()::text AND role IN ('admin','super_admin'))
);

CREATE TABLE invoices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount      DECIMAL(10,2) NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'USD',
  description TEXT,
  paypal_id   TEXT UNIQUE,
  status      TEXT NOT NULL DEFAULT 'paid'
                CHECK (status IN ('paid','refunded','failed')),
  line_items  JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_own"   ON invoices FOR SELECT USING (user_id::text = auth.uid()::text);
CREATE POLICY "inv_admin" ON invoices FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id::text = auth.uid()::text AND role IN ('admin','super_admin'))
);

CREATE TABLE usage_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feature    TEXT NOT NULL,
  quantity   INT NOT NULL DEFAULT 1,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
*/

// ── Plans configuration ────────────────────────────────────────
export interface BillingPlan {
  id: string
  paypalPlanId: string
  name: string
  price: number
  priceINR: number
  interval: 'MONTH' | 'YEAR'
  yearlyEquivalent?: number
  features: string[]
  limits: Record<string, number | 'unlimited'>
  badge?: string
  popular?: boolean
}

export const BILLING_PLANS: BillingPlan[] = [
  {
    id:            'pro_monthly',
    paypalPlanId:  process.env.PAYPAL_PRO_MONTHLY_PLAN_ID || '',
    name:          'Pro Monthly',
    price:         9,
    priceINR:      756,
    interval:      'MONTH',
    badge:         'Most popular',
    popular:       true,
    features:      [
      'Unlimited AI customizations',
      'Priority email support',
      'Access to beta blocks',
      'Discord community access',
    ],
    limits: {
      ai_customizations: 'unlimited',
      api_calls_per_day: 1000,
      team_members:      5,
    },
  },
  {
    id:              'pro_yearly',
    paypalPlanId:    process.env.PAYPAL_PRO_YEARLY_PLAN_ID || '',
    name:            'Pro Yearly',
    price:           79,
    priceINR:        6636,
    interval:        'YEAR',
    yearlyEquivalent: 7.58,
    badge:           'Save 16%',
    features:        [
      'Everything in Pro Monthly',
      '2 months free',
      'Dedicated onboarding call',
      'Invoice / receipt for GST',
    ],
    limits: {
      ai_customizations: 'unlimited',
      api_calls_per_day: 5000,
      team_members:      20,
    },
  },
]

export const FREE_LIMITS: Record<string, number> = {
  ai_customizations: 3,
  api_calls_per_day: 100,
  team_members:      1,
}

export const USAGE_LIMITS = { FREE_LIMITS, PLANS: BILLING_PLANS }

// ── PayPal token cache ─────────────────────────────────────────
const BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

let _ppToken: { value: string; expires: number } | null = null

async function getPayPalToken(): Promise<string> {
  if (_ppToken && Date.now() < _ppToken.expires) return _ppToken.value
  const creds = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64')
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })
  const data = await res.json()
  _ppToken = { value: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 }
  return data.access_token
}

async function pp(method: string, path: string, body?: object) {
  const token = await getPayPalToken()
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization:   `Bearer ${token}`,
      'Content-Type':  'application/json',
      'PayPal-Request-Id': `ms-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`PayPal ${method} ${path} → ${res.status}: ${JSON.stringify(json)}`)
  return json
}

// ── One-time orders ───────────────────────────────────────────
export async function createOneTimeOrder(amountUSD: string, description: string, returnBase?: string) {
  const base = returnBase || process.env.NEXT_PUBLIC_APP_URL || ''
  return pp('POST', '/v2/checkout/orders', {
    intent: 'CAPTURE',
    purchase_units: [{
      amount: { currency_code: 'USD', value: amountUSD },
      description,
    }],
    application_context: {
      brand_name:          'MarrowStack',
      landing_page:        'BILLING',
      shipping_preference: 'NO_SHIPPING',
      user_action:         'PAY_NOW',
      return_url:          `${base}/purchase/success`,
      cancel_url:          `${base}/purchase/cancel`,
    },
  })
}

export async function captureOneTimeOrder(orderId: string) {
  return pp('POST', `/v2/checkout/orders/${orderId}/capture`, {})
}

export async function getOrder(orderId: string) {
  return pp('GET', `/v2/checkout/orders/${orderId}`)
}

// ── Subscriptions ─────────────────────────────────────────────
export async function createSubscription(planId: string, subscriberEmail: string, returnBase?: string) {
  const plan = BILLING_PLANS.find(p => p.id === planId)
  if (!plan) throw new Error(`Unknown plan: ${planId}`)
  const base = returnBase || process.env.NEXT_PUBLIC_APP_URL || ''
  return pp('POST', '/v1/billing/subscriptions', {
    plan_id: plan.paypalPlanId,
    subscriber: { email_address: subscriberEmail },
    application_context: {
      brand_name:       'MarrowStack',
      shipping_preference: 'NO_SHIPPING',
      user_action:      'SUBSCRIBE_NOW',
      return_url:       `${base}/subscription/success`,
      cancel_url:       `${base}/subscription/cancel`,
    },
  })
}

export async function cancelSubscription(paypalSubId: string, reason = 'User-requested cancellation') {
  await pp('POST', `/v1/billing/subscriptions/${paypalSubId}/cancel`, { reason })
}

export async function suspendSubscription(paypalSubId: string, reason = 'User-requested suspension') {
  await pp('POST', `/v1/billing/subscriptions/${paypalSubId}/suspend`, { reason })
}

export async function reactivateSubscription(paypalSubId: string, reason = 'User-requested reactivation') {
  await pp('POST', `/v1/billing/subscriptions/${paypalSubId}/activate`, { reason })
}

export async function getSubscriptionDetails(paypalSubId: string) {
  return pp('GET', `/v1/billing/subscriptions/${paypalSubId}`)
}

// ── Refunds ───────────────────────────────────────────────────
export async function issueRefund(captureId: string, amountUSD?: string, reason?: string) {
  const body: Record<string, any> = {}
  if (amountUSD) body.amount = { value: amountUSD, currency_code: 'USD' }
  if (reason)    body.note_to_payer = reason
  return pp('POST', `/v2/payments/captures/${captureId}/refund`, body)
}

// ── Webhook verification ──────────────────────────────────────
export async function verifyPayPalWebhook(headers: Headers, rawBody: string): Promise<boolean> {
  try {
    const res = await pp('POST', '/v1/notifications/verify-webhook-signature', {
      auth_algo:         headers.get('paypal-auth-algo'),
      cert_url:          headers.get('paypal-cert-url'),
      transmission_id:   headers.get('paypal-transmission-id'),
      transmission_sig:  headers.get('paypal-transmission-sig'),
      transmission_time: headers.get('paypal-transmission-time'),
      webhook_id:        process.env.PAYPAL_WEBHOOK_ID,
      webhook_event:     JSON.parse(rawBody),
    })
    return res.verification_status === 'SUCCESS'
  } catch {
    return false
  }
}

// ── Supabase billing helpers ──────────────────────────────────
import { createClient } from '@supabase/supabase-js'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function getUserSubscription(userId: string) {
  const { data } = await db
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

export async function upsertSubscription(data: {
  userId: string
  paypalSubId: string
  planId: string
  status: string
  periodEnd?: Date
}) {
  const { error } = await db.from('subscriptions').upsert({
    user_id:              data.userId,
    paypal_sub_id:        data.paypalSubId,
    plan_id:              data.planId,
    status:               data.status,
    current_period_end:   data.periodEnd?.toISOString(),
    updated_at:           new Date().toISOString(),
  }, { onConflict: 'paypal_sub_id' })
  if (error) throw error
}

export async function getUserInvoices(userId: string, limit = 20) {
  const { data } = await db
    .from('invoices')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data || []
}

export async function createInvoiceRecord(data: {
  userId: string
  amount: number
  description: string
  paypalId?: string
  lineItems?: Array<{ name: string; quantity: number; unit_price: number }>
}) {
  const { data: inv, error } = await db
    .from('invoices')
    .insert({
      user_id:     data.userId,
      amount:      data.amount,
      description: data.description,
      paypal_id:   data.paypalId,
      line_items:  data.lineItems,
    })
    .select('id')
    .single()
  if (error) throw error
  return inv
}

// ── Usage tracking ────────────────────────────────────────────
export async function trackUsage(userId: string, feature: string, quantity = 1, metadata?: object) {
  await db.from('usage_events').insert({ user_id: userId, feature, quantity, metadata })
}

export async function getUsageThisPeriod(userId: string, feature: string): Promise<number> {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const { data } = await db
    .from('usage_events')
    .select('quantity')
    .eq('user_id', userId)
    .eq('feature', feature)
    .gte('created_at', startOfMonth.toISOString())
  return (data || []).reduce((sum, row) => sum + row.quantity, 0)
}

export async function checkUsageLimit(userId: string, feature: string, hasPro: boolean): Promise<{
  allowed: boolean
  used: number
  limit: number | 'unlimited'
}> {
  const limit = hasPro
    ? (BILLING_PLANS.find(p => p.id === 'pro_monthly')?.limits[feature] ?? 'unlimited')
    : (FREE_LIMITS[feature] ?? 0)

  if (limit === 'unlimited') return { allowed: true, used: 0, limit: 'unlimited' }
  const used = await getUsageThisPeriod(userId, feature)
  return { allowed: used < (limit as number), used, limit: limit as number }
}

// ── Invoice HTML generator (for email/download) ───────────────
export function generateInvoiceHTML(opts: {
  invoiceNumber: string
  date: string
  customerName: string
  customerEmail: string
  items: Array<{ name: string; quantity: number; unitPrice: number }>
  currency?: string
}) {
  const currency = opts.currency || 'USD'
  const subtotal = opts.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const symbol   = currency === 'USD' ? '$' : '₹'
  const rows = opts.items.map(i => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #eee">${i.name}</td>
      <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
      <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right">${symbol}${i.unitPrice.toFixed(2)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right">${symbol}${(i.quantity * i.unitPrice).toFixed(2)}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body{font-family:system-ui,sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:40px 20px}
  .logo{font-weight:900;font-size:22px;color:#EFA020}
  .meta{color:#666;font-size:14px;margin:8px 0}
  table{width:100%;border-collapse:collapse;margin-top:24px}
  th{text-align:left;padding:8px 0;border-bottom:2px solid #111;font-size:13px;color:#666;text-transform:uppercase}
  .total{font-weight:700;font-size:16px;text-align:right;margin-top:16px}
  .footer{margin-top:40px;font-size:12px;color:#999;text-align:center}
</style></head>
<body>
  <div class="logo">⬡ MarrowStack</div>
  <div class="meta">Invoice #${opts.invoiceNumber}</div>
  <div class="meta">Date: ${opts.date}</div>
  <div class="meta">Bill to: ${opts.customerName} &lt;${opts.customerEmail}&gt;</div>
  <table>
    <thead><tr><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="total">Total: ${symbol}${subtotal.toFixed(2)} ${currency}</div>
  <div class="footer">MarrowStack · marrowstack.dev · support@marrowstack.dev<br>Non-refundable after 30-day window. Thank you for your purchase.</div>
</body></html>`
}

// ── INR display helpers ────────────────────────────────────────
const USD_TO_INR = 84

export const usdToInr    = (usd: number) => Math.round(usd * USD_TO_INR)
export const formatInr   = (usd: number) => `₹${usdToInr(usd).toLocaleString('en-IN')}`
export const formatUsd   = (usd: number) => `$${usd.toFixed(2)}`
