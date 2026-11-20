import { LEVEL_NAMES } from '@/data/bank';
import { LEVEL_COLORS, NO_DATA_COLOR } from '@/engine/constants';

/** Leyenda de la escala de madurez 0–5 (paleta secuencial única). Se ajusta al ancho disponible. */
export function LevelLegend({ noData = false }: { noData?: boolean }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] text-muted" aria-label="Escala de madurez">
      {LEVEL_NAMES.map((n, i) => (
        <li key={n} className="inline-flex items-center gap-1.5 whitespace-nowrap"><span className="inline-block size-2.5 rounded-[2px]" style={{ background: LEVEL_COLORS[i] }} aria-hidden />{i} · {n}</li>
      ))}
      {noData && <li className="inline-flex items-center gap-1.5 whitespace-nowrap"><span className="inline-block size-2.5 rounded-[2px] border bg-slate-50" style={{ borderColor: NO_DATA_COLOR }} aria-hidden />— Sin datos</li>}
    </ul>
  );
}
