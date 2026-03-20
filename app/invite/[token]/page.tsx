'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Navbar } from '@/components/Navbar'

export default function InvitePage() {
  const params = useParams()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')

  useEffect(() => {
    // Fetch invite details
    fetch(`/api/invite/${params.token as string}`)
      .then(r => r.json())
      .then(d => { if (d.workspaceName) setWorkspaceName(d.workspaceName) })
      .catch(() => {})
  }, [params.token])

  const accept = async () => {
    if (!session) { router.push(`/auth/signin?redirect=/invite/${params.token}`); return }
    setState('loading')
    const res = await fetch('/api/invite/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: params.token as string }),
    })
    const data = await res.json()
    if (res.ok) { setState('success'); setTimeout(() => router.push('/dashboard'), 1500) }
    else { setState('error'); setMessage(data.error || 'Invalid or expired invite') }
  }

  return (
    <div className="min-h-screen bg-base">
      <Navbar />
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="card max-w-sm w-full p-8 text-center">
          {state === 'success' ? (
            <>
              <p className="text-4xl mb-4">🎉</p>
              <h1 className="font-display font-bold text-[20px] text-[var(--text)] mb-2">You're in!</h1>
              <p className="text-[var(--text-3)] text-sm">Redirecting to dashboard…</p>
            </>
          ) : (
            <>
              <p className="text-4xl mb-4">✉️</p>
              <h1 className="font-display font-bold text-[20px] text-[var(--text)] mb-2">
                {workspaceName ? `Join ${workspaceName}` : 'Team Invitation'}
              </h1>
              <p className="text-[var(--text-2)] text-sm mb-6">You've been invited to collaborate on a workspace.</p>
              {state === 'error' && <p className="text-red-500 text-sm mb-4">{message}</p>}
              {status === 'loading' ? (
                <div className="w-6 h-6 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin mx-auto" />
              ) : (
                <div className="flex flex-col gap-2">
                  <button onClick={accept} disabled={state === 'loading'}
                    className="btn-accent w-full py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                    {state === 'loading' ? 'Accepting…' : 'Accept Invitation'}
                  </button>
                  <Link href="/" className="btn-ghost py-2.5 text-sm text-center">Decline</Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
