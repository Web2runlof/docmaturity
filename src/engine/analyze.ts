/**
 * Orquestador del análisis de una evaluación. Combina los motores independientes y produce
 * un resultado inmutable consumido por el dashboard, los informes y la narrativa.
 */
import type { DimensionId, MgdaComponent, Question } from '@/types/bank';
import type { AssessmentBundle } from '@/types/domain';
import { DIMENSION_IDS, QUESTIONS, SOURCES, questionsForAssessment } from '@/data/bank';
import { DEFAULT_THRESHOLDS } from './constants';
import {
  buildQuestionStates, computeAgreement, computeCoverage, computeCriticalAlerts, computeDimensions, computeEvidence,
  computeGlobal, computeSolidity, currentScore, type QuestionState, type View,
} from './scoring';
import { median, weightedMean } from './scoring/stats';
import { computeValidationAlerts, evaluateContradictions } from './triangulation';
import { suggestRisks } from './risk';
import { computePriorities } from './prioritization';
import { proposeInitiatives, recommendationFor } from './recommendations';
import { legalApplicability } from './applicability';

export function resolveDimensionWeights(bundle: Pick<AssessmentBundle, 'assessment'>, dims: DimensionId[]): Record<string, number> {
  const w = bundle.assessment.weights;
  const out: Record<string, number> = {};
  for (const d of dims) out[d] = w.mode === 'uniforme' ? 1 : w.dimensions[d] ?? 0;
  return out;
}

