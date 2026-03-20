'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'

function SuccessContent() {
  const searchParams = useSearchParams()
  const status  = searchParams.get('status')
  const blockId = searchParams.get('blockId')

  // Razorpay: status=ok means capture already completed in the handler
  if (status === 'ok') {
    return (
      <div className="card max-w-md w-full p-10 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-6"
          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>🎉</div>
        <h1 className="font-display font-black text-[28px] text-[var(--text)] mb-2">You're in!</h1>
        <p className="text-[var(--text-2)] mb-2">Payment confirmed. GitHub repo access granted.</p>
        <p className="text-[var(--text-3)] text-sm mb-8">Check your email for confirmation. Accept the GitHub invite to clone the repo.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard" className="btn-accent px-6 py-2.5 text-sm font-semibold text-white">View in Dashboard →</Link>
          {blockId && <Link href={`/blocks/${blockId}`} className="btn-ghost px-6 py-2.5 text-sm">Block details</Link>}
        </div>
      </div>
    )
  }

  return (
    <div className="card max-w-md w-full p-8 text-center">
      <p className="text-4xl mb-4">⚠️</p>
      <h1 className="font-display font-bold text-[22px] text-[var(--text)] mb-2">Something went wrong</h1>
      <p className="text-[var(--text-2)] text-sm mb-6">If payment was deducted, email <a href="mailto:support@marrowstack.dev" className="text-[var(--accent)]">support@marrowstack.dev</a></p>
      <Link href="/dashboard" className="btn-accent inline-flex px-6 py-2.5 text-sm font-semibold text-white">Go to Dashboard</Link>
    </div>
  )
}

export default function PurchaseSuccessPage() {
  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4">
      <Suspense fallback={<div className="w-8 h-8 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />}>
        <SuccessContent />
      </Suspense>
    </div>
  )
}