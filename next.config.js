/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable Turbopack — use stable webpack until next-auth fully supports it
  turbopack: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  // Next.js 16: scroll-behavior override removed — add this to keep smooth nav
  // Add data-scroll-behavior="smooth" to <html> in layout.tsx if you want smooth scrolling
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}
module.exports = nextConfig