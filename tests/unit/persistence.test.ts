import { beforeEach, describe, expect, it } from 'vitest';
import { db, DocMaturityDB } from '@/database/db';
import {
  addParticipant, deleteOrganization, generateRoadmap, loadBundle, newAssessment, newOrganization, organizationDependencies, reopenAssessment,
  saveAssessment, saveAssignment, saveFinding, saveOrganization, skipSection, startDirectedInterview, suggestedQuestionsFor, upsertResponse,
} from '@/services/repo';
import {
  buildAssessmentPackage, buildAssignmentPackage, buildBackup, buildInterviewPackage, diffRevision, importAssessmentPackage, importAssignmentPackage,
  importInterviewPackage, resolveRevision, restoreBackup, saveRespondentResponse, validateBackup, ConflictError,
} from '@/services/packages';
import { decryptPackage, encryptText, WrongPasswordError } from '@/services/crypto';
import { analyzeAssessment } from '@/engine/analyze';
import { buildNarrative } from '@/engine/narrative';
import { sanitizeCell, safeParseJSON } from '@/utils/core';

async function reset() {
  await db.delete();
  await db.open();
}

async function seed() {
  const org = newOrganization({ name: 'Organización de prueba', profileId: 'privada_ordinaria' });
  await saveOrganization(org, ['Archivo', 'Tecnología']);
  const a = newAssessment(org.id, 'quick', { name: 'Diagnóstico inicial' });
  await saveAssessment(a, 'crear');
  return { org, a };
}

beforeEach(reset);

describe('Organizaciones y evaluaciones', () => {
  it('01/02/03 · crea organizaciones y evaluaciones independientes sin mezclar información', async () => {
    const one = await seed();
    const two = await seed();
    const p = await addParticipant(one.a.id, { code: 'GD-01', profile: 'gestion_documental', area: '', displayName: '' });
    const i = await startDirectedInterview(one.a.id, p.id, null);
    await upsertResponse(i, 'D01-Q01', { value: 3 });
    const b1 = await loadBundle(one.a.id);
    const b2 = await loadBundle(two.a.id);
    expect(b1?.responses).toHaveLength(1);
    expect(b2?.responses).toHaveLength(0);
    expect(b1?.assessment.questionIds).toHaveLength(30);
    expect(await db.organizations.count()).toBe(2);
  });

  it('04/05 · persiste tras cerrar y reabrir la base de datos', async () => {
    const { a } = await seed();
    db.close();
    const reopened = new DocMaturityDB();
    await reopened.open();
    expect((await reopened.assessments.get(a.id))?.name).toBe('Diagnóstico inicial');
    reopened.close();
    await db.open();
  });

  it('elimina una organización de forma consistente, sin registros huérfanos', async () => {
    const { org, a } = await seed();
    const p = await addParticipant(a.id, { code: 'X', profile: 'tecnologia', area: '', displayName: '' });
    const i = await startDirectedInterview(a.id, p.id, null);
    await upsertResponse(i, 'D08-Q01', { value: 2 });
    expect((await organizationDependencies(org.id)).responses).toBe(1);
    await deleteOrganization(org.id);
    expect(await db.assessments.count()).toBe(0);
    expect(await db.responses.count()).toBe(0);
    expect(await db.participants.count()).toBe(0);
    expect(await db.departments.count()).toBe(0);
  });

  it('reabre una evaluación finalizada con una nueva revisión y conserva la instantánea', async () => {
    const { a } = await seed();
    await saveAssessment({ ...a, status: 'finalizado' });
    await reopenAssessment(a.id, 'Nuevas evidencias');
    const after = await db.assessments.get(a.id);
    expect(after?.revision).toBe(2);
    expect(after?.status).toBe('validacion');
    expect(await db.snapshots.where('assessmentId').equals(a.id).count()).toBe(1);
  });
});

