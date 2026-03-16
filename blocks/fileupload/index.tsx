// ============================================================
// MarrowStack Block: File Upload
// Stack: Next.js 14 + Supabase Storage + React
// Covers: drag-and-drop, type validation, size limits,
//         signed URLs, progress tracking, multi-file, delete,
//         image preview, RLS policies
// ============================================================
'use client'

// ── SQL / Storage Setup ───────────────────────────────────────
/*
-- In Supabase Dashboard: Storage → New Bucket
-- Name: "uploads" — set to Private (use signed URLs)

-- RLS: authenticated users upload only to their own folder
CREATE POLICY "upload_own_folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "read_own_files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "delete_own_files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Track uploads in DB (optional but recommended)
CREATE TABLE IF NOT EXISTS user_files (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bucket      TEXT NOT NULL DEFAULT 'uploads',
  path        TEXT NOT NULL,
  name        TEXT NOT NULL,
  size        BIGINT NOT NULL,
  mime_type   TEXT NOT NULL,
  url         TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, path)
);
ALTER TABLE user_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "files_own" ON user_files FOR ALL USING (user_id::text = auth.uid()::text);
*/

import { useState, useCallback, useRef, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ── Types ─────────────────────────────────────────────────────
export interface UploadedFile {
  name:     string
  path:     string
  size:     number
  type:     string
  url:      string
  isImage:  boolean
  preview?: string    // Object URL for local preview
}

export interface UploadConfig {
  bucket?:          string
  maxSizeMB?:       number
  allowedTypes?:    string[]
  signedUrlTTL?:    number    // seconds — defaults to 1 week
  folder?:          string    // sub-folder within userId/
}

const DEFAULT_CONFIG: Required<UploadConfig> = {
  bucket:       'uploads',
  maxSizeMB:    10,
  allowedTypes: ['image/jpeg','image/png','image/webp','image/gif','image/svg+xml','application/pdf'],
  signedUrlTTL: 60 * 60 * 24 * 7,
  folder:       '',
}

// ── Core upload function ──────────────────────────────────────
export async function uploadFile(
  userId: string,
  file: File,
  config: UploadConfig = {}
): Promise<UploadedFile> {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  // Validate
  if (!cfg.allowedTypes.includes(file.type)) {
    throw new Error(`File type "${file.type}" is not allowed.`)
  }
  if (file.size > cfg.maxSizeMB * 1024 * 1024) {
    throw new Error(`File exceeds ${cfg.maxSizeMB}MB limit.`)
  }

  const ext        = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const folder     = cfg.folder ? `${userId}/${cfg.folder}` : userId
  const path       = `${folder}/${uniqueName}`

  const { error } = await supabase.storage
    .from(cfg.bucket)
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type })

  if (error) throw new Error(`Upload failed: ${error.message}`)

  const { data: urlData, error: urlErr } = await supabase.storage
    .from(cfg.bucket)
    .createSignedUrl(path, cfg.signedUrlTTL)

  if (urlErr || !urlData) throw new Error('Could not generate signed URL')

  return {
    name:    file.name,
    path,
    size:    file.size,
    type:    file.type,
    url:     urlData.signedUrl,
    isImage: file.type.startsWith('image/'),
  }
}

