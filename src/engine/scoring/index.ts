import { fmtScore } from '@/utils/core';
/**
 * Motor de calificación DIAM.
 * Independiente, determinista y sin IA. Las respuestas especiales nunca se convierten en cero.
 */
import type { DimensionId, Question } from '@/types/bank';
import type {
  ApplicabilityDecision, Evidence, EvidenceStatus, Participant, Response, SpecialCode, Target, Thresholds, ValidatedFinding,
} from '@/types/domain';
import { EVIDENCE_FACTOR, VALIDATED_EVIDENCE_LEVEL } from '../constants';
import { mean, median, ratio, stdDev, weightedMean } from './stats';

export type View = 'preliminary' | 'validated';

export interface ScoringInput {
  questions: Question[];
  dimensionIds: DimensionId[];
  dimensionWeights: Record<string, number>;
  questionWeights: Record<string, number>;
  participants: Participant[];
  responses: Response[];
  evidence: Evidence[];
  findings: ValidatedFinding[];
  applicability: ApplicabilityDecision[];
  thresholds: Thresholds;
  defaultTarget: number;
  dimensionTargets: Record<string, Target>;
  questionTargets: Record<string, Target>;
  /** Total de criterios del banco oficial (para ScopeCoverage). */
  bankTotal: number;
}

export interface ParticipantAnswer {
  participantId: string;
  code: string;
  profile: string;
  area: string;
  value: number | null;
  special: SpecialCode | null;
  note: string;
  reportedEvidence: string;
  flagged: boolean;
  updatedAt: string;
}

export interface QuestionStats {
  n: number;
  median: number;
  mean: number;
  min: number;
  max: number;
  range: number;
  sd: number | null;
  profiles: number;
  distribution: number[];
}

export interface QuestionState {
  question: Question;
  dimensionId: DimensionId;
  weight: number;
  applicable: boolean;
  naDecision: ApplicabilityDecision | null;
  answers: ParticipantAnswer[];
  stats: QuestionStats | null;
  specials: Partial<Record<SpecialCode, number>>;
  preliminary: number | null;
  validated: number | null;
  finding: ValidatedFinding | null;
  evidenceStatus: EvidenceStatus;
  evidenceFactor: number;
  evidenceCount: number;
  agreement: number | null;
  target: number;
  targetReason: string;
  proposedNA: number;
  /** Nivel validado ≥ 3 con evidencia E0 o E1: validado sin evidencia suficiente. */
  insufficientEvidence: boolean;
}

/** Valor actual: el validado prevalece cuando existe; si no, el preliminar. */
export const currentScore = (s: QuestionState, view: View | 'current' = 'current'): number | null =>
  view === 'preliminary' ? s.preliminary : view === 'validated' ? s.validated : s.validated ?? s.preliminary;

const EVIDENCE_ORDER: EvidenceStatus[] = ['E0', 'E1', 'E2', 'E3'];

