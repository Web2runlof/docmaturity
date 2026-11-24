/**
 * Privacidad · Su información no sale del dispositivo.
 * Escena sobre fondo claro y transparente: el perímetro del dispositivo contiene la base local, que
 * sigue escribiendo sin conexión; la persona activa el cifrado y exporta un respaldo a su carpeta.
 * Hacia los servidores externos no sale ninguna solicitud.
 */
import { useId } from 'react';
import { Check, Cloud, Database, FileLock2, Folder, KeyRound, MousePointer2, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { Ico, LIGHT as C, Txt } from './kit';
import { timeline } from './timeline';

const tl = timeline('sd', 12);

/* Escritura local: destello en la fila y el contador que cambia. */
const ROWS = [
  { name: 'Organizaciones', counts: ['3'] },
  { name: 'Evaluaciones', counts: ['5'] },
  { name: 'Respuestas', counts: ['1.284', '1.285', '1.286', '1.287'] },
  { name: 'Evidencias', counts: ['96', '97'] },
];
const WRITES: Record<number, number[]> = { 2: [1.0, 4.3, 5.2], 3: [2.2] };
const flash = (t: number) => tl.k([[0, { o: 0 }], [t, { o: 0 }], [t + 0.15, { o: 1 }], [t + 1.1, { o: 0 }]]);
/** Clases de cada valor del contador: visible desde su escritura hasta la siguiente. */
function counterClasses(row: number): string[] {
  const times = WRITES[row] ?? [];
  const values = ROWS[row].counts;
  if (values.length === 1) return [''];
  return values.map((_, i) => {
    const from = i === 0 ? 0 : times[i - 1];
    const to = i < times.length ? times[i] : tl.T;
    if (i === 0) return tl.k([[0, { o: 1, y: 0 }], [to, { o: 1, y: 0 }], [to + 0.25, { o: 0, y: -6 }], [tl.T - 0.35, { o: 0, y: 6 }], [tl.T, { o: 1, y: 0 }]]);
    const last = i === values.length - 1;
    return tl.k([[0, { o: 0, y: 6 }], [from, { o: 0, y: 6 }], [from + 0.3, { o: 1, y: 0 }], [last ? tl.T - 0.4 : to, { o: 1, y: 0 }], [last ? tl.T - 0.1 : to + 0.25, { o: 0, y: last ? 0 : -6 }]]);
  });
}
const counters = ROWS.map((_, i) => counterClasses(i));
const flashes = Object.fromEntries(Object.entries(WRITES).map(([row, ts]) => [row, ts.map(flash)]));

/* Conexión: se corta y vuelve; la aplicación sigue funcionando. */
const online = tl.k([[0, { o: 1 }], [3.3, { o: 1 }], [3.5, { o: 0 }], [6.1, { o: 0 }], [6.3, { o: 1 }]]);
const offline = tl.k([[0, { o: 0 }], [3.4, { o: 0 }], [3.6, { o: 1 }], [6.0, { o: 1 }], [6.2, { o: 0 }]]);
const offlineNote = tl.k([[0, { o: 0, y: 8 }], [3.6, { o: 0, y: 8 }], [4.1, { o: 1, y: 0 }], [5.9, { o: 1, y: 0 }], [6.25, { o: 0, y: 0 }]]);

/* Cifrado y respaldo por decisión de la persona. */
const cursor = tl.path([[6.35, 330, 470], [6.95, 404, 331], [7.25, 404, 331], [7.85, 160, 328], [8.2, 160, 328], [8.5, 240, 400]], 0.3);
const knob = tl.k([[0, { x: -14 }], [7.0, { x: -14 }], [7.3, { x: 0 }], [tl.T - 0.5, { x: 0 }], [tl.T - 0.1, { x: -14 }]]);
const track = tl.k([[0, { o: 0 }], [7.0, { o: 0 }], [7.3, { o: 1 }], [tl.T - 0.5, { o: 1 }], [tl.T - 0.1, { o: 0 }]]);
const press = tl.k([[0, { s: 1 }], [7.9, { s: 1 }], [8.0, { s: 0.95 }], [8.15, { s: 1 }]], 'center');
const file = tl.k([[0, { o: 0, x: 153 - 548, y: 330 - 438, s: 0.7 }], [8.05, { o: 0, x: 153 - 548, y: 330 - 438, s: 0.7 }], [8.25, { o: 1, x: 153 - 548, y: 384 - 438, s: 1 }], [9.35, { x: 0, y: 0 }], [9.7, { o: 1, s: 1 }], [10.0, { o: 0, s: 0.6 }]], 'center');
const saved = tl.k([[0, { o: 0, s: 0.6 }], [9.85, { o: 0, s: 0.6 }], [10.15, { o: 1, s: 1 }], [tl.T - 0.45, { o: 1 }], [tl.T - 0.1, { o: 0 }]], 'center');
const shieldRing = tl.k([[0, { o: 0, s: 1 }], [0.4, { o: 0.7, s: 1 }], [2.2, { o: 0, s: 1.7 }], [8.3, { o: 0, s: 1 }], [8.6, { o: 0.7, s: 1 }], [10.4, { o: 0, s: 1.7 }]], 'center');

export const SCENE_DEVICE_CSS = tl.css();

const W = { x: 60, y: 82, w: 372, h: 280 };

export function SceneDevice() {
  const uid = `sd${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg viewBox="0 0 640 508" overflow="visible" className="sc-root block h-auto w-full" role="img" aria-label="El dispositivo contiene la base local, que sigue guardando respuestas sin conexión. La persona activa el cifrado y exporta un respaldo a su carpeta. Hacia los servidores externos no sale ninguna solicitud.">
      <defs>
        <filter id={`${uid}-shadow`} x="-40%" y="-40%" width="180%" height="200%">
          <feDropShadow dx="0" dy="18" stdDeviation="18" floodColor="#0B1020" floodOpacity="0.12" />
        </filter>
        <filter id={`${uid}-soft`} x="-40%" y="-40%" width="180%" height="200%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#0B1020" floodOpacity="0.10" />
        </filter>
        <linearGradient id={`${uid}-halo`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#35D9A4" stopOpacity="0.10" />
          <stop offset="1" stopColor="#8E78F7" stopOpacity="0.08" />
        </linearGradient>
      </defs>

      {/* Perímetro del dispositivo */}
      <rect x={24} y={40} width={444} height={392} rx={36} fill={`url(#${uid}-halo)`} />
      <rect x={24} y={40} width={444} height={392} rx={36} fill="none" stroke={C.mintStrong} strokeOpacity={0.55} strokeWidth={1.5} strokeDasharray="7 9" className="sd-march" />
      <g>
        <rect x={48} y={27} width={128} height={26} rx={13} fill={C.white} stroke={C.line} />
        <circle cx={63} cy={40} r={4} fill={C.mint} />
        <Txt x={74} y={44.5} size={12} weight={600} fill={C.ink}>Su dispositivo</Txt>
      </g>

      {/* Ventana de la aplicación */}
      <g filter={`url(#${uid}-shadow)`}>
        <rect x={W.x} y={W.y} width={W.w} height={W.h} rx={18} fill={C.white} stroke={C.line} />
      </g>
      {[0, 1, 2].map((i) => <circle key={i} cx={W.x + 22 + i * 14} cy={W.y + 20} r={4} fill={C.line} />)}
      <rect x={W.x + 70} y={W.y + 9} width={W.w - 122} height={22} rx={11} fill={C.soft} />
      <Txt x={W.x + 84} y={W.y + 24} size={11.5} fill={C.muted}>docmaturity · en este navegador</Txt>
      <g className={online}><Ico icon={Wifi} x={W.x + W.w - 40} y={W.y + 12} size={16} color={C.mintStrong} /></g>
      <g className={`${offline} sc-transient`}><Ico icon={WifiOff} x={W.x + W.w - 40} y={W.y + 12} size={16} color={C.violet} /></g>
      <line x1={W.x} x2={W.x + W.w} y1={W.y + 40} y2={W.y + 40} stroke={C.line} />

      <Ico icon={Database} x={W.x + 20} y={W.y + 56} size={15} color={C.mintStrong} />
      <Txt x={W.x + 42} y={W.y + 68} size={13} weight={600} fill={C.ink} display>Base local del navegador</Txt>
      <Txt x={W.x + W.w - 20} y={W.y + 68} size={11} fill={C.dim} anchor="end">IndexedDB</Txt>
      {ROWS.map((r, i) => {
        const y = W.y + 84 + i * 34;
        return (
          <g key={r.name}>
            {(flashes[i] ?? []).map((c: string) => <rect key={c} x={W.x + 14} y={y} width={W.w - 28} height={30} rx={9} fill={C.mintSoft} className={`${c} sc-transient`} />)}
            <rect x={W.x + 14} y={y} width={W.w - 28} height={30} rx={9} fill="none" stroke={C.line} />
            <rect x={W.x + 24} y={y + 8} width={14} height={14} rx={4} fill={i % 2 ? C.violetSoft : C.mintSoft} />
            <Txt x={W.x + 48} y={y + 19.5} size={12.5} fill={C.ink}>{r.name}</Txt>
            {r.counts.map((v, j) => (
              <g key={v} className={`${counters[i][j]}${j > 0 ? ' sc-transient' : ''}`}>
                <Txt x={W.x + W.w - 26} y={y + 19.5} size={12.5} weight={600} fill={C.ink} anchor="end">{v}</Txt>
              </g>
            ))}
          </g>
        );
      })}

      {/* Cifrado opcional y exportación */}
      <g className={press}>
        <rect x={W.x + 20} y={W.y + 232} width={146} height={32} rx={10} fill={C.midnight} />
        <Txt x={W.x + 93} y={W.y + 252.5} size={12} weight={600} fill={C.white} anchor="middle">Exportar respaldo</Txt>
      </g>
      <Ico icon={KeyRound} x={W.x + 180} y={W.y + 241} size={14} color={C.muted} />
      <Txt x={W.x + 199} y={W.y + 252} size={11} fill={C.muted}>Cifrar con contraseña</Txt>
      <rect x={W.x + 332} y={W.y + 239} width={32} height={18} rx={9} fill={C.line} />
      <g className={track}><rect x={W.x + 332} y={W.y + 239} width={32} height={18} rx={9} fill={C.mint} /></g>
      <g className={knob}><circle cx={W.x + 355} cy={W.y + 248} r={7} fill={C.white} stroke="rgba(11,16,32,0.12)" /></g>

      {/* Sin conexión: sigue funcionando */}
      <g className={`${offlineNote} sc-transient`}>
        <rect x={60} y={380} width={286} height={30} rx={15} fill={C.white} stroke={C.line} />
        <Ico icon={WifiOff} x={74} y={387} size={15} color={C.violet} />
        <Txt x={96} y={399.5} size={12} fill={C.ink}>Sin conexión: la aplicación sigue funcionando</Txt>
      </g>

      {/* Servidores externos: ninguna solicitud */}
      <path d="M432 170 C470 170 488 140 528 132" fill="none" stroke={C.dim} strokeOpacity={0.5} strokeWidth={1.4} strokeDasharray="2 6" strokeLinecap="round" />
      <g className={shieldRing}><circle cx={468} cy={160} r={17} fill="none" stroke={C.mint} strokeWidth={1.5} /></g>
      <circle cx={468} cy={160} r={17} fill={C.white} stroke={C.mint} strokeWidth={1.5} />
      <Ico icon={ShieldCheck} x={459} y={151} size={18} color={C.mintStrong} />
      <Ico icon={Cloud} x={530} y={98} size={52} color="#B9C3D1" stroke={1.5} />
      <Txt x={556} y={170} size={11.5} fill={C.muted} anchor="middle">Servidores externos</Txt>
      <rect x={510} y={180} width={92} height={24} rx={12} fill={C.mintSoft} />
      <Txt x={556} y={196} size={11.5} weight={600} fill={C.mintStrong} anchor="middle">0 solicitudes</Txt>

      {/* Su carpeta */}
      <g>
        <rect x={492} y={384} width={124} height={104} rx={18} fill={C.white} stroke={C.line} filter={`url(#${uid}-soft)`} />
        <Ico icon={Folder} x={510} y={402} size={22} color={C.mintStrong} />
        <Txt x={510} y={446} size={12.5} weight={600} fill={C.ink} display>Su carpeta</Txt>
        <Txt x={510} y={464} size={11} fill={C.muted}>Usted decide</Txt>
      </g>
      <g className={saved}>
        <circle cx={596} cy={404} r={11} fill={C.mint} />
        <Ico icon={Check} x={590} y={398} size={12} color={C.midnight} stroke={3} />
      </g>
      <g className={`${file} sc-transient`}>
        <rect x={478} y={416} width={140} height={44} rx={12} fill={C.white} stroke={C.mint} strokeWidth={1.4} />
        <Ico icon={FileLock2} x={490} y={428} size={20} color={C.mintStrong} />
        <Txt x={518} y={435} size={11.5} weight={600} fill={C.ink}>Respaldo</Txt>
        <Txt x={518} y={451} size={10.5} fill={C.muted}>cifrado · AES-GCM</Txt>
      </g>
      <g className={`${cursor} sc-transient`}><Ico icon={MousePointer2} x={0} y={0} size={20} color={C.ink} stroke={1.6} /></g>
    </svg>
  );
}
