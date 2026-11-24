/**
 * Paso 03 · Analice y priorice.
 * Madurez por dimensión frente a la meta (la distancia es la brecha); prioridad explicada por cinco
 * factores, que reordena las iniciativas; hoja de ruta por fases con dependencias e informes.
 */
import { FileText } from 'lucide-react';
import { DARK as C, Ico, Panel, Txt } from './kit';
import { timeline } from './timeline';

const tl = timeline('sp', 13.5);

const BAR = { x0: 180, unit: 64 };
const bx = (v: number) => BAR.x0 + BAR.unit * v;
const DIMS = [
  { name: 'Estratégica', cur: 2.6, goal: 4 },
  { name: 'Gobernanza', cur: 1.9, goal: 3.5 },
  { name: 'Archivística', cur: 3.1, goal: 4 },
  { name: 'Electrónicos', cur: 2.2, goal: 3.5 },
  { name: 'Seguridad', cur: 2.8, goal: 4 },
];
const ROW0 = 92;
const ROW_H = 24;

/** Pesos de la prioridad: brecha, impacto, criticidad, urgencia y habilitador. */
const FACTORS = [
  { name: 'Brecha', w: 0.3, color: '#35D9A4' },
  { name: 'Impacto', w: 0.25, color: '#1FA57C' },
  { name: 'Criticidad', w: 0.2, color: '#8E78F7' },
  { name: 'Urgencia', w: 0.15, color: '#B9ACFB' },
  { name: 'Habilitador', w: 0.1, color: '#C69B59' },
];
/* Iniciativas en su orden final (por prioridad) y el lugar desde el que llegan. */
const INITIATIVES = [
  { code: 'INI-01', name: 'Formalizar la política', score: '4,2', v: 4.2, from: 2 },
  { code: 'INI-02', name: 'Actualizar tablas de retención', score: '3,6', v: 3.6, from: 0 },
  { code: 'INI-03', name: 'Plan de preservación digital', score: '2,9', v: 2.9, from: 1 },
];
const PRI = { y0: 302, h: 25, barX: 300, barW: 150 };
const GANTT = { x0: 180, col: 80, y0: 452, h: 19 };
const SPANS = [[0.05, 0.95], [1.1, 2.4], [2.55, 3.95]] as const;

/* Tiempos */
const top = tl.enter(0, { y: 12 });
const bars = DIMS.map((_, i) => tl.grow(0.5 + i * 0.14, 'x', 0.9));
const goals = DIMS.map((_, i) => tl.enter(1.55 + i * 0.08, { sy: 0 }, 0.4, 'center'));
const gaps = DIMS.map((_, i) => tl.grow(2.15 + i * 0.08, 'x', 0.6));
const legend = tl.enter(1.4, { o: 0 });
const mid = tl.enter(3.0, { y: 12 });
const rows = INITIATIVES.map((it, i) => {
  const off = (it.from - i) * PRI.h;
  const t = 3.3 + it.from * 0.15;
  return tl.k([[0, { o: 0, y: off + 8 }], [t, { o: 0, y: off + 8 }], [t + 0.5, { o: 1, y: off }], [5.4, { y: off }], [6.15, { y: 0 }], [tl.out[0], { o: 1 }], [tl.out[1], { o: 0 }]]);
});
const scores = INITIATIVES.map((it) => tl.grow(3.6 + it.from * 0.15, 'x', 0.85));
const ranks = INITIATIVES.map((_, i) => tl.enter(6.2 + i * 0.08, { s: 0.6 }));
const factorLegend = tl.enter(3.4, { o: 0 });
const bottom = tl.enter(6.55, { y: 12 });
const ganttBars = SPANS.map((_, i) => tl.grow(6.95 + i * 0.4, 'x', 0.6));
const deps = [tl.draw(7.6, 40, 0.4), tl.draw(8.0, 40, 0.4)];
const reports = [tl.enter(8.6, { y: 8 }), tl.enter(8.8, { y: 8 })];

export const SCENE_PRIORITY_CSS = tl.css();

