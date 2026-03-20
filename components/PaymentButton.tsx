'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useCurrency } from '@/hooks/useCurrency'

interface Props { blockId: string; blockName: string; price: number; affiliateCode?: string | null }

// Razorpay loads its own checkout.js — this types the global
declare global {
  interface Window { Razorpay: any }
}

export function PaymentButton({ blockId, blockName, price, affiliateCode }: Props) {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [sdkReady, setSdkReady] = useState(false)
  const { formatPrice } = useCurrency()

  // Load Razorpay checkout.js once on mount
  useEffect(() => {
    if (window.Razorpay) { setSdkReady(true); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload  = () => setSdkReady(true)
    script.onerror = () => toast.error('Failed to load payment SDK. Refresh and try again.')
    document.body.appendChild(script)
  }, [])

  const handleClick = async () => {
    if (!session) { router.push(`/auth/signin?redirect=/blocks/${blockId}`); return }
    if (!sdkReady) { toast.error('Payment SDK loading, try again in a second.'); return }

    setLoading(true)
    try {
      // Step 1 — create order on server
      const res = await fetch('/api/purchase/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockId, affiliateCode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create order')

      // Step 2 — open Razorpay checkout
      const rzp = new window.Razorpay({
        key:         data.keyId,
        amount:      data.amount,
        currency:    data.currency,
        name:        'MarrowStack',
        description: data.blockName.replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 255),
        order_id:    data.orderId,
        prefill: {
          name:  data.userName,
          email: data.userEmail,
        },
        theme: { color: '#EFA020' },
        modal: {
          ondismiss: () => setLoading(false),
        },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          // Step 3 — verify + fulfil on server
          try {
            const captureRes = await fetch('/api/purchase/capture', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId:   response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            })
            const captureData = await captureRes.json()
            if (!captureRes.ok) throw new Error(captureData.error || 'Capture failed')
            // Redirect to success page
            router.push('/purchase/success?status=ok&blockId=' + blockId)
          } catch (err: any) {
            toast.error(err.message)
            setLoading(false)
          }
        },
      })
      rzp.open()
    } catch (err: any) {
      toast.error(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <button onClick={handleClick} disabled={loading || !sdkReady}
        className="btn-accent w-full py-4 text-[15px] font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
        {loading ? (
          <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing…</>
        ) : (
          <><span>Pay {formatPrice(price)}</span></>
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
