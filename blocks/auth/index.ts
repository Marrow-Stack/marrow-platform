// ============================================================
// MarrowStack Block: Authentication System
// Stack: Next.js 14 + NextAuth.js v4 + Supabase + bcryptjs + Zod
// Includes: Credentials, GitHub OAuth, Google OAuth, RBAC,
//           password reset flow, email verification, audit log
// ============================================================

import { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GitHubProvider from 'next-auth/providers/github'
import GoogleProvider from 'next-auth/providers/google'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import crypto from 'crypto'

// ── SQL Migration ─────────────────────────────────────────────
/*
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS profiles (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                TEXT UNIQUE NOT NULL,
  name                 TEXT,
  avatar_url           TEXT,
  password_hash        TEXT,
  github_id            TEXT UNIQUE,
  google_id            TEXT UNIQUE,
  role                 TEXT NOT NULL DEFAULT 'user'
                         CHECK (role IN ('user', 'admin', 'super_admin')),
  email_verified       BOOLEAN NOT NULL DEFAULT false,
  email_verify_token   TEXT,
  reset_token          TEXT,
  reset_token_expires  TIMESTAMPTZ,
  last_sign_in         TIMESTAMPTZ,
  sign_in_count        INT NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_profile_select" ON profiles FOR SELECT  USING (auth.uid()::text = id::text);
CREATE POLICY "own_profile_update" ON profiles FOR UPDATE  USING (auth.uid()::text = id::text);
CREATE POLICY "admin_all"          ON profiles FOR ALL     USING (
  EXISTS (SELECT 1 FROM profiles WHERE id::text = auth.uid()::text AND role IN ('admin','super_admin'))
);

-- Auth audit log (sign-in history)
CREATE TABLE IF NOT EXISTS auth_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event       TEXT NOT NULL,            -- 'sign_in' | 'sign_out' | 'register' | 'reset'
  ip          TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE auth_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_events" ON auth_events FOR SELECT USING (user_id::text = auth.uid()::text);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
*/

// ── Types ─────────────────────────────────────────────────────
export type UserRole = 'user' | 'admin' | 'super_admin'

export interface AuthProfile {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  role: UserRole
  email_verified: boolean
  github_id: string | null
  google_id: string | null
  sign_in_count: number
  last_sign_in: string | null
  created_at: string
}

// ── Zod Schemas ───────────────────────────────────────────────
export const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z
    .string()
    .min(8, 'Minimum 8 characters')
    .regex(/[A-Z]/, 'Must include an uppercase letter')
    .regex(/[0-9]/, 'Must include a number'),
})

export const LoginSchema = z.object({
  email: z.string().email('Invalid email').toLowerCase(),
  password: z.string().min(1, 'Password required'),
})

export const ResetRequestSchema = z.object({
  email: z.string().email('Invalid email').toLowerCase(),
})