export function ScenePriority({ viewBox = '0 0 560 620' }: { viewBox?: string }) {
  return (
    <svg viewBox={viewBox} className="sc-root block size-full" role="img" aria-label="Barras de madurez por dimensión frente a la meta, con la brecha resaltada; tres iniciativas se reordenan por su prioridad de cinco factores y se ubican en la hoja de ruta por fases, con dependencias e informes ejecutivo y técnico.">
      {/* Madurez frente a la meta */}
      <Panel x={40} y={36} w={480} h={180} r={18} fill={C.glassHi} className={top}>
        <Txt x={60} y={63} size={13} weight={600} display>Madurez por dimensión</Txt>
        {DIMS.map((d, i) => (
          <g key={d.name}>
            <Txt x={60} y={ROW0 + i * ROW_H + 4} size={12} fill={C.fog}>{d.name}</Txt>
            <rect x={BAR.x0} y={ROW0 + i * ROW_H - 5} width={BAR.unit * 5} height={10} rx={5} fill="rgba(255,255,255,0.05)" />
          </g>
        ))}
      </Panel>
      <g className={legend}>
        {[['Actual', C.mint], ['Meta', C.gold], ['Brecha', C.violet]].map(([label, color], i) => (
          <g key={label}>
            <rect x={334 + i * 56} y={54} width={10} height={10} rx={3} fill={color} opacity={label === 'Brecha' ? 0.55 : 1} />
            <Txt x={348 + i * 56} y={63} size={11} fill={C.fog}>{label}</Txt>
          </g>
        ))}
      </g>
      {DIMS.map((d, i) => {
        const y = ROW0 + i * ROW_H - 5;
        return (
          <g key={d.name}>
            <g className={gaps[i]}><rect x={bx(d.cur)} y={y} width={bx(d.goal) - bx(d.cur)} height={10} rx={5} fill="rgba(142,120,247,0.35)" stroke="rgba(142,120,247,0.6)" strokeDasharray="3 3" /></g>
            <g className={bars[i]}><rect x={BAR.x0} y={y} width={bx(d.cur) - BAR.x0} height={10} rx={5} fill={C.mint} /></g>
            <g className={goals[i]}><rect x={bx(d.goal) - 1.5} y={y - 4} width={3} height={18} rx={1.5} fill={C.gold} /></g>
          </g>
        );
      })}

      {/* Prioridad explicada */}
      <Panel x={40} y={228} w={480} h={146} r={18} className={mid}>
        <Txt x={60} y={254} size={13} weight={600} display>Prioridad explicada</Txt>
        <Txt x={500} y={254} size={11} fill={C.dim} anchor="end">Puntaje 0–5</Txt>
      </Panel>
      <g className={factorLegend}>
        {FACTORS.map((f, i) => {
          const x = [64, 120, 182, 262, 330][i];
          return (
            <g key={f.name}>
              <circle cx={x} cy={273} r={3.5} fill={f.color} />
              <Txt x={x + 8} y={277} size={10.5} fill={C.fog}>{f.name}</Txt>
            </g>
          );
        })}
      </g>
      {INITIATIVES.map((it, i) => {
        const y = PRI.y0 + i * PRI.h;
        const total = (PRI.barW * it.v) / 5;
        let acc = PRI.barX;
        return (
          <g key={it.code} className={rows[i]}>
            <Txt x={84} y={y + 4} size={12.5} weight={500}>{it.name}</Txt>
            <g className={scores[i]}>
              {FACTORS.map((f) => {
                const w = total * f.w;
                const r = <rect key={f.name} x={acc} y={y - 5} width={Math.max(0, w - 2)} height={10} rx={2.5} fill={f.color} />;
                acc += w;
                return r;
              })}
            </g>
            <Txt x={500} y={y + 4.5} size={13} weight={600} anchor="end" display>{it.score}</Txt>
          </g>
        );
      })}
      {INITIATIVES.map((it, i) => (
        <g key={`r${it.code}`} className={ranks[i]}>
          <circle cx={68} cy={PRI.y0 + i * PRI.h} r={9} fill={i === 0 ? C.mint : 'rgba(255,255,255,0.08)'} />
          <Txt x={68} y={PRI.y0 + i * PRI.h + 4} size={10.5} weight={700} anchor="middle" fill={i === 0 ? C.midnight : C.ink}>{i + 1}</Txt>
        </g>
      ))}

      {/* Hoja de ruta */}
      <Panel x={40} y={386} w={480} h={114} r={18} fill={C.glassHi} className={bottom}>
        <Txt x={60} y={411} size={13} weight={600} display>Hoja de ruta</Txt>
        {[1, 2, 3, 4].map((f, i) => (
          <g key={f}>
            <line x1={GANTT.x0 + i * GANTT.col} x2={GANTT.x0 + i * GANTT.col} y1={426} y2={494} stroke={C.line} />
            <Txt x={GANTT.x0 + i * GANTT.col + 8} y={437} size={10.5} fill={C.dim}>Fase {f}</Txt>
          </g>
        ))}
        {INITIATIVES.map((it, i) => <Txt key={it.code} x={60} y={GANTT.y0 + i * GANTT.h + 4} size={11.5} fill={C.fog}>{it.code}</Txt>)}
      </Panel>
      {SPANS.map(([a, b], i) => (
        <g key={a} className={ganttBars[i]}>
          <rect x={GANTT.x0 + a * GANTT.col} y={GANTT.y0 + i * GANTT.h - 6} width={(b - a) * GANTT.col} height={12} rx={6} fill={i === 0 ? C.mint : i === 1 ? '#1FA57C' : C.violet} />
        </g>
      ))}
      <path d={`M${GANTT.x0 + SPANS[0][1] * GANTT.col} ${GANTT.y0} h7 v${GANTT.h} h${(SPANS[1][0] - SPANS[0][1]) * GANTT.col - 7}`} fill="none" stroke={C.fog} strokeWidth={1.3} strokeDasharray={40} className={deps[0]} />
      <path d={`M${GANTT.x0 + SPANS[1][1] * GANTT.col} ${GANTT.y0 + GANTT.h} h7 v${GANTT.h} h${(SPANS[2][0] - SPANS[1][1]) * GANTT.col - 7}`} fill="none" stroke={C.fog} strokeWidth={1.3} strokeDasharray={40} className={deps[1]} />
      {[['Informe ejecutivo', 232, 136], ['Informe técnico', 376, 124]].map(([label, x, w], i) => (
        <g key={label as string} className={reports[i]}>
          <rect x={x as number} y={394} width={w as number} height={24} rx={12} fill="rgba(53,217,164,0.12)" stroke="rgba(53,217,164,0.45)" />
          <Ico icon={FileText} x={(x as number) + 10} y={399} size={13} color={C.mint} />
          <Txt x={(x as number) + 28} y={410} size={11} weight={500} fill={C.ink}>{label as string}</Txt>
        </g>
      ))}
    </svg>
  );
}
