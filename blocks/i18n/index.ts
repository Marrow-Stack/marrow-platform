// ============================================================
// MarrowStack Block: Internationalization (i18n)
// Stack: Next.js 14 + next-intl 3.x + locale routing
// Covers: locale detection, URL routing, RTL support,
//         INR/USD currency formatting, message files for 5 langs,
//         date/number formatters, LanguageSwitcher component
// Install: npm install next-intl
// ============================================================

// ── Locale config ─────────────────────────────────────────────
export const SUPPORTED_LOCALES = ['en', 'fr', 'de', 'hi', 'ar'] as const
export type SupportedLocale    = typeof SUPPORTED_LOCALES[number]
export const DEFAULT_LOCALE: SupportedLocale = 'en'

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  hi: 'हिन्दी',
  ar: 'العربية',
}

export const LOCALE_FLAGS: Record<SupportedLocale, string> = {
  en: '🇺🇸', fr: '🇫🇷', de: '🇩🇪', hi: '🇮🇳', ar: '🇸🇦',
}

export const RTL_LOCALES: SupportedLocale[] = ['ar']

export function isRTL(locale: string): boolean {
  return RTL_LOCALES.includes(locale as SupportedLocale)
}

export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale)
}

// ── Formatting helpers ────────────────────────────────────────

/**
 * Format a price with locale-appropriate currency.
 * For 'hi' (Hindi/India), automatically converts USD→INR at a fixed rate.
 */
export function formatPrice(
  amountUSD: number,
  locale: string,
  currency: string = 'USD',
  usdToInrRate: number = 84,
): string {
  const isIndia    = locale === 'hi' || currency === 'INR'
  const displayAmt = isIndia ? amountUSD * usdToInrRate : amountUSD
  const displayCur = isIndia ? 'INR' : currency
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: displayCur,
    maximumFractionDigits: 0,
  }).format(displayAmt)
}

export function formatDate(
  date: Date | string,
  locale: string,
  style: Intl.DateTimeFormatOptions['dateStyle'] = 'medium',
): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: style }).format(new Date(date))
}

export function formatTime(date: Date | string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(new Date(date))
}

export function formatNumber(n: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(n)
}

export function formatRelativeTime(date: Date | string, locale: string): string {
  const diffMs  = new Date(date).getTime() - Date.now()
  const diffMin = Math.round(diffMs / 60000)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  if (Math.abs(diffMin) < 60)   return rtf.format(diffMin, 'minute')
  if (Math.abs(diffMin) < 1440) return rtf.format(Math.round(diffMin / 60), 'hour')
  return rtf.format(Math.round(diffMin / 1440), 'day')
}

// ── Message files (copy to messages/*.json) ──────────────────
export const EN_MESSAGES = {
  nav: {
    blocks: 'Blocks', dashboard: 'Dashboard', affiliate: 'Affiliate',
    signIn: 'Sign in', getStarted: 'Get started', signOut: 'Sign out',
  },
  hero: {
    badge:    'production-ready code blocks',
    title:    'Skip the boilerplate.',
    subtitle: 'Copy-paste Next.js code blocks. Auth, billing, admin, and more — fully typed and Supabase-ready.',
    cta:      'Browse Blocks',
    preview:  'See the code',
  },
  blocks: {
    title:     'All Blocks',
    buy:       'Buy for',
    timeSaved: 'h saved',
    lines:     'lines of code',
    owned:     'Owned',
    viewRepo:  'View on GitHub',
    complexity: { Beginner: 'Beginner', Intermediate: 'Intermediate', Advanced: 'Advanced' },
  },
  purchase: {
    payViaPaypal:  'Pay via PayPal',
    inrEquivalent: 'approx. in INR',
    guarantee:     '30-Day Guarantee',
    success:       'You\'re in! Check your email for the GitHub invite.',
    cancel:        'Payment cancelled — no charge made.',
    processing:    'Confirming payment…',
    instantAccess: 'Instant GitHub access',
    ownForever:    'Own the code forever',
    freeUpdates:   'Free updates',
  },
  dashboard: {
    title:     'Dashboard',
    myBlocks:  'My Blocks',
    affiliate: 'Affiliate',
    customize: 'Customize',
    noBlocks:  'No blocks yet. Browse the library to get started.',
  },
  affiliate: {
    commission: '25% commission',
    yourLink:   'Your affiliate link',
    balance:    'Available balance',
    earned:     'Total earned',
    pending:    'Pending',
    referrals:  'Referrals',
    requestPayout: 'Request Payout',
    minPayout:  'Minimum payout: $50',
  },
  errors: {
    notFound:    'Page not found',
    serverError: 'Something went wrong',
    unauthorized:'Sign in required',
    forbidden:   'You don\'t have permission to access this page',
  },
  common: {
    loading: 'Loading…', save: 'Save', cancel: 'Cancel', delete: 'Delete',
    back: 'Back', copy: 'Copy', copied: 'Copied!', close: 'Close',
  },
}

