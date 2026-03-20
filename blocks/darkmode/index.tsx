// ============================================================
// MarrowStack Block: Theme Engine
// Stack: Next.js 14+ + Tailwind CSS + CSS Variables
// Covers: no-flash script, ThemeProvider, useTheme hook,
//         per-user theme persistence, scheduled themes
//         (auto dark at sunset via geolocation math),
//         custom accent color picker, CSS variable injection,
//         animated toggle (icon / pill / label variants),
//         useThemeSchedule hook, ThemedImage component,
//         useContrastRatio WCAG checker, useColorScheme
// ============================================================
'use client'

import {
  createContext, useContext, useEffect, useState,
  useCallback, useRef, useMemo,
} from 'react'

// ── Types ─────────────────────────────────────────────────────
export type Theme         = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export interface ThemeColors {
  bg:        string   // main background
  surface:   string   // elevated surface
  text:      string   // primary text
  textMuted: string   // secondary text
  border:    string   // border color
  accent:    string   // brand / accent color
}

export interface ThemeConfig {
  light: ThemeColors
  dark:  ThemeColors
}

// Default palette — override via ThemeProvider config prop
export const DEFAULT_THEME: ThemeConfig = {
  light: { bg: '#FFFFFF', surface: '#F4F3EF', text: '#100F0A', textMuted: '#8C8980', border: '#DDDBD4', accent: '#EFA020' },
  dark:  { bg: '#100F0A', surface: '#18170F', text: '#F4F3EF', textMuted: '#8C8980', border: '#3E3C37', accent: '#EFA020' },
}

interface ThemeContextValue {
  theme:       Theme
  resolved:    ResolvedTheme
  colors:      ThemeColors
  setTheme:    (t: Theme) => void
  cycleTheme:  () => void
  setAccent:   (hex: string) => void
  accent:      string
  isScheduled: boolean
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system', resolved: 'dark',
  colors: DEFAULT_THEME.dark,
  setTheme:   () => {},
  cycleTheme: () => {},   // FIX 1: was () {} (missing arrow — syntax error)
  setAccent:  () => {},
  accent: '#EFA020',
  isScheduled: false,
})

export const useTheme = () => useContext(ThemeContext)

// ── Storage keys ──────────────────────────────────────────────
const KEYS = { theme: 'app-theme', accent: 'app-accent' }

// ── Pure helpers ──────────────────────────────────────────────
function resolveTheme(t: Theme): ResolvedTheme {
  if (t !== 'system') return t
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// FIX 2: handle 3-char hex (#fff) and missing # gracefully
function normalizeHex(hex: string): string {
  const h = hex.startsWith('#') ? hex.slice(1) : hex
  if (h.length === 3) return h.split('').map(c => c + c).join('')
  if (h.length === 6) return h
  return 'EFA020'  // fallback to default accent
}

function hexToRgb(hex: string): string {
  const h = normalizeHex(hex)
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `${r} ${g} ${b}`
}

function applyToDOM(resolved: ResolvedTheme, colors: ThemeColors, accent: string) {
  const root = document.documentElement
  const effectiveAccent = accent || colors.accent
  root.classList.toggle('dark', resolved === 'dark')
  root.setAttribute('data-theme', resolved)
  root.style.colorScheme = resolved
  const vars: Record<string, string> = {
    '--bg':         colors.bg,
    '--bg-surface': colors.surface,
    '--text':       colors.text,
    '--text-muted': colors.textMuted,
    '--border':     colors.border,
    '--accent':     effectiveAccent,
    '--accent-rgb': hexToRgb(effectiveAccent),
  }
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
}

// ── Sunrise/Sunset (no external API) ──────────────────────────
function getSunTimes(lat: number, lon: number): { sunrise: number; sunset: number } {
  const now        = new Date()
  const start      = new Date(now.getFullYear(), 0, 0)
  const dayOfYear  = Math.floor((now.getTime() - start.getTime()) / 86400000)
  const B          = (360 / 365) * (dayOfYear - 81) * (Math.PI / 180)
  const EoT        = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B)
  const TC         = 4 * lon + EoT
  const LST        = 12 - TC / 60
  const decl       = 23.45 * Math.sin(B) * (Math.PI / 180)
  const latR       = lat * (Math.PI / 180)
  // FIX 2: clamp argument to [-1, 1] to prevent NaN at extreme latitudes (>66°N/S)
  const haArg      = Math.max(-1, Math.min(1, -Math.tan(latR) * Math.tan(decl)))
  const HA         = Math.acos(haArg) * (180 / Math.PI)
  return { sunrise: LST - HA / 15, sunset: LST + HA / 15 }
}

