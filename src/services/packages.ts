/**
 * Portabilidad sin servidor: paquetes de asignación, entrevista, evaluación y respaldo.
 * No existe transmisión automática: los archivos se comparten por canales autorizados y los
 * resultados solo se consideran recibidos cuando el evaluador los importa.
 */
import type { CustomQuestion, Evidence, Interview, InterviewRevision, ResponseData, RespondentSession } from '@/types/domain';
import { ALL_TABLES, DB_VERSION, db, guarded, logEvent } from '@/database/db';
import { BANK_VERSION, METHODOLOGY_VERSION } from '@/data/bank';
import {
  PACKAGE_LIMITS, PACKAGE_SCHEMA_VERSION, assessmentPackageSchema, assignmentPackageSchema, backupPackageSchema, interviewPackageSchema,
  type AssessmentPackage, type AssignmentPackage, type BackupPackage, type InterviewPackage,
} from '@/schemas/packages';
import { nowISO, packageHash, safeParseJSON, uuid } from '@/utils/core';

export const APP_VERSION = '1.0.0';

export class PackageError extends Error {}

function ensureSize(text: string, limit: number) {
  if (new Blob([text]).size > limit) throw new PackageError('El archivo supera el tamaño máximo permitido para este tipo de paquete.');
}

async function verifyHash(pkg: { hash: string } & Record<string, unknown>) {
  const h = await packageHash(pkg);
  if (h !== pkg.hash) throw new PackageError('La verificación de integridad falló: el contenido del archivo fue modificado o está dañado.');
}

function ensureVersion(v: number) {
  if (v > PACKAGE_SCHEMA_VERSION) throw new PackageError(`El archivo usa una versión de esquema más reciente (${v}). Actualice DOCMATURITY para importarlo.`);
  if (v < 1) throw new PackageError('Versión de esquema no reconocida.');
}

const zodMessage = (e: { issues: { path: PropertyKey[]; message: string }[] }) =>
  `Estructura no válida: ${e.issues.slice(0, 3).map((i) => `${i.path.join('.') || 'archivo'} — ${i.message}`).join('; ')}`;

// ───────────────────────── Asignación (evaluador → entrevistado) ─────────────────────────

export async function buildAssignmentPackage(assignmentId: string): Promise<AssignmentPackage> {
  const asg = await db.assignments.get(assignmentId);
  if (!asg) throw new PackageError('Asignación no encontrada.');
  const [assessment, participant] = await Promise.all([db.assessments.get(asg.assessmentId), db.participants.get(asg.participantId)]);
  if (!assessment || !participant) throw new PackageError('La asignación está incompleta.');
  const org = await db.organizations.get(assessment.organizationId);
  if (!org) throw new PackageError('Organización no encontrada.');
  const custom: CustomQuestion[] = assessment.customQuestions.filter((c) => asg.questionIds.includes(c.id));
  const base = {
    format: 'docmaturity.assignment' as const,
    schemaVersion: PACKAGE_SCHEMA_VERSION,
    assignmentId: asg.id,
    assessmentId: assessment.id,
    organizationId: org.id,
    organizationName: org.shortName || org.name,
    assessmentName: assessment.name,
    participantCode: participant.code,
    profile: participant.profile,
    questionIds: asg.questionIds,
    customQuestions: custom,
    bankVersion: assessment.bankVersion,
    instructions: asg.instructions,
    createdAt: asg.createdAt,
    dueDate: asg.dueDate,
  };
  const hash = await packageHash(base);
  await db.assignments.update(asg.id, { exportedAt: nowISO(), contentHash: hash });
  await logEvent('exportar', 'asignación', asg.id, assessment.id, participant.code);
  return { ...base, hash };
}

