'use client'
import { useState, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import toast from 'react-hot-toast'

const schema = z.object({
  name: z.string().min(2, 'At least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Min 8 characters').regex(/[A-Z]/, 'Add an uppercase letter').regex(/[0-9]/, 'Add a number'),
  githubUsername: z.string().min(1, 'Required').regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/, 'Invalid GitHub username'),
})
type Inputs = z.infer<typeof schema>

function SignUpContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  const affiliateCode = searchParams.get('ref')
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<Inputs>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: Inputs) => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, affiliateCode }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Registration failed')
      const signInRes = await signIn('credentials', { email: data.email, password: data.password, redirect: false })
      if (signInRes?.ok) { router.push(redirect); router.refresh() }
      else { toast.success('Account created! Please sign in.'); router.push('/auth/signin') }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const F = ({ name, label, ...rest }: { name: keyof Inputs; label: string; [k: string]: any }) => (
    <div>
      <label className="block text-[13px] font-medium text-[var(--text-2)] mb-1">{label}</label>
      <input {...register(name)} {...rest} className={`input ${errors[name] ? 'error' : ''}`} />
      {errors[name] && <p className="text-[11px] text-red-500 mt-1">{errors[name]?.message}</p>}
    </div>
  )

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-[400px]">
        <Link href="/" className="flex items-center justify-center gap-2 mb-10">
          <svg width="24" height="24" viewBox="0 0 22 22" fill="none">
            <polygon points="11,1 21,6.5 21,15.5 11,21 1,15.5 1,6.5" fill="var(--accent)" opacity="0.9"/>
            <polygon points="11,5 17,8.5 17,13.5 11,17 5,13.5 5,8.5" fill="var(--bg)" opacity="0.8"/>
          </svg>
          <span className="font-display font-bold text-[var(--text)] text-[18px]">MarrowStack</span>
        </Link>

        <div className="card p-7">
          <h1 className="font-display font-bold text-[22px] text-[var(--text)] mb-1">Create account</h1>
          <p className="text-[13px] text-[var(--text-3)] mb-6">Your GitHub username gets you instant repo access after purchase.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <F name="name" label="Full name" placeholder="Jane Smith" />
            <F name="email" label="Email" type="email" placeholder="jane@example.com" />
            <F name="password" label="Password" type="password" placeholder="Min 8 chars, 1 uppercase, 1 number" />
            <div>
              <label className="block text-[13px] font-medium text-[var(--text-2)] mb-1">GitHub username</label>
              <div className="flex">
                <span className="flex items-center px-3 text-[13px] text-[var(--text-3)] font-mono bg-[var(--bg-3)] border border-r-0 border-[var(--border)] rounded-l-[var(--radius-md)]">github.com/</span>
                <input {...register('githubUsername')} placeholder="yourusername"
                  className={`input rounded-l-none border-l-0 flex-1 ${errors.githubUsername ? 'error' : ''}`} />
              </div>
              {errors.githubUsername && <p className="text-[11px] text-red-500 mt-1">{errors.githubUsername.message}</p>}
              <p className="text-[11px] text-[var(--text-3)] mt-1">We validate it exists and use it to grant repo access.</p>
            </div>
            <button type="submit" disabled={loading}
              className="btn-accent w-full py-2.5 text-[14px] font-semibold text-white disabled:opacity-60 mt-1">
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-[13px] text-[var(--text-3)] mt-5">
            Have an account?{' '}
            <Link href="/auth/signin" className="text-[var(--accent)] hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-base flex items-center justify-center"><div className="w-8 h-8 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" /></div>}>
      <SignUpContent />
    </Suspense>
  )
}
