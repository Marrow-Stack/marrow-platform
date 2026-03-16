// ============================================================
// MarrowStack Block: Error Handling
// Stack: Next.js 14 + React Error Boundaries + Structured Logging
// ============================================================
'use client'

import React, { Component } from 'react'

// ── Structured logger ─────────────────────────────────────────
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  context?: Record<string, unknown>
  timestamp: string
  requestId?: string
}

export const logger = {
  _log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      level, message, context,
      timestamp: new Date().toISOString(),
      requestId: typeof crypto !== 'undefined' ? crypto.randomUUID().slice(0, 8) : undefined,
    }
    if (level === 'error') console.error(JSON.stringify(entry))
    else if (level === 'warn') console.warn(JSON.stringify(entry))
    else console.log(JSON.stringify(entry))

    // In production: send to logging service (Axiom, Datadog, etc.)
    if (process.env.NODE_ENV === 'production' && level === 'error') {
      // fetch('/api/log', { method: 'POST', body: JSON.stringify(entry) }).catch(() => {})
    }
    return entry
  },
  debug: (msg: string, ctx?: Record<string, unknown>) => logger._log('debug', msg, ctx),
  info:  (msg: string, ctx?: Record<string, unknown>) => logger._log('info', msg, ctx),
  warn:  (msg: string, ctx?: Record<string, unknown>) => logger._log('warn', msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => logger._log('error', msg, ctx),
}

// ── Custom error types ────────────────────────────────────────
export class AppError extends Error {
  constructor(message: string, public code: string, public statusCode = 500, public context?: Record<string, unknown>) {
    super(message)
    this.name = 'AppError'
  }
}
export class NotFoundError extends AppError {
  constructor(resource: string) { super(`${resource} not found`, 'NOT_FOUND', 404) }
}
export class UnauthorizedError extends AppError {
  constructor(msg = 'Unauthorized') { super(msg, 'UNAUTHORIZED', 401) }
}
export class ValidationError extends AppError {
  constructor(msg: string) { super(msg, 'VALIDATION_ERROR', 400) }
}
export class RateLimitError extends AppError {
  constructor(retryAfter: number) { super('Too many requests', 'RATE_LIMIT', 429, { retryAfter }) }
}

// ── API error handler ─────────────────────────────────────────
export function handleApiError(err: unknown): Response {
  if (err instanceof AppError) {
    logger.warn('App error', { code: err.code, message: err.message, context: err.context })
    return Response.json({ error: err.message, code: err.code }, { status: err.statusCode })
  }
  logger.error('Unhandled error', { error: err instanceof Error ? err.message : String(err) })
  return Response.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
}

// ── React Error Boundary ──────────────────────────────────────
interface BoundaryState { hasError: boolean; error: Error | null; errorId: string }
interface BoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; errorId: string; reset: () => void }>
}

export class ErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false, error: null, errorId: '' }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { hasError: true, error, errorId: Math.random().toString(36).slice(2, 9) }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error('React error boundary caught', {
      error: error.message, stack: error.stack, componentStack: info.componentStack || '',
    })
  }

  reset = () => this.setState({ hasError: false, error: null, errorId: '' })

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const Fallback = this.props.fallback
        return <Fallback error={this.state.error} errorId={this.state.errorId} reset={this.reset} />
      }
      return <DefaultErrorFallback error={this.state.error} errorId={this.state.errorId} reset={this.reset} />
    }
    return this.props.children
  }
}

