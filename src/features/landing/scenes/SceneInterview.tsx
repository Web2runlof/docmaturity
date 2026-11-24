/**
 * Paso 01 · Caracterice y entreviste.
 * La organización elige la modalidad; las entrevistas viajan por archivo a cada perfil, se responden
 * sin conexión y sus respuestas se consolidan por mediana. «No sabe» se aparta: no cuenta como cero.
 */
import { Building2, WifiOff } from 'lucide-react';
import { DARK as C, Ico, Panel, Pill, Txt } from './kit';
import { timeline } from './timeline';

const tl = timeline('si', 12.5);

const PROFILES = [
  { x: 40, ini: 'AD', name: ['Alta', 'dirección'], answer: '3', progress: 1.5 },
  { x: 164, ini: 'GD', name: ['Gestión', 'documental'], answer: '4', progress: 2.1 },
  { x: 288, ini: 'JU', name: ['Jurídica'], answer: 'No sabe', progress: 1.3 },
  { x: 412, ini: 'TI', name: ['Tecnología'], answer: '3', progress: 1.8 },
] as const;

const CARD_W = 108;
const TRUNK = { x: 280, y0: 162, y1: 196 };
const CARD_TOP = 224;

/* Tiempos */
const card = tl.enter(0, { y: 14 });
const chips = [0.45, 0.55, 0.65].map((t) => tl.enter(t, { y: 6 }));
const highlight = tl.k([[0, { o: 0, x: -72, sx: 0.84 }], [0.9, { o: 0 }], [1.15, { o: 1 }], [1.5, { x: -72, sx: 0.84 }], [2.0, { x: 0, sx: 1 }], [tl.out[0], { o: 1 }], [tl.out[1], { o: 0 }]], 'left center');
const applicable = tl.enter(2.05, { x: 8 });

const branches = PROFILES.map((p, i) => {
  const cx = p.x + CARD_W / 2;
  const h = Math.abs(cx - TRUNK.x);
  const len = TRUNK.y1 - TRUNK.y0 + h + (CARD_TOP - TRUNK.y1);
  const d = `M${TRUNK.x} ${TRUNK.y0} V${TRUNK.y1} H${cx} V${CARD_TOP}`;
  const t0 = 2.45 + i * 0.14;
  const travel = 0.85;
  const at = (dist: number) => t0 + (travel * dist) / len;
  const arrive = t0 + travel;
  const p0 = TRUNK.y1 - TRUNK.y0;
  return {
    d,
    len,
    line: tl.draw(2.2 + i * 0.05, len, 0.75),
    file: tl.path([[t0, TRUNK.x, TRUNK.y0], [at(p0), TRUNK.x, TRUNK.y1], [at(p0 + h), cx, TRUNK.y1], [arrive, cx, CARD_TOP]], 0.2),
    card: tl.enter(arrive - 0.05, { y: 10, s: 0.96 }),
    offline: tl.enter(arrive + 0.45, { o: 0 }),
    bar: tl.grow(arrive + 0.55, 'x', p.progress),
    answer: tl.enter(arrive + 0.6 + p.progress, { s: 0.7 }),
    arrive,
  };
});

