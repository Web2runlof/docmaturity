/**
 * Triangulación: discrepancias entre entrevistados y reglas de contraste entre criterios.
 * Una contradicción es una hipótesis que requiere revisión, nunca una prueba de falsedad.
 * Ningún resultado de este módulo modifica respuestas.
 */
import type { Thresholds } from '@/types/domain';
import { currentScore, type QuestionState } from '../scoring';

export interface Condition {
  questionId: string;
  op: '<=' | '>=';
  value: number;
}

export interface ContradictionRule {
  id: string;
  /** Nombre legible de la regla (se muestra en lugar del identificador interno). */
  title: string;
  a: Condition;
  b: Condition;
  message: string;
}

const lo = (questionId: string, value = 1): Condition => ({ questionId, op: '<=', value });
const hi = (questionId: string, value = 4): Condition => ({ questionId, op: '>=', value });

export const CONTRADICTION_RULES: ContradictionRule[] = [
  { id: 'R01', title: 'Retención electrónica sin reglas de retención', a: lo('D05-Q05'), b: hi('D07-Q14'), message: 'Se reporta una aplicación avanzada de retención electrónica sin que exista una definición suficientemente desarrollada de las reglas. Revisar el alcance y las evidencias.' },
  { id: 'R02', title: 'Calidad de metadatos sin esquema', a: lo('D09-Q01'), b: hi('D09-Q08'), message: 'Se reporta validación avanzada de la calidad de metadatos sin un esquema de metadatos desarrollado. Verificar contra qué criterios se valida la calidad.' },
  { id: 'R03', title: 'Programa de preservación evaluado sin política', a: lo('D11-Q01'), b: hi('D11-Q15'), message: 'Se reporta evaluación avanzada del programa de preservación sin política o planificación de preservación. Revisar si existe realmente un programa evaluable.' },
  { id: 'R04', title: 'Automatización integrada sin gobierno de IA', a: lo('D14-Q11'), b: hi('D14-Q08'), message: 'Se reporta automatización integrada con la gestión documental sin gobierno de casos de uso de IA. Revisar controles y autorizaciones.' },
  { id: 'R05', title: 'Copias de seguridad sin pruebas de recuperación', a: hi('D08-Q13'), b: lo('D08-Q14'), message: 'Se reporta una gestión avanzada de copias de seguridad sin pruebas de recuperación. Una copia no restaurada no garantiza la recuperación.' },
  { id: 'R06', title: 'Rendición de cuentas sin roles definidos', a: lo('D02-Q03'), b: hi('D02-Q12'), message: 'Se reporta rendición de cuentas avanzada sin roles y responsabilidades definidos. Revisar sobre qué responsabilidades se rinde cuentas.' },
  { id: 'R07', title: 'Clasificación electrónica sin cuadro de clasificación', a: lo('D05-Q03'), b: hi('D07-Q04'), message: 'Se reporta clasificación electrónica avanzada sin un cuadro de clasificación desarrollado. Verificar con qué estructura se clasifica.' },
  { id: 'R08', title: 'Accesos controlados sin ciclo de vida de usuarios', a: hi('D10-Q04'), b: lo('D10-Q05'), message: 'Se reportan controles de acceso avanzados sin gestión del ciclo de vida de usuarios y permisos. Revisar cuentas de personal retirado.' },
  { id: 'R09', title: 'Eliminación trazable sin tiempos de retención', a: lo('D05-Q05'), b: hi('D05-Q13'), message: 'Se reporta eliminación autorizada y trazable sin tiempos de retención definidos. Revisar con qué fundamento se autorizan las eliminaciones.' },
  { id: 'R10', title: 'Eliminación controlada sin disposición final', a: lo('D05-Q06'), b: hi('D05-Q13'), message: 'Se reporta eliminación controlada sin disposición final definida para las series. Verificar los instrumentos aplicados.' },
  { id: 'R11', title: 'Cierre de expedientes sin conformación', a: lo('D07-Q05'), b: hi('D07-Q13'), message: 'Se reporta cierre controlado de expedientes electrónicos sin conformación de expedientes. Revisar qué se está cerrando.' },
  { id: 'R12', title: 'Autenticidad sin controles de integridad', a: lo('D07-Q09'), b: hi('D07-Q08'), message: 'Se reporta un control avanzado de autenticidad sin controles de integridad. La autenticidad depende de poder detectar alteraciones.' },
  { id: 'R13', title: 'Reparación de objetos sin verificación de integridad', a: lo('D11-Q06'), b: hi('D11-Q14'), message: 'Se reporta capacidad avanzada de reparación de objetos sin verificación de integridad. Revisar cómo se detectan los daños.' },
  { id: 'R14', title: 'Copias separadas sin almacenamiento redundante', a: lo('D11-Q07'), b: hi('D11-Q08'), message: 'Se reporta separación avanzada de copias sin almacenamiento redundante. Verificar el número real de copias.' },
  { id: 'R15', title: 'Gobierno de integraciones sin integraciones', a: lo('D09-Q11'), b: hi('D09-Q15'), message: 'Se reporta un gobierno avanzado de integraciones sin integraciones entre sistemas. Revisar el alcance de la respuesta.' },
  { id: 'R16', title: 'Riesgo residual sin evaluación de riesgos', a: lo('D10-Q02'), b: hi('D15-Q11'), message: 'Se reporta seguimiento avanzado del riesgo residual sin evaluación de riesgos documentales. Revisar la matriz de riesgos.' },
  { id: 'R17', title: 'Gestión de hallazgos sin auditorías internas', a: lo('D15-Q07'), b: hi('D15-Q08'), message: 'Se reporta gestión avanzada de hallazgos sin auditorías internas de gestión documental. Verificar el origen de los hallazgos.' },
  { id: 'R18', title: 'Efectividad de acciones sin planes de mejoramiento', a: lo('D15-Q09'), b: hi('D15-Q10'), message: 'Se reporta evaluación avanzada de la efectividad de acciones sin planes de mejoramiento. Revisar qué acciones se evalúan.' },
  { id: 'R19', title: 'Efectividad de capacitación sin programa', a: lo('D12-Q08'), b: hi('D12-Q09'), message: 'Se reporta evaluación avanzada de la efectividad de la capacitación sin un programa periódico de capacitación.' },
  { id: 'R20', title: 'Arquitectura documentada sin inventario de sistemas', a: lo('D08-Q01'), b: hi('D08-Q02'), message: 'Se reporta una arquitectura documentada y actualizada sin inventario de sistemas de información.' },
  { id: 'R21', title: 'Flujos automatizados sin caracterización', a: lo('D04-Q04'), b: hi('D14-Q03'), message: 'Se reportan flujos automatizados avanzados sin caracterización de los flujos documentales. Riesgo de automatizar prácticas no analizadas.' },
  { id: 'R22', title: 'Automatización sin procesos estandarizados', a: lo('D14-Q02'), b: hi('D14-Q03'), message: 'Se reporta automatización avanzada de flujos sin estandarización previa de los procesos.' },
  { id: 'R23', title: 'Clasificación automática sin cuadro de clasificación', a: lo('D05-Q03'), b: hi('D14-Q06'), message: 'Se reporta clasificación automatizada avanzada sin un cuadro de clasificación desarrollado. Verificar con qué instrumento clasifica el sistema.' },
  { id: 'R24', title: 'Accesos sin clasificación por sensibilidad', a: lo('D10-Q03'), b: hi('D10-Q04'), message: 'Se reportan controles de acceso avanzados sin clasificación de la información por sensibilidad. Revisar con qué criterio se otorgan los accesos.' },
  { id: 'R25', title: 'Responsables de activos sin inventario', a: lo('D13-Q01'), b: hi('D13-Q02'), message: 'Se reportan responsables de activos plenamente asignados sin inventario de activos de información.' },
  { id: 'R26', title: 'Preservación sostenible sin recursos específicos', a: lo('D03-Q06'), b: hi('D11-Q15'), message: 'Se reporta un programa de preservación evaluado y sostenible sin recursos específicos de preservación digital.' },
  { id: 'R27', title: 'Estrategia actualizada sin política documental', a: lo('D01-Q01'), b: hi('D01-Q15'), message: 'Se reporta una actualización periódica avanzada de la estrategia documental sin política de gestión documental.' },
  { id: 'R28', title: 'Metadatos obligatorios sin esquema', a: lo('D09-Q01'), b: hi('D09-Q02'), message: 'Se reportan metadatos obligatorios plenamente definidos sin esquema de metadatos.' },
  { id: 'R29', title: 'Evaluación del SGDEA sin modelo de requisitos', a: lo('D08-Q05'), b: hi('D08-Q04'), message: 'Se reporta una evaluación avanzada de capacidades del SGDEA sin modelo de requisitos documentales. Verificar contra qué requisitos se evaluó.' },
  { id: 'R30', title: 'Inventario topográfico sin inventarios documentales', a: lo('D05-Q10'), b: hi('D06-Q06'), message: 'Se reporta un inventario topográfico avanzado sin inventarios documentales actualizados.' },
];

