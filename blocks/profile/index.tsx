// ============================================================
// MarrowStack Block: User Profile
// Stack: Next.js 14 + Supabase Storage + React Hook Form + Zod
// ============================================================
'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ── SQL ───────────────────────────────────────────────────────
/*
-- Add to profiles table:
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS twitter TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notifications_email BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notifications_marketing BOOLEAN DEFAULT false;

-- Storage bucket (set to public or use signed URLs):
-- Supabase Dashboard → Storage → New Bucket → "avatars" → public
*/

// ── Zod Schema ────────────────────────────────────────────────
const ProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  bio: z.string().max(200, 'Bio max 200 characters').optional(),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  twitter: z.string().regex(/^@?[a-zA-Z0-9_]{1,15}$/, 'Invalid Twitter handle').optional().or(z.literal('')),
  location: z.string().max(60).optional(),
  notifications_email: z.boolean(),
  notifications_marketing: z.boolean(),
})
type ProfileInput = z.infer<typeof ProfileSchema>

// ── Server actions (in app/profile/actions.ts) ────────────────
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${userId}/avatar.${ext}`

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, cacheControl: '3600', contentType: file.type })
  if (error) throw error

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
  await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId)
  return publicUrl
}

export async function updateProfile(userId: string, data: ProfileInput): Promise<void> {
  const { error } = await supabase.from('profiles').update({
    name: data.name,
    bio: data.bio || null,
    website: data.website || null,
    twitter: data.twitter ? data.twitter.replace(/^@/, '') : null,
    location: data.location || null,
    notifications_email: data.notifications_email,
    notifications_marketing: data.notifications_marketing,
    updated_at: new Date().toISOString(),
  }).eq('id', userId)
  if (error) throw error
}

export async function deleteAccount(userId: string): Promise<void> {
  // Soft delete: anonymize profile
  await supabase.from('profiles').update({
    email: `deleted_${userId}@deleted.local`,
    name: 'Deleted User',
    bio: null,
    avatar_url: null,
    password_hash: null,
  }).eq('id', userId)
  // In production: also revoke all sessions via Supabase admin
}

// ── UI Component ──────────────────────────────────────────────
interface ProfileFormProps {
  userId: string
  defaultValues: Partial<ProfileInput>
  currentAvatar?: string | null
  onSuccess?: () => void
}

export function ProfileForm({ userId, defaultValues, currentAvatar, onSuccess }: ProfileFormProps) {
  const [avatar, setAvatar] = useState<string | null>(currentAvatar || null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileInput>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: { notifications_email: true, notifications_marketing: false, ...defaultValues },
  })

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('File must be under 5MB'); return }
    if (!file.type.startsWith('image/')) { alert('File must be an image'); return }

    setUploading(true)
    try {
      const url = await uploadAvatar(userId, file)
      setAvatar(url)
    } catch (err) {
      alert('Avatar upload failed')
    } finally {
      setUploading(false)
    }
  }

  const onSubmit = async (data: ProfileInput) => {
    setSaving(true)
    try {
      await updateProfile(userId, data)
      onSuccess?.()
      alert('Profile saved!')
    } catch {
      alert('Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#e5e7eb', overflow: 'hidden', position: 'relative' }}>
          {avatar ? <img src={avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#9ca3af' }}>👤</div>
          )}
        </div>
        <div>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ padding: '8px 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>
            {uploading ? 'Uploading...' : 'Change Photo'}
          </button>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0' }}>JPG, PNG or WebP. Max 5MB.</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
      </div>

      {/* Fields */}
      {[
        { name: 'name' as const, label: 'Display Name', placeholder: 'Your name' },
        { name: 'bio' as const, label: 'Bio', placeholder: 'Short bio (max 200 chars)', multiline: true },
        { name: 'website' as const, label: 'Website', placeholder: 'https://yoursite.com' },
        { name: 'twitter' as const, label: 'Twitter', placeholder: '@handle' },
        { name: 'location' as const, label: 'Location', placeholder: 'City, Country' },
      ].map(({ name, label, placeholder, multiline }) => (
        <div key={name}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 4 }}>{label}</label>
          {multiline
            ? <textarea {...register(name)} placeholder={placeholder} rows={3}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
            : <input {...register(name)} placeholder={placeholder}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
          }
          {errors[name] && <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{errors[name]?.message}</p>}
        </div>
      ))}

      {/* Notifications */}
      <div>
        <p style={{ fontWeight: 500, fontSize: 14, marginBottom: 8 }}>Notifications</p>
        {[
          { name: 'notifications_email' as const, label: 'Product updates and announcements' },
          { name: 'notifications_marketing' as const, label: 'Tips, guides, and special offers' },
        ].map(({ name, label }) => (
          <label key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', fontSize: 14 }}>
            <input type="checkbox" {...register(name)} />
            {label}
          </label>
        ))}
      </div>

      <button type="submit" disabled={saving}
        style={{ padding: '12px 24px', background: '#FBBF24', color: '#0C0C0A', fontWeight: 700, border: 'none', borderRadius: 10, fontSize: 15, cursor: 'pointer' }}>
        {saving ? 'Saving...' : 'Save Profile'}
      </button>
    </form>
  )
}