function isDaytime(lat: number, lon: number): boolean {
  const { sunrise, sunset } = getSunTimes(lat, lon)
  const h = new Date().getHours() + new Date().getMinutes() / 60
  return h >= sunrise && h <= sunset
}

// ── ThemeProvider ─────────────────────────────────────────────
export function ThemeProvider({
  children,
  config         = DEFAULT_THEME,
  defaultTheme   = 'system',
  enableSchedule = false,
  storageKey,
}: {
  children:        React.ReactNode
  config?:         ThemeConfig
  defaultTheme?:   Theme
  enableSchedule?: boolean
  storageKey?:     { theme?: string; accent?: string }
}) {
  // FIX 3: memoize keys so they don't recreate on every render and trigger effect loops
  const keys = useMemo(() => ({
    theme:  storageKey?.theme  || KEYS.theme,
    accent: storageKey?.accent || KEYS.accent,
  }), [storageKey?.theme, storageKey?.accent])

  const [theme,       setThemeState]  = useState<Theme>(defaultTheme)
  const [resolved,    setResolved]    = useState<ResolvedTheme>(() => resolveTheme(defaultTheme))
  const [accent,      setAccentState] = useState(DEFAULT_THEME.light.accent)
  const [mounted,     setMounted]     = useState(false)
  const [isScheduled, setIsScheduled] = useState(false)
  const scheduleRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const storedTheme  = localStorage.getItem(keys.theme) as Theme | null
      const storedAccent = localStorage.getItem(keys.accent)
      if (storedTheme && ['light', 'dark', 'system'].includes(storedTheme)) setThemeState(storedTheme)
      if (storedAccent) setAccentState(storedAccent)
    } catch {}
    setMounted(true)
  }, [keys.theme, keys.accent])

  // Apply theme + CSS vars whenever theme, accent, or config changes
  useEffect(() => {
    if (!mounted) return
    const r = resolveTheme(theme)
    setResolved(r)
    applyToDOM(r, config[r], accent)

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        const nr: ResolvedTheme = e.matches ? 'dark' : 'light'
        setResolved(nr)
        applyToDOM(nr, config[nr], accent)
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme, accent, mounted, config])

  // Sunrise/sunset schedule
  useEffect(() => {
    if (!mounted || !enableSchedule || !navigator.geolocation) return
    const applySchedule = (lat: number, lon: number) => {
      setThemeState(isDaytime(lat, lon) ? 'light' : 'dark')
      setIsScheduled(true)
      scheduleRef.current = setTimeout(() => applySchedule(lat, lon), 5 * 60 * 1000)
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => applySchedule(pos.coords.latitude, pos.coords.longitude),
      () => { /* permission denied — silently skip */ }
    )
    return () => { if (scheduleRef.current) clearTimeout(scheduleRef.current) }
  }, [mounted, enableSchedule])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    setIsScheduled(false)
    try { localStorage.setItem(keys.theme, t) } catch {}
  }, [keys.theme])

  const cycleTheme = useCallback(() => {
    const order: Theme[] = ['light', 'dark', 'system']
    setTheme(order[(order.indexOf(theme) + 1) % order.length])
  }, [theme, setTheme])

  const setAccent = useCallback((hex: string) => {
    setAccentState(hex)
    try { localStorage.setItem(keys.accent, hex) } catch {}
  }, [keys.accent])

  const colors = useMemo(() => ({ ...config[resolved], accent }), [resolved, accent, config])

  return (
    <ThemeContext.Provider value={{ theme, resolved, colors, setTheme, cycleTheme, setAccent, accent, isScheduled }}>
      {children}
    </ThemeContext.Provider>
  )
}

// ── No-flash inline script (paste in <head> before CSS) ───────
export const THEME_SCRIPT = `(function(){
  try{
    var t=localStorage.getItem('app-theme')||'system';
    var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme:dark)').matches);
    var a=localStorage.getItem('app-accent')||'#EFA020';
    var r=document.documentElement;
    r.classList.toggle('dark',d);
    r.setAttribute('data-theme',d?'dark':'light');
    r.style.colorScheme=d?'dark':'light';
    r.style.setProperty('--accent',a);
  }catch(e){}
})();`

