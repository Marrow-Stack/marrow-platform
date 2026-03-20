// lib/razorpay.ts
// Razorpay REST API — no SDK needed, pure fetch
// Docs: https://razorpay.com/docs/api/

const BASE = 'https://api.razorpay.com/v1'

function auth() {
  return 'Basic ' + Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
  ).toString('base64')
}

async function rz(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: auth(),
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Razorpay ${path} failed (${res.status}): ${JSON.stringify(data)}`)
  return data
}

// ── Live USD→INR rate (server-side, cached in memory) ────────
let _rateCache: { rate: number; fetchedAt: number } | null = null
const RATE_TTL_MS  = 6 * 60 * 60 * 1000  // 6 hours
const FALLBACK_RATE = Number(process.env.USD_TO_INR_RATE) || 84

export async function getLiveUsdToInr(): Promise<number> {
  // Return cached rate if fresh
  if (_rateCache && Date.now() - _rateCache.fetchedAt < RATE_TTL_MS) {
    return _rateCache.rate
  }
  try {
    const res  = await fetch('https://api.frankfurter.app/latest?from=USD&to=INR', {
      next: { revalidate: 21600 },
    })
    if (!res.ok) throw new Error(`Rate API ${res.status}`)
    const data = await res.json()
    const rate = data.rates.INR as number
    _rateCache  = { rate, fetchedAt: Date.now() }
    return rate
  } catch {
    // Silently fall back — never block a purchase over exchange rate
    return _rateCache?.rate || FALLBACK_RATE
  }
}

// Amount is in USD — Razorpay needs INR paise (1 USD ≈ live rate INR, 1 INR = 100 paise)
export function usdToInrPaise(usd: number, rate = FALLBACK_RATE): number {
  return Math.round(usd * rate * 100)  // paise
}

export function inrFromPaise(paise: number): string {
  return (paise / 100).toFixed(2)
}

// Create a Razorpay order
export async function createRazorpayOrder(amountUSD: number, blockId: string, receiptId: string, rate?: number) {
  // Razorpay receipt and notes must be plain alphanumeric — strip emojis/special chars
  const safeReceipt  = receiptId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40)
  const safeBlockId  = blockId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40)

  return rz('/orders', {
    method: 'POST',
    body: JSON.stringify({
      amount:   usdToInrPaise(amountUSD, rate),
      currency: 'INR',
      receipt:  safeReceipt,
      notes:    { block_id: safeBlockId },
    }),
  })
}

// Verify Razorpay webhook signature
import crypto from 'crypto'

export function verifyRazorpayWebhook(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || ''
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  return expected === signature
}

// Verify payment signature (called after successful frontend payment)
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET || ''
  const payload = `${orderId}|${paymentId}`
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return expected === signature
}

// Fetch a payment by ID
export async function fetchPayment(paymentId: string) {
  return rz(`/payments/${paymentId}`)
}

// Refund a payment
export async function refundPayment(paymentId: string, amountPaise?: number) {
  const body = amountPaise ? { amount: amountPaise } : {}
  return rz(`/payments/${paymentId}/refund`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}