// ── Avatar upload (public bucket variant) ─────────────────────
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Avatar must be an image')
  if (file.size > 5 * 1024 * 1024)    throw new Error('Avatar must be under 5MB')

  const ext  = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${userId}/avatar.${ext}`

  await supabase.storage.from('avatars').upload(path, file, {
    upsert: true, cacheControl: '3600', contentType: file.type,
  })

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}

// ── Delete file ───────────────────────────────────────────────
export async function deleteFile(path: string, bucket = 'uploads'): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw new Error(`Delete failed: ${error.message}`)
}

// ── Refresh signed URL ─────────────────────────────────────────
export async function refreshSignedUrl(
  path: string,
  expiresIn = 3600,
  bucket = 'uploads'
): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
  if (error || !data) throw new Error('Could not refresh URL')
  return data.signedUrl
}

// ── List user files ───────────────────────────────────────────
export async function listUserFiles(userId: string, bucket = 'uploads'): Promise<{ name: string; path: string; size: number }[]> {
  const { data, error } = await supabase.storage.from(bucket).list(userId, {
    limit: 100, offset: 0, sortBy: { column: 'created_at', order: 'desc' },
  })
  if (error) throw error
  return (data || []).map(f => ({
    name: f.name,
    path: `${userId}/${f.name}`,
    size: f.metadata?.size || 0,
  }))
}

// ── Format file size ──────────────────────────────────────────
export function formatFileSize(bytes: number): string {
  if (bytes < 1024)           return `${bytes} B`
  if (bytes < 1024 * 1024)    return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── Dropzone component ────────────────────────────────────────
export interface DropzoneProps {
  userId:      string
  onUpload:    (file: UploadedFile) => void
  onError?:    (message: string) => void
  config?:     UploadConfig
  multiple?:   boolean
  disabled?:   boolean
  className?:  string
}

export function FileDropzone({
  userId, onUpload, onError, config = {}, multiple = false, disabled = false
}: DropzoneProps) {
  const [dragging,  setDragging]  = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress,  setProgress]  = useState(0)
  const [previews,  setPreviews]  = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const cfg = { ...DEFAULT_CONFIG, ...config }

  // Cleanup object URLs on unmount
  useEffect(() => () => { previews.forEach(URL.revokeObjectURL) }, [])

  const processFiles = async (fileList: FileList | null) => {
    if (!fileList?.length || disabled) return
    const files = multiple ? Array.from(fileList) : [fileList[0]]

    for (const file of files) {
      setUploading(true); setProgress(0)

      // Local preview for images
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file)
        setPreviews(prev => [...prev, url])
      }

      // Fake progress (Supabase Storage v2 doesn't expose upload progress)
      const ticker = setInterval(() => {
        setProgress(p => p < 85 ? p + Math.random() * 12 : p)
      }, 180)

      try {
        const uploaded = await uploadFile(userId, file, config)
        clearInterval(ticker)
        setProgress(100)
        onUpload(uploaded)
        setTimeout(() => setProgress(0), 800)
      } catch (err: any) {
        clearInterval(ticker)
        setProgress(0)
        onError?.(err.message || 'Upload failed')
      } finally {
        setUploading(false)
      }
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    processFiles(e.dataTransfer.files)
  }, [userId])

  const borderColor = disabled ? '#d1d5db' : dragging ? '#EFA020' : 'var(--border,#DDDBD4)'
  const bgColor     = disabled ? '#f9fafb' : dragging ? 'rgba(239,160,32,0.05)' : 'var(--bg-2,#F7F7F5)'

  return (
    <div>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="File upload zone"
        onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={e => e.key === 'Enter' && !disabled && inputRef.current?.click()}
        style={{
          border: `2px dashed ${borderColor}`,
          borderRadius: 14,
          padding: '32px 24px',
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: bgColor,
          transition: 'all 0.2s',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 10 }}>
          {uploading ? '⏫' : '📁'}
        </div>
        <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: 'var(--text,#100F0A)' }}>
          {uploading ? 'Uploading…' : 'Drop files here or click to browse'}
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#8C8980' }}>
          {cfg.allowedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')} · Max {cfg.maxSizeMB}MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={cfg.allowedTypes.join(',')}
          multiple={multiple}
          disabled={disabled}
          onChange={e => processFiles(e.target.files)}
          style={{ display: 'none' }}
        />
      </div>

      {/* Progress bar */}
      {uploading && progress > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ height: 4, background: 'var(--bg-3,#ECEAE3)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: '#EFA020', borderRadius: 2, transition: 'width 0.15s ease',
            }} />
          </div>
          <p style={{ fontSize: 12, color: '#8C8980', margin: '4px 0 0' }}>
            {progress < 100 ? `Uploading… ${Math.round(progress)}%` : '✓ Done'}
          </p>
        </div>
      )}
    </div>
  )
}

// ── File list component ───────────────────────────────────────
interface FileListProps {
  files: UploadedFile[]
  onDelete?: (path: string) => void
}

export function FileList({ files, onDelete }: FileListProps) {
  if (!files.length) return null

  return (
    <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {files.map((f, i) => (
        <li key={i} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 14px', background: 'var(--bg-2,#F7F7F5)',
          border: '1px solid var(--border,#DDDBD4)', borderRadius: 10,
        }}>
          {f.isImage && f.url
            ? <img src={f.url} alt={f.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
            : <span style={{ fontSize: 28, flexShrink: 0 }}>📄</span>
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: 'var(--text,#100F0A)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</p>
            <p style={{ margin: 0, fontSize: 12, color: '#8C8980' }}>{formatFileSize(f.size)}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <a href={f.url} download={f.name} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, color: '#EFA020', textDecoration: 'none', fontWeight: 600 }}>
              Download
            </a>
            {onDelete && (
              <button onClick={() => onDelete(f.path)}
                style={{ fontSize: 12, color: '#E53E3E', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Delete
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
