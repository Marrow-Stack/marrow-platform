import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { Navbar } from '@/components/Navbar'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin' }

async function getStats() {
  const [usersRes, revenueRes, purchasesRes] = await Promise.all([
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('purchases').select('amount').eq('status', 'completed'),
    supabaseAdmin.from('purchases').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
  ])
  const totalRevenue = (revenueRes.data || []).reduce((s, p) => s + Number(p.amount), 0)
  return { totalUsers: usersRes.count || 0, totalRevenue, totalPurchases: purchasesRes.count || 0 }
}

async function getRecentUsers() {
  const { data } = await supabaseAdmin.from('profiles')
    .select('id,email,name,role,created_at,has_pro_subscription').order('created_at', { ascending: false }).limit(20)
  return data || []
}

async function getRecentPurchases() {
  const { data } = await supabaseAdmin.from('purchases')
    .select('id,block_id,amount,status,created_at,profiles(name,email)').order('created_at', { ascending: false }).limit(20)
  return data || []
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !['admin', 'super_admin'].includes(session.user.role)) {
    redirect('/dashboard')
  }

  const [stats, users, purchases] = await Promise.all([getStats(), getRecentUsers(), getRecentPurchases()])

  const StatCard = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
    <div className="card p-5">
      <p className="text-[12px] text-[var(--text-3)] uppercase tracking-wider mb-1">{label}</p>
      <p className="font-display font-bold text-[28px] text-[var(--text)]">{value}</p>
      {sub && <p className="text-[12px] text-[var(--text-3)] mt-0.5">{sub}</p>}
    </div>
  )

  return (
    <div className="min-h-screen bg-base">
      <Navbar />
      <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-24 pb-24">
        <div className="flex items-center gap-3 mb-10">
          <h1 className="font-display font-bold text-[32px] text-[var(--text)]">Admin</h1>
          <span className="badge text-[11px]" style={{ background: 'rgba(239,160,32,0.1)', color: 'var(--accent)', border: '1px solid rgba(239,160,32,0.2)' }}>
            {session.user.role}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <StatCard label="Total Users" value={stats.totalUsers.toLocaleString()} />
          <StatCard label="Revenue" value={`$${stats.totalRevenue.toFixed(2)}`} sub="all time" />
          <StatCard label="Purchases" value={stats.totalPurchases.toLocaleString()} />
          <StatCard label="Avg Order" value={`$${stats.totalPurchases ? (stats.totalRevenue / stats.totalPurchases).toFixed(2) : '0'}`} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent users */}
          <div className="card p-5">
            <h2 className="font-display font-semibold text-[16px] text-[var(--text)] mb-4">Recent signups</h2>
            <div className="space-y-2.5">
              {users.slice(0, 10).map((u: any) => (
                <div key={u.id} className="flex items-center justify-between text-[13px]">
                  <div>
                    <p className="font-medium text-[var(--text)]">{u.name || u.email}</p>
                    <p className="text-[var(--text-3)] text-[11px]">{u.email} · {new Date(u.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="badge text-[10px]"
                    style={{ background: u.role === 'admin' ? 'rgba(239,160,32,0.1)' : 'var(--bg-3)', color: u.role === 'admin' ? 'var(--accent)' : 'var(--text-3)' }}>
                    {u.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent purchases */}
          <div className="card p-5">
            <h2 className="font-display font-semibold text-[16px] text-[var(--text)] mb-4">Recent purchases</h2>
            <div className="space-y-2.5">
              {purchases.slice(0, 10).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between text-[13px]">
                  <div>
                    <p className="font-medium text-[var(--text)]">{p.block_id}</p>
                    <p className="text-[var(--text-3)] text-[11px]">{(p as any).profiles?.email} · {new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold" style={{ color: 'var(--accent)' }}>${p.amount}</p>
                    <p className="text-[10px]" style={{ color: p.status === 'refunded' ? '#E53E3E' : '#22C55E' }}>{p.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
