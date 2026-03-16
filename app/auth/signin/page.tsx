'use client'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import toast from 'react-hot-toast'

const schema = z.object({ email: z.string().email('Enter a valid email'), password: z.string().min(1, 'Required') })
type Inputs = z.infer<typeof schema>

function SignInContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<Inputs>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: Inputs) => {
    setLoading(true)
    const res = await signIn('credentials', { ...data, redirect: false })
    setLoading(false)
    if (res?.ok) { router.push(redirect); router.refresh() }
    else toast.error('Incorrect email or password')
  }

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-10">
          <svg width="24" height="24" viewBox="0 0 22 22" fill="none">
            <polygon points="11,1 21,6.5 21,15.5 11,21 1,15.5 1,6.5" fill="var(--accent)" opacity="0.9"/>
            <polygon points="11,5 17,8.5 17,13.5 11,17 5,13.5 5,8.5" fill="var(--bg)" opacity="0.8"/>
          </svg>
          <span className="font-display font-bold text-[var(--text)] text-[18px]">MarrowStack</span>
        </Link>

        <div className="card p-7">
          <h1 className="font-display font-bold text-[22px] text-[var(--text)] mb-1">Welcome back</h1>
          <p className="text-[13px] text-[var(--text-3)] mb-6">Sign in to access your blocks</p>

          {/* GitHub OAuth */}
          <button onClick={() => signIn('github', { callbackUrl: redirect })}
            className="w-full py-2.5 flex items-center justify-center gap-2.5 btn-ghost text-[14px] font-medium mb-5">
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" className="text-[var(--text-2)]">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            Continue with GitHub
          </button>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[var(--border)]" /></div>
            <div className="relative flex justify-center"><span className="px-3 bg-[var(--bg-2)] text-[var(--text-3)] text-[12px]">or email</span></div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div>
              <input {...register('email')} type="email" placeholder="you@example.com" className={`input ${errors.email ? 'error' : ''}`} />
              {errors.email && <p className="text-[11px] text-red-500 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <input {...register('password')} type="password" placeholder="Password" className={`input ${errors.password ? 'error' : ''}`} />
            </div>
            <button type="submit" disabled={loading}
              className="btn-accent w-full py-2.5 text-[14px] font-semibold text-white disabled:opacity-60">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-[13px] text-[var(--text-3)] mt-5">
            No account?{' '}
            <Link href="/auth/signup" className="text-[var(--accent)] hover:underline font-medium">Sign up free</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-base flex items-center justify-center"><div className="w-8 h-8 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" /></div>}>
      <SignInContent />
    </Suspense>
  )
}
