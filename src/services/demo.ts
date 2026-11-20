/**
 * Carga de casos simulados. Los datos de demostración y académicos se marcan explícitamente
 * y se mantienen separados de los diagnósticos reales; nunca se cargan automáticamente.
 */
import type { Level } from '@/types/bank';
import type { Interview, Response } from '@/types/domain';
import { ACADEMIC_CASES, type AcademicCase } from '@/data/demo/cases';
import { QUESTIONS, questionIdsForTier } from '@/data/bank';
import { db, guarded, logEvent } from '@/database/db';
import { addSuggestedRisks, generateRoadmap, loadBundle, newAssessment, newEvidence, newOrganization, saveAssessment, saveOrganization, suggestedQuestionsFor } from './repo';
import { analyzeAssessment } from '@/engine/analyze';
import { nowISO, uuid } from '@/utils/core';

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

export async function loadCase(caseId: string, mode: 'demo' | 'academic'): Promise<string> {
  const c = ACADEMIC_CASES.find((x) => x.id === caseId) as AcademicCase;
  if (!c) throw new Error('Caso no encontrado');
  const rnd = prng(c.seed + (mode === 'demo' ? 1000 : 0));
  const tag = mode === 'demo' ? 'Demostración' : 'Caso académico';

  const org = newOrganization({
    name: c.title, shortName: c.shortName, profileId: c.profileId, sector: c.sector, municipality: c.municipality, department: c.department, size: c.size,
    employees: c.employees, description: `${c.context} ${c.needs}`, mainActivity: c.sector, isDemo: mode === 'demo', isAcademic: mode === 'academic',
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
    objective: 'Practicar el ciclo completo de diagnóstico: caracterizar, entrevistar, triangular, priorizar y sustentar.',
    scope: 'Diagnóstico estándar ampliado con los criterios críticos y los criterios del caso.',
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
      const rows: Response[] = [];
      for (const qid of qids) {
        const q = QUESTIONS.find((x) => x.id === qid)!;
        const ov = c.overrides[qid];
        let value: number | null;
        if (typeof ov === 'number') value = ov;
        else if (ov && typeof ov === 'object' && cp.code in ov) value = ov[cp.code];
        else {
          const unsure = !q.suggestedRespondents.includes(cp.profile) && rnd() < 0.12;
          if (unsure) value = null;
          else {
            const qOffset = ((hashStr(qid) % 100) / 100) * 0.9 - 0.45;
            value = Math.round(Math.max(0, Math.min(5, c.baseline[q.dimensionId] + cp.bias + qOffset + (rnd() * 1.4 - 0.7))));
          }
        }
        rows.push({
          id: uuid(), interviewId: interview.id, assessmentId: assessment.id, participantId: pid, questionId: qid,
          value: value === null ? null : (value as Level), special: value === null ? 'NO_SABE' : null,
          note: value === null ? 'El participante no conoce la práctica.' : '', flagged: false, reportedEvidence: '', updatedAt: now,
        });
      }
      await db.responses.bulkAdd(rows);
    }
    for (const e of c.evidence) {
      await db.evidence.add(newEvidence(assessment.id, e.questionId, {
        title: e.title, reference: e.reference, status: e.status, reviewer: e.status === 'E1' ? '' : 'Evaluador (simulación)', reviewResult: e.reviewResult,
        source: 'Evidencia sintética del caso', sampleScope: 'Documento sintético',
      }));
    }
  }));

  if (mode === 'demo') {
    // En la demostración se validan los criterios con bajo rango y evidencia revisada, y se valoran algunos riesgos.
    const bundle = await loadBundle(assessment.id);
    const analysis = analyzeAssessment(bundle!);
    let validated = 0;
    for (const s of analysis.states) {
      if (!s.stats || validated >= 24) continue;
      if (s.stats.range <= 1 || s.evidenceStatus === 'E3') {
        await db.findings.add({
          id: uuid(), assessmentId: assessment.id, questionId: s.question.id, preliminaryValue: s.preliminary, finalLevel: Math.round(s.stats.median - 0.01) as Level,
          justification: s.evidenceStatus === 'E3' ? 'Nivel confirmado con la evidencia revisada (simulación).' : 'Respuestas consistentes entre participantes (simulación).',
          evidenceIds: [], evaluator: 'Evaluador (simulación)', date: now.slice(0, 10), contradictionsResolved: '', createdAt: now, updatedAt: now,
        });
        validated += 1;
      }
    }
    await addSuggestedRisks(assessment.id, analysis.suggestedRisks);
    const risks = await db.risks.where('assessmentId').equals(assessment.id).toArray();
    for (const [i, r] of risks.slice(0, 4).entries()) await db.risks.update(r.id, { probability: [4, 3, 3, 2][i], impact: [5, 4, 3, 4][i], status: 'valorado' });
    const fresh = analyzeAssessment((await loadBundle(assessment.id))!);
    await generateRoadmap(fresh.assessment, fresh.initiatives);
  }
  await logEvent('cargar caso', mode === 'demo' ? 'demostración' : 'caso académico', assessment.id, assessment.id, c.title);
  return assessment.id;
}

export async function removeSimulatedData(kind: 'demo' | 'academic'): Promise<number> {
  const orgs = await db.organizations.filter((o) => (kind === 'demo' ? o.isDemo : o.isAcademic)).toArray();
  const { deleteOrganization } = await import('./repo');
  for (const o of orgs) await deleteOrganization(o.id);
  return orgs.length;
}
