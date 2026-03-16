// ============================================================
// MarrowStack Block: Team & Workspaces (Multi-tenant SaaS)
// Stack: Next.js 14 + Supabase + Resend
// Covers: workspaces, members, roles, invites, permissions,
//         slug generation, RLS policies, React hooks
// ============================================================

import { createClient } from '@supabase/supabase-js'

// ── SQL Migration ─────────────────────────────────────────────
/*
CREATE TABLE workspaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  owner_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  plan        TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','enterprise')),
  logo_url    TEXT,
  settings    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws_member_select" ON workspaces FOR SELECT USING (
  id IN (SELECT workspace_id FROM workspace_members WHERE user_id::text = auth.uid()::text)
);
CREATE POLICY "ws_owner_all" ON workspaces FOR ALL USING (owner_id::text = auth.uid()::text);

CREATE TABLE workspace_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'member'
                 CHECK (role IN ('owner','admin','member','viewer')),
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, user_id)
);
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wm_member_select" ON workspace_members FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id::text = auth.uid()::text)
);
CREATE POLICY "wm_admin_manage" ON workspace_members FOR ALL USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id::text = auth.uid()::text AND role IN ('owner','admin')
  )
);

CREATE TABLE workspace_invites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member','viewer')),
  token        TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  invited_by   UUID REFERENCES profiles(id),
  accepted_at  TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, email)
);
ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wi_member_select" ON workspace_invites FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id::text = auth.uid()::text AND role IN ('owner','admin')
  )
);

-- Helpful view: members with profile info
CREATE OR REPLACE VIEW workspace_members_view AS
  SELECT
    wm.id, wm.workspace_id, wm.role, wm.joined_at,
    p.id AS user_id, p.email, p.name, p.avatar_url
  FROM workspace_members wm
  JOIN profiles p ON p.id = wm.user_id;
*/

// ── Types ─────────────────────────────────────────────────────
export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer'
export type WorkspacePlan = 'free' | 'pro' | 'enterprise'

export interface Workspace {
  id: string
  name: string
  slug: string
  owner_id: string
  plan: WorkspacePlan
  logo_url: string | null
  settings: Record<string, any>
  created_at: string
  member_count?: number
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: WorkspaceRole
  joined_at: string
  // from view:
  email: string
  name: string | null
  avatar_url: string | null
}

export interface WorkspaceInvite {
  id: string
  workspace_id: string
  email: string
  role: WorkspaceRole
  token: string
  invited_by: string | null
  accepted_at: string | null
  expires_at: string
  created_at: string
}

// ── Role hierarchy ─────────────────────────────────────────────
const ROLE_RANK: Record<WorkspaceRole, number> = { viewer: 0, member: 1, admin: 2, owner: 3 }

export function hasWorkspacePermission(userRole: WorkspaceRole, required: WorkspaceRole): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[required]
}

// Fine-grained permission map
const PERMISSIONS: Record<string, WorkspaceRole> = {
  'workspace:view':        'viewer',
  'workspace:invite':      'admin',
  'workspace:settings':    'admin',
  'workspace:billing':     'owner',
  'workspace:delete':      'owner',
  'member:view':           'viewer',
  'member:remove':         'admin',
  'member:change_role':    'admin',
}

export function canDo(userRole: WorkspaceRole, action: keyof typeof PERMISSIONS): boolean {
  const required = PERMISSIONS[action] as WorkspaceRole
  return required ? hasWorkspacePermission(userRole, required) : false
}

