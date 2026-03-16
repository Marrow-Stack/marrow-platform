'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

function SuccessContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [blockId, setBlockId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    // PayPal returns ?token=ORDER_ID on success redirect
    const orderId = searchParams.get('token') || searchParams.get('orderId')
    if (!orderId) { setStatus('error'); setError('No order ID in URL.'); return }

    fetch('/api/purchase/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) { setStatus('success'); setBlockId(d.blockId); toast.success('GitHub access granted!') }
        else { setStatus('error'); setError(d.error || 'Capture failed') }
      })
      .catch(() => { setStatus('error'); setError('Network error. Email support@marrowstack.dev') })
  }, [])

  if (status === 'loading') return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
      <p className="text-[var(--text-3)] text-sm">Confirming payment and granting GitHub access…</p>
    </div>
  )

  if (status === 'error') return (
    <div className="card max-w-md w-full p-8 text-center">
      <p className="text-4xl mb-4">⚠️</p>
      <h1 className="font-display font-bold text-[22px] text-[var(--text)] mb-2">Something went wrong</h1>
      <p className="text-[var(--text-2)] text-sm mb-4">{error}</p>
      <p className="text-[var(--text-3)] text-sm mb-6">If payment went through, email <a href="mailto:support@marrowstack.dev" className="text-[var(--accent)]">support@marrowstack.dev</a></p>
      <Link href="/dashboard" className="btn-accent inline-flex px-6 py-2.5 text-sm font-semibold text-white">Go to Dashboard</Link>
    </div>
  )

  return (
    <div className="card max-w-md w-full p-10 text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-6"
        style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>🎉</div>
      <h1 className="font-display font-black text-[28px] text-[var(--text)] mb-2">You're in!</h1>
      <p className="text-[var(--text-2)] mb-2">Payment confirmed. You've been invited to the GitHub repository.</p>
      <p className="text-[var(--text-3)] text-sm mb-8">Check your email for the GitHub invite. Accept within 7 days to clone the repo.</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/dashboard" className="btn-accent px-6 py-2.5 text-sm font-semibold text-white">View in Dashboard →</Link>
        {blockId && <Link href={`/blocks/${blockId}`} className="btn-ghost px-6 py-2.5 text-sm">Block details</Link>}
      </div>
    </div>
  )
}

export default function PurchaseSuccessPage() {
  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4">
      <Suspense fallback={
        <div className="w-8 h-8 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
      }>
        <SuccessContent />
      </Suspense>
    </div>
  )
}
