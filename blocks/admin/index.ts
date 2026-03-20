// ============================================================
// MarrowStack Block: Admin Dashboard
// Stack: Next.js 14+ + Supabase (service role)
// Covers: stats, revenue, user CRUD, feature flags,
//         affiliate leaderboard, block analytics, role management
// ============================================================

// ── SQL: required DB objects ───────────────────────────────────
/*
-- Feature flags table
CREATE TABLE IF NOT EXISTS feature_flags (
  key         TEXT PRIMARY KEY,
  enabled     BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  rollout_pct INT NOT NULL DEFAULT 100,  -- 0–100 for percentage rollout
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pre-seed flags
INSERT INTO feature_flags VALUES
  ('ai_customize',      true,  'AI block customization feature', 100, NOW()),
  ('affiliate_program', true,  'Affiliate commission program',   100, NOW()),
  ('new_blocks_page',   false, 'Revamped /blocks listing',       0,   NOW())
ON CONFLICT (key) DO NOTHING;

-- Revenue by month function
CREATE OR REPLACE FUNCTION revenue_by_month(p_months INT DEFAULT 6)
RETURNS TABLE(month TEXT, revenue DECIMAL, purchases BIGINT) LANGUAGE sql AS $$
  SELECT
    to_char(date_trunc('month', created_at), 'Mon ''YY') AS month,
    COALESCE(SUM(amount), 0)                              AS revenue,
    COUNT(*)                                              AS purchases
  FROM purchases
  WHERE status = 'completed'
    AND created_at >= NOW() - (p_months || ' months')::INTERVAL
  GROUP BY date_trunc('month', created_at)
  ORDER BY date_trunc('month', created_at);
$$;

-- Daily signups function
CREATE OR REPLACE FUNCTION signups_by_day(p_days INT DEFAULT 30)
RETURNS TABLE(day DATE, signups BIGINT) LANGUAGE sql AS $$
  SELECT created_at::date AS day, COUNT(*) AS signups
  FROM profiles
  WHERE created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY created_at::date
  ORDER BY created_at::date;
$$;
*/

import { createClient } from '@supabase/supabase-js'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// ── Types ─────────────────────────────────────────────────────
export type AdminRole = 'admin' | 'super_admin'

export interface DashboardStats {
  totalUsers: number
  totalRevenue: number
  totalPurchases: number
  totalRefunds: number
  avgOrderValue: number
  refundRate: number
  proSubscribers: number
  affiliatePayoutsPending: number
}

export interface RevenueMonth {
  month: string
  revenue: number
  purchases: number
}

export interface BlockStats {
  block_id: string
  count: number
  revenue: number
  refundCount: number
}

export interface AdminUser {
  id: string
  email: string
  name: string | null
  role: string
  has_pro_subscription: boolean
  affiliate_balance: number
  affiliate_code: string | null
  sign_in_count: number
  created_at: string
  last_sign_in: string | null
}

export interface FeatureFlag {
  key: string
  enabled: boolean
  description: string | null
  rollout_pct: number
  updated_at: string
}

// ── Auth guard ────────────────────────────────────────────────
export function requireAdmin(session: { user?: { id?: string; role?: string } } | null): void {
  if (!session?.user?.id)    throw new Error('Unauthenticated')
  const role = session.user.role as string
  if (role !== 'admin' && role !== 'super_admin') {
    throw new Error('Admin access required')
  }
}

export function requireSuperAdmin(session: { user?: { id?: string; role?: string } } | null): void {
  if (session?.user?.role !== 'super_admin') {
    throw new Error('Super admin access required')
  }
}

