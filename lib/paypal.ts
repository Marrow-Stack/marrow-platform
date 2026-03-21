// lib/paypal.ts
const BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

let cachedToken: { token: string; expires: number } | null = null

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires) return cachedToken.token

  const creds = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64')
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`PayPal auth failed: ${JSON.stringify(data)}`)
  cachedToken = { token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 }
  return data.access_token
}

async function pp(path: string, options: RequestInit = {}) {
  const token = await getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': crypto.randomUUID(),
      ...(options.headers || {}),
    },
  })
  if (!res.ok && res.status !== 422) {
    const text = await res.text()
    throw new Error(`PayPal ${path} failed (${res.status}): ${text}`)
  }
  return res.json()
}

export async function createOrder(amount: string, description: string) {
  // Build purchase unit — only add payee if PAYPAL_MERCHANT_ID is set
  const purchaseUnit: Record<string, unknown> = {
    amount: { currency_code: 'USD', value: amount },
    description,
  }
  if (process.env.PAYPAL_MERCHANT_ID) {
    purchaseUnit.payee = { merchant_id: process.env.PAYPAL_MERCHANT_ID }
  }

  return pp('/v2/checkout/orders', {
    method: 'POST',
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [purchaseUnit],
      application_context: {
        brand_name: 'MarrowStack',
        landing_page: 'LOGIN',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/purchase/success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/purchase/cancel`,
      },
    }),
  })
}

export async function captureOrder(orderId: string) {
  return pp(`/v2/checkout/orders/${orderId}/capture`, { method: 'POST', body: '{}' })
}

export async function refundCapture(captureId: string, amount?: string) {
  const body = amount ? JSON.stringify({ amount: { value: amount, currency_code: 'USD' } }) : '{}'
  return pp(`/v2/payments/captures/${captureId}/refund`, { method: 'POST', body })
}

export async function createSubscription(planId: string, email: string) {
  return pp('/v1/billing/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      plan_id: planId,
      subscriber: { email_address: email },
      application_context: {
        brand_name: 'MarrowStack',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?sub=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      },
    }),
  })
}

export async function verifyWebhookSignature(headers: Headers, rawBody: string): Promise<boolean> {
  try {
    const data = await pp('/v1/notifications/verify-webhook-signature', {
      method: 'POST',
      body: JSON.stringify({
        auth_algo: headers.get('paypal-auth-algo'),
        cert_url: headers.get('paypal-cert-url'),
        transmission_id: headers.get('paypal-transmission-id'),
        transmission_sig: headers.get('paypal-transmission-sig'),
        transmission_time: headers.get('paypal-transmission-time'),
        webhook_id: process.env.PAYPAL_WEBHOOK_ID,
        webhook_event: JSON.parse(rawBody),
      }),
    })
    return data.verification_status === 'SUCCESS'
  } catch {
    return false
  }
}