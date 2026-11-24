/**
 * Línea de tiempo declarativa para las escenas animadas de la portada.
 *
 * Cada escena es un SVG cuyo movimiento se describe en segundos sobre un ciclo fijo. Esta utilidad
 * convierte esa descripción en reglas `@keyframes` (todas con la misma duración, así que el ciclo
 * completo se repite sincronizado). El estado sin animación de cada elemento es su estado final:
 * con movimiento reducido o sin CSS, la escena se muestra completa y quieta.
 */

export interface State {
  /** Opacidad. */
  o?: number;
  /** Desplazamiento en unidades del viewBox. */
  x?: number;
  y?: number;
  /** Escala uniforme o por eje. */
  s?: number;
  sx?: number;
  sy?: number;
  /** Desfase del trazo (para dibujar líneas). */
  dash?: number;
}

type Frame = [t: number, state: State];

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

function stateCss(st: State): string {
  const out: string[] = [];
  if (st.o !== undefined) out.push(`opacity:${st.o}`);
  const hasT = st.x !== undefined || st.y !== undefined || st.s !== undefined || st.sx !== undefined || st.sy !== undefined;
  if (hasT) {
    const sx = st.sx ?? st.s ?? 1;
    const sy = st.sy ?? st.s ?? 1;
    out.push(`transform:translate(${st.x ?? 0}px,${st.y ?? 0}px) scale(${sx},${sy})`);
  }
  if (st.dash !== undefined) out.push(`stroke-dashoffset:${st.dash}`);
  return out.join(';');
}

export interface Timeline {
  /** Duración del ciclo en segundos. */
  readonly T: number;
  /** Instantes en que toda la escena se desvanece antes de reiniciar. */
  readonly out: readonly [number, number];
  /** Fotogramas arbitrarios; devuelve la clase que hay que asignar al elemento. */
  k(frames: Frame[], origin?: string): string;
  /** Aparece en `at` desde un desplazamiento y queda visible hasta el cierre del ciclo. */
  enter(at: number, from?: State, d?: number, origin?: string): string;
  /** Crece desde cero en un eje (barras), con origen en `origin`. */
  grow(at: number, axis: 'x' | 'y', d?: number, origin?: string): string;
  /** Dibuja un trazo de longitud `len`. */
  draw(at: number, len: number, d?: number): string;
  /** Visible solo entre `from` y `to` (estados intermedios que se sustituyen). */
  window(from: number, to: number, enterFrom?: State): string;
  /** Recorre puntos `[t, x, y]` en coordenadas absolutas y desaparece al llegar. */
  path(points: [number, number, number][], fade?: number): string;
  /** Hoja de estilos de la escena. */
  css(): string;
}

export function timeline(prefix: string, T: number): Timeline {
  const rules: string[] = [];
  const out: [number, number] = [T - 0.9, T - 0.3];
  let n = 0;
  const pct = (t: number) => `${Math.min(100, Math.max(0, (t / T) * 100)).toFixed(3)}%`;

  function k(frames: Frame[], origin?: string): string {
    const name = `${prefix}${n++}`;
    const sorted = [...frames].sort((a, b) => a[0] - b[0]);
    if (sorted[0][0] > 0) sorted.unshift([0, sorted[0][1]]);
    if (sorted[sorted.length - 1][0] < T) sorted.push([T, {}]);
    let cur: State = {};
    const body = sorted.map(([t, s]) => {
      cur = { ...cur, ...s };
      return `${pct(t)}{${stateCss(cur)}}`;
    }).join('');
    rules.push(`@keyframes ${name}{${body}}`);
    rules.push(`.${name}{animation:${name} ${T}s ${EASE} infinite both;${origin ? `transform-box:fill-box;transform-origin:${origin};` : ''}}`);
    return name;
  }

  const fadeOut = (): Frame[] => [[out[0], { o: 1 }], [out[1], { o: 0 }]];

  return {
    T,
    out,
    k,
    enter(at, from = { y: 10 }, d = 0.6, origin) {
      const start: State = { o: 0, x: 0, y: 0, s: 1, ...from };
      return k([[0, start], [at, start], [at + d, { o: 1, x: 0, y: 0, s: 1, sx: undefined, sy: undefined }], ...fadeOut()], origin ?? (from.s !== undefined ? 'center' : undefined));
    },
    grow(at, axis, d = 0.8, origin = axis === 'x' ? 'left center' : 'center bottom') {
      const zero: State = axis === 'x' ? { o: 0, sx: 0, sy: 1 } : { o: 0, sx: 1, sy: 0 };
      return k([[0, zero], [at, zero], [at + 0.05, { o: 1 }], [at + d, { sx: 1, sy: 1 }], ...fadeOut()], origin);
    },
    draw(at, len, d = 0.7) {
      return k([[0, { o: 0, dash: len }], [at, { o: 0, dash: len }], [at + 0.05, { o: 1 }], [at + d, { dash: 0 }], ...fadeOut()]);
    },
    window(from, to, enterFrom = { y: 6 }) {
      const start: State = { o: 0, x: 0, y: 0, ...enterFrom };
      return k([[0, start], [from, start], [from + 0.4, { o: 1, x: 0, y: 0 }], [to, { o: 1 }], [to + 0.35, { o: 0 }]]);
    },
    path(points, fade = 0.25) {
      const [t0, x0, y0] = points[0];
      const last = points[points.length - 1];
      const frames: Frame[] = [[0, { o: 0, x: x0, y: y0 }], [t0, { o: 0, x: x0, y: y0 }], [t0 + 0.08, { o: 1 }]];
      for (const [t, x, y] of points.slice(1)) frames.push([t, { x, y }]);
      frames.push([last[0] + fade, { o: 0 }]);
      return k(frames);
    },
    css: () => rules.join('\n'),
  };
}
