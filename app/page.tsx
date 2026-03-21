import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { BlockCard } from '@/components/BlockCard'
import { CodePreview } from '@/components/CodePreview'
import { BLOCKS, BUNDLES, totalTimeSaved, totalLOC } from '@/lib/blocksData'

export const metadata = {
  title: 'MarrowStack — Production Next.js Code Blocks',
  description: 'Copy-paste production-ready Next.js code blocks. Auth, billing, admin, teams, and 14 more — fully typed, Supabase-ready, instant GitHub access.',
}


// Testimonials removed — add real ones after your first buyers

const PREVIEW_CODE = `// blocks/auth/index.ts — in your GitHub repo after purchase
      return token
    },
  },
  pages: { signIn: '/auth/signin' },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
}`

const STATS = [
  { value: `${BLOCKS.length}+`, label: 'Code blocks' },
  { value: `${totalTimeSaved}h+`, label: 'Dev time saved' },
  { value: `${Math.round(totalLOC / 1000)}k+`, label: 'Lines of code' },
  { value: '100%', label: 'TypeScript' },
]

export default function HomePage() {
  return (
    <div className="bg-base min-h-screen">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-28 px-5 sm:px-8 overflow-hidden">
        {/* Dot grid background */}
        <div className="absolute inset-0 dot-grid opacity-40 pointer-events-none" />
        {/* Radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at top, rgba(239,160,32,0.10) 0%, transparent 65%)' }} />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 badge mb-8 text-[var(--accent)]"
            style={{ background: 'var(--accent-bg)', border: '1px solid rgba(239,160,32,0.25)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
            {BLOCKS.length} blocks · instant GitHub access · PayPal checkout
          </div>

          {/* Headline */}
          <h1 className="font-display text-[52px] sm:text-[72px] md:text-[88px] font-black leading-[0.92] tracking-tight mb-6">
            <span className="text-gradient">Skip the</span>
            <br />
            <span style={{ color: 'var(--text)' }}>boilerplate.</span>
          </h1>

          <p className="text-[17px] sm:text-[19px] text-[var(--text-2)] max-w-xl mx-auto mb-10 leading-relaxed">
            Copy-paste production-ready Next.js code blocks. Auth, billing, admin, teams and more — fully typed, Supabase-ready, ships to your GitHub immediately.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-20">
            <Link href="/blocks" className="btn-accent px-7 py-3.5 text-[15px] font-semibold text-white">
              Browse {BLOCKS.length} blocks →
            </Link>
            <Link href="#preview" className="btn-ghost px-7 py-3.5 text-[15px] font-medium">
              See the code
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {STATS.map(({ value, label }) => (
              <div key={label} className="rounded-2xl border border-[var(--border)] py-5 px-4"
                style={{ background: 'var(--bg-2)' }}>
                <div className="font-display font-black text-[28px] leading-none" style={{ color: 'var(--accent)' }}>{value}</div>
                <div className="text-[12px] text-[var(--text-3)] mt-1.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bundles ───────────────────────────────────────────── */}
      <section className="py-20 px-5 sm:px-8 border-y border-[var(--border)]" style={{ background: 'var(--bg-2)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-[12px] uppercase tracking-widest text-[var(--text-3)] font-semibold mb-2">Best value</p>
              <h2 className="font-display font-bold text-[32px] text-[var(--text)]">Bundle deals</h2>
            </div>
            <span className="hidden sm:block text-sm text-[var(--text-3)]">Pre-wired · no conflicts · shared schema</span>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {BUNDLES.map(b => <BlockCard key={b.id} block={b} featured />)}
          </div>
        </div>
      </section>

      {/* ── Blocks grid ───────────────────────────────────────── */}
      <section className="py-24 px-5 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[12px] uppercase tracking-widest text-[var(--text-3)] font-semibold mb-3">What's inside</p>
            <h2 className="font-display font-black text-[40px] sm:text-[52px] text-[var(--text)]">Every block you need</h2>
            <p className="text-[var(--text-2)] text-[17px] mt-3 max-w-lg mx-auto">Each one is self-contained, fully typed, and drops into any Next.js 14 project.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {BLOCKS.slice(0, 6).map(b => <BlockCard key={b.id} block={b} />)}
          </div>
          <div className="text-center">
            <Link href="/blocks" className="btn-ghost inline-flex px-7 py-3 text-sm font-medium">
              View all {BLOCKS.length} blocks →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Code preview ──────────────────────────────────────── */}
      <section id="preview" className="py-24 px-5 sm:px-8 border-y border-[var(--border)]" style={{ background: 'var(--bg-2)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-[1fr,1.1fr] gap-14 items-center">
            <div>
              <p className="text-[12px] uppercase tracking-widest text-[var(--text-3)] font-semibold mb-4">Real code, no fluff</p>
              <h2 className="font-display font-black text-[36px] sm:text-[44px] leading-tight text-[var(--text)] mb-4">
                You own every line.
              </h2>
              <p className="text-[var(--text-2)] leading-relaxed mb-7">
                Every block is a real, working TypeScript file pushed to your private GitHub repo the moment payment clears. The auth block above handles email/password, GitHub OAuth, Google OAuth, and RBAC — wired to Supabase with RLS policies.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-8 text-[13px] text-[var(--text-2)]">
                {['Full TypeScript types', 'SQL migrations included', 'RLS policies written', 'Comments & docs inline'].map(item => (
                  <span key={item} className="flex items-center gap-2"><span style={{ color: 'var(--accent)' }}>✓</span>{item}</span>
                ))}
              </div>
              <Link href="/blocks/auth" className="btn-accent inline-flex px-6 py-3 text-sm font-semibold text-white">
                Get Auth Block — $19 →
              </Link>
            </div>
            <CodePreview code={PREVIEW_CODE} filename="blocks/auth/index.ts" />
          </div>
        </div>
      </section>

      {/* ── What you actually get ──────────────────────────────── */}
      <section className="py-24 px-5 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[12px] uppercase tracking-widest text-[var(--text-3)] font-semibold mb-3">No fluff</p>
            <h2 className="font-display font-black text-[40px] text-[var(--text)]">Exactly what you get</h2>
            <p className="text-[var(--text-2)] mt-3 max-w-md mx-auto">Every block is a single TypeScript file pushed to a private GitHub repo the moment you pay.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: '📁', title: 'The full source file', body: 'One index.ts (or .tsx) with every export documented inline. No split files, no magic imports.' },
              { icon: '🗄️', title: 'SQL migration included', body: 'Every block that needs a table ships with CREATE TABLE, RLS policies, and indexes — ready to paste into Supabase.' },
              { icon: '📖', title: 'Usage in the file header', body: 'Setup steps and code examples are in comments at the top of every file. No separate docs to hunt down.' },
              { icon: '🔑', title: 'GitHub access in seconds', body: 'Pay securely → our system invites your GitHub account → you clone and go. No waiting for a human.' },
              { icon: '🤖', title: 'AI customization included', body: 'Use the dashboard customizer to modify any block you own with a plain-English instruction. Powered by Claude.' },
              { icon: '♾️', title: 'Yours forever', body: 'One-time payment. No subscription. No licence expiry. Use the code in as many projects as you want.' },
            ].map(({ icon, title, body }) => (
              <div key={title} className="card p-5 cursor-default">
                <span className="text-2xl mb-3 block">{icon}</span>
                <p className="font-semibold text-[var(--text)] text-[14px] mb-1.5">{title}</p>
                <p className="text-[var(--text-2)] text-[13px] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Guarantee ─────────────────────────────────────────── */}
      {/* <section className="py-16 px-5 sm:px-8 border-y border-[var(--border)]" style={{ background: 'var(--bg-2)' }}>
        <div className="max-w-2xl mx-auto text-center">
          <GuaranteeBadge large />
          <h3 className="font-display font-bold text-[26px] text-[var(--text)] mt-6 mb-3">30-Day Money-Back Guarantee</h3>
          <p className="text-[var(--text-2)] leading-relaxed">
            If the code doesn't work as described, email within 30 days for a full refund — no questions asked. You own the code forever. No subscriptions, no lock-in.
          </p>
        </div>
      </section> */}

      {/* ── Affiliate CTA ──────────────────────────────────────── */}
      <section className="py-24 px-5 sm:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="card p-10 sm:p-14 text-center relative overflow-hidden noise">
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center bottom, var(--accent-bg), transparent 70%)' }} />
            <div className="relative">
              <p className="text-[12px] uppercase tracking-widest text-[var(--text-3)] font-semibold mb-4">Affiliate Program</p>
              <h2 className="font-display font-black text-[34px] sm:text-[42px] text-[var(--text)] mb-4">Earn 25% per sale 💸</h2>
              <p className="text-[var(--text-2)] mb-8 max-w-md mx-auto leading-relaxed">
                Share your affiliate link. Earn 25% commission on every purchase you refer. Payout at $50.
              </p>
              <Link href="/affiliate" className="btn-accent inline-flex px-8 py-3.5 text-[15px] font-semibold text-white">
                Join the affiliate program →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--border)] py-12 px-5 sm:px-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
              <polygon points="11,1 21,6.5 21,15.5 11,21 1,15.5 1,6.5" fill="var(--accent)" opacity="0.9"/>
            </svg>
            <span className="font-display font-bold text-[var(--text)] text-[15px]">MarrowStack</span>
          </div>
          <div className="flex flex-wrap gap-5 text-[13px] text-[var(--text-3)] justify-center">
            {[['Blocks', '/blocks'], ['Affiliate', '/affiliate'], ['About', '/about'], ['Privacy', '/privacy'], ['Terms', '/terms']].map(([l, h]) => (
              <Link key={l} href={h} className="hover:text-[var(--text)] transition-colors">{l}</Link>
            ))}
          </div>
          <p className="text-[12px] text-[var(--text-3)]">🔒 Secure checkout · Worldwide</p>
        </div>
      </footer>
    </div>
  )
}
