import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createRazorpayOrder, getLiveUsdToInr, usdToInrPaise } from '@/lib/razorpay'
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
  if (already) return NextResponse.json({ error: 'You already own this block. Check your dashboard.' }, { status: 400 })

  // Resolve affiliate
  let affiliateUserId: string | null = null
  if (affiliateCode) {
    const { data: aff } = await supabaseAdmin.from('profiles').select('id').eq('affiliate_code', affiliateCode).single()
    if (aff && aff.id !== userId) affiliateUserId = aff.id
  }

  // Create Razorpay order
  const receiptId = `ms_${userId.slice(0, 8)}_${Date.now()}`
  const liveRate  = await getLiveUsdToInr()
  let rzOrder: any
  try {
    rzOrder = await createRazorpayOrder(block.price, blockId, receiptId, liveRate)
  } catch (err: any) {
    console.error('Razorpay createOrder failed:', err.message)
    return NextResponse.json({ error: 'Payment error. Please try again.' }, { status: 502 })
  }

  // Store pending order
  await supabaseAdmin.from('pending_orders').insert({
    order_id:          rzOrder.id,
    user_id:           userId,
    block_id:          blockId,
    amount:            block.price,
    affiliate_user_id: affiliateUserId,
  })

  return NextResponse.json({
    orderId:   rzOrder.id,
    amount:    rzOrder.amount,      // paise
    currency:  rzOrder.currency,    // INR
    keyId:     process.env.RAZORPAY_KEY_ID,
    blockName: block.name,
    userName:  session.user.name || '',
    userEmail: session.user.email || '',
  })
}
