/**
 * Visualizaciones propias de la portada (SVG y HTML ligeros). Todas usan datos ilustrativos
 * simulados y nombres reales del modelo; ninguna representa a una organización real.
 */
import { DIMENSIONS, LEVEL_NAMES, QUESTIONS } from '@/data/bank';
import { DEFAULT_TARGET, EVIDENCE_FACTOR, EVIDENCE_LABEL, LEVEL_COLORS, RISK_BAND_COLORS, RISK_BANDS } from '@/engine/constants';
import { levelIndex } from '@/engine/scoring';
import { MGDA_FAMILIES } from '@/config/vocabulary';
import { useParallax } from '@/components/motion';
import { fmtScore } from '@/utils/core';

/** Valores ilustrativos por dimensión (D01…D15) y por familia. */
export const ILLUSTRATIVE_DIMS = [2.6, 2.4, 1.8, 2.7, 2.1, 1.9, 2.5, 3.1, 2.2, 2.3, 1.1, 2.0, 2.4, 1.6, 2.2];
export const ILLUSTRATIVE_FAMILIES = [2.62, 1.9, 2.45, 1.38, 2.05];
const question = (id: string) => QUESTIONS.find((q) => q.id === id);

/** Composición del héroe: tres capas (dimensiones, brechas frente a la meta y trazabilidad). */
export function HeroVisual() {
  const back = useParallax<HTMLDivElement>(0.05);
  const front = useParallax<HTMLDivElement>(-0.04);
  const q = question('D11-Q01');
  return (
    <div className="relative mx-auto w-full max-w-[620px] xl:h-[650px]" role="img" aria-label="Vista ilustrativa con datos simulados: madurez por dimensión, brecha por familia frente a la meta y la trazabilidad de una brecha hasta su evidencia.">
      {/* Capa posterior: mapa de dimensiones. */}
      <div ref={back} className="relative z-0 hidden xl:absolute xl:top-0 xl:left-0 xl:block xl:w-[58%]">
        <div className="glass float-slower p-4">
          <div className="flex items-baseline justify-between"><p className="text-[10.5px] font-semibold tracking-[0.12em] text-mint uppercase">Madurez por dimensión</p><p className="text-[10px] text-fog">Ilustrativo</p></div>
          <ul className="mt-3 grid grid-cols-5 gap-1.5">
            {DIMENSIONS.map((d, i) => {
              const v = ILLUSTRATIVE_DIMS[i];
              return (
                <li key={d.id} className={`rounded-md border px-1.5 py-1.5 ${d.id === 'D11' ? 'border-mint/60 bg-mint/10' : 'border-white/8 bg-white/[0.03]'}`}>
                  <span className="block text-[10px] font-semibold text-white num">{d.id}</span>
                  <span className="mt-1 block h-1 rounded-full bg-white/10"><span className="block h-full rounded-full" style={{ width: `${(v / 5) * 100}%`, background: d.id === 'D11' ? '#35D9A4' : 'rgba(170,182,199,0.7)' }} /></span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Capa central: brecha por familia frente a la meta (superficie clara, como en la aplicación). */}
      <div className="relative z-10 rounded-2xl border border-white/60 bg-soft text-ink shadow-[0_40px_100px_-30px_rgba(0,0,0,0.85)] xl:absolute xl:top-[178px] xl:right-0 xl:w-[74%]">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <span className="text-xs font-semibold text-navy">Resultados · serie percibida</span>
          <span className="rounded-full bg-neutral px-2 py-0.5 text-[10px] text-muted">Datos ilustrativos</span>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 px-4 pt-4 pb-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-5">
          <div>
            <div className="flex items-baseline justify-between"><p className="text-[10.5px] font-semibold tracking-[0.08em] text-muted uppercase">Madurez por familia</p><p className="flex items-center gap-1.5 text-[10px] text-muted"><span className="inline-block h-3 w-[3px] rounded-sm bg-gold" aria-hidden />Meta {fmtScore(DEFAULT_TARGET)}</p></div>
            <ul className="mt-3 space-y-2.5">
              {MGDA_FAMILIES.map((f, i) => {
                const v = ILLUSTRATIVE_FAMILIES[i];
                return (
                  <li key={f.key} className="grid grid-cols-[minmax(0,118px)_1fr_32px] items-center gap-2.5 text-[11.5px] sm:grid-cols-[128px_1fr_32px]">
                    <span className="truncate text-ink">{f.title}</span>
                    <span className="relative h-2 rounded-sm bg-neutral">
                      <span className="absolute inset-y-0 left-0 rounded-sm" style={{ width: `${(v / 5) * 100}%`, background: LEVEL_COLORS[levelIndex(v)] }} />
                      <span className="absolute -top-1 -bottom-1 w-[3px] rounded-sm bg-gold" style={{ left: `calc(${(DEFAULT_TARGET / 5) * 100}% - 1px)` }} />
                    </span>
                    <span className="text-right font-medium num">{fmtScore(v)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="hidden w-[88px] flex-col items-center justify-center border-l border-line pl-4 text-center sm:flex">
            <Ring value={86} />
            <p className="mt-2 text-[10.5px] leading-tight text-muted">Cobertura del diagnóstico</p>
            <p className="text-[10.5px] font-medium text-mint-strong">Parcial</p>
          </div>
        </div>
      </div>

      {/* Capa frontal: trazabilidad de una brecha hasta su evidencia. */}
      <div ref={front} className="relative z-20 mt-4 xl:absolute xl:bottom-0 xl:left-[4%] xl:mt-0 xl:w-[58%]">
        <div className="glass float-slow p-4">
          <p className="text-[10.5px] font-semibold tracking-[0.12em] text-mint uppercase">Trazabilidad de una brecha</p>
          <ol className="relative mt-3 space-y-2.5 pl-5">
            <span className="absolute top-2 bottom-2 left-[5px] w-px bg-gradient-to-b from-mint via-white/30 to-violet" aria-hidden />
            {[
              { k: 'Dimensión', v: 'D11 · Preservación digital', dot: '#35D9A4' },
              { k: 'Criterio', v: `D11-Q01 · ${q?.criterion ?? ''}`, dot: '#AAB6C7', extra: `nivel ${fmtScore(1)} · brecha ${fmtScore(DEFAULT_TARGET - 1)}` },
              { k: 'Evidencia', v: `E2 · ${EVIDENCE_LABEL.E2}`, dot: '#8E78F7' },
            ].map((s) => (
              <li key={s.k} className="relative text-[11.5px]">
                <span className="absolute top-1 -left-5 size-[11px] rounded-full border-2 border-midnight" style={{ background: s.dot }} aria-hidden />
                <span className="block text-[10px] tracking-[0.08em] text-fog uppercase">{s.k}</span>
                <span className="block leading-snug font-medium text-white">{s.v}</span>
                {s.extra && <span className="block text-[10.5px] text-fog num">{s.extra}</span>}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function Ring({ value }: { value: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex size-[64px] items-center justify-center">
      <svg viewBox="0 0 64 64" className="size-full -rotate-90" aria-hidden><circle cx="32" cy="32" r={r} fill="none" stroke="#E9EEF4" strokeWidth="6" /><circle cx="32" cy="32" r={r} fill="none" stroke="#0E9F74" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} /></svg>
      <span className="absolute text-[13px] font-semibold text-navy num">{value} %</span>
    </span>
  );
}

/* ===== Mini visualizaciones de las etapas del ciclo ===== */

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export function StepVisual({ step }: { step: string }) {
  const common = { viewBox: '0 0 120 64', className: 'h-16 w-full text-navy', 'aria-hidden': true };
  switch (step) {
    case 'caracterizar':
      return <svg {...common}><rect x="14" y="30" width="22" height="26" rx="2" {...stroke} /><rect x="42" y="14" width="30" height="42" rx="2" {...stroke} /><rect x="78" y="24" width="26" height="32" rx="2" {...stroke} />{[20, 28, 36, 44].map((y) => <line key={y} x1="50" x2="64" y1={y} y2={y} {...stroke} opacity={0.45} />)}<circle cx="57" cy="9" r="3" fill="#35D9A4" /></svg>;
    case 'alcance':
      return <svg {...common}>{[16, 32, 48].map((y, i) => <g key={y}><line x1="14" x2="106" y1={y} y2={y} {...stroke} opacity={0.3} /><line x1="14" x2={[70, 44, 92][i]} y1={y} y2={y} stroke="#0E9F74" strokeWidth="2.5" strokeLinecap="round" /><circle cx={[70, 44, 92][i]} cy={y} r="4.5" fill="#fff" stroke="#172033" strokeWidth="1.5" /></g>)}</svg>;
    case 'entrevistar':
      return <svg {...common}>{[[18, 18], [44, 30], [70, 16], [96, 28]].map(([x, y], i) => <g key={i}><rect x={x - 12} y={y - 9} width="24" height="16" rx="5" {...stroke} /><text x={x} y={y + 2} textAnchor="middle" fontSize="7" fill="currentColor" fontFamily="Inter">P{i + 1}</text></g>)}<line x1="14" x2="106" y1="52" y2="52" {...stroke} opacity={0.3} /><circle cx="62" cy="52" r="4" fill="#35D9A4" /><text x="62" y="62" textAnchor="middle" fontSize="6.5" fill="currentColor" fontFamily="Inter" opacity="0.7">mediana</text></svg>;
    case 'validar':
      return <svg {...common}><rect x="20" y="14" width="30" height="8" rx="2" fill="#AAB6C7" /><rect x="20" y="28" width="22" height="8" rx="2" fill="#0E9F74" /><text x="56" y="21" fontSize="7" fill="currentColor" fontFamily="Inter">percibido</text><text x="48" y="35" fontSize="7" fill="currentColor" fontFamily="Inter">validado</text><path d="M20 46 h80" {...stroke} opacity={0.3} />{['E0', 'E1', 'E2', 'E3'].map((e, i) => <g key={e}><rect x={20 + i * 22} y={50} width="18" height="10" rx="2" fill={i >= 2 ? '#8E78F7' : 'none'} stroke="currentColor" strokeWidth="1" opacity={i >= 2 ? 0.9 : 0.5} /><text x={29 + i * 22} y={57.5} textAnchor="middle" fontSize="6" fill={i >= 2 ? '#fff' : 'currentColor'} fontFamily="Inter">{e}</text></g>)}</svg>;
    case 'analizar':
      return <svg {...common}>{[2.6, 1.9, 2.5, 1.4, 2.1].map((v, i) => <rect key={i} x={16 + i * 19} y={56 - v * 14} width="12" height={v * 14} rx="1.5" fill={LEVEL_COLORS[levelIndex(v)]} />)}<line x1="12" x2="110" y1={56 - DEFAULT_TARGET * 14} y2={56 - DEFAULT_TARGET * 14} stroke="#C69B59" strokeWidth="1.5" strokeDasharray="3 3" /><line x1="12" x2="110" y1="56" y2="56" {...stroke} opacity={0.4} /></svg>;
    default:
      return <svg {...common}>{[0, 1, 2, 3].map((p) => <g key={p}><text x="8" y={14 + p * 13} fontSize="6.5" fill="currentColor" fontFamily="Inter" opacity="0.7">F{p + 1}</text><rect x={22 + p * 20} y={8 + p * 13} width={30 + p * 6} height="7" rx="2" fill={['#172033', '#3D4A60', '#6B778A', '#9AA5B5'][p]} /></g>)}<path d="M52 12 q6 0 6 6 v1" {...stroke} opacity={0.6} /><path d="M78 25 q6 0 6 6 v1" {...stroke} opacity={0.6} /></svg>;
  }
}

/* ===== Mini visualizaciones de las capacidades ===== */

export function HeatStrip() {
  return (
    <div className="grid grid-cols-15 gap-[3px]" style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }} aria-hidden>
      {DIMENSIONS.map((d, i) => (
        <div key={d.id} className="flex flex-col gap-[3px]">
          {[0, 1, 2, 3].map((p) => {
            const v = Math.max(0, Math.min(5, ILLUSTRATIVE_DIMS[i] + [0.4, -0.3, 0.1, -0.6][p] * ((i % 3) + 1) * 0.5));
            return <span key={p} className="h-5 rounded-[3px]" style={{ background: LEVEL_COLORS[levelIndex(v)], opacity: 0.92 }} />;
          })}
          <span className="mt-1 text-center text-[9px] text-fog num">{d.id.slice(1)}</span>
        </div>
      ))}
    </div>
  );
}

export function MedianDots() {
  // Cuatro participantes responden 2, 3, 3 y 4: la mediana es 3.
  const dots = [{ v: 2, row: 0 }, { v: 3, row: 0 }, { v: 3, row: 1 }, { v: 4, row: 0 }];
  const x = (v: number) => 14 + v * 38;
  return (
    <svg viewBox="0 0 220 78" className="h-auto w-full max-w-[360px]" aria-hidden>
      <line x1="14" x2="204" y1="52" y2="52" stroke="rgba(255,255,255,0.18)" />
      {[0, 1, 2, 3, 4, 5].map((t) => <g key={t}><line x1={x(t)} x2={x(t)} y1="49" y2="55" stroke="rgba(255,255,255,0.25)" /><text x={x(t)} y="70" fontSize="9" fill="#AAB6C7" textAnchor="middle" fontFamily="Inter">{t}</text></g>)}
      <line x1={x(3)} x2={x(3)} y1="16" y2="55" stroke="#35D9A4" strokeWidth="2" />
      <text x={x(3) + 7} y="14" fontSize="9" fill="#35D9A4" fontFamily="Inter">mediana 3</text>
      {dots.map((d, i) => <circle key={i} cx={x(d.v) + (d.v === 3 ? -9 : 0)} cy={42 - d.row * 13} r="5" fill="#121A2A" stroke="#AAB6C7" strokeWidth="1.6" />)}
      <text x="14" y="14" fontSize="9" fill="#AAB6C7" fontFamily="Inter">P1–P4</text>
    </svg>
  );
}

export function EvidenceLadder() {
  const rows = (['E3', 'E2', 'E1', 'E0'] as const).map((k) => [k, EVIDENCE_LABEL[k], EVIDENCE_FACTOR[k]] as const);
  return (
    <ul className="space-y-2" aria-hidden>
      {rows.map(([k, t, f]) => (
        <li key={k} className="grid grid-cols-[26px_1fr_34px] items-center gap-x-2 text-[11px]">
          <span className="font-semibold text-white">{k}</span>
          <span className="relative h-1.5 rounded-full bg-white/10"><span className="absolute inset-y-0 left-0 rounded-full bg-violet" style={{ width: `${f * 100}%` }} /></span>
          <span className="text-right text-fog num">{fmtScore(f)}</span>
          <span className="col-start-2 col-end-4 text-[10px] text-fog">{t}</span>
        </li>
      ))}
    </ul>
  );
}

export function RiskGrid() {
  const band = (p: number, i: number) => { const v = (p + 1) * (i + 1); return RISK_BAND_COLORS[(RISK_BANDS.find((b) => v <= b.max) ?? RISK_BANDS[3]).key]; };
  const marks = new Set(['4-3', '3-2', '2-2', '1-3']);
  return (
    <div className="grid grid-cols-5 gap-[3px]" aria-hidden>
      {[4, 3, 2, 1, 0].flatMap((p) => [0, 1, 2, 3, 4].map((i) => (
        <span key={`${p}-${i}`} className="flex aspect-square items-center justify-center rounded-[3px]" style={{ background: band(p, i), opacity: marks.has(`${p}-${i}`) ? 1 : 0.3 }}>
          {marks.has(`${p}-${i}`) && <span className="size-1.5 rounded-full bg-white" />}
        </span>
      )))}
    </div>
  );
}

export function PhaseLanes() {
  const items = [[0, 0, 22], [0, 10, 30], [1, 22, 26], [1, 38, 30], [2, 46, 30], [3, 70, 28]];
  return (
    <svg viewBox="0 0 220 92" className="h-auto w-full max-w-[380px]" aria-hidden>
      {[0, 1, 2, 3].map((p) => <g key={p}><text x="0" y={16 + p * 20} fontSize="9" fill="#AAB6C7" fontFamily="Inter">Fase {p + 1}</text><line x1="40" x2="220" y1={12 + p * 20} y2={12 + p * 20} stroke="rgba(255,255,255,0.06)" /></g>)}
      {items.map(([p, x, w], i) => <rect key={i} x={40 + x * 1.9} y={6 + p * 20} width={w * 1.9} height="11" rx="3" fill={p === 0 ? '#35D9A4' : `rgba(170,182,199,${0.85 - p * 0.18})`} />)}
      <path d={`M${40 + 22 * 1.9} 12 C ${40 + 26 * 1.9} 12, ${40 + 18 * 1.9} 32, ${40 + 22 * 1.9 + 4} 32`} fill="none" stroke="#8E78F7" strokeWidth="1.5" />
    </svg>
  );
}

export function ExportChips() {
  return (
    <ul className="flex flex-wrap gap-2" aria-hidden>
      {[['PDF', 'Informe ejecutivo'], ['PDF', 'Informe técnico'], ['XLSX', 'Libro de análisis'], ['JSON', 'Paquete de evaluación'], ['JSON', 'Respaldo completo']].map(([t, l]) => (
        <li key={l} className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-white"><span className="rounded bg-mint/15 px-1 py-px text-[9.5px] font-semibold text-mint">{t}</span>{l}</li>
      ))}
    </ul>
  );
}

export function LevelScale({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  return (
    <ol className="grid grid-cols-6 gap-1" aria-label="Escala de madurez de 0 a 5">
      {LEVEL_NAMES.map((n, i) => (
        <li key={n} title={`${i} · ${n}`}>
          <span className="block h-1.5 rounded-sm" style={{ background: LEVEL_COLORS[i] }} />
          <span className={`mt-1.5 block text-[11px] font-semibold num ${dark ? 'text-white' : 'text-navy'}`}>{i}{compact && <span className="sr-only"> · {n}</span>}</span>
          {!compact && <span className={`block text-[10px] leading-tight ${dark ? 'text-fog' : 'text-muted'}`}>{n}</span>}
        </li>
      ))}
    </ol>
  );
}
