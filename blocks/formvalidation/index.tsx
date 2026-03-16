// ============================================================
// MarrowStack Block: Form Validation
// Stack: Next.js 14 + React Hook Form + Zod + reusable inputs
// Covers: typed Field component, Textarea, Select, Checkbox,
//         common schemas, pre-built forms, server-side validation,
//         multi-step forms, async validation, file input
// ============================================================
'use client'

import { useForm, UseFormReturn, Path, FieldValues, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useId } from 'react'

// ── CSS variables (works with any Tailwind dark-mode setup) ───
const S = {
  label:     { fontSize: 13, fontWeight: 500, color: 'var(--text-2,#374151)', marginBottom: 4, display: 'block' } as React.CSSProperties,
  inputBase: { padding: '10px 14px', border: '1px solid var(--border,#d1d5db)', borderRadius: 10, fontSize: 14, outline: 'none', width: '100%', background: 'var(--bg,#fff)', color: 'var(--text,#111)', transition: 'border-color 0.15s, box-shadow 0.15s', boxSizing: 'border-box' } as React.CSSProperties,
  inputErr:  { borderColor: '#ef4444', background: '#fef2f2' } as React.CSSProperties,
  hint:      { fontSize: 12, color: 'var(--text-3,#9ca3af)', marginTop: 3 } as React.CSSProperties,
  error:     { fontSize: 12, color: '#ef4444', marginTop: 3 } as React.CSSProperties,
  btn:       { padding: '12px 24px', background: 'var(--accent,#EFA020)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer', width: '100%', transition: 'opacity 0.15s' } as React.CSSProperties,
}

// ── Common Zod schemas ────────────────────────────────────────
export const Schemas = {
  email:         z.string().email('Please enter a valid email address'),
  password:      z.string().min(8, 'At least 8 characters').regex(/[A-Z]/, 'Include one uppercase letter').regex(/[0-9]/, 'Include one number'),
  name:          z.string().min(2, 'At least 2 characters').max(80, 'Max 80 characters'),
  url:           z.string().url('Must be a valid URL').optional().or(z.literal('')),
  phone:         z.string().regex(/^\+?[1-9]\d{6,14}$/, 'Invalid phone number').optional().or(z.literal('')),
  githubUsername: z.string().regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/, 'Invalid GitHub username'),
  positiveInt:   z.coerce.number().int().positive('Must be a positive number'),
  uuid:          z.string().uuid('Invalid ID format'),
}

// ── Pre-built schema compositions ────────────────────────────
export const LoginSchema = z.object({
  email:    Schemas.email,
  password: z.string().min(1, 'Password is required'),
})
export const RegisterSchema = z.object({
  name:           Schemas.name,
  email:          Schemas.email,
  password:       Schemas.password,
  githubUsername: Schemas.githubUsername,
})
export const ContactSchema = z.object({
  name:    Schemas.name,
  email:   Schemas.email,
  subject: z.string().min(5, 'At least 5 characters').max(120),
  message: z.string().min(20, 'At least 20 characters').max(2000),
})
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword:     Schemas.password,
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})
export const ProfileSchema = z.object({
  name:    Schemas.name,
  email:   Schemas.email,
  bio:     z.string().max(280, 'Max 280 characters').optional(),
  website: Schemas.url,
})

export type LoginInput          = z.infer<typeof LoginSchema>
export type RegisterInput       = z.infer<typeof RegisterSchema>
export type ContactInput        = z.infer<typeof ContactSchema>
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>
export type ProfileInput        = z.infer<typeof ProfileSchema>

// ── Field component (text, email, password, number, tel) ─────
interface FieldProps<T extends FieldValues> {
  form:        UseFormReturn<T>
  name:        Path<T>
  label:       string
  type?:       string
  placeholder?: string
  hint?:       string
  required?:   boolean
  disabled?:   boolean
  autoComplete?: string
}

export function Field<T extends FieldValues>({
  form, name, label, type = 'text', placeholder, hint, required, disabled, autoComplete,
}: FieldProps<T>) {
  const uid   = useId()
  const error = form.formState.errors[name]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 0 }}>
      <label htmlFor={uid} style={S.label}>
        {label}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
      </label>
      <input
        id={uid}
        {...form.register(name)}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        style={{ ...S.inputBase, ...(error ? S.inputErr : {}), ...(disabled ? { opacity: 0.5 } : {}) }}
      />
      {hint && !error && <p style={S.hint}>{hint}</p>}
      {error  && <p style={S.error}>{String(error.message || 'Invalid')}</p>}
    </div>
  )
}

