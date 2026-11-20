/**
 * Narrativa diagnóstica basada en reglas (sin IA). Cada afirmación se vincula con los criterios
 * que la sustentan; no se afirma causalidad ni se habla de dimensiones no evaluadas.
 */
import { LEVEL_NAMES, dimensionName, getQuestion } from '@/data/bank';
import { getProfile } from '@/data/sector-profiles';
import { COVERAGE_BAND_LABEL, currentScore, levelIndex } from '../scoring';
import type { Analysis } from '../analyze';
import { PHASES } from '../recommendations';
import { roleLabel } from '../recommendations';

export interface NarrativeParagraph {
  text: string;
  refs: string[];
}

export interface NarrativeSection {
  key: string;
  title: string;
  paragraphs: NarrativeParagraph[];
}

const n1 = (v: number | null) => (v === null ? 's. d.' : v.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const pct = (v: number | null) => (v === null ? 's. d.' : `${v.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`);
const lvl = (v: number) => LEVEL_NAMES[levelIndex(v)].toLowerCase();
const MODALITY: Record<string, string> = { quick: 'diagnóstico rápido', standard: 'diagnóstico estándar', professional: 'diagnóstico profesional', custom: 'diagnóstico personalizado' };

export function buildNarrative(a: Analysis): NarrativeSection[] {
  const org = a.organization;
  const profile = getProfile(org.profileId);
  const sections: NarrativeSection[] = [];
  const score = (id: string) => {
    const s = a.states.find((x) => x.question.id === id && x.applicable);
    return s ? currentScore(s) : null;
  };

  sections.push({
    key: 'contexto', title: 'Contexto',
    paragraphs: [{
      text: `${org.name}${org.shortName ? ` (${org.shortName})` : ''} se caracteriza como ${profile.label.toLowerCase()}${org.sector ? ` del sector ${org.sector.toLowerCase()}` : ''}${org.municipality ? `, con sede en ${org.municipality}${org.department ? ` (${org.department})` : ''}` : ''}. ${org.description || 'No se registró una descripción organizacional.'}`,
      refs: [],
    }],
  });

  sections.push({
    key: 'alcance', title: 'Alcance',
    paragraphs: [{
      text: `La evaluación «${a.assessment.name}» corresponde a un ${MODALITY[a.assessment.modality]} que abarca ${a.dimensionIds.length} dimensiones y ${a.coverage.scope} criterios, de los cuales ${a.coverage.applicable} se consideran aplicables${a.coverage.notApplicable ? ` (${a.coverage.notApplicable} excluidos por no aplicabilidad validada)` : ''}. El alcance seleccionado representa el ${pct(a.coverage.scopeCoverage)} de los criterios aplicables del banco completo${a.assessment.modality !== 'professional' ? ', por lo que no constituye un diagnóstico integral' : ''}.`,
      refs: [],
    }],
  });

  sections.push({
    key: 'metodologia', title: 'Metodología',
    paragraphs: [{
      text: `Se aplicó el modelo DIAM v1.0, una propuesta metodológica independiente y orientativa que no está certificada ni avalada por los referentes consultados. Cada criterio se valora en una escala de 0 a 5; el valor preliminar es la mediana de las respuestas de participantes únicos y el valor validado lo asigna el evaluador con justificación. Las ponderaciones utilizadas fueron ${a.assessment.weights.mode === 'uniforme' ? 'uniformes' : a.assessment.weights.mode === 'personalizada' ? `personalizadas (${a.assessment.weights.reason || 'motivo no registrado'})` : 'las iniciales del DIAM'}.`,
      refs: [],
    }],
  });

  sections.push({
    key: 'cobertura', title: 'Cobertura',
    paragraphs: [{
      text: `${a.coverage.numeric} de ${a.coverage.applicable} criterios aplicables cuentan con puntuación numérica (cobertura de ${pct(a.coverage.coverage)}: ${a.coverage.band ? COVERAGE_BAND_LABEL[a.coverage.band].toLowerCase() : 'sin datos'}). La cobertura de validación es de ${pct(a.coverage.validationCoverage)} y el soporte de evidencias de ${pct(a.evidence.support)}. Participaron ${a.participantComparison.length} personas; ${a.agreement.contrastable} criterios pudieron contrastarse entre al menos dos participantes.`,
      refs: [],
    }],
  });

  const gp = a.globalPreliminary;
  const gv = a.globalValidated;
  const madurez: NarrativeParagraph[] = [];
  if (gp.score === null) madurez.push({ text: 'No hay respuestas suficientes para estimar la madurez del alcance evaluado.', refs: [] });
  else {
    madurez.push({
      text: `La ${gp.labelText.toLowerCase()} es de ${n1(gp.score)} sobre 5 (${lvl(gp.score)}).${gv.score !== null ? ` La ${gv.labelText.toLowerCase()} es de ${n1(gv.score)} (${lvl(gv.score)}), calculada sobre ${a.coverage.validated} criterios validados.` : ' Ningún criterio ha sido validado todavía, por lo que el resultado permanece preliminar.'} Un promedio en un rango determinado no implica que todos los criterios hayan alcanzado ese nivel.${gp.excluded.length ? ` Se excluyeron del agregado: ${gp.excluded.map((e) => `${e.dimensionId} (${e.reason.toLowerCase()})`).join(', ')}.` : ''}`,
      refs: [],
    });
  }
  // Contrastes que el diagnóstico debe poder identificar.
  const d = (id: string) => a.dimensions.find((x) => x.dimensionId === id);
  const cur = (id: string) => { const x = d(id); return x ? x.validated ?? x.preliminary : null; };
  const d05 = cur('D05'); const d08 = cur('D08'); const d14 = cur('D14');
  if (d08 !== null && d05 !== null && d08 - d05 >= 1.5) madurez.push({ text: `La madurez en tecnología y arquitectura (${n1(d08)}) supera de forma notable la madurez archivística y documental (${n1(d05)}): disponer de tecnología no asegura el control archivístico de la información.`, refs: ['D08', 'D05'] });
  const s0503 = score('D05-Q03'); const s0507 = score('D05-Q07');
  if (s0503 !== null && s0507 !== null && s0503 >= 3 && s0507 <= 2) madurez.push({ text: `Los instrumentos de clasificación están formalizados (D05-Q03: ${n1(s0503)}), pero la aplicación efectiva de la retención permanece en desarrollo (D05-Q07: ${n1(s0507)}). Esta diferencia sugiere fortalecer la implementación más que la formulación de instrumentos.`, refs: ['D05-Q03', 'D05-Q07'] });
  const s0704 = score('D07-Q04'); const s0714 = score('D07-Q14');
  if (s0503 !== null && s0714 !== null && s0503 >= 3 && s0714 <= 2) madurez.push({ text: `La organización presenta capacidades definidas en clasificación documental, aunque la aplicación de reglas de retención en sistemas electrónicos permanece en desarrollo. Esta diferencia sugiere la necesidad de fortalecer la articulación entre los instrumentos archivísticos y las funcionalidades tecnológicas.`, refs: ['D05-Q03', 'D07-Q14', ...(s0704 !== null ? ['D07-Q04'] : [])] });
  const s1411 = score('D14-Q11');
  if (d14 !== null && s1411 !== null && d14 >= 3 && s1411 <= 1) madurez.push({ text: `Se reportan capacidades de automatización e inteligencia artificial (${n1(d14)}) sin un gobierno suficiente de sus casos de uso (D14-Q11: ${n1(s1411)}). Antes de ampliar su uso conviene establecer controles de información.`, refs: ['D14', 'D14-Q11'] });
  sections.push({ key: 'madurez', title: 'Madurez', paragraphs: madurez });

  const evaluated = a.dimensions.filter((x) => (x.validated ?? x.preliminary) !== null);
  const strengths = [...evaluated].filter((x) => (x.validated ?? x.preliminary)! >= 3).sort((x, y) => (y.validated ?? y.preliminary)! - (x.validated ?? x.preliminary)!).slice(0, 3);
  sections.push({
    key: 'fortalezas', title: 'Fortalezas',
    paragraphs: strengths.length
      ? strengths.map((x) => {
        const top = a.states.filter((s) => s.dimensionId === x.dimensionId && (currentScore(s) ?? -1) >= 3).sort((p, q) => (currentScore(q) ?? 0) - (currentScore(p) ?? 0)).slice(0, 3);
        return { text: `${dimensionName(x.dimensionId)} alcanza ${n1(x.validated ?? x.preliminary)} (${lvl((x.validated ?? x.preliminary)!)}), con capacidades destacadas en ${top.map((s) => s.question.criterion.toLowerCase()).join('; ')}.`, refs: [x.dimensionId, ...top.map((s) => s.question.id)] };
      })
      : [{ text: 'Ninguna dimensión evaluada alcanza el nivel definido (3) en el valor actual.', refs: [] }],
  });

  const gaps = [...evaluated].filter((x) => (x.gap ?? 0) > 0).sort((x, y) => (y.gap ?? 0) - (x.gap ?? 0)).slice(0, 4);
  sections.push({
    key: 'brechas', title: 'Brechas',
    paragraphs: gaps.length
      ? gaps.map((x) => {
        const low = a.states.filter((s) => s.dimensionId === x.dimensionId && s.applicable && currentScore(s) !== null && s.target - (currentScore(s) as number) >= 2).slice(0, 4);
        return { text: `${dimensionName(x.dimensionId)} presenta una brecha de ${n1(x.gap)} frente al nivel objetivo ${n1(x.target)}${low.length ? `, concentrada en ${low.map((s) => s.question.criterion.toLowerCase()).join('; ')}` : ''}.`, refs: [x.dimensionId, ...low.map((s) => s.question.id)] };
      })
      : [{ text: 'No se identifican brechas frente a los niveles objetivo definidos en las dimensiones evaluadas.', refs: [] }],
  });

  const disc = a.alerts.filter((x) => x.kind === 'discrepancia').slice(0, 5);
  sections.push({
    key: 'discrepancias', title: 'Discrepancias',
    paragraphs: [
      { text: disc.length ? `Se identificaron ${a.discrepancies} criterios con un rango de respuestas igual o superior a ${a.thresholds.discrepancyRange} puntos entre participantes. Estas diferencias de percepción requieren revisión en la mesa de validación antes de asignar un nivel final.` : 'No se registran discrepancias relevantes entre participantes en los criterios contrastables.', refs: disc.map((x) => x.questionId as string) },
      ...(a.contradictions.length ? [{ text: `Además, ${a.contradictions.length} regla(s) de contraste entre criterios se activaron (${a.contradictions.map((c) => c.rule.id).join(', ')}). Una contradicción es una hipótesis que requiere revisión, no una prueba de falsedad.`, refs: a.contradictions.flatMap((c) => [c.rule.a.questionId, c.rule.b.questionId]) }] : []),
    ],
  });

  sections.push({
    key: 'riesgos', title: 'Riesgos potenciales',
    paragraphs: a.suggestedRisks.length
      ? a.suggestedRisks.slice(0, 6).map((r) => ({ text: `${r.title}: ${r.description} Se sugiere por ${r.reason.toLowerCase()} La probabilidad y el impacto deben ser valorados por el evaluador.`, refs: r.questionIds }))
      : [{ text: 'El motor no sugiere riesgos potenciales con las puntuaciones actuales.', refs: [] }],
  });

  sections.push({
    key: 'criticas', title: 'Capacidades críticas',
    paragraphs: a.critical.length
      ? [{ text: `${a.critical.filter((c) => c.kind === 'critico_bajo').length} capacidad(es) crítica(s) obtienen nivel 0 o 1 y ${a.critical.filter((c) => c.kind === 'critico_no_evaluado').length} no fueron evaluadas. Estas alertas son independientes del promedio global.`, refs: a.critical.map((c) => c.questionId) }]
      : [{ text: 'Las capacidades críticas evaluadas superan el nivel 1.', refs: [] }],
  });

  const topRecs = a.priorities.slice(0, 5);
  sections.push({
    key: 'recomendaciones', title: 'Recomendaciones',
    paragraphs: topRecs.length
      ? topRecs.map((p) => {
        const rec = a.recommendations.find((r) => r.questionId === p.questionId);
        const q = getQuestion(p.questionId);
        return { text: `${p.criterion}: ${rec?.action ?? ''} Responsable sugerido: ${rec?.responsible ?? (q ? q.suggestedRespondents.map(roleLabel).join(', ') : '—')}.`, refs: [p.questionId] };
      })
      : [{ text: 'No hay criterios con brecha y puntuación disponible para priorizar.', refs: [] }],
  });

  sections.push({
    key: 'hoja_ruta', title: 'Hoja de ruta',
    paragraphs: PHASES.map((ph) => {
      const items = a.initiatives.filter((i) => i.phase === ph.phase);
      return { text: `Fase ${ph.phase} — ${ph.name} (${ph.horizon}, horizonte orientativo): ${items.length ? items.map((i) => i.template.name.toLowerCase()).join('; ') : 'sin iniciativas propuestas'}.`, refs: items.flatMap((i) => i.questionIds.slice(0, 2)) };
    }),
  });

  const lim: string[] = [];
  if ((a.coverage.coverage ?? 0) < a.thresholds.coveragePartial) lim.push('La cobertura del alcance no es alta, por lo que los agregados deben interpretarse con cautela.');
  if ((a.coverage.validationCoverage ?? 0) < 50) lim.push('Menos de la mitad de los criterios aplicables cuenta con validación del evaluador.');
  if ((a.evidence.support ?? 0) < 50) lim.push('El soporte de evidencias es limitado; varias puntuaciones reflejan principalmente percepciones.');
  if (a.agreement.contrastable === 0) lim.push('No fue posible contrastar respuestas entre participantes.');
  lim.push('Los resultados no constituyen certificación, auditoría de cumplimiento ni puntaje oficial de ningún referente (MGDA, ISO, MoReq, FURAG u otros). Las posibles brechas normativas requieren validación jurídica.');
  lim.push('El diagnóstico es descriptivo: las relaciones entre criterios se presentan como hipótesis, no como causas.');
  sections.push({ key: 'limitaciones', title: 'Limitaciones', paragraphs: lim.map((t) => ({ text: t, refs: [] })) });

  return sections;
}
