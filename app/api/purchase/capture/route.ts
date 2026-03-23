import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPayment } from '@/lib/dodopayments'
import { grantRepoAccess } from '@/lib/github'
import { sendPurchaseEmail } from '@/lib/email'
import { getBlock } from '@/lib/blocksData'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { paymentId } = await req.json()
  if (!paymentId) return NextResponse.json({ error: 'Missing paymentId' }, { status: 400 })

  const userId = session.user.id

  // Idempotency — already fulfilled?
  const { data: existing } = await supabaseAdmin
    .from('purchases').select('id, block_id').eq('paypal_capture_id', paymentId).single()
  if (existing) return NextResponse.json({ success: true, blockId: existing.block_id })

  // Verify payment with Dodo
  let payment: any
  try {
    payment = await getPayment(paymentId)
  } catch (err: any) {
    console.error('Dodo getPayment failed:', err.message)
    return NextResponse.json({ error: 'Could not verify payment. Contact support.' }, { status: 502 })
  }

  if (payment.status !== 'succeeded') {
    return NextResponse.json({ error: `Payment status: ${payment.status}` }, { status: 400 })
  }

  // Get blockId from payment metadata
  const blockId = payment.metadata?.blockId || payment.metadata?.metadata_blockId
  if (!blockId) return NextResponse.json({ error: 'Missing blockId in payment metadata' }, { status: 400 })

  // Get pending order
  const { data: pending } = await supabaseAdmin
    .from('pending_orders').select('*').eq('block_id', blockId).eq('user_id', userId).single()

  const block = getBlock(blockId)!
  const githubUsername = session.user.githubUsername

  // Grant GitHub access
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
    block_id:          blockId,
    paypal_order_id:   paymentId,   // reusing column for Dodo payment ID
    paypal_capture_id: paymentId,
    amount:            block.price,
    github_username:   githubUsername,
    status:            'completed',
  })

  // Affiliate commission 40%
  const affiliateUserId = pending?.affiliate_user_id ||
    payment.metadata?.affiliateUserId || payment.metadata?.metadata_affiliateUserId
  if (affiliateUserId) {
    const commission = Math.round(block.price * 40) / 100
    await supabaseAdmin.from('affiliate_earnings').insert({
      affiliate_user_id: affiliateUserId,
      purchase_user_id:  userId,
      block_id:          blockId,
      commission_amount: commission,
      status:            'pending',
    })
    await supabaseAdmin.rpc('add_affiliate_balance', {
      p_user_id: affiliateUserId,
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

  if (pending) {
    await supabaseAdmin.from('pending_orders').delete().eq('order_id', pending.order_id)
  }

  return NextResponse.json({ success: true, blockId })
}