describe('Cuestionario', () => {
  it('13/14/15/16/17/18 · saltar, omitir sección, regresar, cambiar y reanudar', async () => {
    const { a } = await seed();
    const p = await addParticipant(a.id, { code: 'U1', profile: 'usuarios', area: '', displayName: '' });
    const i = await startDirectedInterview(a.id, p.id, null);
    await upsertResponse(i, 'D01-Q01', { value: 2 });
    await upsertResponse(i, 'D01-Q05', { special: 'NO_SABE' });
    await upsertResponse(i, 'D01-Q01', { value: 4 }); // regresar y cambiar
    const omitted = await skipSection(i, ['D02-Q01', 'D02-Q03']);
    expect(omitted).toBe(2);
    const again = await startDirectedInterview(a.id, p.id, null); // reanudar
    expect(again.id).toBe(i.id);
    const rs = await db.responses.where('interviewId').equals(i.id).toArray();
    expect(rs.find((r) => r.questionId === 'D01-Q01')?.value).toBe(4);
    expect(rs.filter((r) => r.special === 'OMITIDA')).toHaveLength(2);
    const analysis = analyzeAssessment((await loadBundle(a.id))!);
    const d02 = analysis.dimensions.find((d) => d.dimensionId === 'D02');
    expect(d02?.preliminary).toBeNull(); // la sección omitida no se marca como evaluada
  });

  it('27 · rechaza valores de madurez inválidos', async () => {
    const { a } = await seed();
    const p = await addParticipant(a.id, { code: 'U2', profile: 'usuarios', area: '', displayName: '' });
    const i = await startDirectedInterview(a.id, p.id, null);
    await expect(upsertResponse(i, 'D01-Q01', { value: 7 as never })).rejects.toThrow();
  });
});

describe('Entrevistas distribuidas', () => {
  async function prepare() {
    const { a } = await seed();
    const p = await addParticipant(a.id, { code: 'TEC-01', profile: 'tecnologia', area: 'TI', displayName: '' });
    const qs = suggestedQuestionsFor(a, 'tecnologia');
    const asg = await saveAssignment({ assessmentId: a.id, participantId: p.id, questionIds: qs, instructions: 'Responda con base en su experiencia.', dueDate: '' });
    const pkg = await buildAssignmentPackage(asg.id);
    return { a, p, asg, pkg, qs };
  }

  it('19/20/21/22/23 · exporta asignación, se responde en modo entrevistado y se importa en el diagnóstico', async () => {
    const { a, pkg, qs } = await prepare();
    expect(pkg.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(pkg)).not.toMatch(/responses|budget/);
    const { session } = await importAssignmentPackage(JSON.stringify(pkg));
    await saveRespondentResponse(session.id, qs[0], { value: 3 });
    await saveRespondentResponse(session.id, qs[1], { special: 'NO_SABE' });
    const out = await buildInterviewPackage(session.id);
    const res = await importInterviewPackage(JSON.stringify(out));
    expect(res.status).toBe('aceptado');
    const bundle = await loadBundle(a.id);
    expect(bundle?.responses).toHaveLength(2);
    expect(bundle?.interviews[0].mode).toBe('autoadministrada');
  });

  it('24 · detecta importación duplicada sin duplicar respuestas', async () => {
    const { a, pkg, qs } = await prepare();
    const { session } = await importAssignmentPackage(JSON.stringify(pkg));
    await saveRespondentResponse(session.id, qs[0], { value: 2 });
    const text = JSON.stringify(await buildInterviewPackage(session.id));
    await importInterviewPackage(text);
    const again = await importInterviewPackage(text);
    expect(again.status).toBe('duplicado');
    expect(await db.responses.where('assessmentId').equals(a.id).count()).toBe(1);
  });

  it('25 · detecta conflicto de revisiones, muestra diferencias y registra la decisión', async () => {
    const { a, pkg, qs } = await prepare();
    const { session } = await importAssignmentPackage(JSON.stringify(pkg));
    await saveRespondentResponse(session.id, qs[0], { value: 2 });
    await importInterviewPackage(JSON.stringify(await buildInterviewPackage(session.id)));
    await saveRespondentResponse(session.id, qs[0], { value: 4 });
    const r2 = await importInterviewPackage(JSON.stringify(await buildInterviewPackage(session.id)));
    expect(r2.status).toBe('revision_pendiente');
    const diff = await diffRevision(r2.revisionId!);
    expect(diff[0].before?.value).toBe(2);
    expect(diff[0].after?.value).toBe(4);
    await resolveRevision(r2.revisionId!, true, 'El participante corrigió su respuesta');
    const rs = await db.responses.where('assessmentId').equals(a.id).toArray();
    expect(rs[0].value).toBe(4);
    const revs = await db.interviewRevisions.where('assessmentId').equals(a.id).toArray();
    expect(revs.map((r) => r.status).sort()).toEqual(['anterior', 'vigente']);
  });

  it('26 · rechaza archivos incompatibles, alterados o con preguntas no autorizadas', async () => {
    const { pkg, qs } = await prepare();
    await expect(importInterviewPackage('{"format":"otro"}')).rejects.toThrow(/Estructura/);
    const { session } = await importAssignmentPackage(JSON.stringify(pkg));
    await saveRespondentResponse(session.id, qs[0], { value: 3 });
    const out = await buildInterviewPackage(session.id);
    const tampered = { ...out, responses: [{ ...out.responses[0], value: 5 }] };
    await expect(importInterviewPackage(JSON.stringify(tampered))).rejects.toThrow(/integridad/);
    await expect(importAssignmentPackage(JSON.stringify({ ...pkg, schemaVersion: 99 }))).rejects.toThrow();
    expect(() => safeParseJSON('{"__proto__":{"x":1}}')).toThrow();
  });
});

