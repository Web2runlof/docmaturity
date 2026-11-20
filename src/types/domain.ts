import type { DimensionId, Level, Question, RespondentProfile } from './bank';

export type UUID = string;
export type ISODate = string;

/** Respuestas especiales: ninguna se convierte en cero. */
export type SpecialCode =
  | 'NO_SABE'
  | 'NO_APLICA_PROPUESTO'
  | 'NO_APLICA_VALIDADO'
  | 'OMITIDA'
  | 'PENDIENTE'
  | 'NO_ASIGNADA';

export type Tri = 'si' | 'no' | 'desconocido';
export type DataQuality = 'proporcionado' | 'estimado' | 'verificado' | 'desconocido';

export interface CharacterizationField {
  value: string;
  quality: DataQuality;
}

export interface LegalFlags {
  publicFunctions: Tri;
  publicResources: Tri;
  publicServices: Tri;
  sectoralRegulation: string;
  personalData: Tri;
  historicalValue: Tri;
  retentionObligations: string;
  affectedScope: string;
}

export interface Organization {
  id: UUID;
  name: string;
  shortName: string;
  profileId: string;
  nit: string;
  sector: string;
  mainActivity: string;
  department: string;
  municipality: string;
  size: '' | 'micro' | 'pequena' | 'mediana' | 'grande';
  employees: string;
  contractors: string;
  sites: string;
  missionProcesses: string;
  foundedYear: string;
  website: string;
  description: string;
  logoDataUrl: string;
  legalFlags: LegalFlags;
  documentary: Record<string, CharacterizationField>;
  isDemo: boolean;
  isAcademic: boolean;
  archived: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Department {
  id: UUID;
  organizationId: UUID;
  name: string;
}

export type AssessmentModality = 'quick' | 'standard' | 'professional' | 'custom';
export type AssessmentStatus =
  | 'borrador' | 'planificacion' | 'entrevistas' | 'consolidacion' | 'validacion' | 'finalizado' | 'archivado';

export interface WeightConfiguration {
  mode: 'diam' | 'uniforme' | 'personalizada';
  dimensions: Record<string, number>;
  questions: Record<string, number>;
  reason: string;
  changedAt: ISODate | null;
}

export interface Thresholds {
  coverageInsufficient: number;
  coverageExploratory: number;
  coveragePartial: number;
  discrepancyRange: number;
  highScoreWithoutEvidence: number;
}

export interface CustomQuestion {
  id: string;
  dimensionId: DimensionId;
  criterion: string;
  question: string;
  explanation: string;
  maturityDescriptors: string[];
  isCritical: boolean;
  weight: number;
}

export type LegalStatus = 'obligatoria' | 'por_validar' | 'buena_practica';

export interface Target {
  level: number;
  reason: string;
}

export interface Assessment {
  id: UUID;
  organizationId: UUID;
  name: string;
  description: string;
  objective: string;
  modality: AssessmentModality;
  scope: string;
  startDate: string;
  endDate: string;
  lead: string;
  team: string;
  methodologyVersion: string;
  bankVersion: string;
  selectedDimensions: DimensionId[];
  questionIds: string[];
  excludedQuestions: Record<string, string>;
  customQuestions: CustomQuestion[];
  weights: WeightConfiguration;
  defaultTarget: number;
  dimensionTargets: Record<string, Target>;
  questionTargets: Record<string, Target>;
  thresholds: Thresholds;
  legalOverrides: Record<string, LegalStatus>;
  /** Fecha de inicio de la hoja de ruta (ancla de todas las fechas de iniciativas). */
  roadmapStartDate?: string;
  status: AssessmentStatus;
  revision: number;
  isDemo: boolean;
  isAcademic: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface AssessmentSnapshot {
  id: UUID;
  assessmentId: UUID;
  revision: number;
  reason: string;
  createdAt: ISODate;
  data: string;
}

export interface Participant {
  id: UUID;
  assessmentId: UUID;
  code: string;
  profile: RespondentProfile;
  area: string;
  displayName: string;
  createdAt: ISODate;
}

export interface InterviewAssignment {
  id: UUID;
  assessmentId: UUID;
  participantId: UUID;
  questionIds: string[];
  instructions: string;
  dueDate: string;
  createdAt: ISODate;
  exportedAt: ISODate | null;
  contentHash: string | null;
}

export type InterviewMode = 'dirigida' | 'autoadministrada';
export type InterviewStatus = 'en_curso' | 'finalizada';

export interface Interview {
  id: UUID;
  assessmentId: UUID;
  participantId: UUID;
  assignmentId: UUID | null;
  mode: InterviewMode;
  status: InterviewStatus;
  revision: number;
  source: 'local' | 'importada';
  contentHash: string | null;
  notes: string;
  contradictionsNoted: string;
  additionalFindings: string;
  startedAt: ISODate;
  updatedAt: ISODate;
  finishedAt: ISODate | null;
}

export interface InterviewRevision {
  id: UUID;
  interviewId: UUID;
  assessmentId: UUID;
  revision: number;
  contentHash: string;
  importedAt: ISODate;
  status: 'vigente' | 'anterior' | 'pendiente_decision' | 'descartada';
  responses: ResponseData[];
  decisionNote: string;
}

export interface ResponseData {
  questionId: string;
  value: Level | null;
  special: SpecialCode | null;
  note: string;
  flagged: boolean;
  reportedEvidence: string;
  updatedAt: ISODate;
}

export interface Response extends ResponseData {
  id: UUID;
  interviewId: UUID;
  assessmentId: UUID;
  participantId: UUID;
}

export type EvidenceStatus = 'E0' | 'E1' | 'E2' | 'E3';

export interface Evidence {
  id: UUID;
  assessmentId: UUID;
  questionId: string;
  participantId: UUID | null;
  title: string;
  reference: string;
  fileName: string;
  date: string;
  source: string;
  reviewer: string;
  reviewResult: string;
  sampleScope: string;
  status: EvidenceStatus;
  accessRestrictions: string;
  attachment: { name: string; type: string; size: number; data: Blob } | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface ValidatedFinding {
  id: UUID;
  assessmentId: UUID;
  questionId: string;
  preliminaryValue: number | null;
  finalLevel: Level;
  justification: string;
  evidenceIds: UUID[];
  evaluator: string;
  date: string;
  contradictionsResolved: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface ApplicabilityDecision {
  id: UUID;
  assessmentId: UUID;
  questionId: string;
  status: 'validado' | 'rechazado';
  justification: string;
  profileContext: string;
  reviewer: string;
  date: string;
  createdAt: ISODate;
}

export type RiskStatus = 'sugerido' | 'valorado' | 'aceptado' | 'en_tratamiento' | 'residual';

export interface Risk {
  id: UUID;
  assessmentId: UUID;
  libraryId: string;
  title: string;
  description: string;
  questionIds: string[];
  status: RiskStatus;
  probability: number | null;
  impact: number | null;
  residualProbability: number | null;
  residualImpact: number | null;
  owner: string;
  treatment: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface PriorityInput {
  id: UUID;
  assessmentId: UUID;
  questionId: string;
  impact: number | null;
  urgency: number | null;
  enabler: number | null;
  effort: number | null;
  justification: string;
  updatedAt: ISODate;
}

export type InitiativeStatus = 'propuesta' | 'aprobada' | 'en_ejecucion' | 'finalizada' | 'cancelada';

export interface RoadmapInitiative {
  id: UUID;
  assessmentId: UUID;
  templateId: string | null;
  code: string;
  name: string;
  description: string;
  objective: string;
  questionIds: string[];
  riskIds: UUID[];
  dimensions: DimensionId[];
  owner: string;
  areas: string;
  priority: number | null;
  dependencies: UUID[];
  phase: 1 | 2 | 3 | 4;
  startDate: string;
  endDate: string;
  budgetCOP: number | null;
  deliverables: string;
  indicators: string;
  status: InitiativeStatus;
  notes: string;
  impact: number | null;
  effort: number | null;
  order: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Recommendation {
  id: UUID;
  assessmentId: UUID;
  questionId: string;
  level: number;
  text: string;
  status: 'sugerida' | 'aceptada' | 'descartada';
  note: string;
  createdAt: ISODate;
}

export interface AuditEvent {
  seq?: number;
  at: ISODate;
  action: string;
  entity: string;
  entityId: string;
  assessmentId: UUID | null;
  detail: string;
}

export interface ImportEvent {
  seq?: number;
  at: ISODate;
  kind: string;
  fileName: string;
  result: 'aceptado' | 'rechazado' | 'duplicado' | 'revision_pendiente';
  detail: string;
  hash: string;
}

export interface ApplicationSettings {
  id: 'app';
  lastBackupAt: ISODate | null;
  persistentStorageGranted: boolean | null;
  evaluatorName: string;
  acknowledgedLocalStorageNotice: boolean;
}

/** Sesión del modo entrevistado: vive separada de los datos del evaluador. */
export interface RespondentSession {
  id: UUID;
  assignmentId: UUID;
  organizationName: string;
  assessmentName: string;
  participantCode: string;
  profile: RespondentProfile;
  instructions: string;
  dueDate: string;
  bankVersion: string;
  assessmentId: UUID;
  organizationId: UUID;
  questionIds: string[];
  customQuestions: CustomQuestion[];
  responses: Record<string, ResponseData>;
  status: 'en_curso' | 'finalizada';
  exportRevision: number;
  importedAt: ISODate;
  updatedAt: ISODate;
}

/** Conjunto de datos de una evaluación que consume el motor. */
export interface AssessmentBundle {
  assessment: Assessment;
  organization: Organization;
  participants: Participant[];
  interviews: Interview[];
  responses: Response[];
  evidence: Evidence[];
  findings: ValidatedFinding[];
  applicability: ApplicabilityDecision[];
  risks: Risk[];
  priorityInputs: PriorityInput[];
  initiatives: RoadmapInitiative[];
}

export type QuestionLike = Pick<
  Question,
  'id' | 'dimensionId' | 'criterion' | 'isCritical' | 'defaultWeight' | 'coreTier' | 'mgdaComponent' | 'criticality' | 'prerequisiteQuestionIds'
> & Partial<Question>;
