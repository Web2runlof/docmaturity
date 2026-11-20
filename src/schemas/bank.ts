import { z } from 'zod';

const level = z.number().int().min(0).max(5);

export const recommendationSchema = z.object({
  level,
  verb: z.enum(['formular', 'formalizar', 'implementar', 'extender', 'controlar', 'medir', 'evaluar', 'optimizar']),
  text: z.string().min(10),
});

export const questionSchema = z.object({
  id: z.string().regex(/^D(0[1-9]|1[0-5])-Q(0[1-9]|1[0-5])$/),
  bankVersion: z.string(),
  dimensionId: z.string().regex(/^D(0[1-9]|1[0-5])$/),
  order: z.number().int().min(1).max(15),
  criterion: z.string().min(5),
  question: z.string().startsWith('¿').endsWith('?'),
  explanation: z.string().min(20),
  whyItMatters: z.string().min(20),
  glossaryTerms: z.array(z.string()),
  maturityDescriptors: z.array(z.string().min(15)).length(6),
  observableChecks: z.array(z.string().min(3)).min(1),
  examples: z.array(z.string().min(10)).min(1),
  evidenceSuggestions: z.array(z.string().min(3)).min(2),
  sourceRefs: z.array(z.string()).min(1),
  sourceMappingStatus: z.enum(['asociacion_conceptual', 'verificada']),
  mgdaComponent: z.enum(['Estratégico', 'Administración de archivos', 'Documental', 'Tecnológico', 'Cultural']),
  suggestedRespondents: z.array(z.string()).min(1),
  applicabilityRules: z.array(z.enum(['fisico', 'electronico', 'firma', 'nube', 'terceros', 'ia', 'hist', 'datos_personales'])),
  legalApplicability: z.enum(['obligacion_publica', 'obligacion_general', 'sectorial', 'buena_practica']),
  defaultWeight: z.number().positive(),
  criticality: z.enum(['alta', 'media', 'baja']),
  isCritical: z.boolean(),
  minimumRecommendedLevel: level,
  coreTier: z.enum(['quick', 'standard', 'professional']),
  recommendationByLevel: z.array(recommendationSchema).length(6),
  prerequisiteQuestionIds: z.array(z.string()),
  relatedQuestionIds: z.array(z.string()),
  contradictionRules: z.array(z.string()),
  validationGuidance: z.string().min(10),
});

export const dimensionSchema = z.object({
  id: z.string().regex(/^D(0[1-9]|1[0-5])$/),
  name: z.string().min(3),
  defaultWeight: z.number().positive(),
  sourceRefs: z.array(z.string()).min(1),
  mgdaComponent: z.string(),
  summary: z.string().min(20),
  note: z.string().nullable(),
});

export const bankSchema = z.object({
  bankVersion: z.string(),
  methodology: z.string(),
  generatedFrom: z.string(),
  dimensions: z.array(dimensionSchema).length(15),
  questions: z.array(questionSchema).length(225),
});
