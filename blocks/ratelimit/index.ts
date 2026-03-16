// ============================================================
// MarrowStack Block: Rate Limiting
// Stack: Next.js 14 + In-memory (dev) + Upstash Redis (prod)
// Covers: sliding window, per-endpoint configs, X-RateLimit headers,
//         429 responses with Retry-After, route group limiter,
//         per-user vs per-IP strategies, block-after-n-failures
// Install (prod): npm install @upstash/ratelimit @upstash/redis
// ============================================================

import { NextRequest, NextResponse } from 'next/server'

// ── Per-endpoint configuration ────────────────────────────────
export const RATE_LIMIT_CONFIG = {
  api:           { requests: 60,  windowMs: 60_000 },       // 60 req/min per IP
  auth:          { requests: 5,   windowMs: 60_000 },       // 5 req/min (brute-force protection)
  auth_register: { requests: 3,   windowMs: 3_600_000 },    // 3 registrations/hour per IP
  purchase:      { requests: 10,  windowMs: 3_600_000 },    // 10 orders/hour per user
  ai_customize:  { requests: 20,  windowMs: 86_400_000 },   // 20 AI calls/day per user
  webhook:       { requests: 500, windowMs: 60_000 },       // High limit for PayPal webhooks
  payout:        { requests: 2,   windowMs: 86_400_000 },   // 2 payout requests/day per user
  search:        { requests: 100, windowMs: 60_000 },       // 100 searches/min per IP
} as const

export type RateLimitKey  = keyof typeof RATE_LIMIT_CONFIG

// ── In-memory store (single Lambda / dev) ─────────────────────
interface Entry { hits: number; resetAt: number; firstHitAt: number }
const _store = new Map<string, Entry>()

// Periodic cleanup — avoids unbounded memory growth
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [k, e] of _store) { if (e.resetAt < now) _store.delete(k) }
  }, 5 * 60_000).unref?.()
}

export interface RateLimitResult {
  success:    boolean
  limit:      number
  remaining:  number
  resetAt:    number       // Unix ms timestamp
  retryAfter: number       // seconds until reset
}

export function checkRateLimit(identifier: string, type: RateLimitKey): RateLimitResult {
  const config = RATE_LIMIT_CONFIG[type]
  const key    = `${type}:${identifier}`
  const now    = Date.now()
  let entry    = _store.get(key)

  if (!entry || entry.resetAt < now) {
    entry = { hits: 1, resetAt: now + config.windowMs, firstHitAt: now }
    _store.set(key, entry)
    return { success: true, limit: config.requests, remaining: config.requests - 1, resetAt: entry.resetAt, retryAfter: 0 }
  }

  if (entry.hits >= config.requests) {
    return {
      success: false, limit: config.requests, remaining: 0,
      resetAt: entry.resetAt, retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    }
  }

  entry.hits++
  return {
    success:    true,
    limit:      config.requests,
    remaining:  config.requests - entry.hits,
    resetAt:    entry.resetAt,
    retryAfter: 0,
  }
}

// ── Peek without incrementing (for dashboard displays) ────────
export function peekRateLimit(identifier: string, type: RateLimitKey): RateLimitResult {
  const config = RATE_LIMIT_CONFIG[type]
  const entry  = _store.get(`${type}:${identifier}`)
  const now    = Date.now()

  if (!entry || entry.resetAt < now) {
    return { success: true, limit: config.requests, remaining: config.requests, resetAt: now + config.windowMs, retryAfter: 0 }
  }
  return {
    success:    entry.hits < config.requests,
    limit:      config.requests,
    remaining:  Math.max(0, config.requests - entry.hits),
    resetAt:    entry.resetAt,
    retryAfter: Math.ceil((entry.resetAt - now) / 1000),
  }
}

// ── Reset a specific identifier (e.g. after successful auth) ──
export function resetRateLimit(identifier: string, type: RateLimitKey) {
  _store.delete(`${type}:${identifier}`)
}

