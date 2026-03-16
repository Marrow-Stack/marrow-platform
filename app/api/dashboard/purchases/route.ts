import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('purchases')
    .select('id, block_id, amount, status, created_at, paypal_capture_id, github_username')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json(data || [])
}
