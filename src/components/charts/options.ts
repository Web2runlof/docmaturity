/**
 * Constructores de opciones ECharts. Los valores desconocidos se representan como «Sin datos» o como
 * discontinuidades, nunca como cero. Paletas, bandas y formatos provienen de las constantes compartidas.
 */
import type { EChartsCoreOption } from 'echarts/core';
import {
  GAP_BUCKETS, GAP_EVALUATE, LEVEL_COLORS, LEVEL_LABEL_COLORS, NO_DATA_COLOR, PHASE_COLORS, RISK_BAND_COLORS, RISK_BANDS, STATUS_COLORS,
} from '@/engine/constants';
import { levelIndex } from '@/engine/scoring';
import { LEVEL_NAMES } from '@/data/bank';
import { fmtPct, fmtScore } from '@/utils/core';

const INK = '#172033';
const MUTED = '#5B6B82';
const LINE = '#E6EBF2';
const GOLD = '#C69B59';
const fmt = (v: unknown) => (typeof v === 'number' ? fmtScore(v) : 'Sin datos');

/** Parte un rótulo en líneas de hasta `max` caracteres sin cortar palabras. */
export function wrapWords(text: string, max: number): string {
  const out: string[] = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const last = out.length - 1;
    if (last >= 0 && out[last].length + 1 + word.length <= max) out[last] += ` ${word}`;
    else out.push(word);
  }
  return out.join('\n');
}
/** Etiqueta de eje solo para valores enteros (los ejes con margen no rotulan los extremos fraccionarios). */
const intLabel = (v: number) => (Number.isInteger(v) && v >= 0 && v <= 5 ? String(v) : '');
const tooltip = { backgroundColor: '#0B1020', borderWidth: 0, padding: [8, 10], textStyle: { color: '#fff', fontSize: 12, fontFamily: 'Inter, sans-serif' }, extraCssText: 'border-radius:8px;box-shadow:0 12px 30px -12px rgba(11,16,32,.45);' };
const axisLabel = { color: MUTED, fontSize: 11 };
const legendBase = { bottom: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { color: MUTED, fontSize: 11 } };
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** Formato de mes único en los ejes temporales: «ene 2027». */
export const fmtMonth = (t: number | string) => { const d = new Date(typeof t === 'string' ? `${t}T00:00:00` : t); return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };

/** Desplazamiento determinista (no aleatorio) para separar puntos superpuestos. */
const jitter = (id: string, amp: number) => {
  let h = 7;
  for (const c of id) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0;
  return (((h >>> 0) % 1000) / 1000 - 0.5) * 2 * amp;
};

/**
 * Radar de madurez en sentido horario (D02 a la derecha de D01). Una dimensión sin datos no puede
 * dibujarse como cero: solo se usan los ejes con dato en todas las series de resultados (las series
 * de meta no cuentan), de modo que ninguna serie cae al centro.
 */
export function radarOption(indicators: { name: string; full: string }[], series: { name: string; values: (number | null)[]; color: string; dashed?: boolean; area?: boolean }[]): EChartsCoreOption {
  const data = series.filter((s) => !s.dashed);
  const keep = indicators.map((_, i) => data.length > 0 && data.every((s) => s.values[i] !== null && s.values[i] !== undefined));
  // ECharts ubica los ejes en sentido antihorario: se invierte el orden a partir del segundo.
  const idx = indicators.map((_, i) => i).filter((i) => keep[i]);
  const order = idx.length ? [idx[0], ...idx.slice(1).reverse()] : [];
  return {
    tooltip: { ...tooltip, trigger: 'item', formatter: (p: { name: string; value: number[] }) => `${p.name}<br/>${order.map((i, k) => `${indicators[i].name} ${indicators[i].full}: ${fmt(p.value[k])}`).join('<br/>')}` },
    legend: { ...legendBase, icon: 'rect', itemHeight: 4 },
    radar: {
      indicator: order.map((i) => ({ name: indicators[i].name, max: 5, min: 0 })),
      radius: '68%',
      center: ['50%', '48%'],
      startAngle: 90,
      splitNumber: 5,
      axisName: { color: INK, fontSize: 11, fontWeight: 500 },
      splitLine: { lineStyle: { color: LINE } },
      splitArea: { show: false },
      axisLine: { lineStyle: { color: LINE } },
    },
    series: [{
      type: 'radar',
      symbolSize: 5,
      data: series.map((s) => ({
        name: s.name,
        value: order.map((i) => Math.round((s.values[i] as number) * 100) / 100),
        lineStyle: { color: s.color, width: s.dashed ? 1.5 : 2, type: s.dashed ? 'dashed' : 'solid' },
        itemStyle: { color: s.color },
        areaStyle: s.area ? { color: s.color, opacity: 0.08 } : undefined,
      })),
    }],
  };
}