/** Modo entrevistado: importa una asignación y crea o reanuda la sesión local. */
export async function importAssignmentPackage(text: string): Promise<{ session: RespondentSession; resumed: boolean; bankWarning: string | null }> {
  ensureSize(text, PACKAGE_LIMITS.assignment);
  const raw = safeParseJSON(text);
  const parsed = assignmentPackageSchema.safeParse(raw);
  if (!parsed.success) throw new PackageError(zodMessage(parsed.error));
  const pkg = parsed.data;
  ensureVersion(pkg.schemaVersion);
  await verifyHash(pkg);
  const existing = await db.respondentSessions.where('assignmentId').equals(pkg.assignmentId).first();
  const now = nowISO();
  const session: RespondentSession = {
    id: existing?.id ?? uuid(),
    assignmentId: pkg.assignmentId,
    assessmentId: pkg.assessmentId,
    organizationId: pkg.organizationId,
    organizationName: pkg.organizationName,
    assessmentName: pkg.assessmentName,
    participantCode: pkg.participantCode,
    profile: pkg.profile,
    instructions: pkg.instructions,
    dueDate: pkg.dueDate,
    bankVersion: pkg.bankVersion,
    questionIds: pkg.questionIds,
    customQuestions: pkg.customQuestions as CustomQuestion[],
    responses: existing?.responses ?? {},
    status: existing?.status ?? 'en_curso',
    exportRevision: existing?.exportRevision ?? 0,
    importedAt: existing?.importedAt ?? now,
    updatedAt: now,
  };
  await guarded(() => db.respondentSessions.put(session));
  return {
    session,
    resumed: Boolean(existing),
    bankWarning: pkg.bankVersion !== BANK_VERSION ? `La asignación fue creada con la versión ${pkg.bankVersion} del banco y esta aplicación usa la ${BANK_VERSION}.` : null,
  };
}

export async function saveRespondentResponse(sessionId: string, questionId: string, patch: Partial<ResponseData>): Promise<void> {
  await guarded(() => db.transaction('rw', db.respondentSessions, async () => {
    const s = await db.respondentSessions.get(sessionId);
    if (!s) throw new Error('Sesión no encontrada');
    if (!s.questionIds.includes(questionId)) throw new Error('La pregunta no pertenece a esta asignación.');
    const prev: ResponseData = s.responses[questionId] ?? { questionId, value: null, special: null, note: '', flagged: false, reportedEvidence: '', updatedAt: nowISO() };
    const next = { ...prev, ...patch, updatedAt: nowISO() };
    if (patch.value !== undefined && patch.value !== null) next.special = null;
    if (patch.special !== undefined && patch.special !== null) next.value = null;
    if (next.special === 'NO_APLICA_VALIDADO') next.special = 'NO_APLICA_PROPUESTO';
    s.responses[questionId] = next;
    s.updatedAt = nowISO();
    await db.respondentSessions.put(s);
  }));
}

/** Modo entrevistado: genera el archivo de resultados. Cada exportación incrementa la revisión. */
export async function buildInterviewPackage(sessionId: string): Promise<InterviewPackage> {
  const s = await db.respondentSessions.get(sessionId);
  if (!s) throw new PackageError('Sesión no encontrada.');
  const revision = s.exportRevision + 1;
  const base = {
    format: 'docmaturity.interview' as const,
    schemaVersion: PACKAGE_SCHEMA_VERSION,
    assignmentId: s.assignmentId,
    assessmentId: s.assessmentId,
    organizationId: s.organizationId,
    participantCode: s.participantCode,
    profile: s.profile,
    bankVersion: s.bankVersion,
    revision,
    status: s.status,
    exportedAt: nowISO(),
    responses: Object.values(s.responses).filter((r) => s.questionIds.includes(r.questionId)),
  };
  const hash = await packageHash(base);
  await db.respondentSessions.update(sessionId, { exportRevision: revision });
  return { ...base, hash };
}

// ───────────────────────── Importación de entrevistas (entrevistado → evaluador) ─────────────────────────

export interface InterviewImportResult {
  status: 'aceptado' | 'duplicado' | 'revision_pendiente';
  message: string;
  interviewId: string | null;
  revisionId: string | null;
  warnings: string[];
}