const panel = tl.enter(5.6, { y: 12 });
const slot = tl.enter(5.95, { o: 0 });
const SCALE = { x0: 60, unit: 68, y: 456 };
const sx = (v: number) => SCALE.x0 + SCALE.unit * v;
/* Puntos que caen desde las fichas a la escala: desde la respuesta de cada perfil hasta su valor. */
const drops = [
  { from: [68, 341], to: [sx(3), SCALE.y], t: 6.25 },
  { from: [192, 341], to: [sx(4), SCALE.y], t: 6.45 },
  { from: [440, 341], to: [sx(3), SCALE.y - 15], t: 6.65 },
].map((d) => ({ ...d, cls: tl.k([[0, { o: 0, x: d.from[0] - d.to[0], y: d.from[1] - d.to[1] }], [d.t, { o: 0 }], [d.t + 0.08, { o: 1 }], [d.t + 0.8, { x: 0, y: 0 }], [tl.out[0], { o: 1 }], [tl.out[1], { o: 0 }]]) }));
const noSabe = tl.k([[0, { o: 0, x: 333 - 460, y: 341 - 448 }], [6.85, { o: 0 }], [6.93, { o: 1 }], [7.65, { x: 0, y: 0 }], [tl.out[0], { o: 1 }], [tl.out[1], { o: 0 }]]);
const median = tl.k([[0, { o: 0, x: -(sx(3) - SCALE.x0) }], [7.55, { o: 0 }], [7.65, { o: 1 }], [8.35, { x: 0 }], [tl.out[0], { o: 1 }], [tl.out[1], { o: 0 }]]);
const medianValue = tl.enter(8.3, { y: 6 });

export const SCENE_INTERVIEW_CSS = tl.css();

