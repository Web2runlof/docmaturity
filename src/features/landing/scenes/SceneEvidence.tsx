/**
 * Paso 02 · Evidencie y valide.
 * Lo percibido (mediana de las entrevistas) se contrasta con lo demostrado (evidencia E0–E3);
 * la discrepancia se señala y el evaluador decide con justificación, sin sobrescribir lo respondido.
 */
import { useId } from 'react';
import { Check, FileText, Lock } from 'lucide-react';
import { DARK as C, Ico, Panel, Pill, Txt } from './kit';
import { timeline } from './timeline';

const tl = timeline('se', 11);

const header = tl.enter(0, { y: 12 });
const left = tl.enter(0.5, { y: 12 });
const dots = [0.95, 1.08, 1.21, 1.34].map((t) => tl.enter(t, { s: 0.6 }));
const perceived = tl.enter(1.6, { y: 8 });
const right = tl.enter(0.8, { y: 12 });
const docs = [1.85, 2.35].map((t) => tl.enter(t, { x: 18 }));
const e1 = tl.enter(2.0, { o: 0 });
const e2 = tl.enter(2.8, { o: 0 });
const status1 = tl.window(2.0, 2.75);
const status2 = tl.enter(2.85, { y: 6 });
const links = [tl.draw(3.55, 96, 0.6), tl.draw(3.55, 96, 0.6)];
const badge = tl.enter(3.95, { s: 0.85 });
const ring = tl.k([[0, { o: 0, s: 1 }], [4.25, { o: 0, s: 1 }], [4.35, { o: 0.9, s: 1 }], [5.2, { o: 0, s: 1.35 }], [5.3, { o: 0, s: 1 }], [5.45, { o: 0.9, s: 1 }], [6.4, { o: 0, s: 1.35 }]], 'center');
const desk = tl.enter(4.6, { y: 14 });
const pick = tl.k([[0, { o: 0, x: 44 }], [5.0, { o: 0 }], [5.2, { o: 1 }], [5.6, { x: 44 }], [6.1, { x: 0 }], [tl.out[0], { o: 1 }], [tl.out[1], { o: 0 }]]);
const level = tl.enter(6.1, { x: -6 });
const justLabel = tl.enter(6.2, { o: 0 });
const typing = tl.grow(6.35, 'x', 1.3);
const kept = tl.enter(7.75, { y: 6 });
const recorded = tl.enter(8.05, { y: 6 });

export const SCENE_EVIDENCE_CSS = tl.css();

const LADDER = ['E0', 'E1', 'E2', 'E3'];

