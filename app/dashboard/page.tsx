'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { getBlock } from '@/lib/blocksData'
import toast from 'react-hot-toast'

type Tab = 'blocks' | 'affiliate' | 'customize'
interface Purchase { id: string; block_id: string; amount: number; created_at: string; github_username: string | null; status: string }
interface AffData { affiliateCode: string; balance: number; totalEarned: number; pendingAmount: number; referralCount: number; affiliateLink: string; recentEarnings: any[] }
interface CustomResult { modifiedCode: string; explanation: string; creditsRemaining: number | 'unlimited' }

const GITHUB_OWNER = process.env.NEXT_PUBLIC_GITHUB_OWNER || 'your-github'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [tab, setTab] = useState<Tab>('blocks')
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [affiliate, setAffiliate] = useState<AffData | null>(null)
  const [loading, setLoading] = useState(true)
  const [blockId, setBlockId] = useState('')
  const [instruction, setInstruction] = useState('')
  const [customizing, setCustomizing] = useState(false)
  const [result, setResult] = useState<CustomResult | null>(null)
  const [copied, setCopied] = useState(false)

  const loadData = useCallback(async () => {
    const [p, a] = await Promise.all([
      fetch('/api/dashboard/purchases').then(r => r.json()),
      fetch('/api/affiliate').then(r => r.json()),
    ])
    if (Array.isArray(p)) setPurchases(p)
    if (a.affiliateCode) setAffiliate(a)
    setLoading(false)
  }, [])

  useEffect(() => { if (status === 'authenticated') loadData() }, [status, loadData])

  if (status === 'loading') return <Spinner full />
  if (status === 'unauthenticated') {
    if (typeof window !== 'undefined') window.location.href = '/auth/signin'
    return null
  }

  const handleCustomize = async () => {
    if (!blockId || !instruction.trim()) { toast.error('Select a block and enter an instruction'); return }
    setCustomizing(true); setResult(null)
    const res = await fetch('/api/customize', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockId, instruction }),
    })
    const data = await res.json()
    setCustomizing(false)
    if (!res.ok) { toast.error(data.error); return }
    setResult(data)
  }

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'blocks', label: 'My Blocks', count: purchases.length },
    { id: 'affiliate', label: 'Affiliate' },
    // { id: 'customize', label: '✦ Customize' },  // re-enable after adding Anthropic credits
  ]

  return (
    <div className="min-h-screen bg-base">
      <Navbar />
      <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-24 pb-24">

        {/* Header */}
        <div className="mb-10 pt-2">
          <p className="text-[12px] uppercase tracking-widest text-[var(--text-3)] font-semibold mb-1">Dashboard</p>
          <h1 className="font-display font-black text-[36px] text-[var(--text)]">
            Hey, {session?.user?.name?.split(' ')[0] || 'Developer'} 👋
          </h1>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-8 bg-[var(--bg-2)] border border-[var(--border)] rounded-xl p-1 w-fit">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-2 rounded-lg text-[13px] font-medium transition-all ${tab === t.id ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--text-2)] hover:text-[var(--text)]'}`}>
              {t.label}
              {t.count !== undefined && tab !== t.id && <span className="ml-1.5 opacity-50">{t.count}</span>}
            </button>
          ))}
        </div>

        {/* ── My Blocks ───────────────────────────────────────── */}
        {tab === 'blocks' && (
          <div>
            {!session?.user?.githubUsername && <GitHubUsernamePrompt />}
            {loading ? <Skeleton /> : purchases.length === 0 ? (
              <div className="card p-14 text-center">
                <p className="text-5xl mb-4">📦</p>
                <h3 className="font-display font-bold text-[20px] text-[var(--text)] mb-2">No blocks yet</h3>
                <p className="text-[var(--text-2)] text-sm mb-6">Pick your first block and start shipping faster.</p>
                <Link href="/blocks" className="btn-accent inline-flex px-6 py-2.5 text-sm font-semibold text-white">
                  Browse blocks →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {purchases.map(p => {
                  const block = getBlock(p.block_id)
                  if (!block) return null
                  return (
                    <div key={p.id} className="card flex items-center justify-between p-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-bold font-display"
                          style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
                          {block.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-[var(--text)] text-[14px]">{block.name}</p>
                          <p className="text-[11px] text-[var(--text-3)]">
                            {block.category} · ${p.amount} · {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {p.status === 'refunded' && <span className="text-red-500 ml-2">· refunded</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a href={`https://github.com/${GITHUB_OWNER}/${block.repoName}`} target="_blank" rel="noopener noreferrer"
                          className="btn-ghost px-4 py-1.5 text-[12px] font-medium">GitHub →</a>
                        {/* AI button hidden — re-enable after adding Anthropic credits */}
                      </div>
                    </div>
                  )
                })}
                <p className="text-center pt-4">
                  <Link href="/blocks" className="text-[13px] text-[var(--accent)] hover:underline">Browse more blocks →</Link>
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Affiliate ────────────────────────────────────────── */}
        {tab === 'affiliate' && (
          <div className="space-y-5">
            {!affiliate ? <Skeleton /> : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { l: 'Available', v: `$${affiliate.balance.toFixed(2)}`, accent: true },
                    { l: 'Total earned', v: `$${affiliate.totalEarned.toFixed(2)}` },
                    { l: 'Pending', v: `$${affiliate.pendingAmount.toFixed(2)}` },
                    { l: 'Referrals', v: String(affiliate.referralCount) },
                  ].map(({ l, v, accent }) => (
                    <div key={l} className="card p-5">
                      <p className="text-[11px] text-[var(--text-3)] uppercase tracking-wider mb-1">{l}</p>
                      <p className="font-display font-bold text-[24px]" style={{ color: accent ? 'var(--accent)' : 'var(--text)' }}>{v}</p>
                    </div>
                  ))}
                </div>

                <div className="card p-6">
                  <p className="text-[13px] font-semibold text-[var(--text-2)] mb-3">Your affiliate link</p>
                  <div className="flex gap-2">
                    <input readOnly value={affiliate.affiliateLink}
                      className="input flex-1 font-mono text-[12px] bg-[var(--bg)]" />
                    <button onClick={() => { navigator.clipboard.writeText(affiliate.affiliateLink); toast.success('Copied!') }}
                      className="btn-accent px-5 py-2.5 text-[13px] font-semibold text-white shrink-0">Copy</button>
                  </div>
                  <p className="text-[11px] text-[var(--text-3)] mt-2">Earn 25% on every sale. PayPal payout when balance hits $50.</p>
                </div>

                {affiliate.balance >= 50 && (
                  <button onClick={async () => {
                    const r = await fetch('/api/payout', { method: 'POST' })
                    const d = await r.json()
                    r.ok ? toast.success(`Payout of $${affiliate.balance.toFixed(2)} requested!`) : toast.error(d.error)
                    if (r.ok) loadData()
                  }} className="btn-accent w-full py-3.5 text-[14px] font-semibold text-white">
                    Request Payout — ${affiliate.balance.toFixed(2)}
                  </button>
                )}

                {affiliate.recentEarnings.length > 0 && (
                  <div className="card p-5">
                    <p className="text-[13px] font-semibold text-[var(--text-2)] mb-4">Recent earnings</p>
                    <div className="space-y-3">
                      {affiliate.recentEarnings.map((e, i) => (
                        <div key={i} className="flex items-center justify-between text-[13px]">
                          <div className="flex items-center gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: e.status === 'paid' ? '#22C55E' : 'var(--accent)' }} />
                            <span className="text-[var(--text-2)]">{getBlock(e.block_id)?.name || e.block_id}</span>
                            <span className="text-[11px] text-[var(--text-3)]">{e.status}</span>
                          </div>
                          <span className="font-semibold" style={{ color: '#22C55E' }}>+${e.commission_amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── AI Customize ─────────────────────────────────────── */}
        {tab === 'customize' && (
          <div className="space-y-5">
            <div className="card p-6">
              <h3 className="font-display font-bold text-[18px] text-[var(--text)] mb-1">AI Block Customizer</h3>
              <p className="text-[13px] text-[var(--text-2)] mb-6">Describe what you want changed and Claude rewrites the code. Works on blocks you own.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[var(--text-2)] mb-1.5">Select block</label>
                  <select value={blockId} onChange={e => setBlockId(e.target.value)} className="input">
                    <option value="">Choose a block you own…</option>
                    {purchases.filter(p => p.status !== 'refunded').map(p => {
                      const b = getBlock(p.block_id)
                      return b ? <option key={p.id} value={b.id}>{b.name}</option> : null
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[var(--text-2)] mb-1.5">Instruction</label>
                  <textarea value={instruction} onChange={e => setInstruction(e.target.value)} rows={4}
                    placeholder="e.g. Add magic link login, remove Google provider, use Prisma instead of Supabase…"
                    className="input resize-none" />
                </div>

                <button onClick={handleCustomize} disabled={customizing}
                  className="btn-accent w-full py-3 text-[14px] font-semibold text-white disabled:opacity-60 flex items-center justify-center gap-2">
                  {customizing ? <><Spinner /><span>Customizing…</span></> : '✦ Customize with AI'}
                </button>
              </div>
            </div>

            {result && (
              <div className="card p-6" style={{ borderColor: 'rgba(239,160,32,0.3)' }}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold text-[var(--text)] text-[14px]">Modified code</p>
                    <p className="text-[12px] text-[var(--text-3)] mt-0.5">{result.explanation}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {result.creditsRemaining !== 'unlimited' && (
                      <span className="text-[11px] text-[var(--text-3)]">{result.creditsRemaining} credits left</span>
                    )}
                    <button onClick={async () => {
                      await navigator.clipboard.writeText(result.modifiedCode)
                      setCopied(true); setTimeout(() => setCopied(false), 2000)
                    }} className="btn-accent px-4 py-1.5 text-[12px] font-semibold text-white">
                      {copied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
                <pre className="rounded-xl p-5 overflow-auto text-[12px] font-mono leading-relaxed max-h-96"
                  style={{ background: 'var(--bg-3)', color: 'var(--text-2)' }}>
                  <code>{result.modifiedCode}</code>
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Spinner({ full }: { full?: boolean }) {
  const el = <span className="w-5 h-5 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin inline-block" />
  if (!full) return el
  return <div className="min-h-screen bg-base flex items-center justify-center">{el}</div>
}

function Skeleton() {
  return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl bg-[var(--bg-2)] border border-[var(--border)] animate-pulse" />)}</div>
}

function GitHubUsernamePrompt() {
  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const { update } = useSession()

  const save = async () => {
    if (!username.trim()) return
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ githubUsername: username.trim() }),
    })
    setSaving(false)
    if (res.ok) {
      toast.success('GitHub username saved! Refresh to update your session.')
      await update({ githubUsername: username.trim() })
    } else {
      const d = await res.json()
      toast.error(d.error || 'Failed to save')
    }
  }

  return (
    <div className="rounded-2xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4"
      style={{ background: 'rgba(239,160,32,0.07)', border: '1px solid rgba(239,160,32,0.25)' }}>
      <div className="flex-1">
        <p className="font-semibold text-[14px] mb-0.5" style={{ color: 'var(--accent)' }}>
          ⚠️ GitHub username required for repo access
        </p>
        <p className="text-[13px]" style={{ color: 'var(--text-2)' }}>
          Without it, we can't grant you access after purchase.
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <input
          value={username}
          onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          placeholder="your-github-username"
          className="input text-[13px] w-52"
        />
        <button onClick={save} disabled={saving || !username.trim()}
          className="btn-accent px-4 py-2 text-[13px] font-semibold text-white shrink-0 disabled:opacity-50">
          {saving ? '…' : 'Save'}
        </button>
      </div>
    </div>
  )
}