// ============================================================
// MarrowStack Block: Analytics Tracker
// Stack: Next.js 14 + PostHog + Supabase self-hosted fallback
// Covers: typed events, PostHog wrapper, page tracking hook,
//         user identification, funnel SQL queries, React Provider,
//         session tracking, self-hosted Supabase fallback API
// Install: npm install posthog-js
// ============================================================
'use client'

// ── Typed event catalogue ─────────────────────────────────────
export type AnalyticsEvent =
  | 'page_view'
  | 'user_signup'
  | 'user_login'
  | 'user_logout'
  | 'purchase_started'
  | 'purchase_completed'
  | 'purchase_failed'
  | 'purchase_refunded'
  | 'block_preview_viewed'
  | 'block_detail_viewed'
  | 'affiliate_link_clicked'
  | 'affiliate_link_copied'
  | 'ai_customize_used'
  | 'ai_customize_copied'
  | 'feature_flag_evaluated'
  | 'error_boundary_triggered'
  | 'search_performed'
  | 'file_uploaded'
  | 'notification_read'
  | 'invite_sent'
  | 'workspace_created'

export interface EventProperties {
  [key: string]: string | number | boolean | null | undefined
}

// ── PostHog wrapper ───────────────────────────────────────────
let _posthog: any = null

export interface AnalyticsConfig {
  posthogKey:  string
  apiHost?:    string   // default: https://app.posthog.com
  debug?:      boolean
  disabled?:   boolean  // e.g. for test environments
}

export function initAnalytics(config: AnalyticsConfig) {
  if (typeof window === 'undefined' || config.disabled) return
  import('posthog-js').then(({ default: posthog }) => {
    if (!posthog.__loaded) {
      posthog.init(config.posthogKey, {
        api_host:        config.apiHost || 'https://app.posthog.com',
        capture_pageview: false,   // manual — see trackPageView
        persistence:     'localStorage',
        autocapture:     false,    // only track explicit events
        loaded: (ph) => {
          _posthog = ph
          if (config.debug) console.log('[Analytics] PostHog initialized')
        },
      })
    }
    _posthog = posthog
  })
}

export function track(event: AnalyticsEvent, properties?: EventProperties) {
  const props = { ...properties, timestamp: new Date().toISOString() }

  // PostHog
  try { if (_posthog) _posthog.capture(event, props) } catch {}

  // Console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`%c[Analytics] ${event}`, 'color:#EFA020;font-weight:600', props)
  }
}

export function identifyUser(userId: string, traits?: {
  email?:    string
  name?:     string
  role?:     string
  plan?:     string
  createdAt?: string
  [k: string]: unknown
}) {
  try { if (_posthog) _posthog.identify(userId, traits) } catch {}
}

export function resetAnalytics() {
  try { if (_posthog) _posthog.reset() } catch {}
}

export function trackPageView(url?: string) {
  track('page_view', {
    url:      url || (typeof window !== 'undefined' ? window.location.pathname : ''),
    referrer: typeof document !== 'undefined' ? document.referrer : '',
  })
}

export function setUserProperty(key: string, value: string | number | boolean) {
  try { if (_posthog) _posthog.people.set({ [key]: value }) } catch {}
}

// ── React hook: auto-track page views ─────────────────────────
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export function usePageTracking() {
  const pathname = usePathname()
  const prev = useRef<string>('')

  useEffect(() => {
    if (pathname !== prev.current) {
      prev.current = pathname
      trackPageView(pathname)
    }
  }, [pathname])
}

// ── React hook: track any event once on mount ─────────────────
export function useTrackOnce(event: AnalyticsEvent, props?: EventProperties) {
  const tracked = useRef(false)
  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true
      track(event, props)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

// ── Session ID helper (for self-hosted fallback) ──────────────
function getSessionId(): string {
  if (typeof sessionStorage === 'undefined') return 'server'
  let id = sessionStorage.getItem('_ms_sid')
  if (!id) { id = Math.random().toString(36).slice(2, 10); sessionStorage.setItem('_ms_sid', id) }
  return id
}

// ── Self-hosted Supabase fallback ─────────────────────────────
// SQL to create in Supabase:
/*
CREATE TABLE analytics_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  event      TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}',
  url        TEXT,
  referrer   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX analytics_event_type_idx ON analytics_events(event, created_at DESC);
CREATE INDEX analytics_user_idx       ON analytics_events(user_id, created_at DESC);
-- No RLS on inserts (server-side only via service role)
*/

export async function trackToSupabase(
  event: AnalyticsEvent,
  userId: string | null,
  properties?: EventProperties,
) {
  await fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event,
      user_id:    userId,
      session_id: getSessionId(),
      properties: properties || {},
      url:        typeof window !== 'undefined' ? window.location.pathname : null,
      referrer:   typeof document !== 'undefined' ? document.referrer : null,
    }),
  })
}

