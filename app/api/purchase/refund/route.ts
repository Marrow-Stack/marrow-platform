import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { refundPayment } from '@/lib/dodopayments'
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
  if (!purchase) return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })

  const paymentId = purchase.paypal_capture_id
  if (!paymentId) return NextResponse.json({ error: 'No payment ID. Contact support.' }, { status: 400 })

  try {
    await refundPayment(paymentId)
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