/**
 * Orquestador del análisis de una evaluación. Combina los motores independientes y produce
 * un resultado inmutable consumido por el dashboard, los informes y la narrativa.
 */
import type { DimensionId, MgdaComponent, Question } from '@/types/bank';
import type { AssessmentBundle } from '@/types/domain';
import { DIMENSION_IDS, QUESTIONS, SOURCES, getDimensionFamily, questionsForAssessment } from '@/data/bank';
import { DEFAULT_THRESHOLDS, LENS_DIMENSIONS, SYSTEM_CAPABILITY_IDS } from './constants';
import { MGDA_FAMILIES } from '@/config/vocabulary';
import {
  buildQuestionStates, computeAgreement, computeCoverage, computeCriticalAlerts, computeDimensions, computeEvidence,
  computeGlobal, computeSolidity, computeWeightedGap, coverageBand, currentScore, type CriticalAlert, type DimensionResult, type QuestionState, type View,
} from './scoring';
import { median, ratio, weightedMean } from './scoring/stats';
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
  const legalOf = (qid: string) => {
    const st = states.find((x) => x.question.id === qid);
    return st ? legalApplicability(st.question, organization, assessment.legalOverrides).status : 'buena_practica';
  };
  const suggestedRisks = suggestRisks(states, legalOf);
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
  // Organizacional y tecnológica: promedio ponderado de las dimensiones del subconjunto (pesos de dimensión),
  // con el mismo método de la madurez global. Capacidades de sistemas: promedio ponderado de criterios.
  const dimLens = (ids: readonly string[], view: View) => {
    const rows = dimensions.filter((d) => ids.includes(d.dimensionId));
    const pick = (d: DimensionResult) => (view === 'preliminary' ? d.preliminary : d.validated);
    return {
      score: weightedMean(rows.map((d) => ({ value: pick(d), weight: d.weight }))),
      included: rows.filter((d) => pick(d) !== null && d.weight > 0).map((d) => d.dimensionId),
      excluded: [...ids.filter((id) => !dimensionIds.includes(id as DimensionId)), ...rows.filter((d) => pick(d) === null || d.weight <= 0).map((d) => d.dimensionId)],
      dimensions: [...ids],
    };
  };
  const systemSet = new Set<string>(SYSTEM_CAPABILITY_IDS);
  const critLens = (filter: (s: QuestionState) => boolean, view: View) => {
    const rows = states.filter((s) => s.applicable && filter(s));
    return { score: weightedMean(rows.map((s) => ({ value: currentScore(s, view), weight: s.weight }))), scored: rows.filter((s) => currentScore(s, view) !== null).length, total: rows.length };
  };
  const familyOf = (d: string) => getDimensionFamily(d);
  const legal = states.filter((s) => s.applicable && !s.question.custom).map((s) => ({ s, legal: legalApplicability(s.question, organization, assessment.legalOverrides) }));
  const possibleLegalGaps = legal.filter((l) => l.legal.status !== 'buena_practica').filter((l) => {
    const c = currentScore(l.s);
    return c !== null && c < l.s.question.minimumRecommendedLevel;
  });
  const sustained = states.filter((s) => s.applicable && s.validated !== null && (s.evidenceStatus === 'E2' || s.evidenceStatus === 'E3'));
  const insufficientEvidence = states.filter((s) => s.applicable && s.insufficientEvidence).map((s) => s.question.id);
  const lenses = {
    /** Percepción de los entrevistados: la misma madurez preliminar (medianas por criterio, ponderación por dimensión). */
    perceived: globalPreliminary.score,
    evidenced: weightedMean(sustained.map((s) => ({ value: s.validated, weight: s.weight }))),
    evidencedCount: sustained.length,
    insufficientEvidence,
    possibleLegalGaps: possibleLegalGaps.map((l) => ({ questionId: l.s.question.id, status: l.legal.status })),
    legalObligations: legal.filter((l) => l.legal.status === 'obligatoria').length,
    legalToValidate: legal.filter((l) => l.legal.status === 'por_validar').length,
    risks: bundle.risks.length || suggestedRisks.length,
    risksRegistered: bundle.risks.length,
    opportunities: initiatives.length,
  };

  // Resumen por vista: todos los indicadores dependientes de la serie se recalculan sobre ella.
  const viewSummary = (view: View) => {
    const g = view === 'preliminary' ? globalPreliminary : globalValidated;
    const app = states.filter((s) => s.applicable);
    const scored = app.filter((s) => currentScore(s, view) !== null);
    const cov = ratio(scored.length, app.length);
    const coveragePct = cov === null ? null : cov * 100;
    const support = weightedMean(scored.map((s) => ({ value: s.evidenceFactor, weight: s.weight })));
    const prelIncluded = globalPreliminary.included;
    const narrower = g.included.length < prelIncluded.length;
    const band = coverageBand(coveragePct, thresholds);
    return {
      view,
      global: g,
      gap: computeWeightedGap(states, view),
      scored: scored.length,
      coverage: coveragePct,
      band,
      evidenceSupport: support === null ? null : support * 100,
      organizational: dimLens(LENS_DIMENSIONS.organizational, view),
      technological: dimLens(LENS_DIMENSIONS.technological, view),
      systemCapabilities: critLens((s) => systemSet.has(s.question.id), view),
      families: MGDA_FAMILIES.map((f) => {
        const rows = dimensions.filter((d) => familyOf(d.dimensionId) === f.key);
        return { key: f.key, title: f.title, dimensions: rows.map((d) => d.dimensionId), score: weightedMean(rows.map((d) => ({ value: view === 'preliminary' ? d.preliminary : d.validated, weight: d.weight }))), target: weightedMean(rows.map((d) => ({ value: d.target, weight: d.weight }))) };
      }),
      bankScored: scored.filter((s) => !s.question.custom).length,
      bankCoverage: (scored.filter((s) => !s.question.custom).length / QUESTIONS.length) * 100,
      /** Criterios con posible obligación o por validar cuyo nivel en esta vista está por debajo del mínimo recomendado. */
      legalGaps: legal.filter((l) => l.legal.status !== 'buena_practica').filter((l) => {
        const c = currentScore(l.s, view);
        return c !== null && c < l.s.question.minimumRecommendedLevel;
      }).map((l) => ({ questionId: l.s.question.id, status: l.legal.status })),
      critical: app.filter((s) => s.question.isCritical).flatMap((s): CriticalAlert[] => {
        const c = currentScore(s, view);
        if (c === null) return [{ questionId: s.question.id, kind: 'critico_no_evaluado', score: null, message: 'Capacidad crítica sin evaluar en esta vista' }];
        if (c <= 1) return [{ questionId: s.question.id, kind: 'critico_bajo', score: c, message: 'Capacidad crítica en nivel 0 o 1: requiere atención independiente del promedio' }];
        return [];
      }),
      mgda: MGDA_FAMILIES.map((f) => {
        const rows = app.filter((s) => s.question.mgdaComponent === f.key);
        const ev = rows.filter((s) => currentScore(s, view) !== null);
        const withGap = ev.filter((s) => s.target - (currentScore(s, view) as number) > 0).length;
        return { key: f.key, withGap, noGap: ev.length - withGap, notEvaluated: rows.length - ev.length, total: rows.length };
      }),
      byReference: SOURCES.map((src) => {
        const related = app.filter((s) => s.question.sourceRefs.includes(src.id));
        const sc = related.filter((s) => currentScore(s, view) !== null);
        return { source: src, related: related.length, scored: sc.length, coverage: related.length ? (sc.length / related.length) * 100 : null, score: weightedMean(related.map((s) => ({ value: currentScore(s, view), weight: s.weight }))) };
      }).filter((r) => r.related > 0),
      /** «Exploratorio»: cobertura insuficiente o exploratoria en la vista, o agregado calculado sobre menos dimensiones. */
      exploratory: band === 'insuficiente' || band === 'exploratorio' || (view === 'validated' && narrower),
      includedLabel: dimensionRangeLabel(g.included),
    };
  };
  const views = { preliminary: viewSummary('preliminary'), validated: viewSummary('validated') };

  const interviewsDone = bundle.interviews.filter((i) => i.status === 'finalizada').length;

  return {
    assessment, organization, questions, states, dimensionIds, dimensionWeights, thresholds,
    coverage, dimensions, globalPreliminary, globalValidated, evidence, agreement, solidity,
    critical, contradictions, alerts, suggestedRisks, priorities, initiatives, recommendations,
    levelDistribution: { preliminary: levelDistribution('preliminary'), validated: levelDistribution('validated') },
    heatmapByProfile: heatmap('profile'), heatmapByArea: heatmap('area'),
    participantComparison, mgda, byReference, lenses, views,
    interviews: { total: bundle.interviews.length, finished: interviewsDone, pending: Math.max(0, bundle.participants.length - interviewsDone) },
    discrepancies: alerts.filter((a) => a.kind === 'discrepancia').length,
    unresolvedDiscrepancies: alerts.filter((a) => a.kind === 'discrepancia' && a.questionId && !states.find((s) => s.question.id === a.questionId)?.finding).length,
  };
}

export type Analysis = ReturnType<typeof analyzeAssessment>;
export type ViewSummary = Analysis['views']['preliminary'];

/**
 * Rótulo compacto de un conjunto de dimensiones: los tramos de tres o más dimensiones consecutivas
 * se escriben como rango («D01–D05»); los demás, separados por comas («D01–D06, D12, D13, D15»).
 */
export function dimensionRangeLabel(ids: string[]): string {
  if (!ids.length) return '—';
  const nums = [...new Set(ids.map((d) => Number(d.slice(1))))].sort((a, b) => a - b);
  const fmt = (n: number) => `D${String(n).padStart(2, '0')}`;
  const parts: string[] = [];
  for (let i = 0; i < nums.length; ) {
    let j = i;
    while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j += 1;
    if (j - i >= 2) parts.push(`${fmt(nums[i])}–${fmt(nums[j])}`);
    else for (let k = i; k <= j; k += 1) parts.push(fmt(nums[k]));
    i = j + 1;
  }
  return parts.join(', ');
}

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