describe('Validación, exportación y respaldo', () => {
  it('validación y análisis completo con narrativa vinculada a criterios', async () => {
    const { a } = await seed();
    const p1 = await addParticipant(a.id, { code: 'A', profile: 'direccion', area: '', displayName: '' });
    const p2 = await addParticipant(a.id, { code: 'B', profile: 'archivo', area: '', displayName: '' });
    const i1 = await startDirectedInterview(a.id, p1.id, null);
    const i2 = await startDirectedInterview(a.id, p2.id, null);
    for (const q of a.questionIds) {
      await upsertResponse(i1, q, { value: 4 });
      await upsertResponse(i2, q, { value: 1 });
    }
    await saveFinding({ assessmentId: a.id, questionId: 'D01-Q01', preliminaryValue: 2.5, finalLevel: 2, justification: 'Política en borrador', evidenceIds: [], evaluator: 'Evaluador', date: '2026-11-20', contradictionsResolved: '' });
    const analysis = analyzeAssessment((await loadBundle(a.id))!);
    expect(analysis.coverage.coverage).toBe(100);
    expect(analysis.coverage.scopeCoverage).toBeCloseTo((30 / 225) * 100, 6);
    expect(analysis.discrepancies).toBe(30);
    expect(analysis.globalValidated.label).toBe('validada_alcance');
    const n = buildNarrative(analysis);
    expect(n.map((s) => s.key)).toContain('limitaciones');
    expect(n.find((s) => s.key === 'discrepancias')?.paragraphs[0].refs.length).toBeGreaterThan(0);
    const created = await generateRoadmap(analysis.assessment, analysis.initiatives);
    expect(created).toBeGreaterThan(0);
  });

  it('45/46 · exporta y restaura un respaldo integral', async () => {
    const { a } = await seed();
    const backup = await buildBackup();
    const text = JSON.stringify(backup);
    await reset();
    expect(await db.assessments.count()).toBe(0);
    await restoreBackup(await validateBackup(text));
    expect((await db.assessments.get(a.id))?.name).toBe('Diagnóstico inicial');
  });

  it('exporta una evaluación e impide sobrescribirla; permite importarla como copia', async () => {
    const { a } = await seed();
    const text = JSON.stringify(await buildAssessmentPackage(a.id));
    await expect(importAssessmentPackage(text)).rejects.toBeInstanceOf(ConflictError);
    const copy = await importAssessmentPackage(text, { asCopy: true });
    expect(copy.assessmentId).not.toBe(a.id);
    expect(await db.assessments.count()).toBe(2);
  });

  it('47/48 · cifra y descifra con AES-GCM; rechaza una contraseña incorrecta', async () => {
    const enc = await encryptText('{"hola":"mundo ñandú"}', 'contraseña-segura-123', 'docmaturity.backup');
    expect(enc.cipher.name).toBe('AES-GCM');
    expect(enc.ciphertext).not.toContain('hola');
    expect(await decryptPackage(enc, 'contraseña-segura-123')).toContain('ñandú');
    await expect(decryptPackage(enc, 'otra-contraseña-000')).rejects.toBeInstanceOf(WrongPasswordError);
    const enc2 = await encryptText('x', 'contraseña-segura-123', 'p');
    expect(enc2.cipher.iv).not.toBe(enc.cipher.iv);
  });

  it('50 · protege contra la inyección de fórmulas', () => {
    expect(sanitizeCell('=HYPERLINK("http://x")')).toBe(`'=HYPERLINK("http://x")`);
    expect(sanitizeCell('+1')).toBe("'+1");
    expect(sanitizeCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(sanitizeCell('Texto normal')).toBe('Texto normal');
  });
});
