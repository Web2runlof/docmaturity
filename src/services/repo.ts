/**
 * Operaciones de datos con integridad aplicada desde la capa de aplicación.
 * Las operaciones dependientes se ejecutan en transacciones de IndexedDB y no dejan registros huérfanos.
 */
import type { DimensionId, Level, RespondentProfile } from '@/types/bank';
import type {
  ApplicabilityDecision, Assessment, AssessmentBundle, AssessmentModality, Evidence, Interview, InterviewAssignment, Organization,
  Participant, PriorityInput, Response, ResponseData, Risk, RoadmapInitiative, ValidatedFinding,
} from '@/types/domain';
import { db, guarded, logEvent } from '@/database/db';
import { BANK_VERSION, DIMENSIONS, DIMENSION_IDS, METHODOLOGY_VERSION, questionIdsForTier, questionsForAssessment } from '@/data/bank';
import { DEFAULT_TARGET, DEFAULT_THRESHOLDS } from '@/engine/constants';
import { EMPTY_LEGAL_FLAGS, getProfile } from '@/data/sector-profiles';
import { INITIATIVE_TEMPLATES } from '@/data/recommendations/initiatives';
import { PHASES, addDays, addMonths, daysBetween, monthsBetween, scheduleInitiatives, type ProposedInitiative, type ScheduledSlot } from '@/engine/recommendations';
import type { SuggestedRisk } from '@/engine/risk';
import { nowISO, todayISO, uuid } from '@/utils/core';

// ───────────────────────── Organizaciones ─────────────────────────

export function newOrganization(partial: Partial<Organization> = {}): Organization {
  const now = nowISO();
  const profile = getProfile(partial.profileId ?? 'otro');
  return {
    id: uuid(), name: '', shortName: '', profileId: profile.id, nit: '', sector: '', mainActivity: '', department: '', municipality: '',
    size: '', employees: '', contractors: '', sites: '', missionProcesses: '', foundedYear: '', website: '', description: '', logoDataUrl: '',
    legalFlags: { ...EMPTY_LEGAL_FLAGS, ...profile.defaultFlags }, documentary: {}, isDemo: false, isAcademic: false, archived: false,
    createdAt: now, updatedAt: now, ...partial,
  };
}

export async function saveOrganization(org: Organization, departments?: string[]): Promise<void> {
  await guarded(() => db.transaction('rw', db.organizations, db.departments, db.auditEvents, async () => {
    const existed = await db.organizations.get(org.id);
    await db.organizations.put({ ...org, updatedAt: nowISO() });
    if (departments) {
      await db.departments.where('organizationId').equals(org.id).delete();
      await db.departments.bulkPut(departments.map((name) => name.trim()).filter(Boolean).map((name) => ({ id: uuid(), organizationId: org.id, name })));
    }
    await logEvent(existed ? 'actualizar' : 'crear', 'organización', org.id, null, org.name);
  }));
}

export async function duplicateOrganization(id: string): Promise<string> {
  const org = await db.organizations.get(id);
  if (!org) throw new Error('Organización no encontrada');
  const deps = await db.departments.where('organizationId').equals(id).toArray();
  const copy = { ...org, id: uuid(), name: `${org.name} (copia)`, createdAt: nowISO(), updatedAt: nowISO(), archived: false };
  await saveOrganization(copy, deps.map((d) => d.name));
  return copy.id;
}

export async function setOrganizationArchived(id: string, archived: boolean): Promise<void> {
  await guarded(() => db.organizations.update(id, { archived, updatedAt: nowISO() }));
  await logEvent(archived ? 'archivar' : 'restaurar', 'organización', id, null);
}

export async function organizationDependencies(id: string) {
  const assessments = await db.assessments.where('organizationId').equals(id).toArray();
  const aids = assessments.map((a) => a.id);
  const [participants, interviews, responses, evidence] = await Promise.all([
    db.participants.where('assessmentId').anyOf(aids).count(),
    db.interviews.where('assessmentId').anyOf(aids).count(),
    db.responses.where('assessmentId').anyOf(aids).count(),
    db.evidence.where('assessmentId').anyOf(aids).count(),
  ]);
  return { assessments: assessments.length, participants, interviews, responses, evidence };
}

