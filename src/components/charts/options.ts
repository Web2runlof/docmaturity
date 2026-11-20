/** Constructores de opciones ECharts. Los valores desconocidos se representan como discontinuidades, nunca como cero. */
import type { EChartsCoreOption } from 'echarts/core';
import { LEVEL_COLORS, NO_DATA_COLOR } from '@/engine/constants';
import { levelIndex } from '@/engine/scoring';
import { LEVEL_NAMES } from '@/data/bank';

const INK = '#182633';
const MUTED = '#64748B';
const LINE = '#E2E8F0';
const fmt = (v: unknown) => (typeof v === 'number' ? v.toLocaleString('es-CO', { maximumFractionDigits: 2 }) : 'Sin datos');
const tooltip = { backgroundColor: '#0F202D', borderWidth: 0, textStyle: { color: '#fff', fontSize: 12 }, extraCssText: 'border-radius:5px;' };
const axisLabel = { color: MUTED, fontSize: 11 };

/**
 * Radar de madurez. Una dimensión sin datos no puede dibujarse como cero: los ejes sin datos en
 * ninguna serie de resultados se omiten, y una serie con huecos en los ejes restantes se dibuja
 * solo con puntos (sin polígono), para no unir valores a través del centro.
 */
export function radarOption(indicators: { name: string; full: string }[], series: { name: string; values: (number | null)[]; color: string; dashed?: boolean; area?: boolean }[]): EChartsCoreOption {
  const keep = indicators.map((_, i) => series.some((s) => !s.dashed && s.values[i] !== null && s.values[i] !== undefined));
  const axes = indicators.filter((_, i) => keep[i]);
  return {
    tooltip: { ...tooltip, trigger: 'item' },
    legend: { bottom: 0, icon: 'rect', itemWidth: 10, itemHeight: 4, textStyle: { color: MUTED, fontSize: 11 } },
    radar: {
      indicator: axes.map((i) => ({ name: i.name, max: 5, min: 0 })),
      radius: '68%',
      center: ['50%', '48%'],
      splitNumber: 5,
      axisName: { color: INK, fontSize: 11, fontWeight: 500 },
      splitLine: { lineStyle: { color: LINE } },
      splitArea: { show: false },
      axisLine: { lineStyle: { color: LINE } },
    },
    series: [{
      type: 'radar',
      symbolSize: 5,
      data: series.map((s) => {
        const values = s.values.filter((_, i) => keep[i]);
        const gaps = values.some((v) => v === null || v === undefined);
        return {
          name: s.name,
          value: values.map((v) => (v === null || v === undefined ? '-' : Math.round(v * 100) / 100)),
          symbolSize: gaps ? 8 : 5,
          lineStyle: { color: s.color, width: gaps ? 0 : s.dashed ? 1.5 : 2, type: s.dashed ? 'dashed' : 'solid' },
          itemStyle: { color: s.color },
          areaStyle: s.area && !gaps ? { color: s.color, opacity: 0.08 } : undefined,
        };
      }),
    }],
  };
}

/** Número de ejes que el radar puede representar con datos reales. */
export const radarAxesWithData = (series: { values: (number | null)[]; dashed?: boolean }[], count: number) =>
  Array.from({ length: count }, (_, i) => i).filter((i) => series.some((s) => !s.dashed && s.values[i] !== null && s.values[i] !== undefined)).length;

export function currentVsTargetOption(labels: string[], current: (number | null)[], target: number[]): EChartsCoreOption {
  return {
    tooltip: { ...tooltip, trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: fmt },
    grid: { left: 8, right: 36, top: 10, bottom: 24, containLabel: true },
    xAxis: { type: 'value', min: 0, max: 5, interval: 1, axisLabel, splitLine: { lineStyle: { color: LINE } } },
    yAxis: { type: 'category', data: labels, inverse: true, axisLabel: { ...axisLabel, color: INK }, axisTick: { show: false }, axisLine: { lineStyle: { color: LINE } } },
    series: [
      {
        name: 'Actual', type: 'bar', barWidth: 10,
        data: current.map((v) => (v === null ? { value: null, label: { show: true, position: 'insideLeft', formatter: 'Sin datos', color: NO_DATA_COLOR, fontSize: 10 } } : { value: Math.round(v * 100) / 100, itemStyle: { color: LEVEL_COLORS[levelIndex(v)], borderRadius: [0, 2, 2, 0] } })),
        label: { show: true, position: 'right', color: INK, fontSize: 10, formatter: (p: { value: number | null }) => (p.value === null ? '' : fmt(p.value)) },
      },
      { name: 'Objetivo', type: 'scatter', symbol: 'rect', symbolSize: [3, 16], data: target, itemStyle: { color: '#C69B59' }, z: 5 },
    ],
  };
}

