import bankJson from './question-bank/bank.generated.json';
import sourcesJson from './sources/sources.json';
import glossaryJson from './glossary.json';
import type {
  CoreTier, Dimension, DimensionId, GlossaryTerm, Question, QuestionBank, SourceReference,
} from '@/types/bank';
import type { Assessment, CustomQuestion } from '@/types/domain';

export const BANK = bankJson as unknown as QuestionBank;
export const BANK_VERSION = BANK.bankVersion;
export const METHODOLOGY_VERSION = 'DIAM 1.0';
export const DIMENSIONS: Dimension[] = BANK.dimensions;
export const QUESTIONS: Question[] = BANK.questions;
export const SOURCES = sourcesJson as unknown as SourceReference[];
export const GLOSSARY = glossaryJson as unknown as GlossaryTerm[];
export const DIMENSION_IDS = DIMENSIONS.map((d) => d.id);

const questionIndex = new Map(QUESTIONS.map((q) => [q.id, q]));
const dimensionIndex = new Map(DIMENSIONS.map((d) => [d.id, d]));
const sourceIndex = new Map(SOURCES.map((s) => [s.id, s]));

export const getQuestion = (id: string): Question | undefined => questionIndex.get(id);
export const getDimension = (id: string): Dimension | undefined => dimensionIndex.get(id as DimensionId);
export const getSource = (id: string): SourceReference | undefined => sourceIndex.get(id);
export const dimensionName = (id: string): string => getDimension(id)?.name ?? id;

/**
 * Componente MGDA predominante de una dimensión, calculado a partir del componente de cada criterio
 * (fuente de verdad). Cada criterio conserva su propio componente.
 */
const familyIndex = new Map(DIMENSIONS.map((d) => {
  const counts = new Map<string, number>();
  QUESTIONS.filter((q) => q.dimensionId === d.id).forEach((q) => counts.set(q.mgdaComponent, (counts.get(q.mgdaComponent) ?? 0) + 1));
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? d.mgdaComponent;
  return [d.id, top as Question['mgdaComponent']];
}));
export const getDimensionFamily = (id: string): Question['mgdaComponent'] => familyIndex.get(id as DimensionId) ?? 'Estratégico';

/** Conteo de criterios por dimensión y componente MGDA (para la tabla de Metodología). */
export function componentMatrix(): { dimensionId: DimensionId; counts: Record<string, number> }[] {
  return DIMENSIONS.map((d) => {
    const counts: Record<string, number> = {};
    QUESTIONS.filter((q) => q.dimensionId === d.id).forEach((q) => (counts[q.mgdaComponent] = (counts[q.mgdaComponent] ?? 0) + 1));
    return { dimensionId: d.id, counts };
  });
}

const TIER_RANK: Record<CoreTier, number> = { quick: 0, standard: 1, professional: 2 };

/** Selección no aleatoria basada en el coreTier del banco: cada modalidad incluye a la anterior. */
export function questionIdsForTier(tier: CoreTier, dimensions: DimensionId[] = DIMENSION_IDS): string[] {
  const set = new Set(dimensions);
  return QUESTIONS.filter((q) => set.has(q.dimensionId) && TIER_RANK[q.coreTier] <= TIER_RANK[tier]).map((q) => q.id);
}

export function customToQuestion(c: CustomQuestion): Question {
  const descriptors = c.maturityDescriptors.length === 6 ? c.maturityDescriptors : Array.from({ length: 6 }, (_, i) => `Nivel ${i} definido por el evaluador.`);
  return {
    id: c.id,
    bankVersion: 'custom',
    dimensionId: c.dimensionId,
    order: 100,
    criterion: c.criterion,
    question: c.question,
    explanation: c.explanation,
    whyItMatters: 'Pregunta incorporada por el equipo evaluador para esta evaluación.',
    glossaryTerms: [],
    maturityDescriptors: descriptors,
    observableChecks: [],
    examples: [],
    evidenceSuggestions: [],
    sourceRefs: [],
    sourceMappingStatus: 'asociacion_conceptual',
    mgdaComponent: getDimension(c.dimensionId)?.mgdaComponent ?? 'Estratégico',
    suggestedRespondents: [],
    applicabilityRules: [],
    legalApplicability: 'buena_practica',
    defaultWeight: c.weight > 0 ? c.weight : 1,
    criticality: c.isCritical ? 'alta' : 'media',
    isCritical: c.isCritical,
    minimumRecommendedLevel: c.isCritical ? 3 : 2,
    coreTier: 'professional',
    recommendationByLevel: descriptors.map((_, level) => ({
      level: level as 0 | 1 | 2 | 3 | 4 | 5,
      verb: (['formular', 'formalizar', 'implementar', 'controlar', 'evaluar', 'optimizar'] as const)[level],
      text: 'Recomendación por definir por el evaluador para esta pregunta personalizada.',
    })),
    prerequisiteQuestionIds: [],
    relatedQuestionIds: [],
    contradictionRules: [],
    validationGuidance: 'Pregunta personalizada: definir criterios de validación en la mesa de validación.',
    custom: true,
  };
}

/** Preguntas del universo de una evaluación (banco oficial + preguntas propias), en orden del banco. */
export function questionsForAssessment(a: Pick<Assessment, 'questionIds' | 'customQuestions'>): Question[] {
  const custom = new Map(a.customQuestions.map((c) => [c.id, customToQuestion(c)]));
  return a.questionIds
    .map((id) => questionIndex.get(id) ?? custom.get(id))
    .filter((q): q is Question => Boolean(q))
    .sort((x, y) => x.dimensionId.localeCompare(y.dimensionId) || x.order - y.order || x.id.localeCompare(y.id));
}

export function lookupQuestion(id: string, customQuestions: CustomQuestion[] = []): Question | undefined {
  const q = questionIndex.get(id);
  if (q) return q;
  const c = customQuestions.find((x) => x.id === id);
  return c ? customToQuestion(c) : undefined;
}

export const LEVEL_NAMES = ['Inexistente', 'Inicial', 'En desarrollo', 'Definido', 'Gestionado', 'Optimizado'] as const;
export const LEVEL_DESCRIPTIONS = [
  'No se identifica capacidad, control o práctica organizacional.',
  'Prácticas informales, aisladas, dependientes de personas y predominantemente reactivas.',
  'Existen capacidades parciales, iniciativas o controles con un grado limitado de formalización o implementación.',
  'Capacidades formalizadas, implementadas y razonablemente consistentes dentro del alcance definido.',
  'Capacidades controladas, monitoreadas, medidas y evaluadas.',
  'Capacidades sostenibles y sujetas a mejora continua basada en evidencia.',
] as const;
