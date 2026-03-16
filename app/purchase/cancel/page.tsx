import Link from 'next/link'
export default function PurchaseCancelPage() {
  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4">
      <div className="card max-w-sm w-full p-10 text-center">
        <p className="text-4xl mb-4">↩️</p>
        <h1 className="font-display font-bold text-[22px] text-[var(--text)] mb-2">Payment cancelled</h1>
        <p className="text-[var(--text-2)] text-sm mb-8">No charge was made. Come back anytime.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/blocks" className="btn-accent px-6 py-2.5 text-sm font-semibold text-white">Browse Blocks</Link>
          <Link href="/" className="btn-ghost px-6 py-2.5 text-sm">Go Home</Link>
        </div>
      </div>
    </div>
  )
}
