// lib/auth.ts
import { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GitHubProvider from 'next-auth/providers/github'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'

export const authOptions: AuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id, email, name, avatar_url, github_username, role, password_hash')
          .eq('email', credentials.email.toLowerCase())
          .single()

        if (!profile?.password_hash) return null

        const valid = await bcrypt.compare(credentials.password, profile.password_hash)
        if (!valid) return null

        return {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          image: profile.avatar_url,
          githubUsername: profile.github_username,
          role: profile.role,
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile: oauthProfile }) {
      if (account?.provider === 'github') {
        const ghProfile = oauthProfile as any
        const email = user.email!
        const { data: existing } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single()

        if (!existing) {
          const affiliateCode = generateAffiliateCode(email)
          await supabaseAdmin.from('profiles').insert({
            email,
            name: user.name,
            avatar_url: user.image,
            github_username: ghProfile?.login || null,
            affiliate_code: affiliateCode,
            role: 'user',
            ai_credits: 3,
          })
        } else {
          await supabaseAdmin.from('profiles')
            .update({ github_username: ghProfile?.login || null, avatar_url: user.image, name: user.name })
            .eq('email', email)
        }
      }
      return true
    },

    async jwt({ token, user }) {
      if (user) {
        // On login, fetch full profile for the JWT
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id, github_username, role')
          .eq('email', user.email!)
          .single()

        token.id = profile?.id || user.id
        token.githubUsername = profile?.github_username || (user as any).githubUsername || null
        token.role = profile?.role || 'user'
      }
      return token
    },

    async session({ session, token }) {
      session.user.id = token.id
      session.user.githubUsername = token.githubUsername
      session.user.role = token.role
      return session
    },
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
  },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
}

export function generateAffiliateCode(email: string): string {
  const base = email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 8)
  const rand = Math.random().toString(36).slice(2, 6)
  return `${base}-${rand}`
}
