/**
 * Motor de priorización determinista.
 * PriorityScore = 0,30·Brecha + 0,25·Impacto + 0,20·Criticidad + 0,15·Urgencia + 0,10·Habilitador (escala 0–5).
 * El esfuerzo nunca reduce la prioridad: solo ubica la oportunidad en la matriz impacto–esfuerzo.
 */
import type { PriorityInput } from '@/types/domain';
import { PRIORITY_WEIGHTS } from '../constants';
import { clamp } from '../scoring/stats';
import { currentScore, type QuestionState } from '../scoring';

export type FactorSource = 'valorado' | 'estimado' | 'calculado';

export interface Factor {
  value: number;
  source: FactorSource;
}

export type Quadrant = 'victorias_rapidas' | 'proyectos_estrategicos' | 'mejoras_menores' | 'reevaluacion';

export const QUADRANT_LABEL: Record<Quadrant, string> = {
  victorias_rapidas: 'Victorias rápidas',
  proyectos_estrategicos: 'Proyectos estratégicos',
  mejoras_menores: 'Mejoras menores',
  reevaluacion: 'Proyectos que requieren reevaluación',
};

export interface PriorityItem {
  questionId: string;
  dimensionId: string;
  criterion: string;
  current: number;
  target: number;
  gap: Factor;
  impact: Factor;
  criticality: Factor;
  urgency: Factor;
  enabler: Factor;
  effort: Factor;
  score: number;
  capped: boolean;
  quadrant: Quadrant;
  explanation: string;
  pending: string[];
}

/** Criterios de D14 que corresponden a controles y gobierno, no a la incorporación de tecnología. */
const D14_CONTROL_IDS = new Set(['D14-Q10', 'D14-Q11', 'D14-Q12', 'D14-Q13', 'D14-Q14', 'D14-Q15']);

const fmt = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 2 });

export function computePriorities(states: QuestionState[], inputs: PriorityInput[]): PriorityItem[] {
  const inputBy = new Map(inputs.map((i) => [i.questionId, i]));
  const applicable = states.filter((s) => s.applicable);
  const inScope = new Set(applicable.map((s) => s.question.id));
  const dependents = new Map<string, number>();
  for (const s of applicable) {
    for (const p of s.question.prerequisiteQuestionIds) if (inScope.has(p)) dependents.set(p, (dependents.get(p) ?? 0) + 1);
  }

  const items: PriorityItem[] = [];
  for (const s of applicable) {
    const cur = currentScore(s);
    if (cur === null) continue;
    const gapValue = Math.max(0, s.target - cur);
    if (gapValue <= 0) continue;
    const inp = inputBy.get(s.question.id);
    const q = s.question;
    const critValue = q.isCritical ? 5 : q.criticality === 'alta' ? 4 : q.criticality === 'media' ? 3 : 1;
    const impact: Factor = inp?.impact != null ? { value: inp.impact, source: 'valorado' } : { value: q.isCritical || q.criticality === 'alta' ? 4 : q.criticality === 'media' ? 3 : 2, source: 'estimado' };
    const urgency: Factor = inp?.urgency != null ? { value: inp.urgency, source: 'valorado' } : { value: q.isCritical && cur <= 1 ? 5 : cur <= 1 ? 3 : 2, source: 'estimado' };
    const deps = dependents.get(q.id) ?? 0;
    const enabler: Factor = inp?.enabler != null ? { value: inp.enabler, source: 'valorado' } : { value: deps === 0 ? 0 : deps === 1 ? 2 : deps === 2 ? 3 : 5, source: 'calculado' };
    const effort: Factor = inp?.effort != null ? { value: inp.effort, source: 'valorado' } : { value: gapValue >= 3 ? 4 : gapValue >= 2 ? 3 : 2, source: 'estimado' };
    const gap: Factor = { value: clamp(gapValue, 0, 5), source: 'calculado' };
    const criticality: Factor = { value: critValue, source: 'calculado' };
    const score =
      PRIORITY_WEIGHTS.gap * gap.value + PRIORITY_WEIGHTS.impact * impact.value + PRIORITY_WEIGHTS.criticality * criticality.value +
      PRIORITY_WEIGHTS.urgency * urgency.value + PRIORITY_WEIGHTS.enabler * enabler.value;
    const pending = [impact, urgency].some((f) => f.source === 'estimado') ? ['impacto o urgencia sin valorar (estimación inicial)'] : [];
    const imp = impact.value;
    const eff = effort.value;
    const quadrant: Quadrant = imp >= 3 ? (eff < 3 ? 'victorias_rapidas' : 'proyectos_estrategicos') : eff < 3 ? 'mejoras_menores' : 'reevaluacion';
    items.push({
      questionId: q.id, dimensionId: q.dimensionId, criterion: q.criterion, current: cur, target: s.target,
      gap, impact, criticality, urgency, enabler, effort, score, capped: false, quadrant, pending,
      explanation: `Brecha ${fmt(gap.value)} · impacto ${imp}${impact.source === 'estimado' ? ' (estimado)' : ''} · criticidad ${critValue} · urgencia ${urgency.value}${urgency.source === 'estimado' ? ' (estimada)' : ''} · habilitador ${enabler.value}${deps ? ` (${deps} criterio(s) dependen de este)` : ''}.`,
    });
  }

  // Regla de prudencia: la incorporación de tecnologías inteligentes no supera controles esenciales abiertos sin justificación.
  const essential = items.filter((i) => i.criticality.value === 5);
  if (essential.length) {
    const floor = Math.min(...essential.map((i) => i.score));
    for (const i of items) {
      if (i.dimensionId !== 'D14' || D14_CONTROL_IDS.has(i.questionId)) continue;
      const just = inputBy.get(i.questionId)?.justification?.trim();
      if (!just && i.score >= floor) {
        i.score = Math.max(0, floor - 0.01);
        i.capped = true;
        i.explanation += ' Prioridad limitada: existen controles esenciales con brecha que deben atenderse antes de incorporar tecnologías inteligentes.';
      }
    }
  }

  return orderRespectingDependencies(items.sort((a, b) => b.score - a.score || a.questionId.localeCompare(b.questionId)), states);
}

/** Orden estable que ubica cada prerrequisito con brecha antes de los criterios que dependen de él. */
export function orderRespectingDependencies(items: PriorityItem[], states: QuestionState[]): PriorityItem[] {
  const pre = new Map(states.map((s) => [s.question.id, s.question.prerequisiteQuestionIds]));
  const present = new Map(items.map((i) => [i.questionId, i]));
  const placed = new Set<string>();
  const out: PriorityItem[] = [];
  const visit = (i: PriorityItem, stack: Set<string>) => {
    if (placed.has(i.questionId) || stack.has(i.questionId)) return;
    stack.add(i.questionId);
    for (const p of pre.get(i.questionId) ?? []) {
      const dep = present.get(p);
      if (dep) visit(dep, stack);
    }
    placed.add(i.questionId);
    out.push(i);
  };
  items.forEach((i) => visit(i, new Set()));
  return out;
}