/** Número de ejes que el radar puede representar con datos reales en todas las series de resultados. */
export const radarAxesWithData = (series: { values: (number | null)[]; dashed?: boolean }[], count: number) =>
  Array.from({ length: count }, (_, i) => i).filter((i) => series.filter((s) => !s.dashed).every((s) => s.values[i] !== null && s.values[i] !== undefined)).length;

type BarItem = { value: number; noData?: boolean; itemStyle?: object; label?: object };

export function currentVsTargetOption(labels: string[], current: (number | null)[], target: number[], targetName = 'Meta', opts: { currentName?: string; compare?: { name: string; values: (number | null)[] } } = {}): EChartsCoreOption {
  const curName = opts.currentName ?? 'Actual';
  const noDataBar = (): BarItem => ({ value: 0, noData: true, itemStyle: { color: 'transparent' }, label: { show: true, position: 'right', formatter: 'Sin datos', color: MUTED, fontStyle: 'italic', fontSize: 10 } });
  return {
    tooltip: {
      ...tooltip, trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (ps: { axisValue: string; seriesName: string; data: BarItem | number }[]) => `${ps[0]?.axisValue}<br/>${ps.map((p) => `${p.seriesName}: ${typeof p.data === 'object' && p.data?.noData ? 'Sin datos' : fmt(typeof p.data === 'object' ? p.data.value : p.data)}`).join('<br/>')}`,
    },
    legend: { ...legendBase, data: [curName, ...(opts.compare ? [opts.compare.name] : []), targetName] },
    grid: { left: 8, right: 52, top: 10, bottom: 30, containLabel: true },
    xAxis: { type: 'value', min: 0, max: 5, interval: 1, axisLabel, splitLine: { lineStyle: { color: LINE } } },
    yAxis: { type: 'category', data: labels, inverse: true, axisLabel: { ...axisLabel, color: INK }, axisTick: { show: false }, axisLine: { lineStyle: { color: LINE } } },
    series: [
      {
        name: curName, type: 'bar', barWidth: opts.compare ? 7 : 10, itemStyle: { color: LEVEL_COLORS[3] },
        data: current.map((v): BarItem => (v === null ? noDataBar() : { value: Math.round(v * 100) / 100, itemStyle: { color: LEVEL_COLORS[levelIndex(v)], borderRadius: [0, 2, 2, 0] } })),
        label: { show: true, position: 'right', color: INK, fontSize: 10, backgroundColor: 'rgba(255,255,255,0.92)', padding: [1, 3], borderRadius: 2, formatter: (p: { value: number; data: BarItem }) => (p.data?.noData ? 'Sin datos' : fmt(p.value)) },
      },
      ...(opts.compare ? [{
        name: opts.compare.name, type: 'bar', barWidth: 7, barGap: '30%', itemStyle: { color: '#FFFFFF', borderColor: LEVEL_COLORS[5], borderWidth: 1.5 },
        data: opts.compare.values.map((v): BarItem => (v === null ? noDataBar() : { value: Math.round(v * 100) / 100, itemStyle: { color: '#FFFFFF', borderColor: LEVEL_COLORS[5], borderWidth: 1.5 } })),
        label: { show: true, position: 'right', color: INK, fontSize: 10, backgroundColor: 'rgba(255,255,255,0.92)', padding: [1, 3], borderRadius: 2, formatter: (p: { value: number; data: BarItem }) => (p.data?.noData ? 'Sin datos' : fmt(p.value)) },
      }] : []),
      { name: targetName, type: 'scatter', symbol: 'rect', symbolSize: [3, 16], data: target, itemStyle: { color: GOLD }, z: 5 },
    ],
  };
}

