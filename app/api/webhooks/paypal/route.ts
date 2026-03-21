import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature, captureOrder } from '@/lib/paypal'
import { grantRepoAccess } from '@/lib/github'
import { sendPurchaseEmail } from '@/lib/email'
import { getBlock } from '@/lib/blocksData'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  const valid = await verifyWebhookSignature(req.headers, rawBody)
  if (!valid) {
    console.warn('[PayPal Webhook] Invalid signature')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const event = JSON.parse(rawBody)
  console.log(`[PayPal Webhook] ${event.event_type}`)

  try {
    if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {
      const orderId = event.resource?.id
      if (!orderId) return NextResponse.json({ ok: true })

      // Check if already fulfilled
      const { data: existing } = await supabaseAdmin
        .from('purchases').select('id').eq('paypal_order_id', orderId).single()
      if (existing) return NextResponse.json({ ok: true })

      const { data: pending } = await supabaseAdmin
        .from('pending_orders').select('*').eq('order_id', orderId).single()
      if (!pending) return NextResponse.json({ ok: true })

      // Capture
      const capture = await captureOrder(orderId)
      if (capture.status !== 'COMPLETED') return NextResponse.json({ ok: true })

      const captureId = capture.purchase_units?.[0]?.payments?.captures?.[0]?.id
      const block = getBlock(pending.block_id)
      if (!block) return NextResponse.json({ ok: true })

      const { data: profile } = await supabaseAdmin
        .from('profiles').select('email, name, github_username').eq('id', pending.user_id).single()

      const reposToGrant = [block.repoName]
      if (block.bundleIds) {
        for (const id of block.bundleIds) { const b = getBlock(id); if (b) reposToGrant.push(b.repoName) }
      }
      if (profile?.github_username) {
        await Promise.allSettled(reposToGrant.map(repo => grantRepoAccess(profile.github_username!, repo)))
      }

      await supabaseAdmin.from('purchases').insert({
        user_id: pending.user_id, block_id: pending.block_id,
        paypal_order_id: orderId, paypal_capture_id: captureId,
        amount: pending.amount, github_username: profile?.github_username, status: 'completed',
      })

      if (pending.affiliate_user_id) {
        const commission = Math.round(pending.amount * 25) / 100
        await supabaseAdmin.from('affiliate_earnings').insert({
          affiliate_user_id: pending.affiliate_user_id, purchase_user_id: pending.user_id,
          block_id: pending.block_id, commission_amount: commission, status: 'pending',
        })
        await supabaseAdmin.rpc('add_affiliate_balance', { p_user_id: pending.affiliate_user_id, p_amount: commission })
      }

      if (profile) {
        sendPurchaseEmail({
          to: profile.email, name: profile.name || 'Developer',
          blockName: block.name, repoName: block.repoName, githubUsername: profile.github_username || '',
        }).catch(console.error)
      }

      await supabaseAdmin.from('pending_orders').delete().eq('order_id', orderId)
    }

    if (event.event_type === 'PAYMENT.CAPTURE.REFUNDED') {
      const captureId = event.resource?.id
      if (captureId) {
        await supabaseAdmin.from('purchases').update({ status: 'refunded' }).eq('paypal_capture_id', captureId)
      }
    }
  } catch (err) {
    console.error('[PayPal Webhook] Error:', err)
  }

  return NextResponse.json({ ok: true })
}