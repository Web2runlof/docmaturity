/** Estadística descriptiva básica. Todas las funciones son puras y deterministas. */

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function mean(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Desviación estándar descriptiva (poblacional). Requiere al menos dos datos. */
export function stdDev(values: number[]): number | null {
  if (values.length < 2) return null;
  const m = mean(values) as number;
  return Math.sqrt(values.reduce((a, v) => a + (v - m) ** 2, 0) / values.length);
}

/** Promedio ponderado ignorando valores nulos. Devuelve null si no hay pesos positivos. */
export function weightedMean(items: { value: number | null; weight: number }[]): number | null {
  let num = 0;
  let den = 0;
  for (const it of items) {
    if (it.value === null || !Number.isFinite(it.value) || it.weight <= 0) continue;
    num += it.value * it.weight;
    den += it.weight;
  }
  return den > 0 ? num / den : null;
}

/** División segura: devuelve null cuando el denominador es cero. */
export function ratio(num: number, den: number): number | null {
  return den > 0 ? num / den : null;
}

export function round(value: number | null, digits = 2): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