// ── ThemeToggle — three variants ──────────────────────────────
const ICONS: Record<Theme, React.ReactNode> = {
  light:  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
  dark:   <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  system: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
}

export function ThemeToggle({
  variant   = 'icon',
  className = '',
  style,
}: {
  variant?:  'icon' | 'pill' | 'label'
  className?: string
  style?:    React.CSSProperties
}) {
  const { theme, resolved, cycleTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Stable placeholder prevents layout shift during hydration
  if (!mounted) return <div style={{ width: variant === 'pill' ? 64 : 40, height: 36, ...style }} aria-hidden />

  if (variant === 'pill') {
    return (
      <button
        onClick={cycleTheme}
        aria-label={`Current theme: ${theme}. Click to switch.`}
        className={className}
        style={{
          position: 'relative', display: 'inline-flex', alignItems: 'center',
          width: 64, height: 32, borderRadius: 999, padding: '4px',
          background: resolved === 'dark' ? '#252420' : '#ECEAE3',
          border: '1px solid var(--border, #d1d5db)',
          cursor: 'pointer', transition: 'background 0.3s',
          ...style,
        }}
      >
        <span style={{ position: 'absolute', left: 8, fontSize: 12, transition: 'opacity 0.2s', opacity: resolved === 'dark' ? 0.6 : 0 }}>🌙</span>
        <span style={{ position: 'absolute', right: 8, fontSize: 12, transition: 'opacity 0.2s', opacity: resolved === 'light' ? 0.6 : 0 }}>☀️</span>
        <span style={{
          display: 'block', width: 24, height: 24, borderRadius: '50%',
          background: 'var(--accent, #EFA020)',
          transform: resolved === 'dark' ? 'translateX(32px)' : 'translateX(0)',
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          flexShrink: 0,
        }} />
      </button>
    )
  }

  return (
    <button
      onClick={cycleTheme}
      aria-label={`Theme: ${theme}. Click to cycle.`}
      title={`Theme: ${theme}`}
      className={className}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
        background: 'transparent', border: '1px solid var(--border, #d1d5db)',
        color: 'var(--text-2, #374151)', transition: 'background 0.15s',
        ...style,
      }}
    >
      {ICONS[theme]}
      {variant === 'label' && (
        <span style={{ fontSize: 13, fontWeight: 500 }}>
          {theme.charAt(0).toUpperCase() + theme.slice(1)}
        </span>
      )}
    </button>
  )
}

// ── AccentPicker ──────────────────────────────────────────────
export function AccentPicker({
  presets   = ['#EFA020', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#F43F5E'],
  className = '',
}: {
  presets?:  string[]
  className?: string
}) {
  const { accent, setAccent } = useTheme()
  const [open, setOpen]       = useState(false)
  const ref                   = useRef<HTMLDivElement>(null)

  // FIX 4: close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }} className={className}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Change accent color"
        aria-expanded={open}
        style={{
          width: 32, height: 32, borderRadius: '50%',
          background: accent, border: '2px solid var(--border, #ddd)',
          cursor: 'pointer', transition: 'transform 0.15s',
          transform: open ? 'scale(1.1)' : 'scale(1)',
        }}
      />
      {open && (
        <div
          role="dialog"
          aria-label="Accent color picker"
          style={{
            position: 'absolute', top: 40, right: 0, zIndex: 50,
            background: 'var(--bg-surface, #fff)',
            border: '1px solid var(--border, #ddd)',
            borderRadius: 12, padding: 12,
            display: 'flex', gap: 8, flexWrap: 'wrap',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            width: 176,
          }}
        >
          {presets.map(color => (
            <button
              key={color}
              onClick={() => { setAccent(color); setOpen(false) }}
              aria-label={`Set accent to ${color}`}
              aria-pressed={accent === color}
              style={{
                width: 28, height: 28, borderRadius: '50%',
                background: color, cursor: 'pointer',
                border: accent === color ? '3px solid var(--text, #111)' : '2px solid transparent',
                transition: 'transform 0.15s',
                transform: accent === color ? 'scale(1.15)' : 'scale(1)',
              }}
            />
          ))}
          <input
            type="color"
            value={accent}
            onChange={e => setAccent(e.target.value)}
            aria-label="Custom accent color"
            title="Pick a custom color"
            style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }}
          />
        </div>
      )}
    </div>
  )
}

