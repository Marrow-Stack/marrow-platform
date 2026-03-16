// types/index.ts

export type UserRole = 'user' | 'admin'

export interface Profile {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  github_username: string | null
  affiliate_code: string | null
  affiliate_balance: number
  ai_credits: number
  has_pro_subscription: boolean
  paypal_subscription_id: string | null
  role: UserRole
  created_at: string
}

export interface Purchase {
  id: string
  user_id: string
  block_id: string
  paypal_order_id: string
  paypal_capture_id: string | null
  amount: number
  github_username: string | null
  status: 'completed' | 'refunded'
  created_at: string
}

export interface PendingOrder {
  id: string
  order_id: string
  user_id: string
  block_id: string
  amount: number
  affiliate_user_id: string | null
  created_at: string
}

export interface AffiliateEarning {
  id: string
  affiliate_user_id: string
  purchase_user_id: string
  block_id: string
  commission_amount: number
  status: 'pending' | 'paid'
  created_at: string
}

// NextAuth session extension
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string | null
      image: string | null
      githubUsername: string | null
      role: UserRole
    }
  }
  interface User {
    id: string
    githubUsername?: string | null
    role?: UserRole
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    githubUsername: string | null
    role: UserRole
  }
}
