import { Navbar } from '@/components/Navbar'
import { BlockCard } from '@/components/BlockCard'
import { BLOCKS, BUNDLES, CATEGORIES } from '@/lib/blocksData'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'All Blocks',
  description: 'Browse all production-ready Next.js code blocks. Auth, billing, admin, teams, and 13 more.',
}

export default function BlocksPage() {
  return (
    <div className="min-h-screen bg-base">
      <Navbar />
      <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-24 pb-24">

        <div className="mb-14 pt-4">
          <p className="text-[12px] uppercase tracking-widest text-[var(--text-3)] font-semibold mb-3">Library</p>
          <h1 className="font-display font-black text-[44px] sm:text-[56px] text-[var(--text)] leading-tight mb-3">All Blocks</h1>
          <p className="text-[var(--text-2)] text-[16px] max-w-lg">
            {BLOCKS.length} individual blocks · {BUNDLES.length} bundles. Each one fully typed, Supabase-ready, and pushed to your private GitHub repo the moment you pay.
          </p>
        </div>

        {/* Bundles */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-5">
            <h2 className="font-display font-bold text-[18px] text-[var(--text)]">Bundle deals</h2>
            <span className="badge text-[11px]" style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid rgba(239,160,32,0.2)' }}>
              Best value
            </span>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {BUNDLES.map(b => <BlockCard key={b.id} block={b} featured />)}
          </div>
        </section>

        {/* Categories */}
        {CATEGORIES.map(cat => {
          const blocks = BLOCKS.filter(b => b.category === cat)
          if (!blocks.length) return null
          return (
            <section key={cat} className="mb-12">
              <h2 className="font-display font-semibold text-[18px] text-[var(--text)] mb-5 flex items-center gap-2">
                {cat}
                <span className="text-[12px] font-sans font-normal text-[var(--text-3)]">{blocks.length} block{blocks.length !== 1 ? 's' : ''}</span>
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {blocks.map(b => <BlockCard key={b.id} block={b} />)}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
