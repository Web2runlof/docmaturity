/**
 * Carga de casos simulados. Los datos de demostración y académicos se marcan explícitamente
 * y se mantienen separados de los diagnósticos reales; nunca se cargan automáticamente.
 */
import type { Level } from '@/types/bank';
import type { Interview, Response } from '@/types/domain';
import { ACADEMIC_CASES, type AcademicCase, type CaseParticipant } from '@/data/demo/cases';
import { QUESTIONS, questionIdsForTier } from '@/data/bank';
import { db, guarded, logEvent } from '@/database/db';
import { addSuggestedRisks, generateRoadmap, loadBundle, newAssessment, newEvidence, newOrganization, saveAssessment, saveOrganization, suggestedQuestionsFor } from './repo';
import { analyzeAssessment } from '@/engine/analyze';
import { buildAssignmentPackage, buildInterviewPackage, importAssignmentPackage, importInterviewPackage, saveRespondentResponse } from './packages';
import { TIER_LABEL } from '@/config/vocabulary';
import { lowerFirst, nowISO, uuid } from '@/utils/core';

function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hashStr = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

/** Participante que responde la entrevista distribuida de la demostración (archivo importado). */
const DISTRIBUTED_PARTICIPANT: CaseParticipant = { code: 'OPE-01', profile: 'procesos', area: 'Operaciones', bias: 0.2, voice: 'Respondió la entrevista distribuida desde el área de operaciones.' };

export interface LoadCaseOptions {
  /**
   * Solo para pruebas: carga la demostración sin el enriquecimiento (entrevista distribuida importada,
   * evidencias E2/E3 adicionales y valoraciones de la hoja de ruta). Reproduce la línea base auditada.
   */
  baseline?: boolean;
}

/** Valor simulado determinista de un participante para un criterio. */
function simulatedValue(c: AcademicCase, cp: CaseParticipant, qid: string, rnd: () => number): number | null {
  const q = QUESTIONS.find((x) => x.id === qid)!;
  const ov = c.overrides[qid];
  if (typeof ov === 'number') return ov;
  if (ov && typeof ov === 'object' && cp.code in ov) return ov[cp.code];
  const unsure = !q.suggestedRespondents.includes(cp.profile) && rnd() < 0.12;
  if (unsure) return null;
  const qOffset = ((hashStr(qid) % 100) / 100) * 0.9 - 0.45;
  return Math.round(Math.max(0, Math.min(5, c.baseline[q.dimensionId] + cp.bias + qOffset + (rnd() * 1.4 - 0.7))));
}

