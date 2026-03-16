import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const { token } = await req.json()
  const { data: invite } = await supabaseAdmin
    .from('workspace_invites')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!invite) return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 })

  const { error } = await supabaseAdmin.from('workspace_members').insert({
    workspace_id: invite.workspace_id,
    user_id: session.user.id,
    role: invite.role,
  })
  if (error && error.code !== '23505') return NextResponse.json({ error: 'Failed to join workspace' }, { status: 500 })

  await supabaseAdmin.from('workspace_invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id)
  return NextResponse.json({ ok: true })
}
