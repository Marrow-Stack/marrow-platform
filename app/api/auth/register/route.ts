import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { validateGithubUsername } from '@/lib/github'
import { generateAffiliateCode } from '@/lib/auth'
import { sendWelcomeEmail } from '@/lib/email'

const Schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  githubUsername: z.preprocess(val => val ?? '', z.string().regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/)),
  affiliateCode: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json()
    // Coerce null values to empty strings so Zod gives clean validation errors
    const body = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, v === null ? '' : v])
    )
    const { name, email, password, githubUsername, affiliateCode } = Schema.parse(body)

    // Check GitHub username exists (real API call)
    const ghValid = await validateGithubUsername(githubUsername)
    if (!ghValid) return NextResponse.json({ error: 'GitHub username not found. Double-check it and try again.' }, { status: 400 })

    // Check email not already registered
    const { data: existing } = await supabaseAdmin.from('profiles').select('id').eq('email', email.toLowerCase()).single()
    if (existing) return NextResponse.json({ error: 'Email already registered. Sign in instead.' }, { status: 409 })

    const passwordHash = await bcrypt.hash(password, 12)
    const code = generateAffiliateCode(email)

    // Track referral if affiliate code provided
    let referredBy: string | null = null
    if (affiliateCode) {
      const { data: referrer } = await supabaseAdmin.from('profiles').select('id').eq('affiliate_code', affiliateCode).single()
      if (referrer) referredBy = referrer.id
    }

    const { error } = await supabaseAdmin.from('profiles').insert({
      email: email.toLowerCase(),
      name,
      password_hash: passwordHash,
      github_username: githubUsername,
      affiliate_code: code,
      ai_credits: 3,
      referred_by: referredBy,
    })
    if (error) throw error

    // Welcome email (non-blocking)
    sendWelcomeEmail({ to: email, name }).catch(console.error)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    if (err.name === 'ZodError') {
      const field = err.errors[0]?.path?.[0] || 'input'
      const msg   = err.errors[0]?.message || 'Invalid value'
      return NextResponse.json({ error: `${field}: ${msg}` }, { status: 400 })
    }
    console.error('Register error:', err)
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
  }
}