async function deleteAssessmentData(aid: string): Promise<void> {
  await Promise.all([
    db.snapshots.where('assessmentId').equals(aid).delete(),
    db.participants.where('assessmentId').equals(aid).delete(),
    db.assignments.where('assessmentId').equals(aid).delete(),
    db.interviews.where('assessmentId').equals(aid).delete(),
    db.interviewRevisions.where('assessmentId').equals(aid).delete(),
    db.responses.where('assessmentId').equals(aid).delete(),
    db.evidence.where('assessmentId').equals(aid).delete(),
    db.findings.where('assessmentId').equals(aid).delete(),
    db.applicability.where('assessmentId').equals(aid).delete(),
    db.risks.where('assessmentId').equals(aid).delete(),
    db.priorityInputs.where('assessmentId').equals(aid).delete(),
    db.initiatives.where('assessmentId').equals(aid).delete(),
    db.recommendations.where('assessmentId').equals(aid).delete(),
  ]);
  await db.assessments.delete(aid);
}

const ASSESSMENT_TABLES = [
  db.assessments, db.snapshots, db.participants, db.assignments, db.interviews, db.interviewRevisions, db.responses, db.evidence,
  db.findings, db.applicability, db.risks, db.priorityInputs, db.initiatives, db.recommendations, db.auditEvents,
];

export async function deleteOrganization(id: string): Promise<void> {
  await db.transaction('rw', [db.organizations, db.departments, ...ASSESSMENT_TABLES], async () => {
    const aids = (await db.assessments.where('organizationId').equals(id).toArray()).map((a) => a.id);
    for (const aid of aids) await deleteAssessmentData(aid);
    await db.departments.where('organizationId').equals(id).delete();
    await db.organizations.delete(id);
    await logEvent('eliminar', 'organización', id, null, `${aids.length === 1 ? "1 evaluación eliminada" : `${aids.length} evaluaciones eliminadas`}`);
  });
}

// ───────────────────────── Evaluaciones ─────────────────────────

export function diamWeights(): Record<string, number> {
  return Object.fromEntries(DIMENSIONS.map((d) => [d.id, d.defaultWeight]));
}

export function newAssessment(organizationId: string, modality: AssessmentModality, partial: Partial<Assessment> = {}): Assessment {
  const dims = (partial.selectedDimensions?.length ? partial.selectedDimensions : DIMENSION_IDS) as DimensionId[];
  const tier = modality === 'custom' ? 'professional' : modality;
  const now = nowISO();
  return {
    id: uuid(), organizationId, name: '', description: '', objective: '', modality, scope: '', startDate: todayISO(), endDate: '', lead: '', team: '',
    methodologyVersion: METHODOLOGY_VERSION, bankVersion: BANK_VERSION, selectedDimensions: dims,
    questionIds: questionIdsForTier(tier, dims), excludedQuestions: {}, customQuestions: [],
    weights: { mode: 'diam', dimensions: diamWeights(), questions: {}, reason: '', changedAt: null },
    defaultTarget: DEFAULT_TARGET, dimensionTargets: {}, questionTargets: {}, thresholds: { ...DEFAULT_THRESHOLDS }, legalOverrides: {},
    status: 'borrador', revision: 1, isDemo: false, isAcademic: false, createdAt: now, updatedAt: now, ...partial,
  };
}

export async function saveAssessment(a: Assessment, action = 'actualizar'): Promise<void> {
  await guarded(() => db.assessments.put({ ...a, updatedAt: nowISO() }));
  await logEvent(action, 'evaluación', a.id, a.id, a.name);
}

export async function updateAssessment(id: string, patch: Partial<Assessment>, action = 'actualizar'): Promise<void> {
  const a = await db.assessments.get(id);
  if (!a) throw new Error('Evaluación no encontrada');
  if (a.status === 'finalizado' && !('status' in patch)) throw new Error('La evaluación está finalizada. Reábrala explícitamente para modificarla.');
  await saveAssessment({ ...a, ...patch }, action);
}

/** Reapertura explícita: conserva una instantánea de la revisión anterior y crea una nueva revisión. */
export async function reopenAssessment(id: string, reason: string): Promise<void> {
  if (!reason.trim()) throw new Error('Indique el motivo de la reapertura.');
  await db.transaction('rw', [...ASSESSMENT_TABLES, db.organizations], async () => {
    const bundle = await loadBundle(id);
    if (!bundle) throw new Error('Evaluación no encontrada');
    await db.snapshots.add({ id: uuid(), assessmentId: id, revision: bundle.assessment.revision, reason, createdAt: nowISO(), data: JSON.stringify(bundle) });
    await db.assessments.update(id, { status: 'validacion', revision: bundle.assessment.revision + 1, updatedAt: nowISO() });
    await logEvent('reabrir', 'evaluación', id, id, `Revisión ${bundle.assessment.revision + 1}: ${reason}`);
  });
}