export function heatmapOption(rows: string[], cols: string[], cells: (number | null)[][], opts: { min?: number; max?: number; colors?: string[]; valueLabel?: string } = {}): EChartsCoreOption {
  const data: [number, number, number][] = [];
  const empty: [number, number, number][] = [];
  cells.forEach((r, i) => r.forEach((v, j) => (v === null ? empty.push([j, i, -1]) : data.push([j, i, Math.round(v * 100) / 100]))));
  const longLabels = cols.some((c) => c.length > 12);
  return {
    tooltip: { ...tooltip, formatter: (p: { seriesIndex: number; data: [number, number, number] }) => `${rows[p.data[1]]} · ${cols[p.data[0]]}<br/>${opts.valueLabel ?? 'Valor'}: ${p.seriesIndex === 1 ? 'Sin datos' : fmt(p.data[2])}` },
    grid: { left: 8, right: 12, top: 8, bottom: longLabels && cols.length <= 6 ? 70 : 52, containLabel: true },
    xAxis: { type: 'category', data: cols, axisLabel: { ...axisLabel, interval: 0, rotate: cols.length > 6 ? 30 : 0, width: cols.length <= 6 ? 84 : undefined, overflow: cols.length <= 6 ? 'break' : undefined }, axisTick: { show: false }, splitArea: { show: false } },
    yAxis: { type: 'category', data: rows, inverse: true, axisLabel: { ...axisLabel, color: INK }, axisTick: { show: false } },
    visualMap: { seriesIndex: 0, min: opts.min ?? 0, max: opts.max ?? 5, calculable: false, orient: 'horizontal', left: 'center', bottom: 0, itemWidth: 10, itemHeight: 120, text: [String(opts.max ?? 5), String(opts.min ?? 0)], textStyle: { color: MUTED, fontSize: 10 }, inRange: { color: opts.colors ?? ['#FDE2E2', '#FEF3C7', '#DBEAFE', '#99F6E4', '#0D9488'] } },
    series: [
      { type: 'heatmap', data, label: { show: true, fontSize: 10, color: INK, formatter: (p: { data: [number, number, number] }) => fmt(p.data[2]) }, itemStyle: { borderColor: '#fff', borderWidth: 2 }, emphasis: { itemStyle: { borderColor: INK, borderWidth: 1 } } },
      { type: 'heatmap', name: 'Sin datos', data: empty, label: { show: true, fontSize: 10, color: NO_DATA_COLOR, formatter: '—' }, itemStyle: { color: '#F8FAFC', borderColor: '#fff', borderWidth: 2 }, emphasis: { disabled: true } },
    ],
  };
}

export function distributionOption(counts: number[], noData: number): EChartsCoreOption {
  const labels = [...LEVEL_NAMES.map((n, i) => `${i} · ${n}`), 'Sin datos'];
  return {
    tooltip: { ...tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 8, right: 8, top: 20, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: labels, axisLabel: { ...axisLabel, interval: 0, fontSize: 10 }, axisTick: { show: false }, axisLine: { lineStyle: { color: LINE } } },
    yAxis: { type: 'value', minInterval: 1, axisLabel, splitLine: { lineStyle: { color: LINE } } },
    series: [{ type: 'bar', barWidth: '55%', data: [...counts.map((v, i) => ({ value: v, itemStyle: { color: LEVEL_COLORS[i] } })), { value: noData, itemStyle: { color: '#fff', borderColor: NO_DATA_COLOR, borderType: 'dashed', borderWidth: 1 } }], label: { show: true, position: 'top', color: INK, fontSize: 11 } }],
  };
}

