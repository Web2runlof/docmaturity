/**
 * Persistencia local en IndexedDB mediante Dexie.
 * IndexedDB es el almacenamiento principal; no constituye un respaldo permanente.
 * Borrar los datos del navegador elimina los diagnósticos locales.
 */
import Dexie, { type Table } from 'dexie';
import type {
  ApplicabilityDecision, ApplicationSettings, Assessment, AssessmentSnapshot, AuditEvent, Department, Evidence, ImportEvent, Interview,
  InterviewAssignment, InterviewRevision, Organization, Participant, PriorityInput, Recommendation, RespondentSession, Response, Risk,
  RoadmapInitiative, ValidatedFinding,
} from '@/types/domain';
import { DEFAULT_THRESHOLDS } from '@/engine/constants';

export const DB_NAME = 'docmaturity';
export const DB_VERSION = 3;

export class DocMaturityDB extends Dexie {
  organizations!: Table<Organization, string>;
  departments!: Table<Department, string>;
  assessments!: Table<Assessment, string>;
  snapshots!: Table<AssessmentSnapshot, string>;
  participants!: Table<Participant, string>;
  assignments!: Table<InterviewAssignment, string>;
  interviews!: Table<Interview, string>;
  interviewRevisions!: Table<InterviewRevision, string>;
  responses!: Table<Response, string>;
  evidence!: Table<Evidence, string>;
  findings!: Table<ValidatedFinding, string>;
  applicability!: Table<ApplicabilityDecision, string>;
  risks!: Table<Risk, string>;
  priorityInputs!: Table<PriorityInput, string>;
  initiatives!: Table<RoadmapInitiative, string>;
  recommendations!: Table<Recommendation, string>;
  auditEvents!: Table<AuditEvent, number>;
  importEvents!: Table<ImportEvent, number>;
  settings!: Table<ApplicationSettings, string>;
  respondentSessions!: Table<RespondentSession, string>;

  constructor(name = DB_NAME) {
    super(name);
    this.version(1).stores({
      organizations: 'id, archived, isDemo, updatedAt',
      departments: 'id, organizationId',
      assessments: 'id, organizationId, status, updatedAt',
      snapshots: 'id, assessmentId',
      participants: 'id, assessmentId',
      assignments: 'id, assessmentId, participantId',
      interviews: 'id, assessmentId, participantId, assignmentId',
      interviewRevisions: 'id, interviewId, assessmentId',
      responses: 'id, interviewId, assessmentId, questionId, [interviewId+questionId]',
      evidence: 'id, assessmentId, questionId',
      findings: 'id, assessmentId, [assessmentId+questionId]',
      applicability: 'id, assessmentId, [assessmentId+questionId]',
      risks: 'id, assessmentId',
      priorityInputs: 'id, assessmentId, [assessmentId+questionId]',
      initiatives: 'id, assessmentId',
      recommendations: 'id, assessmentId',
      auditEvents: '++seq, at, assessmentId',
      importEvents: '++seq, at',
      settings: 'id',
    });
    // Migración v2: sesiones del modo entrevistado y campos nuevos con valores por defecto.
    this.version(2)
      .stores({ respondentSessions: 'id, assignmentId, updatedAt' })
      .upgrade(async (tx) => {
        await tx.table('assessments').toCollection().modify((a: Partial<Assessment>) => {
          a.legalOverrides ??= {};
          a.thresholds = { ...DEFAULT_THRESHOLDS, ...(a.thresholds ?? {}) };
          a.excludedQuestions ??= {};
        });
      });
    // Migración v3: una evaluación con criterios validados queda «En validación»; la hoja de ruta
    // obtiene su fecha de inicio explícita (ancla de las fechas de las iniciativas).
    this.version(3)
      .stores({})
      .upgrade(async (tx) => {
        const withFindings = new Set((await tx.table('findings').toArray()).map((f: ValidatedFinding) => f.assessmentId));
        const firstStart = new Map<string, string>();
        for (const i of (await tx.table('initiatives').toArray()) as RoadmapInitiative[]) {
          const prev = firstStart.get(i.assessmentId);
          if (i.startDate && (!prev || i.startDate < prev)) firstStart.set(i.assessmentId, i.startDate);
        }
        await tx.table('assessments').toCollection().modify((a: Assessment) => {
          if (withFindings.has(a.id) && ['borrador', 'planificacion', 'entrevistas', 'consolidacion'].includes(a.status)) a.status = 'validacion';
          if (!a.roadmapStartDate && firstStart.has(a.id)) a.roadmapStartDate = firstStart.get(a.id);
        });
      });
  }
}

export const db = new DocMaturityDB();

export class StorageQuotaError extends Error {
  constructor() {
    super('El navegador no tiene espacio suficiente para guardar los datos. Exporte una copia de seguridad, elimine adjuntos o evaluaciones que no necesite e intente nuevamente.');
  }
}

/** Ejecuta una operación de escritura traduciendo los errores de cuota a un mensaje comprensible. */
export async function guarded<T>(op: () => Promise<T>): Promise<T> {
  try {
    return await op();
  } catch (e) {
    const name = (e as { name?: string })?.name ?? '';
    const inner = (e as { inner?: { name?: string } })?.inner?.name ?? '';
    if (name === 'QuotaExceededError' || inner === 'QuotaExceededError') throw new StorageQuotaError();
    throw e;
  }
}

export async function logEvent(action: string, entity: string, entityId: string, assessmentId: string | null, detail = ''): Promise<void> {
  try {
    await db.auditEvents.add({ at: new Date().toISOString(), action, entity, entityId, assessmentId, detail: detail.slice(0, 500) });
  } catch {
    // El registro local de acciones es complementario; su fallo no debe interrumpir el trabajo.
  }
}

export const ALL_TABLES = [
  'organizations', 'departments', 'assessments', 'snapshots', 'participants', 'assignments', 'interviews', 'interviewRevisions',
  'responses', 'evidence', 'findings', 'applicability', 'risks', 'priorityInputs', 'initiatives', 'recommendations', 'auditEvents',
  'importEvents', 'respondentSessions',
] as const;