export async function importInterviewPackage(text: string, fileName = 'entrevista.dm-interview.json'): Promise<InterviewImportResult> {
  let hash = '';
  try {
    ensureSize(text, PACKAGE_LIMITS.interview);
    const raw = safeParseJSON(text);
    const parsed = interviewPackageSchema.safeParse(raw);
    if (!parsed.success) throw new PackageError(zodMessage(parsed.error));
    const pkg = { ...parsed.data, responses: parsed.data.responses as ResponseData[] };
    hash = pkg.hash;
    ensureVersion(pkg.schemaVersion);
    await verifyHash(pkg);
    const assessment = await db.assessments.get(pkg.assessmentId);
    if (!assessment) throw new PackageError('La entrevista corresponde a una evaluación que no existe en este navegador.');
    if (assessment.organizationId !== pkg.organizationId) throw new PackageError('La organización del archivo no coincide con la de la evaluación.');
    if (assessment.status === 'finalizado' || assessment.status === 'archivado') throw new PackageError('La evaluación está finalizada o archivada. Reábrala para importar nuevas entrevistas.');
    const asg = await db.assignments.get(pkg.assignmentId);
    if (!asg || asg.assessmentId !== assessment.id) throw new PackageError('La asignación del archivo no pertenece a esta evaluación.');
    const participant = await db.participants.get(asg.participantId);
    if (!participant || participant.code !== pkg.participantCode) throw new PackageError('El código del participante no coincide con la asignación.');
    const allowed = new Set(asg.questionIds);
    const unauthorized = pkg.responses.filter((r) => !allowed.has(r.questionId));
    if (unauthorized.length) throw new PackageError(`El archivo contiene ${unauthorized.length} respuesta(s) a preguntas no asignadas.`);
    const warnings: string[] = [];
    if (pkg.bankVersion !== assessment.bankVersion) warnings.push(`Versión del banco distinta (${pkg.bankVersion} frente a ${assessment.bankVersion}).`);

    const result = await db.transaction('rw', [db.interviews, db.responses, db.interviewRevisions, db.importEvents, db.auditEvents, db.assessments], async () => {
      const revisions = await db.interviewRevisions.where('assessmentId').equals(assessment.id).toArray();
      if (revisions.some((r) => r.contentHash === pkg.hash)) {
        return { status: 'duplicado' as const, message: 'Esta entrevista ya había sido importada. No se duplicaron respuestas.', interviewId: null, revisionId: null };
      }
      const current = await db.interviews.where('assignmentId').equals(asg.id).filter((i) => i.source === 'importada').first();
      const now = nowISO();
      if (!current) {
        const interview: Interview = {
          id: uuid(), assessmentId: assessment.id, participantId: participant.id, assignmentId: asg.id, mode: 'autoadministrada',
          status: pkg.status, revision: pkg.revision, source: 'importada', contentHash: pkg.hash, notes: '', contradictionsNoted: '', additionalFindings: '',
          startedAt: now, updatedAt: now, finishedAt: pkg.status === 'finalizada' ? now : null,
        };
        await db.interviews.add(interview);
        await db.responses.bulkAdd(pkg.responses.map((r) => ({ ...r, id: uuid(), interviewId: interview.id, assessmentId: assessment.id, participantId: participant.id })));
        const rev: InterviewRevision = { id: uuid(), interviewId: interview.id, assessmentId: assessment.id, revision: pkg.revision, contentHash: pkg.hash, importedAt: now, status: 'vigente', responses: pkg.responses, decisionNote: 'Primera importación.' };
        await db.interviewRevisions.add(rev);
        await db.assessments.where('id').equals(assessment.id).modify((a) => {
          if (['borrador', 'planificacion', 'entrevistas'].includes(a.status)) a.status = 'consolidacion';
        });
        await logEvent('importar', 'entrevista', interview.id, assessment.id, `${participant.code} · revisión ${pkg.revision}`);
        return { status: 'aceptado' as const, message: `Entrevista de ${participant.code} importada (${pkg.responses.length} respuestas).`, interviewId: interview.id, revisionId: rev.id };
      }
      const rev: InterviewRevision = { id: uuid(), interviewId: current.id, assessmentId: assessment.id, revision: pkg.revision, contentHash: pkg.hash, importedAt: now, status: 'pendiente_decision', responses: pkg.responses, decisionNote: '' };
      await db.interviewRevisions.add(rev);
      await logEvent('importar revisión', 'entrevista', current.id, assessment.id, `${participant.code} · revisión ${pkg.revision} pendiente de decisión`);
      return { status: 'revision_pendiente' as const, message: `Se recibió la revisión ${pkg.revision} de ${participant.code}. Revise las diferencias y seleccione la revisión vigente.`, interviewId: current.id, revisionId: rev.id };
    });
    await db.importEvents.add({ at: nowISO(), kind: 'entrevista', fileName, result: result.status, detail: result.message, hash });
    return { ...result, warnings };
  } catch (e) {
    await db.importEvents.add({ at: nowISO(), kind: 'entrevista', fileName, result: 'rechazado', detail: (e as Error).message, hash });
    throw e;
  }
}

