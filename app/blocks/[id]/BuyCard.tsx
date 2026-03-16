'use client'
import { useSession } from 'next-auth/react'
import { PaymentButton } from '@/components/PaymentButton'
import type { Block } from '@/lib/blocksData'
import Link from 'next/link'

export function BuyCard({ block, affiliateCode }: { block: Block; affiliateCode?: string | null }) {
  const { data: session } = useSession()

  // Warn signed-in users who don't have a GitHub username set
  const noGitHub = session?.user && !session.user.githubUsername

  return (
    <div className="card p-6">
      <div className="mb-1">
        <span className="font-display font-black text-[38px] text-[var(--text)]">${block.price}</span>
        <span className="text-[var(--text-3)] text-sm ml-2">≈ ₹{(block.price * 84).toLocaleString('en-IN')}</span>
      </div>
      <p className="text-[12px] text-[var(--text-3)] mb-4">One-time · Instant GitHub access</p>

      {noGitHub && (
        <div className="rounded-xl p-3.5 mb-4 text-[13px]"
          style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}>
          <p className="font-semibold mb-1" style={{ color: 'var(--accent)' }}>⚠️ GitHub username missing</p>
          <p style={{ color: 'var(--text-2)' }}>
            We need your GitHub username to grant repo access.{' '}
            <Link href="/dashboard" className="underline" style={{ color: 'var(--accent)' }}>
              Add it in your profile →
            </Link>
          </p>
        </div>
      )}

      <PaymentButton
        blockId={block.id}
        blockName={block.name}
        price={block.price}
        affiliateCode={affiliateCode}
      />
    </div>
  )
}
