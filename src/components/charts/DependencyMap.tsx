/**
 * Mapa de dependencias entre iniciativas: una columna por fase con su encabezado, tarjetas con la
 * etiqueta completa y conectores SVG que nunca atraviesan tarjetas. Los conectores entre columnas
 * contiguas cruzan el canal entre ellas; los que saltan fases suben a un canal superior reservado.
 */
import { useMemo, useState } from 'react';
import { Table2 } from 'lucide-react';
import { PHASE_COLORS } from '@/engine/constants';

export interface DependencyNode { id: string; code: string; name: string; phase: number }
export interface DependencyEdge { source: string; target: string }

const W = 212; // ancho de tarjeta
const G = 62; // canal entre columnas
const H = 46; // alto de tarjeta
const GAP = 12; // separación vertical entre tarjetas
const HEAD = 34; // encabezado de fase
const LANE = 7; // separación entre carriles del canal superior

export function DependencyMap({ nodes, edges, phases }: { nodes: DependencyNode[]; edges: DependencyEdge[]; phases: { phase: number; name: string; horizon: string }[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);
  const layout = useMemo(() => {
    const cols = phases.map((p) => nodes.filter((n) => n.phase === p.phase));
    const skips = edges.filter((e) => {
      const s = nodes.find((n) => n.id === e.source);
      const t = nodes.find((n) => n.id === e.target);
      return s && t && t.phase - s.phase > 1;
    });
    const channel = skips.length ? 16 + skips.length * LANE : 8;
    const top = HEAD + channel;
    const pos = new Map<string, { x: number; y: number; col: number }>();
    cols.forEach((list, c) => list.forEach((n, r) => pos.set(n.id, { x: c * (W + G), y: top + r * (H + GAP), col: c })));
    const rows = Math.max(1, ...cols.map((l) => l.length));
    return { cols, pos, top, channel, skips, width: phases.length * W + (phases.length - 1) * G, height: top + rows * (H + GAP) + 8 };
  }, [nodes, edges, phases]);

  const paths = edges.flatMap((e, i) => {
    const s = layout.pos.get(e.source);
    const t = layout.pos.get(e.target);
    if (!s || !t) return [];
    const sx = s.x + W;
    const sy = s.y + H / 2;
    const tx = t.x;
    const ty = t.y + H / 2;
    let d: string;
    if (t.col === s.col + 1) {
      const mx = sx + G / 2;
      d = `M${sx},${sy} C${mx},${sy} ${mx},${ty} ${tx - 2},${ty}`;
    } else if (t.col > s.col + 1) {
      // Canal superior: sube por el canal de salida, cruza por encima de las tarjetas y baja por el canal de llegada.
      const lane = layout.skips.indexOf(e);
      const ly = HEAD + 10 + lane * LANE;
      const gx1 = sx + G / 2 - 6 + (lane % 3) * 4;
      const gx2 = tx - G / 2 + 6 - (lane % 3) * 4;
      d = `M${sx},${sy} L${gx1 - 8},${sy} Q${gx1},${sy} ${gx1},${sy - 8} L${gx1},${ly + 8} Q${gx1},${ly} ${gx1 + 8},${ly} L${gx2 - 8},${ly} Q${gx2},${ly} ${gx2},${ly + 8} L${gx2},${ty - 8} Q${gx2},${ty} ${gx2 + 8},${ty} L${tx - 2},${ty}`;
    } else {
      // Misma fase (o fase anterior, si se editó a mano): rodea por el canal derecho de la columna.
      const gx = sx + 14 + (i % 3) * 4;
      d = `M${sx},${sy} L${gx},${sy} L${gx},${ty} L${t.x + W + 2},${ty}`;
    }
    const active = hover !== null && (hover === e.source || hover === e.target);
    return [{ key: `${e.source}-${e.target}`, d, active, back: t.col <= s.col }];
  });
  const related = (id: string) => hover !== null && (hover === id || edges.some((e) => (e.source === hover && e.target === id) || (e.target === hover && e.source === id)));
  const codeOf = (id: string) => nodes.find((n) => n.id === id)?.code ?? '';

  return (
    <figure className="m-0">
      <div className="overflow-x-auto">
        <svg width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`} className="mx-auto block" role="img" aria-label={`Mapa de dependencias: ${edges.length} relaciones entre ${nodes.length} iniciativas`}>
          <defs>
            <marker id="dep-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#1E293B" /></marker>
            <marker id="dep-arrow-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#00695E" /></marker>
          </defs>
          {phases.map((p, c) => (
            <g key={p.phase}>
              <rect x={c * (W + G)} y={0} width={W} height={HEAD - 8} rx={4} fill="#F1F5F9" />
              <rect x={c * (W + G)} y={HEAD - 10} width={W} height={2} fill={PHASE_COLORS[c]} />
              <text x={c * (W + G) + W / 2} y={17} textAnchor="middle" fontSize={11.5} fontWeight={600} fill="#182633">Fase {p.phase} · {p.horizon}</text>
            </g>
          ))}
          {paths.map((p) => (
            <path key={p.key} d={p.d} fill="none" stroke={p.active ? '#00695E' : '#334155'} strokeWidth={p.active ? 2.2 : 1.4} strokeOpacity={hover && !p.active ? 0.25 : 0.95} strokeDasharray={p.back ? '4 3' : undefined} markerEnd={`url(#${p.active ? 'dep-arrow-on' : 'dep-arrow'})`} />
          ))}
          {nodes.map((n) => {
            const pt = layout.pos.get(n.id);
            if (!pt) return null;
            const dim = hover !== null && !related(n.id);
            return (
              <g key={n.id} transform={`translate(${pt.x},${pt.y})`} onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(n.id)} onBlur={() => setHover(null)} tabIndex={0} role="group" aria-label={`${n.code} ${n.name}`} style={{ cursor: 'default', outline: 'none' }} opacity={dim ? 0.45 : 1}>
                <title>{`${n.code} · ${n.name}`}</title>
                <rect width={W} height={H} rx={6} fill="#FFFFFF" stroke={hover === n.id ? '#00695E' : '#CBD5E1'} strokeWidth={hover === n.id ? 1.6 : 1} />
                <rect width={4} height={H} rx={2} fill={PHASE_COLORS[n.phase - 1]} />
                <foreignObject x={12} y={4} width={W - 18} height={H - 8}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, lineHeight: '13px', color: '#182633', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', paddingTop: 2 }}>
                    <strong style={{ fontWeight: 600 }}>{n.code}</strong> {n.name}
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </svg>
      </div>
      <figcaption className="mt-2 flex flex-wrap items-start justify-between gap-2 text-xs text-muted">
        <span>Las flechas van del prerrequisito a la iniciativa que depende de él. Pase el cursor o el foco por una iniciativa para resaltar sus relaciones.{paths.some((p) => p.back) ? ' Las líneas discontinuas señalan dependencias dentro de la misma fase o hacia una fase anterior.' : ''}</span>
        <button type="button" onClick={() => setShowTable((v) => !v)} className="inline-flex items-center gap-1 font-medium text-teal hover:underline" aria-expanded={showTable}><Table2 className="size-3.5" aria-hidden />{showTable ? 'Ocultar tabla de datos' : 'Ver tabla de datos'}</button>
      </figcaption>
      {showTable && (
        <div className="mt-3 max-h-80 overflow-auto rounded-md border border-line">
          <table className="table-pro">
            <caption className="sr-only">Dependencias entre iniciativas</caption>
            <thead><tr><th scope="col">Iniciativa</th><th scope="col">Fase</th><th scope="col">Depende de</th></tr></thead>
            <tbody>{nodes.map((n) => <tr key={n.id}><td>{n.code} {n.name}</td><td className="num">{n.phase}</td><td>{edges.filter((e) => e.target === n.id).map((e) => codeOf(e.source)).join(', ') || '—'}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </figure>
  );
}
