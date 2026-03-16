import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { customizeBlock } from '@/lib/claude'
import { getBlock } from '@/lib/blocksData'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { blockId, instruction } = await req.json()
  if (!blockId || !instruction?.trim()) return NextResponse.json({ error: 'Missing blockId or instruction' }, { status: 400 })

  const userId = session.user.id
  const block = getBlock(blockId)
  if (!block) return NextResponse.json({ error: 'Block not found' }, { status: 404 })

  // Verify ownership
  const { data: purchase } = await supabaseAdmin.from('purchases').select('id').eq('user_id', userId).eq('block_id', blockId).eq('status', 'completed').single()
  if (!purchase) return NextResponse.json({ error: 'You must purchase this block to customize it.' }, { status: 403 })

  // Check credits
  const { data: profile } = await supabaseAdmin.from('profiles').select('ai_credits, has_pro_subscription').eq('id', userId).single()
  const hasPro = profile?.has_pro_subscription
  const credits = profile?.ai_credits || 0
  if (!hasPro && credits <= 0) return NextResponse.json({ error: 'No AI credits remaining. Upgrade to Pro for unlimited customizations.' }, { status: 402 })

  try {
    const result = await customizeBlock(block.name, block.preview, instruction)

    // Deduct credit if not Pro
    if (!hasPro) {
      await supabaseAdmin.from('profiles').update({ ai_credits: credits - 1 }).eq('id', userId)
    }

    return NextResponse.json({ ...result, creditsRemaining: hasPro ? 'unlimited' : credits - 1 })
  } catch (err: any) {
    console.error('AI customize error:', err)
    return NextResponse.json({ error: 'AI customization failed. Please try again.' }, { status: 500 })
  }
}
