import { Link } from 'react-router-dom'

export function Logo({ to = '/app', compact = false }: { to?: string; compact?: boolean }) {
  return (
    <Link to={to} className="flex items-center gap-2" aria-label="CVAurum home">
      <span
        className="relative inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-[9px] shadow-soft"
        style={{ background: 'linear-gradient(140deg,#8a5a12 0%,#d4982f 45%,#f7d774 100%)' }}
      >
        {/* subtle top highlight for a metallic feel */}
        <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2" style={{ background: 'linear-gradient(180deg,rgba(255,255,255,.35),transparent)' }} />
        {/* "A" monogram for Aurum */}
        <svg viewBox="0 0 24 24" className="relative h-[18px] w-[18px]" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6.5 18 12 6l5.5 12" />
          <path d="M8.7 13.6h6.6" />
        </svg>
      </span>
      {!compact && (
        <span className="text-base font-semibold tracking-tight">
          CV<span style={{ color: '#c8941f' }}>Aurum</span>
        </span>
      )}
    </Link>
  )
}
