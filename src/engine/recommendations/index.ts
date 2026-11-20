/**
 * Recomendaciones por criterio y propuesta de iniciativas.
 * El nivel actual determina el tipo de acción (formular, formalizar, implementar, controlar, evaluar, optimizar):
 * nunca se recomienda formular algo que ya existe cuando el problema es su implementación.
 */
import type { RecommendationVerb } from '@/types/bank';
import type { Organization } from '@/types/domain';
import { INITIATIVE_TEMPLATES, type InitiativeTemplate } from '@/data/recommendations/initiatives';
import { getProfile } from '@/data/sector-profiles';
import { getSource } from '@/data/bank';
import { currentScore, type QuestionState } from '../scoring';
import type { PriorityItem } from '../prioritization';

export const VERB_LABEL: Record<RecommendationVerb, string> = {
  formular: 'Formular', formalizar: 'Formalizar', implementar: 'Implementar', extender: 'Extender',
  controlar: 'Controlar', medir: 'Medir', evaluar: 'Evaluar', optimizar: 'Optimizar',
};

const ROLE_LABEL: Record<string, string> = {
  direccion: 'Alta dirección', planeacion: 'Planeación', gestion_documental: 'Gestión documental', archivo: 'Administración de archivos',
  tecnologia: 'Tecnología', seguridad: 'Seguridad de la información', juridica: 'Jurídica', control_interno: 'Control interno',
  financiera: 'Gestión financiera', talento_humano: 'Talento humano', calidad: 'Calidad', gobierno_datos: 'Gobierno de datos',
  procesos: 'Responsables de procesos', usuarios: 'Usuarios finales', proveedores: 'Proveedores autorizados', otros: 'Otros',
};
export const roleLabel = (r: string) => ROLE_LABEL[r] ?? r;

export interface CriterionRecommendation {
  questionId: string;
  dimensionId: string;
  criterion: string;
  status: 'evaluar' | 'brecha' | 'superado';
  currentLevel: number | null;
  target: number;
  verb: RecommendationVerb | null;
  problem: string;
  action: string;
  justification: string;
  expectedResult: string;
  responsible: string;
  complianceEvidence: string;
  indicator: string;
  dependencies: string[];
  effort: 'bajo' | 'medio' | 'alto' | null;
  references: string[];
  sectorConsiderations: string;
}

export function recommendationFor(s: QuestionState, org: Pick<Organization, 'profileId'>): CriterionRecommendation {
  const q = s.question;
  const cur = currentScore(s);
  const base = {
    questionId: q.id, dimensionId: q.dimensionId, criterion: q.criterion, target: s.target,
    justification: q.whyItMatters,
    responsible: q.suggestedRespondents.slice(0, 2).map(roleLabel).join(' y ') || 'Equipo evaluador',
    complianceEvidence: q.evidenceSuggestions.slice(0, 3).join('; '),
    dependencies: q.prerequisiteQuestionIds,
    references: q.sourceRefs.map((r) => getSource(r)?.shortLabel ?? r),
    sectorConsiderations: getProfile(org.profileId).terminologyNote,
  };
  if (cur === null) {
    return {
      ...base, status: 'evaluar', currentLevel: null, verb: null,
      problem: 'La capacidad no cuenta con puntuación en este diagnóstico.',
      action: 'Evaluar la capacidad antes de definir acciones.',
      expectedResult: 'Nivel actual estimado con respuestas y evidencias.',
      indicator: `Criterio ${q.id} con puntuación preliminar o validada.`,
      effort: null,
    };
  }
  const level = Math.max(0, Math.min(5, Math.floor(cur)));
  const rec = q.recommendationByLevel[level];
  const gap = Math.max(0, s.target - cur);
  const targetLevel = Math.max(0, Math.min(5, Math.ceil(s.target)));
  return {
    ...base,
    status: gap > 0 ? 'brecha' : 'superado',
    currentLevel: cur,
    verb: rec?.verb ?? null,
    problem: q.maturityDescriptors[level],
    action: rec?.text ?? 'Mantener la capacidad y evaluar periódicamente su efectividad.',
    expectedResult: gap > 0 ? q.maturityDescriptors[targetLevel] : 'Condición superada frente al nivel objetivo: mantener y verificar.',
    indicator: `Nivel validado de ${q.id} igual o superior a ${s.target.toLocaleString('es-CO')}; ${(q.observableChecks[0] ?? 'comprobación observable').toLowerCase()}.`,
    effort: gap === 0 ? null : gap >= 3 ? 'alto' : gap >= 2 ? 'medio' : 'bajo',
  };
}

export interface ProposedInitiative {
  template: InitiativeTemplate;
  questionIds: string[];
  phase: 1 | 2 | 3 | 4;
  priority: number | null;
  dependsOn: string[];
  reason: string;
}

