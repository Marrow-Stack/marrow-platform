import { Navbar } from '@/components/Navbar'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Terms of Service' }

const SECTIONS = [
  { h: 'License', body: 'When you purchase a block, you receive a non-exclusive, perpetual, personal license to use the code in unlimited commercial and personal projects. You may not resell, redistribute, or sublicense the code as a standalone product or component library.' },
  // { h: 'Refunds', body: 'We offer a 30-day money-back guarantee. If the code does not work as described in the listing, email support@marrowstack.dev within 30 days of purchase for a full refund via PayPal — no questions asked. Refunds are not available for change-of-mind after you have accessed the repository.' },
  { h: 'GitHub access', body: 'Repository access is granted to the GitHub username on your account. To transfer access to a different username, contact support. We reserve the right to revoke access if these terms are violated, for example by redistributing the source code.' },
  { h: 'Affiliate program', body: 'Commissions are earned on verified, completed purchases. Self-referrals (using your own link to buy) are not eligible. We may terminate affiliate accounts for fraudulent activity including fake referrals or chargebacks.' },
  { h: 'No warranty', body: 'Code is provided as-is. While we test everything thoroughly, we cannot guarantee blocks will work in every possible project configuration. We provide reasonable email support to help with setup issues.' },
  { h: 'Limitation of liability', body: 'MarrowStack is not liable for indirect, incidental, or consequential damages arising from use of the code. Our maximum liability is limited to the amount you paid for the relevant block or bundle.' },
  { h: 'Changes', body: 'We may update these terms. Continued use after changes constitutes acceptance. Material changes will be communicated by email to registered users.' },
  { h: 'Contact', body: 'Questions? Email samarthofficial@gmail.com.' },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-base">
      <Navbar />
      <div className="max-w-2xl mx-auto px-5 sm:px-8 pt-28 pb-24">
        <div className="mb-10">
          <p className="text-[12px] uppercase tracking-widest text-[var(--text-3)] font-semibold mb-3">Legal</p>
          <h1 className="font-display font-black text-[40px] text-[var(--text)] mb-2">Terms of Service</h1>
          <p className="text-[var(--text-3)] text-[13px]">
            Last updated {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="space-y-8">
          {SECTIONS.map(({ h, body }) => (
            <div key={h}>
              <h2 className="font-display font-bold text-[18px] text-[var(--text)] mb-2">{h}</h2>
              <p className="text-[var(--text-2)] text-[14px] leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--border)] mt-12 pt-8 flex gap-4 text-[13px] text-[var(--text-3)]">
          <Link href="/privacy" className="hover:text-[var(--text)] transition-colors">Privacy Policy</Link>
          <Link href="/" className="hover:text-[var(--text)] transition-colors">← Back to home</Link>
        </div>
      </div>
    </div>
  )
}
