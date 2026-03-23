import { NextRequest, NextResponse } from 'next/server'
import { verifyDodoWebhook, getPayment } from '@/lib/dodopayments'
import { grantRepoAccess } from '@/lib/github'
import { sendPurchaseEmail } from '@/lib/email'
import { getBlock } from '@/lib/blocksData'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  const valid = await verifyDodoWebhook(rawBody, {
    'webhook-id':        req.headers.get('webhook-id') || '',
    'webhook-signature': req.headers.get('webhook-signature') || '',
    'webhook-timestamp': req.headers.get('webhook-timestamp') || '',
  })

  if (!valid) {
    console.warn('[Dodo Webhook] Invalid signature')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const event = JSON.parse(rawBody)
  const type: string = event.type
  console.log(`[Dodo Webhook] ${type}`)

  try {
    if (type === 'payment.succeeded') {
      const payment = event.data
      const paymentId = payment.payment_id
      const blockId   = payment.metadata?.blockId || payment.metadata?.metadata_blockId
      const userId    = payment.metadata?.userId  || payment.metadata?.metadata_userId

      if (!blockId || !userId) {
        console.warn('[Dodo Webhook] Missing metadata', payment.metadata)
        return NextResponse.json({ ok: true })
      }

      // Idempotency
      const { data: existing } = await supabaseAdmin
        .from('purchases').select('id').eq('paypal_capture_id', paymentId).single()
      if (existing) return NextResponse.json({ ok: true })

      const block = getBlock(blockId)
      if (!block) return NextResponse.json({ ok: true })

      const { data: profile } = await supabaseAdmin
        .from('profiles').select('email, name, github_username').eq('id', userId).single()

      // Grant GitHub access
      const reposToGrant = [block.repoName]
      if (block.bundleIds) {
        for (const id of block.bundleIds) { const b = getBlock(id); if (b) reposToGrant.push(b.repoName) }
      }
      if (profile?.github_username) {
        await Promise.allSettled(reposToGrant.map(repo => grantRepoAccess(profile.github_username!, repo)))
      }

      await supabaseAdmin.from('purchases').insert({
        user_id:           userId,
        block_id:          blockId,
        paypal_order_id:   paymentId,
        paypal_capture_id: paymentId,
        amount:            block.price,
        github_username:   profile?.github_username,
        status:            'completed',
      })

      // Affiliate commission 40%
      const affiliateUserId = payment.metadata?.affiliateUserId || payment.metadata?.metadata_affiliateUserId
      if (affiliateUserId && affiliateUserId !== '') {
        const commission = Math.round(block.price * 40) / 100
        await supabaseAdmin.from('affiliate_earnings').insert({
          affiliate_user_id: affiliateUserId,
          purchase_user_id:  userId,
          block_id:          blockId,
          commission_amount: commission,
          status:            'pending',
        })
        await supabaseAdmin.rpc('add_affiliate_balance', { p_user_id: affiliateUserId, p_amount: commission })
      }

      if (profile) {
        sendPurchaseEmail({
          to: profile.email, name: profile.name || 'Developer',
          blockName: block.name, repoName: block.repoName, githubUsername: profile.github_username || '',
        }).catch(console.error)
      }

      // Clean up pending order
      await supabaseAdmin.from('pending_orders').delete().eq('user_id', userId).eq('block_id', blockId)
    }

    if (type === 'refund.succeeded') {
      const paymentId = event.data?.payment_id
      if (paymentId) {
        await supabaseAdmin.from('purchases').update({ status: 'refunded' }).eq('paypal_capture_id', paymentId)
      }
    }
  } catch (err) {
    console.error('[Dodo Webhook] Error:', err)
  }

  return NextResponse.json({ ok: true })
}