export async function deleteAssessment(id: string): Promise<void> {
  await db.transaction('rw', ASSESSMENT_TABLES, async () => {
    await deleteAssessmentData(id);
    await logEvent('eliminar', 'evaluación', id, null);
  });
}

export async function loadBundle(aid: string): Promise<AssessmentBundle | null> {
  const assessment = await db.assessments.get(aid);
  if (!assessment) return null;
  const organization = await db.organizations.get(assessment.organizationId);
  if (!organization) return null;
  const [participants, interviews, responses, evidence, findings, applicability, risks, priorityInputs, initiatives] = await Promise.all([
    db.participants.where('assessmentId').equals(aid).toArray(),
    db.interviews.where('assessmentId').equals(aid).toArray(),
    db.responses.where('assessmentId').equals(aid).toArray(),
    db.evidence.where('assessmentId').equals(aid).toArray(),
    db.findings.where('assessmentId').equals(aid).toArray(),
    db.applicability.where('assessmentId').equals(aid).toArray(),
    db.risks.where('assessmentId').equals(aid).toArray(),
    db.priorityInputs.where('assessmentId').equals(aid).toArray(),
    db.initiatives.where('assessmentId').equals(aid).toArray(),
  ]);
  return { assessment, organization, participants, interviews, responses, evidence, findings, applicability, risks, priorityInputs, initiatives };
}

// ───────────────────────── Participantes y asignaciones ─────────────────────────

/** Asignación sugerida de dimensiones por perfil (modificable). */
export const PROFILE_DIMENSIONS: Partial<Record<RespondentProfile, DimensionId[]>> = {
  direccion: ['D01', 'D02', 'D03', 'D15'],
  planeacion: ['D01', 'D02', 'D04', 'D15'],
  gestion_documental: ['D01', 'D04', 'D05', 'D06', 'D07', 'D09', 'D11', 'D12'],
  archivo: ['D05', 'D06', 'D11', 'D12'],
  tecnologia: ['D07', 'D08', 'D09', 'D10', 'D11', 'D14'],
  seguridad: ['D08', 'D10', 'D11', 'D14'],
  juridica: ['D02', 'D05', 'D07', 'D10'],
  financiera: ['D03', 'D08', 'D15'],
  talento_humano: ['D02', 'D12'],
  gobierno_datos: ['D09', 'D10', 'D13', 'D14'],
  control_interno: ['D02', 'D10', 'D15'],
  usuarios: ['D04', 'D07', 'D12', 'D13'],
  calidad: ['D01', 'D04', 'D15'],
  procesos: ['D04', 'D07', 'D13'],
  proveedores: ['D08', 'D10'],
};

/** Núcleo compartido entre perfiles para facilitar la triangulación. */
export const SHARED_CORE = ['D01-Q01', 'D02-Q03', 'D05-Q07', 'D07-Q08', 'D10-Q04', 'D11-Q01', 'D12-Q10', 'D15-Q09'];

export function suggestedQuestionsFor(a: Pick<Assessment, 'questionIds' | 'customQuestions'>, profile: RespondentProfile, includeShared = true): string[] {
  const dims = new Set(PROFILE_DIMENSIONS[profile] ?? DIMENSION_IDS);
  const scope = questionsForAssessment(a);
  const ids = scope.filter((q) => dims.has(q.dimensionId)).map((q) => q.id);
  if (includeShared) for (const id of SHARED_CORE) if (a.questionIds.includes(id) && !ids.includes(id)) ids.push(id);
  const order = new Map(scope.map((q, i) => [q.id, i]));
  return ids.sort((x, y) => (order.get(x) ?? 0) - (order.get(y) ?? 0));
}

export async function addParticipant(assessmentId: string, data: Pick<Participant, 'code' | 'profile' | 'area' | 'displayName'>): Promise<Participant> {
  const code = data.code.trim();
  if (!code) throw new Error('Indique un código o seudónimo para el participante.');
  const exists = await db.participants.where('assessmentId').equals(assessmentId).filter((p) => p.code.toLowerCase() === code.toLowerCase()).count();
  if (exists) throw new Error('Ya existe un participante con ese código en esta evaluación.');
  const p: Participant = { id: uuid(), assessmentId, ...data, code, createdAt: nowISO() };
  await guarded(() => db.participants.add(p));
  await logEvent('crear', 'participante', p.id, assessmentId, code);
  return p;
}

