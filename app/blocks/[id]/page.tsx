import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Navbar } from '@/components/Navbar'
import { CodePreview } from '@/components/CodePreview'
import { BlockCard } from '@/components/BlockCard'
import { getBlock, BLOCKS, ALL_BLOCKS } from '@/lib/blocksData'
import type { Metadata } from 'next'
import { BuyCard } from './BuyCard'

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ref?: string }> }

export async function generateStaticParams() {
  return ALL_BLOCKS.map(b => ({ id: b.id }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const block = getBlock(id)
  if (!block) return {}
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://marrowstack.dev'
  return {
    title: `${block.name} — $${block.price}`,
    description: block.description,
    openGraph: {
      images: [`${base}/api/og?title=${encodeURIComponent(block.name)}&sub=${encodeURIComponent(block.tagline)}&price=${block.price}`],
    },
  }
}

const COMPLEXITY = {
  Beginner:     { color: '#22C55E', bg: 'rgba(34,197,94,0.08)' },
  Intermediate: { color: 'var(--accent)', bg: 'var(--accent-bg)' },
  Advanced:     { color: '#E53E3E', bg: 'rgba(229,62,62,0.08)' },
}

export default async function BlockPage({ params, searchParams }: Props) {
  const { id } = await params
  const { ref } = await searchParams
  const block = getBlock(id)
  if (!block) notFound()

  const c = COMPLEXITY[block.complexity]
  const related = BLOCKS.filter(b => b.id !== block.id && (b.category === block.category || b.tags.some(t => block.tags.includes(t)))).slice(0, 3)

  return (
    <div className="min-h-screen bg-base">
      <Navbar />
      <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-24 pb-24">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[12px] text-[var(--text-3)] mb-8 pt-2">
          <a href="/blocks" className="hover:text-[var(--text)] transition-colors">Blocks</a>
          <span>/</span>
          <span className="text-[var(--text-2)]">{block.name}</span>
        </div>

        <div className="grid lg:grid-cols-[1fr,320px] gap-12">
          {/* Left */}
          <div>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="badge text-[11px]" style={{ background: c.bg, color: c.color }}>
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: c.color }} />
                {block.complexity}
              </span>
              <span className="badge text-[11px]" style={{ background: 'var(--bg-3)', color: 'var(--text-3)' }}>{block.category}</span>
            </div>

            <h1 className="font-display font-black text-[40px] sm:text-[52px] leading-tight text-[var(--text)] mb-3">{block.name}</h1>
            <p className="text-[18px] text-[var(--text-2)] mb-6 leading-relaxed">{block.tagline}</p>
            <p className="text-[var(--text-2)] leading-relaxed mb-8">{block.description}</p>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { v: `${block.timeSavedHours}h`, l: 'Time saved' },
                { v: block.linesOfCode >= 1000 ? `${(block.linesOfCode/1000).toFixed(1)}k` : String(block.linesOfCode), l: 'Lines of code' },
                { v: '100%', l: 'TypeScript' },
              ].map(({ v, l }) => (
                <div key={l} className="card p-4 text-center cursor-default">
                  <div className="font-display font-bold text-[22px]" style={{ color: 'var(--accent)' }}>{v}</div>
                  <div className="text-[11px] text-[var(--text-3)] mt-1">{l}</div>
                </div>
              ))}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-8">
              {block.tags.map(t => (
                <span key={t} className="badge text-[12px]" style={{ background: 'var(--bg-3)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>#{t}</span>
              ))}
            </div>

            {/* Deps */}
            {block.deps.length > 0 && (
              <div className="mb-10">
                <h3 className="text-[13px] font-semibold text-[var(--text-2)] mb-3">Dependencies</h3>
                <div className="flex flex-wrap gap-2">
                  {block.deps.map(d => (
                    <code key={d} className="badge text-[12px] font-mono" style={{ background: 'var(--bg-2)', color: 'var(--accent)', border: '1px solid var(--border)' }}>{d}</code>
                  ))}
                </div>
              </div>
            )}

            {/* Bundle contents */}
            {block.isBundle && block.bundleIds && (
              <div className="mb-10">
                <h3 className="text-[13px] font-semibold text-[var(--text-2)] mb-4">What's in this bundle</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {block.bundleIds.map(id => {
                    const b = getBlock(id)
                    if (!b) return null
                    return (
                      <div key={id} className="card p-4 flex items-center gap-3">
                        <span style={{ color: 'var(--accent)' }}>✓</span>
                        <div>
                          <p className="text-[13px] font-semibold text-[var(--text)]">{b.name}</p>
                          <p className="text-[11px] text-[var(--text-3)]">${b.price} individually</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p className="text-[13px] mt-3" style={{ color: '#22C55E' }}>
                  You save ${block.bundleIds.reduce((s, id) => s + (getBlock(id)?.price || 0), 0) - block.price} vs buying individually
                </p>
              </div>
            )}

            {/* Code preview */}
            <div className="mb-10">
              <h2 className="font-display font-semibold text-[18px] text-[var(--text)] mb-4">Code preview</h2>
              <CodePreview code={block.preview} filename={`blocks/${block.id}/index.ts`} />
              <p className="text-[12px] text-[var(--text-3)] mt-3">
                Short excerpt. Full block includes SQL migrations, error handling, RLS policies, and complete file structure.
              </p>
            </div>
          </div>

          {/* Right — sticky buy card */}
          <div>
            <div className="lg:sticky lg:top-24">
              <Suspense fallback={<div className="card p-6 h-64 animate-pulse" />}>
                <BuyCard block={block} affiliateCode={ref} />
              </Suspense>
            </div>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-16 pt-10 border-t border-[var(--border)]">
            <h2 className="font-display font-semibold text-[18px] text-[var(--text)] mb-6">You might also like</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {related.map(b => <BlockCard key={b.id} block={b} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
