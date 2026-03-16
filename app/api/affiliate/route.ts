import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

  const [profileRes, earningsRes] = await Promise.all([
    supabaseAdmin.from('profiles').select('affiliate_code, affiliate_balance').eq('id', userId).single(),
    supabaseAdmin.from('affiliate_earnings').select('commission_amount, status, block_id, created_at').eq('affiliate_user_id', userId).order('created_at', { ascending: false }).limit(30),
  ])

  const profile = profileRes.data
  const earnings = earningsRes.data || []
  const totalEarned = earnings.reduce((s, e) => s + e.commission_amount, 0)
  const pendingAmount = earnings.filter(e => e.status === 'pending').reduce((s, e) => s + e.commission_amount, 0)

  return NextResponse.json({
    affiliateCode: profile?.affiliate_code,
    balance: profile?.affiliate_balance || 0,
    totalEarned,
    pendingAmount,
    referralCount: earnings.length,
    affiliateLink: `${appUrl}?ref=${profile?.affiliate_code}`,
    recentEarnings: earnings.slice(0, 10),
  })
}