export async function deleteParticipant(id: string): Promise<void> {
  await db.transaction('rw', [db.participants, db.assignments, db.interviews, db.interviewRevisions, db.responses, db.evidence, db.auditEvents], async () => {
    const p = await db.participants.get(id);
    if (!p) return;
    const interviews = await db.interviews.where('participantId').equals(id).toArray();
    for (const i of interviews) {
      await db.responses.where('interviewId').equals(i.id).delete();
      await db.interviewRevisions.where('interviewId').equals(i.id).delete();
    }
    await db.interviews.where('participantId').equals(id).delete();
    await db.assignments.where('participantId').equals(id).delete();
    await db.evidence.where('assessmentId').equals(p.assessmentId).filter((e) => e.participantId === id).modify({ participantId: null });
    await db.participants.delete(id);
    await logEvent('eliminar', 'participante', id, p.assessmentId, p.code);
  });
}

export async function saveAssignment(data: Omit<InterviewAssignment, 'id' | 'createdAt' | 'exportedAt' | 'contentHash'> & { id?: string }): Promise<InterviewAssignment> {
  const { id, ...rest } = data;
  const existing = id ? await db.assignments.get(id) : undefined;
  const a: InterviewAssignment = {
    ...rest,
    id: existing?.id ?? uuid(), createdAt: existing?.createdAt ?? nowISO(), exportedAt: existing?.exportedAt ?? null, contentHash: existing?.contentHash ?? null,
  };
  if (!a.questionIds.length) throw new Error('La asignación debe incluir al menos una pregunta.');
  await guarded(() => db.assignments.put(a));
  await logEvent(existing ? 'actualizar' : 'crear', 'asignación', a.id, a.assessmentId, `${a.questionIds.length} preguntas`);
  return a;
}

// ───────────────────────── Entrevistas y respuestas ─────────────────────────

export async function startDirectedInterview(assessmentId: string, participantId: string, assignmentId: string | null): Promise<Interview> {
  const existing = await db.interviews.where('participantId').equals(participantId).filter((i) => i.mode === 'dirigida').first();
  if (existing) return existing;
  const now = nowISO();
  const i: Interview = {
    id: uuid(), assessmentId, participantId, assignmentId, mode: 'dirigida', status: 'en_curso', revision: 1, source: 'local', contentHash: null,
    notes: '', contradictionsNoted: '', additionalFindings: '', startedAt: now, updatedAt: now, finishedAt: null,
  };
  await guarded(() => db.interviews.add(i));
  await db.assessments.where('id').equals(assessmentId).modify((a) => {
    if (a.status === 'borrador' || a.status === 'planificacion') a.status = 'entrevistas';
  });
  await logEvent('iniciar', 'entrevista', i.id, assessmentId, 'Entrevista dirigida');
  return i;
}

export async function upsertResponse(interview: Pick<Interview, 'id' | 'assessmentId' | 'participantId'>, questionId: string, patch: Partial<ResponseData>): Promise<void> {
  await guarded(() => db.transaction('rw', db.responses, db.interviews, async () => {
    const existing = await db.responses.where('[interviewId+questionId]').equals([interview.id, questionId]).first();
    const now = nowISO();
    const base: Response = existing ?? {
      id: uuid(), interviewId: interview.id, assessmentId: interview.assessmentId, participantId: interview.participantId, questionId,
      value: null, special: null, note: '', flagged: false, reportedEvidence: '', updatedAt: now,
    };
    const next: Response = { ...base, ...patch, updatedAt: now };
    if (patch.value !== undefined && patch.value !== null) next.special = null;
    if (patch.special !== undefined && patch.special !== null) next.value = null;
    if (next.value !== null && (!Number.isInteger(next.value) || next.value < 0 || next.value > 5)) throw new Error('Nivel de madurez no válido.');
    await db.responses.put(next);
    await db.interviews.update(interview.id, { updatedAt: now });
  }));
}

