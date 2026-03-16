export default function Loading() {
  return (
    <div className="min-h-screen bg-base flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
        <p className="text-[var(--text-3)] text-sm">Loading…</p>
      </div>
    </div>
  )
}
