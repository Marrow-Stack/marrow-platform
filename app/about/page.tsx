import { Navbar } from '@/components/Navbar'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About — MarrowStack',
  description: 'MarrowStack is built by Samarth Shukla, a developer from India.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-base">
      <Navbar />
      <div className="max-w-2xl mx-auto px-5 sm:px-8 pt-28 pb-24">
        <div className="mb-10">
          <p className="text-[12px] uppercase tracking-widest text-[var(--text-3)] font-semibold mb-3">About</p>
          <h1 className="font-display font-black text-[40px] text-[var(--text)] mb-4">Who built this</h1>
        </div>

        <div className="space-y-6 text-[var(--text-2)] text-[15px] leading-relaxed">
          <p>
            MarrowStack is built and maintained by <strong className="text-[var(--text)]">Samarth Shukla</strong>, a developer from India.
          </p>
          <p>
            I got tired of rebuilding the same foundational pieces — auth, billing, notifications, search — every time I started a new project. So I packaged the production-grade versions into copy-paste TypeScript files that drop straight into a Next.js project.
          </p>
          <p>
            Every block is code I have actually used in real projects. Fully typed, Supabase-ready, with SQL migrations included. You buy it once, get instant GitHub access, and own it forever.
          </p>

          <div className="border border-[var(--border)] rounded-2xl p-6 mt-8 space-y-3">
            <p className="font-semibold text-[var(--text)]">Business details</p>
            <p className="text-[13px] text-[var(--text-3)]">Operated as an individual / sole proprietor</p>
            <p className="text-[13px] text-[var(--text-3)]">Based in India</p>
            <p className="text-[13px]">
              <span className="text-[var(--text-3)]">Email: </span>
              <a href="mailto:support@marrowstack.dev" className="text-[var(--accent)]">support@marrowstack.dev</a>
            </p>
            <p className="text-[13px]">
              <span className="text-[var(--text-3)]">Website: </span>
              <a href="https://marrowstack.dev" className="text-[var(--accent)]">marrowstack.dev</a>
            </p>
          </div>
        </div>

        <div className="border-t border-[var(--border)] mt-12 pt-8 flex gap-4 text-[13px] text-[var(--text-3)]">
          <Link href="/terms" className="hover:text-[var(--text)] transition-colors">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-[var(--text)] transition-colors">Privacy Policy</Link>
          <Link href="/" className="hover:text-[var(--text)] transition-colors">← Back to home</Link>
        </div>
      </div>
    </div>
  )
}