export async function setInterviewStatus(id: string, status: Interview['status']): Promise<void> {
  await guarded(() => db.interviews.update(id, { status, updatedAt: nowISO(), finishedAt: status === 'finalizada' ? nowISO() : null }));
  const i = await db.interviews.get(id);
  await logEvent(status === 'finalizada' ? 'finalizar' : 'reabrir', 'entrevista', id, i?.assessmentId ?? null);
}

export async function updateInterviewNotes(id: string, patch: Pick<Partial<Interview>, 'notes' | 'contradictionsNoted' | 'additionalFindings'>): Promise<void> {
  await guarded(() => db.interviews.update(id, { ...patch, updatedAt: nowISO() }));
}

/** Omitir sección: marca como OMITIDA solo las preguntas sin respuesta de la dimensión. */
export async function skipSection(interview: Pick<Interview, 'id' | 'assessmentId' | 'participantId'>, questionIds: string[]): Promise<number> {
  const existing = await db.responses.where('interviewId').equals(interview.id).toArray();
  const answered = new Set(existing.filter((r) => r.value !== null || r.special !== null).map((r) => r.questionId));
  const pending = questionIds.filter((q) => !answered.has(q));
  for (const q of pending) await upsertResponse(interview, q, { special: 'OMITIDA' });
  return pending.length;
}

// ───────────────────────── Evidencias, hallazgos y aplicabilidad ─────────────────────────

export function newEvidence(assessmentId: string, questionId: string, partial: Partial<Evidence> = {}): Evidence {
  const now = nowISO();
  return {
    id: uuid(), assessmentId, questionId, participantId: null, title: '', reference: '', fileName: '', date: '', source: '', reviewer: '', reviewResult: '',
    sampleScope: '', status: 'E1', accessRestrictions: '', attachment: null, createdAt: now, updatedAt: now, ...partial,
  };
}

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export async function saveEvidence(e: Evidence): Promise<void> {
  if (e.attachment && e.attachment.size > MAX_ATTACHMENT_BYTES) throw new Error('El adjunto supera el límite de 5 MB. Registre una referencia al documento en su lugar.');
  if (e.status === 'E3' && !e.reviewer.trim()) throw new Error('Para marcar una evidencia como suficiente (E3) indique quién la revisó.');
  await guarded(() => db.evidence.put({ ...e, updatedAt: nowISO() }));
  await logEvent('guardar', 'evidencia', e.id, e.assessmentId, `${e.questionId} · ${e.status}`);
}

export async function deleteEvidence(id: string): Promise<void> {
  const e = await db.evidence.get(id);
  await db.evidence.delete(id);
  await logEvent('eliminar', 'evidencia', id, e?.assessmentId ?? null);
}

export async function saveFinding(data: Omit<ValidatedFinding, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  if (!data.justification.trim()) throw new Error('La validación requiere una justificación.');
  if (!data.evaluator.trim()) throw new Error('Identifique al evaluador que valida el criterio.');
  if (!Number.isInteger(data.finalLevel) || data.finalLevel < 0 || data.finalLevel > 5) throw new Error('El nivel final debe ser un entero entre 0 y 5.');
  await guarded(() => db.transaction('rw', db.findings, db.auditEvents, db.assessments, async () => {
    const existing = await db.findings.where('[assessmentId+questionId]').equals([data.assessmentId, data.questionId]).first();
    const now = nowISO();
    await db.findings.put({ ...data, id: existing?.id ?? uuid(), createdAt: existing?.createdAt ?? now, updatedAt: now });
    await logEvent('validar', 'criterio', data.questionId, data.assessmentId, `Preliminar ${data.preliminaryValue ?? 's. d.'} → final ${data.finalLevel}`);
    await db.assessments.where('id').equals(data.assessmentId).modify((a) => {
      if (['borrador', 'planificacion', 'entrevistas', 'consolidacion'].includes(a.status)) a.status = 'validacion';
    });
  }));
}

export async function deleteFinding(assessmentId: string, questionId: string): Promise<void> {
  await db.findings.where('[assessmentId+questionId]').equals([assessmentId, questionId]).delete();
  await logEvent('retirar validación', 'criterio', questionId, assessmentId);
}