export function percentBarsOption(labels: string[], values: (number | null)[], color = '#0D9488', threshold?: number): EChartsCoreOption {
  return {
    tooltip: { ...tooltip, trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: unknown) => (typeof v === 'number' ? `${fmt(v)} %` : 'Sin datos') },
    grid: { left: 8, right: 8, top: 16, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: labels, axisLabel: { ...axisLabel, interval: 0 }, axisTick: { show: false }, axisLine: { lineStyle: { color: LINE } } },
    yAxis: { type: 'value', min: 0, max: 100, axisLabel: { ...axisLabel, formatter: '{value} %' }, splitLine: { lineStyle: { color: LINE } } },
    series: [{
      type: 'bar', barWidth: '50%',
      data: values.map((v) => (v === null ? { value: null } : { value: Math.round(v * 10) / 10, itemStyle: { color, borderRadius: [2, 2, 0, 0] } })),
      label: { show: true, position: 'top', fontSize: 10, color: INK, formatter: (p: { value: number | null }) => (p.value === null ? 'Sin datos' : `${Math.round(p.value)}`) },
      markLine: threshold === undefined ? undefined : { silent: true, symbol: 'none', lineStyle: { color: '#C69B59', type: 'dashed' }, label: { formatter: `${threshold} %`, position: 'insideEndTop', color: MUTED, fontSize: 10 }, data: [{ yAxis: threshold }] },
    }],
  };
}

export function scatterDiscrepancyOption(points: { id: string; median: number; range: number; n: number }[]): EChartsCoreOption {
  return {
    tooltip: { ...tooltip, formatter: (p: { data: [number, number, number, string] }) => `${p.data[3]}<br/>Mediana ${fmt(p.data[0])} · rango ${p.data[1]} · ${p.data[2]} participantes` },
    grid: { left: 28, right: 16, top: 16, bottom: 34, containLabel: true },
    xAxis: { type: 'value', name: 'Mediana', nameLocation: 'middle', nameGap: 26, min: 0, max: 5, axisLabel, nameTextStyle: { color: MUTED }, splitLine: { lineStyle: { color: LINE } } },
    yAxis: { type: 'value', name: 'Rango', nameLocation: 'middle', nameGap: 28, nameTextStyle: { color: MUTED }, min: 0, max: 5, interval: 1, axisLabel, splitLine: { lineStyle: { color: LINE } } },
    series: [{
      type: 'scatter', symbolSize: (d: number[]) => 6 + d[2] * 2,
      data: points.map((p) => [p.median, p.range, p.n, p.id]),
      itemStyle: { color: (p: { data: number[] }) => (p.data[1] >= 2 ? '#B91C1C' : '#0D9488'), opacity: 0.75 },
      markArea: { silent: true, itemStyle: { color: 'rgba(185,28,28,0.05)' }, data: [[{ yAxis: 2 }, { yAxis: 5 }]] },
    }],
  };
}

export function historyOption(labels: string[], series: { name: string; values: (number | null)[]; color: string }[]): EChartsCoreOption {
  return {
    tooltip: { ...tooltip, trigger: 'axis', valueFormatter: fmt },
    legend: { bottom: 0, textStyle: { color: MUTED, fontSize: 11 } },
    grid: { left: 8, right: 16, top: 16, bottom: 36, containLabel: true },
    xAxis: { type: 'category', data: labels, axisLabel, axisLine: { lineStyle: { color: LINE } } },
    yAxis: { type: 'value', min: 0, max: 5, interval: 1, axisLabel, splitLine: { lineStyle: { color: LINE } } },
    series: series.map((s) => ({ name: s.name, type: 'line', connectNulls: false, symbolSize: 6, data: s.values.map((v) => (v === null ? '-' : Math.round(v * 100) / 100)), lineStyle: { color: s.color, width: 2 }, itemStyle: { color: s.color } })),
  };
}