export function buildQuestionStates(input: ScoringInput): QuestionState[] {
  const participants = new Map(input.participants.map((p) => [p.id, p]));
  const byQuestion = new Map<string, Response[]>();
  for (const r of input.responses) {
    if (!participants.has(r.participantId)) continue;
    const list = byQuestion.get(r.questionId) ?? [];
    list.push(r);
    byQuestion.set(r.questionId, list);
  }
  const findingBy = new Map(input.findings.map((f) => [f.questionId, f]));
  const naBy = new Map<string, ApplicabilityDecision>();
  for (const d of input.applicability) if (d.status === 'validado') naBy.set(d.questionId, d);
  const evidenceBy = new Map<string, Evidence[]>();
  for (const e of input.evidence) {
    const l = evidenceBy.get(e.questionId) ?? [];
    l.push(e);
    evidenceBy.set(e.questionId, l);
  }

  return input.questions.map((q) => {
    // Una sola observación por participante: la respuesta más reciente.
    const latest = new Map<string, Response>();
    for (const r of byQuestion.get(q.id) ?? []) {
      const prev = latest.get(r.participantId);
      if (!prev || prev.updatedAt < r.updatedAt) latest.set(r.participantId, r);
    }
    const answers: ParticipantAnswer[] = [...latest.values()].map((r) => {
      const p = participants.get(r.participantId) as Participant;
      return {
        participantId: r.participantId, code: p.code, profile: p.profile, area: p.area,
        value: r.special === null ? r.value : null, special: r.special, note: r.note,
        reportedEvidence: r.reportedEvidence, flagged: r.flagged, updatedAt: r.updatedAt,
      };
    }).sort((a, b) => a.code.localeCompare(b.code));

    const numeric = answers.filter((a) => a.value !== null).map((a) => a.value as number);
    const specials: Partial<Record<SpecialCode, number>> = {};
    for (const a of answers) if (a.special) specials[a.special] = (specials[a.special] ?? 0) + 1;

    let stats: QuestionStats | null = null;
    if (numeric.length) {
      const distribution = [0, 0, 0, 0, 0, 0];
      numeric.forEach((v) => (distribution[v] += 1));
      const min = Math.min(...numeric);
      const max = Math.max(...numeric);
      stats = {
        n: numeric.length,
        median: median(numeric) as number,
        mean: mean(numeric) as number,
        min, max, range: max - min,
        sd: stdDev(numeric),
        profiles: new Set(answers.filter((a) => a.value !== null).map((a) => a.profile)).size,
        distribution,
      };
    }

    const ev = evidenceBy.get(q.id) ?? [];
    const evidenceStatus = ev.reduce<EvidenceStatus>(
      (best, e) => (EVIDENCE_ORDER.indexOf(e.status) > EVIDENCE_ORDER.indexOf(best) ? e.status : best),
      'E0',
    );
    const finding = findingBy.get(q.id) ?? null;
    const naDecision = naBy.get(q.id) ?? null;
    const qt = input.questionTargets[q.id];
    const dt = input.dimensionTargets[q.dimensionId];
    const weight = input.questionWeights[q.id] ?? q.defaultWeight ?? 1;

    return {
      question: q,
      dimensionId: q.dimensionId,
      weight: weight > 0 ? weight : 0,
      applicable: !naDecision,
      naDecision,
      answers,
      stats,
      specials,
      preliminary: stats ? stats.median : null,
      validated: finding ? finding.finalLevel : null,
      finding,
      evidenceStatus,
      evidenceFactor: EVIDENCE_FACTOR[evidenceStatus],
      evidenceCount: ev.length,
      agreement: stats && stats.n >= 2 ? 1 - stats.range / 5 : null,
      target: qt?.level ?? dt?.level ?? input.defaultTarget,
      targetReason: qt?.reason ?? dt?.reason ?? 'Meta orientativa inicial del DIAM.',
      proposedNA: specials.NO_APLICA_PROPUESTO ?? 0,
      insufficientEvidence: finding !== null && finding.finalLevel >= VALIDATED_EVIDENCE_LEVEL && (evidenceStatus === 'E0' || evidenceStatus === 'E1'),
    };
  });
}

/** Clasificación por rangos, usando la precisión completa del valor. */
export function levelIndex(score: number): number {
  if (score < 0.5) return 0;
  if (score < 1.5) return 1;
  if (score < 2.5) return 2;
  if (score < 3.5) return 3;
  if (score < 4.5) return 4;
  return 5;
}

export type CoverageBand = 'insuficiente' | 'exploratorio' | 'parcial' | 'alta';

export function coverageBand(pct: number | null, t: Thresholds): CoverageBand | null {
  if (pct === null) return null;
  if (pct < t.coverageInsufficient) return 'insuficiente';
  if (pct < t.coverageExploratory) return 'exploratorio';
  if (pct < t.coveragePartial) return 'parcial';
  return 'alta';
}

export const COVERAGE_BAND_LABEL: Record<CoverageBand, string> = {
  insuficiente: 'Información insuficiente para interpretar el agregado',
  exploratorio: 'Resultado exploratorio',
  parcial: 'Resultado parcial',
  alta: 'Alta cobertura del alcance seleccionado',
};

export interface CoverageResult {
  scope: number;
  applicable: number;
  numeric: number;
  validated: number;
  notApplicable: number;
  coverage: number | null;
  validationCoverage: number | null;
  weightedCoverage: number | null;
  /** Alcance sobre el banco: criterios aplicables del alcance / criterios del banco (225). */
  scopeCoverage: number | null;
  /** Cobertura del banco: criterios oficiales con puntuación / criterios del banco (225). */
  bankCoverage: number | null;
  bankScored: number;
  bankTotal: number;
  band: CoverageBand | null;
  validationBand: CoverageBand | null;
}

export function computeCoverage(states: QuestionState[], thresholds: Thresholds, bankTotal: number): CoverageResult {
  const applicable = states.filter((s) => s.applicable);
  const numeric = applicable.filter((s) => s.preliminary !== null);
  const validated = applicable.filter((s) => s.validated !== null);
  const notApplicable = states.length - applicable.length;
  const pct = (n: number, d: number) => {
    const r = ratio(n, d);
    return r === null ? null : r * 100;
  };
  const wApplicable = applicable.reduce((a, s) => a + s.weight, 0);
  const wNumeric = numeric.reduce((a, s) => a + s.weight, 0);
  // ScopeCoverage: criterios aplicables seleccionados del banco oficial / criterios aplicables del banco completo.
  const officialApplicable = applicable.filter((s) => !s.question.custom).length;
  const bankApplicable = bankTotal - states.filter((s) => !s.applicable && !s.question.custom).length;
  const coverage = pct(numeric.length, applicable.length);
  const validationCoverage = pct(validated.length, applicable.length);
  return {
    scope: states.length,
    applicable: applicable.length,
    numeric: numeric.length,
    validated: validated.length,
    notApplicable,
    coverage,
    validationCoverage,
    weightedCoverage: pct(wNumeric, wApplicable),
    scopeCoverage: pct(officialApplicable, bankApplicable),
    bankCoverage: pct(numeric.filter((s) => !s.question.custom).length, bankTotal),
    bankScored: numeric.filter((s) => !s.question.custom).length,
    bankTotal,
    band: coverageBand(coverage, thresholds),
    validationBand: coverageBand(validationCoverage, thresholds),
  };
}