const check = (c: Condition, score: number) => (c.op === '<=' ? score <= c.value : score >= c.value);

export interface TriggeredContradiction {
  rule: ContradictionRule;
  scoreA: number;
  scoreB: number;
}

export function evaluateContradictions(states: QuestionState[], rules = CONTRADICTION_RULES): TriggeredContradiction[] {
  const by = new Map(states.filter((s) => s.applicable).map((s) => [s.question.id, s]));
  const out: TriggeredContradiction[] = [];
  for (const rule of rules) {
    const a = by.get(rule.a.questionId);
    const b = by.get(rule.b.questionId);
    if (!a || !b) continue;
    const sa = currentScore(a);
    const sb = currentScore(b);
    if (sa === null || sb === null) continue;
    if (check(rule.a, sa) && check(rule.b, sb)) out.push({ rule, scoreA: sa, scoreB: sb });
  }
  return out;
}

export type ValidationAlertKind =
  | 'discrepancia' | 'contradiccion' | 'na_controvertida' | 'alto_sin_evidencia' | 'critico_no_evaluado' | 'baja_cobertura_dimension';

export interface ValidationAlert {
  kind: ValidationAlertKind;
  questionId: string | null;
  dimensionId: string | null;
  message: string;
  ruleId?: string;
}

export const ALERT_LABEL: Record<ValidationAlertKind, string> = {
  discrepancia: 'Discrepancia entre entrevistados',
  contradiccion: 'Contradicción entre criterios',
  na_controvertida: 'No aplicabilidad controvertida',
  alto_sin_evidencia: 'Puntuación alta sin evidencia suficiente',
  critico_no_evaluado: 'Criterio crítico no evaluado',
  baja_cobertura_dimension: 'Dimensión con baja cobertura',
};