// ── Supabase admin ────────────────────────────────────────────
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// ── Slug generator ─────────────────────────────────────────────
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40)
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = toSlug(base)
  let suffix = 0
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`
    const { data } = await db.from('workspaces').select('id').eq('slug', candidate).maybeSingle()
    if (!data) return candidate
    suffix++
  }
}

// ── Workspace CRUD ────────────────────────────────────────────
export async function createWorkspace(ownerId: string, name: string, plan: WorkspacePlan = 'free') {
  const slug = await uniqueSlug(name)
  const { data: ws, error: wsErr } = await db
    .from('workspaces')
    .insert({ name: name.trim(), slug, owner_id: ownerId, plan })
    .select()
    .single()
  if (wsErr) throw wsErr

  // Owner is automatically a member
  await db.from('workspace_members').insert({ workspace_id: ws.id, user_id: ownerId, role: 'owner' })
  return ws as Workspace
}

export async function getWorkspace(idOrSlug: string) {
  const { data } = await db
    .from('workspaces')
    .select('*')
    .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
    .maybeSingle()
  return data as Workspace | null
}

export async function getUserWorkspaces(userId: string): Promise<Workspace[]> {
  const { data } = await db
    .from('workspace_members')
    .select('workspace_id, role, workspaces(*)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: true })
  return (data || []).map(row => ({ ...(row.workspaces as any), userRole: row.role }))
}

export async function updateWorkspace(wsId: string, updates: { name?: string; logo_url?: string; settings?: Record<string, any> }) {
  const patch: Record<string, any> = {}
  if (updates.name) { patch.name = updates.name.trim(); patch.slug = await uniqueSlug(updates.name) }
  if (updates.logo_url  !== undefined) patch.logo_url = updates.logo_url
  if (updates.settings  !== undefined) patch.settings = updates.settings
  const { error } = await db.from('workspaces').update(patch).eq('id', wsId)
  if (error) throw error
}

export async function deleteWorkspace(wsId: string, ownerId: string) {
  // Safety check: must be owner
  const { data: ws } = await db.from('workspaces').select('owner_id').eq('id', wsId).single()
  if (ws?.owner_id !== ownerId) throw new Error('Only the workspace owner can delete it.')
  await db.from('workspaces').delete().eq('id', wsId)
}

// ── Member management ─────────────────────────────────────────
export async function getWorkspaceMembers(wsId: string): Promise<WorkspaceMember[]> {
  const { data } = await db
    .from('workspace_members_view')
    .select('*')
    .eq('workspace_id', wsId)
    .order('joined_at', { ascending: true })
  return (data || []) as WorkspaceMember[]
}

export async function getMemberRole(wsId: string, userId: string): Promise<WorkspaceRole | null> {
  const { data } = await db
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', wsId)
    .eq('user_id', userId)
    .maybeSingle()
  return (data?.role as WorkspaceRole) || null
}

export async function updateMemberRole(wsId: string, userId: string, newRole: WorkspaceRole) {
  if (newRole === 'owner') throw new Error('Cannot assign owner role via this function. Transfer ownership instead.')
  const { error } = await db
    .from('workspace_members')
    .update({ role: newRole })
    .eq('workspace_id', wsId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function removeMember(wsId: string, userId: string) {
  await db.from('workspace_members').delete().eq('workspace_id', wsId).eq('user_id', userId)
}

export async function transferOwnership(wsId: string, currentOwnerId: string, newOwnerId: string) {
  // Verify current owner
  const { data: ws } = await db.from('workspaces').select('owner_id').eq('id', wsId).single()
  if (ws?.owner_id !== currentOwnerId) throw new Error('Only the current owner can transfer ownership.')

  await Promise.all([
    db.from('workspaces').update({ owner_id: newOwnerId }).eq('id', wsId),
    db.from('workspace_members').update({ role: 'owner' }).eq('workspace_id', wsId).eq('user_id', newOwnerId),
    db.from('workspace_members').update({ role: 'admin' }).eq('workspace_id', wsId).eq('user_id', currentOwnerId),
  ])
}

// ── Invites ───────────────────────────────────────────────────
export async function inviteMember(
  wsId: string,
  inviterId: string,
  email: string,
  role: WorkspaceRole = 'member'
): Promise<WorkspaceInvite> {
  // Check if already a member
  const { data: profile } = await db.from('profiles').select('id').eq('email', email).maybeSingle()
  if (profile) {
    const { data: existing } = await db
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', wsId)
      .eq('user_id', profile.id)
      .maybeSingle()
    if (existing) throw new Error(`${email} is already a workspace member.`)
  }

  // Upsert invite (re-invite sends a new token)
  const { data: invite, error } = await db
    .from('workspace_invites')
    .upsert({
      workspace_id: wsId,
      email:        email.toLowerCase(),
      role,
      invited_by:   inviterId,
      accepted_at:  null,
      expires_at:   new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: 'workspace_id,email', ignoreDuplicates: false })
    .select()
    .single()

  if (error) throw error
  return invite as WorkspaceInvite
}

export async function getInviteByToken(token: string): Promise<WorkspaceInvite | null> {
  const { data } = await db
    .from('workspace_invites')
    .select('*, workspaces(name)')
    .eq('token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  return data as WorkspaceInvite | null
}

export async function acceptInvite(token: string, userId: string) {
  const invite = await getInviteByToken(token)
  if (!invite) throw new Error('Invite is invalid or has expired.')

  const { error } = await db.from('workspace_members').insert({
    workspace_id: invite.workspace_id,
    user_id:      userId,
    role:         invite.role,
  })
  // Ignore unique violation (already a member — still mark invite as accepted)
  if (error && error.code !== '23505') throw error

  await db.from('workspace_invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id)
}

export async function revokeInvite(inviteId: string) {
  await db.from('workspace_invites').delete().eq('id', inviteId)
}

export async function getPendingInvites(wsId: string): Promise<WorkspaceInvite[]> {
  const { data } = await db
    .from('workspace_invites')
    .select('*')
    .eq('workspace_id', wsId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  return (data || []) as WorkspaceInvite[]
}

// ── Client-side React hook ─────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { createClient as createBrowserClient } from '@supabase/supabase-js'

export function useWorkspace(wsId: string | null) {
  const [workspace,   setWorkspace]   = useState<Workspace | null>(null)
  const [members,     setMembers]     = useState<WorkspaceMember[]>([])
  const [invites,     setInvites]     = useState<WorkspaceInvite[]>([])
  const [userRole,    setUserRole]    = useState<WorkspaceRole | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const load = useCallback(async (currentUserId?: string) => {
    if (!wsId) { setLoading(false); return }
    setLoading(true); setError(null)
    try {
      const [wsRes, membersRes] = await Promise.all([
        supabase.from('workspaces').select('*').eq('id', wsId).single(),
        supabase.from('workspace_members_view').select('*').eq('workspace_id', wsId),
      ])
      if (wsRes.error) throw wsRes.error
      setWorkspace(wsRes.data as Workspace)
      setMembers((membersRes.data || []) as WorkspaceMember[])
      if (currentUserId) {
        const mine = membersRes.data?.find((m: any) => m.user_id === currentUserId)
        setUserRole((mine?.role as WorkspaceRole) || null)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [wsId])

  useEffect(() => { load() }, [load])

  return { workspace, members, invites, userRole, loading, error, refresh: load, canDo: (action: string) => userRole ? canDo(userRole, action) : false }
}
