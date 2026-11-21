/**
 * Vista del producto en la portada con los componentes reales de resultados (ECharts, indicadores,
 * escala y brechas) sobre datos ilustrativos simulados. Se carga de forma diferida al acercarse a la vista.
 */
import { useMemo } from 'react';
import { DIMENSIONS, QUESTIONS } from '@/data/bank';
import { EChart } from '@/components/charts/EChart';
import { LevelLegend } from '@/components/charts/LevelLegend';
import { radarOption } from '@/components/charts/options';
import { KPIStat, LevelTag, ProgressRing } from '@/components/ui';
import { DEFAULT_TARGET, LEVEL_COLORS, SOLIDITY_WEIGHTS } from '@/engine/constants';
import { TARGET_TERM } from '@/config/vocabulary';
import { fmtPct, fmtScore } from '@/utils/core';
import { ILLUSTRATIVE_DIMS } from './visuals';

const VALIDATED_OFFSET = [0.3, 0.3, 0.3, 0.3, 0.2, 0.3, 0.3, 0.5, 0.3, 0.3, 0.2, 0.2, 0.4, 0.3, 0.3];
const ILL = { coverage: 86, support: 41, agreement: 0.78 };
const GAPS = [
  { id: 'D11-Q01', level: 1 },
  { id: 'D03-Q02', level: 1.5 },
  { id: 'D14-Q12', level: 1.5 },
  { id: 'D06-Q07', level: 2 },
];

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export default function ProductShowcase() {
  const validated = useMemo(() => ILLUSTRATIVE_DIMS.map((v, i) => Math.round((v - VALIDATED_OFFSET[i]) * 100) / 100), []);
  const option = useMemo(
    () => radarOption(
      DIMENSIONS.map((d) => ({ name: d.id, full: d.name })),
      [
        { name: 'Percibida (preliminar)', values: ILLUSTRATIVE_DIMS, color: LEVEL_COLORS[3], area: true },
        { name: 'Validada', values: validated, color: LEVEL_COLORS[5] },
        { name: TARGET_TERM.capital, values: DIMENSIONS.map(() => DEFAULT_TARGET), color: '#C69B59', dashed: true },
      ],
    ),
    [validated],
  );
  const perceived = mean(ILLUSTRATIVE_DIMS);
  const val = mean(validated);
  const solidity = SOLIDITY_WEIGHTS.coverage * ILL.coverage + SOLIDITY_WEIGHTS.evidence * ILL.support + SOLIDITY_WEIGHTS.agreement * ILL.agreement * 100;
  const gaps = GAPS.map((g) => ({ ...g, q: QUESTIONS.find((q) => q.id === g.id) })).filter((g) => g.q);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-midnight shadow-[0_50px_120px_-40px_rgba(11,16,32,0.6)]">
      {/* Barra de la ventana: contexto de navegación como en la aplicación. */}
      <div className="flex items-center justify-between gap-4 px-5 py-3 text-xs text-fog">
        <span className="flex items-center gap-1.5" aria-hidden><span className="size-2.5 rounded-full bg-white/15" /><span className="size-2.5 rounded-full bg-white/15" /><span className="size-2.5 rounded-full bg-white/15" /></span>
        <span className="hidden truncate sm:block">Evaluaciones / Caso ilustrativo / <span className="text-white">Resultados</span></span>
        <span className="rounded-full border border-mint/40 px-2 py-0.5 text-[10.5px] font-medium text-mint">Datos ilustrativos</span>
      </div>
      <div className="bg-canvas p-4 md:p-6">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line lg:grid-cols-4">
          <KPIStat accent label="Madurez percibida" value={fmtScore(perceived)} hint={<LevelTag score={perceived} size="sm" />} />
          <KPIStat label="Madurez validada" value={fmtScore(val)} hint="Solo criterios revisados en la mesa de validación" />
          <KPIStat label="Cobertura del diagnóstico" value={fmtPct(ILL.coverage)} hint="Resultado parcial: entre 70 % y 90 %" />
          <KPIStat label="Índice orientativo de solidez" value={String(Math.round(solidity))} hint="Escala 0–100: 0,4·Cobertura + 0,4·Soporte + 0,2·(Acuerdo × 100)" />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          <figure className="panel m-0 p-4">
            <figcaption className="mb-1 flex items-baseline justify-between"><span className="text-sm font-semibold text-navy">Madurez por dimensión</span><span className="text-[11px] text-muted">Percibida frente a validada</span></figcaption>
            <EChart height={330} label="Radar ilustrativo de madurez percibida y validada por dimensión frente a la meta" option={option} table={{ columns: ['Dimensión', 'Percibida', 'Validada', 'Meta'], rows: DIMENSIONS.map((d, i) => [`${d.id} ${d.name}`, fmtScore(ILLUSTRATIVE_DIMS[i]), fmtScore(validated[i]), fmtScore(DEFAULT_TARGET)]) }} />
            <div className="mt-2"><LevelLegend /></div>
          </figure>

          <div className="grid gap-4">
            <div className="panel flex items-center gap-4 p-4">
              <ProgressRing value={ILL.support} size={72} stroke={7} label="Soporte de evidencias"><span className="text-sm font-semibold text-navy num">{Math.round(ILL.support)} %</span></ProgressRing>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-navy">Soporte de evidencias</p>
                <p className="mt-0.5 text-xs text-muted">Promedio del factor de evidencia (E0 = 0 · E1 = 0,25 · E2 = 0,6 · E3 = 1) en los criterios con respuesta.</p>
              </div>
            </div>
            <div className="panel p-4">
              <div className="flex items-baseline justify-between"><p className="text-sm font-semibold text-navy">Brechas prioritarias</p><p className="text-[11px] text-muted">{TARGET_TERM.capital} {fmtScore(DEFAULT_TARGET)}</p></div>
              <ol className="mt-3 divide-y divide-line">
                {gaps.map((g, i) => (
                  <li key={g.id} className="grid grid-cols-[18px_1fr_auto] items-start gap-3 py-2.5 text-sm">
                    <span className="pt-0.5 text-xs font-semibold text-muted num">{i + 1}</span>
                    <span className="min-w-0"><span className="block text-xs font-semibold text-mint-strong">{g.id}</span><span className="block leading-snug text-ink">{g.q?.criterion}</span></span>
                    <span className="text-right text-xs text-muted num">nivel {fmtScore(g.level)}<span className="block font-semibold text-navy">brecha {fmtScore(DEFAULT_TARGET - g.level)}</span></span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