export interface DimensionResult {
  dimensionId: DimensionId;
  weight: number;
  scope: number;
  applicable: number;
  preliminary: number | null;
  validated: number | null;
  preliminaryCoverage: number | null;
  validatedCoverage: number | null;
  weightedCoverage: number | null;
  evidenceSupport: number | null;
  target: number;
  /** Brecha con el valor actual (validado si existe, si no preliminar) de la dimensión. */
  gap: number | null;
  /** Brecha media por criterio: promedio ponderado de máx(0, meta − nivel) en cada vista. */
  gapPreliminary: number | null;
  gapValidated: number | null;
  insufficient: boolean;
  band: CoverageBand | null;
}

export function computeDimensions(
  states: QuestionState[],
  dimensionIds: DimensionId[],
  dimensionWeights: Record<string, number>,
  thresholds: Thresholds,
  defaultTarget: number,
  dimensionTargets: Record<string, Target>,
): DimensionResult[] {
  return dimensionIds.map((d) => {
    const all = states.filter((s) => s.dimensionId === d);
    const app = all.filter((s) => s.applicable);
    const prel = weightedMean(app.map((s) => ({ value: s.preliminary, weight: s.weight })));
    const val = weightedMean(app.map((s) => ({ value: s.validated, weight: s.weight })));
    const numeric = app.filter((s) => s.preliminary !== null);
    const validated = app.filter((s) => s.validated !== null);
    const prelCov = ratio(numeric.length, app.length);
    const wApp = app.reduce((a, s) => a + s.weight, 0);
    const wNum = numeric.reduce((a, s) => a + s.weight, 0);
    const evidenceSupport = weightedMean(numeric.map((s) => ({ value: s.evidenceFactor, weight: s.weight })));
    const target = dimensionTargets[d]?.level ?? defaultTarget;
    const current = val ?? prel;
    const coveragePct = prelCov === null ? null : prelCov * 100;
    return {
      dimensionId: d,
      weight: dimensionWeights[d] ?? 0,
      scope: all.length,
      applicable: app.length,
      preliminary: prel,
      validated: val,
      preliminaryCoverage: coveragePct,
      validatedCoverage: ratio(validated.length, app.length) === null ? null : (ratio(validated.length, app.length) as number) * 100,
      weightedCoverage: ratio(wNum, wApp) === null ? null : (ratio(wNum, wApp) as number) * 100,
      evidenceSupport: evidenceSupport === null ? null : evidenceSupport * 100,
      target,
      gap: current === null ? null : Math.max(0, target - current),
      gapPreliminary: computeWeightedGap(app, 'preliminary'),
      gapValidated: computeWeightedGap(app, 'validated'),
      insufficient: prel === null,
      band: coverageBand(coveragePct, thresholds),
    };
  });
}

/**
 * Brecha frente a la meta: promedio ponderado (pesos de criterio) de máx(0, meta − nivel)
 * sobre los criterios aplicables con puntuación en la vista indicada.
 */
export function computeWeightedGap(states: QuestionState[], view: View | 'current'): number | null {
  return weightedMean(states.filter((s) => s.applicable).map((s) => {
    const v = currentScore(s, view);
    return { value: v === null ? null : Math.max(0, s.target - v), weight: s.weight };
  }));
}

export type GlobalLabel = 'preliminar_alcance' | 'validada_alcance' | 'integral_validada';

export interface GlobalResult {
  view: View;
  score: number | null;
  levelIndex: number | null;
  percentOfMax: number | null;
  included: DimensionId[];
  excluded: { dimensionId: DimensionId; reason: string }[];
  label: GlobalLabel;
  labelText: string;
}

export const GLOBAL_LABEL_TEXT: Record<GlobalLabel, string> = {
  preliminar_alcance: 'Madurez preliminar del alcance evaluado',
  validada_alcance: 'Madurez validada del alcance evaluado',
  integral_validada: 'Madurez integral validada',
};