export interface RevisionDiff {
  questionId: string;
  before: ResponseData | null;
  after: ResponseData | null;
}

export async function diffRevision(revisionId: string): Promise<RevisionDiff[]> {
  const rev = await db.interviewRevisions.get(revisionId);
  if (!rev) return [];
  const current = await db.responses.where('interviewId').equals(rev.interviewId).toArray();
  const before = new Map(current.map((r) => [r.questionId, r]));
  const after = new Map(rev.responses.map((r) => [r.questionId, r]));
  const ids = [...new Set([...before.keys(), ...after.keys()])].sort();
  const same = (a?: ResponseData, b?: ResponseData) => a?.value === b?.value && a?.special === b?.special && (a?.note ?? '') === (b?.note ?? '') && (a?.reportedEvidence ?? '') === (b?.reportedEvidence ?? '');
  return ids.filter((id) => !same(before.get(id), after.get(id))).map((id) => ({ questionId: id, before: before.get(id) ?? null, after: after.get(id) ?? null }));
}

/** El evaluador decide la revisión vigente. La anterior se conserva y la decisión queda registrada. */
export async function resolveRevision(revisionId: string, accept: boolean, note: string): Promise<void> {
  if (!note.trim()) throw new Error('Registre el motivo de la decisión.');
  await db.transaction('rw', [db.interviewRevisions, db.interviews, db.responses, db.auditEvents], async () => {
    const rev = await db.interviewRevisions.get(revisionId);
    if (!rev || rev.status !== 'pendiente_decision') throw new Error('La revisión ya fue resuelta.');
    if (!accept) {
      await db.interviewRevisions.update(revisionId, { status: 'descartada', decisionNote: note });
      await logEvent('descartar revisión', 'entrevista', rev.interviewId, rev.assessmentId, note);
      return;
    }
    const interview = await db.interviews.get(rev.interviewId);
    if (!interview) throw new Error('Entrevista no encontrada.');
    await db.interviewRevisions.where('interviewId').equals(rev.interviewId).filter((r) => r.status === 'vigente').modify({ status: 'anterior' });
    await db.responses.where('interviewId').equals(rev.interviewId).delete();
    await db.responses.bulkAdd(rev.responses.map((r) => ({ ...r, id: uuid(), interviewId: interview.id, assessmentId: interview.assessmentId, participantId: interview.participantId })));
    await db.interviews.update(interview.id, { revision: rev.revision, contentHash: rev.contentHash, updatedAt: nowISO() });
    await db.interviewRevisions.update(revisionId, { status: 'vigente', decisionNote: note });
    await logEvent('aceptar revisión', 'entrevista', interview.id, interview.assessmentId, `Revisión ${rev.revision}: ${note}`);
  });
}

// ───────────────────────── Evaluación completa ─────────────────────────

const stripAttachment = (e: Evidence) => ({ ...e, attachment: e.attachment ? { name: e.attachment.name, type: e.attachment.type, size: e.attachment.size, omitted: true } : null });

export async function buildAssessmentPackage(aid: string): Promise<AssessmentPackage> {
  const assessment = await db.assessments.get(aid);
  if (!assessment) throw new PackageError('Evaluación no encontrada.');
  const organization = await db.organizations.get(assessment.organizationId);
  if (!organization) throw new PackageError('Organización no encontrada.');
  const by = <T,>(t: { where: (k: string) => { equals: (v: string) => { toArray: () => Promise<T[]> } } }) => t.where('assessmentId').equals(aid).toArray();
  const [departments, participants, assignments, interviews, interviewRevisions, responses, evidence, findings, applicability, risks, priorityInputs, initiatives, recommendations] = await Promise.all([
    db.departments.where('organizationId').equals(organization.id).toArray(),
    by(db.participants), by(db.assignments), by(db.interviews), by(db.interviewRevisions), by(db.responses), by<Evidence>(db.evidence),
    by(db.findings), by(db.applicability), by(db.risks), by(db.priorityInputs), by(db.initiatives), by(db.recommendations),
  ]);
  const base = {
    format: 'docmaturity.assessment' as const, schemaVersion: PACKAGE_SCHEMA_VERSION, appVersion: APP_VERSION, methodologyVersion: METHODOLOGY_VERSION,
    bankVersion: assessment.bankVersion, exportedAt: nowISO(),
    organization: { ...organization, logoDataUrl: organization.logoDataUrl } as unknown as Record<string, unknown>,
    departments, assessment, participants, assignments, interviews, interviewRevisions, responses,
    evidence: evidence.map(stripAttachment), findings, applicability, risks, priorityInputs, initiatives, recommendations,
  } as unknown as Omit<AssessmentPackage, 'hash'>;
  const hash = await packageHash(base as unknown as Record<string, unknown>);
  await logEvent('exportar', 'evaluación', aid, aid, assessment.name);
  return { ...base, hash };
}