// app/api/analytics/route.ts — copy this:
export const ANALYTICS_API_ROUTE = `
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function POST(req: NextRequest) {
  const { event, user_id, session_id, properties, url, referrer } = await req.json()
  if (!event || typeof event !== 'string') return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
  await supabase.from('analytics_events').insert({ event, user_id, session_id, properties, url, referrer })
  return NextResponse.json({ ok: true })
}
`

// ── Dashboard SQL queries ─────────────────────────────────────
export const ANALYTICS_QUERIES = {
  dailyActiveUsers: `
    SELECT date_trunc('day', created_at)::date AS day,
           COUNT(DISTINCT user_id) AS dau
    FROM analytics_events
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY 1 ORDER BY 1`,

  weeklyActiveUsers: `
    SELECT date_trunc('week', created_at)::date AS week,
           COUNT(DISTINCT user_id) AS wau
    FROM analytics_events
    WHERE created_at > NOW() - INTERVAL '90 days'
    GROUP BY 1 ORDER BY 1`,

  topEvents: `
    SELECT event, COUNT(*) AS count
    FROM analytics_events
    WHERE created_at > NOW() - INTERVAL '7 days'
    GROUP BY event ORDER BY count DESC LIMIT 15`,

  conversionFunnel: `
    SELECT
      COUNT(*) FILTER (WHERE event = 'page_view')            AS page_views,
      COUNT(*) FILTER (WHERE event = 'block_detail_viewed')  AS detail_views,
      COUNT(*) FILTER (WHERE event = 'purchase_started')     AS cart_adds,
      COUNT(*) FILTER (WHERE event = 'purchase_completed')   AS purchases
    FROM analytics_events
    WHERE created_at > NOW() - INTERVAL '30 days'`,

  revenueByEvent: `
    SELECT
      COALESCE((properties->>'block_id')::TEXT, 'unknown') AS block_id,
      COUNT(*) AS purchases,
      SUM((properties->>'amount')::NUMERIC) AS revenue
    FROM analytics_events
    WHERE event = 'purchase_completed'
      AND created_at > NOW() - INTERVAL '30 days'
    GROUP BY 1 ORDER BY revenue DESC`,

  retentionCohort: `
    WITH signups AS (
      SELECT user_id, date_trunc('week', MIN(created_at))::date AS cohort_week
      FROM analytics_events WHERE event = 'user_signup'
      GROUP BY user_id
    ),
    activity AS (
      SELECT DISTINCT user_id, date_trunc('week', created_at)::date AS active_week
      FROM analytics_events WHERE user_id IS NOT NULL
    )
    SELECT s.cohort_week,
           (a.active_week - s.cohort_week) / 7 AS week_number,
           COUNT(DISTINCT a.user_id) AS retained
    FROM signups s
    JOIN activity a ON a.user_id = s.user_id AND a.active_week >= s.cohort_week
    GROUP BY 1, 2 ORDER BY 1, 2`,
}

/*
──────────────────────────────────────────────────────────────
SETUP

1. npm install posthog-js

2. In app/providers.tsx:
   import { initAnalytics, usePageTracking } from '@/blocks/analytics'
   initAnalytics({ posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY! })
   // usePageTracking() in a child component

3. Track custom events anywhere:
   import { track } from '@/blocks/analytics'
   track('purchase_completed', { block_id: 'auth', amount: 19 })

4. Identify users after login:
   import { identifyUser } from '@/blocks/analytics'
   identifyUser(session.user.id, { email: session.user.email, role: session.user.role })

5. Self-hosted fallback: copy ANALYTICS_API_ROUTE to app/api/analytics/route.ts
   Run the CREATE TABLE SQL in Supabase.
──────────────────────────────────────────────────────────────
*/