export function SceneInterview({ viewBox = '0 0 560 620' }: { viewBox?: string }) {
  return (
    <svg viewBox={viewBox} className="sc-root block size-full" role="img" aria-label="La organización elige la modalidad; cuatro perfiles reciben su entrevista por archivo, la responden sin conexión y sus respuestas se consolidan por mediana. «No sabe» se aparta y no cuenta como cero.">
      {/* Organización y modalidad */}
      <Panel x={40} y={36} w={480} h={126} r={18} fill={C.glassHi} className={card}>
        <rect x={60} y={56} width={40} height={40} rx={11} fill={C.mintSoft} stroke="rgba(53,217,164,0.35)" />
        <Ico icon={Building2} x={70} y={66} size={20} color={C.mint} />
        <Txt x={116} y={73} size={16.5} weight={600} display>Su organización</Txt>
        <Txt x={116} y={93} size={12.5} fill={C.fog}>Naturaleza jurídica · Privada</Txt>
        <Txt x={500} y={73} size={11.5} fill={C.dim} anchor="end">Modalidad</Txt>
      </Panel>
      <g className={highlight}><rect x={132} y={120} width={76} height={26} rx={13} fill={C.mintSoft} stroke={C.mint} /></g>
      {[['Rápida', 60, 64], ['Estándar', 132, 76], ['Profesional', 216, 92]].map(([label, x, w], i) => (
        <g key={label as string} className={chips[i]}>
          <rect x={x as number} y={120} width={w as number} height={26} rx={13} fill="none" stroke={C.lineStrong} />
          <Txt x={(x as number) + (w as number) / 2} y={137.5} size={12.5} weight={500} anchor="middle" fill={C.ink}>{label}</Txt>
        </g>
      ))}
      <g className={applicable}>
        <Txt x={500} y={130} size={22} weight={600} anchor="end" fill={C.mint} display>90</Txt>
        <Txt x={500} y={147} size={11.5} anchor="end" fill={C.fog}>criterios aplicables</Txt>
      </g>

      {/* Distribución por archivo */}
      {branches.map((b) => (
        <path key={b.d} d={b.d} fill="none" stroke={C.lineStrong} strokeWidth={1.5} strokeDasharray={b.len} className={b.line} />
      ))}
      {branches.map((b) => (
        <g key={`f${b.d}`} className={`${b.file} sc-transient`}>
          <circle r={11} fill="rgba(53,217,164,0.22)" />
          <rect x={-6} y={-7.5} width={12} height={15} rx={2.5} fill={C.midnight} stroke={C.mint} strokeWidth={1.4} />
          <path d="M-3 -3h6M-3 0h6M-3 3h4" stroke={C.mint} strokeWidth={1.1} strokeLinecap="round" />
        </g>
      ))}

      {/* Perfiles entrevistados */}
      {PROFILES.map((p, i) => {
        const b = branches[i];
        const special = p.answer === 'No sabe';
        return (
          <g key={p.ini}>
            <Panel x={p.x} y={CARD_TOP} w={CARD_W} h={138} r={16} className={b.card}>
              <circle cx={p.x + 26} cy={CARD_TOP + 30} r={14} fill={C.violetSoft} stroke="rgba(142,120,247,0.45)" />
              <Txt x={p.x + 26} y={CARD_TOP + 34} size={10.5} weight={700} anchor="middle" fill="#CFC5FF">{p.ini}</Txt>
              {p.name.map((line, j) => <Txt key={line} x={p.x + 14} y={CARD_TOP + 66 + j * 15} size={12.5} weight={500}>{line}</Txt>)}
              <rect x={p.x + 14} y={CARD_TOP + 96} width={80} height={4} rx={2} fill="rgba(255,255,255,0.08)" />
            </Panel>
            <g className={b.offline}><Ico icon={WifiOff} x={p.x + CARD_W - 28} y={CARD_TOP + 22} size={15} color={C.fog} /></g>
            <g className={b.bar}><rect x={p.x + 14} y={CARD_TOP + 96} width={80} height={4} rx={2} fill={C.mint} /></g>
            <g className={b.answer}>
              {special
                ? <Pill x={p.x + 14} y={CARD_TOP + 107} w={62} h={22} text="No sabe" fill={C.violetSoft} stroke="rgba(142,120,247,0.5)" color="#D9D1FF" size={11.5} />
                : <Pill x={p.x + 14} y={CARD_TOP + 107} w={28} h={22} text={p.answer} fill={C.mintSoft} stroke="rgba(53,217,164,0.45)" color={C.ink} size={12.5} />}
            </g>
          </g>
        );
      })}

      {/* Consolidación por mediana */}
      <Panel x={40} y={384} w={480} h={116} r={18} fill={C.glassHi} className={panel}>
        <Txt x={60} y={410} size={12.5} fill={C.fog}>Consolidación del criterio</Txt>
        <line x1={SCALE.x0} x2={sx(5)} y1={SCALE.y} y2={SCALE.y} stroke={C.lineStrong} strokeWidth={1.5} />
        {[0, 1, 2, 3, 4, 5].map((v) => (
          <g key={v}>
            <line x1={sx(v)} x2={sx(v)} y1={SCALE.y - 5} y2={SCALE.y + 5} stroke={C.lineStrong} />
            <Txt x={sx(v)} y={SCALE.y + 22} size={11} fill={C.dim} anchor="middle">{v}</Txt>
          </g>
        ))}
      </Panel>
      <g className={slot}>
        <rect x={418} y={426} width={84} height={56} rx={12} fill="none" stroke="rgba(142,120,247,0.45)" strokeDasharray="4 4" />
        <Txt x={460} y={474} size={10.5} fill={C.fog} anchor="middle">no es cero</Txt>
      </g>
      <g className={median}>
        <rect x={sx(3) - 11} y={SCALE.y - 30} width={22} height={42} rx={11} fill="rgba(53,217,164,0.16)" stroke={C.mint} strokeOpacity={0.7} />
      </g>
      {drops.map((d) => (
        <g key={d.t} className={d.cls}><circle cx={d.to[0]} cy={d.to[1]} r={6} fill={C.violet} stroke="#0E1526" strokeWidth={2} /></g>
      ))}
      <g className={noSabe}><Pill x={429} y={436} w={62} h={22} text="No sabe" fill={C.violetSoft} stroke="rgba(142,120,247,0.5)" color="#D9D1FF" size={11.5} /></g>
      <g className={medianValue}>
        <Txt x={400} y={412} size={11.5} fill={C.fog} anchor="end">Mediana</Txt>
        <Txt x={400} y={434} size={22} weight={600} fill={C.mint} anchor="end" display>3,00</Txt>
      </g>
    </svg>
  );
}
