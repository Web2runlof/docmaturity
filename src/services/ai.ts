/**
 * Asistente de IA opcional.
 *
 * DOCMATURITY no incorpora claves ni proveedores de IA en el frontend publicado. La única
 * implementación disponible es "manual": la aplicación construye un prompt (anonimizado por
 * defecto) que el evaluador copia en la herramienta de su preferencia, y luego pega la respuesta
 * para revisarla. Ningún dato se envía automáticamente. La CSP de producción (connect-src 'self')
 * bloquea además cualquier conexión externa.
 *
 * La interfaz AIProvider permite que una instalación propia (por ejemplo, un despliegue interno
 * con un intermediario autenticado) agregue un proveedor sin modificar la lógica de los informes.
 */
import type { Analysis } from '@/engine/analyze';
import { currentScore } from '@/engine/scoring';
import { dimensionName, LEVEL_NAMES } from '@/data/bank';
import { getProfile } from '@/data/sector-profiles';
import { levelIndex } from '@/engine/scoring';
import { PROFILE_LABEL } from '@/features/common';

export type AIPurpose = 'resumen_ejecutivo' | 'refinar_recomendaciones' | 'preguntas_validacion' | 'plan_comunicacion';

export const AI_PURPOSES: Record<AIPurpose, { label: string; instruction: string }> = {
  resumen_ejecutivo: {
    label: 'Redactar un resumen ejecutivo',
    instruction: 'Redacta un resumen ejecutivo de máximo 400 palabras dirigido a la alta dirección, con tres prioridades de actuación.',
  },
  refinar_recomendaciones: {
    label: 'Mejorar la redacción de las recomendaciones',
    instruction: 'Mejora la redacción de las recomendaciones prioritarias para que sean claras, accionables y verificables. Conserva el identificador de criterio de cada una.',
  },
  preguntas_validacion: {
    label: 'Proponer preguntas de validación',
    instruction: 'Propón preguntas de seguimiento para aclarar las discrepancias y contradicciones listadas en una sesión de validación con los responsables.',
  },
  plan_comunicacion: {
    label: 'Proponer un plan de comunicación de resultados',
    instruction: 'Propón un plan breve para comunicar los resultados a directivos, responsables de procesos y personal, con mensajes clave diferenciados.',
  },
};

export interface AIRequest {
  purpose: AIPurpose;
  prompt: string;
}

export interface AIResponse {
  text: string;
  provider: string;
  generatedAt: string;
}

export interface AIProvider {
  id: string;
  label: string;
  /** Indica si el proveedor puede invocarse automáticamente en esta instalación. */
  automatic: boolean;
  generate?: (req: AIRequest) => Promise<AIResponse>;
}

/** Proveedor manual: no realiza llamadas de red. */
export const MANUAL_PROVIDER: AIProvider = {
  id: 'manual',
  label: 'Copiar y pegar en una herramienta externa elegida por el evaluador',
  automatic: false,
};

export const AI_PROVIDERS: AIProvider[] = [MANUAL_PROVIDER];

export interface PromptOptions {
  purpose: AIPurpose;
  anonymize: boolean;
  includeNotes: boolean;
}

const n1 = (v: number | null) => (v === null ? 'sin dato' : v.toLocaleString('es-CO', { maximumFractionDigits: 1 }));
const lvl = (v: number | null) => (v === null ? 'sin dato' : `${n1(v)} (${LEVEL_NAMES[levelIndex(v)]})`);

