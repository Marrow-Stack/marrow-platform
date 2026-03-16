// ============================================================
// MarrowStack Block: Notifications System
// Stack: Next.js 14 + Supabase Realtime + Web Push API
// Covers: real-time in-app, push subscriptions, notification
//         bell component, unread count, mark-as-read, bulk ops
// ============================================================

// ── SQL Migration ─────────────────────────────────────────────
/*
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL DEFAULT 'info'
                CHECK (type IN ('info','success','warning','error','purchase','invite')),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  action_url  TEXT,
  icon        TEXT,         -- optional emoji or image url
  read        BOOLEAN NOT NULL DEFAULT false,
  archived    BOOLEAN NOT NULL DEFAULT false,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_own_select" ON notifications FOR SELECT USING (user_id::text = auth.uid()::text);
CREATE POLICY "notif_own_update" ON notifications FOR UPDATE USING (user_id::text = auth.uid()::text);
CREATE POLICY "notif_own_delete" ON notifications FOR DELETE USING (user_id::text = auth.uid()::text);

CREATE INDEX notif_user_unread_idx ON notifications(user_id, created_at DESC) WHERE read = false AND archived = false;
CREATE INDEX notif_user_all_idx    ON notifications(user_id, created_at DESC) WHERE archived = false;

CREATE TABLE push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint    TEXT UNIQUE NOT NULL,
  p256dh      TEXT NOT NULL,
  auth_key    TEXT NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_own" ON push_subscriptions FOR ALL USING (user_id::text = auth.uid()::text);
*/

import { createClient } from '@supabase/supabase-js'
import { useEffect, useState, useCallback, useRef } from 'react'

// ── Types ─────────────────────────────────────────────────────
export type NotifType = 'info' | 'success' | 'warning' | 'error' | 'purchase' | 'invite'

export interface AppNotification {
  id: string
  user_id: string
  type: NotifType
  title: string
  body: string
  action_url: string | null
  icon: string | null
  read: boolean
  archived: boolean
  metadata: Record<string, any> | null
  created_at: string
}

const TYPE_ICONS: Record<NotifType, string> = {
  info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌', purchase: '🎉', invite: '✉️',
}

