import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Admin-only routes
    if (pathname.startsWith('/admin') && token?.role !== 'admin' && token?.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
  },
  {
    callbacks: { authorized: ({ token, req }) => {
      const { pathname } = req.nextUrl
      if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) return !!token
      return true
    }},
    pages: { signIn: '/auth/signin' },
  }
)

export const config = { matcher: ['/dashboard/:path*', '/admin/:path*'] }