export const FR_MESSAGES: typeof EN_MESSAGES = {
  nav: {
    blocks: 'Blocs', dashboard: 'Tableau de bord', affiliate: 'Affilié',
    signIn: 'Se connecter', getStarted: 'Commencer', signOut: 'Se déconnecter',
  },
  hero: {
    badge:    'blocs de code prêts pour la production',
    title:    'Sautez le boilerplate.',
    subtitle: 'Blocs Next.js prêts à l\'emploi. Auth, facturation, admin — typés et prêts pour Supabase.',
    cta:      'Voir les blocs',
    preview:  'Voir le code',
  },
  blocks: {
    title: 'Tous les blocs',
    buy: 'Acheter pour', timeSaved: 'h économisées', lines: 'lignes de code',
    owned: 'Possédé', viewRepo: 'Voir sur GitHub',
    complexity: { Beginner: 'Débutant', Intermediate: 'Intermédiaire', Advanced: 'Avancé' },
  },
  purchase: {
    payViaPaypal: 'Payer via PayPal', inrEquivalent: 'équiv. en INR',
    guarantee: 'Garantie 30 jours', success: 'Accès accordé!',
    cancel: 'Paiement annulé.', processing: 'Vérification du paiement…',
    instantAccess: 'Accès GitHub instantané', ownForever: 'Code à vous pour toujours',
    freeUpdates: 'Mises à jour gratuites',
  },
  dashboard: {
    title: 'Tableau de bord', myBlocks: 'Mes blocs',
    affiliate: 'Affilié', customize: 'Personnaliser',
    noBlocks: 'Aucun bloc encore. Parcourez la bibliothèque.',
  },
  affiliate: {
    commission: '25% de commission', yourLink: 'Votre lien affilié',
    balance: 'Solde disponible', earned: 'Total gagné', pending: 'En attente',
    referrals: 'Références', requestPayout: 'Demander un virement',
    minPayout: 'Virement minimum: 50$',
  },
  errors: {
    notFound: 'Page introuvable', serverError: 'Quelque chose s\'est mal passé',
    unauthorized: 'Connexion requise', forbidden: 'Accès refusé',
  },
  common: {
    loading: 'Chargement…', save: 'Enregistrer', cancel: 'Annuler',
    delete: 'Supprimer', back: 'Retour', copy: 'Copier', copied: 'Copié!', close: 'Fermer',
  },
}

// ── next-intl config files (copy to project root) ────────────

// i18n.ts (root):
export const I18N_CONFIG_FILE = `
import { getRequestConfig } from 'next-intl/server'
import { isSupportedLocale } from '@/blocks/i18n'

export default getRequestConfig(async ({ locale }) => {
  if (!isSupportedLocale(locale)) notFound()
  return {
    messages: (await import(\`./messages/\${locale}.json\`)).default,
    timeZone: 'UTC',
    now: new Date(),
  }
})
`

// middleware.ts (add to existing or replace):
export const I18N_MIDDLEWARE = `
import createMiddleware from 'next-intl/middleware'
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@/blocks/i18n'

export default createMiddleware({
  locales: SUPPORTED_LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'as-needed',     // e.g. /fr/blocks, /blocks (en)
  alternateLinks: true,          // adds hreflang links
})

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\\\..*).*)'],
}
`

// ── LanguageSwitcher component (client, works with useRouter) ─
export const LANGUAGE_SWITCHER_CODE = `
'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import { SUPPORTED_LOCALES, LOCALE_LABELS, LOCALE_FLAGS } from '@/blocks/i18n'

export function LanguageSwitcher() {
  const router   = useRouter()
  const pathname = usePathname()
  const locale   = useLocale()

  const switchTo = (next: string) => {
    const segments = pathname.split('/')
    // Replace or insert locale segment
    if (SUPPORTED_LOCALES.includes(segments[1] as any)) {
      segments[1] = next === 'en' ? '' : next
    } else {
      segments.unshift('', next === 'en' ? '' : next)
    }
    router.push(segments.filter(Boolean).join('/') || '/')
  }

  return (
    <select
      value={locale}
      onChange={e => switchTo(e.target.value)}
      style={{ padding: '6px 10px', borderRadius: 8, fontSize: 13, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer' }}
    >
      {SUPPORTED_LOCALES.map(loc => (
        <option key={loc} value={loc}>
          {LOCALE_FLAGS[loc]} {LOCALE_LABELS[loc]}
        </option>
      ))}
    </select>
  )
}
`

/*
──────────────────────────────────────────────────────────────
SETUP

1. npm install next-intl

2. Copy i18n.ts, update next.config.js:
   const withNextIntl = require('next-intl/plugin')('./i18n.ts')
   module.exports = withNextIntl({ ...yourConfig })

3. Create messages/ directory with en.json, fr.json, etc.
   (export EN_MESSAGES / FR_MESSAGES above as the content)

4. Rename app/ to app/[locale]/ — Next.js handles routing.

5. In any server component:
   import { useTranslations } from 'next-intl'
   const t = useTranslations('nav')
   <Link href="/blocks">{t('blocks')}</Link>

6. Formatting:
   import { formatPrice, formatDate } from '@/blocks/i18n'
   formatPrice(19, 'hi')           // ₹1,596
   formatDate(new Date(), 'fr')    // 16 mars 2026
──────────────────────────────────────────────────────────────
*/
