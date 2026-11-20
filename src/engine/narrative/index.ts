/**
 * Narrativa diagnóstica basada en reglas (sin IA). Cada afirmación se vincula con los criterios
 * que la sustentan; no se afirma causalidad ni se habla de dimensiones no evaluadas.
 *
 * Regla de coherencia: la narrativa nunca mezcla series. Todas las comparaciones entre dimensiones,
 * fortalezas y brechas usan una sola serie (la misma que muestra por defecto el tablero): la
 * percibida, salvo que la validación cubra las mismas dimensiones con cobertura suficiente.
 */
import type { RoadmapInitiative, Risk } from '@/types/domain';
import { LEVEL_NAMES, dimensionName, getQuestion } from '@/data/bank';
import { getProfile } from '@/data/sector-profiles';
import { MODALITY_LABEL, TARGET_TERM } from '@/config/vocabulary';
import { fmtPct, fmtScore, listEs, lowerFirst, plural } from '@/utils/core';
import { COVERAGE_BAND_LABEL, currentScore, levelIndex, type View } from '../scoring';
import type { Analysis } from '../analyze';
import { PHASES, roleLabel } from '../recommendations';
import { riskBand, riskScore } from '../risk';

export interface NarrativeParagraph {
  text: string;
  refs: string[];
}

export interface NarrativeSection {
  key: string;
  title: string;
  paragraphs: NarrativeParagraph[];
}

export interface NarrativeContext {
  /** Riesgos registrados en la evaluación (si existen, prevalecen sobre los sugeridos). */
  risks?: Risk[];
  /** Iniciativas de la hoja de ruta guardada (si existen, prevalecen sobre la propuesta). */
  initiatives?: RoadmapInitiative[];
}

const lvl = (v: number) => LEVEL_NAMES[levelIndex(v)].toLowerCase();

/** Serie usada en toda la narrativa. */
export function narrativeView(a: Analysis): View {
  const v = a.views.validated;
  const p = a.views.preliminary;
  return v.global.score !== null && !v.exploratory && v.global.included.length >= p.global.included.length ? 'validated' : 'preliminary';
}

const SERIES_LABEL: Record<View, string> = { preliminary: 'percibida (preliminar)', validated: 'validada' };

/** Quita el sufijo «(simulación)» del nombre para redactar. */
const plainName = (name: string) => name.replace(/\s*\((simulación|simulacion|ficticio|ficticia)\)\s*$/i, '').trim();

/** «organización financiera» + sector «Financiero solidario» → «organización financiera del sector solidario». */
function profileWithSector(profile: string, sector: string): string {
  const base = lowerFirst(profile);
  if (!sector.trim()) return base;
  const stems = new Set(base.toLowerCase().split(/\s+/).map((w) => w.slice(0, 6)));
  const words = sector.trim().split(/\s+/).filter((w) => !stems.has(w.toLowerCase().slice(0, 6)));
  return words.length ? `${base} del sector ${lowerFirst(words.join(' '))}` : base;
}

