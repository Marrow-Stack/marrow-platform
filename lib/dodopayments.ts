// lib/dodopayments.ts
// Dodo Payments API — Checkout Sessions approach (recommended)
// Docs: https://docs.dodopayments.com/developer-resources/integration-guide

const BASE = process.env.DODO_PAYMENTS_MODE === 'test'
  ? 'https://test.dodopayments.com'
  : 'https://live.dodopayments.com'

async function dodo(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DODO_PAYMENTS_API_KEY}`,
      ...(options.headers || {}),
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Dodo ${path} failed (${res.status}): ${JSON.stringify(data)}`)
  return data
}

// Create a checkout session — returns checkout_url to redirect buyer
export async function createCheckoutSession({
  productId,
  customerEmail,
  customerName,
  returnUrl,
  metadata,
}: {
  productId:     string
  customerEmail: string
  customerName:  string
  returnUrl:     string
  metadata?:     Record<string, string>
}) {
  return dodo('/checkouts', {
    method: 'POST',
    body: JSON.stringify({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer:     { email: customerEmail, name: customerName },
      return_url:   returnUrl,
      ...(metadata ? {
        metadata: Object.fromEntries(
          Object.entries(metadata).map(([k, v]) => [`metadata_${k}`, v])
        )
      } : {}),
    }),
  })
}

// Fetch a payment by ID to verify it succeeded
export async function getPayment(paymentId: string) {
  return dodo(`/payments/${paymentId}`)
}

// Issue a refund on a payment
export async function refundPayment(paymentId: string) {
  return dodo(`/payments/${paymentId}/refund`, { method: 'POST', body: '{}' })
}

// Verify webhook signature using standardwebhooks spec
import { Webhook } from 'standardwebhooks'

export async function verifyDodoWebhook(
  rawBody: string,
  headers: { 'webhook-id': string; 'webhook-signature': string; 'webhook-timestamp': string }
): Promise<boolean> {
  try {
    const wh = new Webhook(process.env.DODO_PAYMENTS_WEBHOOK_SECRET!)
    await wh.verify(rawBody, headers)
    return true
  } catch {
    return false
  }
}