// ── Aggregate stats ────────────────────────────────────────────
export async function getDashboardStats(): Promise<DashboardStats> {
  const [
    usersRes,
    completedRes,
    refundedRes,
    proRes,
    pendingPayoutsRes,
  ] = await Promise.all([
    db.from('profiles').select('*', { count: 'exact', head: true }),
    db.from('purchases').select('amount').eq('status', 'completed'),
    db.from('purchases').select('*', { count: 'exact', head: true }).eq('status', 'refunded'),
    db.from('profiles').select('*', { count: 'exact', head: true }).eq('has_pro_subscription', true),
    db.from('profiles').select('affiliate_balance').gt('affiliate_balance', 0),
  ])

  const completed     = completedRes.data || []
  const totalRevenue  = completed.reduce((s, p) => s + Number(p.amount), 0)
  const totalPurchases = completed.length
  const totalRefunds  = refundedRes.count || 0

  return {
    totalUsers:             usersRes.count           || 0,
    totalRevenue,
    totalPurchases,
    totalRefunds,
    avgOrderValue:          totalPurchases ? totalRevenue / totalPurchases : 0,
    refundRate:             totalPurchases ? (totalRefunds / (totalPurchases + totalRefunds)) * 100 : 0,
    proSubscribers:         proRes.count             || 0,
    affiliatePayoutsPending: (pendingPayoutsRes.data || []).reduce((s, p) => s + Number(p.affiliate_balance), 0),
  }
}

// ── Revenue time series ────────────────────────────────────────
export async function getRevenueByMonth(months = 6): Promise<RevenueMonth[]> {
  const { data, error } = await db.rpc('revenue_by_month', { p_months: months })
  if (error) throw error
  return (data || []).map((r: any) => ({
    month: r.month,
    revenue: Number(r.revenue),
    purchases: Number(r.purchases),
  }))
}

export async function getSignupsByDay(days = 30): Promise<Array<{ day: string; signups: number }>> {
  const { data, error } = await db.rpc('signups_by_day', { p_days: days })
  if (error) throw error
  return (data || []).map((r: any) => ({ day: r.day, signups: Number(r.signups) }))
}

// ── Per-block analytics ────────────────────────────────────────
export async function getBlockStats(): Promise<BlockStats[]> {
  const { data: purchases } = await db
    .from('purchases')
    .select('block_id, amount, status')

  const map = new Map<string, BlockStats>()
  for (const p of purchases || []) {
    const existing = map.get(p.block_id) || { block_id: p.block_id, count: 0, revenue: 0, refundCount: 0 }
    if (p.status === 'completed') {
      existing.count++
      existing.revenue += Number(p.amount)
    } else if (p.status === 'refunded') {
      existing.refundCount++
    }
    map.set(p.block_id, existing)
  }

  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue)
}

// ── User management ───────────────────────────────────────────
export async function getAllUsers(opts?: {
  page?: number
  pageSize?: number
  search?: string
  role?: string
}): Promise<{ users: AdminUser[]; total: number }> {
  const { page = 1, pageSize = 25, search, role } = opts || {}
  const from = (page - 1) * pageSize

  let q = db
    .from('profiles')
    .select(
      'id, email, name, role, has_pro_subscription, affiliate_balance, affiliate_code, sign_in_count, created_at, last_sign_in',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1)

  if (search) q = q.or(`email.ilike.%${search}%,name.ilike.%${search}%`)
  if (role)   q = q.eq('role', role)

  const { data, count, error } = await q
  if (error) throw error
  return { users: (data || []) as AdminUser[], total: count || 0 }
}

export async function getUserById(userId: string): Promise<AdminUser | null> {
  const { data } = await db
    .from('profiles')
    .select('id, email, name, role, has_pro_subscription, affiliate_balance, affiliate_code, sign_in_count, created_at, last_sign_in')
    .eq('id', userId)
    .maybeSingle()
  return data as AdminUser | null
}

export async function updateUserRole(userId: string, role: 'user' | 'admin'): Promise<void> {
  const { error } = await db.from('profiles').update({ role }).eq('id', userId)
  if (error) throw error
}

export async function banUser(userId: string): Promise<void> {
  // Mark banned (add a 'banned' role or a 'banned_at' column)
  const { error } = await db.from('profiles').update({ role: 'banned' }).eq('id', userId)
  if (error) throw error
}

export async function getUserPurchases(userId: string) {
  const { data } = await db
    .from('purchases')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return data || []
}