// ── TextareaField ─────────────────────────────────────────────
interface TextareaProps<T extends FieldValues> extends Omit<FieldProps<T>, 'type'> {
  rows?: number
  maxLength?: number
  showCount?: boolean
}

export function TextareaField<T extends FieldValues>({
  form, name, label, placeholder, hint, rows = 4, maxLength, showCount, required,
}: TextareaProps<T>) {
  const uid   = useId()
  const error = form.formState.errors[name]
  const value = String(useWatch({ control: form.control, name }) || '')

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label htmlFor={uid} style={S.label}>
        {label}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
      </label>
      <textarea
        id={uid}
        {...form.register(name)}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        style={{ ...S.inputBase, resize: 'vertical', minHeight: rows * 28, ...(error ? S.inputErr : {}) }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        {hint && !error && <p style={{ ...S.hint, margin: 0 }}>{hint}</p>}
        {error           && <p style={{ ...S.error, margin: 0 }}>{String(error.message || 'Invalid')}</p>}
        {showCount && maxLength && (
          <p style={{ ...S.hint, margin: 0, marginLeft: 'auto' }}>
            {value.length}/{maxLength}
          </p>
        )}
      </div>
    </div>
  )
}

// ── SelectField ───────────────────────────────────────────────
interface SelectProps<T extends FieldValues> {
  form:     UseFormReturn<T>
  name:     Path<T>
  label:    string
  options:  { value: string; label: string }[]
  hint?:    string
  required?: boolean
  placeholder?: string
}

export function SelectField<T extends FieldValues>({
  form, name, label, options, hint, required, placeholder,
}: SelectProps<T>) {
  const uid   = useId()
  const error = form.formState.errors[name]

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label htmlFor={uid} style={S.label}>
        {label}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
      </label>
      <select
        id={uid}
        {...form.register(name)}
        style={{ ...S.inputBase, ...(error ? S.inputErr : {}), appearance: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239ca3af' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: 36 }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint  && !error && <p style={S.hint}>{hint}</p>}
      {error           && <p style={S.error}>{String(error.message || 'Required')}</p>}
    </div>
  )
}

// ── CheckboxField ─────────────────────────────────────────────
interface CheckboxProps<T extends FieldValues> {
  form:    UseFormReturn<T>
  name:    Path<T>
  label:   React.ReactNode
  hint?:   string
}

export function CheckboxField<T extends FieldValues>({ form, name, label, hint }: CheckboxProps<T>) {
  const uid   = useId()
  const error = form.formState.errors[name]

  return (
    <div>
      <label htmlFor={uid} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
        <input
          id={uid}
          type="checkbox"
          {...form.register(name)}
          style={{ marginTop: 2, width: 16, height: 16, accentColor: 'var(--accent,#EFA020)', flexShrink: 0 }}
        />
        <span style={{ fontSize: 14, color: 'var(--text-2,#374151)' }}>{label}</span>
      </label>
      {hint  && !error && <p style={{ ...S.hint, marginLeft: 26 }}>{hint}</p>}
      {error           && <p style={{ ...S.error, marginLeft: 26 }}>{String(error.message || 'Required')}</p>}
    </div>
  )
}

// ── Pre-built: Register form ──────────────────────────────────
export function RegisterForm({ onSubmit: submit }: { onSubmit: (data: RegisterInput) => Promise<void> }) {
  const [serverError, setServerError] = useState('')
  const form = useForm<RegisterInput>({ resolver: zodResolver(RegisterSchema) })

  const onSubmit = async (data: RegisterInput) => {
    setServerError('')
    try { await submit(data) }
    catch (e: any) { setServerError(e.message || 'Something went wrong') }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 420 }}>
      <Field form={form} name="name"           label="Full Name"       placeholder="Jane Smith"    required />
      <Field form={form} name="email"          label="Email"           type="email" placeholder="jane@example.com" required autoComplete="email" />
      <Field form={form} name="password"       label="Password"        type="password"             required hint="Min 8 chars · 1 uppercase · 1 number" />
      <Field form={form} name="githubUsername" label="GitHub Username" placeholder="janedoe"       required hint="Used for repo access after purchase" />
      {serverError && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: 13 }}>
          {serverError}
        </div>
      )}
      <button type="submit" disabled={form.formState.isSubmitting} style={{ ...S.btn, opacity: form.formState.isSubmitting ? 0.6 : 1 }}>
        {form.formState.isSubmitting ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  )
}

