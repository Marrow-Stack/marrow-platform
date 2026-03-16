// ============================================================
// MarrowStack Block: Email System
// Stack: Next.js 14 + Resend + HTML email templates
// Covers: welcome, verify, reset, invite, receipt, refund,
//         notification, batch sending, unsubscribe tokens
// ============================================================

// ENV: RESEND_API_KEY, FROM_EMAIL, NEXT_PUBLIC_APP_URL

import { Resend } from 'resend'
import crypto from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM   = process.env.FROM_EMAIL    || 'noreply@yourdomain.com'
const BASE   = process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'
const BRAND  = 'MarrowStack'
const ACCENT = '#EFA020'

// ── Base email layout ──────────────────────────────────────────
function layout(opts: { title: string; preheader?: string }, body: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escHtml(opts.title)}</title>
  ${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${escHtml(opts.preheader)}&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ''}
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #F4F3EF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 32px 16px; }
    .card { background: #FFFFFF; border-radius: 16px; padding: 40px 40px 32px; border: 1px solid #E8E6DE; }
    .logo { display: flex; align-items: center; gap: 8px; margin-bottom: 32px; }
    .logo-mark { width: 28px; height: 28px; }
    .logo-text { font-size: 18px; font-weight: 800; color: #100F0A; letter-spacing: -0.5px; }
    h1 { font-size: 24px; font-weight: 800; color: #100F0A; margin-bottom: 12px; letter-spacing: -0.3px; }
    h2 { font-size: 18px; font-weight: 700; color: #100F0A; margin-bottom: 8px; }
    p { color: #3E3C37; line-height: 1.65; font-size: 15px; margin-bottom: 16px; }
    p:last-child { margin-bottom: 0; }
    .btn { display: inline-block; background: ${ACCENT}; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-size: 15px; margin: 8px 0 20px; }
    .btn-ghost { display: inline-block; background: transparent; color: #3E3C37 !important; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-size: 14px; border: 1px solid #DDDBD4; margin: 8px 0; }
    .divider { border: none; border-top: 1px solid #E8E6DE; margin: 24px 0; }
    .box { background: #F7F7F5; border: 1px solid #E8E6DE; border-radius: 10px; padding: 16px 20px; margin: 16px 0; }
    .highlight { background: #FFF8EE; border-left: 3px solid ${ACCENT}; padding: 14px 18px; border-radius: 0 10px 10px 0; margin: 16px 0; }
    .code { font-family: 'SFMono-Regular', Consolas, monospace; background: #F4F3EF; padding: 2px 7px; border-radius: 5px; font-size: 13px; color: #100F0A; }
    .small { font-size: 13px; color: #8C8980; }
    .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #B8B5AB; line-height: 1.8; }
    .footer a { color: #8C8980; text-decoration: none; }
    table.invoice { width: 100%; border-collapse: collapse; margin: 16px 0; }
    table.invoice th { text-align: left; font-size: 12px; color: #8C8980; text-transform: uppercase; letter-spacing: 0.05em; padding: 6px 0; border-bottom: 1px solid #E8E6DE; }
    table.invoice td { padding: 12px 0; font-size: 14px; border-bottom: 1px solid #F4F3EF; vertical-align: top; }
    table.invoice .total td { font-weight: 700; border-bottom: none; padding-top: 16px; }
    @media (max-width: 480px) { .card { padding: 24px 20px 20px; } }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo">
      <svg class="logo-mark" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon points="14,1 27,7.5 27,20.5 14,27 1,20.5 1,7.5" fill="${ACCENT}" opacity="0.9"/>
        <polygon points="14,7 21,11 21,17 14,21 7,17 7,11" fill="#FFFFFF" opacity="0.85"/>
      </svg>
      <span class="logo-text">${BRAND}</span>
    </div>
    <div class="card">
      ${body}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${BRAND} · <a href="${BASE}/privacy">Privacy</a> · <a href="${BASE}/terms">Terms</a></p>
      <p><a href="${BASE}/unsubscribe?token={{UNSUB_TOKEN}}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`
}

function escHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

// ── Unsubscribe token ─────────────────────────────────────────
export function generateUnsubToken(email: string): string {
  const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret'
  return crypto.createHmac('sha256', secret).update(email.toLowerCase()).digest('hex').slice(0, 32)
}

function injectUnsub(html: string, email: string): string {
  return html.replace('{{UNSUB_TOKEN}}', generateUnsubToken(email))
}

// ── Welcome email ─────────────────────────────────────────────
export async function sendWelcomeEmail(to: string, name: string) {
  const html = injectUnsub(layout(
    { title: `Welcome to ${BRAND}!`, preheader: `Your account is ready, ${name}. Here's what to do next.` },
    `<h1>Welcome, ${escHtml(name)}! 👋</h1>
     <p>Your ${BRAND} account is ready. Here's what you can do right now:</p>
     <div class="box">
       <p style="margin-bottom:8px">🔍 <strong>Browse blocks</strong> — explore all ${17} production-ready code blocks</p>
       <p style="margin-bottom:8px">⚡ <strong>Buy a block</strong> — pay once, get instant GitHub access</p>
       <p style="margin-bottom:0">💸 <strong>Earn 25%</strong> — share your affiliate link and earn commission</p>
     </div>
     <a href="${BASE}/blocks" class="btn">Browse Blocks →</a>
     <hr class="divider" />
     <p class="small">Questions? Reply to this email — we read every one.</p>`
  ), to)
  return resend.emails.send({ from: FROM, to, subject: `Welcome to ${BRAND}! Your account is ready`, html })
}

// ── Email verification ────────────────────────────────────────
export async function sendEmailVerification(to: string, name: string, token: string) {
  const verifyUrl = `${BASE}/auth/verify-email?token=${token}`
  const html = injectUnsub(layout(
    { title: 'Verify your email', preheader: 'One click to verify. Link expires in 24 hours.' },
    `<h1>Verify your email</h1>
     <p>Hi ${escHtml(name)}, please verify your email address to complete your ${BRAND} account setup.</p>
     <a href="${escHtml(verifyUrl)}" class="btn">Verify Email Address →</a>
     <hr class="divider" />
     <p class="small">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
     <p class="small">Or copy this URL into your browser:<br/><span class="code">${escHtml(verifyUrl)}</span></p>`
  ), to)
  return resend.emails.send({ from: FROM, to, subject: 'Verify your email address', html })
}

// ── Password reset ────────────────────────────────────────────
export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const resetUrl = `${BASE}/auth/reset-password?token=${token}`
  const html = injectUnsub(layout(
    { title: 'Reset your password', preheader: 'Reset link expires in 1 hour.' },
    `<h1>Reset your password</h1>
     <p>Hi ${escHtml(name)}, we received a request to reset your password. Click the button below — this link expires in <strong>1 hour</strong>.</p>
     <a href="${escHtml(resetUrl)}" class="btn">Reset Password →</a>
     <hr class="divider" />
     <p class="small">If you didn't request a password reset, you can safely ignore this email. Your password will not change.</p>
     <p class="small">Or copy this URL into your browser:<br/><span class="code">${escHtml(resetUrl)}</span></p>`
  ), to)
  return resend.emails.send({ from: FROM, to, subject: 'Reset your password', html })
}

// ── Purchase receipt ──────────────────────────────────────────
export interface PurchaseReceiptOpts {
  name: string
  blockName: string
  blockId: string
  amount: number
  currency?: string
  orderId: string
  githubRepo: string
  githubOwner: string
}

export async function sendPurchaseReceipt(to: string, opts: PurchaseReceiptOpts) {
  const { name, blockName, blockId, amount, currency = 'USD', orderId, githubRepo, githubOwner } = opts
  const repoUrl = `https://github.com/${githubOwner}/${githubRepo}`
  const html = injectUnsub(layout(
    { title: `Receipt: ${blockName}`, preheader: `Your ${blockName} block is ready — check your GitHub invites.` },
    `<h1>You're all set! 🎉</h1>
     <p>Hi ${escHtml(name)}, your payment is confirmed and you've been invited to the GitHub repository.</p>
     <div class="highlight">
       <p style="margin-bottom:4px"><strong>Check your GitHub notifications</strong></p>
       <p class="small" style="margin:0">Accept the repository invitation to clone your code. Invitations expire after 7 days.</p>
     </div>
     <a href="${escHtml(repoUrl)}" class="btn">Open Repository on GitHub →</a>
     <hr class="divider" />
     <h2>Receipt</h2>
     <table class="invoice">
       <thead><tr><th>Item</th><th style="text-align:right">Amount</th></tr></thead>
       <tbody>
         <tr><td>${escHtml(blockName)}<br/><span class="small">Lifetime access · One-time purchase</span></td>
             <td style="text-align:right;font-weight:600">${currency} ${amount.toFixed(2)}</td></tr>
       </tbody>
       <tfoot class="total"><tr><td>Total</td><td style="text-align:right">${currency} ${amount.toFixed(2)}</td></tr></tfoot>
     </table>
     <p class="small">Order ID: <span class="code">${escHtml(orderId)}</span></p>
     <hr class="divider" />
     <p class="small">You have a <strong>30-day money-back guarantee</strong>. If the code doesn't work as described, email us for a full refund. Questions? Reply to this email.</p>`
  ), to)
  return resend.emails.send({ from: FROM, to, subject: `Receipt — ${blockName}`, html })
}

// ── Refund confirmation ───────────────────────────────────────
export async function sendRefundEmail(to: string, opts: { name: string; blockName: string; amount: number }) {
  const { name, blockName, amount } = opts
  const html = injectUnsub(layout(
    { title: 'Refund processed', preheader: `Your refund of $${amount.toFixed(2)} is on its way.` },
    `<h1>Refund processed</h1>
     <p>Hi ${escHtml(name)}, your refund for <strong>${escHtml(blockName)}</strong> has been processed.</p>
     <div class="box">
       <p style="margin-bottom:4px"><strong>Refund amount:</strong> $${amount.toFixed(2)} USD</p>
       <p class="small" style="margin:0">PayPal refunds typically appear in 3–5 business days.</p>
     </div>
     <hr class="divider" />
     <p class="small">We're sorry the block didn't work out. If you'd like to share what went wrong, just reply to this email — it helps us improve.</p>`
  ), to)
  return resend.emails.send({ from: FROM, to, subject: `Refund confirmed — ${blockName}`, html })
}

// ── Team invite ───────────────────────────────────────────────
export async function sendTeamInvite(
  to: string,
  opts: { inviterName: string; workspaceName: string; role: string; token: string }
) {
  const { inviterName, workspaceName, role, token } = opts
  const inviteUrl = `${BASE}/invite/${token}`
  const html = injectUnsub(layout(
    { title: `Join ${workspaceName}`, preheader: `${inviterName} invited you to ${workspaceName} as ${role}.` },
    `<h1>You've been invited! 🎉</h1>
     <p><strong>${escHtml(inviterName)}</strong> has invited you to join <strong>${escHtml(workspaceName)}</strong> as a <strong>${escHtml(role)}</strong>.</p>
     <a href="${escHtml(inviteUrl)}" class="btn">Accept Invitation →</a>
     <hr class="divider" />
     <p class="small">This invitation expires in 7 days. If you weren't expecting this, you can safely ignore it.</p>
     <p class="small">Or copy this URL into your browser:<br/><span class="code">${escHtml(inviteUrl)}</span></p>`
  ), to)
  return resend.emails.send({
    from: FROM, to,
    subject: `${inviterName} invited you to ${workspaceName}`,
    html,
  })
}

// ── Affiliate payout notification ─────────────────────────────
export async function sendAffiliatePayoutEmail(
  to: string,
  opts: { name: string; amount: number; paypalEmail: string }
) {
  const { name, amount, paypalEmail } = opts
  const html = injectUnsub(layout(
    { title: 'Payout on its way!', preheader: `Your $${amount.toFixed(2)} affiliate payout is being processed.` },
    `<h1>Payout incoming 💸</h1>
     <p>Hi ${escHtml(name)}, your affiliate payout of <strong>$${amount.toFixed(2)} USD</strong> is being sent to your PayPal account.</p>
     <div class="box">
       <p style="margin-bottom:4px"><strong>Amount:</strong> $${amount.toFixed(2)} USD</p>
       <p class="small" style="margin:0"><strong>PayPal:</strong> ${escHtml(paypalEmail)}<br/>Arrives in 1–3 business days.</p>
     </div>
     <hr class="divider" />
     <p class="small">Keep sharing your affiliate link to earn more! <a href="${BASE}/dashboard">View your earnings</a>.</p>`
  ), to)
  return resend.emails.send({ from: FROM, to, subject: 'Your affiliate payout is on its way!', html })
}

// ── Generic notification ──────────────────────────────────────
export async function sendNotificationEmail(
  to: string,
  opts: { subject: string; title: string; body: string; ctaText?: string; ctaUrl?: string }
) {
  const { subject, title, body, ctaText, ctaUrl } = opts
  const html = injectUnsub(layout(
    { title: subject },
    `<h1>${escHtml(title)}</h1>
     <p>${body}</p>
     ${ctaText && ctaUrl ? `<a href="${escHtml(ctaUrl)}" class="btn">${escHtml(ctaText)} →</a>` : ''}`
  ), to)
  return resend.emails.send({ from: FROM, to, subject, html })
}

// ── Batch email (up to 100/call via Resend batch API) ─────────
export interface BatchEmail { to: string; subject: string; html: string }

export async function sendBatch(emails: BatchEmail[]) {
  const results = []
  for (let i = 0; i < emails.length; i += 100) {
    const chunk = emails.slice(i, i + 100).map(e => ({ from: FROM, ...e }))
    results.push(await resend.batch.send(chunk))
  }
  return results
}

// ── Newsletter blast ──────────────────────────────────────────
export async function sendNewsletter(opts: {
  subject: string
  title: string
  body: string
  ctaText?: string
  ctaUrl?: string
  recipients: Array<{ email: string; name: string }>
}) {
  const emails = opts.recipients.map(r => ({
    to: r.email,
    subject: opts.subject,
    html: injectUnsub(layout(
      { title: opts.subject },
      `<h1>${escHtml(opts.title)}</h1>
       <p>${opts.body}</p>
       ${opts.ctaText && opts.ctaUrl ? `<a href="${escHtml(opts.ctaUrl)}" class="btn">${escHtml(opts.ctaText)} →</a>` : ''}`
    ), r.email),
  }))
  return sendBatch(emails)
}

// ── Email validation helper ────────────────────────────────────
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 320
}

// ── Delivery test (run in dev to confirm Resend is wired up) ──
export async function sendTestEmail(to: string) {
  return resend.emails.send({
    from: FROM, to,
    subject: `${BRAND} — Email delivery test`,
    html: layout({ title: 'Test email' }, `<h1>It works! ✅</h1><p>Your email configuration is working correctly.</p>`),
  })
}
