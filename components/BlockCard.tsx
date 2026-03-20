'use client'
import Link from 'next/link'
import type { Block } from '@/lib/blocksData'
import { useCurrency } from '@/hooks/useCurrency'

const COMPLEXITY = {
  Beginner:     { dot: '#22C55E', label: 'Beginner' },
  Intermediate: { dot: 'var(--accent)', label: 'Intermediate' },
  Advanced:     { dot: '#E53E3E', label: 'Advanced' },
}

export function BlockCard({ block, featured }: { block: Block; featured?: boolean }) {
  const { formatPrice } = useCurrency()
  const c = COMPLEXITY[block.complexity]

  return (
    <Link href={`/blocks/${block.id}`} className="card group block p-5 no-underline relative overflow-hidden">
      {featured && (
        <div className="absolute top-0 right-0 bg-[var(--accent)] text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">
          BUNDLE · Save {block.bundleDiscount}%
        </div>
      )}

      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-display font-bold text-[var(--text)] text-[17px] leading-snug group-hover:text-[var(--accent)] transition-colors">
          {block.name}
        </h3>
        <span className="font-display font-bold text-[var(--accent)] text-xl shrink-0 tabular-nums">
          {formatPrice(block.price)}
        </span>
      </div>

      <p className="text-[var(--text-3)] text-[13px] leading-relaxed mb-4 line-clamp-2">{block.tagline}</p>

      <div className="flex items-center gap-3 flex-wrap text-[12px] text-[var(--text-3)]">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: c.dot }} />
          {c.label}
        </span>
        <span>⏱ {block.timeSavedHours}h saved</span>
        <span>~{block.linesOfCode >= 1000 ? `${(block.linesOfCode/1000).toFixed(1)}k` : block.linesOfCode} lines</span>
      </div>

      {block.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4">
          {block.tags.slice(0, 3).map(t => (
            <span key={t} className="badge bg-[var(--bg-3)] text-[var(--text-3)] text-[11px]">#{t}</span>
          ))}
        </div>
      )}
    </Link>
  )
}
