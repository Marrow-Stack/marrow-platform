// lib/email.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.FROM_EMAIL || 'MarrowStack <noreply@marrowstack.dev>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://marrowstack.dev'
const OWNER = process.env.NEXT_PUBLIC_GITHUB_OWNER || 'your-github'

function baseLayout(content: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:0;background:#0C0C0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#E8E6DB}
  .wrap{max-width:560px;margin:40px auto;padding:0 20px}
  .card{background:#161612;border:1px solid #2A2A24;border-radius:16px;padding:40px}
  .logo{font-size:24px;font-weight:900;color:#EFA020;margin-bottom:32px;display:block}
  h1{font-size:24px;font-weight:700;color:#F5F4EE;margin:0 0 12px}
  p{color:#C8C4B0;line-height:1.6;margin:0 0 16px}
  .btn{display:inline-block;background:#EFA020;color:#0C0C0A;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;font-size:15px;margin:8px 0}
  .code{background:#1F1F1A;border:1px solid #2A2A24;border-radius:8px;padding:16px;font-family:monospace;font-size:13px;color:#EFA020;word-break:break-all;margin:16px 0}
  .divider{border:none;border-top:1px solid #2A2A24;margin:28px 0}
  .small{font-size:13px;color:#6b6b5f}
  .tag{display:inline-block;background:#1F1F1A;border:1px solid #2A2A24;border-radius:6px;padding:4px 10px;font-size:12px;color:#EFA020;margin:2px}
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <span class="logo">⬡ MarrowStack</span>
    ${content}
    <hr class="divider">
    <p class="small">© MarrowStack · <a href="${APP_URL}/privacy" style="color:#6b6b5f">Privacy</a> · <a href="${APP_URL}/terms" style="color:#6b6b5f">Terms</a></p>
  </div>
</div>
</body>
</html>`
}

export async function sendPurchaseEmail({
  to, name, blockName, repoName, githubUsername,
}: {
  to: string; name: string; blockName: string; repoName: string; githubUsername: string
}) {
  const repoUrl = `https://github.com/${OWNER}/${repoName}`
  const html = baseLayout(`
    <h1>Your block is ready 🎉</h1>
    <p>Hey ${name || 'there'}, thanks for purchasing <strong style="color:#F5F4EE">${blockName}</strong>.</p>
    <p>We've invited <strong style="color:#EFA020">@${githubUsername}</strong> to access the private repository. Accept the invite on GitHub to get instant access.</p>
    <a href="${repoUrl}" class="btn">Open Repository →</a>
    <p>Didn't get the invite? Make sure your GitHub username is correct in your <a href="${APP_URL}/dashboard" style="color:#EFA020">dashboard</a>.</p>
    <hr class="divider">
    <p><strong style="color:#F5F4EE">What's next?</strong></p>
    <p>Clone the repo and follow the README inside the block folder. Each block has its own setup instructions and SQL migrations if needed.</p>
    <p class="small">30-day money-back guarantee. Reply to this email if anything doesn't work.</p>
  `)
  await resend.emails.send({ from: FROM, to, subject: `✅ ${blockName} – GitHub access granted`, html })
}

export async function sendWelcomeEmail({ to, name }: { to: string; name: string }) {
  const html = baseLayout(`
    <h1>Welcome to MarrowStack 👋</h1>
    <p>Hey ${name || 'there'}, your account is all set.</p>
    <p>Browse production-ready Next.js code blocks and ship your SaaS faster. Every block is fully typed, tested, and Supabase-ready.</p>
    <a href="${APP_URL}/blocks" class="btn">Browse All Blocks →</a>
    <p class="small">Tip: Share your affiliate link and earn 25% on every referral. Find it in your dashboard.</p>
  `)
  await resend.emails.send({ from: FROM, to, subject: 'Welcome to MarrowStack', html })
}

export async function sendAffiliatePayoutEmail({ to, name, amount }: { to: string; name: string; amount: number }) {
  const html = baseLayout(`
    <h1>Payout on the way! 💸</h1>
    <p>Hey ${name || 'there'}, your affiliate earnings of <strong style="color:#EFA020">$${amount.toFixed(2)}</strong> have been queued for PayPal payout.</p>
    <p>You'll receive it within 1–3 business days to your PayPal account.</p>
    <a href="${APP_URL}/dashboard" class="btn">View Dashboard →</a>
    <p class="small">Keep sharing your affiliate link to earn more. You get 25% of every sale you refer.</p>
  `)
  await resend.emails.send({ from: FROM, to, subject: `💰 MarrowStack payout: $${amount.toFixed(2)}`, html })
}

export async function sendRefundEmail({ to, name, blockName, amount }: { to: string; name: string; blockName: string; amount: number }) {
  const html = baseLayout(`
    <h1>Refund processed</h1>
    <p>Hey ${name || 'there'}, your refund of <strong style="color:#EFA020">$${amount.toFixed(2)}</strong> for <strong style="color:#F5F4EE">${blockName}</strong> has been processed.</p>
    <p>It'll appear on your PayPal balance within 3–5 business days.</p>
    <p>If you had any trouble with the block, reply to this email — we'd love to help.</p>
  `)
  await resend.emails.send({ from: FROM, to, subject: 'MarrowStack refund processed', html })
}