export async function setApplicabilityDecision(d: Omit<ApplicabilityDecision, 'id' | 'createdAt'> | { assessmentId: string; questionId: string; remove: true }): Promise<void> {
  await guarded(() => db.transaction('rw', db.applicability, db.auditEvents, async () => {
    await db.applicability.where('[assessmentId+questionId]').equals([d.assessmentId, d.questionId]).delete();
    if ('remove' in d) {
      await logEvent('retirar no aplicabilidad', 'criterio', d.questionId, d.assessmentId);
      return;
    }
    if (!d.justification.trim() || !d.reviewer.trim()) throw new Error('La decisión de no aplicabilidad requiere justificación y revisor.');
    await db.applicability.add({ ...d, id: uuid(), createdAt: nowISO() });
    await logEvent(`no aplicabilidad ${d.status}`, 'criterio', d.questionId, d.assessmentId, d.justification);
  }));
}

// ───────────────────────── Riesgos, priorización y hoja de ruta ─────────────────────────

export async function addSuggestedRisks(assessmentId: string, suggestions: SuggestedRisk[]): Promise<number> {
  const existing = await db.risks.where('assessmentId').equals(assessmentId).toArray();
  const have = new Set(existing.map((r) => r.libraryId));
  const now = nowISO();
  const toAdd: Risk[] = suggestions.filter((s) => !have.has(s.libraryId)).map((s) => ({
    id: uuid(), assessmentId, libraryId: s.libraryId, title: s.title, description: s.description, questionIds: s.questionIds, status: 'sugerido',
    probability: null, impact: null, residualProbability: null, residualImpact: null, owner: '', treatment: '', createdAt: now, updatedAt: now,
  }));
  await guarded(() => db.risks.bulkAdd(toAdd));
  if (toAdd.length) await logEvent('incorporar riesgos', 'riesgo', assessmentId, assessmentId, `${toAdd.length} riesgos sugeridos`);
  return toAdd.length;
}

export async function saveRisk(r: Risk): Promise<void> {
  for (const v of [r.probability, r.impact, r.residualProbability, r.residualImpact]) {
    if (v !== null && (!Number.isInteger(v) || v < 1 || v > 5)) throw new Error('Probabilidad e impacto deben ser enteros entre 1 y 5.');
  }
  const status = r.status === 'sugerido' && r.probability !== null && r.impact !== null ? 'valorado' : r.status;
  await guarded(() => db.risks.put({ ...r, status, updatedAt: nowISO() }));
}

export async function deleteRisk(id: string): Promise<void> {
  await db.risks.delete(id);
}

export async function savePriorityInput(assessmentId: string, questionId: string, patch: Partial<PriorityInput>): Promise<void> {
  await guarded(() => db.transaction('rw', db.priorityInputs, async () => {
    const existing = await db.priorityInputs.where('[assessmentId+questionId]').equals([assessmentId, questionId]).first();
    const base: PriorityInput = existing ?? { id: uuid(), assessmentId, questionId, impact: null, urgency: null, enabler: null, effort: null, justification: '', updatedAt: nowISO() };
    await db.priorityInputs.put({ ...base, ...patch, updatedAt: nowISO() });
  }));
}

/** Fecha de inicio de la hoja de ruta: la guardada en la evaluación o, en su defecto, el cierre o el inicio de la evaluación. */
export const roadmapAnchor = (a: Pick<Assessment, 'roadmapStartDate' | 'endDate' | 'startDate'>): string => a.roadmapStartDate || a.endDate || a.startDate || todayISO();

const slotOf = (i: RoadmapInitiative, anchor: string): ScheduledSlot => ({
  phase: i.phase, startMonth: monthsBetween(anchor, i.startDate), endMonth: monthsBetween(anchor, i.endDate), startDate: i.startDate, endDate: i.endDate, moved: false,
});