export function SceneEvidence({ viewBox = '0 0 560 620' }: { viewBox?: string }) {
  const clip = `se-type-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg viewBox={viewBox} className="sc-root block size-full" role="img" aria-label="Lo percibido en las entrevistas, mediana 4,00, se contrasta con la evidencia, revisada parcialmente. Se señala una discrepancia y el evaluador valida el nivel 3 con justificación; la respuesta original se conserva.">
      <defs>
        <clipPath id={clip}><rect x={60} y={458} width={272} height={20} className={typing} /></clipPath>
      </defs>

      {/* Criterio */}
      <Panel x={40} y={36} w={480} h={78} r={18} fill={C.glassHi} className={header}>
        <Txt x={60} y={63} size={11.5} fill={C.fog}>Criterio · D05 Archivística y documental</Txt>
        <Txt x={60} y={91} size={16.5} weight={600} display>Política de gestión documental aprobada</Txt>
      </Panel>

      {/* Lo percibido */}
      <Panel x={40} y={134} w={232} h={180} className={left}>
        <Txt x={60} y={162} size={13} weight={600} display>Lo percibido</Txt>
        <Txt x={60} y={180} size={11.5} fill={C.dim}>Mediana de cuatro entrevistas</Txt>
      </Panel>
      {['4', '4', '3', '4'].map((v, i) => (
        <g key={i} className={dots[i]}><Pill x={60 + i * 34} y={200} w={28} h={24} text={v} fill={C.violetSoft} stroke="rgba(142,120,247,0.45)" color={C.ink} size={12.5} /></g>
      ))}
      <g className={perceived}>
        <Txt x={60} y={290} size={38} weight={600} display>4,00</Txt>
        <Txt x={146} y={290} size={13} fill={C.dim}>/ 5</Txt>
      </g>

      {/* Lo demostrado */}
      <Panel x={288} y={134} w={232} h={180} className={right}>
        <Txt x={308} y={162} size={13} weight={600} display>Lo demostrado</Txt>
        <Txt x={308} y={180} size={11.5} fill={C.dim}>Estado de la evidencia</Txt>
        {LADDER.map((e, i) => (
          <g key={e}>
            <rect x={308 + i * 50} y={250} width={44} height={24} rx={7} fill={i === 0 ? 'rgba(255,255,255,0.07)' : 'none'} stroke={C.lineStrong} />
            <Txt x={330 + i * 50} y={266} size={11} weight={600} anchor="middle" fill={C.fog}>{e}</Txt>
          </g>
        ))}
      </Panel>
      {[['Acta de aprobación', 1.85], ['Política en borrador', 2.35]].map(([label], i) => (
        <g key={label as string} className={docs[i]}>
          <rect x={308} y={192 + i * 28 - 4} width={192} height={24} rx={8} fill="rgba(255,255,255,0.05)" stroke={C.line} />
          <Ico icon={FileText} x={316} y={192 + i * 28} size={14} color={C.mint} />
          <Txt x={336} y={204 + i * 28} size={11.5} fill={C.ink}>{label as string}</Txt>
        </g>
      ))}
      <g className={e1}><rect x={358} y={250} width={44} height={24} rx={7} fill="rgba(53,217,164,0.28)" stroke={C.mint} /><Txt x={380} y={266} size={11} weight={700} anchor="middle" fill={C.ink}>E1</Txt></g>
      <g className={e2}><rect x={408} y={250} width={44} height={24} rx={7} fill="rgba(53,217,164,0.5)" stroke={C.mint} /><Txt x={430} y={266} size={11} weight={700} anchor="middle" fill={C.midnight}>E2</Txt></g>
      <g className={`${status1} sc-transient`}><Txt x={308} y={297} size={11.5} fill={C.fog}>Reportada, no revisada</Txt></g>
      <g className={status2}><Txt x={308} y={297} size={11.5} fill={C.mint} weight={500}>Revisada parcialmente</Txt></g>

      {/* Discrepancia */}
      <path d="M156 314 V332 H218" fill="none" stroke={C.violet} strokeWidth={1.5} strokeDasharray={96} className={links[0]} />
      <path d="M404 314 V332 H342" fill="none" stroke={C.violet} strokeWidth={1.5} strokeDasharray={96} className={links[1]} />
      <g className={ring}><rect x={208} y={319} width={144} height={26} rx={13} fill="none" stroke={C.violet} strokeWidth={1.5} /></g>
      <g className={badge}><Pill x={208} y={319} w={144} h={26} text="Discrepancia · 1 nivel" fill="#2A2350" stroke={C.violet} color="#E4DEFF" size={11.5} /></g>

      {/* Mesa de validación */}
      <Panel x={40} y={358} w={480} h={142} r={18} fill={C.glassHi} className={desk}>
        <Txt x={60} y={384} size={13} weight={600} display>Mesa de validación</Txt>
        {[0, 1, 2, 3, 4, 5].map((v) => (
          <g key={v}>
            <rect x={60 + v * 44} y={398} width={38} height={34} rx={9} fill="none" stroke={C.lineStrong} />
            <Txt x={79 + v * 44} y={420} size={14} weight={600} anchor="middle" fill={C.fog}>{v}</Txt>
          </g>
        ))}
      </Panel>
      <g className={pick}>
        <rect x={192} y={398} width={38} height={34} rx={9} fill={C.mintSoft} stroke={C.mint} strokeWidth={1.5} />
        <Txt x={211} y={420} size={14} weight={700} anchor="middle" fill={C.ink}>3</Txt>
      </g>
      <g className={level}>
        <Txt x={336} y={412} size={11.5} fill={C.fog}>Nivel final</Txt>
        <Txt x={336} y={431} size={15} weight={600} fill={C.mint} display>3 · Definido</Txt>
      </g>
      <g className={justLabel}><Txt x={60} y={455} size={11} fill={C.dim}>Justificación</Txt></g>
      <g clipPath={`url(#${clip})`}><Txt x={60} y={474} size={12.5} fill={C.ink}>Aprobada; su publicación no se demuestra.</Txt></g>
      <g className={kept}>
        <Ico icon={Lock} x={336} y={451} size={13} color={C.fog} />
        <Txt x={355} y={462} size={11.5} fill={C.fog}>Lo respondido se conserva</Txt>
      </g>
      <g className={recorded}>
        <Ico icon={Check} x={336} y={473} size={13} color={C.mint} stroke={2.4} />
        <Txt x={355} y={484} size={11.5} fill={C.mint} weight={500}>Decisión registrada</Txt>
      </g>
    </svg>
  );
}