export function riskMatrixOption(matrix: number[][]): EChartsCoreOption {
  const data: [number, number, number][] = [];
  matrix.forEach((row, p) => row.forEach((v, i) => data.push([i, p, v])));
  const zone = (p: number, i: number) => {
    const s = (p + 1) * (i + 1);
    return s <= 4 ? '#ECFDF5' : s <= 9 ? '#FEF9C3' : s <= 16 ? '#FFEDD5' : '#FEE2E2';
  };
  return {
    tooltip: { ...tooltip, formatter: (x: { data: [number, number, number] }) => `Probabilidad ${x.data[1] + 1} · Impacto ${x.data[0] + 1}<br/>${x.data[2]} riesgo(s)` },
    grid: { left: 40, right: 12, top: 12, bottom: 40 },
    xAxis: { type: 'category', name: 'Impacto', nameLocation: 'middle', nameGap: 26, data: ['1', '2', '3', '4', '5'], axisLabel, axisTick: { show: false } },
    yAxis: { type: 'category', name: 'Probabilidad', nameLocation: 'middle', nameGap: 26, data: ['1', '2', '3', '4', '5'], axisLabel, axisTick: { show: false } },
    series: [{ type: 'heatmap', data: data.map((d) => ({ value: d, itemStyle: { color: zone(d[1], d[0]), borderColor: '#fff', borderWidth: 3 } })), label: { show: true, color: INK, fontSize: 12, fontWeight: 600, formatter: (x: { data: { value: [number, number, number] } }) => (x.data.value[2] ? String(x.data.value[2]) : '') } }],
  };
}

export function impactEffortOption(points: { id: string; impact: number; effort: number; score: number; estimated: boolean }[]): EChartsCoreOption {
  return {
    tooltip: { ...tooltip, formatter: (p: { data: [number, number, number, string, boolean] }) => `${p.data[3]}<br/>Impacto ${p.data[1]} · Esfuerzo ${p.data[0]}${p.data[4] ? ' (estimado)' : ''}<br/>Prioridad ${fmt(p.data[2])}` },
    grid: { left: 28, right: 16, top: 16, bottom: 34, containLabel: true },
    xAxis: { type: 'value', name: 'Esfuerzo', nameLocation: 'middle', nameGap: 26, nameTextStyle: { color: MUTED }, min: 0, max: 5.5, interval: 1, axisLabel: { ...axisLabel, formatter: (v: number) => (Number.isInteger(v) ? String(v) : '') }, splitLine: { show: false } },
    yAxis: { type: 'value', name: 'Impacto', nameLocation: 'middle', nameGap: 28, nameTextStyle: { color: MUTED }, min: 0, max: 5.5, interval: 1, axisLabel: { ...axisLabel, formatter: (v: number) => (Number.isInteger(v) ? String(v) : '') }, splitLine: { show: false } },
    series: [{
      type: 'scatter',
      data: points.map((p, i) => [p.effort + ((i % 5) - 2) * 0.06, p.impact + ((i % 3) - 1) * 0.06, p.score, p.id, p.estimated]),
      symbolSize: (d: number[]) => 8 + d[2] * 3,
      itemStyle: { color: (p: { data: [number, number, number, string, boolean] }) => (p.data[4] ? 'rgba(100,116,139,0.55)' : 'rgba(13,148,136,0.75)'), borderColor: '#fff', borderWidth: 1 },
      label: { show: points.length <= 25, formatter: (p: { data: [number, number, number, string] }) => p.data[3], position: 'right', fontSize: 9, color: MUTED },
      markArea: {
        silent: true,
        label: { color: MUTED, fontSize: 10, position: 'insideTopLeft' },
        data: [
          [{ name: 'Victorias rápidas', xAxis: 0, yAxis: 3, itemStyle: { color: 'rgba(13,148,136,0.06)' } }, { xAxis: 3, yAxis: 5.5 }],
          [{ name: 'Proyectos estratégicos', xAxis: 3, yAxis: 3, itemStyle: { color: 'rgba(20,43,58,0.05)' } }, { xAxis: 5.5, yAxis: 5.5 }],
          [{ name: 'Mejoras menores', xAxis: 0, yAxis: 0, itemStyle: { color: 'rgba(198,155,89,0.06)' } }, { xAxis: 3, yAxis: 3 }],
          [{ name: 'Requieren reevaluación', xAxis: 3, yAxis: 0, itemStyle: { color: 'rgba(185,28,28,0.04)' } }, { xAxis: 5.5, yAxis: 3 }],
        ],
      },
    }],
  };
}