function DefaultErrorFallback({ error, errorId, reset }: { error: Error; errorId: string; reset: () => void }) {
  return (
    <div style={{ padding: 32, textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h2>
      <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 8 }}>{error.message}</p>
      <p style={{ color: '#9ca3af', fontSize: 12, marginBottom: 24 }}>Error ID: {errorId}</p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button onClick={reset}
          style={{ padding: '10px 20px', background: '#FBBF24', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
          Try Again
        </button>
        <button onClick={() => window.location.href = '/'}
          style={{ padding: '10px 20px', background: '#f3f4f6', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          Go Home
        </button>
      </div>
    </div>
  )
}

// ── Next.js error.tsx template ────────────────────────────────
/*
// app/error.tsx
'use client'
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { logger.error('Next.js app error', { message: error.message, digest: error.digest }) }, [error])
  return <DefaultErrorFallback error={error} errorId={error.digest || ''} reset={reset} />
}
*/

// ── Global async error wrapper ────────────────────────────────
export async function tryCatch<T>(fn: () => Promise<T>, context?: string): Promise<[T, null] | [null, Error]> {
  try {
    return [await fn(), null]
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    logger.error(context || 'Async error', { message: error.message })
    return [null, error]
  }
}

// ── Typed custom errors ────────────────────────────────────────
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code:       string,
    public readonly statusCode: number = 500,
    public readonly context?:   Record<string, unknown>,
  ) {
    super(message)
    this.name = 'AppError'
    if (Error.captureStackTrace) Error.captureStackTrace(this, AppError)
  }
  toJSON() {
    return { error: this.message, code: this.code, statusCode: this.statusCode, context: this.context }
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(`${resource}${id ? ` '${id}'` : ''} not found`, 'NOT_FOUND', 404)
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 'UNAUTHORIZED', 401)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 'FORBIDDEN', 403)
    this.name = 'ForbiddenError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public readonly fields?: Record<string, string>) {
    super(message, 'VALIDATION_ERROR', 422)
    this.name = 'ValidationError'
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super('Too many requests', 'RATE_LIMITED', 429, { retryAfter })
    this.name = 'RateLimitError'
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(`${service}: ${message}`, 'EXTERNAL_SERVICE_ERROR', 502, { service })
    this.name = 'ExternalServiceError'
  }
}

// ── API route error handler ────────────────────────────────────
export function handleApiError(err: unknown): Response {
  if (err instanceof AppError) {
    logger.warn(`API Error [${err.code}]: ${err.message}`, err.context)
    return Response.json(err.toJSON(), { status: err.statusCode })
  }
  if (err instanceof Error) {
    logger.error('Unhandled API Error', { message: err.message, stack: err.stack })
    return Response.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
  return Response.json({ error: 'Unknown error', code: 'UNKNOWN' }, { status: 500 })
}

// ── withErrorHandler: wrap API route handlers ─────────────────
export function withErrorHandler<T extends any[]>(
  handler: (...args: T) => Promise<Response>
): (...args: T) => Promise<Response> {
  return async (...args: T): Promise<Response> => {
    try {
      return await handler(...args)
    } catch (err) {
      return handleApiError(err)
    }
  }
}

// ── Fetch with timeout and error handling ─────────────────────
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 10_000, ...fetchOpts } = options
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...fetchOpts, signal: controller.signal })
    if (!res.ok) throw new ExternalServiceError(new URL(url).hostname, `HTTP ${res.status}`)
    return res
  } catch (err: any) {
    if (err.name === 'AbortError') throw new ExternalServiceError(new URL(url).hostname, `Timeout after ${timeoutMs}ms`)
    throw err
  } finally {
    clearTimeout(timer)
  }
}

/*
──────────────────────────────────────────────────────────────
USAGE

// In API routes:
import { withErrorHandler, NotFoundError, ValidationError, handleApiError } from '@/blocks/errorhandling'

export const GET = withErrorHandler(async (req) => {
  const block = getBlock('missing-id')
  if (!block) throw new NotFoundError('Block', 'missing-id')
  return Response.json(block)
})

// tryCatch pattern:
const [data, err] = await tryCatch(() => fetchUser(id), 'fetchUser')
if (err) return handleApiError(err)

// Custom typed errors:
throw new ValidationError('Invalid input', { email: 'Already taken', name: 'Too short' })
throw new UnauthorizedError()
throw new ForbiddenError('Admin role required')
──────────────────────────────────────────────────────────────
*/
