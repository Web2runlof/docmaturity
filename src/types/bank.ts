/** Tipos del banco metodológico DIAM. El contenido se valida con Zod en src/schemas/bank.ts. */

export type DimensionId =
  | 'D01' | 'D02' | 'D03' | 'D04' | 'D05' | 'D06' | 'D07' | 'D08'
  | 'D09' | 'D10' | 'D11' | 'D12' | 'D13' | 'D14' | 'D15';

export type Level = 0 | 1 | 2 | 3 | 4 | 5;
export type CoreTier = 'quick' | 'standard' | 'professional';
export type Criticality = 'alta' | 'media' | 'baja';
export type MgdaComponent = 'Estratégico' | 'Administración de archivos' | 'Documental' | 'Tecnológico' | 'Cultural';
export type LegalApplicability = 'obligacion_publica' | 'obligacion_general' | 'sectorial' | 'buena_practica';
export type ApplicabilityCondition = 'fisico' | 'electronico' | 'firma' | 'nube' | 'terceros' | 'ia' | 'hist' | 'datos_personales';
export type RecommendationVerb = 'formular' | 'formalizar' | 'implementar' | 'extender' | 'controlar' | 'medir' | 'evaluar' | 'optimizar';

export type RespondentProfile =
  | 'direccion' | 'planeacion' | 'gestion_documental' | 'archivo' | 'tecnologia' | 'seguridad'
  | 'juridica' | 'control_interno' | 'financiera' | 'talento_humano' | 'calidad' | 'gobierno_datos'
  | 'procesos' | 'usuarios' | 'proveedores' | 'otros';

export interface RecommendationByLevel {
  level: Level;
  verb: RecommendationVerb;
  text: string;
}

export interface Question {
  id: string;
  bankVersion: string;
  dimensionId: DimensionId;
  order: number;
  criterion: string;
  question: string;
  explanation: string;
  whyItMatters: string;
  glossaryTerms: string[];
  maturityDescriptors: string[];
  observableChecks: string[];
  examples: string[];
  evidenceSuggestions: string[];
  sourceRefs: string[];
  sourceMappingStatus: 'asociacion_conceptual' | 'verificada';
  mgdaComponent: MgdaComponent;
  suggestedRespondents: RespondentProfile[];
  applicabilityRules: ApplicabilityCondition[];
  legalApplicability: LegalApplicability;
  defaultWeight: number;
  criticality: Criticality;
  isCritical: boolean;
  minimumRecommendedLevel: number;
  coreTier: CoreTier;
  recommendationByLevel: RecommendationByLevel[];
  prerequisiteQuestionIds: string[];
  relatedQuestionIds: string[];
  contradictionRules: string[];
  validationGuidance: string;
  /** true para preguntas propias de una evaluación (namespace CUS-). */
  custom?: boolean;
}

export interface Dimension {
  id: DimensionId;
  name: string;
  defaultWeight: number;
  sourceRefs: string[];
  mgdaComponent: MgdaComponent;
  summary: string;
  note: string | null;
}

export interface QuestionBank {
  bankVersion: string;
  methodology: string;
  generatedFrom: string;
  dimensions: Dimension[];
  questions: Question[];
}

export type SourceType =
  | 'norma_juridica' | 'estandar_tecnico' | 'modelo_madurez' | 'modelo_requisitos'
  | 'metodologia' | 'buena_practica' | 'referente_academico' | 'modelo_gestion';

export type VerificationStatus = 'verificado' | 'verificado_parcial' | 'referencia_conceptual' | 'no_verificado';

export interface SourceReference {
  id: string;
  shortLabel: string;
  group: string;
  title: string;
  author: string;
  version: string;
  year: number | null;
  type: SourceType;
  urls: string[];
  consultedAt: string;
  scope: string;
  evaluates: string;
  notEvaluates: string;
  relation: string;
  verifiedParts: string;
  accessLimitations: string;
  verificationStatus: VerificationStatus;
  dimensions: DimensionId[];
}

export interface GlossaryTerm {
  id: string;
  term: string;
  aliases: string[];
  category: string;
  refs: string[];
  definition: string;
}
