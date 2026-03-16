import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const title = searchParams.get('title') || 'MarrowStack'
  const sub = searchParams.get('sub') || 'Production Next.js Code Blocks'
  const price = searchParams.get('price')

  return new ImageResponse(
    (
      <div style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        width: '100%', height: '100%', padding: '60px 72px',
        background: '#100F0A', fontFamily: 'Georgia, serif',
      }}>
        {/* Hex icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
          <div style={{ width: 40, height: 40, background: '#EFA020', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', opacity: 0.9 }} />
          <span style={{ color: '#F4F3EF', fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' }}>MarrowStack</span>
        </div>

        {/* Title */}
        <div style={{ color: '#F4F3EF', fontSize: price ? 52 : 64, fontWeight: 900, lineHeight: 1.05, letterSpacing: '-2px', marginBottom: 20, maxWidth: 800 }}>
          {title}
        </div>

        {/* Subtitle */}
        <div style={{ color: '#8C8980', fontSize: 22, lineHeight: 1.4, maxWidth: 700 }}>{sub}</div>

        {/* Price badge */}
        {price && (
          <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: '#EFA020', color: '#fff', padding: '8px 20px', borderRadius: 8, fontWeight: 700, fontSize: 24 }}>
              ${price}
            </div>
            <span style={{ color: '#625F58', fontSize: 16 }}>one-time · instant GitHub access</span>
          </div>
        )}

        {/* Bottom bar */}
        <div style={{ position: 'absolute', bottom: 48, left: 72, right: 72, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#3E3C37', fontSize: 14 }}>marrowstack.dev</span>
          <span style={{ color: '#3E3C37', fontSize: 14 }}>100% TypeScript · Supabase · Next.js 14</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
