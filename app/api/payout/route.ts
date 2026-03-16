import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { sendAffiliatePayoutEmail } from '@/lib/email'

const MIN_PAYOUT = 50

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id

  const { data: profile } = await supabaseAdmin.from('profiles').select('affiliate_balance, email, name').eq('id', userId).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const balance = Number(profile.affiliate_balance) || 0
  if (balance < MIN_PAYOUT) return NextResponse.json({ error: `Minimum payout is $${MIN_PAYOUT}. Your balance: $${balance.toFixed(2)}` }, { status: 400 })

  // Mark pending earnings as paid + zero out balance
  await Promise.all([
    supabaseAdmin.from('affiliate_earnings').update({ status: 'paid' }).eq('affiliate_user_id', userId).eq('status', 'pending'),
    supabaseAdmin.from('profiles').update({ affiliate_balance: 0 }).eq('id', userId),
    supabaseAdmin.from('payout_requests').insert({ user_id: userId, amount: balance, status: 'pending' }),
  ])

  // Email notification
  sendAffiliatePayoutEmail({ to: profile.email, name: profile.name || 'Developer', amount: balance }).catch(console.error)

  // NOTE: Actual PayPal Payouts API call goes here for automation.
  // See: https://developer.paypal.com/docs/api/payments.payouts-batch/v1/
  // For now we log and handle manually (or add automation below):
  console.log(`[Payout Request] User ${userId} — $${balance.toFixed(2)} to ${profile.email}`)

  return NextResponse.json({ ok: true, amount: balance })
}