/** Mapa de calor de niveles 0–5 con la paleta secuencial por intervalos y etiquetas con contraste AA. */
export function heatmapOption(rows: string[], cols: string[], cells: (number | null)[][], opts: { valueLabel?: string } = {}): EChartsCoreOption {
  const data: { value: [number, number, number]; label: { color: string }; itemStyle?: { color: string } }[] = [];
  const empty: [number, number, number][] = [];
  cells.forEach((r, i) => r.forEach((v, j) => {
    if (v === null) empty.push([j, i, -1]);
    else data.push({ value: [j, i, Math.round(v * 100) / 100], label: { color: LEVEL_LABEL_COLORS[levelIndex(v)] }, itemStyle: { color: LEVEL_COLORS[levelIndex(v)] } } as (typeof data)[number]);
  }));
  // Con pocas columnas los rótulos se parten por palabras en líneas cortas, para que
  // nombres como «Seguridad de la información» no invadan la columna vecina.
  const wrap = cols.length <= 6;
  const lines = wrap ? cols.map((c) => wrapWords(c, 11)) : cols;
  const maxLines = wrap ? Math.max(1, ...lines.map((l) => l.split('\n').length)) : 1;
  return {
    tooltip: { ...tooltip, formatter: (p: { seriesIndex: number; data: { value: [number, number, number] } | [number, number, number] }) => { const v = Array.isArray(p.data) ? p.data : p.data.value; return `${rows[v[1]]} · ${cols[v[0]]}<br/>${opts.valueLabel ?? 'Valor'}: ${p.seriesIndex === 1 ? 'Sin datos' : fmt(v[2])}`; } },
    grid: { left: 8, right: 12, top: 8, bottom: 8 + (maxLines - 1) * 4, containLabel: true },
    xAxis: { type: 'category', data: cols, axisLabel: { ...axisLabel, interval: 0, rotate: wrap ? 0 : 30, lineHeight: 13, formatter: (_v: string, i: number) => lines[i] }, axisTick: { show: false }, splitArea: { show: false } },
    yAxis: { type: 'category', data: rows, inverse: true, axisLabel: { ...axisLabel, color: INK }, axisTick: { show: false } },
    series: [
      { type: 'heatmap', data, label: { show: true, fontSize: 10, formatter: (p: { data: { value: [number, number, number] } }) => fmt(p.data.value[2]) }, itemStyle: { borderColor: '#fff', borderWidth: 2 }, emphasis: { itemStyle: { borderColor: INK, borderWidth: 1 } } },
      { type: 'heatmap', name: 'Sin datos', data: empty, label: { show: true, fontSize: 10, color: NO_DATA_COLOR, formatter: '—' }, itemStyle: { color: '#F8FAFC', borderColor: '#fff', borderWidth: 2 }, emphasis: { disabled: true } },
    ],
    // En contenedores estrechos las columnas no caben ni partidas: los rótulos se inclinan.
    ...(wrap ? { media: [{ query: { maxWidth: cols.length * 58 + 50 }, option: { grid: { bottom: 8 }, xAxis: { axisLabel: { rotate: 40, formatter: (_v: string, i: number) => cols[i] } } } }] } : {}),
  };
}