export function ganttOption(items: { name: string; start: string; end: string; phase: number }[]): EChartsCoreOption {
  const colors = ['#B91C1C', '#B7791F', '#0D9488', '#142B3A'];
  const t = (d: string) => new Date(`${d}T00:00:00`).getTime();
  return {
    tooltip: { ...tooltip, formatter: (p: { data: { value: [number, number, number]; name: string } }) => `${p.data.name}<br/>${new Date(p.data.value[1]).toLocaleDateString('es-CO')} – ${new Date(p.data.value[2]).toLocaleDateString('es-CO')}` },
    grid: { left: 8, right: 16, top: 12, bottom: 24, containLabel: true },
    xAxis: { type: 'time', axisLabel: { ...axisLabel, formatter: (v: number) => new Date(v).toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }) }, splitLine: { lineStyle: { color: LINE } } },
    yAxis: { type: 'category', data: items.map((i) => i.name), inverse: true, axisLabel: { ...axisLabel, color: INK, width: 180, overflow: 'truncate' }, axisTick: { show: false } },
    series: [{
      type: 'custom',
      renderItem: (_: unknown, api: { value: (i: number) => number; coord: (v: number[]) => number[]; size: (v: number[]) => number[]; style: (o: object) => object }) => {
        const cat = api.value(0);
        const s = api.coord([api.value(1), cat]);
        const e = api.coord([api.value(2), cat]);
        const h = api.size([0, 1])[1] * 0.5;
        return { type: 'rect', shape: { x: s[0], y: s[1] - h / 2, width: Math.max(2, e[0] - s[0]), height: h, r: 2 }, style: api.style({}) };
      },
      encode: { x: [1, 2], y: 0 },
      data: items.map((it, i) => ({ name: it.name, value: [i, t(it.start), t(it.end)], itemStyle: { color: colors[it.phase - 1] } })),
    }],
  };
}

export function dependencyGraphOption(nodes: { id: string; name: string; phase: number }[], links: { source: string; target: string }[]): EChartsCoreOption {
  const colors = ['#B91C1C', '#B7791F', '#0D9488', '#142B3A'];
  const byPhase = [1, 2, 3, 4].map((p) => nodes.filter((n) => n.phase === p));
  return {
    tooltip: { ...tooltip },
    series: [{
      type: 'graph', layout: 'none', roam: true, edgeSymbol: ['none', 'arrow'], edgeSymbolSize: 7,
      data: nodes.map((n) => {
        const col = byPhase[n.phase - 1];
        const idx = col.indexOf(n);
        return { id: n.id, name: n.name, x: (n.phase - 1) * 260, y: idx * 60, symbol: 'roundRect', symbolSize: [12, 12], itemStyle: { color: colors[n.phase - 1] }, label: { show: true, position: 'right', fontSize: 10, color: INK, width: 200, overflow: 'truncate' } };
      }),
      links: links.map((l) => ({ ...l, lineStyle: { color: '#94A3B8', curveness: 0.15 } })),
    }],
  };
}

export function stackedMgdaOption(labels: string[], withGap: number[], ok: number[], notEvaluated: number[]): EChartsCoreOption {
  return {
    tooltip: { ...tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { bottom: 0, textStyle: { color: MUTED, fontSize: 11 } },
    grid: { left: 8, right: 12, top: 8, bottom: 34, containLabel: true },
    xAxis: { type: 'value', minInterval: 1, axisLabel, splitLine: { lineStyle: { color: LINE } } },
    yAxis: { type: 'category', data: labels, inverse: true, axisLabel: { ...axisLabel, color: INK }, axisTick: { show: false } },
    series: [
      { name: 'Con brecha', type: 'bar', stack: 't', data: withGap, itemStyle: { color: '#C2410C' }, barWidth: 14 },
      { name: 'Sin brecha', type: 'bar', stack: 't', data: ok, itemStyle: { color: '#0D9488' } },
      { name: 'Sin evaluar', type: 'bar', stack: 't', data: notEvaluated, itemStyle: { color: '#fff', borderColor: NO_DATA_COLOR, borderType: 'dashed' } },
    ],
  };
}
