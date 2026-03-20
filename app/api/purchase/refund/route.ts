import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { refundPayment, usdToInrPaise, getLiveUsdToInr } from '@/lib/razorpay'
import { sendRefundEmail } from '@/lib/email'
import { getBlock } from '@/lib/blocksData'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { purchaseId } = await req.json()
  const userId = session.user.id

  const { data: purchase } = await supabaseAdmin.from('purchases')
    .select('*').eq('id', purchaseId).eq('user_id', userId).eq('status', 'completed').single()
  if (!purchase) return NextResponse.json({ error: 'Purchase not found or already refunded' }, { status: 404 })

  const daysSince = (Date.now() - new Date(purchase.created_at).getTime()) / 86400000
  if (daysSince > 30) return NextResponse.json({ error: 'Refund window has expired (30 days)' }, { status: 400 })

  const paymentId = purchase.paypal_capture_id  // stores Razorpay payment ID
  if (!paymentId) return NextResponse.json({ error: 'No payment ID on record. Contact support.' }, { status: 400 })

  try {
    const refundRate = await getLiveUsdToInr()
    await refundPayment(paymentId, usdToInrPaise(purchase.amount, refundRate))
  } catch (e: any) {
    return NextResponse.json({ error: 'Refund failed: ' + e.message }, { status: 502 })
  }

  await supabaseAdmin.from('purchases').update({ status: 'refunded' }).eq('id', purchaseId)

  const block = getBlock(purchase.block_id)
  sendRefundEmail({
    to: session.user.email!, name: session.user.name || 'Developer',
    blockName: block?.name || purchase.block_id, amount: purchase.amount,
  }).catch(console.error)

  return NextResponse.json({ ok: true })
}