/**
 * Motor de riesgos: sugiere riesgos potenciales a partir de brechas y hallazgos.
 * No asigna probabilidades como si se hubieran observado: la valoración la hace el evaluador.
 */
import type { Risk } from '@/types/domain';
import { RISK_BANDS } from '../constants';
import { currentScore, type QuestionState } from '../scoring';

export interface RiskLibraryItem {
  id: string;
  title: string;
  description: string;
  triggers: string[];
}

export const RISK_LIBRARY: RiskLibraryItem[] = [
  { id: 'RK01', title: 'Pérdida de información', description: 'Documentos o datos que dejan de existir por fallas, desastres, ataques o errores sin posibilidad de recuperación.', triggers: ['D08-Q13', 'D06-Q08', 'D11-Q07', 'D07-Q02', 'D06-Q11'] },
  { id: 'RK02', title: 'Alteración no autorizada', description: 'Modificación de documentos o metadatos sin autorización ni registro.', triggers: ['D07-Q09', 'D10-Q04', 'D10-Q08', 'D07-Q13'] },
  { id: 'RK03', title: 'Pérdida de autenticidad', description: 'Imposibilidad de demostrar quién produjo un documento, cuándo y en qué condiciones.', triggers: ['D07-Q08', 'D07-Q12', 'D09-Q07', 'D11-Q09'] },
  { id: 'RK04', title: 'Indisponibilidad', description: 'Documentos que existen pero no pueden localizarse o consultarse cuando se necesitan.', triggers: ['D08-Q08', 'D07-Q11', 'D13-Q09', 'D11-Q13'] },
  { id: 'RK05', title: 'Obsolescencia', description: 'Formatos, soportes o sistemas que dejan de ser legibles o mantenibles.', triggers: ['D11-Q03', 'D11-Q04', 'D11-Q12', 'D03-Q14'] },
  { id: 'RK06', title: 'Eliminación indebida', description: 'Destrucción de documentos sin autorización, antes de cumplir su retención o bajo suspensión de disposición.', triggers: ['D05-Q13', 'D10-Q13', 'D05-Q06', 'D07-Q14'] },
  { id: 'RK07', title: 'Incumplimiento normativo potencial', description: 'Posible brecha frente a obligaciones jurídicas aplicables que requiere validación.', triggers: ['D10-Q01', 'D05-Q05', 'D05-Q03', 'D01-Q01'] },
  { id: 'RK08', title: 'Exposición de datos personales', description: 'Acceso, divulgación o tratamiento indebido de datos personales contenidos en documentos.', triggers: ['D10-Q10', 'D10-Q03', 'D10-Q07', 'D14-Q14'] },
  { id: 'RK09', title: 'Dependencia tecnológica', description: 'Incapacidad de cambiar de sistema o proveedor sin perder información o su valor probatorio.', triggers: ['D08-Q12', 'D07-Q15', 'D03-Q09'] },
  { id: 'RK10', title: 'Incapacidad de recuperación', description: 'Imposibilidad de restablecer documentos y servicios tras un evento disruptivo.', triggers: ['D08-Q14', 'D10-Q15', 'D11-Q14'] },
  { id: 'RK11', title: 'Duplicidad documental', description: 'Copias y versiones múltiples que generan confusión, costos y riesgo de exposición.', triggers: ['D04-Q11', 'D13-Q04', 'D05-Q11'] },
  { id: 'RK12', title: 'Pérdida de memoria institucional', description: 'Pérdida de documentos de valor permanente o del conocimiento crítico de la organización.', triggers: ['D05-Q14', 'D13-Q13', 'D11-Q02', 'D12-Q15'] },
  { id: 'RK13', title: 'Decisiones basadas en información incompleta', description: 'Decisiones tomadas con información no confiable, desactualizada o sin soporte.', triggers: ['D13-Q15', 'D13-Q05', 'D13-Q03', 'D04-Q10'] },
  { id: 'RK14', title: 'Procesos documentales ineficientes', description: 'Reprocesos, demoras y costos derivados de flujos documentales no controlados.', triggers: ['D04-Q04', 'D04-Q09', 'D04-Q15', 'D04-Q07'] },
  { id: 'RK15', title: 'Pérdida de evidencias de actuaciones automatizadas', description: 'Imposibilidad de explicar o defender decisiones apoyadas en automatización o IA.', triggers: ['D14-Q15', 'D14-Q13', 'D14-Q08'] },
];

export interface SuggestedRisk {
  libraryId: string;
  title: string;
  description: string;
  questionIds: string[];
  reason: string;
}

/** Sugiere un riesgo si algún criterio disparador aplicable está en nivel ≤ 1, o en ≤ 2 si es crítico. */
export function suggestRisks(states: QuestionState[]): SuggestedRisk[] {
  const by = new Map(states.filter((s) => s.applicable).map((s) => [s.question.id, s]));
  const out: SuggestedRisk[] = [];
  for (const item of RISK_LIBRARY) {
    const hits = item.triggers.filter((id) => {
      const s = by.get(id);
      if (!s) return false;
      const cur = currentScore(s);
      if (cur === null) return false;
      return cur <= 1 || (s.question.isCritical && cur <= 2);
    });
    if (hits.length) {
      out.push({ libraryId: item.id, title: item.title, description: item.description, questionIds: hits, reason: `Brechas en ${hits.join(', ')}.` });
    }
  }
  return out;
}

export function riskScore(probability: number | null, impact: number | null): number | null {
  if (probability === null || impact === null) return null;
  return probability * impact;
}

export function riskBand(score: number | null): (typeof RISK_BANDS)[number] | null {
  if (score === null) return null;
  return RISK_BANDS.find((b) => score <= b.max) ?? RISK_BANDS[RISK_BANDS.length - 1];
}

export const RISK_STATUS_LABEL: Record<Risk['status'], string> = {
  sugerido: 'Sugerido',
  valorado: 'Valorado',
  aceptado: 'Aceptado',
  en_tratamiento: 'En tratamiento',
  residual: 'Residual',
};

/** Matriz 5×5 solo con riesgos valorados. Devuelve null si no hay valoraciones. */
export function riskMatrix(risks: Risk[]): number[][] | null {
  const valued = risks.filter((r) => r.probability !== null && r.impact !== null);
  if (!valued.length) return null;
  const m = Array.from({ length: 5 }, () => [0, 0, 0, 0, 0]);
  valued.forEach((r) => (m[(r.probability as number) - 1][(r.impact as number) - 1] += 1));
  return m;
}