/** Matriz de brechas: cada columna tiene el color de su severidad; la intensidad crece con el número de criterios. */
export function gapMatrixOption(rows: string[], counts: number[][]): EChartsCoreOption {
  const cols = [...GAP_BUCKETS.map((b) => b.label), GAP_EVALUATE.label];
  const colColor = [...GAP_BUCKETS.map((b) => b.color), GAP_EVALUATE.color];
  const max = Math.max(1, ...counts.flat());
  const hexA = (hex: string, a: number) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a.toFixed(2)})`;
  const data = counts.flatMap((r, i) => r.map((v, j) => {
    const a = v ? 0.22 + 0.78 * (v / max) : 0;
    return { value: [j, i, v], itemStyle: { color: v ? hexA(colColor[j], a) : '#FFFFFF', borderColor: LINE, borderWidth: 1 }, label: { color: a > 0.6 ? '#FFFFFF' : INK } };
  }));
  return {
    tooltip: { ...tooltip, formatter: (p: { data: { value: [number, number, number] } }) => `${rows[p.data.value[1]]} · ${cols[p.data.value[0]]}<br/>${p.data.value[2]} criterio${p.data.value[2] === 1 ? '' : 's'}` },
    grid: { left: 8, right: 12, top: 30, bottom: 8, containLabel: true },
    xAxis: { type: 'category', position: 'top', data: cols, axisLabel: { ...axisLabel, interval: 0, color: INK, fontWeight: 500 }, axisTick: { show: false }, axisLine: { show: false } },
    yAxis: { type: 'category', data: rows, inverse: true, axisLabel: { ...axisLabel, color: INK }, axisTick: { show: false } },
    series: [{ type: 'heatmap', data, label: { show: true, fontSize: 10, formatter: (p: { data: { value: [number, number, number] } }) => (p.data.value[2] ? String(p.data.value[2]) : '') } }],
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

/** Bandas de cobertura con su color (insuficiente, exploratoria, parcial, alta). */
export const COVERAGE_BAND_COLORS = { insuficiente: STATUS_COLORS.danger, exploratorio: '#D9742F', parcial: '#B38A2E', alta: LEVEL_COLORS[3] } as const;

/**
 * Barras de porcentaje por dimensión. Con `thresholds`, cada barra toma el color de su banda y los
 * umbrales se rotulan fuera del área de las barras, a la derecha.
 */
export function percentBarsOption(labels: string[], values: (number | null)[], opts: { color?: string; thresholds?: { insufficient: number; exploratory: number; partial: number } } = {}): EChartsCoreOption {
  const t = opts.thresholds;
  const bandColor = (v: number) => (!t ? opts.color ?? LEVEL_COLORS[3] : v < t.insufficient ? COVERAGE_BAND_COLORS.insuficiente : v < t.exploratory ? COVERAGE_BAND_COLORS.exploratorio : v < t.partial ? COVERAGE_BAND_COLORS.parcial : COVERAGE_BAND_COLORS.alta);
  return {
    tooltip: { ...tooltip, trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: unknown) => (typeof v === 'number' ? fmtPct(v) : 'Sin datos') },
    legend: t ? { ...legendBase, data: [`< ${t.insufficient} %`, `${t.insufficient}–${t.exploratory} %`, `${t.exploratory}–${t.partial} %`, `≥ ${t.partial} %`] } : undefined,
    grid: { left: 8, right: t ? 52 : 8, top: 44, bottom: t ? 30 : 8, containLabel: true },
    xAxis: { type: 'category', data: labels, axisLabel: { ...axisLabel, interval: 0 }, axisTick: { show: false }, axisLine: { lineStyle: { color: LINE } } },
    yAxis: { type: 'value', min: 0, max: 100, interval: 25, axisLabel: { ...axisLabel, formatter: '{value} %' }, splitLine: { lineStyle: { color: LINE } } },
    series: [
      {
        type: 'bar', barWidth: '50%', name: 'valor',
        data: values.map((v) => (v === null ? { value: null } : { value: Math.round(v * 10) / 10, itemStyle: { color: bandColor(v), borderRadius: [2, 2, 0, 0] } })),
        label: { show: true, position: 'top', rotate: 90, align: 'left', verticalAlign: 'middle', distance: 4, fontSize: 9, color: INK, formatter: (p: { value: number | null }) => (p.value === null ? 'Sin datos' : fmtPct(p.value)) },
        markLine: t ? {
          silent: true, symbol: 'none', z: 1,
          lineStyle: { color: '#94A3B8', type: 'dashed', width: 1 },
          label: { position: 'end', distance: 6, color: MUTED, fontSize: 10, formatter: (p: { value: number }) => `${p.value} %` },
          data: [{ yAxis: t.insufficient }, { yAxis: t.exploratory }, { yAxis: t.partial }],
        } : undefined,
      },
      // Series vacías para la leyenda de bandas.
      ...(t ? [
        { name: `< ${t.insufficient} %`, type: 'bar', data: [], itemStyle: { color: COVERAGE_BAND_COLORS.insuficiente } },
        { name: `${t.insufficient}–${t.exploratory} %`, type: 'bar', data: [], itemStyle: { color: COVERAGE_BAND_COLORS.exploratorio } },
        { name: `${t.exploratory}–${t.partial} %`, type: 'bar', data: [], itemStyle: { color: COVERAGE_BAND_COLORS.parcial } },
        { name: `≥ ${t.partial} %`, type: 'bar', data: [], itemStyle: { color: COVERAGE_BAND_COLORS.alta } },
      ] : []),
    ],
  };
}

/**
 * Discrepancias: los criterios con la misma mediana y el mismo rango se agregan en un solo punto
 * cuyo tamaño y rótulo indican cuántos criterios representa.
 */
export function scatterDiscrepancyOption(points: { id: string; median: number; range: number; n: number }[], threshold = 2): EChartsCoreOption {
  const groups = new Map<string, { median: number; range: number; ids: string[] }>();
  points.forEach((p) => {
    const k = `${p.median}|${p.range}`;
    const g = groups.get(k) ?? { median: p.median, range: p.range, ids: [] };
    g.ids.push(p.id);
    groups.set(k, g);
  });
  const list = [...groups.values()];
  const size = (n: number) => 9 + Math.sqrt(n) * 7;
  const toData = (g: (typeof list)[number]) => ({ value: [g.median, g.range, g.ids.length], ids: g.ids });
  const label = { show: true, fontSize: 10, color: '#fff', fontWeight: 600, formatter: (p: { data: { value: number[] } }) => (p.data.value[2] > 1 ? String(p.data.value[2]) : '') };
  return {
    tooltip: { ...tooltip, formatter: (p: { data: { value: number[]; ids: string[] } }) => `Mediana ${fmt(p.data.value[0])} · rango ${p.data.value[1]}<br/>${p.data.ids.length} criterio${p.data.ids.length === 1 ? '' : 's'}: ${p.data.ids.slice(0, 8).join(', ')}${p.data.ids.length > 8 ? '…' : ''}` },
    legend: { ...legendBase, icon: 'circle', data: [`Discrepancia (rango ≥ ${threshold})`, 'Sin discrepancia'] },
    graphic: [{ type: 'text', right: 12, top: 4, style: { text: 'Tamaño y número: criterios en el mismo punto', fill: MUTED, fontSize: 10 } }],
    grid: { left: 28, right: 16, top: 24, bottom: 52, containLabel: true },
    xAxis: { type: 'value', name: 'Mediana', nameLocation: 'middle', nameGap: 26, min: -0.4, max: 5.4, interval: 1, axisLabel: { ...axisLabel, formatter: intLabel }, nameTextStyle: { color: MUTED }, splitLine: { lineStyle: { color: LINE } }, axisLine: { onZero: false } },
    yAxis: { type: 'value', name: 'Rango', nameLocation: 'middle', nameGap: 28, nameTextStyle: { color: MUTED }, min: -0.4, max: 5.4, interval: 1, axisLabel: { ...axisLabel, formatter: intLabel }, splitLine: { lineStyle: { color: LINE } }, axisLine: { onZero: false } },
    series: [
      { name: `Discrepancia (rango ≥ ${threshold})`, type: 'scatter', data: list.filter((g) => g.range >= threshold).map(toData), symbolSize: (d: number[]) => size(d[2]), itemStyle: { color: STATUS_COLORS.danger, opacity: 0.85 }, label, markArea: { silent: true, itemStyle: { color: 'rgba(185,28,28,0.05)' }, data: [[{ yAxis: threshold - 0.5 }, { yAxis: 5.4 }]] } },
      { name: 'Sin discrepancia', type: 'scatter', data: list.filter((g) => g.range < threshold).map(toData), symbolSize: (d: number[]) => size(d[2]), itemStyle: { color: LEVEL_COLORS[3], opacity: 0.8 }, label },
    ],
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

/** Matriz de riesgos 5×5 con leyenda de bandas (bajo, moderado, alto, crítico). */
export function riskMatrixOption(matrix: number[][]): EChartsCoreOption {
  const bandOf = (p: number, i: number) => RISK_BANDS.find((b) => (p + 1) * (i + 1) <= b.max) ?? RISK_BANDS[3];
  const cells: { band: (typeof RISK_BANDS)[number]; value: [number, number, number] }[] = [];
  matrix.forEach((row, p) => row.forEach((v, i) => cells.push({ band: bandOf(p, i), value: [i, p, v] })));
  const lo = (k: number) => (k === 0 ? 1 : RISK_BANDS[k - 1].max + 1);
  return {
    tooltip: { ...tooltip, formatter: (x: { data: { value: [number, number, number] }; seriesName: string }) => `Probabilidad ${x.data.value[1] + 1} · Impacto ${x.data.value[0] + 1} (valor ${(x.data.value[1] + 1) * (x.data.value[0] + 1)}, ${x.seriesName.split(' ')[0].toLowerCase()})<br/>${x.data.value[2]} riesgo${x.data.value[2] === 1 ? '' : 's'}` },
    legend: { ...legendBase, data: RISK_BANDS.map((b, k) => `${b.label} (${lo(k)}–${b.max})`) },
    grid: { left: 44, right: 12, top: 12, bottom: 64 },
    xAxis: { type: 'category', name: 'Impacto', nameLocation: 'middle', nameGap: 24, data: ['1', '2', '3', '4', '5'], axisLabel, axisTick: { show: false }, nameTextStyle: { color: MUTED } },
    yAxis: { type: 'category', name: 'Probabilidad', nameLocation: 'middle', nameGap: 28, data: ['1', '2', '3', '4', '5'], axisLabel, axisTick: { show: false }, nameTextStyle: { color: MUTED } },
    series: RISK_BANDS.map((b, k) => ({
      name: `${b.label} (${lo(k)}–${b.max})`, type: 'heatmap',
      itemStyle: { color: RISK_BAND_COLORS[b.key], borderColor: '#fff', borderWidth: 3 },
      data: cells.filter((c) => c.band.key === b.key).map((c) => ({ value: c.value, itemStyle: { color: RISK_BAND_COLORS[b.key], opacity: c.value[2] ? 1 : 0.35, borderColor: '#fff', borderWidth: 3 } })),
      label: { show: true, color: b.key === 'bajo' || b.key === 'moderado' ? INK : '#fff', fontSize: 12, fontWeight: 600, formatter: (x: { data: { value: [number, number, number] } }) => (x.data.value[2] ? String(x.data.value[2]) : '') },
    })),
  };
}

/**
 * Matriz impacto–esfuerzo. Los cortes se dibujan en 2,5 (regla: impacto ≥ 3 y esfuerzo ≥ 3). Los
 * puntos superpuestos se separan con un desplazamiento determinista.
 */
export function impactEffortOption(points: { id: string; impact: number; effort: number; score: number; estimated: boolean }[]): EChartsCoreOption {
  const toData = (p: (typeof points)[number]) => ({ value: [p.effort + jitter(p.id, 0.22), p.impact + jitter(`${p.id}#`, 0.22), p.score], id: p.id, impact: p.impact, effort: p.effort });
  const cut = { silent: true, symbol: 'none', lineStyle: { color: '#94A3B8', type: 'dashed' }, label: { show: false } };
  const label = { show: points.length <= 25, formatter: (p: { data: { id: string } }) => p.data.id, position: 'right', fontSize: 9, color: MUTED };
  return {
    tooltip: { ...tooltip, formatter: (p: { seriesName: string; data: { id: string; impact: number; effort: number; value: number[] } }) => `${p.data.id}<br/>Impacto ${p.data.impact} · Esfuerzo ${p.data.effort} (${p.seriesName.toLowerCase()})<br/>Prioridad ${fmt(p.data.value[2])}` },
    legend: { ...legendBase, icon: 'circle', data: ['Estimado', 'Valorado'] },
    grid: { left: 28, right: 16, top: 16, bottom: 52, containLabel: true },
    xAxis: { type: 'value', name: 'Esfuerzo', nameLocation: 'middle', nameGap: 26, nameTextStyle: { color: MUTED }, min: 0, max: 5.5, interval: 1, axisLabel: { ...axisLabel, formatter: (v: number) => (Number.isInteger(v) ? String(v) : '') }, splitLine: { show: false } },
    yAxis: { type: 'value', name: 'Impacto', nameLocation: 'middle', nameGap: 28, nameTextStyle: { color: MUTED }, min: 0, max: 5.5, interval: 1, axisLabel: { ...axisLabel, formatter: (v: number) => (Number.isInteger(v) ? String(v) : '') }, splitLine: { show: false } },
    series: [
      {
        name: 'Estimado', type: 'scatter', data: points.filter((p) => p.estimated).map(toData), symbolSize: (d: number[]) => 8 + d[2] * 3,
        itemStyle: { color: 'rgba(100,116,139,0.6)', borderColor: '#fff', borderWidth: 1 }, label,
        markLine: { ...cut, data: [{ xAxis: 2.5 }, { yAxis: 2.5 }] },
        markArea: {
          silent: true,
          label: { color: MUTED, fontSize: 10, position: 'insideTopLeft' },
          data: [
            [{ name: 'Victorias rápidas', xAxis: 0, yAxis: 2.5, itemStyle: { color: 'rgba(0,105,94,0.06)' } }, { xAxis: 2.5, yAxis: 5.5 }],
            [{ name: 'Proyectos estratégicos', xAxis: 2.5, yAxis: 2.5, itemStyle: { color: 'rgba(24,50,75,0.05)' } }, { xAxis: 5.5, yAxis: 5.5 }],
            [{ name: 'Mejoras menores', xAxis: 0, yAxis: 0, itemStyle: { color: 'rgba(198,155,89,0.06)' } }, { xAxis: 2.5, yAxis: 2.5 }],
            [{ name: 'Requieren reevaluación', xAxis: 2.5, yAxis: 0, itemStyle: { color: 'rgba(185,28,28,0.04)' } }, { xAxis: 5.5, yAxis: 2.5 }],
          ],
        },
      },
      { name: 'Valorado', type: 'scatter', data: points.filter((p) => !p.estimated).map(toData), symbolSize: (d: number[]) => 8 + d[2] * 3, itemStyle: { color: 'rgba(0,105,94,0.85)', borderColor: '#fff', borderWidth: 1 }, label },
    ],
  };
}