export class ConflictError extends PackageError {}

/** Importa una evaluación completa. Si ya existe, puede importarse como copia con nuevos identificadores. */
export async function importAssessmentPackage(text: string, options: { asCopy?: boolean } = {}): Promise<{ assessmentId: string; organizationId: string }> {
  ensureSize(text, PACKAGE_LIMITS.assessment);
  const raw = safeParseJSON(text);
  const parsed = assessmentPackageSchema.safeParse(raw);
  if (!parsed.success) throw new PackageError(zodMessage(parsed.error));
  const pkg = parsed.data;
  ensureVersion(pkg.schemaVersion);
  await verifyHash(pkg);
  const a = pkg.assessment as { id: string; organizationId: string };
  const exists = await db.assessments.get(a.id);
  if (exists && !options.asCopy) throw new ConflictError('La evaluación ya existe en este navegador. Puede importarla como copia independiente.');
  const map = new Map<string, string>();
  const remap = (id: unknown) => {
    if (typeof id !== 'string' || !options.asCopy) return id;
    if (!map.has(id)) map.set(id, uuid());
    return map.get(id);
  };
  const fix = <T extends Record<string, unknown>>(rows: T[], keys: string[]) => rows.map((r) => {
    const out: Record<string, unknown> = { ...r };
    for (const k of keys) if (k in out) out[k] = Array.isArray(out[k]) ? (out[k] as unknown[]).map(remap) : remap(out[k]);
    return out as T;
  });
  const orgRow = fix([pkg.organization], ['id'])[0];
  const orgExists = await db.organizations.get(orgRow.id as string);
  if (options.asCopy) orgRow.name = `${orgRow.name as string} (importada)`;
  await db.transaction('rw', [db.organizations, db.departments, db.assessments, db.participants, db.assignments, db.interviews, db.interviewRevisions, db.responses, db.evidence, db.findings, db.applicability, db.risks, db.priorityInputs, db.initiatives, db.recommendations, db.importEvents, db.auditEvents], async () => {
    if (!orgExists || options.asCopy) await db.organizations.put(orgRow as never);
    await db.departments.bulkPut(fix(pkg.departments, ['id', 'organizationId']) as never);
    await db.assessments.put(fix([pkg.assessment], ['id', 'organizationId'])[0] as never);
    await db.participants.bulkPut(fix(pkg.participants, ['id', 'assessmentId']) as never);
    await db.assignments.bulkPut(fix(pkg.assignments, ['id', 'assessmentId', 'participantId']) as never);
    await db.interviews.bulkPut(fix(pkg.interviews, ['id', 'assessmentId', 'participantId', 'assignmentId']) as never);
    await db.interviewRevisions.bulkPut(fix(pkg.interviewRevisions, ['id', 'interviewId', 'assessmentId']) as never);
    await db.responses.bulkPut(fix(pkg.responses, ['id', 'interviewId', 'assessmentId', 'participantId']) as never);
    await db.evidence.bulkPut(fix(pkg.evidence, ['id', 'assessmentId', 'participantId']).map((e) => ({ ...e, attachment: null })) as never);
    await db.findings.bulkPut(fix(pkg.findings, ['id', 'assessmentId', 'evidenceIds']) as never);
    await db.applicability.bulkPut(fix(pkg.applicability, ['id', 'assessmentId']) as never);
    await db.risks.bulkPut(fix(pkg.risks, ['id', 'assessmentId']) as never);
    await db.priorityInputs.bulkPut(fix(pkg.priorityInputs, ['id', 'assessmentId']) as never);
    await db.initiatives.bulkPut(fix(pkg.initiatives, ['id', 'assessmentId', 'dependencies', 'riskIds']) as never);
    await db.recommendations.bulkPut(fix(pkg.recommendations, ['id', 'assessmentId']) as never);
    await db.importEvents.add({ at: nowISO(), kind: 'evaluación', fileName: 'evaluación', result: 'aceptado', detail: options.asCopy ? 'Importada como copia' : 'Importada', hash: pkg.hash });
  });
  const newA = (options.asCopy ? map.get(a.id) : a.id) as string;
  await logEvent('importar', 'evaluación', newA, newA);
  return { assessmentId: newA, organizationId: orgRow.id as string };
}