export async function loadCase(caseId: string, mode: 'demo' | 'academic', opts: LoadCaseOptions = {}): Promise<string> {
  const c = ACADEMIC_CASES.find((x) => x.id === caseId) as AcademicCase;
  if (!c) throw new Error('Caso no encontrado');
  const rnd = prng(c.seed + (mode === 'demo' ? 1000 : 0));
  const tag = mode === 'demo' ? 'Demostración' : 'Caso académico';
  const enrich = mode === 'demo' && !opts.baseline;

  const org = newOrganization({
    name: c.title, shortName: c.shortName, profileId: c.profileId, sector: c.sector, municipality: c.municipality, department: c.department, size: c.size,
    employees: c.employees, description: c.context, mainActivity: c.sector, isDemo: mode === 'demo', isAcademic: mode === 'academic',
    legalFlags: { publicFunctions: c.legal.publicFunctions, publicResources: c.legal.publicResources, publicServices: c.legal.publicServices, sectoralRegulation: c.legal.sectoralRegulation, personalData: c.legal.personalData, historicalValue: 'desconocido', retentionObligations: '', affectedScope: '' },
    documentary: Object.fromEntries(Object.entries(c.documentary).map(([k, v]) => [k, { value: v, quality: 'estimado' as const }])),
    missionProcesses: c.orgChart.join('; '),
  });
  await saveOrganization(org, c.orgChart);

  const caseQuestions = new Set([...questionIdsForTier('standard'), ...Object.keys(c.overrides), ...c.evidence.map((e) => e.questionId), ...QUESTIONS.filter((q) => q.isCritical).map((q) => q.id)]);
  const questionIds = QUESTIONS.filter((q) => caseQuestions.has(q.id)).map((q) => q.id);
  const assessment = newAssessment(org.id, 'custom', {
    name: `${tag}: diagnóstico ${new Date().getFullYear()}`,
    description: 'Simulación con entrevistas y evidencias sintéticas. No corresponde a una organización real.',
    objective: `Establecer la línea base de madurez documental y priorizar acciones para ${lowerFirst(c.needs.trim().replace(/\.$/, ''))}.`,
    scope: `Criterios de la modalidad ${TIER_LABEL.standard}, más los criterios críticos y los criterios propios del caso.`,
    lead: mode === 'demo' ? 'Equipo DOCMATURITY (simulación)' : 'Grupo académico',
    questionIds, status: 'consolidacion', isDemo: mode === 'demo', isAcademic: mode === 'academic',
  });
  await saveAssessment(assessment, 'crear');

  const now = nowISO();
  await guarded(() => db.transaction('rw', [db.participants, db.assignments, db.interviews, db.responses, db.evidence], async () => {
    for (const cp of c.participants) {
      const pid = uuid();
      await db.participants.add({ id: pid, assessmentId: assessment.id, code: cp.code, profile: cp.profile, area: cp.area, displayName: '', createdAt: now });
      const qids = suggestedQuestionsFor(assessment, cp.profile);
      const asgId = uuid();
      await db.assignments.add({ id: asgId, assessmentId: assessment.id, participantId: pid, questionIds: qids, instructions: 'Entrevista simulada.', dueDate: '', createdAt: now, exportedAt: null, contentHash: null });
      const interview: Interview = {
        id: uuid(), assessmentId: assessment.id, participantId: pid, assignmentId: asgId, mode: 'dirigida', status: 'finalizada', revision: 1, source: 'local', contentHash: null,
        notes: `Entrevista simulada. ${cp.voice}`, contradictionsNoted: '', additionalFindings: '', startedAt: now, updatedAt: now, finishedAt: now,
      };
      await db.interviews.add(interview);
      const rows: Response[] = qids.map((qid) => {
        const value = simulatedValue(c, cp, qid, rnd);
        return {
          id: uuid(), interviewId: interview.id, assessmentId: assessment.id, participantId: pid, questionId: qid,
          value: value === null ? null : (value as Level), special: value === null ? 'NO_SABE' : null,
          note: value === null ? 'El participante no conoce la práctica.' : '', flagged: false, reportedEvidence: '', updatedAt: now,
        };
      });
      await db.responses.bulkAdd(rows);
    }
    for (const e of c.evidence) {
      await db.evidence.add(newEvidence(assessment.id, e.questionId, {
        title: e.title, reference: e.reference, status: e.status, reviewer: e.status === 'E1' ? '' : 'Evaluador (simulación)', reviewResult: e.reviewResult,
        source: 'Evidencia sintética del caso', sampleScope: 'Documento sintético',
      }));
    }
  }));

  if (enrich) {
    // Entrevista distribuida: se recorre el flujo real de archivos (asignación → respuestas → importación con hash).
    const cp = DISTRIBUTED_PARTICIPANT;
    const pid = uuid();
    await db.participants.add({ id: pid, assessmentId: assessment.id, code: cp.code, profile: cp.profile, area: cp.area, displayName: '', createdAt: now });
    const qids = suggestedQuestionsFor(assessment, cp.profile);
    const asgId = uuid();
    await db.assignments.add({ id: asgId, assessmentId: assessment.id, participantId: pid, questionIds: qids, instructions: 'Entrevista distribuida simulada: responda según la práctica de su área.', dueDate: '', createdAt: now, exportedAt: null, contentHash: null });
    const asgPkg = await buildAssignmentPackage(asgId);
    const { session } = await importAssignmentPackage(JSON.stringify(asgPkg));
    for (const qid of qids) {
      const value = simulatedValue(c, cp, qid, rnd);
      await saveRespondentResponse(session.id, qid, value === null ? { special: 'NO_SABE', note: 'No conoce la práctica en su área.' } : { value: value as Level });
    }
    await db.respondentSessions.update(session.id, { status: 'finalizada' });
    const ivPkg = await buildInterviewPackage(session.id);
    await importInterviewPackage(JSON.stringify(ivPkg), `${cp.code.toLowerCase()}.dm-interview.json`);
    // La sesión del entrevistado pertenece al dispositivo de quien responde: en la simulación se retira.
    await db.respondentSessions.delete(session.id);

    // Evidencias revisadas (E3) y revisadas parcialmente (E2) en todas las dimensiones del alcance.
    const pre = analyzeAssessment((await loadBundle(assessment.id))!);
    const withEvidence = new Set(c.evidence.map((e) => e.questionId));
    const extra = pre.dimensionIds.flatMap((d) => pre.states
      .filter((s) => s.dimensionId === d && s.applicable && !withEvidence.has(s.question.id) && s.preliminary !== null && s.preliminary >= 2)
      .sort((x, y) => (y.preliminary as number) - (x.preliminary as number) || x.question.id.localeCompare(y.question.id))
      .slice(0, 2)
      .map((s, i) => ({ s, status: (i === 0 ? 'E3' : 'E2') as 'E3' | 'E2' })));
    await guarded(() => db.evidence.bulkAdd(extra.map(({ s, status }) => newEvidence(assessment.id, s.question.id, {
      title: `${s.question.evidenceSuggestions[0] ?? s.question.criterion} (sintética)`, reference: `${s.question.id}-EV`, status,
      reviewer: 'Evaluador (simulación)', reviewResult: status === 'E3' ? 'Evidencia revisada: respalda el nivel declarado (simulación).' : 'Revisión parcial: falta verificar su aplicación en todas las áreas (simulación).',
      source: 'Evidencia sintética del caso', sampleScope: 'Documento sintético',
    }))));
  }

  if (mode === 'demo') {
    // En la demostración se validan los criterios con bajo rango y evidencia revisada, y se valoran algunos riesgos.
    const bundle = await loadBundle(assessment.id);
    const analysis = analyzeAssessment(bundle!);
    const evidenceBy = new Map<string, string[]>();
    bundle!.evidence.filter((e) => e.status === 'E2' || e.status === 'E3').forEach((e) => evidenceBy.set(e.questionId, [...(evidenceBy.get(e.questionId) ?? []), e.id]));
    let validated = 0;
    for (const s of analysis.states) {
      if (!s.stats || validated >= 24) continue;
      if (s.stats.range <= 1 || s.evidenceStatus === 'E3') {
        await db.findings.add({
          id: uuid(), assessmentId: assessment.id, questionId: s.question.id, preliminaryValue: s.preliminary, finalLevel: Math.round(s.stats.median - 0.01) as Level,
          justification: s.evidenceStatus === 'E3' ? 'Nivel confirmado con la evidencia revisada (simulación).' : 'Respuestas consistentes entre participantes (simulación).',
          evidenceIds: evidenceBy.get(s.question.id) ?? [], evaluator: 'Evaluador (simulación)', date: now.slice(0, 10), contradictionsResolved: '', createdAt: now, updatedAt: now,
        });
        validated += 1;
      }
    }
    // Con criterios validados, la evaluación queda «En validación».
    if (validated) await db.assessments.update(assessment.id, { status: 'validacion', updatedAt: nowISO() });
    await addSuggestedRisks(assessment.id, analysis.suggestedRisks);
    const risks = await db.risks.where('assessmentId').equals(assessment.id).toArray();
    for (const [i, r] of risks.slice(0, 4).entries()) await db.risks.update(r.id, { probability: [4, 3, 3, 2][i], impact: [5, 4, 3, 4][i], status: 'valorado' });
    const fresh = analyzeAssessment((await loadBundle(assessment.id))!);
    await generateRoadmap(fresh.assessment, fresh.initiatives);
    if (enrich) {
      // Valoración de impacto y esfuerzo en las primeras iniciativas (las demás quedan sin valorar).
      const items = (await db.initiatives.where('assessmentId').equals(assessment.id).toArray()).sort((x, y) => x.order - y.order);
      const values: [number, number][] = [[5, 2], [4, 4], [4, 2], [3, 4], [5, 5], [2, 1]];
      await guarded(() => db.transaction('rw', db.initiatives, async () => {
        for (const [i, it] of items.slice(0, values.length).entries()) await db.initiatives.update(it.id, { impact: values[i][0], effort: values[i][1], updatedAt: nowISO() });
      }));
    }
  }
  await logEvent('cargar caso', mode === 'demo' ? 'demostración' : 'caso académico', assessment.id, assessment.id, c.title);
  return assessment.id;
}

