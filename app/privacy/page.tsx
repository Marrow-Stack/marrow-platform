import { Navbar } from '@/components/Navbar'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Policy — MarrowStack' }

const SECTIONS = [
  {
    h: 'Who We Are',
    body: 'MarrowStack is operated by Samarth Shukla, an individual developer based in India. We sell digital code products for web developers. Contact: support@marrowstack.dev.',
  },
  {
    h: 'What We Collect',
    body: 'We collect your name, email address, GitHub username, and purchase history when you create an account and make purchases. Passwords are hashed with bcrypt and never stored in plain text. All payment processing is handled by our payment provider — we never see or store card or bank details.',
  },
  {
    h: 'How We Use It',
    body: 'Your data is used to process purchases, grant GitHub repository access, send transactional emails (receipts, access confirmations), and track affiliate referrals. We do not sell your data to third parties, ever.',
  },
  {
    h: 'GitHub Access',
    body: 'After purchase we use our GitHub Personal Access Token to invite you as a read-only collaborator on the relevant private repository. We only grant pull access — you cannot push to our repos.',
  },
  {
    h: 'Cookies',
    body: 'We use one session cookie for authentication (NextAuth.js) and a 30-day affiliate tracking cookie if you arrive via a referral link. No advertising or third-party tracking cookies.',
  },
  {
    h: 'Data Storage',
    body: 'Your data is stored in Supabase (PostgreSQL), hosted on AWS infrastructure. We do not transfer your personal data outside of necessary service providers (Supabase, GitHub, Resend for email).',
  },
  {
    h: 'Data Retention',
    body: 'We retain account data while your account is active. You can request deletion at any time by emailing support@marrowstack.dev. Purchase records may be retained for up to 7 years for legal and tax compliance.',
  },
  {
    h: 'Your Rights',
    body: 'You can request access to, correction of, or deletion of your personal data at any time. Email support@marrowstack.dev and we will respond within 48 hours on business days.',
  },
  {
    h: 'Grievance Officer',
    body: 'In accordance with the Information Technology Act, 2000, the grievance officer is: Samarth Shukla, support@marrowstack.dev. Complaints will be acknowledged within 48 hours and resolved within 30 days.',
  },
  {
    h: 'Contact',
    body: 'Questions about this policy? Email support@marrowstack.dev.',
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-base">
      <Navbar />
      <div className="max-w-2xl mx-auto px-5 sm:px-8 pt-28 pb-24">
        <div className="mb-10">
          <p className="text-[12px] uppercase tracking-widest text-[var(--text-3)] font-semibold mb-3">Legal</p>
          <h1 className="font-display font-black text-[40px] text-[var(--text)] mb-2">Privacy Policy</h1>
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
          <Link href="/terms" className="hover:text-[var(--text)] transition-colors">Terms of Service</Link>
          <Link href="/" className="hover:text-[var(--text)] transition-colors">← Back to home</Link>
        </div>
      </div>
    </div>
  )
}