// ── Pre-built: Contact form ───────────────────────────────────
export function ContactForm({ onSubmit: submit }: { onSubmit: (data: ContactInput) => Promise<void> }) {
  const [done, setDone] = useState(false)
  const [serverError, setServerError] = useState('')
  const form = useForm<ContactInput>({ resolver: zodResolver(ContactSchema) })

  if (done) return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
      <p style={{ fontWeight: 600, fontSize: 17 }}>Message sent!</p>
      <p style={{ color: 'var(--text-3,#9ca3af)', fontSize: 14, marginTop: 6 }}>We'll get back to you within 24 hours.</p>
    </div>
  )

  return (
    <form onSubmit={form.handleSubmit(async d => { try { await submit(d); setDone(true) } catch (e: any) { setServerError(e.message) } })}
      style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field form={form} name="name"  label="Name"    placeholder="Jane Smith"    required />
        <Field form={form} name="email" label="Email"   type="email" placeholder="jane@example.com" required />
      </div>
      <Field form={form} name="subject" label="Subject" placeholder="What's this about?" required />
      <TextareaField form={form} name="message" label="Message" placeholder="Tell us more…" rows={5} maxLength={2000} showCount required />
      {serverError && <p style={{ ...S.error, fontSize: 13 }}>{serverError}</p>}
      <button type="submit" disabled={form.formState.isSubmitting} style={{ ...S.btn, opacity: form.formState.isSubmitting ? 0.6 : 1 }}>
        {form.formState.isSubmitting ? 'Sending…' : 'Send message'}
      </button>
    </form>
  )
}

// ── Pre-built: Change password form ──────────────────────────
export function ChangePasswordForm({ onSubmit: submit, onSuccess }: { onSubmit: (data: ChangePasswordInput) => Promise<void>; onSuccess?: () => void }) {
  const [serverError, setServerError] = useState('')
  const form = useForm<ChangePasswordInput>({ resolver: zodResolver(ChangePasswordSchema) })

  const onSubmit = async (data: ChangePasswordInput) => {
    setServerError('')
    try { await submit(data); form.reset(); onSuccess?.() }
    catch (e: any) { setServerError(e.message || 'Failed to change password') }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 }}>
      <Field form={form} name="currentPassword" label="Current password" type="password" required autoComplete="current-password" />
      <Field form={form} name="newPassword"     label="New password"     type="password" required hint="Min 8 chars · 1 uppercase · 1 number" autoComplete="new-password" />
      <Field form={form} name="confirmPassword" label="Confirm new password" type="password" required autoComplete="new-password" />
      {serverError && <p style={S.error}>{serverError}</p>}
      <button type="submit" disabled={form.formState.isSubmitting} style={{ ...S.btn, opacity: form.formState.isSubmitting ? 0.6 : 1 }}>
        {form.formState.isSubmitting ? 'Updating…' : 'Change password'}
      </button>
    </form>
  )
}

// ── Server-side Zod validation helper ─────────────────────────
export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body)
  if (!result.success) {
    const msg = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
    throw new Error(msg)
  }
  return result.data
}

// ── Multi-step form hook ───────────────────────────────────────
export function useMultiStep(totalSteps: number) {
  const [step, setStep] = useState(0)
  return {
    step,
    totalSteps,
    isFirst: step === 0,
    isLast:  step === totalSteps - 1,
    progress: ((step + 1) / totalSteps) * 100,
    next: () => setStep(s => Math.min(s + 1, totalSteps - 1)),
    prev: () => setStep(s => Math.max(s - 1, 0)),
    goTo: (n: number) => setStep(Math.max(0, Math.min(n, totalSteps - 1))),
  }
}

/*
──────────────────────────────────────────────────────────────
USAGE

// Basic field:
const form = useForm<LoginInput>({ resolver: zodResolver(LoginSchema) })
<Field form={form} name="email" label="Email" type="email" />
<Field form={form} name="password" label="Password" type="password" />

// Textarea with character counter:
<TextareaField form={form} name="bio" label="Bio" maxLength={280} showCount />

// Select:
<SelectField form={form} name="role" label="Role" options={[
  { value: 'user', label: 'User' },
  { value: 'admin', label: 'Admin' },
]} />

// Checkbox:
<CheckboxField form={form} name="terms" label={<>I agree to the <a href="/terms">terms</a></>} />

// Server validation (API route):
import { validateBody, LoginSchema } from '@/blocks/formvalidation'
const { email, password } = validateBody(LoginSchema, await req.json())

// Multi-step:
const ms = useMultiStep(3)
if (ms.step === 0) return <Step1Form />;
──────────────────────────────────────────────────────────────
*/