export const ResetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
    confirmPassword: z.string(),
  })
  .refine(d => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Required'),
    newPassword: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
    confirmPassword: z.string(),
  })
  .refine(d => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput    = z.infer<typeof LoginSchema>

// ── Supabase admin client (server-only, bypasses RLS) ─────────
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// ── NextAuth configuration ────────────────────────────────────
export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Email & Password',
      credentials: {
        email:    { label: 'Email',    type: 'email',    placeholder: 'you@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = LoginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id, email, name, avatar_url, role, password_hash, email_verified')
          .eq('email', parsed.data.email)
          .single()

        if (!profile?.password_hash) return null

        const valid = await bcrypt.compare(parsed.data.password, profile.password_hash)
        if (!valid) return null

        // Update sign-in stats (non-blocking)
        supabaseAdmin
          .from('profiles')
          .update({ last_sign_in: new Date().toISOString(), sign_in_count: profile.sign_in_count + 1 })
          .eq('id', profile.id)
          .then(() => {})

        return {
          id:             profile.id,
          email:          profile.email,
          name:           profile.name,
          image:          profile.avatar_url,
          role:           profile.role,
          emailVerified:  profile.email_verified,
        }
      },
    }),

    GitHubProvider({
      clientId:     process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),

    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      // OAuth providers: upsert profile
      if (account?.provider === 'github' || account?.provider === 'google') {
        const field = `${account.provider}_id`
        const { data: existing } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', user.email!)
          .single()

        if (existing) {
          // Link provider account to existing profile
          await supabaseAdmin
            .from('profiles')
            .update({ [field]: account.providerAccountId, avatar_url: user.image })
            .eq('id', existing.id)
        } else {
          // Create new profile
          await supabaseAdmin.from('profiles').insert({
            email:          user.email!,
            name:           user.name,
            avatar_url:     user.image,
            email_verified: true,   // OAuth emails are pre-verified
            [field]:        account.providerAccountId,
          })
        }
      }
      return true
    },

    async jwt({ token, user, trigger, session }) {
      // Initial sign-in: enrich token with db data
      if (user) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id, role, email_verified')
          .eq('email', user.email!)
          .single()

        token.id            = profile?.id || user.id
        token.role          = (profile?.role as UserRole) || 'user'
        token.emailVerified = profile?.email_verified || false
      }
      // Handle session update trigger (e.g., after role change)
      if (trigger === 'update' && session?.role) {
        token.role = session.role
      }
      return token
    },

    async session({ session, token }) {
      session.user.id            = token.id as string
      session.user.role          = token.role as UserRole
      session.user.emailVerified = token.emailVerified as boolean
      return session
    },
  },

  events: {
    async signIn({ user }) {
      // Audit log (non-blocking)
      supabaseAdmin
        .from('auth_events')
        .insert({ user_id: user.id, event: 'sign_in' })
        .then(() => {})
    },
  },

  pages:   { signIn: '/auth/signin', error: '/auth/signin' },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  secret:  process.env.NEXTAUTH_SECRET,
}

// ── Registration ──────────────────────────────────────────────
export async function registerUser(input: RegisterInput) {
  const { name, email, password } = RegisterSchema.parse(input)
  const passwordHash = await bcrypt.hash(password, 12)
  const verifyToken  = crypto.randomBytes(32).toString('hex')

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .insert({
      email,
      name,
      password_hash:       passwordHash,
      email_verify_token:  verifyToken,
      email_verified:      false,
    })
    .select('id, email, name')
    .single()

  if (error) {
    if (error.code === '23505') throw new Error('Email already registered. Please sign in.')
    throw new Error('Registration failed. Please try again.')
  }

  return { user: data, verifyToken }
}

// ── Email verification ────────────────────────────────────────
export async function verifyEmail(token: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ email_verified: true, email_verify_token: null })
    .eq('email_verify_token', token)
    .select('id')
    .single()
  return !error && !!data
}

// ── Password reset ────────────────────────────────────────────
export async function requestPasswordReset(email: string) {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, name')
    .eq('email', email.toLowerCase())
    .single()

  if (!profile) return null   // Don't reveal whether email exists

  const token   = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 60 * 60 * 1000)  // 1 hour

  await supabaseAdmin
    .from('profiles')
    .update({ reset_token: token, reset_token_expires: expires.toISOString() })
    .eq('id', profile.id)

  return { token, name: profile.name }
}

export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, reset_token_expires')
    .eq('reset_token', token)
    .single()

  if (!profile) return false
  if (new Date(profile.reset_token_expires!) < new Date()) return false

  const passwordHash = await bcrypt.hash(newPassword, 12)
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ password_hash: passwordHash, reset_token: null, reset_token_expires: null })
    .eq('id', profile.id)

  return !error
}

// ── Change password (authenticated) ──────────────────────────
export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('password_hash')
    .eq('id', userId)
    .single()

  if (!profile?.password_hash) throw new Error('No password set on this account')
  const valid = await bcrypt.compare(currentPassword, profile.password_hash)
  if (!valid) throw new Error('Current password is incorrect')

  const newHash = await bcrypt.hash(newPassword, 12)
  await supabaseAdmin.from('profiles').update({ password_hash: newHash }).eq('id', userId)
}

