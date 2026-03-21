'use client'

export type Currency = 'USD'

export function useCurrency() {
  const formatPrice = (usd: number): string => `$${usd}`

  return {
    currency:    'USD' as Currency,
    formatPrice,
    isIndia:     false,
    rate:        1,
    rateLoading: false,
  }
}