import { APP_NAME, APP_TAGLINE } from '@/config/vocabulary';

/**
 * Isotipo: tres estratos de capacidad que crecen como una escalera (documentos → información →
 * inteligencia). El estrato superior lleva el acento menta; el punto violeta marca la evidencia.
 */
export function Isotype({ size = 28, inverted = false }: { size?: number; inverted?: boolean }) {
  const base = inverted ? '#F8FAFC' : '#172033';
  const ghost = inverted ? 'rgba(255,255,255,0.18)' : '#DDE4EE';
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Isotipo de DOCMATURITY" focusable="false">
      <rect x="3" y="22" width="26" height="5" rx="1.4" fill={base} />
      <rect x="3" y="14.5" width="19" height="5" rx="1.4" fill={inverted ? '#AAB6C7' : '#5B6B82'} />
      <rect x="3" y="7" width="12" height="5" rx="1.4" fill="#35D9A4" />
      <rect x="24.5" y="14.5" width="4.5" height="5" rx="1.4" fill={ghost} />
      <circle cx="21" cy="9.5" r="2.4" fill="#8E78F7" />
    </svg>
  );
}

export function Logo({ inverted = false, compact = false, tagline = true }: { inverted?: boolean; compact?: boolean; tagline?: boolean }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2.5 whitespace-nowrap">
      <Isotype inverted={inverted} />
      {!compact && (
        <span className="leading-none">
          <span className={`block font-display text-[0.98rem] font-extrabold tracking-[0.08em] ${inverted ? 'text-white' : 'text-navy'}`}>{APP_NAME}</span>
          {tagline && <span className={`mt-1 block text-[0.62rem] tracking-[0.05em] ${inverted ? 'text-fog' : 'text-muted'}`}>{APP_TAGLINE}</span>}
        </span>
      )}
    </span>
  );
}