// ── Profile helpers ───────────────────────────────────────────
export async function getProfile(userId: string): Promise<AuthProfile | null> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id, email, name, avatar_url, role, email_verified, github_id, google_id, sign_in_count, last_sign_in, created_at')
    .eq('id', userId)
    .single()
  return data as AuthProfile | null
}

export async function updateProfile(userId: string, updates: { name?: string; avatar_url?: string }) {
  const { error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', userId)
  if (error) throw error
}

export async function deleteAccount(userId: string) {
  // Cascade deletes purchases, events, etc. via FK ON DELETE CASCADE
  const { error } = await supabaseAdmin
    .from('profiles')
    .delete()
    .eq('id', userId)
  if (error) throw error
}

// ── RBAC helpers ──────────────────────────────────────────────
const ROLE_LEVELS: Record<UserRole, number> = { user: 0, admin: 1, super_admin: 2 }

export function hasRole(session: any, required: UserRole): boolean {
  const userLevel = ROLE_LEVELS[session?.user?.role as UserRole] ?? -1
  return userLevel >= ROLE_LEVELS[required]
}

export function requireRole(session: any, required: UserRole): void {
  if (!hasRole(session, required)) {
    throw new Error(`Required role: ${required}. Your role: ${session?.user?.role || 'none'}`)
  }
}

// ── Route protection utility (Next.js API routes) ─────────────
export function withAuth<T>(
  handler: (req: T, session: any) => Promise<Response>,
  requiredRole?: UserRole
) {
  return async (req: T): Promise<Response> => {
    const { getServerSession } = await import('next-auth')
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (requiredRole && !hasRole(session, requiredRole)) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    return handler(req, session)
  }
}

// ── Audit log helpers ─────────────────────────────────────────
export type AuthEventType = 'sign_in' | 'sign_out' | 'register' | 'password_reset' | 'email_verified'

export async function logAuthEvent(
  userId: string,
  event: AuthEventType,
  meta?: { ip?: string; userAgent?: string }
) {
  await supabaseAdmin.from('auth_events').insert({
    user_id:    userId,
    event,
    ip:         meta?.ip,
    user_agent: meta?.userAgent,
  })
}

export async function getAuthEvents(userId: string, limit = 20) {
  const { data } = await supabaseAdmin
    .from('auth_events')
    .select('event, ip, user_agent, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data || []
}

// ── Affiliate code generator (used at registration) ───────────
export function generateAffiliateCode(email: string): string {
  return (
    email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) +
    Math.random().toString(36).slice(2, 6)
  ).toLowerCase()
}

/*
──────────────────────────────────────────────────────────────
USAGE

1. app/api/auth/[...nextauth]/route.ts:
   import NextAuth from 'next-auth'
   import { authOptions } from '@/blocks/auth'
   const handler = NextAuth(authOptions)
   export { handler as GET, handler as POST }

2. Protect pages with middleware.ts:
   import { withAuth } from 'next-auth/middleware'
   export default withAuth({ pages: { signIn: '/auth/signin' } })
   export const config = { matcher: ['/dashboard/:path*', '/admin/:path*'] }

3. In server components:
   import { getServerSession } from 'next-auth'
   import { authOptions, requireRole } from '@/blocks/auth'
   const session = await getServerSession(authOptions)
   requireRole(session, 'admin')

4. In API routes:
   export const POST = withAuth(async (req, session) => {
     // session.user.id, session.user.role are available
   }, 'admin')

5. Registration:
   import { registerUser, generateAffiliateCode } from '@/blocks/auth'
   const { user, verifyToken } = await registerUser({ name, email, password })

6. Password reset flow:
   const { token } = await requestPasswordReset(email)
   // Email token to user
   const ok = await resetPassword(token, newPassword)
──────────────────────────────────────────────────────────────
*/