export const DEMO_CASE_ID = 'caso-financiera';

let demoInFlight: Promise<string> | null = null;

/**
 * Abre la demostración existente o la crea una sola vez. Los clics repetidos (incluso simultáneos)
 * comparten la misma operación y nunca generan duplicados.
 */
export function openOrLoadDemo(): Promise<string> {
  if (demoInFlight) return demoInFlight;
  demoInFlight = (async () => {
    try {
      await dedupeSimulatedCases();
      const existing = (await db.assessments.filter((a) => a.isDemo).toArray()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
      return existing?.id ?? (await loadCase(DEMO_CASE_ID, 'demo'));
    } finally {
      demoInFlight = null;
    }
  })();
  return demoInFlight;
}

/**
 * Fusiona demostraciones duplicadas: por cada caso simulado de demostración (mismo nombre de
 * organización) conserva la organización con la evaluación modificada más recientemente y elimina
 * las copias. Los casos académicos pueden tener varias sesiones y no se tocan.
 */
export async function dedupeSimulatedCases(): Promise<number> {
  const orgs = await db.organizations.filter((o) => o.isDemo).toArray();
  const groups = new Map<string, typeof orgs>();
  orgs.forEach((o) => groups.set(o.name, [...(groups.get(o.name) ?? []), o]));
  const { deleteOrganization } = await import('./repo');
  let removed = 0;
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const scored = await Promise.all(list.map(async (o) => ({ o, last: (await db.assessments.where('organizationId').equals(o.id).toArray()).map((a) => a.updatedAt).sort().pop() ?? o.updatedAt })));
    scored.sort((x, y) => y.last.localeCompare(x.last));
    for (const { o } of scored.slice(1)) {
      await deleteOrganization(o.id);
      removed += 1;
    }
  }
  if (removed) await logEvent('fusionar demostraciones duplicadas', 'organización', '', null, `${removed} copias eliminadas`);
  return removed;
}

export async function removeSimulatedData(kind: 'demo' | 'academic'): Promise<number> {
  const orgs = await db.organizations.filter((o) => (kind === 'demo' ? o.isDemo : o.isAcademic)).toArray();
  const { deleteOrganization } = await import('./repo');
  for (const o of orgs) await deleteOrganization(o.id);
  return orgs.length;
}