export function analyzeAssessment(bundle: AssessmentBundle) {
  const { assessment, organization } = bundle;
  const questions = questionsForAssessment(assessment);
  const dimensionIds = (assessment.selectedDimensions.length ? assessment.selectedDimensions : DIMENSION_IDS)
    .filter((d) => questions.some((q) => q.dimensionId === d)) as DimensionId[];
  const dimensionWeights = resolveDimensionWeights(bundle, dimensionIds);
  const thresholds = { ...DEFAULT_THRESHOLDS, ...assessment.thresholds };

  const states = buildQuestionStates({
    questions,
    dimensionIds,
    dimensionWeights,
    questionWeights: assessment.weights.mode === 'uniforme' ? {} : assessment.weights.questions,
    participants: bundle.participants,
    responses: bundle.responses,
    evidence: bundle.evidence,
    findings: bundle.findings,
    applicability: bundle.applicability,
    thresholds,
    defaultTarget: assessment.defaultTarget,
    dimensionTargets: assessment.dimensionTargets,
    questionTargets: assessment.questionTargets,
    bankTotal: QUESTIONS.length,
  });

  const coverage = computeCoverage(states, thresholds, QUESTIONS.length);
  const dimensions = computeDimensions(states, dimensionIds, dimensionWeights, thresholds, assessment.defaultTarget, assessment.dimensionTargets);
  const globalPreliminary = computeGlobal(dimensions, 'preliminary', coverage, thresholds);
  const globalValidated = computeGlobal(dimensions, 'validated', coverage, thresholds);
  const evidence = computeEvidence(states);
  const agreement = computeAgreement(states);
  const solidity = computeSolidity(coverage.coverage, evidence.support, agreement.agreement);
  const critical = computeCriticalAlerts(states);
  const contradictions = evaluateContradictions(states);
  const alerts = computeValidationAlerts(states, thresholds, dimensions.map((d) => ({ dimensionId: d.dimensionId, coverage: d.preliminaryCoverage, applicable: d.applicable })));
  const suggestedRisks = suggestRisks(states);
  const priorities = computePriorities(states, bundle.priorityInputs);
  const initiatives = proposeInitiatives(states, priorities);
  const recommendations = states.filter((s) => s.applicable).map((s) => recommendationFor(s, organization));

  const levelDistribution = (view: View) => {
    const counts = [0, 0, 0, 0, 0, 0];
    let noData = 0;
    for (const s of states.filter((x) => x.applicable)) {
      const v = currentScore(s, view);
      if (v === null) noData += 1;
      else counts[Math.max(0, Math.min(5, Math.round(v - 0.0001)))] += 1;
    }
    return { counts, noData };
  };

  // Mapa de calor: mediana por dimensión y perfil del entrevistado (o área cuando se indica).
  const heatmap = (key: 'profile' | 'area') => {
    const groups = new Set<string>();
    states.forEach((s) => s.answers.forEach((a) => a.value !== null && groups.add((key === 'area' ? a.area : a.profile) || 'Sin área')));
    const cols = [...groups].sort();
    const cells = dimensionIds.map((d) =>
      cols.map((g) => {
        const vals: number[] = [];
        states.filter((s) => s.dimensionId === d && s.applicable).forEach((s) =>
          s.answers.forEach((a) => {
            if (a.value !== null && ((key === 'area' ? a.area : a.profile) || 'Sin área') === g) vals.push(a.value);
          }),
        );
        return vals.length ? median(vals) : null;
      }),
    );
    return { rows: dimensionIds, cols, cells };
  };

  // Comparación entre entrevistados: mediana de sus respuestas por dimensión.
  const participantComparison = bundle.participants.map((p) => ({
    participant: p,
    values: dimensionIds.map((d) => {
      const vals = states.filter((s) => s.dimensionId === d && s.applicable).flatMap((s) => s.answers.filter((a) => a.participantId === p.id && a.value !== null).map((a) => a.value as number));
      return vals.length ? median(vals) : null;
    }),
    answered: states.reduce((acc, s) => acc + (s.answers.some((a) => a.participantId === p.id) ? 1 : 0), 0),
  }));

  // Brechas por componente MGDA.
  const mgda: Record<MgdaComponent, { withGap: number; total: number; evaluated: number }> = {
    'Estratégico': { withGap: 0, total: 0, evaluated: 0 }, 'Administración de archivos': { withGap: 0, total: 0, evaluated: 0 },
    'Documental': { withGap: 0, total: 0, evaluated: 0 }, 'Tecnológico': { withGap: 0, total: 0, evaluated: 0 }, 'Cultural': { withGap: 0, total: 0, evaluated: 0 },
  };
  for (const s of states.filter((x) => x.applicable)) {
    const m = mgda[s.question.mgdaComponent];
    m.total += 1;
    const c = currentScore(s);
    if (c !== null) {
      m.evaluated += 1;
      if (s.target - c > 0) m.withGap += 1;
    }
  }

  // Resultado de criterios DIAM asociados a cada referente (nunca una certificación ni un puntaje oficial).
  const byReference = SOURCES.map((src) => {
    const related = states.filter((s) => s.applicable && s.question.sourceRefs.includes(src.id));
    const scored = related.filter((s) => currentScore(s) !== null);
    return {
      source: src,
      related: related.length,
      scored: scored.length,
      coverage: related.length ? (scored.length / related.length) * 100 : null,
      score: weightedMean(related.map((s) => ({ value: currentScore(s), weight: s.weight }))),
    };
  }).filter((r) => r.related > 0);

  // Lecturas diferenciadas: conceptos que el DIAM no fusiona en un único indicador.
  const avgOf = (filter: (s: QuestionState) => boolean, view: View | 'current' = 'current') =>
    weightedMean(states.filter((s) => s.applicable && filter(s)).map((s) => ({ value: currentScore(s, view), weight: s.weight })));
  const ORG_DIMS = new Set(['D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D12', 'D15']);
  const TECH_DIMS = new Set(['D07', 'D08', 'D09', 'D11', 'D14']);
  const SYSTEM_CAPABILITY = new Set(['D07-Q02', 'D07-Q05', 'D07-Q09', 'D07-Q13', 'D07-Q14', 'D07-Q15', 'D08-Q04', 'D08-Q05', 'D08-Q12', 'D09-Q01', 'D09-Q07', 'D09-Q11', 'D09-Q14']);
  const legal = states.filter((s) => s.applicable && !s.question.custom).map((s) => ({ s, legal: legalApplicability(s.question, organization, assessment.legalOverrides) }));
  const possibleLegalGaps = legal.filter((l) => l.legal.status !== 'buena_practica').filter((l) => {
    const c = currentScore(l.s);
    return c !== null && c < l.s.question.minimumRecommendedLevel;
  });
  const lenses = {
    organizational: avgOf((s) => ORG_DIMS.has(s.dimensionId)),
    technological: avgOf((s) => TECH_DIMS.has(s.dimensionId)),
    systemCapabilities: avgOf((s) => SYSTEM_CAPABILITY.has(s.question.id)),
    perceived: avgOf(() => true, 'preliminary'),
    evidenced: weightedMean(states.filter((s) => s.applicable && s.validated !== null && s.evidenceStatus === 'E3').map((s) => ({ value: s.validated, weight: s.weight }))),
    evidencedCount: states.filter((s) => s.applicable && s.validated !== null && s.evidenceStatus === 'E3').length,
    possibleLegalGaps: possibleLegalGaps.map((l) => ({ questionId: l.s.question.id, status: l.legal.status })),
    legalObligations: legal.filter((l) => l.legal.status === 'obligatoria').length,
    legalToValidate: legal.filter((l) => l.legal.status === 'por_validar').length,
    risks: bundle.risks.length || suggestedRisks.length,
    opportunities: initiatives.length,
  };

  const interviewsDone = bundle.interviews.filter((i) => i.status === 'finalizada').length;

  return {
    assessment, organization, questions, states, dimensionIds, dimensionWeights, thresholds,
    coverage, dimensions, globalPreliminary, globalValidated, evidence, agreement, solidity,
    critical, contradictions, alerts, suggestedRisks, priorities, initiatives, recommendations,
    levelDistribution: { preliminary: levelDistribution('preliminary'), validated: levelDistribution('validated') },
    heatmapByProfile: heatmap('profile'), heatmapByArea: heatmap('area'),
    participantComparison, mgda, byReference, lenses,
    interviews: { total: bundle.interviews.length, finished: interviewsDone, pending: Math.max(0, bundle.participants.length - interviewsDone) },
    discrepancies: alerts.filter((a) => a.kind === 'discrepancia').length,
    unresolvedDiscrepancies: alerts.filter((a) => a.kind === 'discrepancia' && a.questionId && !states.find((s) => s.question.id === a.questionId)?.finding).length,
  };
}