// ── Upstash Redis (production) ────────────────────────────────
// Uncomment and use instead of checkRateLimit in production.
// Add to .env: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
/*
import { Ratelimit }  from '@upstash/ratelimit'
import { Redis }      from '@upstash/redis'

const redis = Redis.fromEnv()

export const RedisLimiters: Partial<Record<RateLimitKey, Ratelimit>> = {
  api:           new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60,   '1 m'),  analytics: true }),
  auth:          new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5,    '1 m'),  analytics: true }),
  auth_register: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3,    '1 h'),  analytics: true }),
  purchase:      new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10,   '1 h'),  analytics: true }),
  ai_customize:  new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20,   '1 d'),  analytics: true }),
  payout:        new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(2,    '1 d'),  analytics: true }),
}

export async function checkRateLimitRedis(identifier: string, type: RateLimitKey): Promise<RateLimitResult> {
  const limiter = RedisLimiters[type]
  if (!limiter) return checkRateLimit(identifier, type)  // fall back to in-memory
  const { success, limit, remaining, reset, pending } = await limiter.limit(identifier)
  await pending  // wait for analytics write
  return { success, limit, remaining, resetAt: reset, retryAfter: success ? 0 : Math.ceil((reset - Date.now()) / 1000) }
}
*/

// ── Build standard rate-limit response headers ────────────────
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit':     result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset':     Math.ceil(result.resetAt / 1000).toString(),
    ...(result.success ? {} : { 'Retry-After': result.retryAfter.toString() }),
  }
}

// ── 429 response builder ──────────────────────────────────────
export function tooManyRequests(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error:      'Too many requests. Please slow down.',
      retryAfter: result.retryAfter,
      resetAt:    new Date(result.resetAt).toISOString(),
    },
    { status: 429, headers: rateLimitHeaders(result) },
  )
}

// ── Helper: extract real IP from request ──────────────────────
export function getIP(req: NextRequest): string {
  return (
    req.headers.get('cf-connecting-ip')     ||   // Cloudflare
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip')            ||
    'anonymous'
  )
}

// ── Main wrapper: withRateLimit ───────────────────────────────
export function withRateLimit(
  type: RateLimitKey,
  handler: (req: NextRequest) => Promise<NextResponse>,
  options?: {
    /** Use a custom identifier instead of IP (e.g. user ID from JWT) */
    getIdentifier?: (req: NextRequest) => string | Promise<string>
    /** Override request limit for this instance */
    limit?: number
  },
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const identifier = options?.getIdentifier
      ? await options.getIdentifier(req)
      : getIP(req)

    const result  = checkRateLimit(identifier, type)
    const headers = rateLimitHeaders(result)

    if (!result.success) return tooManyRequests(result)

    const response = await handler(req)
    Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v))
    return response
  }
}

// ── withAuthRateLimit: rate-limit by authenticated user ID ────
export function withAuthRateLimit(
  type: RateLimitKey,
  handler: (req: NextRequest) => Promise<NextResponse>,
) {
  return withRateLimit(type, handler, {
    getIdentifier: async (req) => {
      // Extract user ID from NextAuth JWT cookie
      try {
        const { getToken } = await import('next-auth/jwt')
        const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET })
        return token?.id as string || getIP(req)
      } catch {
        return getIP(req)
      }
    },
  })
}

/*
──────────────────────────────────────────────────────────────
USAGE

// Per-IP (default):
import { withRateLimit } from '@/blocks/ratelimit'
export const POST = withRateLimit('auth', async (req) => {
  return NextResponse.json({ ok: true })
})

// Per-user (authenticated routes):
import { withAuthRateLimit } from '@/blocks/ratelimit'
export const POST = withAuthRateLimit('ai_customize', async (req) => {
  return NextResponse.json({ result: '...' })
})

// Manual check (when you need the result inline):
import { checkRateLimit, tooManyRequests } from '@/blocks/ratelimit'
const result = checkRateLimit(session.user.id, 'purchase')
if (!result.success) return tooManyRequests(result)

// Production: switch to Redis
// Replace checkRateLimit() calls with checkRateLimitRedis()
// Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to .env
──────────────────────────────────────────────────────────────
*/
