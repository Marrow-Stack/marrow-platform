import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { captureOrder } from '@/lib/paypal'
import { grantRepoAccess } from '@/lib/github'
import { sendPurchaseEmail } from '@/lib/email'
import { getBlock } from '@/lib/blocksData'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orderId } = await req.json()
  if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })

  const userId = session.user.id

  // Get pending order
  const { data: pending } = await supabaseAdmin.from('pending_orders').select('*').eq('order_id', orderId).eq('user_id', userId).single()
  if (!pending) return NextResponse.json({ error: 'Order not found or already processed' }, { status: 404 })

  // Idempotency: check if already captured
  const { data: existingPurchase } = await supabaseAdmin.from('purchases').select('id').eq('paypal_order_id', orderId).single()
  if (existingPurchase) {
    await supabaseAdmin.from('pending_orders').delete().eq('order_id', orderId)
    return NextResponse.json({ success: true, blockId: pending.block_id })
  }

  // Capture payment
  let capture: any
  try {
    capture = await captureOrder(orderId)
  } catch (err: any) {
    console.error('PayPal capture error:', err.message)
    return NextResponse.json({ error: 'Payment capture failed. Contact support.' }, { status: 502 })
  }

  if (capture.status !== 'COMPLETED') {
    return NextResponse.json({ error: `Payment status: ${capture.status}` }, { status: 400 })
  }

  const captureId = capture.purchase_units?.[0]?.payments?.captures?.[0]?.id
  const block = getBlock(pending.block_id)!
  const githubUsername = session.user.githubUsername

  // Grant GitHub access (non-fatal if it fails — we log and continue)
  const reposToGrant = [block.repoName]
  if (block.bundleIds) {
    for (const id of block.bundleIds) { const b = getBlock(id); if (b) reposToGrant.push(b.repoName) }
  }
  if (githubUsername) {
    await Promise.allSettled(reposToGrant.map(repo => grantRepoAccess(githubUsername, repo)))
  }

  // Record purchase
  await supabaseAdmin.from('purchases').insert({
    user_id: userId, block_id: pending.block_id,
    paypal_order_id: orderId, paypal_capture_id: captureId,
    amount: pending.amount, github_username: githubUsername, status: 'completed',
  })

  // Affiliate commission (25%)
  if (pending.affiliate_user_id) {
    const commission = Math.round(pending.amount * 25) / 100
    await supabaseAdmin.from('affiliate_earnings').insert({
      affiliate_user_id: pending.affiliate_user_id, purchase_user_id: userId,
      block_id: pending.block_id, commission_amount: commission, status: 'pending',
    })
    await supabaseAdmin.rpc('add_affiliate_balance', { p_user_id: pending.affiliate_user_id, p_amount: commission })
  }

  // Send confirmation email
  sendPurchaseEmail({
    to: session.user.email!, name: session.user.name || 'Developer',
    blockName: block.name, repoName: block.repoName, githubUsername: githubUsername || 'your-github-user',
  }).catch(console.error)

  // Cleanup
  await supabaseAdmin.from('pending_orders').delete().eq('order_id', orderId)

  return NextResponse.json({ success: true, blockId: pending.block_id })
}