export function computeValidationAlerts(
  states: QuestionState[],
  thresholds: Thresholds,
  dimensionCoverage: { dimensionId: string; coverage: number | null; applicable: number }[],
): ValidationAlert[] {
  const alerts: ValidationAlert[] = [];
  for (const s of states) {
    if (!s.applicable) continue;
    const id = s.question.id;
    if (s.stats && s.stats.n >= 2 && s.stats.range >= thresholds.discrepancyRange) {
      alerts.push({ kind: 'discrepancia', questionId: id, dimensionId: s.dimensionId, message: `Rango de ${s.stats.range} puntos entre ${s.stats.n} participantes (mediana ${s.stats.median.toLocaleString('es-CO')}).` });
    }
    if (s.proposedNA > 0 && s.stats && !s.naDecision) {
      alerts.push({ kind: 'na_controvertida', questionId: id, dimensionId: s.dimensionId, message: `${s.proposedNA} participante(s) proponen no aplicabilidad mientras ${s.stats.n} responden con un nivel.` });
    }
    const cur = currentScore(s);
    if (cur !== null && cur >= thresholds.highScoreWithoutEvidence && s.evidenceFactor < 0.6) {
      alerts.push({ kind: 'alto_sin_evidencia', questionId: id, dimensionId: s.dimensionId, message: `Nivel ${cur.toLocaleString('es-CO')} con evidencia ${s.evidenceStatus}.` });
    }
    if (s.question.isCritical && cur === null) {
      alerts.push({ kind: 'critico_no_evaluado', questionId: id, dimensionId: s.dimensionId, message: 'Capacidad crítica no evaluada.' });
    }
  }
  for (const t of evaluateContradictions(states)) {
    alerts.push({ kind: 'contradiccion', questionId: t.rule.a.questionId, dimensionId: t.rule.a.questionId.slice(0, 3), message: `${t.rule.title}: ${t.rule.message}`, ruleId: t.rule.id });
  }
  for (const d of dimensionCoverage) {
    if (d.applicable > 0 && (d.coverage === null || d.coverage < thresholds.coverageInsufficient)) {
      alerts.push({ kind: 'baja_cobertura_dimension', questionId: null, dimensionId: d.dimensionId, message: `Cobertura de ${d.coverage === null ? 0 : Math.round(d.coverage)} % en la dimensión.` });
    }
  }
  return alerts;
}

/** Índice inverso: reglas en las que participa cada criterio. */
export function rulesByQuestion(): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const r of CONTRADICTION_RULES) {
    for (const q of [r.a.questionId, r.b.questionId]) m.set(q, [...(m.get(q) ?? []), r.id]);
  }
  return m;
}
