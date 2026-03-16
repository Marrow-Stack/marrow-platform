import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Affiliate Program — Earn 25% per sale',
  description: 'Join the MarrowStack affiliate program. Earn 25% commission on every sale you refer.',
}

const STEPS = [
  { n: '01', title: 'Sign up free', body: 'Create your account and your unique affiliate link appears instantly in your dashboard.' },
  { n: '02', title: 'Share anywhere', body: 'Post on Twitter, YouTube, your blog, Discord — anywhere developers hang out.' },
  { n: '03', title: 'Earn 25%', body: 'Every purchase you refer pays 25%. A single MVP bundle referral earns you $17.25.' },
  { n: '04', title: 'Get paid via PayPal', body: 'Request a payout when your balance hits $50. Arrives in 1–3 business days.' },
]

const FAQS = [
  { q: 'When do I get paid?', a: 'Request a payout any time your balance hits $50. PayPal transfers land in 1–3 business days.' },
  { q: 'Is there an earnings cap?', a: 'No cap. Refer 1 sale or 1,000 — you earn 25% on all of them, forever.' },
  { q: 'How long does the cookie last?', a: '30 days. If someone clicks your link and buys within 30 days, you earn the commission.' },
  { q: 'Do I need to buy before I can be an affiliate?', a: 'No. You get your link the moment you create a free account.' },
  { q: 'What if someone buys a bundle?', a: 'You earn 25% of the full bundle price. A $69 MVP bundle pays you $17.25.' },
  { q: 'Can I use my own link?', a: 'Self-referrals are excluded. Commissions apply to purchases by other users only.' },
]

const CALC = [
  { refs: 5, avg: 19, label: '5 single blocks / mo' },
  { refs: 5, avg: 39, label: '5 growth bundles / mo' },
  { refs: 5, avg: 69, label: '5 MVP bundles / mo' },
  { refs: 20, avg: 28, label: '20 mixed sales / mo' },
]

export default function AffiliatePage() {
  return (
    <div className="min-h-screen bg-base">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-24 px-5 sm:px-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-8 text-[12px] font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full"
            style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid rgba(239,160,32,0.2)' }}>
            25% commission · instant payouts · no cap
          </div>
          <h1 className="font-display font-black text-[52px] sm:text-[68px] leading-[0.92] tracking-tight text-[var(--text)] mb-5">
            Earn while you<br /><span className="text-gradient">recommend.</span>
          </h1>
          <p className="text-[18px] text-[var(--text-2)] max-w-xl mx-auto mb-10 leading-relaxed">
            Share MarrowStack with your audience. Earn 25% on every sale — not just the first one.
          </p>
          <Link href="/auth/signup" className="btn-accent inline-flex px-9 py-4 text-[15px] font-semibold text-white">
            Get your affiliate link →
          </Link>
        </div>
      </section>

      {/* Earnings calculator */}
      <section className="py-20 px-5 sm:px-8 border-y border-[var(--border)]" style={{ background: 'var(--bg-2)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[12px] uppercase tracking-widest text-[var(--text-3)] font-semibold mb-3">The math</p>
            <h2 className="font-display font-bold text-[32px] text-[var(--text)]">What could you earn?</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CALC.map(({ refs, avg, label }) => {
              const earn = (refs * avg * 0.25).toFixed(2)
              return (
                <div key={label} className="card p-6 text-center">
                  <p className="font-display font-black text-[32px]" style={{ color: 'var(--accent)' }}>${earn}</p>
                  <p className="text-[11px] text-[var(--text-3)] mt-0.5">/ month</p>
                  <p className="text-[12px] text-[var(--text-2)] mt-3 leading-snug">{label}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-5 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[12px] uppercase tracking-widest text-[var(--text-3)] font-semibold mb-3">Process</p>
            <h2 className="font-display font-bold text-[32px] text-[var(--text)]">How it works</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {STEPS.map(({ n, title, body }) => (
              <div key={n} className="card p-6 flex gap-5">
                <span className="font-display font-black text-[28px] leading-none shrink-0" style={{ color: 'var(--accent)', opacity: 0.4 }}>{n}</span>
                <div>
                  <h3 className="font-semibold text-[var(--text)] mb-1.5">{title}</h3>
                  <p className="text-[13px] text-[var(--text-2)] leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-5 sm:px-8 border-t border-[var(--border)]" style={{ background: 'var(--bg-2)' }}>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[12px] uppercase tracking-widest text-[var(--text-3)] font-semibold mb-3">FAQ</p>
            <h2 className="font-display font-bold text-[32px] text-[var(--text)]">Questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map(({ q, a }) => (
              <div key={q} className="card p-5">
                <p className="font-semibold text-[var(--text)] text-[14px] mb-1.5">{q}</p>
                <p className="text-[13px] text-[var(--text-2)] leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-5 sm:px-8">
        <div className="max-w-md mx-auto text-center">
          <h2 className="font-display font-bold text-[28px] text-[var(--text)] mb-4">Ready to start earning?</h2>
          <p className="text-[var(--text-2)] text-sm mb-8">Free to join. No approval needed. Your link is ready in seconds.</p>
          <Link href="/auth/signup" className="btn-accent inline-flex px-9 py-3.5 text-[15px] font-semibold text-white">
            Join the program →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-10 px-5 sm:px-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-5">
          <Link href="/" className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 22 22" fill="none"><polygon points="11,1 21,6.5 21,15.5 11,21 1,15.5 1,6.5" fill="var(--accent)" opacity="0.9"/></svg>
            <span className="font-display font-bold text-[var(--text)] text-[15px]">MarrowStack</span>
          </Link>
          <div className="flex gap-5 text-[13px] text-[var(--text-3)]">
            {[['Blocks', '/blocks'], ['Privacy', '/privacy'], ['Terms', '/terms']].map(([l, h]) => (
              <Link key={l} href={h} className="hover:text-[var(--text)] transition-colors">{l}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