/** Línea de tiempo de la hoja de ruta: colores de fase neutros, leyenda, etiquetas completas y meses en el eje. */
export function ganttOption(items: { name: string; start: string; end: string; phase: number }[], phases?: { phase: number; name: string; horizon: string }[], anchor?: string): EChartsCoreOption {
  const t = (d: string) => new Date(`${d}T00:00:00`).getTime();
  const minStart = anchor ?? items.map((i) => i.start).sort()[0];
  const legendNames = (phases ?? [1, 2, 3, 4].map((p) => ({ phase: p, name: '', horizon: '' }))).map((p) => `Fase ${p.phase}${p.horizon ? ` · ${p.horizon}` : ''}`);
  return {
    tooltip: { ...tooltip, formatter: (p: { data: { value: [number, number, number]; name: string; phase: number } }) => `${p.data.name}<br/>Fase ${p.data.phase} · ${new Date(p.data.value[1]).toLocaleDateString('es-CO')} – ${new Date(p.data.value[2]).toLocaleDateString('es-CO')}` },
    legend: { ...legendBase, data: legendNames },
    grid: { left: 8, right: 20, top: 12, bottom: 40, containLabel: true },
    xAxis: { type: 'time', min: minStart ? t(minStart) : undefined, axisLabel: { ...axisLabel, formatter: (v: number) => fmtMonth(v), hideOverlap: true, showMinLabel: true }, splitLine: { lineStyle: { color: LINE } }, minInterval: 30 * 86400000 },
    yAxis: { type: 'category', data: items.map((i) => i.name), inverse: true, axisLabel: { ...axisLabel, color: INK, width: 300, overflow: 'break', lineHeight: 13 }, axisTick: { show: false } },
    series: [
      {
        type: 'custom', name: 'iniciativas',
        renderItem: (_: unknown, api: { value: (i: number) => number; coord: (v: number[]) => number[]; size: (v: number[]) => number[]; style: (o: object) => object }) => {
          const cat = api.value(0);
          const s = api.coord([api.value(1), cat]);
          const e = api.coord([api.value(2), cat]);
          const h = Math.min(16, api.size([0, 1])[1] * 0.55);
          return { type: 'rect', shape: { x: s[0], y: s[1] - h / 2, width: Math.max(2, e[0] - s[0]), height: h, r: 2 }, style: api.style({}) };
        },
        encode: { x: [1, 2], y: 0 },
        data: items.map((it, i) => ({ name: it.name, phase: it.phase, value: [i, t(it.start), t(it.end)], itemStyle: { color: PHASE_COLORS[it.phase - 1] } })),
      },
      ...legendNames.map((n, k) => ({ name: n, type: 'line', data: [], itemStyle: { color: PHASE_COLORS[k] }, lineStyle: { color: PHASE_COLORS[k] } })),
    ],
  };
}

