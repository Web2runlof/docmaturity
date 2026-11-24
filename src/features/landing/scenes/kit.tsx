/** Piezas comunes de las escenas animadas (SVG). */
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/** Paleta de las escenas oscuras (sección «Cómo funciona»). */
export const DARK = {
  ink: '#EAF0F8',
  fog: '#9AA8BC',
  dim: '#66748A',
  line: 'rgba(255,255,255,0.10)',
  lineStrong: 'rgba(255,255,255,0.18)',
  glass: 'rgba(255,255,255,0.035)',
  glassHi: 'rgba(255,255,255,0.06)',
  mint: '#35D9A4',
  mintSoft: 'rgba(53,217,164,0.16)',
  violet: '#8E78F7',
  violetSoft: 'rgba(142,120,247,0.18)',
  gold: '#C69B59',
  midnight: '#0B1020',
} as const;

/** Paleta de la escena clara (sección de privacidad). */
export const LIGHT = {
  ink: '#172033',
  muted: '#5B6B82',
  dim: '#8C99AC',
  line: '#E1E7EF',
  soft: '#F1F4F8',
  white: '#FFFFFF',
  mint: '#35D9A4',
  mintStrong: '#0B7A58',
  mintSoft: '#E7FAF2',
  violet: '#8E78F7',
  violetSoft: '#F0EDFE',
  midnight: '#0B1020',
} as const;

export function Panel({ x, y, w, h, r = 16, fill = DARK.glass, stroke = DARK.line, className, children }: { x: number; y: number; w: number; h: number; r?: number; fill?: string; stroke?: string; className?: string; children?: ReactNode }) {
  return (
    <g className={className}>
      <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} stroke={stroke} />
      {children}
    </g>
  );
}

type TextProps = { x: number; y: number; size?: number; weight?: number; fill?: string; anchor?: 'start' | 'middle' | 'end'; display?: boolean; className?: string; children: ReactNode };

/** Texto con la tipografía del sitio. `display` usa Inter Tight. */
export function Txt({ x, y, size = 13, weight = 400, fill = DARK.ink, anchor = 'start', display = false, className, children }: TextProps) {
  return (
    <text x={x} y={y} fontSize={size} fontWeight={weight} fill={fill} textAnchor={anchor} className={className} style={{ fontFamily: display ? 'var(--font-display)' : 'var(--font-sans)', fontFeatureSettings: '"tnum" 1' }}>
      {children}
    </text>
  );
}

/** Ícono de lucide dentro del SVG, posicionado por su esquina superior izquierda. */
export function Ico({ icon: I, x, y, size = 16, color, stroke = 1.8 }: { icon: LucideIcon; x: number; y: number; size?: number; color: string; stroke?: number }) {
  return <I x={x} y={y} width={size} height={size} color={color} strokeWidth={stroke} aria-hidden />;
}

/** Píldora con texto centrado. */
export function Pill({ x, y, w, h = 24, text, fill, stroke, color, size = 12, weight = 600, r }: { x: number; y: number; w: number; h?: number; text: ReactNode; fill: string; stroke?: string; color: string; size?: number; weight?: number; r?: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={r ?? h / 2} fill={fill} stroke={stroke ?? 'none'} />
      <Txt x={x + w / 2} y={y + h / 2 + size * 0.36} size={size} weight={weight} fill={color} anchor="middle">{text}</Txt>
    </g>
  );
}
