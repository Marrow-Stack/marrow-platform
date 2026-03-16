'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Props { blockId: string; blockName: string; price: number; affiliateCode?: string | null }

export function PaymentButton({ blockId, blockName, price, affiliateCode }: Props) {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (!session) {
      router.push(`/auth/signin?redirect=/blocks/${blockId}`)
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/purchase/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockId, affiliateCode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create order')
      window.location.href = data.approvalUrl
    } catch (err: any) {
      toast.error(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <button onClick={handleClick} disabled={loading}
        className="btn-accent w-full py-4 text-[15px] font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
        {loading ? (
          <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Redirecting to PayPal…</>
        ) : (
          <><span>Pay ${price} via PayPal</span><span className="opacity-60 font-normal text-sm">· ≈ ₹{(price * 84).toLocaleString('en-IN')}</span></>
        )}
      </button>
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2 text-[12px]" style={{ color: '#16A34A' }}>
          🛡️ <span>30-day money-back guarantee</span>
        </div>
      </div>
      <div className="space-y-1.5 pt-1">
        {['Instant GitHub repo access', 'Own the code forever', 'Free updates', '30-day refund if it breaks'].map(item => (
          <p key={item} className="flex items-center gap-2 text-[12px] text-[var(--text-3)]">
            <span style={{ color: 'var(--accent)' }}>✓</span>{item}
          </p>
        ))}
      </div>
    </div>
  )
}
