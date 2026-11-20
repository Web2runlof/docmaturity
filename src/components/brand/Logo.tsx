/** Isotipo original: capas documentales que progresan como una escalera de capacidades. */
export function Isotype({ size = 28, inverted = false }: { size?: number; inverted?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Isotipo de DOCMATURITY" focusable="false">
      <rect x="3" y="22" width="26" height="5" rx="1" fill={inverted ? '#FFFFFF' : '#142B3A'} />
      <rect x="3" y="14.5" width="19" height="5" rx="1" fill="#0D9488" />
      <rect x="3" y="7" width="12" height="5" rx="1" fill="#C69B59" />
      <rect x="17.5" y="7" width="3" height="5" rx="0.6" fill={inverted ? 'rgba(255,255,255,0.35)' : '#E2E8F0'} />
      <rect x="24.5" y="14.5" width="3" height="5" rx="0.6" fill={inverted ? 'rgba(255,255,255,0.35)' : '#E2E8F0'} />
    </svg>
  );
}

export function Logo({ inverted = false, compact = false }: { inverted?: boolean; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Isotype inverted={inverted} />
      {!compact && (
        <span className="leading-none">
          <span className={`block font-display text-[0.98rem] font-bold tracking-[0.06em] ${inverted ? 'text-white' : 'text-navy'}`}>DOCMATURITY</span>
          <span className={`mt-1 block text-[0.62rem] tracking-[0.08em] ${inverted ? 'text-slate-300' : 'text-muted'}`}>Records. Information. Intelligence.</span>
        </span>
      )}
    </span>
  );
}