/** Genera o completa la hoja de ruta a partir de las iniciativas propuestas sin sobrescribir ediciones. */
export async function generateRoadmap(assessment: Assessment, proposals: ProposedInitiative[]): Promise<number> {
  const existing = await db.initiatives.where('assessmentId').equals(assessment.id).toArray();
  const byTemplate = new Map(existing.filter((i) => i.templateId).map((i) => [i.templateId as string, i]));
  const anchor = roadmapAnchor(assessment);
  const now = nowISO();
  const created: RoadmapInitiative[] = [];
  let order = existing.length;
  for (const p of proposals) {
    if (byTemplate.has(p.template.id)) continue;
    const ph = PHASES[p.phase - 1];
    const ini: RoadmapInitiative = {
      id: uuid(), assessmentId: assessment.id, templateId: p.template.id, code: `INI-${String(++order).padStart(2, '0')}`,
      name: p.template.name, description: p.template.description, objective: p.template.objective, questionIds: p.questionIds, riskIds: [],
      dimensions: [...new Set(p.questionIds.map((q) => q.slice(0, 3)))] as DimensionId[], owner: p.template.owner, areas: '',
      priority: p.priority === null ? null : Math.round(p.priority * 100) / 100, dependencies: [], phase: p.phase,
      startDate: addMonths(anchor, ph.startMonth), endDate: addMonths(anchor, ph.endMonth), budgetCOP: null, deliverables: p.template.deliverables,
      indicators: p.template.indicators, status: 'propuesta', notes: '', impact: null, effort: null, order, createdAt: now, updatedAt: now,
    };
    created.push(ini);
    byTemplate.set(p.template.id, ini);
  }
  // Resolver dependencias entre iniciativas a partir de las plantillas.
  for (const ini of created) {
    const proposal = proposals.find((p) => p.template.id === ini.templateId);
    ini.dependencies = (proposal?.dependsOn ?? []).map((t) => byTemplate.get(t)?.id).filter((x): x is string => Boolean(x));
  }
  // Fechas: una dependiente inicia cuando termina su prerrequisito (o pasa a la fase siguiente).
  // Las iniciativas ya guardadas conservan sus fechas.
  const fixed = new Map(existing.map((i) => [i.id, slotOf(i, anchor)]));
  const slots = scheduleInitiatives([...existing, ...created], anchor, fixed);
  for (const ini of created) {
    const s = slots.get(ini.id);
    if (s) Object.assign(ini, { phase: s.phase, startDate: s.startDate, endDate: s.endDate });
  }
  await guarded(() => db.initiatives.bulkAdd(created));
  if (created.length) await logEvent('generar hoja de ruta', 'iniciativa', assessment.id, assessment.id, `${created.length} iniciativas`);
  return created.length;
}

/** Reprograma todas las iniciativas desde la fecha de inicio respetando dependencias (fases como mínimo). */
export async function rescheduleRoadmap(assessmentId: string): Promise<number> {
  const a = await db.assessments.get(assessmentId);
  if (!a) throw new Error('Evaluación no encontrada');
  const items = await db.initiatives.where('assessmentId').equals(assessmentId).toArray();
  const slots = scheduleInitiatives(items, roadmapAnchor(a));
  let changed = 0;
  await guarded(() => db.transaction('rw', db.initiatives, async () => {
    for (const i of items) {
      const s = slots.get(i.id);
      if (!s || (s.phase === i.phase && s.startDate === i.startDate && s.endDate === i.endDate)) continue;
      changed += 1;
      await db.initiatives.update(i.id, { phase: s.phase, startDate: s.startDate, endDate: s.endDate, updatedAt: nowISO() });
    }
  }));
  if (changed) await logEvent('reprogramar hoja de ruta', 'iniciativa', assessmentId, assessmentId, `${changed} iniciativas`);
  return changed;
}

/** Cambia la fecha de inicio de la hoja de ruta y desplaza todas las fechas en la misma cantidad de días. */
export async function setRoadmapStart(assessmentId: string, date: string): Promise<void> {
  const a = await db.assessments.get(assessmentId);
  if (!a) throw new Error('Evaluación no encontrada');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Indique una fecha válida.');
  const prev = roadmapAnchor(a);
  const delta = daysBetween(prev, date);
  await guarded(() => db.transaction('rw', db.assessments, db.initiatives, async () => {
    await db.assessments.update(assessmentId, { roadmapStartDate: date, updatedAt: nowISO() });
    if (delta) {
      const items = await db.initiatives.where('assessmentId').equals(assessmentId).toArray();
      for (const i of items) await db.initiatives.update(i.id, { startDate: addDays(i.startDate, delta), endDate: addDays(i.endDate, delta), updatedAt: nowISO() });
    }
  }));
  await logEvent('fecha de inicio de la hoja de ruta', 'evaluación', assessmentId, assessmentId, date);
}

/**
 * Mueve una iniciativa a otra fase y reprograma esa iniciativa y las que dependen de ella (directa o
 * indirectamente). Las demás conservan sus fechas. Devuelve la fase final y los códigos reprogramados.
 */
