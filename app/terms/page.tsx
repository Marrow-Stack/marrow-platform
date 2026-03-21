import { Navbar } from '@/components/Navbar'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Terms of Service — MarrowStack' }

const SECTIONS = [
  {
    h: 'About MarrowStack',
    body: 'MarrowStack is operated by Samarth Shukla, an individual developer based in India. We sell digital code products (TypeScript/Next.js code blocks) for use in web development projects. For any queries, contact support@marrowstack.dev.',
  },
  {
    h: 'Digital Products — No Physical Delivery',
    body: 'All products sold on MarrowStack are digital goods — TypeScript source code files delivered via GitHub repository access. There is no physical shipment. Access is granted instantly and automatically after payment confirmation.',
  },
  {
    h: 'Refund & Cancellation Policy',
    body: 'Due to the nature of digital products, all sales are final once GitHub repository access has been granted. If you have not yet accessed the repository and wish to cancel, contact support@marrowstack.dev within 24 hours of purchase. If the code does not function as described in the listing, email support@marrowstack.dev with details and we will either resolve the issue or issue a refund at our discretion. Refunds are not available for change-of-mind after repository access.',
  },
  {
    h: 'License',
    body: 'When you purchase a block, you receive a non-exclusive, perpetual, personal license to use the code in unlimited commercial and personal projects. You may not resell, redistribute, or sublicense the code as a standalone product or component library.',
  },
  {
    h: 'GitHub Access',
    body: 'Repository access is granted to the GitHub username on your account. To transfer access to a different username, contact support. We reserve the right to revoke access if these terms are violated.',
  },
  {
    h: 'Pricing & Payment',
    body: 'All prices are listed in USD. Payments are processed securely by our payment provider — we never store card details. For Indian customers, the INR equivalent is shown at checkout based on the current exchange rate.',
  },
  {
    h: 'Affiliate Program',
    body: 'Commissions are earned on verified, completed purchases. Self-referrals are not eligible. We may terminate affiliate accounts for fraudulent activity. Minimum payout threshold is $50.',
  },
  {
    h: 'No Warranty',
    body: 'Code is provided as-is. While we test everything thoroughly, we cannot guarantee blocks will work in every possible project configuration. We provide reasonable email support to help with setup issues.',
  },
  {
    h: 'Limitation of Liability',
    body: 'MarrowStack (Samarth Shukla) is not liable for indirect, incidental, or consequential damages arising from use of the code. Maximum liability is limited to the amount paid for the relevant block or bundle.',
  },
  {
    h: 'Governing Law',
    body: 'These terms are governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts in India.',
  },
  {
    h: 'Changes',
    body: 'We may update these terms. Continued use after changes constitutes acceptance. Material changes will be communicated by email to registered users.',
  },
  {
    h: 'Contact',
    body: 'For support, refund requests, or legal queries: support@marrowstack.dev. We respond within 48 hours on business days.',
  },
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