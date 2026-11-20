import type { EvidenceStatus, Thresholds } from '@/types/domain';

/** Factores de soporte de evidencia: convenciones metodológicas del DIAM. */
export const EVIDENCE_FACTOR: Record<EvidenceStatus, number> = { E0: 0, E1: 0.25, E2: 0.6, E3: 1 };

export const EVIDENCE_LABEL: Record<EvidenceStatus, string> = {
  E0: 'Sin evidencia disponible',
  E1: 'Reportada, no revisada',
  E2: 'Revisada parcialmente',
  E3: 'Revisada y suficiente',
};

export const DEFAULT_THRESHOLDS: Thresholds = {
  coverageInsufficient: 50,
  coverageExploratory: 70,
  coveragePartial: 90,
  discrepancyRange: 2,
  highScoreWithoutEvidence: 4,
};

export const DEFAULT_TARGET = 3;

export const SOLIDITY_WEIGHTS = { coverage: 0.4, evidence: 0.4, agreement: 0.2 } as const;

export const PRIORITY_WEIGHTS = { gap: 0.3, impact: 0.25, criticality: 0.2, urgency: 0.15, enabler: 0.1 } as const;

export const RISK_BANDS = [
  { max: 4, label: 'Bajo', key: 'bajo' },
  { max: 9, label: 'Moderado', key: 'moderado' },
  { max: 16, label: 'Alto', key: 'alto' },
  { max: 25, label: 'Crítico', key: 'critico' },
] as const;

export const SPECIAL_LABEL: Record<string, string> = {
  NO_SABE: 'No sabe',
  NO_APLICA_PROPUESTO: 'No aplica (propuesto)',
  NO_APLICA_VALIDADO: 'No aplica (validado)',
  OMITIDA: 'Omitida',
  PENDIENTE: 'Pendiente',
  NO_ASIGNADA: 'No asignada',
};

/** Efecto de cada respuesta especial sobre el cálculo y la cobertura (texto para la interfaz). */
export const SPECIAL_EFFECT: Record<string, string> = {
  NO_SABE: 'No se cuenta como cero; el criterio queda sin puntuación y reduce la cobertura.',
  NO_APLICA_PROPUESTO: 'Propuesta del participante; no se cuenta como cero, reduce la cobertura hasta que el evaluador decida.',
  NO_APLICA_VALIDADO: 'Decisión del evaluador; retira el criterio del alcance aplicable, por lo que no reduce la cobertura.',
  OMITIDA: 'No se cuenta como cero; reduce la cobertura.',
  PENDIENTE: 'Pregunta asignada sin respuesta; reduce la cobertura.',
  NO_ASIGNADA: 'La pregunta no forma parte de la entrevista de esa persona; no reduce la cobertura.',
};

/**
 * Paleta secuencial única de madurez (0 → 5): luminosidad decreciente de ocre a azul profundo.
 * Se usa en barras, etiquetas, escala y mapas de calor. Cada color tiene contraste ≥ 3:1 frente al
 * blanco (elementos gráficos, WCAG 1.4.11). Sobre los niveles 0 y 1 el texto va en tinta oscura;
 * sobre los niveles 2 a 5, en blanco (contraste ≥ 4,5:1). El color nunca es el único portador del estado.
 */
export const LEVEL_COLORS = ['#C98040', '#A08735', '#447C51', '#00695E', '#004F5E', '#18324B'] as const;
export const LEVEL_LABEL_COLORS = ['#0F202D', '#0F202D', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF'] as const;
export const NO_DATA_COLOR = '#94A3B8';

/** Colores semánticos de estado (independientes de la escala de madurez). */
export const STATUS_COLORS = { danger: '#B91C1C', warning: '#B45309', ok: '#3F7D5C', neutral: '#64748B' } as const;

/** Fases de la hoja de ruta: gama neutra, sin reutilizar los colores de madurez. */
export const PHASE_COLORS = ['#1E293B', '#3F5468', '#5F7488', '#7D8FA0'] as const;

/** Rangos de brecha por criterio y color de severidad de cada columna. */
export const GAP_BUCKETS = [
  { key: 'sin_brecha', label: 'Sin brecha', color: '#3F7D5C', test: (g: number) => g === 0 },
  { key: 'b1', label: '≤ 1', color: '#D9A441', test: (g: number) => g > 0 && g <= 1 },
  { key: 'b2', label: '> 1–2', color: '#D9742F', test: (g: number) => g > 1 && g <= 2 },
  { key: 'b3', label: '> 2–< 3', color: '#C2410C', test: (g: number) => g > 2 && g < 3 },
  { key: 'b4', label: '≥ 3', color: '#991B1B', test: (g: number) => g >= 3 },
] as const;
export const GAP_EVALUATE = { key: 'evaluar', label: 'Evaluar', color: NO_DATA_COLOR } as const;

/** Colores de las bandas de riesgo (probabilidad × impacto). */
export const RISK_BAND_COLORS: Record<'bajo' | 'moderado' | 'alto' | 'critico', string> = {
  bajo: '#7FA88E', moderado: '#E2B65C', alto: '#D9742F', critico: '#B91C1C',
};

/**
 * Lecturas diferenciadas: particiones de las 15 dimensiones. Se calculan como promedio ponderado
 * de las dimensiones del subconjunto con los pesos de dimensión vigentes (igual que la madurez global).
 */
export const LENS_DIMENSIONS = {
  organizational: ['D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D12', 'D13', 'D15'],
  technological: ['D07', 'D08', 'D09', 'D10', 'D11', 'D14'],
} as const;

/** Criterios que describen capacidades funcionales de sistemas (captura, retención, integridad, metadatos, portabilidad). */
export const SYSTEM_CAPABILITY_IDS = ['D07-Q02', 'D07-Q05', 'D07-Q09', 'D07-Q13', 'D07-Q14', 'D07-Q15', 'D08-Q04', 'D08-Q05', 'D08-Q12', 'D09-Q01', 'D09-Q07', 'D09-Q11', 'D09-Q14'] as const;

/** Un nivel validado igual o superior a este valor exige evidencia E2 o E3 para considerarse sustentado. */
export const VALIDATED_EVIDENCE_LEVEL = 3;
