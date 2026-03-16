import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const { data } = await supabaseAdmin
    .from('workspace_invites')
    .select('*, workspaces(name)')
    .eq('token', params.token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!data) return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 })
  return NextResponse.json({ workspaceName: (data as any).workspaces?.name, email: data.email, role: data.role })
}