/** Agrupa brechas en iniciativas transversales sin duplicar propósitos. */
export function proposeInitiatives(states: QuestionState[], priorities: PriorityItem[]): ProposedInitiative[] {
  const stateBy = new Map(states.filter((s) => s.applicable).map((s) => [s.question.id, s]));
  const prio = new Map(priorities.map((p) => [p.questionId, p.score]));
  const proposed: ProposedInitiative[] = [];
  for (const t of INITIATIVE_TEMPLATES) {
    const withGap = t.questionIds.filter((id) => {
      const s = stateBy.get(id);
      if (!s) return false;
      const c = currentScore(s);
      return c !== null && s.target - c > 0;
    });
    if (!withGap.length) continue;
    const criticalLow = withGap.some((id) => {
      const s = stateBy.get(id) as QuestionState;
      return s.question.isCritical && (currentScore(s) as number) <= 1;
    });
    const scores = withGap.map((id) => prio.get(id)).filter((v): v is number => v !== undefined);
    proposed.push({
      template: t,
      questionIds: withGap,
      phase: criticalLow ? 1 : t.phaseHint,
      priority: scores.length ? Math.max(...scores) : null,
      dependsOn: [],
      reason: `${withGap.length} criterio(s) con brecha${criticalLow ? ', incluye capacidades críticas en nivel 0 o 1' : ''}.`,
    });
  }
  // Dependencias: primero las explícitas de las plantillas; después las derivadas de prerrequisitos
  // entre criterios con brecha, solo si no generan ciclos (las explícitas prevalecen).
  const owner = new Map<string, string>();
  proposed.forEach((p) => p.template.questionIds.forEach((id) => owner.set(id, p.template.id)));
  const ids = new Set(proposed.map((p) => p.template.id));
  const deps = new Map<string, Set<string>>(proposed.map((p) => [p.template.id, new Set(p.template.dependsOn.filter((d) => ids.has(d)))]));
  const reaches = (from: string, to: string): boolean => {
    const seen = new Set<string>();
    const stack = [from];
    while (stack.length) {
      const cur = stack.pop() as string;
      if (cur === to) return true;
      if (seen.has(cur)) continue;
      seen.add(cur);
      deps.get(cur)?.forEach((d) => stack.push(d));
    }
    return false;
  };
  for (const p of proposed) {
    for (const qid of p.questionIds) {
      for (const pre of stateBy.get(qid)?.question.prerequisiteQuestionIds ?? []) {
        const o = owner.get(pre);
        if (o && o !== p.template.id && ids.has(o) && !reaches(o, p.template.id)) deps.get(p.template.id)?.add(o);
      }
    }
  }
  proposed.forEach((p) => (p.dependsOn = [...(deps.get(p.template.id) ?? [])]));
  // Una iniciativa no puede ubicarse en una fase anterior a la de sus dependencias.
  const byId = new Map(proposed.map((p) => [p.template.id, p]));
  for (let pass = 0; pass < 8; pass++) {
    for (const p of proposed) {
      const minPhase = Math.max(p.phase, ...p.dependsOn.map((d) => byId.get(d)?.phase ?? 1));
      p.phase = Math.min(4, minPhase) as 1 | 2 | 3 | 4;
    }
  }
  // Orden: fase; dentro de cada fase, dependencias primero y luego mayor prioridad.
  const ordered: ProposedInitiative[] = [];
  const placed = new Set<string>();
  const pending = [...proposed].sort((a, b) => a.phase - b.phase || (b.priority ?? 0) - (a.priority ?? 0));
  while (pending.length) {
    const idx = pending.findIndex((p) => p.dependsOn.every((d) => placed.has(d) || !byId.has(d)));
    const next = pending.splice(idx === -1 ? 0 : idx, 1)[0];
    ordered.push(next);
    placed.add(next.template.id);
  }
  return ordered.sort((a, b) => a.phase - b.phase || ordered.indexOf(a) - ordered.indexOf(b));
}

export const PHASES = [
  { phase: 1, name: 'Estabilizar y organizar', horizon: '0 a 3 meses', startMonth: 0, endMonth: 3 },
  { phase: 2, name: 'Estandarizar y fortalecer', horizon: '3 a 6 meses', startMonth: 3, endMonth: 6 },
  { phase: 3, name: 'Integrar y transformar', horizon: '6 a 12 meses', startMonth: 6, endMonth: 12 },
  { phase: 4, name: 'Optimizar e innovar', horizon: '12 a 24 meses', startMonth: 12, endMonth: 24 },
] as const;

export function addMonths(iso: string, months: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

/** Valida que una iniciativa no quede antes que sus dependencias. */
export function phaseViolation(phase: number, dependencyPhases: number[]): boolean {
  return dependencyPhases.some((p) => p > phase);
}
