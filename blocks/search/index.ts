// ============================================================
// MarrowStack Block: Full-Text Search
// Stack: Next.js 14 + PostgreSQL tsvector + Supabase
// Covers: FTS with GIN index, websearch format, highlighting,
//         autocomplete, faceted filters, pagination, React hook
// ============================================================

// ── SQL: set up FTS on your table ─────────────────────────────
/*
-- Example: posts table with FTS
CREATE TABLE IF NOT EXISTS posts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id),
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  tags       TEXT[] DEFAULT '{}',
  category   TEXT,
  published  BOOLEAN NOT NULL DEFAULT true,
  view_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-generated tsvector: weighted A (title) + B (content)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title,   '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(coalesce(tags, '{}'), ' ')), 'C')
  ) STORED;

-- GIN index makes FTS fast on millions of rows
CREATE INDEX IF NOT EXISTS posts_fts_gin ON posts USING GIN(fts);

-- Prefix autocomplete index on title
CREATE INDEX IF NOT EXISTS posts_title_trgm ON posts USING GIN(title gin_trgm_ops);
-- (requires pg_trgm extension: CREATE EXTENSION IF NOT EXISTS pg_trgm)

-- FTS search function (supports pagination + count in one call)
CREATE OR REPLACE FUNCTION search_posts(
  query        TEXT,
  p_category   TEXT    DEFAULT NULL,
  p_limit      INT     DEFAULT 20,
  p_offset     INT     DEFAULT 0
)
RETURNS TABLE(id UUID, title TEXT, content TEXT, tags TEXT[], category TEXT, created_at TIMESTAMPTZ, rank REAL, total BIGINT)
LANGUAGE sql AS $$
  WITH results AS (
    SELECT *, ts_rank_cd(fts, websearch_to_tsquery('english', query)) AS rank,
           COUNT(*) OVER() AS total
    FROM posts
    WHERE published = true
      AND (query = '' OR fts @@ websearch_to_tsquery('english', query))
      AND (p_category IS NULL OR category = p_category)
    ORDER BY rank DESC, created_at DESC
    LIMIT p_limit OFFSET p_offset
  )
  SELECT id, title, content, tags, category, created_at, rank, total FROM results;
$$;
*/

import { createClient } from '@supabase/supabase-js'
import { useEffect, useState, useCallback, useRef } from 'react'

// ── Types ─────────────────────────────────────────────────────
export interface SearchOptions<F = Record<string, unknown>> {
  table:       string
  columns:     string
  ftsColumn?:  string
  filters?:    F
  orderBy?:    { column: string; ascending?: boolean }
  limit?:      number
  offset?:     number
  config?:     'english' | 'simple'
}

export interface SearchResult<T> {
  items:       T[]
  total:       number
  query:       string
  page:        number
  totalPages:  number
  timingMs?:   number
}

export interface FacetCounts {
  [key: string]: Record<string, number>
}

// ── Browser client ────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ── Core search ───────────────────────────────────────────────
export async function fullTextSearch<T = Record<string, unknown>>(
  query: string,
  opts: SearchOptions
): Promise<SearchResult<T>> {
  const {
    table, columns,
    ftsColumn = 'fts',
    filters = {},
    orderBy,
    limit = 20,
    offset = 0,
    config = 'english',
  } = opts

  const t0 = Date.now()
  const sanitized = sanitizeQuery(query)

  let q = supabase.from(table).select(columns, { count: 'exact' })

  if (sanitized) {
    q = q.textSearch(ftsColumn, sanitized, { type: 'websearch', config })
  }

  for (const [col, val] of Object.entries(filters)) {
    if (val !== undefined && val !== null && val !== '') {
      q = Array.isArray(val) ? (q as any).in(col, val) : (q as any).eq(col, val)
    }
  }

  if (orderBy) {
    q = q.order(orderBy.column, { ascending: orderBy.ascending ?? false })
  } else if (!sanitized) {
    q = q.order('created_at', { ascending: false })
  }

  const { data, count, error } = await q.range(offset, offset + limit - 1)
  if (error) throw error

  const total = count || 0
  return {
    items:      (data || []) as T[],
    total,
    query,
    page:       Math.floor(offset / limit) + 1,
    totalPages: Math.ceil(total / limit),
    timingMs:   Date.now() - t0,
  }
}

// ── Prefix / autocomplete ─────────────────────────────────────
export async function autocomplete(
  query: string,
  table: string,
  column: string,
  limit = 8,
  extra?: Record<string, unknown>
): Promise<string[]> {
  if (query.length < 2) return []
  let q = supabase.from(table).select(column).ilike(column, `${query}%`).limit(limit)
  if (extra) {
    for (const [k, v] of Object.entries(extra)) q = (q as any).eq(k, v)
  }
  const { data } = await q
  return [...new Set((data || []).map((r: any) => r[column] as string))]
}