/** Hallazgos por componente MGDA: con brecha, sin brecha y sin evaluar (las mismas categorías que la tabla). */
export function stackedMgdaOption(labels: string[], withGap: number[], ok: number[], notEvaluated: number[]): EChartsCoreOption {
  const lbl = (color: string) => ({ show: true, color, fontSize: 10, formatter: (p: { value: number }) => (p.value ? String(p.value) : '') });
  return {
    tooltip: { ...tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { ...legendBase, data: ['Con brecha', 'Sin brecha', 'Sin evaluar'] },
    grid: { left: 8, right: 12, top: 8, bottom: 34, containLabel: true },
    xAxis: { type: 'value', minInterval: 1, axisLabel, splitLine: { lineStyle: { color: LINE } } },
    yAxis: { type: 'category', data: labels, inverse: true, axisLabel: { ...axisLabel, color: INK }, axisTick: { show: false } },
    series: [
      { name: 'Con brecha', type: 'bar', stack: 't', data: withGap, itemStyle: { color: '#C2410C' }, barWidth: 16, label: lbl('#fff') },
      { name: 'Sin brecha', type: 'bar', stack: 't', data: ok, itemStyle: { color: LEVEL_COLORS[3] }, label: lbl('#fff') },
      { name: 'Sin evaluar', type: 'bar', stack: 't', data: notEvaluated, itemStyle: { color: '#E2E8F0', borderColor: '#94A3B8', borderWidth: 1, borderType: 'dashed' }, label: lbl(INK) },
    ],
  };
}

/** Barras agrupadas por las cinco familias (alternativa al radar). */
export function familyBarsOption(families: { title: string; score: number | null; target: number | null }[], seriesName: string, targetName = 'Meta'): EChartsCoreOption {
  return {
    tooltip: { ...tooltip, trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: unknown) => (typeof v === 'number' ? fmtScore(v) : 'Sin datos') },
    legend: { ...legendBase, data: [seriesName, targetName] },
    grid: { left: 8, right: 12, top: 24, bottom: 34, containLabel: true },
    xAxis: { type: 'category', data: families.map((f) => f.title), axisLabel: { ...axisLabel, interval: 0, width: 96, overflow: 'break', color: INK }, axisTick: { show: false }, axisLine: { lineStyle: { color: LINE } } },
    yAxis: { type: 'value', min: 0, max: 5, interval: 1, axisLabel, splitLine: { lineStyle: { color: LINE } } },
    series: [
      { name: seriesName, type: 'bar', barWidth: 22, itemStyle: { color: LEVEL_COLORS[3] }, data: families.map((f) => (f.score === null ? { value: 0, itemStyle: { color: 'transparent' }, label: { show: true, formatter: 'Sin datos', color: MUTED, fontSize: 10 } } : { value: Math.round(f.score * 100) / 100, itemStyle: { color: LEVEL_COLORS[levelIndex(f.score)], borderRadius: [2, 2, 0, 0] } })), label: { show: true, position: 'top', color: INK, fontSize: 10, formatter: (p: { value: number; data: { itemStyle?: { color?: string } } }) => (p.data?.itemStyle?.color === 'transparent' ? 'Sin datos' : fmtScore(p.value)) } },
      { name: targetName, type: 'bar', barWidth: 22, barGap: '15%', itemStyle: { color: '#fff', borderColor: GOLD, borderWidth: 1.5, borderType: 'dashed' }, data: families.map((f) => (f.target === null ? null : Math.round(f.target * 100) / 100)), label: { show: false } },
    ],
  };
}