export function computeGlobal(dims: DimensionResult[], view: View, coverage: CoverageResult, thresholds: Thresholds): GlobalResult {
  const excluded: { dimensionId: DimensionId; reason: string }[] = [];
  const items: { value: number | null; weight: number }[] = [];
  const included: DimensionId[] = [];
  for (const d of dims) {
    const score = view === 'preliminary' ? d.preliminary : d.validated;
    if (d.applicable === 0) excluded.push({ dimensionId: d.dimensionId, reason: 'Sin criterios aplicables' });
    else if (score === null) excluded.push({ dimensionId: d.dimensionId, reason: view === 'validated' ? 'Sin criterios validados' : 'Datos insuficientes' });
    else if (d.weight <= 0) excluded.push({ dimensionId: d.dimensionId, reason: 'Ponderación cero' });
    else {
      items.push({ value: score, weight: d.weight });
      included.push(d.dimensionId);
    }
  }
  const score = weightedMean(items);
  let label: GlobalLabel = view === 'preliminary' ? 'preliminar_alcance' : 'validada_alcance';
  if (
    view === 'validated' && score !== null && included.length === 15 && excluded.length === 0 &&
    (coverage.scopeCoverage ?? 0) >= 99.999 && (coverage.validationCoverage ?? 0) >= thresholds.coveragePartial
  ) label = 'integral_validada';
  return {
    view,
    score,
    levelIndex: score === null ? null : levelIndex(score),
    percentOfMax: score === null ? null : (score / 5) * 100,
    included,
    excluded,
    label,
    labelText: GLOBAL_LABEL_TEXT[label],
  };
}

export interface EvidenceResult {
  support: number | null;
  verificationCoverage: number | null;
  byStatus: Record<EvidenceStatus, number>;
}

export function computeEvidence(states: QuestionState[]): EvidenceResult {
  const applicable = states.filter((s) => s.applicable);
  const scored = applicable.filter((s) => s.preliminary !== null);
  const support = weightedMean(scored.map((s) => ({ value: s.evidenceFactor, weight: s.weight })));
  const e3 = applicable.filter((s) => s.evidenceStatus === 'E3').length;
  const byStatus: Record<EvidenceStatus, number> = { E0: 0, E1: 0, E2: 0, E3: 0 };
  applicable.forEach((s) => (byStatus[s.evidenceStatus] += 1));
  const vc = ratio(e3, applicable.length);
  return { support: support === null ? null : support * 100, verificationCoverage: vc === null ? null : vc * 100, byStatus };
}

export interface AgreementResult {
  agreement: number | null;
  contrastable: number;
  withData: number;
  contrastableRatio: number | null;
}

export function computeAgreement(states: QuestionState[]): AgreementResult {
  const app = states.filter((s) => s.applicable);
  const withData = app.filter((s) => s.stats !== null);
  const contrast = withData.filter((s) => s.agreement !== null);
  const agreement = weightedMean(contrast.map((s) => ({ value: s.agreement, weight: s.weight })));
  const r = ratio(contrast.length, withData.length);
  return { agreement, contrastable: contrast.length, withData: withData.length, contrastableRatio: r === null ? null : r * 100 };
}

export interface SolidityResult {
  index: number | null;
  components: { coverage: number | null; evidence: number | null; agreement: number | null };
  missing: string[];
}

/** Índice orientativo de solidez diagnóstica. No es una confianza estadística. */
export function computeSolidity(coverage: number | null, evidence: number | null, agreement: number | null): SolidityResult {
  const agreementPct = agreement === null ? null : agreement * 100;
  const missing: string[] = [];
  if (coverage === null) missing.push('cobertura');
  if (evidence === null) missing.push('soporte de evidencias');
  if (agreementPct === null) missing.push('acuerdo entre entrevistados');
  const index = missing.length ? null : 0.4 * (coverage as number) + 0.4 * (evidence as number) + 0.2 * (agreementPct as number);
  return { index, components: { coverage, evidence, agreement: agreementPct }, missing };
}

export interface CriticalAlert {
  questionId: string;
  kind: 'critico_bajo' | 'critico_no_evaluado';
  score: number | null;
  message: string;
}

export function computeCriticalAlerts(states: QuestionState[]): CriticalAlert[] {
  const out: CriticalAlert[] = [];
  for (const s of states) {
    if (!s.question.isCritical || !s.applicable) continue;
    const score = currentScore(s);
    if (score === null) out.push({ questionId: s.question.id, kind: 'critico_no_evaluado', score: null, message: 'Capacidad crítica no evaluada' });
    else if (score <= 1) out.push({ questionId: s.question.id, kind: 'critico_bajo', score, message: `Capacidad crítica en nivel ${fmtScore(score)}: requiere atención independiente del promedio` });
  }
  return out;
}

export const dimensionIdsOf = (questions: Pick<Question, 'dimensionId'>[]): DimensionId[] =>
  [...new Set(questions.map((q) => q.dimensionId))].sort() as DimensionId[];