export async function moveInitiative(id: string, phase: 1 | 2 | 3 | 4): Promise<{ phase: number; rescheduled: string[] }> {
  const target = await db.initiatives.get(id);
  if (!target) throw new Error('Iniciativa no encontrada');
  const a = await db.assessments.get(target.assessmentId);
  if (!a) throw new Error('Evaluación no encontrada');
  const items = await db.initiatives.where('assessmentId').equals(target.assessmentId).toArray();
  const by = new Map(items.map((i) => [i.id, i]));
  if (target.dependencies.some((d) => (by.get(d)?.phase ?? 1) > phase)) throw new Error('La iniciativa no puede ubicarse en una fase anterior a la de las iniciativas de las que depende.');
  const affected = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const i of items) if (!affected.has(i.id) && i.dependencies.some((d) => affected.has(d))) { affected.add(i.id); grew = true; }
  }
  const anchor = roadmapAnchor(a);
  const fixed = new Map(items.filter((i) => !affected.has(i.id)).map((i) => [i.id, slotOf(i, anchor)]));
  const next = items.map((i) => (i.id === id ? { ...i, phase } : affected.has(i.id) ? { ...i, phase: Math.max(i.phase, phase) as 1 | 2 | 3 | 4 } : i));
  const slots = scheduleInitiatives(next, anchor, fixed);
  const rescheduled: string[] = [];
  await guarded(() => db.transaction('rw', db.initiatives, async () => {
    for (const i of items.filter((x) => affected.has(x.id))) {
      const sl = slots.get(i.id);
      if (!sl) continue;
      if (i.id !== id && (sl.phase !== i.phase || sl.startDate !== i.startDate || sl.endDate !== i.endDate)) rescheduled.push(i.code);
      await db.initiatives.update(i.id, { phase: sl.phase, startDate: sl.startDate, endDate: sl.endDate, updatedAt: nowISO() });
    }
  }));
  return { phase: slots.get(id)?.phase ?? phase, rescheduled };
}

export function newInitiative(assessmentId: string, order: number): RoadmapInitiative {
  const now = nowISO();
  return {
    id: uuid(), assessmentId, templateId: null, code: `INI-${String(order + 1).padStart(2, '0')}`, name: 'Nueva iniciativa', description: '', objective: '',
    questionIds: [], riskIds: [], dimensions: [], owner: '', areas: '', priority: null, dependencies: [], phase: 2, startDate: todayISO(),
    endDate: addMonths(todayISO(), 3), budgetCOP: null, deliverables: '', indicators: '', status: 'propuesta', notes: '', impact: null, effort: null,
    order, createdAt: now, updatedAt: now,
  };
}

export async function saveInitiative(i: RoadmapInitiative): Promise<void> {
  if (i.startDate && i.endDate && i.endDate < i.startDate) throw new Error('La fecha de finalización no puede ser anterior a la de inicio.');
  const others = await db.initiatives.where('assessmentId').equals(i.assessmentId).toArray();
  const late = i.dependencies.map((d) => others.find((o) => o.id === d)).filter((o): o is RoadmapInitiative => Boolean(o && o.endDate && i.startDate < o.endDate));
  if (late.length) throw new Error(`La iniciativa no puede iniciar antes de que termine ${late.map((o) => `${o.code} (${o.endDate})`).join(', ')}.`);
  const early = others.filter((o) => o.id !== i.id && o.dependencies.includes(i.id) && i.endDate && o.startDate < i.endDate);
  if (early.length) throw new Error(`${early.map((o) => o.code).join(', ')} depende${early.length === 1 ? '' : 'n'} de esta iniciativa e iniciaría${early.length === 1 ? '' : 'n'} antes de que termine. Ajuste las fechas o use «Reprogramar según dependencias».`);
  if (i.budgetCOP !== null && (!Number.isFinite(i.budgetCOP) || i.budgetCOP < 0)) throw new Error('El presupuesto debe ser un valor positivo en pesos colombianos.');
  await guarded(() => db.initiatives.put({ ...i, updatedAt: nowISO() }));
}

export async function deleteInitiative(id: string): Promise<void> {
  await db.transaction('rw', db.initiatives, async () => {
    const i = await db.initiatives.get(id);
    if (!i) return;
    await db.initiatives.where('assessmentId').equals(i.assessmentId).modify((x) => {
      x.dependencies = x.dependencies.filter((d) => d !== id);
    });
    await db.initiatives.delete(id);
  });
}

export const templateName = (id: string | null) => INITIATIVE_TEMPLATES.find((t) => t.id === id)?.name ?? null;

export const LEVELS: Level[] = [0, 1, 2, 3, 4, 5];