// ── Facet counts (for filter sidebars) ────────────────────────
export async function getFacetCounts(
  table: string,
  facetColumns: string[],
  baseFilters?: Record<string, unknown>
): Promise<FacetCounts> {
  const result: FacetCounts = {}
  await Promise.all(
    facetColumns.map(async (col) => {
      let q = supabase.from(table).select(col)
      if (baseFilters) {
        for (const [k, v] of Object.entries(baseFilters)) {
          if (v !== undefined && v !== null) q = (q as any).eq(k, v)
        }
      }
      const { data } = await q
      const counts: Record<string, number> = {}
      for (const row of data || []) {
        const val = String((row as any)[col] || 'Other')
        counts[val] = (counts[val] || 0) + 1
      }
      result[col] = counts
    })
  )
  return result
}

// ── Query sanitizer ────────────────────────────────────────────
export function sanitizeQuery(query: string): string {
  return query
    .trim()
    .replace(/[|&!<>()~*:@\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 256)
}

// ── Highlighter with context extraction ───────────────────────
export interface HighlightOptions {
  maxLength?:   number
  contextPad?:  number
  tag?:         string
  minWordLen?:  number
}

export function highlightMatches(
  text: string,
  query: string,
  opts: HighlightOptions = {}
): string {
  const {
    maxLength = 220,
    contextPad = 60,
    tag = 'mark',
    minWordLen = 2,
  } = opts

  if (!query.trim() || !text) return text.slice(0, maxLength)

  const words = sanitizeQuery(query)
    .split(/\s+/)
    .filter(w => w.length >= minWordLen)

  if (!words.length) return text.slice(0, maxLength)

  const pattern = words
    .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')
  const regex = new RegExp(`(${pattern})`, 'gi')

  // Find first match position for context extraction
  const match = regex.exec(text)
  regex.lastIndex = 0

  let excerpt: string
  if (!match) {
    excerpt = text.slice(0, maxLength)
  } else {
    const start = Math.max(0, match.index - contextPad)
    const end   = Math.min(text.length, match.index + maxLength - contextPad)
    excerpt = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
  }

  return excerpt.replace(regex, `<${tag}>$1</${tag}>`)
}

// ── Recent searches (localStorage) ───────────────────────────
const RECENT_KEY = 'ms_recent_searches'

export function getRecentSearches(max = 10): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').slice(0, max)
  } catch { return [] }
}

export function addRecentSearch(query: string): void {
  try {
    const existing = getRecentSearches()
    const next = [query, ...existing.filter(q => q !== query)].slice(0, 10)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {}
}

export function clearRecentSearches(): void {
  try { localStorage.removeItem(RECENT_KEY) } catch {}
}

// ── React hook: full search state ────────────────────────────
export interface UseSearchOptions extends Omit<SearchOptions, 'offset'> {
  debounceMs?: number
  initialQuery?: string
  enabled?: boolean
}

export function useSearch<T = Record<string, unknown>>(opts: UseSearchOptions) {
  const [query,    setQuery]    = useState(opts.initialQuery || '')
  const [results,  setResults]  = useState<T[]>([])
  const [total,    setTotal]    = useState(0)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [page,     setPage]     = useState(1)
  const timerRef  = useRef<ReturnType<typeof setTimeout>>()
  const limit     = opts.limit || 20

  const runSearch = useCallback(async (q: string, p: number) => {
    if (opts.enabled === false) return
    setLoading(true); setError(null)
    try {
      const res = await fullTextSearch<T>(q, {
        ...opts,
        limit,
        offset: (p - 1) * limit,
      })
      setResults(res.items)
      setTotal(res.total)
    } catch (e: any) {
      setError(e.message)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(opts.filters), opts.table, opts.columns])

  useEffect(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      runSearch(query, page)
      if (query.trim()) addRecentSearch(query.trim())
    }, query ? (opts.debounceMs ?? 300) : 0)
    return () => clearTimeout(timerRef.current)
  }, [query, page, runSearch])

  const totalPages = Math.ceil(total / limit)

  return {
    query, setQuery,
    results, total, loading, error,
    page, setPage,
    totalPages,
    hasMore: page < totalPages,
    nextPage: () => setPage(p => Math.min(p + 1, totalPages)),
    prevPage: () => setPage(p => Math.max(p - 1, 1)),
    reset: () => { setQuery(''); setPage(1) },
    recentSearches: getRecentSearches(),
  }
}