// ── useThemeSchedule — auto dark/light by local sunrise/sunset ─
export function useThemeSchedule(enabled = true) {
  const { setTheme, isScheduled } = useTheme()
  const [sunTimes, setSunTimes]   = useState<{ sunrise: number; sunset: number } | null>(null)

  useEffect(() => {
    if (!enabled || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((pos) => {
      const times = getSunTimes(pos.coords.latitude, pos.coords.longitude)
      setSunTimes(times)
      setTheme(isDaytime(pos.coords.latitude, pos.coords.longitude) ? 'light' : 'dark')
    })
  // FIX 5: include setTheme in deps to avoid stale closure lint warning
  }, [enabled, setTheme])

  return { sunTimes, isScheduled }
}

// ── useContrastRatio — WCAG accessibility checker ─────────────
type WcagLevel = 'AAA' | 'AA' | 'A' | 'fail'

function getLuminance(hex: string): number {
  const h   = normalizeHex(hex)
  const rgb = [0, 2, 4].map(i => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
}

function contrastRatio(fg: string, bg: string): { ratio: number; level: WcagLevel } {
  const L1    = getLuminance(fg)
  const L2    = getLuminance(bg)
  const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)
  const level: WcagLevel = ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'A' : 'fail'
  return { ratio: Math.round(ratio * 100) / 100, level }
}

export function useContrastRatio() {
  const { colors } = useTheme()
  const current    = contrastRatio(colors.text, colors.bg)
  return {
    ratio:  current.ratio,
    level:  current.level,
    /** Check any two hex colors */
    check:  contrastRatio,
    /** True if current theme passes WCAG AA (4.5:1) */
    passes: current.level !== 'fail' && current.level !== 'A',
  }
}

// ── ThemedImage — swap image based on current theme ───────────
export function ThemedImage({
  light, dark, alt, style, className,
}: {
  light: string; dark: string; alt: string
  style?: React.CSSProperties; className?: string
}) {
  const { resolved } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  // Show light image as SSR default — no hydration mismatch
  return (
    <img
      src={mounted && resolved === 'dark' ? dark : light}
      alt={alt}
      style={style}
      className={className}
    />
  )
}

// ── useColorScheme — raw OS preference without Provider ───────
export function useColorScheme(): ResolvedTheme {
  const [scheme, setScheme] = useState<ResolvedTheme>('light')
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setScheme(mq.matches ? 'dark' : 'light')
    const h = (e: MediaQueryListEvent) => setScheme(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  return scheme
}

/*
──────────────────────────────────────────────────────────────
SETUP — 3 steps

1. app/layout.tsx — paste in <head> before CSS:
   import { THEME_SCRIPT } from '@/blocks/darkmode'
   <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />

2. app/providers.tsx:
   import { ThemeProvider } from '@/blocks/darkmode'
   <ThemeProvider defaultTheme="system" enableSchedule={true} />

3. Use anywhere:
   import { ThemeToggle, AccentPicker, useTheme, ThemedImage } from '@/blocks/darkmode'

   <ThemeToggle variant="pill" />           // animated sliding pill
   <ThemeToggle variant="icon" />           // icon only (default)
   <ThemeToggle variant="label" />          // icon + text

   <AccentPicker />                         // 6 presets + custom hex
   <AccentPicker presets={['#3B82F6', '#10B981']} />

   <ThemedImage light="/logo.svg" dark="/logo-dark.svg" alt="Logo" />

   const { ratio, level, passes } = useContrastRatio()
   // { ratio: 7.2, level: 'AAA', passes: true }

   const { sunTimes } = useThemeSchedule(true)
   // auto-darkens at sunset, lightens at sunrise via geolocation

   // Custom brand palette:
   <ThemeProvider config={{
     light: { bg:'#fff', surface:'#f5f5f5', text:'#111', textMuted:'#888', border:'#e5e5e5', accent:'#6366F1' },
     dark:  { bg:'#09090b', surface:'#18181b', text:'#fafafa', textMuted:'#888', border:'#27272a', accent:'#6366F1' },
   }} />

TAILWIND: requires darkMode: 'class' in tailwind.config.js
──────────────────────────────────────────────────────────────
*/
