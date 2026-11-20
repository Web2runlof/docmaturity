/**
 * Contenedor accesible para Apache ECharts: cada gráfico ofrece una alternativa textual y una
 * tabla equivalente. Respeta la preferencia de movimiento reducido.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, HeatmapChart, LineChart, RadarChart, ScatterChart, CustomChart, GraphChart } from 'echarts/charts';
import { GridComponent, LegendComponent, MarkAreaComponent, MarkLineComponent, RadarComponent, TooltipComponent, VisualMapComponent, DataZoomComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsCoreOption } from 'echarts/core';
import { Table2 } from 'lucide-react';

echarts.use([BarChart, HeatmapChart, LineChart, RadarChart, ScatterChart, CustomChart, GraphChart, GridComponent, LegendComponent, MarkAreaComponent, MarkLineComponent, RadarComponent, TooltipComponent, VisualMapComponent, DataZoomComponent, CanvasRenderer]);

export interface TableData {
  columns: string[];
  rows: (string | number | null)[][];
}

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function EChart({ option, height = 320, label, summary, table, onClick, empty }: {
  option: EChartsCoreOption;
  height?: number;
  label: string;
  summary?: ReactNode;
  table?: TableData;
  onClick?: (params: { name?: string; dataIndex?: number; seriesName?: string; data?: unknown }) => void;
  empty?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const [showTable, setShowTable] = useState(false);
  const clickRef = useRef(onClick);
  clickRef.current = onClick;

  useEffect(() => {
    if (!ref.current || empty) return;
    const c = echarts.init(ref.current, undefined, { renderer: 'canvas' });
    chart.current = c;
    c.on('click', (p) => clickRef.current?.(p as never));
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => c.resize()) : null;
    ro?.observe(ref.current);
    return () => {
      ro?.disconnect();
      c.dispose();
      chart.current = null;
    };
  }, [empty]);

  useEffect(() => {
    chart.current?.setOption({ animation: !reduced(), animationDuration: 220, textStyle: { fontFamily: 'Inter, sans-serif' }, ...option }, true);
  }, [option]);

  return (
    <figure className="m-0">
      {empty ? (
        <div className="flex items-center justify-center rounded-md border border-dashed border-line bg-slate-50/60 text-sm text-muted" style={{ height }}>{empty}</div>
      ) : (
        <div ref={ref} role="img" aria-label={label} style={{ height, width: '100%' }} />
      )}
      <figcaption className="mt-2 flex flex-wrap items-start justify-between gap-2 text-xs text-muted">
        <span className="max-w-3xl">{summary}</span>
        {table && (
          <button type="button" onClick={() => setShowTable((s) => !s)} className="inline-flex items-center gap-1 font-medium text-teal hover:underline" aria-expanded={showTable}>
            <Table2 className="size-3.5" aria-hidden />
            {showTable ? 'Ocultar tabla de datos' : 'Ver tabla de datos'}
          </button>
        )}
      </figcaption>
      {table && showTable && (
        <div className="mt-3 max-h-80 overflow-auto rounded-md border border-line">
          <table className="table-pro">
            <caption className="sr-only">{label}</caption>
            <thead><tr>{table.columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i}>{r.map((v, j) => <td key={j} className="num">{v === null || v === '' ? 'Sin datos' : typeof v === 'number' ? v.toLocaleString('es-CO', { maximumFractionDigits: 2 }) : v}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  );
}
