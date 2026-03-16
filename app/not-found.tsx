import Link from 'next/link'
import { Navbar } from '@/components/Navbar'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-base">
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <p className="font-display font-black text-[120px] sm:text-[160px] leading-none text-[var(--border)] select-none">404</p>
        <h1 className="font-display font-bold text-[26px] text-[var(--text)] mt-2 mb-3">Page not found</h1>
        <p className="text-[var(--text-2)] text-[15px] mb-8 max-w-sm">The page you're looking for doesn't exist or has been moved.</p>
        <div className="flex gap-3">
          <Link href="/" className="btn-accent px-6 py-2.5 text-sm font-semibold text-white">Go home</Link>
          <Link href="/blocks" className="btn-ghost px-6 py-2.5 text-sm">Browse blocks</Link>
        </div>
      </div>
    </div>
  )
}