// ── Search users ──────────────────────────────────────────────
export async function searchUsers(query: string, limit = 10): Promise<AdminUser[]> {
  if (!query.trim()) return []
  const { data } = await db
    .from('profiles')
    .select('id, email, name, role, created_at')
    .or(`email.ilike.%${query}%,name.ilike.%${query}%`)
    .limit(limit)
  return (data || []) as AdminUser[]
}

// ── Affiliate leaderboard ─────────────────────────────────────
export async function getAffiliateLeaderboard(limit = 20) {
  const { data } = await db
    .from('profiles')
    .select('id, name, email, affiliate_code, affiliate_balance')
    .gt('affiliate_balance', 0)
    .order('affiliate_balance', { ascending: false })
    .limit(limit)
  return data || []
}

export async function getAffiliateEarningsDetail(affiliateUserId: string) {
  const { data } = await db
    .from('affiliate_earnings')
    .select('*, profiles!purchase_user_id(email, name)')
    .eq('affiliate_user_id', affiliateUserId)
    .order('created_at', { ascending: false })
    .limit(50)
  return data || []
}

// ── Feature flags ─────────────────────────────────────────────
export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  const { data } = await db.from('feature_flags').select('*').order('key')
  return (data || []) as FeatureFlag[]
}

export async function getFeatureFlag(key: string): Promise<boolean> {
  const { data } = await db.from('feature_flags').select('enabled, rollout_pct').eq('key', key).maybeSingle()
  if (!data || !data.enabled) return false
  if (data.rollout_pct >= 100) return true
  // Deterministic percentage rollout based on key hash
  const hash = key.split('').reduce((h, c) => ((h << 5) - h) + c.charCodeAt(0), 0)
  return (Math.abs(hash) % 100) < data.rollout_pct
}

export async function setFeatureFlag(
  key: string,
  enabled: boolean,
  opts?: { description?: string; rolloutPct?: number }
): Promise<void> {
  await db.from('feature_flags').upsert({
    key,
    enabled,
    description: opts?.description,
    rollout_pct: opts?.rolloutPct ?? 100,
    updated_at:  new Date().toISOString(),
  }, { onConflict: 'key' })
}

export async function deleteFeatureFlag(key: string): Promise<void> {
  await db.from('feature_flags').delete().eq('key', key)
}

// ── Bulk email (admin-initiated) ──────────────────────────────
export async function getAllUserEmails(opts?: { proOnly?: boolean }): Promise<string[]> {
  let q = db.from('profiles').select('email')
  if (opts?.proOnly) q = q.eq('has_pro_subscription', true)
  const { data } = await q
  return (data || []).map(r => r.email)
}

// ── Recent activity feed ───────────────────────────────────────
export async function getRecentActivity(limit = 30) {
  const [purchases, signups] = await Promise.all([
    db.from('purchases')
      .select('id, block_id, amount, status, created_at, profiles(email, name)')
      .order('created_at', { ascending: false }).limit(limit / 2),
    db.from('profiles')
      .select('id, email, name, created_at')
      .order('created_at', { ascending: false }).limit(limit / 2),
  ])

  const events = [
    ...(purchases.data || []).map((p: any) => ({
      type: 'purchase' as const,
      id: p.id,
      label: `${p.profiles?.name || p.profiles?.email} bought ${p.block_id}`,
      amount: p.amount,
      status: p.status,
      at: p.created_at,
    })),
    ...(signups.data || []).map((u: any) => ({
      type: 'signup' as const,
      id: u.id,
      label: `${u.name || u.email} signed up`,
      at: u.created_at,
    })),
  ]

  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit)
}

// ── Export data ───────────────────────────────────────────────
export async function exportPurchasesCSV(): Promise<string> {
  const { data } = await db
    .from('purchases')
    .select('id, block_id, amount, status, created_at, profiles(email, name), paypal_order_id')
    .order('created_at', { ascending: false })

  const rows = (data || []).map((p: any) => [
    p.id, (p.profiles?.email || ''), (p.profiles?.name || ''), p.block_id, p.amount, p.status, p.paypal_order_id, p.created_at
  ].join(','))

  return ['id,email,name,block_id,amount,status,paypal_order_id,created_at', ...rows].join('\n')
}