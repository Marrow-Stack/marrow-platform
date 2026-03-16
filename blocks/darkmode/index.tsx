// ============================================================
// MarrowStack Block: Dark Mode Toggle
// Stack: Next.js 14 + Tailwind CSS + localStorage
// Covers: no-flash script, ThemeProvider, useTheme hook,
//         toggle button, CSS variable approach, system detection,
//         3-way cycle (light / dark / system), hydration safe
// ============================================================
'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────
export type Theme         = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

interface ThemeContextValue {
  /** User's stored preference */
  theme:    Theme
  /** Actual resolved value ('system' resolves to 'light' or 'dark') */
  resolved: ResolvedTheme
  /** Update preference — persists to localStorage */
  setTheme: (t: Theme) => void
  /** Cycle through light → dark → system */
  cycleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme:      'system',
  resolved:   'dark',
  setTheme:   () => {},
  cycleTheme: () => {},
})

export const useTheme = () => useContext(ThemeContext)

// ── Storage key (change to namespace your app) ────────────────
const STORAGE_KEY = 'ms-theme'

// ── Resolve 'system' to the actual OS preference ──────────────
function resolveTheme(t: Theme): ResolvedTheme {
  if (t !== 'system') return t
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// ── Apply theme to <html> element ────────────────────────────
function applyToDOM(resolved: ResolvedTheme) {
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.setAttribute('data-theme', resolved)
  // Also set color-scheme for browser chrome (scrollbars, inputs, etc.)
  root.style.colorScheme = resolved
}

// ── ThemeProvider ─────────────────────────────────────────────
export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey   = STORAGE_KEY,
}: {
  children:     React.ReactNode
  defaultTheme?: Theme
  storageKey?:  string
}) {
  const [theme,    setThemeState] = useState<Theme>(defaultTheme)
  const [resolved, setResolved]   = useState<ResolvedTheme>(() => resolveTheme(defaultTheme))
  const [mounted,  setMounted]    = useState(false)

  useEffect(() => {
    // Hydrate from localStorage
    try {
      const stored = localStorage.getItem(storageKey) as Theme | null
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        setThemeState(stored)
      }
    } catch {}
    setMounted(true)
  }, [storageKey])

  useEffect(() => {
    if (!mounted) return
    const r = resolveTheme(theme)
    setResolved(r)
    applyToDOM(r)

    // Listen for OS preference changes (handles 'system' mode)
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        const newResolved: ResolvedTheme = e.matches ? 'dark' : 'light'
        setResolved(newResolved)
        applyToDOM(newResolved)
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme, mounted])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    try { localStorage.setItem(storageKey, t) } catch {}
  }, [storageKey])

  const cycleTheme = useCallback(() => {
    const order: Theme[] = ['light', 'dark', 'system']
    setTheme(order[(order.indexOf(theme) + 1) % order.length])
  }, [theme, setTheme])

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// ── Inline no-flash script ────────────────────────────────────
// Paste into <head> BEFORE any stylesheets. Prevents FOUC.
export const THEME_SCRIPT = `(function(){
  try {
    var k='${STORAGE_KEY}';
    var t=localStorage.getItem(k)||'system';
    var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);
    document.documentElement.classList.toggle('dark',d);
    document.documentElement.setAttribute('data-theme',d?'dark':'light');
    document.documentElement.style.colorScheme=d?'dark':'light';
  } catch(e){}
})();`

// ── ThemeToggle button ────────────────────────────────────────
const ICONS: Record<Theme, React.ReactNode> = {
  light:  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
  dark:   <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  system: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
}
const LABELS: Record<Theme, string> = { light: 'Light', dark: 'Dark', system: 'System' }

interface ThemeToggleProps {
  /** Show text label next to icon */
  showLabel?: boolean
  /** Extra CSS classes */
  className?: string
  /** Override button style */
  style?: React.CSSProperties
}

export function ThemeToggle({ showLabel = false, className = '', style }: ThemeToggleProps) {
  const { theme, cycleTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Render a placeholder matching the button size to avoid layout shift
  if (!mounted) return (
    <div style={{ width: showLabel ? 80 : 36, height: 36, ...style }} />
  )

  return (
    <button
      onClick={cycleTheme}
      title={`Theme: ${LABELS[theme]}. Click to cycle.`}
      className={className}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '8px 10px', border: '1px solid var(--border,#d1d5db)',
        borderRadius: 8, background: 'transparent', cursor: 'pointer',
        color: 'var(--text-2,#374151)', transition: 'background 0.15s, color 0.15s',
        ...style,
      }}
    >
      {ICONS[theme]}
      {showLabel && <span style={{ fontSize: 13, fontWeight: 500 }}>{LABELS[theme]}</span>}
    </button>
  )
}

// ── useColorScheme: raw OS preference without ThemeProvider ───
export function useColorScheme(): ResolvedTheme {
  const [scheme, setScheme] = useState<ResolvedTheme>('light')
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setScheme(mq.matches ? 'dark' : 'light')
    const handler = (e: MediaQueryListEvent) => setScheme(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return scheme
}

/*
──────────────────────────────────────────────────────────────
SETUP — 3 steps

1. app/layout.tsx <head> — paste before CSS links:
   import { THEME_SCRIPT } from '@/blocks/darkmode'
   <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />

2. app/providers.tsx — wrap the app:
   import { ThemeProvider } from '@/blocks/darkmode'
   <ThemeProvider defaultTheme="system">{children}</ThemeProvider>

3. Anywhere in the UI:
   import { ThemeToggle } from '@/blocks/darkmode'
   <ThemeToggle showLabel />            // shows "Light / Dark / System"
   <ThemeToggle />                      // icon only

   // Or programmatic control:
   import { useTheme } from '@/blocks/darkmode'
   const { theme, resolved, setTheme } = useTheme()
   setTheme('dark')

TAILWIND: make sure tailwind.config.js has:
   darkMode: 'class'

CSS VARIABLES (recommended — add to globals.css):
   :root { --bg: #fff; --text: #111; }
   .dark { --bg: #100F0A; --text: #F4F3EF; }
──────────────────────────────────────────────────────────────
*/
