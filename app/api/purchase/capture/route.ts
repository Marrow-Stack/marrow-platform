import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { verifyPaymentSignature } from '@/lib/razorpay'
import { grantRepoAccess } from '@/lib/github'
import { sendPurchaseEmail } from '@/lib/email'
import { getBlock } from '@/lib/blocksData'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orderId, paymentId, signature } = await req.json()
  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ error: 'Missing orderId, paymentId, or signature' }, { status: 400 })
  }

  const userId = session.user.id

  // Verify Razorpay payment signature — this is the security check
  // If this passes, the payment is genuine — no need for a second API call
  const valid = verifyPaymentSignature(orderId, paymentId, signature)
  if (!valid) {
    console.error('Razorpay signature verification failed', { orderId, paymentId })
    return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
  }

  // Get pending order
  const { data: pending } = await supabaseAdmin
    .from('pending_orders').select('*')
    .eq('order_id', orderId).eq('user_id', userId).single()
  if (!pending) return NextResponse.json({ error: 'Order not found or already processed' }, { status: 404 })

  // Idempotency — already fulfilled
  const { data: existingPurchase } = await supabaseAdmin
    .from('purchases').select('id').eq('paypal_order_id', orderId).single()
  if (existingPurchase) {
    await supabaseAdmin.from('pending_orders').delete().eq('order_id', orderId)
    return NextResponse.json({ success: true, blockId: pending.block_id })
  }

  const block = getBlock(pending.block_id)!
  const githubUsername = session.user.githubUsername

  // Grant GitHub repo access
  const reposToGrant = [block.repoName]
  if (block.bundleIds) {
    for (const id of block.bundleIds) { const b = getBlock(id); if (b) reposToGrant.push(b.repoName) }
  }
  if (githubUsername) {
    await Promise.allSettled(reposToGrant.map(repo => grantRepoAccess(githubUsername, repo)))
  }

  // Record purchase
  await supabaseAdmin.from('purchases').insert({
    user_id:           userId,
    block_id:          pending.block_id,
    paypal_order_id:   orderId,
    paypal_capture_id: paymentId,
    amount:            pending.amount,
    github_username:   githubUsername,
    status:            'completed',
  })

  // Affiliate commission (25%)
  if (pending.affiliate_user_id) {
    const commission = Math.round(pending.amount * 25) / 100
    await supabaseAdmin.from('affiliate_earnings').insert({
      affiliate_user_id: pending.affiliate_user_id,
      purchase_user_id:  userId,
      block_id:          pending.block_id,
      commission_amount: commission,
      status:            'pending',
    })
    await supabaseAdmin.rpc('add_affiliate_balance', {
      p_user_id: pending.affiliate_user_id,
      p_amount:  commission,
    })
  }

  // Confirmation email
  sendPurchaseEmail({
    to:             session.user.email!,
    name:           session.user.name || 'Developer',
    blockName:      block.name,
    repoName:       block.repoName,
    githubUsername: githubUsername || '',
  }).catch(console.error)

  await supabaseAdmin.from('pending_orders').delete().eq('order_id', orderId)

  return NextResponse.json({ success: true, blockId: pending.block_id })
}