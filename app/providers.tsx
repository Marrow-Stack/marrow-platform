'use client'
import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'react-hot-toast'
import { createContext, useContext, useEffect, useState } from 'react'

// ── Theme context ─────────────────────────────────────────────
type Theme = 'light' | 'dark' | 'system'
const ThemeCtx = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({ theme: 'light', setTheme: () => {} })
export const useTheme = () => useContext(ThemeCtx)

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')

  useEffect(() => {
    const stored = localStorage.getItem('ms-theme') as Theme | null
    if (stored) setThemeState(stored)
  }, [])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem('ms-theme', t)
    const isDark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme:dark)').matches)
    document.documentElement.classList.toggle('dark', isDark)
  }

  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: '',
            style: {
              background: 'var(--bg-2)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '500',
              boxShadow: 'var(--shadow-md)',
              padding: '12px 16px',
            },
            success: { iconTheme: { primary: 'var(--accent)', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#E53E3E',      secondary: '#fff' } },
            duration: 4000,
          }}
        />
      </ThemeProvider>
    </SessionProvider>
  )
}