// ───────────────────────── Respaldo integral ─────────────────────────

async function blobToB64(b: Blob): Promise<string> {
  const buf = new Uint8Array(await b.arrayBuffer());
  let s = '';
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}
function b64ToBlob(b64: string, type: string): Blob {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return new Blob([out], { type });
}

/** Exporta la caracterización de una organización (sin evaluaciones) con versiones e integridad. */
export async function buildOrganizationPackage(organizationId: string) {
  const organization = await db.organizations.get(organizationId);
  if (!organization) throw new PackageError('Organización no encontrada.');
  const departments = await db.departments.where('organizationId').equals(organizationId).toArray();
  const base = {
    format: 'docmaturity.organization' as const,
    schemaVersion: PACKAGE_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    methodologyVersion: METHODOLOGY_VERSION,
    bankVersion: BANK_VERSION,
    exportedAt: nowISO(),
    organization,
    departments,
  };
  const hash = await packageHash(base);
  await logEvent('exportar', 'organización', organizationId, null, organization.name);
  return { ...base, hash };
}

export async function buildBackup(): Promise<BackupPackage> {
  const tables: Record<string, Record<string, unknown>[]> = {};
  for (const name of ALL_TABLES) {
    const rows = (await db.table(name).toArray()) as Record<string, unknown>[];
    if (name === 'evidence') {
      tables[name] = await Promise.all((rows as unknown as Evidence[]).map(async (e) => ({
        ...e,
        attachment: e.attachment ? { name: e.attachment.name, type: e.attachment.type, size: e.attachment.size, dataB64: await blobToB64(e.attachment.data) } : null,
      })));
    } else tables[name] = rows;
  }
  const counts = Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.length]));
  const base = { format: 'docmaturity.backup' as const, schemaVersion: PACKAGE_SCHEMA_VERSION, manifest: { appVersion: APP_VERSION, createdAt: nowISO(), dbVersion: DB_VERSION, counts }, tables };
  const hash = await packageHash(base);
  await db.settings.put({ ...(await getSettings()), lastBackupAt: nowISO() });
  return { ...base, hash };
}

export async function validateBackup(text: string): Promise<BackupPackage> {
  ensureSize(text, PACKAGE_LIMITS.backup);
  const raw = safeParseJSON(text);
  const parsed = backupPackageSchema.safeParse(raw);
  if (!parsed.success) throw new PackageError(zodMessage(parsed.error));
  ensureVersion(parsed.data.schemaVersion);
  await verifyHash(parsed.data);
  const unknownTables = Object.keys(parsed.data.tables).filter((t) => !(ALL_TABLES as readonly string[]).includes(t));
  if (unknownTables.length) throw new PackageError(`El respaldo contiene tablas no reconocidas: ${unknownTables.join(', ')}.`);
  return parsed.data;
}

/** Restaura un respaldo reemplazando los datos locales (requiere confirmación previa en la interfaz). */
export async function restoreBackup(pkg: BackupPackage): Promise<void> {
  await db.transaction('rw', ALL_TABLES.map((t) => db.table(t)), async () => {
    for (const name of ALL_TABLES) {
      const t = db.table(name);
      await t.clear();
      let rows = pkg.tables[name] ?? [];
      if (name === 'evidence') {
        rows = rows.map((e) => {
          const att = e.attachment as { name: string; type: string; size: number; dataB64?: string } | null;
          return { ...e, attachment: att?.dataB64 ? { name: att.name, type: att.type, size: att.size, data: b64ToBlob(att.dataB64, att.type) } : null };
        });
      }
      if (rows.length) await t.bulkAdd(rows);
    }
  });
  await logEvent('restaurar', 'respaldo', 'local', null, `Respaldo del ${pkg.manifest.createdAt}`);
}

export async function getSettings() {
  return (await db.settings.get('app')) ?? { id: 'app' as const, lastBackupAt: null, persistentStorageGranted: null, evaluatorName: '', acknowledgedLocalStorageNotice: false };
}