export type Analysis = ReturnType<typeof analyzeAssessment>;

/** Comparación histórica: solo sobre criterios comunes con escala compatible. */
export function compareAssessments(analyses: Analysis[]) {
  if (analyses.length < 2) return null;
  const sets = analyses.map((a) => new Set(a.states.filter((s) => s.applicable && !s.question.custom).map((s) => s.question.id)));
  const common = [...sets[0]].filter((id) => sets.every((s) => s.has(id)));
  const versions = new Set(analyses.map((a) => `${a.assessment.methodologyVersion}|${a.assessment.bankVersion}`));
  const limitations: string[] = [];
  if (versions.size > 1) limitations.push('Las evaluaciones usan versiones distintas de la metodología o del banco: se compara solo la intersección de criterios.');
  if (new Set(analyses.map((a) => a.assessment.modality)).size > 1) limitations.push('Las modalidades difieren: la comparación se limita a criterios comunes.');
  const series = analyses.map((a) => {
    const by = new Map(a.states.map((s) => [s.question.id, s]));
    const pick = (ids: string[]) => weightedMean(ids.map((id) => by.get(id)).filter((s): s is QuestionState => Boolean(s)).map((s) => ({ value: currentScore(s), weight: s.weight })));
    return {
      assessmentId: a.assessment.id,
      name: a.assessment.name,
      date: a.assessment.startDate || a.assessment.createdAt.slice(0, 10),
      overall: pick(common),
      byDimension: DIMENSION_IDS.map((d) => pick(common.filter((id) => id.startsWith(d)))),
    };
  });
  return { commonCriteria: common.length, limitations, series, compatible: common.length > 0 };
}

export const questionTitle = (q: Pick<Question, 'id' | 'criterion'>) => `${q.id} · ${q.criterion}`;
