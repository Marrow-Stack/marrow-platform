import { NextRequest, NextResponse } from 'next/server'
import { verifyRazorpayWebhook } from '@/lib/razorpay'
import { grantRepoAccess } from '@/lib/github'
import { sendPurchaseEmail } from '@/lib/email'
import { getBlock } from '@/lib/blocksData'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-razorpay-signature') || ''

  if (!verifyRazorpayWebhook(rawBody, signature)) {
    console.warn('[Razorpay Webhook] Invalid signature — rejecting')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const event = JSON.parse(rawBody)
  const type: string = event.event
  console.log(`[Razorpay Webhook] ${type}`)

  try {
    if (type === 'payment.captured') {
      const payment  = event.payload.payment.entity
      const orderId  = payment.order_id
      const paymentId = payment.id

      // Skip if already fulfilled
      const { data: existing } = await supabaseAdmin
        .from('purchases').select('id').eq('paypal_order_id', orderId).single()
      if (existing) { console.log('[Razorpay Webhook] Already fulfilled'); return NextResponse.json({ ok: true }) }

      const { data: pending } = await supabaseAdmin
        .from('pending_orders').select('*').eq('order_id', orderId).single()
      if (!pending) { console.log('[Razorpay Webhook] No pending order for', orderId); return NextResponse.json({ ok: true }) }

      const { data: profile } = await supabaseAdmin
        .from('profiles').select('email, name, github_username').eq('id', pending.user_id).single()
      if (!profile) return NextResponse.json({ ok: true })

      const block = getBlock(pending.block_id)
      if (!block) return NextResponse.json({ ok: true })

      const reposToGrant = [block.repoName]
      if (block.bundleIds) {
        for (const id of block.bundleIds) { const b = getBlock(id); if (b) reposToGrant.push(b.repoName) }
      }
      if (profile.github_username) {
        await Promise.allSettled(reposToGrant.map(repo => grantRepoAccess(profile.github_username!, repo)))
      }

      await supabaseAdmin.from('purchases').insert({
        user_id: pending.user_id, block_id: pending.block_id,
        paypal_order_id: orderId, paypal_capture_id: paymentId,
        amount: pending.amount, github_username: profile.github_username, status: 'completed',
      })

      if (pending.affiliate_user_id) {
        const commission = Math.round(pending.amount * 25) / 100
        await supabaseAdmin.from('affiliate_earnings').insert({
          affiliate_user_id: pending.affiliate_user_id, purchase_user_id: pending.user_id,
          block_id: pending.block_id, commission_amount: commission, status: 'pending',
        })
        await supabaseAdmin.rpc('add_affiliate_balance', { p_user_id: pending.affiliate_user_id, p_amount: commission })
      }

      sendPurchaseEmail({
        to: profile.email, name: profile.name || 'Developer',
        blockName: block.name, repoName: block.repoName, githubUsername: profile.github_username || '',
      }).catch(console.error)

      await supabaseAdmin.from('pending_orders').delete().eq('order_id', orderId)
    }

    if (type === 'refund.processed') {
      const refund    = event.payload.refund.entity
      const paymentId = refund.payment_id
      await supabaseAdmin.from('purchases').update({ status: 'refunded' }).eq('paypal_capture_id', paymentId)
    }

  } catch (err) {
    console.error('[Razorpay Webhook] Error:', err)
  }

  return NextResponse.json({ ok: true })
}