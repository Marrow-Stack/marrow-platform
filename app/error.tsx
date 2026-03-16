'use client'
import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[Error boundary]', error.message, error.digest) }, [error])
  return (
    <html lang="en"><body style={{ background: 'var(--bg,#FAFAF8)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui,sans-serif', padding: '16px' }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <p style={{ fontSize: 72, margin: 0 }}>⚠️</p>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '16px 0 8px' }}>Something went wrong</h2>
        <p style={{ color: '#625F58', marginBottom: 24, fontSize: 14 }}>{error.message}</p>
        {error.digest && <p style={{ color: '#8C8980', fontSize: 12, marginBottom: 24 }}>Error ID: {error.digest}</p>}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={reset} style={{ padding: '10px 20px', background: '#EFA020', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>Try again</button>
          <Link href="/" style={{ padding: '10px 20px', border: '1px solid #DDDBD4', borderRadius: 10, textDecoration: 'none', color: '#3E3C37', fontSize: 14 }}>Go home</Link>
        </div>
      </div>
    </body></html>
  )
}