// ── Server-side: create notifications (via service role) ───────
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function createNotification(
  userId: string,
  type: NotifType,
  title: string,
  body: string,
  opts?: { actionUrl?: string; icon?: string; metadata?: Record<string, any> }
): Promise<AppNotification> {
  const { data, error } = await admin
    .from('notifications')
    .insert({
      user_id:    userId,
      type,
      title,
      body,
      action_url: opts?.actionUrl ?? null,
      icon:       opts?.icon ?? TYPE_ICONS[type],
      metadata:   opts?.metadata ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data as AppNotification
}

export async function createPurchaseNotification(userId: string, blockName: string) {
  return createNotification(
    userId, 'purchase',
    `${blockName} is ready! 🎉`,
    'Check your GitHub email for the repository invitation. Accept within 7 days.',
    { actionUrl: '/dashboard', icon: '🎉' }
  )
}

export async function createInviteNotification(userId: string, workspaceName: string, token: string) {
  return createNotification(
    userId, 'invite',
    `You've been invited to ${workspaceName}`,
    'Click to accept the workspace invitation.',
    { actionUrl: `/invite/${token}`, icon: '✉️' }
  )
}

export async function notifyAllUsers(type: NotifType, title: string, body: string, actionUrl?: string) {
  const { data: users } = await admin.from('profiles').select('id')
  if (!users?.length) return

  const BATCH = 500
  for (let i = 0; i < users.length; i += BATCH) {
    await admin.from('notifications').insert(
      users.slice(i, i + BATCH).map(u => ({
        user_id: u.id, type, title, body, action_url: actionUrl ?? null, icon: TYPE_ICONS[type],
      }))
    )
  }
}

export async function deleteOldNotifications(olderThanDays = 90) {
  const cutoff = new Date(Date.now() - olderThanDays * 86400000).toISOString()
  await admin.from('notifications').delete().lt('created_at', cutoff).eq('read', true)
}

// ── Client-side hook (real-time via Supabase channel) ─────────
export function useNotifications(userId: string | null) {
  const [items,   setItems]   = useState<AppNotification[]>([])
  const [unread,  setUnread]  = useState(0)
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const recalcUnread = useCallback((list: AppNotification[]) =>
    list.filter(n => !n.read && !n.archived).length, [])

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('archived', false)
      .order('created_at', { ascending: false })
      .limit(50)
    const list = (data || []) as AppNotification[]
    setItems(list)
    setUnread(recalcUnread(list))
    setLoading(false)
  }, [userId])

  useEffect(() => {
    load()
    if (!userId) return

    channelRef.current = supabase
      .channel(`notifs:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const n = payload.new as AppNotification
        setItems(prev => [n, ...prev])
        setUnread(prev => prev + 1)
        // Browser notification if permitted
        if (typeof window !== 'undefined' && Notification.permission === 'granted') {
          new Notification(n.title, { body: n.body, icon: '/icon-192.svg', tag: n.id })
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const updated = payload.new as AppNotification
        setItems(prev => {
          const next = prev.map(n => n.id === updated.id ? updated : n).filter(n => !n.archived)
          setUnread(recalcUnread(next))
          return next
        })
      })
      .subscribe()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [userId])

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setItems(prev => {
      const next = prev.map(n => n.id === id ? { ...n, read: true } : n)
      setUnread(recalcUnread(next))
      return next
    })
  }

  const markAllRead = async () => {
    if (!userId) return
    await supabase.from('notifications')
      .update({ read: true }).eq('user_id', userId).eq('read', false)
    setItems(prev => {
      const next = prev.map(n => ({ ...n, read: true }))
      setUnread(0)
      return next
    })
  }

  const archive = async (id: string) => {
    await supabase.from('notifications').update({ archived: true }).eq('id', id)
    setItems(prev => {
      const next = prev.filter(n => n.id !== id)
      setUnread(recalcUnread(next))
      return next
    })
  }

  const archiveAll = async () => {
    if (!userId) return
    await supabase.from('notifications')
      .update({ archived: true }).eq('user_id', userId).eq('archived', false)
    setItems([])
    setUnread(0)
  }

  return { items, unread, loading, markRead, markAllRead, archive, archiveAll, refresh: load }
}

// ── Web Push: request permission ──────────────────────────────
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  return Notification.requestPermission()
}

// ── Web Push: subscribe ───────────────────────────────────────
export async function subscribeToPush(userId: string): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push not supported in this browser')
  }
  const reg  = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  const sub = existing || await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
    ),
  })
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
  await fetch('/api/push/subscribe', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ userId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }),
  })
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (sub) await sub.unsubscribe()
  await fetch('/api/push/subscribe', { method: 'DELETE' })
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding  = '='.repeat((4 - (base64.length % 4)) % 4)
  const base64Std = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData  = atob(base64Std)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

// ── Notification bell UI component ────────────────────────────
import React from 'react'

interface BellProps {
  notifications: ReturnType<typeof useNotifications>
  position?: 'left' | 'right'
}

export function NotificationBell({ notifications, position = 'right' }: BellProps) {
  const [open, setOpen] = useState(false)
  const { items, unread, markRead, markAllRead, archive } = notifications

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ position: 'relative', background: 'none', border: '1px solid var(--border,#E8E6DE)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 18 }}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -6, right: -6,
            background: '#EFA020', color: '#fff',
            fontSize: 10, fontWeight: 700, minWidth: 18, height: 18,
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
          }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', [position]: 0, top: '100%', marginTop: 8,
          width: 340, maxHeight: 440, overflowY: 'auto',
          background: 'var(--bg-2,#F7F7F5)', border: '1px solid var(--border,#E8E6DE)',
          borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', zIndex: 1000,
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border,#E8E6DE)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Notifications {unread > 0 && `(${unread})`}</span>
            {unread > 0 && (
              <button onClick={markAllRead} style={{ fontSize: 12, color: '#EFA020', background: 'none', border: 'none', cursor: 'pointer' }}>
                Mark all read
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#8C8980', fontSize: 14 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔕</div>
              No notifications yet
            </div>
          ) : (
            items.map(n => (
              <div key={n.id} onClick={() => { markRead(n.id); if (n.action_url) window.location.href = n.action_url }}
                style={{
                  padding: '12px 16px', borderBottom: '1px solid var(--border,#E8E6DE)',
                  cursor: n.action_url ? 'pointer' : 'default',
                  background: n.read ? 'transparent' : 'rgba(239,160,32,0.05)',
                  transition: 'background 0.15s',
                }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{n.icon || TYPE_ICONS[n.type]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, margin: '0 0 2px', color: 'var(--text,#100F0A)' }}>{n.title}</p>
                    <p style={{ fontSize: 12, color: '#8C8980', margin: 0, lineHeight: 1.4 }}>{n.body}</p>
                    <p style={{ fontSize: 11, color: '#B8B5AB', margin: '4px 0 0' }}>
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); archive(n.id) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B8B5AB', fontSize: 14, flexShrink: 0, padding: '2px 4px' }}>
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
