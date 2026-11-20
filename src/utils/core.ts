/** Utilidades transversales: identificadores, hash canónico, JSON seguro, formato y sanitización. */

export const uuid = (): string => crypto.randomUUID();
export const nowISO = (): string => new Date().toISOString();
export const todayISO = (): string => localISODate(new Date());

/** Serialización canónica (claves ordenadas) para calcular hashes reproducibles. */
export function canonicalJSON(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJSON).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJSON(obj[k])}`).join(',')}}`;
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Hash SHA-256 del contenido de un paquete, excluyendo el propio campo hash. */
export async function packageHash(pkg: Record<string, unknown>): Promise<string> {
  const { hash: _omit, ...rest } = pkg;
  return sha256Hex(canonicalJSON(rest));
}

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export class UnsafeContentError extends Error {}

/** JSON.parse que rechaza claves capaces de contaminar prototipos. */
export function safeParseJSON(text: string): unknown {
  return JSON.parse(text, (key, value) => {
    if (DANGEROUS_KEYS.has(key)) throw new UnsafeContentError(`Campo no permitido en el archivo: ${key}`);
    return value;
  });
}

/** Evita la inyección de fórmulas en hojas de cálculo y CSV. */
export function sanitizeCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

/** Texto plano seguro: elimina caracteres de control (React ya escapa HTML). */
export function plainText(value: string, max = 20000): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, max);
}

export const fmtNumber = (v: number | null | undefined, digits = 1): string =>
  v === null || v === undefined || !Number.isFinite(v) ? '—' : v.toLocaleString('es-CO', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/**
 * Formatos numéricos únicos de la aplicación (coma decimal, es-CO):
 * - madurez, brechas y prioridades: 2 decimales (2,60);
 * - porcentajes: 1 decimal (91,6 %).
 */
export const SCORE_DECIMALS = 2;
export const PCT_DECIMALS = 1;

export const fmtScore = (v: number | null | undefined, fallback = '—'): string =>
  v === null || v === undefined || !Number.isFinite(v) ? fallback : v.toLocaleString('es-CO', { minimumFractionDigits: SCORE_DECIMALS, maximumFractionDigits: SCORE_DECIMALS });

export const fmtPct = (v: number | null | undefined, fallback = 'Sin datos'): string =>
  v === null || v === undefined || !Number.isFinite(v) ? fallback : `${v.toLocaleString('es-CO', { minimumFractionDigits: PCT_DECIMALS, maximumFractionDigits: PCT_DECIMALS })} %`;

/** Pluralización real: plural(2, 'regla', 'reglas') → «2 reglas». */
export const plural = (n: number, one: string, many: string): string => `${n.toLocaleString('es-CO')} ${n === 1 ? one : many}`;

/** Enumeración natural en español: «A, B y C». */
export function listEs(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

/**
 * Minúscula inicial para insertar un nombre dentro de una oración, sin alterar siglas
 * ni códigos («IA», «SGDEA», «D11-Q07»).
 */
export function lowerFirst(s: string): string {
  if (!s) return s;
  const first = s.split(/[\s,;:()]/)[0];
  if (first.length > 1 && first === first.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(first)) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** Fecha local AAAA-MM-DD (sin desplazamiento por zona horaria). */
export function localISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fmtDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-CO', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' });
}

export const fmtCOP = (v: number | null | undefined): string =>
  v === null || v === undefined ? '—' : v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export function fmtBytes(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toLocaleString('es-CO', { maximumFractionDigits: 1 })} ${units[i]}`;
}

export function slugify(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 60) || 'docmaturity';
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export const downloadJSON = (data: unknown, fileName: string) =>
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), fileName);

export async function readFileText(file: File, maxBytes: number): Promise<string> {
  if (file.size > maxBytes) throw new Error(`El archivo supera el tamaño máximo permitido (${fmtBytes(maxBytes)}).`);
  return file.text();
}

export const cx = (...c: (string | false | null | undefined)[]): string => c.filter(Boolean).join(' ');
