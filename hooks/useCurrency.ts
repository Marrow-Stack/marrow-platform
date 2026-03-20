'use client'
import { useState, useEffect } from 'react'

export type Currency = 'INR' | 'USD'

const CACHE_KEY     = 'ms_usd_inr_rate'
const CACHE_TTL_MS  = 6 * 60 * 60 * 1000   // 6 hours
const FALLBACK_RATE = 84                     // used if fetch fails

interface CachedRate {
  rate:      number
  fetchedAt: number
}

// Fetch live USD→INR rate from frankfurter.app (free, no key needed)
async function fetchLiveRate(): Promise<number> {
  const res  = await fetch('https://api.frankfurter.app/latest?from=USD&to=INR', {
    next: { revalidate: 21600 },  // Next.js cache hint — 6 hours
  })
  if (!res.ok) throw new Error(`Rate fetch failed: ${res.status}`)
  const data = await res.json()
  return data.rates.INR as number
}

// Read from localStorage cache
function getCachedRate(): number | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cached: CachedRate = JSON.parse(raw)
    if (Date.now() - cached.fetchedAt > CACHE_TTL_MS) return null  // expired
    return cached.rate
  } catch {
    return null
  }
}

// Write to localStorage cache
function setCachedRate(rate: number) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ rate, fetchedAt: Date.now() }))
  } catch {}
}

export function useCurrency(): {
  currency:      Currency
  formatPrice:   (usd: number) => string
  isIndia:       boolean
  rate:          number        // live USD→INR rate
  rateLoading:   boolean
} {
  const [currency,    setCurrency]    = useState<Currency>('USD')
  const [rate,        setRate]        = useState<number>(FALLBACK_RATE)
  const [rateLoading, setRateLoading] = useState(false)

  useEffect(() => {
    // 1. Detect India via timezone
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (tz === 'Asia/Calcutta' || tz === 'Asia/Kolkata') setCurrency('INR')
      else return  // not India — no need to fetch INR rate
    } catch {
      return
    }

    // 2. Try cache first
    const cached = getCachedRate()
    if (cached) {
      setRate(cached)
      return
    }

    // 3. Fetch live rate
    setRateLoading(true)
    fetchLiveRate()
      .then(liveRate => {
        setRate(liveRate)
        setCachedRate(liveRate)
      })
      .catch(() => {
        // Silent fallback — show ₹84 rather than breaking
        setRate(FALLBACK_RATE)
      })
      .finally(() => setRateLoading(false))
  }, [])

  const formatPrice = (usd: number): string => {
    if (currency === 'INR') {
      const inr = Math.round(usd * rate)
      return `₹${inr.toLocaleString('en-IN')}`
    }
    return `$${usd}`
  }

  return { currency, formatPrice, isIndia: currency === 'INR', rate, rateLoading }
}