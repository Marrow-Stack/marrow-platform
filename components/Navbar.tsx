'use client'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useTheme } from '@/app/providers'

export function Navbar() {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const cycleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light')
  const ThemeIcon = () => (
    <span className="text-base" aria-label="toggle theme">
      {theme === 'dark' ? '☀️' : '🌙'}
    </span>
  )

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-200 ${scrolled ? 'glass border-b border-[var(--border)]' : 'bg-transparent'}`}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-[60px] flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="transition-transform group-hover:rotate-12 duration-300">
            <polygon points="11,1 21,6.5 21,15.5 11,21 1,15.5 1,6.5" fill="var(--accent)" opacity="0.9"/>
            <polygon points="11,5 17,8.5 17,13.5 11,17 5,13.5 5,8.5" fill="var(--bg)" opacity="0.7"/>
          </svg>
          <span className="font-display font-bold text-[var(--text)] text-[17px] tracking-tight">MarrowStack</span>
        </Link>

        {/* Desktop */}
        <nav className="hidden md:flex items-center gap-1">
          {[['Blocks', '/blocks'], ['Affiliate', '/affiliate']].map(([l, h]) => (
            <Link key={l} href={h} className="px-3 py-1.5 text-sm text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-3)] rounded-lg transition-all">
              {l}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <button onClick={cycleTheme} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-3)] transition-colors">
            <ThemeIcon />
          </button>
          {session ? (
            <>
              <Link href="/dashboard" className="px-4 py-1.5 text-sm font-medium text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-3)] rounded-lg transition-all">
                Dashboard
              </Link>
              <button onClick={() => signOut({ callbackUrl: '/' })} className="px-4 py-1.5 text-sm text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/signin" className="px-4 py-1.5 text-sm text-[var(--text-2)] hover:text-[var(--text)] transition-colors">
                Sign in
              </Link>
              <Link href="/auth/signup" className="btn-accent px-4 py-1.5 text-sm text-white">
                Get started
              </Link>
            </>
          )}
        </div>

        {/* Mobile */}
        <div className="md:hidden flex items-center gap-2">
          <button onClick={cycleTheme} className="w-8 h-8 flex items-center justify-center"><ThemeIcon /></button>
          <button onClick={() => setOpen(!open)} className="w-8 h-8 flex items-center justify-center text-[var(--text-2)]">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              {open ? <><line x1="3" y1="3" x2="15" y2="15"/><line x1="15" y1="3" x2="3" y2="15"/></> : <><line x1="3" y1="5" x2="15" y2="5"/><line x1="3" y1="9" x2="15" y2="9"/><line x1="3" y1="13" x2="15" y2="13"/></>}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-[var(--bg-2)] border-t border-[var(--border)] px-5 py-4 flex flex-col gap-1">
          {[['Blocks', '/blocks'], ['Affiliate', '/affiliate']].map(([l, h]) => (
            <Link key={l} href={h} className="py-2 text-sm text-[var(--text-2)]" onClick={() => setOpen(false)}>{l}</Link>
          ))}
          <div className="border-t border-[var(--border)] mt-2 pt-3 flex flex-col gap-2">
            {session ? (
              <>
                <Link href="/dashboard" className="py-2 text-sm text-[var(--text-2)]" onClick={() => setOpen(false)}>Dashboard</Link>
                <button onClick={() => signOut({ callbackUrl: '/' })} className="text-left py-2 text-sm text-[var(--text-3)]">Sign out</button>
              </>
            ) : (
              <>
                <Link href="/auth/signin" className="py-2 text-sm text-[var(--text-2)]" onClick={() => setOpen(false)}>Sign in</Link>
                <Link href="/auth/signup" className="btn-accent px-4 py-2 text-sm text-center text-white" onClick={() => setOpen(false)}>Get started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
