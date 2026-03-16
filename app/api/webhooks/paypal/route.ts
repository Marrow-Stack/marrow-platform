import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature, captureOrder } from '@/lib/paypal'
import { grantRepoAccess } from '@/lib/github'
import { sendPurchaseEmail } from '@/lib/email'
import { getBlock } from '@/lib/blocksData'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  // Verify PayPal signature
  const valid = await verifyWebhookSignature(req.headers, rawBody)
  if (!valid) {
    console.warn('[PayPal Webhook] Invalid signature — rejecting')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const event = JSON.parse(rawBody)
  const type: string = event.event_type
  console.log(`[PayPal Webhook] ${type}`)

  try {
    switch (type) {
      case 'CHECKOUT.ORDER.APPROVED':
      case 'PAYMENT.CAPTURE.COMPLETED': {
        const orderId = event.resource.id || event.resource.supplementary_data?.related_ids?.order_id
        if (!orderId) break

        // Skip if already recorded (client-side capture ran first)
        const { data: existingPurchase } = await supabaseAdmin.from('purchases').select('id').eq('paypal_order_id', orderId).single()
        if (existingPurchase) { console.log('[PayPal Webhook] Already fulfilled, skipping'); break }

        const { data: pending } = await supabaseAdmin.from('pending_orders').select('*').eq('order_id', orderId).single()
        if (!pending) { console.log('[PayPal Webhook] No pending order for', orderId); break }

        // Capture if not yet done
        let captureId = event.resource.id
        if (type === 'CHECKOUT.ORDER.APPROVED') {
          const capture = await captureOrder(orderId)
          if (capture.status !== 'COMPLETED') break
          captureId = capture.purchase_units?.[0]?.payments?.captures?.[0]?.id
        }

        const { data: profile } = await supabaseAdmin.from('profiles').select('email, name, github_username').eq('id', pending.user_id).single()
        if (!profile) break
        const block = getBlock(pending.block_id)
        if (!block) break

        const reposToGrant = [block.repoName]
        if (block.bundleIds) {
          for (const id of block.bundleIds) { const b = getBlock(id); if (b) reposToGrant.push(b.repoName) }
        }
        if (profile.github_username) {
          await Promise.allSettled(reposToGrant.map(repo => grantRepoAccess(profile.github_username!, repo)))
        }

        await supabaseAdmin.from('purchases').insert({
          user_id: pending.user_id, block_id: pending.block_id,
          paypal_order_id: orderId, paypal_capture_id: captureId,
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
        break
      }

      case 'PAYMENT.CAPTURE.REFUNDED': {
        const captureId = event.resource.id
        await supabaseAdmin.from('purchases').update({ status: 'refunded' }).eq('paypal_capture_id', captureId)
        console.log('[PayPal Webhook] Refund recorded for capture', captureId)
        break
      }

      case 'BILLING.SUBSCRIPTION.ACTIVATED': {
        const subId = event.resource.id
        const email = event.resource.subscriber?.email_address
        if (!email) break
        await supabaseAdmin.from('profiles').update({ has_pro_subscription: true, paypal_subscription_id: subId }).eq('email', email)
        console.log('[PayPal Webhook] Pro subscription activated for', email)
        break
      }

      case 'BILLING.SUBSCRIPTION.CANCELLED': {
        const subId = event.resource.id
        await supabaseAdmin.from('profiles').update({ has_pro_subscription: false, paypal_subscription_id: null }).eq('paypal_subscription_id', subId)
        break
      }

      default:
        console.log('[PayPal Webhook] Unhandled event type:', type)
    }
  } catch (err) {
    console.error('[PayPal Webhook] Handler error:', err)
  }

  return NextResponse.json({ received: true })
}
