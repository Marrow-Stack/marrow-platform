-- ============================================================
-- MarrowStack Database Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ── Profiles (extends Supabase auth or standalone) ───────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 TEXT UNIQUE NOT NULL,
  name                  TEXT,
  avatar_url            TEXT,
  password_hash         TEXT,                          -- null for OAuth-only users
  github_username       TEXT,
  role                  TEXT NOT NULL DEFAULT 'user'
                          CHECK (role IN ('user', 'admin', 'super_admin')),
  affiliate_code        TEXT UNIQUE,
  affiliate_balance     DECIMAL(10,2) NOT NULL DEFAULT 0,
  ai_credits            INT NOT NULL DEFAULT 3,
  has_pro_subscription  BOOLEAN NOT NULL DEFAULT false,
  paypal_subscription_id TEXT,
  referred_by           UUID REFERENCES public.profiles(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_own" ON public.profiles FOR ALL USING (id::text = auth.uid()::text);
CREATE POLICY "profiles_admin" ON public.profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id::text = auth.uid()::text AND role IN ('admin','super_admin'))
);

-- ── Purchases ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.purchases (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  block_id          TEXT NOT NULL,
  paypal_order_id   TEXT UNIQUE NOT NULL,
  paypal_capture_id TEXT,
  amount            DECIMAL(10,2) NOT NULL,
  github_username   TEXT,
  status            TEXT NOT NULL DEFAULT 'completed'
                      CHECK (status IN ('completed', 'refunded')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchases_own" ON public.purchases FOR SELECT USING (user_id::text = auth.uid()::text);
CREATE POLICY "purchases_admin" ON public.purchases FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id::text = auth.uid()::text AND role IN ('admin','super_admin'))
);
CREATE INDEX IF NOT EXISTS purchases_user_idx ON public.purchases(user_id);
CREATE INDEX IF NOT EXISTS purchases_block_idx ON public.purchases(block_id);

-- ── Pending orders (cleared on capture) ─────────────────────
CREATE TABLE IF NOT EXISTS public.pending_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          TEXT UNIQUE NOT NULL,
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  block_id          TEXT NOT NULL,
  amount            DECIMAL(10,2) NOT NULL,
  affiliate_user_id UUID REFERENCES public.profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.pending_orders ENABLE ROW LEVEL SECURITY;
-- No user-level RLS needed (only server-side admin client touches this)

-- ── Affiliate earnings ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.affiliate_earnings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  purchase_user_id    UUID NOT NULL REFERENCES public.profiles(id),
  block_id            TEXT NOT NULL,
  commission_amount   DECIMAL(10,2) NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'paid')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.affiliate_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "earnings_own" ON public.affiliate_earnings FOR SELECT USING (affiliate_user_id::text = auth.uid()::text);
CREATE INDEX IF NOT EXISTS earnings_affiliate_idx ON public.affiliate_earnings(affiliate_user_id);

-- ── Payout requests ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payout_requests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id),
  amount     DECIMAL(10,2) NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payout_own" ON public.payout_requests FOR SELECT USING (user_id::text = auth.uid()::text);

-- ── Notifications ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL DEFAULT 'info'
               CHECK (type IN ('info','success','warning','error')),
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  action_url TEXT,
  read       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_own" ON public.notifications FOR ALL USING (user_id::text = auth.uid()::text);
CREATE INDEX IF NOT EXISTS notifications_user_unread ON public.notifications(user_id, read) WHERE read = false;

-- ── Feature flags ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feature_flags (
  key         TEXT PRIMARY KEY,
  enabled     BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO public.feature_flags VALUES
  ('ai_customize', true, 'AI block customization via Claude API'),
  ('affiliate_program', true, 'Affiliate commission tracking and payouts')
ON CONFLICT (key) DO NOTHING;

-- ── RPC Functions ────────────────────────────────────────────

-- Add to affiliate balance atomically
CREATE OR REPLACE FUNCTION public.add_affiliate_balance(p_user_id UUID, p_amount DECIMAL)
RETURNS void AS $$
  UPDATE public.profiles
  SET affiliate_balance = affiliate_balance + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Revenue by month (for admin dashboard)
CREATE OR REPLACE FUNCTION public.revenue_by_month(p_months INT DEFAULT 6)
RETURNS TABLE(month TEXT, revenue DECIMAL, purchases BIGINT) AS $$
  SELECT
    to_char(date_trunc('month', created_at), 'Mon ''YY') AS month,
    SUM(amount) AS revenue,
    COUNT(*) AS purchases
  FROM public.purchases
  WHERE status = 'completed'
    AND created_at >= NOW() - (p_months || ' months')::INTERVAL
  GROUP BY date_trunc('month', created_at)
  ORDER BY date_trunc('month', created_at);
$$ LANGUAGE sql SECURITY DEFINER;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Team & Workspaces (from bundle or team block purchase) ────
-- These tables are only needed if you purchased the Team block.
-- Full SQL with all RLS policies is in blocks/team/index.ts.

CREATE TABLE IF NOT EXISTS public.workspaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  owner_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  plan        TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','enterprise')),
  logo_url    TEXT,
  settings    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws_member_select" ON public.workspaces FOR SELECT USING (
  id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id::text = auth.uid()::text)
);
CREATE POLICY "ws_owner_all" ON public.workspaces FOR ALL USING (owner_id::text = auth.uid()::text);

CREATE TABLE IF NOT EXISTS public.workspace_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member','viewer')),
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, user_id)
);
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wm_member_select" ON public.workspace_members FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id::text = auth.uid()::text)
);
CREATE POLICY "wm_admin_manage" ON public.workspace_members FOR ALL USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id::text = auth.uid()::text AND role IN ('owner','admin')
  )
);

CREATE TABLE IF NOT EXISTS public.workspace_invites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member','viewer')),
  token        TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  invited_by   UUID REFERENCES public.profiles(id),
  accepted_at  TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, email)
);
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invite_admin" ON public.workspace_invites FOR ALL USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id::text = auth.uid()::text AND role IN ('owner','admin')
  )
);
