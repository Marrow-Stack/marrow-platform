export function GuaranteeBadge({ large }: { large?: boolean }) {
  return (
    <div className={`inline-flex items-center gap-2.5 border rounded-xl ${large ? 'px-6 py-3' : 'px-3 py-2'}`}
      style={{ borderColor: 'rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.05)' }}>
      <span className={large ? 'text-2xl' : 'text-lg'}>🛡️</span>
      <div>
        <p className={`font-semibold leading-tight ${large ? 'text-base' : 'text-[13px]'}`} style={{ color: '#16A34A' }}>30-Day Guarantee</p>
        {large && <p className="text-[13px] mt-0.5" style={{ color: '#16A34A', opacity: 0.7 }}>Full refund if it doesn't work as described</p>}
      </div>
    </div>
  )
}
