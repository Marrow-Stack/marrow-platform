import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createOrder } from '@/lib/paypal'
import { getBlock } from '@/lib/blocksData'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const { blockId, affiliateCode } = await req.json()
  if (!blockId) return NextResponse.json({ error: 'Missing blockId' }, { status: 400 })

  const block = getBlock(blockId)
  if (!block) return NextResponse.json({ error: 'Block not found' }, { status: 404 })

  const userId = session.user.id

  // Prevent double-purchase
  const { data: already } = await supabaseAdmin
    .from('purchases').select('id')
    .eq('user_id', userId).eq('block_id', blockId).eq('status', 'completed').single()
  if (already) return NextResponse.json({ error: 'You already own this block.' }, { status: 400 })

  // Resolve affiliate
  let affiliateUserId: string | null = null
  if (affiliateCode) {
    const { data: aff } = await supabaseAdmin.from('profiles').select('id').eq('affiliate_code', affiliateCode).single()
    if (aff && aff.id !== userId) affiliateUserId = aff.id
  }

  let order: any
  try {
    const desc = block.name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 127)
    order = await createOrder(block.price.toString(), `MarrowStack: ${desc}`)
  } catch (err: any) {
    console.error('PayPal createOrder failed:', err.message)
    return NextResponse.json({ error: 'Payment error. Please try again.' }, { status: 502 })
  }

  await supabaseAdmin.from('pending_orders').insert({
    order_id:          order.id,
    user_id:           userId,
    block_id:          blockId,
    amount:            block.price,
    affiliate_user_id: affiliateUserId,
  })

  const approvalUrl = order.links?.find((l: any) => l.rel === 'approve')?.href
  if (!approvalUrl) return NextResponse.json({ error: 'No PayPal approval URL' }, { status: 502 })

  return NextResponse.json({ orderId: order.id, approvalUrl })
}