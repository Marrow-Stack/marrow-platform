// ============================================================
// MarrowStack Block: PayPal Checkout
// Stack: Next.js 14 + PayPal REST API v2
// Covers: one-time orders, capture, refunds, webhook
//         verification, token caching, INR display, sandbox/live
// ============================================================

// ── Environment variables required ───────────────────────────
// PAYPAL_CLIENT_ID=
// PAYPAL_CLIENT_SECRET=
// PAYPAL_WEBHOOK_ID=
// PAYPAL_MODE=sandbox   (change to "live" for production)
// NEXT_PUBLIC_APP_URL=

// ── Base URL ──────────────────────────────────────────────────
const BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

// ── Token cache (module-level, survives warm Lambda invocations)
let _token: { value: string; expiresAt: number } | null = null

export async function getPayPalToken(): Promise<string> {
  if (_token && Date.now() < _token.expiresAt) return _token.value

  const creds = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`PayPal auth failed (${res.status}): ${err}`)
  }

  const data = await res.json()
  _token = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  }
  return data.access_token
}

// ── Internal request helper ────────────────────────────────────
async function ppRequest(method: string, path: string, body?: object): Promise<any> {
  const token = await getPayPalToken()
  const requestId = `ms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': requestId,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = json?.message || json?.error_description || `PayPal error ${res.status}`
    throw new Error(`PayPal ${method} ${path} → ${res.status}: ${message}`)
  }
  return json
}

// ── Types ─────────────────────────────────────────────────────
export interface CreateOrderOptions {
  amountUSD: string          // e.g. "19.00"
  description: string
  referenceId?: string       // your internal order/block ID
  returnUrl?: string
  cancelUrl?: string
  customId?: string          // opaque field, echoed back in webhooks
}

export interface PayPalOrder {
  id: string
  status: string
  links: Array<{ rel: string; href: string; method: string }>
  purchase_units: Array<{
    reference_id?: string
    amount: { currency_code: string; value: string }
    custom_id?: string
  }>
}

export interface PayPalCapture {
  id: string
  status: string
  amount: { currency_code: string; value: string }
  seller_protection: { status: string }
  purchase_units: Array<{
    reference_id?: string
    payments: {
      captures: Array<{
        id: string
        status: string
        amount: { currency_code: string; value: string }
        custom_id?: string
      }>
    }
  }>
}

export interface PayPalRefund {
  id: string
  status: string
  amount: { value: string; currency_code: string }
  note_to_payer?: string
}

// ── Order creation ────────────────────────────────────────────
export async function createOrder(opts: CreateOrderOptions): Promise<PayPalOrder> {
  const base = process.env.NEXT_PUBLIC_APP_URL || ''
  return ppRequest('POST', '/v2/checkout/orders', {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: opts.referenceId,
        custom_id: opts.customId,
        description: opts.description,
        amount: {
          currency_code: 'USD',
          value: opts.amountUSD,
        },
      },
    ],
    application_context: {
      brand_name: 'MarrowStack',
      landing_page: 'BILLING',
      shipping_preference: 'NO_SHIPPING',
      user_action: 'PAY_NOW',
      return_url: opts.returnUrl || `${base}/purchase/success`,
      cancel_url: opts.cancelUrl || `${base}/purchase/cancel`,
    },
  })
}

// Convenience: get the approval URL from an order
export function getApprovalUrl(order: PayPalOrder): string {
  const link = order.links.find(l => l.rel === 'approve')
  if (!link) throw new Error('No approval URL in PayPal order response')
  return link.href
}

// ── Order retrieval ────────────────────────────────────────────
export async function getOrder(orderId: string): Promise<PayPalOrder> {
  return ppRequest('GET', `/v2/checkout/orders/${orderId}`)
}

// ── Capture ───────────────────────────────────────────────────
export async function captureOrder(orderId: string): Promise<PayPalCapture> {
  return ppRequest('POST', `/v2/checkout/orders/${orderId}/capture`, {})
}

// Extract the capture ID (needed for refunds)
export function extractCaptureId(capture: PayPalCapture): string | null {
  return capture.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? null
}

// Extract the custom_id echo (your internal reference)
export function extractCustomId(capture: PayPalCapture): string | null {
  return capture.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id ?? null
}

// ── Refunds ───────────────────────────────────────────────────
export async function refundCapture(
  captureId: string,
  opts?: { amountUSD?: string; note?: string }
): Promise<PayPalRefund> {
  const body: Record<string, any> = {}
  if (opts?.amountUSD) {
    body.amount = { value: opts.amountUSD, currency_code: 'USD' }
  }
  if (opts?.note) {
    body.note_to_payer = opts.note.slice(0, 255)
  }
  return ppRequest('POST', `/v2/payments/captures/${captureId}/refund`, body)
}

export async function getCapture(captureId: string) {
  return ppRequest('GET', `/v2/payments/captures/${captureId}`)
}

// ── Webhook signature verification ────────────────────────────
// Always verify webhooks in production. Never trust unverified events.
export async function verifyWebhook(headers: Headers, rawBody: string): Promise<boolean> {
  try {
    const result = await ppRequest('POST', '/v1/notifications/verify-webhook-signature', {
      auth_algo:         headers.get('paypal-auth-algo'),
      cert_url:          headers.get('paypal-cert-url'),
      transmission_id:   headers.get('paypal-transmission-id'),
      transmission_sig:  headers.get('paypal-transmission-sig'),
      transmission_time: headers.get('paypal-transmission-time'),
      webhook_id:        process.env.PAYPAL_WEBHOOK_ID,
      webhook_event:     JSON.parse(rawBody),
    })
    return result.verification_status === 'SUCCESS'
  } catch (err) {
    console.error('[PayPal] Webhook verification failed:', err)
    return false
  }
}

// ── Webhook event types ────────────────────────────────────────
export type PayPalWebhookEvent =
  | 'CHECKOUT.ORDER.APPROVED'
  | 'PAYMENT.CAPTURE.COMPLETED'
  | 'PAYMENT.CAPTURE.REFUNDED'
  | 'PAYMENT.CAPTURE.DENIED'
  | 'BILLING.SUBSCRIPTION.ACTIVATED'
  | 'BILLING.SUBSCRIPTION.CANCELLED'
  | 'BILLING.SUBSCRIPTION.PAYMENT.FAILED'

export interface PayPalWebhookPayload {
  id: string
  event_type: PayPalWebhookEvent
  resource_type: string
  resource: Record<string, any>
  create_time: string
  summary: string
}

// ── Next.js webhook route handler (ready-to-use template) ─────
/*
// app/api/webhooks/paypal/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhook, PayPalWebhookPayload } from '@/blocks/payments'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  const valid = await verifyWebhook(req.headers, rawBody)
  if (!valid) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })

  const event: PayPalWebhookPayload = JSON.parse(rawBody)

  switch (event.event_type) {
    case 'PAYMENT.CAPTURE.COMPLETED': {
      const capture = event.resource
      const captureId = capture.id
      const customId = capture.custom_id    // your blockId:userId
      const amount = capture.amount.value
      // → grant repo access, record purchase in DB
      break
    }
    case 'PAYMENT.CAPTURE.REFUNDED': {
      const refund = event.resource
      // → mark purchase as refunded in DB
      break
    }
  }

  return NextResponse.json({ received: true })
}
*/

// ── API route handler (create-order) ──────────────────────────
/*
// app/api/purchase/create-order/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createOrder, getApprovalUrl } from '@/blocks/payments'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const { blockId, price, name } = await req.json()

  const order = await createOrder({
    amountUSD: price.toFixed(2),
    description: `MarrowStack — ${name}`,
    customId: `${blockId}:${session.user.id}`,
    referenceId: blockId,
  })

  return NextResponse.json({ orderId: order.id, approvalUrl: getApprovalUrl(order) })
}
*/

// ── INR display helpers ────────────────────────────────────────
const USD_TO_INR = 84  // Update this periodically or fetch from an exchange rate API

export const usdToInr = (usd: number): number => Math.round(usd * USD_TO_INR)

export const formatInr = (usd: number): string =>
  `₹${usdToInr(usd).toLocaleString('en-IN')}`

export const formatUsd = (usd: number): string => `$${usd.toFixed(2)}`

export const formatBothCurrencies = (usd: number): string =>
  `${formatUsd(usd)} (≈ ${formatInr(usd)})`

// ── Sandbox test cards ─────────────────────────────────────────
// Use these in sandbox mode:
// Personal account: sb-buyer@personal.example.com / password
// Business account: sb-seller@business.example.com / password
// PayPal Dashboard → Sandbox → Accounts → Generate credentials

// ── Environment setup checklist ───────────────────────────────
/*
1. Create PayPal app at https://developer.paypal.com/dashboard/applications/sandbox
2. Copy Client ID and Secret to .env.local
3. Create webhook at Dashboard → Webhooks:
   URL: https://your-domain.com/api/webhooks/paypal
   Events to subscribe:
     - CHECKOUT.ORDER.APPROVED
     - PAYMENT.CAPTURE.COMPLETED
     - PAYMENT.CAPTURE.REFUNDED
4. Copy Webhook ID to PAYPAL_WEBHOOK_ID
5. Test with sandbox buyer account
6. Switch PAYPAL_MODE=live when ready for production
*/