export function buildNarrative(a: Analysis, ctx: NarrativeContext = {}): NarrativeSection[] {
  const org = a.organization;
  const profile = getProfile(org.profileId);
  const view = narrativeView(a);
  const sections: NarrativeSection[] = [];
  const scoreOf = (id: string) => {
    const s = a.states.find((x) => x.question.id === id && x.applicable);
    return s ? currentScore(s, view) : null;
  };
  const dimScore = (id: string) => {
    const d = a.dimensions.find((x) => x.dimensionId === id);
    return d ? (view === 'validated' ? d.validated : d.preliminary) : null;
  };
  const dimGap = (id: string) => {
    const d = a.dimensions.find((x) => x.dimensionId === id);
    return d ? (view === 'validated' ? d.gapValidated : d.gapPreliminary) : null;
  };

  // Contexto
  const name = plainName(org.name);
  const where = org.municipality ? `, con sede en ${org.municipality}${org.department ? ` (${org.department})` : ''}` : '';
  const ctxText = [
    `${name} es una ${profileWithSector(profile.label, org.sector)}${where}.`,
    org.description ? org.description.trim().replace(/([^.])$/, '$1.') : 'No se registró una descripción organizacional.',
    a.assessment.objective ? `El objetivo declarado de la evaluación es ${lowerFirst(a.assessment.objective.trim().replace(/\.$/, ''))}.` : '',
    org.isDemo || org.isAcademic ? 'Se trata de un caso simulado con fines de demostración; no corresponde a una organización real.' : '',
  ].filter(Boolean).join(' ');
  sections.push({ key: 'contexto', title: 'Contexto', paragraphs: [{ text: ctxText, refs: [] }] });

  // Alcance
  const cov = a.coverage;
  sections.push({
    key: 'alcance', title: 'Alcance',
    paragraphs: [{
      text: `La evaluación «${a.assessment.name}» es un ${lowerFirst(MODALITY_LABEL[a.assessment.modality])} que abarca ${plural(a.dimensionIds.length, 'dimensión', 'dimensiones')} y ${plural(cov.scope, 'criterio', 'criterios')}, de los cuales ${cov.applicable.toLocaleString('es-CO')} se consideran aplicables${cov.notApplicable ? ` (${plural(cov.notApplicable, 'excluido', 'excluidos')} por no aplicabilidad validada)` : ''}. El alcance sobre el banco es de ${fmtPct(cov.scopeCoverage)} de sus ${cov.bankTotal} criterios${a.assessment.modality !== 'professional' ? ', por lo que no constituye un diagnóstico integral' : ''}.`,
      refs: [],
    }],
  });

  sections.push({
    key: 'metodologia', title: 'Metodología',
    paragraphs: [{
      text: `Se aplicó el modelo DIAM v1.0, una propuesta metodológica independiente y orientativa que no está certificada ni avalada por los referentes consultados. Cada criterio se valora en una escala de 0 a 5: se toma una respuesta por participante y el valor preliminar es la mediana entre participantes; el valor validado lo asigna la persona evaluadora con justificación. Las ponderaciones utilizadas fueron ${a.assessment.weights.mode === 'uniforme' ? 'uniformes' : a.assessment.weights.mode === 'personalizada' ? `personalizadas (${a.assessment.weights.reason || 'motivo no registrado'})` : 'las iniciales del DIAM'}.`,
      refs: [],
    }],
  });

  sections.push({
    key: 'cobertura', title: 'Cobertura',
    paragraphs: [{
      text: `${cov.numeric} de ${cov.applicable} criterios aplicables cuentan con puntuación (cobertura del diagnóstico de ${fmtPct(cov.coverage)}: ${cov.band ? COVERAGE_BAND_LABEL[cov.band].toLowerCase() : 'sin datos'}). Sobre el banco completo, la cobertura es de ${fmtPct(cov.bankCoverage)} (${cov.bankScored} de ${cov.bankTotal} criterios). La cobertura de validación es de ${fmtPct(cov.validationCoverage)} y el soporte de evidencias de ${fmtPct(a.evidence.support)}. ${a.participantComparison.length === 1 ? 'Participó 1 persona' : `Participaron ${a.participantComparison.length} personas`}; ${plural(a.agreement.contrastable, 'criterio pudo', 'criterios pudieron')} contrastarse entre al menos dos participantes.`,
      refs: [],
    }],
  });

  // Madurez (misma serie en todas las comparaciones)
  const gp = a.views.preliminary.global;
  const gv = a.views.validated.global;
  const madurez: NarrativeParagraph[] = [];
  if (gp.score === null) madurez.push({ text: 'No hay respuestas suficientes para estimar la madurez del alcance evaluado.', refs: [] });
  else {
    madurez.push({
      text: `La madurez percibida (preliminar) del alcance evaluado es de ${fmtScore(gp.score)} sobre 5 (${lvl(gp.score)}), con una brecha media de ${fmtScore(a.views.preliminary.gap)} frente a la ${TARGET_TERM.one} por criterio.${gv.score !== null ? ` La madurez validada es de ${fmtScore(gv.score)} (${lvl(gv.score)}), calculada sobre ${plural(cov.validated, 'criterio validado', 'criterios validados')} de ${a.views.validated.includedLabel}${a.views.validated.exploratory ? '; es un resultado exploratorio y no se compara directamente con la madurez percibida, porque los universos de criterios difieren' : ''}.` : ' Ningún criterio ha sido validado todavía, por lo que el resultado permanece preliminar.'} Un promedio en un rango determinado no implica que todos los criterios hayan alcanzado ese nivel.${gp.excluded.length ? ` Se excluyeron del agregado percibido: ${gp.excluded.map((e) => `${e.dimensionId} (${lowerFirst(e.reason)})`).join(', ')}.` : ''}`,
      refs: [],
    });
  }
  const d05 = dimScore('D05'); const d08 = dimScore('D08'); const d14 = dimScore('D14');
  if (d08 !== null && d05 !== null && d08 - d05 >= 1.5) madurez.push({ text: `En la serie ${SERIES_LABEL[view]}, la madurez en tecnología y arquitectura (${fmtScore(d08)}) supera de forma notable la madurez archivística y documental (${fmtScore(d05)}): disponer de tecnología no asegura el control archivístico de la información.`, refs: ['D08', 'D05'] });
  const s0503 = scoreOf('D05-Q03'); const s0507 = scoreOf('D05-Q07');
  if (s0503 !== null && s0507 !== null && s0503 >= 3 && s0507 <= 2) madurez.push({ text: `Los instrumentos de clasificación están formalizados (D05-Q03: ${fmtScore(s0503)}), pero la aplicación efectiva de la retención permanece en desarrollo (D05-Q07: ${fmtScore(s0507)}). Esta diferencia sugiere fortalecer la implementación más que la formulación de instrumentos.`, refs: ['D05-Q03', 'D05-Q07'] });
  const s0704 = scoreOf('D07-Q04'); const s0714 = scoreOf('D07-Q14');
  if (s0503 !== null && s0714 !== null && s0503 >= 3 && s0714 <= 2) madurez.push({ text: 'La organización presenta capacidades definidas en clasificación documental, aunque la aplicación de reglas de retención en sistemas electrónicos permanece en desarrollo. Esta diferencia sugiere fortalecer la articulación entre los instrumentos archivísticos y las funcionalidades tecnológicas.', refs: ['D05-Q03', 'D07-Q14', ...(s0704 !== null ? ['D07-Q04'] : [])] });
  const s1411 = scoreOf('D14-Q11');
  if (d14 !== null && s1411 !== null && d14 >= 3 && s1411 <= 1) madurez.push({ text: `Se reportan capacidades de automatización e IA (${fmtScore(d14)}) sin un gobierno suficiente de sus casos de uso (D14-Q11: ${fmtScore(s1411)}). Antes de ampliar su uso conviene establecer controles de información.`, refs: ['D14', 'D14-Q11'] });
  sections.push({ key: 'madurez', title: 'Madurez', paragraphs: madurez });

  // Fortalezas y brechas en la misma serie
  const evaluated = a.dimensions.filter((x) => dimScore(x.dimensionId) !== null);
  const strengths = [...evaluated].filter((x) => (dimScore(x.dimensionId) as number) >= 3).sort((x, y) => (dimScore(y.dimensionId) as number) - (dimScore(x.dimensionId) as number)).slice(0, 3);
  sections.push({
    key: 'fortalezas', title: 'Fortalezas',
    paragraphs: strengths.length
      ? strengths.map((x) => {
        const v = dimScore(x.dimensionId) as number;
        const top = a.states.filter((s) => s.dimensionId === x.dimensionId && (currentScore(s, view) ?? -1) >= 3).sort((p, q) => (currentScore(q, view) ?? 0) - (currentScore(p, view) ?? 0)).slice(0, 3);
        return { text: `${dimensionName(x.dimensionId)} (${x.dimensionId}) alcanza ${fmtScore(v)} (${lvl(v)}) en la serie ${SERIES_LABEL[view]}${top.length ? `, con capacidades destacadas en ${listEs(top.map((s) => `${lowerFirst(s.question.criterion)} (${s.question.id})`))}` : ''}.`, refs: [x.dimensionId, ...top.map((s) => s.question.id)] };
      })
      : [{ text: 'Ninguna dimensión evaluada alcanza el nivel definido (3) en la serie analizada.', refs: [] }],
  });

  const gaps = [...evaluated].filter((x) => (dimGap(x.dimensionId) ?? 0) > 0).sort((x, y) => (dimGap(y.dimensionId) ?? 0) - (dimGap(x.dimensionId) ?? 0)).slice(0, 4);
  sections.push({
    key: 'brechas', title: 'Brechas',
    paragraphs: gaps.length
      ? gaps.map((x) => {
        const low = a.states.filter((s) => s.dimensionId === x.dimensionId && s.applicable && currentScore(s, view) !== null && s.target - (currentScore(s, view) as number) >= 2).slice(0, 4);
        return { text: `${dimensionName(x.dimensionId)} (${x.dimensionId}) presenta una brecha media de ${fmtScore(dimGap(x.dimensionId))} por criterio frente a la ${TARGET_TERM.one} (nivel actual ${fmtScore(dimScore(x.dimensionId))}, ${TARGET_TERM.one} ${fmtScore(x.target)})${low.length ? `, concentrada en ${listEs(low.map((s) => `${lowerFirst(s.question.criterion)} (${s.question.id})`))}` : ''}.`, refs: [x.dimensionId, ...low.map((s) => s.question.id)] };
      })
      : [{ text: `No se identifican brechas frente a las ${TARGET_TERM.one}s definidas en las dimensiones evaluadas.`, refs: [] }],
  });

  const disc = a.alerts.filter((x) => x.kind === 'discrepancia').slice(0, 5);
  sections.push({
    key: 'discrepancias', title: 'Discrepancias',
    paragraphs: [
      { text: disc.length ? `Se ${a.discrepancies === 1 ? 'identificó 1 criterio' : `identificaron ${a.discrepancies} criterios`} con un rango de respuestas igual o superior a ${a.thresholds.discrepancyRange} puntos entre participantes. Estas diferencias de percepción requieren revisión en la mesa de validación antes de asignar un nivel final.` : 'No se registran discrepancias relevantes entre participantes en los criterios contrastables.', refs: disc.map((x) => x.questionId as string) },
      ...(a.contradictions.length ? [{ text: `Además, ${a.contradictions.length === 1 ? 'se activó 1 regla' : `se activaron ${a.contradictions.length} reglas`} de contraste entre criterios: ${listEs(a.contradictions.map((c) => `«${lowerFirst(c.rule.title)}» (${c.rule.a.questionId} y ${c.rule.b.questionId})`))}. Una contradicción es una hipótesis que requiere revisión, no una prueba de falsedad.`, refs: a.contradictions.flatMap((c) => [c.rule.a.questionId, c.rule.b.questionId]) }] : []),
    ],
  });

  // Riesgos: los registrados prevalecen; solo se pide valorarlos si les falta probabilidad o impacto.
  const registered = ctx.risks ?? [];
  sections.push({
    key: 'riesgos', title: registered.length ? 'Riesgos' : 'Riesgos potenciales',
    paragraphs: registered.length
      ? registered.slice(0, 6).map((r) => {
        const v = riskScore(r.probability, r.impact);
        const band = riskBand(v);
        return {
          text: `${r.title}${r.questionIds.length ? ` (${listEs(r.questionIds)})` : ''}: ${r.description || 'sin descripción registrada.'}${/[.]$/.test(r.description) ? '' : '.'} ${v === null ? 'Falta valorar su probabilidad y su impacto.' : `Valorado con probabilidad ${r.probability} e impacto ${r.impact} (valor ${v}, riesgo ${band?.label.toLowerCase()}).`}`,
          refs: r.questionIds,
        };
      })
      : a.suggestedRisks.length
        ? a.suggestedRisks.slice(0, 6).map((r) => ({ text: `${r.title} (${listEs(r.questionIds)}): ${r.description} Es una sugerencia del motor a partir de brechas; su probabilidad y su impacto deben ser valorados por la persona evaluadora.`, refs: r.questionIds }))
        : [{ text: 'El motor no sugiere riesgos potenciales con las puntuaciones actuales.', refs: [] }],
  });

  const low = a.critical.filter((c) => c.kind === 'critico_bajo').length;
  const notEval = a.critical.filter((c) => c.kind === 'critico_no_evaluado').length;
  sections.push({
    key: 'criticas', title: 'Capacidades críticas',
    paragraphs: a.critical.length
      ? [{ text: `${low ? `${plural(low, 'capacidad crítica obtiene', 'capacidades críticas obtienen')} nivel 0 o 1` : 'Ninguna capacidad crítica evaluada está en nivel 0 o 1'}${notEval ? ` y ${plural(notEval, 'no fue evaluada', 'no fueron evaluadas')}` : ''}. Estas alertas son independientes del promedio global.`, refs: a.critical.map((c) => c.questionId) }]
      : [{ text: 'Las capacidades críticas evaluadas superan el nivel 1.', refs: [] }],
  });

  const topRecs = a.priorities.slice(0, 5);
  sections.push({
    key: 'recomendaciones', title: 'Recomendaciones',
    paragraphs: topRecs.length
      ? topRecs.map((p) => {
        const rec = a.recommendations.find((r) => r.questionId === p.questionId);
        const q = getQuestion(p.questionId);
        return { text: `${p.criterion} (${p.questionId}): ${rec?.action ?? ''} Responsable sugerido: ${rec?.responsible ?? (q ? q.suggestedRespondents.map(roleLabel).join(', ') : '—')}.`, refs: [p.questionId] };
      })
      : [{ text: 'No hay criterios con brecha y puntuación disponible para priorizar.', refs: [] }],
  });

  const saved = ctx.initiatives ?? [];
  sections.push({
    key: 'hoja_ruta', title: 'Hoja de ruta',
    paragraphs: PHASES.map((ph) => {
      const names = saved.length
        ? saved.filter((i) => i.phase === ph.phase).sort((x, y) => x.startDate.localeCompare(y.startDate) || x.order - y.order).map((i) => `${i.code} ${lowerFirst(i.name)}`)
        : a.initiatives.filter((i) => i.phase === ph.phase).map((i) => lowerFirst(i.template.name));
      const refs = saved.length ? saved.filter((i) => i.phase === ph.phase).flatMap((i) => i.questionIds.slice(0, 2)) : a.initiatives.filter((i) => i.phase === ph.phase).flatMap((i) => i.questionIds.slice(0, 2));
      return { text: `Fase ${ph.phase}, ${lowerFirst(ph.name)} (${ph.horizon}, horizonte orientativo): ${names.length ? `${listEs(names)}.` : 'sin iniciativas.'}`, refs };
    }),
  });

  const lim: string[] = [];
  if ((cov.coverage ?? 0) < a.thresholds.coveragePartial) lim.push('La cobertura del alcance no es alta, por lo que los agregados deben interpretarse con cautela.');
  if ((cov.validationCoverage ?? 0) < 50) lim.push('Menos de la mitad de los criterios aplicables cuenta con validación de la persona evaluadora.');
  if (a.lenses.insufficientEvidence.length) lim.push(`${plural(a.lenses.insufficientEvidence.length, 'criterio fue validado', 'criterios fueron validados')} en nivel 3 o superior sin evidencia suficiente (E0 o E1): ${listEs(a.lenses.insufficientEvidence.slice(0, 6))}${a.lenses.insufficientEvidence.length > 6 ? ', entre otros' : ''}.`);
  if ((a.evidence.support ?? 0) < 50) lim.push('El soporte de evidencias es limitado; varias puntuaciones reflejan principalmente percepciones.');
  if (a.agreement.contrastable === 0) lim.push('No fue posible contrastar respuestas entre participantes.');
  lim.push(`Las comparaciones entre dimensiones de esta narrativa usan la serie ${SERIES_LABEL[view]}, la misma del tablero.`);
  lim.push('Los resultados no constituyen certificación, auditoría de cumplimiento ni puntaje oficial de ningún referente (MGDA, ISO, MoReq, FURAG u otros). Las posibles brechas normativas requieren validación jurídica.');
  lim.push('El diagnóstico es descriptivo: las relaciones entre criterios se presentan como hipótesis, no como causas.');
  sections.push({ key: 'limitaciones', title: 'Limitaciones', paragraphs: lim.map((t) => ({ text: t, refs: [] })) });

  return sections;
}