/** Construye el prompt con datos agregados. Con anonimización, no incluye nombres, NIT, sedes ni participantes. */
export function buildAIPrompt(a: Analysis, opts: PromptOptions): string {
  const org = a.organization;
  const profile = getProfile(org.profileId);
  const orgLabel = opts.anonymize ? `la organización evaluada (${profile.label.toLowerCase()})` : `${org.name}${org.shortName ? ` (${org.shortName})` : ''}`;
  const dims = a.dimensions
    .filter((d) => d.applicable > 0)
    .map((d) => `- ${d.dimensionId} ${dimensionName(d.dimensionId)}: actual ${lvl(d.validated ?? d.preliminary)}, objetivo ${d.target}, cobertura ${n1(d.preliminaryCoverage)} %${d.insufficient ? ' (cobertura insuficiente)' : ''}`);
  const gaps = a.priorities.slice(0, 12).map((p) => `- ${p.questionId} ${p.criterion}: actual ${n1(p.current)}, objetivo ${p.target}, prioridad ${n1(p.score)}`);
  const critical = a.critical.map((c) => `- ${c.questionId}: ${c.message}`);
  const contradictions = a.contradictions.map((c) => `- ${c.rule.id}: ${c.rule.message}`);
  const discrepancies = a.alerts.filter((x) => x.kind === 'discrepancia').slice(0, 10).map((x) => `- ${x.questionId}: ${x.message}`);
  const profiles = [...new Set(a.states.flatMap((s) => s.answers.map((x) => x.profile)))].map((p) => PROFILE_LABEL[p as keyof typeof PROFILE_LABEL] ?? p);
  const notes = opts.includeNotes
    ? a.states.filter((s) => s.finding?.justification).slice(0, 15).map((s) => `- ${s.question.id}: ${s.finding?.justification}`)
    : [];

  return [
    'Actúa como consultor en gestión documental y transformación digital en Colombia.',
    AI_PURPOSES[opts.purpose].instruction,
    '',
    'Reglas obligatorias:',
    '1. Usa exclusivamente los datos que siguen; no inventes cifras, hechos, normas ni nombres.',
    '2. No afirmes certificación, cumplimiento normativo oficial ni equivalencia con instrumentos oficiales (MGDA, FURAG, ISO, MoReq).',
    '3. Cita el identificador del criterio (por ejemplo, D05-Q07) cuando hagas una afirmación sobre él.',
    '4. Indica explícitamente las limitaciones derivadas de la cobertura y del nivel de evidencia.',
    '5. Escribe en español de Colombia, con tono profesional y frases claras.',
    '6. No recomiendes adquirir software, digitalizar todo el archivo ni adoptar IA o blockchain sin un problema identificable.',
    '',
    `Contexto: diagnóstico de madurez documental (modelo DIAM 1.0) de ${orgLabel}. Escala de 0 (Inexistente) a 5 (Optimizado).`,
    `Resultado global: ${a.globalValidated.score !== null ? `${a.globalValidated.labelText} ${lvl(a.globalValidated.score)}` : `${a.globalPreliminary.labelText} ${lvl(a.globalPreliminary.score)}`}.`,
    `Cobertura del diagnóstico: ${n1(a.coverage.coverage)} % de los criterios aplicables; cobertura de validación ${n1(a.coverage.validationCoverage)} %; soporte de evidencias ${n1(a.evidence.support)} %; índice orientativo de solidez ${n1(a.solidity.index)}.`,
    `Perfiles entrevistados: ${profiles.join(', ') || 'sin entrevistas registradas'}.`,
    '',
    'Resultados por dimensión:', ...dims,
    '', 'Brechas prioritarias:', ...(gaps.length ? gaps : ['- No se identificaron brechas con puntuación.']),
    '', 'Alertas críticas:', ...(critical.length ? critical : ['- Ninguna.']),
    '', 'Contradicciones detectadas:', ...(contradictions.length ? contradictions : ['- Ninguna.']),
    '', 'Discrepancias entre entrevistados:', ...(discrepancies.length ? discrepancies : ['- Ninguna.']),
    ...(notes.length ? ['', 'Justificaciones de validación registradas por el evaluador:', ...notes] : []),
  ].join('\n');
}

/** Advierte si el texto pegado contiene datos que no deberían estar en el informe. */
export function reviewExternalText(text: string, a: Analysis): string[] {
  const warnings: string[] = [];
  if (/certificad|certificación|cumplimiento oficial|puntaje oficial|resultado oficial/i.test(text)) warnings.push('El texto menciona certificaciones o resultados oficiales. DOCMATURITY no certifica ni emite puntajes oficiales: revise y ajuste la redacción.');
  const ids = text.match(/D\d{2}-Q\d{2}/g) ?? [];
  const known = new Set(a.states.map((s) => s.question.id));
  const unknown = [...new Set(ids.filter((id) => !known.has(id)))];
  if (unknown.length) warnings.push(`Se citan criterios que no forman parte del alcance: ${unknown.join(', ')}.`);
  if (/\b\d{6,10}\b/.test(text)) warnings.push('El texto contiene números largos que podrían corresponder a identificaciones o datos personales.');
  const scored = a.states.filter((s) => currentScore(s) !== null).length;
  if (!scored) warnings.push('La evaluación no tiene criterios puntuados: el texto no puede sustentarse en resultados.');
  return warnings;
}

export const AI_ORIGIN_LABEL = 'Contenido generado externamente mediante IA y revisado por el evaluador';
