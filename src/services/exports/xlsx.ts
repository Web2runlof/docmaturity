/**
 * Exportación a un libro .xlsx real con 15 hojas, filtros, encabezados fijos, formatos condicionales,
 * valores numéricos, estados especiales, fórmulas y notas metodológicas.
 * Todo texto proveniente de usuarios se sanitiza para evitar la inyección de fórmulas.
 */
import ExcelJS from 'exceljs';
import type { Analysis } from '@/engine/analyze';
import type { AssessmentBundle } from '@/types/domain';
import { DIMENSIONS, LEVEL_NAMES, dimensionName } from '@/data/bank';
import { getProfile } from '@/data/sector-profiles';
import { COVERAGE_BAND_LABEL, currentScore } from '@/engine/scoring';
import { EVIDENCE_LABEL, SPECIAL_LABEL, LENS_DIMENSIONS, VALIDATED_EVIDENCE_LEVEL } from '@/engine/constants';
import { INITIATIVE_STATUS_LABEL, MODEL_NAME, VERIFICATION_LABEL, modalityLabel } from '@/config/vocabulary';
import { QUADRANT_LABEL } from '@/engine/prioritization';
import { dimensionRangeLabel } from '@/engine/analyze';
import { riskBand, riskScore, RISK_STATUS_LABEL } from '@/engine/risk';
import { PHASES, VERB_LABEL, roleLabel } from '@/engine/recommendations';
import { sanitizeCell } from '@/utils/core';

const NAVY = 'FF142B3A';
const HEAD_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri', size: 10 } as const;
const t = (v: unknown) => sanitizeCell(v);
const num = (v: number | null | undefined, d = 2) => (v === null || v === undefined || !Number.isFinite(v) ? null : Math.round(v * 10 ** d) / 10 ** d);

type Col = { header: string; key: string; width?: number; note?: string; numFmt?: string };

/** Formatos numéricos únicos: niveles y brechas con 2 decimales; porcentajes con 1 decimal. */
const FMT_LEVEL = '0.00';
const FMT_PCT = '0.0';

function sheet(wb: ExcelJS.Workbook, name: string, cols: Col[], rows: Record<string, unknown>[], opts: { levelCols?: string[]; pctCols?: string[] } = {}) {
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  const fmtOf = (c: Col) => c.numFmt ?? (opts.levelCols?.includes(c.key) ? FMT_LEVEL : c.header.includes('(%)') ? FMT_PCT : undefined);
  ws.columns = cols.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 18, style: fmtOf(c) ? { numFmt: fmtOf(c) } : undefined }));
  const head = ws.getRow(1);
  head.font = HEAD_FONT;
  head.alignment = { vertical: 'middle', wrapText: true };
  head.height = 30;
  head.eachCell((cell, i) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    const note = cols[i - 1]?.note;
    if (note) cell.note = note;
  });
  for (const r of rows) {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r)) clean[k] = typeof v === 'string' ? t(v) : v;
    ws.addRow(clean);
  }
  ws.eachRow((row, i) => {
    if (i > 1) row.alignment = { vertical: 'top', wrapText: true };
  });
  if (rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
  const last = Math.max(2, rows.length + 1);
  for (const key of opts.levelCols ?? []) {
    const idx = cols.findIndex((c) => c.key === key) + 1;
    if (idx < 1) continue;
    const L = ws.getColumn(idx).letter;
    ws.addConditionalFormatting({
      ref: `${L}2:${L}${last}`,
      rules: [
        { type: 'cellIs', operator: 'lessThan', formulae: ['1.5'], priority: 1, style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFDE2E2' } }, font: { color: { argb: 'FF991B1B' } } } },
        { type: 'cellIs', operator: 'between', formulae: ['1.5', '2.4999'], priority: 2, style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFEF3C7' } } } },
        { type: 'cellIs', operator: 'greaterThan', formulae: ['3.4999'], priority: 3, style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFD1FAE5' } } } },
      ],
    });
  }
  for (const key of opts.pctCols ?? []) {
    const idx = cols.findIndex((c) => c.key === key) + 1;
    if (idx < 1) continue;
    const L = ws.getColumn(idx).letter;
    ws.addConditionalFormatting({ ref: `${L}2:${L}${last}`, rules: [{ type: 'dataBar', priority: 4, cfvo: [{ type: 'num', value: 0 }, { type: 'num', value: 100 }], color: { argb: 'FF0D9488' } } as unknown as ExcelJS.ConditionalFormattingRule] });
  }
  return ws;
}

export async function buildWorkbook(a: Analysis, bundle: AssessmentBundle): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'DOCMATURITY';
  wb.created = new Date();
  wb.title = `${a.assessment.name} — ${a.organization.name}`;
  const org = a.organization;
  const partBy = new Map(bundle.participants.map((p) => [p.id, p]));

  const vp = a.views.preliminary;
  const vv = a.views.validated;
  const summaryRows: { k: string; v: unknown; n: string; f?: string }[] = [
    { k: 'Organización', v: org.name, n: '' },
    { k: 'Evaluación', v: a.assessment.name, n: `${modalityLabel(a.assessment)}. Revisión ${a.assessment.revision}.` },
    { k: 'Madurez percibida (preliminar)', v: num(vp.global.score), f: FMT_LEVEL, n: `Escala 0 a 5. Mediana por criterio, promedio ponderado por dimensión y global renormalizado. Calculada sobre ${vp.includedLabel}.` },
    { k: 'Madurez validada', v: num(vv.global.score), f: FMT_LEVEL, n: `Solo criterios con nivel validado por el evaluador. Calculada sobre ${vv.includedLabel}.${vv.exploratory ? ' Resultado exploratorio.' : ''}` },
    { k: 'Porcentaje del máximo teórico (percibida)', v: num(vp.global.percentOfMax, 1), f: FMT_PCT, n: 'No es un porcentaje de cumplimiento legal.' },
    { k: 'Brecha frente a la meta (percibida)', v: num(vp.gap), f: FMT_LEVEL, n: 'Promedio ponderado de MAX(0; meta − nivel) por criterio puntuado.' },
    { k: 'Brecha frente a la meta (validada)', v: num(vv.gap), f: FMT_LEVEL, n: 'Misma fórmula, sobre los criterios validados.' },
    { k: 'Cobertura del diagnóstico (%)', v: num(a.coverage.coverage, 1), f: FMT_PCT, n: `${a.coverage.numeric} de ${a.coverage.applicable} criterios aplicables con puntuación. ${a.coverage.band ? COVERAGE_BAND_LABEL[a.coverage.band] : 'Sin datos'}.` },
    { k: 'Alcance sobre el banco (%)', v: num(a.coverage.scopeCoverage, 1), f: FMT_PCT, n: `${a.coverage.applicable} de ${a.coverage.bankTotal} criterios del banco en el alcance.` },
    { k: 'Cobertura del banco (%)', v: num(a.coverage.bankCoverage, 1), f: FMT_PCT, n: `${a.coverage.bankScored} de ${a.coverage.bankTotal} criterios del banco con puntuación.` },
    { k: 'Cobertura de validación (%)', v: num(a.coverage.validationCoverage, 1), f: FMT_PCT, n: `${a.coverage.validated} criterios validados.` },
    { k: 'Soporte de evidencias (%)', v: num(a.evidence.support, 1), f: FMT_PCT, n: 'E0 = 0; E1 = 0,25; E2 = 0,60; E3 = 1. Convención DIAM.' },
    { k: 'Cobertura de verificación de evidencias (%)', v: num(a.evidence.verificationCoverage, 1), f: FMT_PCT, n: 'Criterios aplicables con evidencia E3.' },
    { k: 'Acuerdo entre entrevistados (0–1)', v: num(a.agreement.agreement), f: FMT_LEVEL, n: 'Promedio de 1 − rango/5 en criterios con al menos dos participantes.' },
    { k: 'Índice orientativo de solidez (0–100)', v: num(a.solidity.index, 0), f: '0', n: a.solidity.index === null ? `No calculable: falta ${a.solidity.missing.join(', ')}.` : '0,4·Cobertura + 0,4·Soporte + 0,2·(Acuerdo × 100). No representa una confianza estadística.' },
    { k: 'Validados sin evidencia suficiente', v: a.lenses.insufficientEvidence.length, n: `Nivel validado ≥ ${VALIDATED_EVIDENCE_LEVEL} con evidencia E0 o E1: ${a.lenses.insufficientEvidence.join(', ') || 'ninguno'}. No cuentan en «Capacidades sustentadas con evidencia».` },
    { k: 'Alertas de criterios críticos (percibida)', v: vp.critical.length, n: '' },
    { k: 'Discrepancias detectadas', v: a.discrepancies, n: '' },
    { k: 'Dimensiones fuera del agregado percibido', v: vp.global.excluded.map((e) => e.dimensionId).join(', ') || 'Ninguna', n: 'Dimensiones sin datos: no se cuentan como cero.' },
  ];
  const sumWs = sheet(wb, '01_Resumen', [{ header: 'Indicador', key: 'k', width: 46 }, { header: 'Valor', key: 'v', width: 22 }, { header: 'Nota metodológica', key: 'n', width: 90 }], summaryRows.map(({ k, v, n }) => ({ k, v, n })));
  summaryRows.forEach((r, i) => { if (r.f) sumWs.getCell(`B${i + 2}`).numFmt = r.f; });

  sheet(wb, '02_Organizacion', [{ header: 'Campo', key: 'k', width: 40 }, { header: 'Valor', key: 'v', width: 60 }, { header: 'Calidad del dato', key: 'q', width: 18 }], [
    { k: 'Nombre o razón social', v: org.name, q: '' }, { k: 'Nombre abreviado', v: org.shortName, q: '' },
    { k: 'Perfil organizacional', v: getProfile(org.profileId).label, q: '' }, { k: 'NIT', v: org.nit, q: '' }, { k: 'Sector', v: org.sector, q: '' },
    { k: 'Actividad principal', v: org.mainActivity, q: '' }, { k: 'Departamento / municipio', v: `${org.department} / ${org.municipality}`, q: '' },
    { k: 'Tamaño', v: org.size, q: '' }, { k: 'Empleados', v: org.employees, q: '' }, { k: 'Sedes', v: org.sites, q: '' },
    { k: 'Ejerce funciones públicas', v: org.legalFlags.publicFunctions, q: '' }, { k: 'Administra recursos públicos', v: org.legalFlags.publicResources, q: '' },
    { k: 'Presta servicios públicos', v: org.legalFlags.publicServices, q: '' }, { k: 'Regulación sectorial', v: org.legalFlags.sectoralRegulation, q: '' },
    ...Object.entries(org.documentary).map(([k, f]) => ({ k, v: f.value, q: f.quality })),
  ]);

  sheet(wb, '03_Entrevistados', [{ header: 'Código', key: 'c', width: 16 }, { header: 'Perfil', key: 'p', width: 26 }, { header: 'Área', key: 'a', width: 24 }, { header: 'Entrevistas', key: 'i', width: 12 }, { header: 'Criterios respondidos', key: 'r', width: 18 }],
    a.participantComparison.map((pc) => ({ c: pc.participant.code, p: roleLabel(pc.participant.profile), a: pc.participant.area, i: bundle.interviews.filter((i) => i.participantId === pc.participant.id).length, r: pc.answered })));

  sheet(wb, '04_Respuestas', [{ header: 'Criterio', key: 'q', width: 12 }, { header: 'Participante', key: 'p', width: 14 }, { header: 'Perfil', key: 'pr', width: 22 }, { header: 'Nivel', key: 'v', width: 8, note: 'Valor numérico 0–5. Vacío cuando hay estado especial.' }, { header: 'Estado especial', key: 's', width: 22, note: 'Ningún estado especial se convierte en cero.' }, { header: 'Observación', key: 'n', width: 50 }, { header: 'Evidencia reportada', key: 'e', width: 40 }, { header: 'Marcada para revisión', key: 'f', width: 12 }],
    bundle.responses.map((r) => ({ q: r.questionId, p: partBy.get(r.participantId)?.code ?? '', pr: roleLabel(partBy.get(r.participantId)?.profile ?? ''), v: r.special ? null : r.value, s: r.special ? SPECIAL_LABEL[r.special] : '', n: r.note, e: r.reportedEvidence, f: r.flagged ? 'Sí' : 'No' })), { levelCols: ['v'] });

  sheet(wb, '05_Consolidacion', [
    { header: 'Criterio', key: 'id', width: 12 }, { header: 'Dimensión', key: 'd', width: 8 }, { header: 'Nombre', key: 'c', width: 44 }, { header: 'Aplicable', key: 'ap', width: 10 },
    { header: 'Respuestas', key: 'n', width: 10 }, { header: 'Mediana', key: 'med', width: 9 }, { header: 'Media', key: 'mean', width: 9 }, { header: 'Mín.', key: 'min', width: 7 }, { header: 'Máx.', key: 'max', width: 7 },
    { header: 'Rango', key: 'range', width: 7 }, { header: 'Desv. est.', key: 'sd', width: 9 }, { header: 'Perfiles', key: 'pf', width: 8 }, { header: 'Acuerdo', key: 'ag', width: 9 },
    { header: 'Percibido', key: 'pre', width: 10 }, { header: 'Validado', key: 'val', width: 9 }, { header: 'Justificación de validación', key: 'just', width: 50 }, { header: 'Evidencia', key: 'ev', width: 24 }, { header: 'Evidencia suficiente para lo validado', key: 'suf', width: 16, note: `«No» cuando el nivel validado es ${VALIDATED_EVIDENCE_LEVEL} o superior y la evidencia es E0 o E1.` }, { header: 'Crítico', key: 'cr', width: 8 },
  ], a.states.map((s) => ({
    id: s.question.id, d: s.dimensionId, c: s.question.criterion, ap: s.applicable ? 'Sí' : 'No aplica (validado)', n: s.stats?.n ?? 0, med: num(s.stats?.median), mean: num(s.stats?.mean),
    min: s.stats?.min ?? null, max: s.stats?.max ?? null, range: s.stats?.range ?? null, sd: num(s.stats?.sd ?? null), pf: s.stats?.profiles ?? 0, ag: num(s.agreement, 2),
    pre: num(s.preliminary), val: s.validated, just: s.finding?.justification ?? '', ev: `${s.evidenceStatus} · ${EVIDENCE_LABEL[s.evidenceStatus]}`, suf: s.validated === null ? '' : s.insufficientEvidence ? 'No: validado sin evidencia suficiente' : 'Sí', cr: s.question.isCritical ? 'Sí' : 'No',
  })), { levelCols: ['med', 'mean', 'sd', 'ag', 'pre', 'val'] });

  const dimWs = sheet(wb, '06_Dimensiones', [
    { header: 'Dimensión', key: 'id', width: 8 }, { header: 'Nombre', key: 'n', width: 36 }, { header: 'Ponderación', key: 'w', width: 12 }, { header: 'Preliminar', key: 'p', width: 11 },
    { header: 'Validada', key: 'v', width: 10 }, { header: 'Meta', key: 't', width: 10 }, { header: 'Brecha percibida', key: 'g', width: 11, note: 'Promedio ponderado de MAX(0; meta − nivel percibido) por criterio puntuado de la dimensión.' }, { header: 'Brecha validada', key: 'gv', width: 11, note: 'Promedio ponderado de MAX(0; meta − nivel validado) por criterio validado de la dimensión.' }, { header: 'Cobertura (%)', key: 'c', width: 12 },
    { header: 'Cobertura validada (%)', key: 'cv', width: 14 }, { header: 'Soporte de evidencias (%)', key: 'e', width: 14 }, { header: 'Lectura de cobertura', key: 'b', width: 36 },
  ], a.dimensions.map((d) => ({
    id: d.dimensionId, n: dimensionName(d.dimensionId), w: d.weight, p: num(d.preliminary), v: num(d.validated), t: num(d.target), g: d.gapPreliminary === null ? 'Evaluar' : num(d.gapPreliminary), gv: d.gapValidated === null ? 'Sin validar' : num(d.gapValidated), c: num(d.preliminaryCoverage, 1),
    cv: num(d.validatedCoverage, 1), e: num(d.evidenceSupport, 1), b: d.band ? COVERAGE_BAND_LABEL[d.band] : 'Datos insuficientes',
  })), { levelCols: ['p', 'v', 't', 'g', 'gv'], pctCols: ['c'] });
  dimWs.getColumn(3).numFmt = FMT_LEVEL;

  const gapWs = sheet(wb, '07_Matriz_Brechas', [
    { header: 'Criterio', key: 'id', width: 12 }, { header: 'Nombre', key: 'c', width: 44 }, { header: 'Actual', key: 'cur', width: 9, note: 'Nivel validado cuando existe; si no, el percibido.' }, { header: 'Meta', key: 'tg', width: 9 },
    { header: 'Mínimo recomendado', key: 'min', width: 12 }, { header: 'Brecha', key: 'g', width: 9 }, { header: 'Criticidad', key: 'cr', width: 10 }, { header: 'Evidencia', key: 'ev', width: 10 },
    { header: 'Prioridad', key: 'pr', width: 10 }, { header: 'Cuadrante', key: 'q', width: 24 }, { header: 'Explicación de la prioridad', key: 'x', width: 70 },
  ], a.states.filter((s) => s.applicable).map((s) => {
    const p = a.priorities.find((x) => x.questionId === s.question.id);
    return { id: s.question.id, c: s.question.criterion, cur: num(currentScore(s)), tg: s.target, min: s.question.minimumRecommendedLevel, g: null, cr: s.question.isCritical ? 'Crítico' : s.question.criticality, ev: s.evidenceStatus, pr: num(p?.score ?? null), q: p ? QUADRANT_LABEL[p.quadrant] : '', x: p?.explanation ?? (currentScore(s) === null ? 'Evaluar la capacidad' : '') };
  }), { levelCols: ['cur', 'g', 'pr'] });
  a.states.filter((s) => s.applicable).forEach((s, i) => {
    const r = i + 2;
    const cur = currentScore(s);
    gapWs.getCell(`F${r}`).value = cur === null ? 'Evaluar' : { formula: `MAX(0,D${r}-C${r})`, result: num(Math.max(0, s.target - cur)) ?? 0 };
  });

  sheet(wb, '08_Riesgos', [
    { header: 'Riesgo', key: 't', width: 36 }, { header: 'Estado', key: 's', width: 14 }, { header: 'Criterios', key: 'q', width: 30 }, { header: 'Probabilidad', key: 'p', width: 11 }, { header: 'Impacto', key: 'i', width: 9 },
    { header: 'Valor', key: 'v', width: 8 }, { header: 'Clasificación', key: 'c', width: 12 }, { header: 'Residual', key: 'r', width: 9 }, { header: 'Responsable', key: 'o', width: 20 }, { header: 'Tratamiento', key: 'tr', width: 50 },
  ], (bundle.risks.length ? bundle.risks : a.suggestedRisks.map((s) => ({ title: s.title, status: 'sugerido' as const, questionIds: s.questionIds, probability: null, impact: null, residualProbability: null, residualImpact: null, owner: '', treatment: '' }))).map((r) => {
    const v = riskScore(r.probability, r.impact);
    return { t: r.title, s: RISK_STATUS_LABEL[r.status], q: r.questionIds.join(', '), p: r.probability, i: r.impact, v, c: riskBand(v)?.label ?? 'Sin valorar', r: riskScore(r.residualProbability, r.residualImpact), o: r.owner, tr: r.treatment };
  }));

  sheet(wb, '09_Recomendaciones', [
    { header: 'Criterio', key: 'id', width: 12 }, { header: 'Tipo de acción', key: 'verb', width: 14 }, { header: 'Problema identificado', key: 'p', width: 50 }, { header: 'Acción propuesta', key: 'a', width: 50 },
    { header: 'Resultado esperado', key: 'r', width: 50 }, { header: 'Responsable sugerido', key: 'o', width: 26 }, { header: 'Evidencia de cumplimiento', key: 'e', width: 40 }, { header: 'Indicador', key: 'i', width: 50 },
    { header: 'Dependencias', key: 'd', width: 20 }, { header: 'Esfuerzo orientativo', key: 'ef', width: 12 }, { header: 'Referentes', key: 'ref', width: 30 },
  ], a.recommendations.filter((r) => r.status !== 'superado').map((r) => ({ id: r.questionId, verb: r.verb ? VERB_LABEL[r.verb] : 'Evaluar', p: r.problem, a: r.action, r: r.expectedResult, o: r.responsible, e: r.complianceEvidence, i: r.indicator, d: r.dependencies.join(', '), ef: r.effort ?? '', ref: r.references.join(', ') })));

  sheet(wb, '10_Hoja_Ruta', [
    { header: 'Código', key: 'c', width: 10 }, { header: 'Iniciativa', key: 'n', width: 40 }, { header: 'Fase', key: 'f', width: 28 }, { header: 'Inicio', key: 's', width: 12 }, { header: 'Fin', key: 'e', width: 12 },
    { header: 'Prioridad', key: 'p', width: 10, numFmt: FMT_LEVEL }, { header: 'Responsable', key: 'o', width: 26 }, { header: 'Criterios', key: 'q', width: 40 }, { header: 'Presupuesto estimado (COP)', key: 'b', width: 18, numFmt: '"$"#,##0' },
    { header: 'Depende de', key: 'dep', width: 18 }, { header: 'Estado', key: 'st', width: 14 }, { header: 'Productos esperados', key: 'd', width: 50 }, { header: 'Indicadores', key: 'i', width: 40 },
  ], (bundle.initiatives.length ? [...bundle.initiatives].sort((x, y) => x.phase - y.phase || x.startDate.localeCompare(y.startDate) || x.order - y.order) : []).map((i) => ({
    c: i.code, n: i.name, f: `Fase ${i.phase} — ${PHASES[i.phase - 1].name}`, s: i.startDate, e: i.endDate, p: i.priority, o: i.owner, q: i.questionIds.join(', '), b: i.budgetCOP,
    dep: i.dependencies.map((d) => bundle.initiatives.find((x) => x.id === d)?.code).filter(Boolean).join(', '), st: INITIATIVE_STATUS_LABEL[i.status], d: i.deliverables, i: i.indicators,
  })));

  sheet(wb, '11_Evidencias', [
    { header: 'Criterio', key: 'q', width: 12 }, { header: 'Título', key: 't', width: 36 }, { header: 'Referencia documental', key: 'r', width: 36 }, { header: 'Estado', key: 's', width: 30 },
    { header: 'Revisor', key: 'rv', width: 20 }, { header: 'Resultado de revisión', key: 'rr', width: 40 }, { header: 'Alcance de la muestra', key: 'm', width: 24 }, { header: 'Restricciones de acceso', key: 'ac', width: 24 }, { header: 'Adjunto local', key: 'a', width: 16 },
  ], bundle.evidence.map((e) => ({ q: e.questionId, t: e.title, r: e.reference, s: `${e.status} · ${EVIDENCE_LABEL[e.status]}`, rv: e.reviewer, rr: e.reviewResult, m: e.sampleScope, ac: e.accessRestrictions, a: e.attachment ? e.attachment.name : '' })));

  sheet(wb, '12_Referentes', [
    { header: 'Referente', key: 'id', width: 8 }, { header: 'Título', key: 't', width: 60 }, { header: 'Criterios asociados', key: 'n', width: 12 }, { header: 'Cobertura (%)', key: 'c', width: 12 },
    { header: 'Resultado de criterios DIAM asociados al referente', key: 's', width: 22, note: 'No constituye certificación ni puntaje oficial del referente.' }, { header: 'Estado de verificación', key: 'v', width: 22 },
  ], a.byReference.map((r) => ({ id: r.source.id, t: r.source.title, n: r.related, c: num(r.coverage, 1), s: num(r.score), v: VERIFICATION_LABEL[r.source.verificationStatus as keyof typeof VERIFICATION_LABEL] ?? r.source.verificationStatus })), { levelCols: ['s'] });

  sheet(wb, '13_Ponderaciones', [{ header: 'Dimensión', key: 'd', width: 10 }, { header: 'Nombre', key: 'n', width: 40 }, { header: 'Ponderación DIAM', key: 'diam', width: 14 }, { header: 'Ponderación utilizada', key: 'w', width: 14 }, { header: 'Modo', key: 'm', width: 14 }, { header: 'Motivo del cambio', key: 'r', width: 50 }],
    DIMENSIONS.map((d) => ({ d: d.id, n: d.name, diam: d.defaultWeight, w: a.dimensionWeights[d.id] ?? 0, m: a.assessment.weights.mode, r: a.assessment.weights.reason })));

  sheet(wb, '14_Metodologia', [{ header: 'Elemento', key: 'k', width: 30 }, { header: 'Descripción', key: 'v', width: 110 }], [
    { k: 'Modelo', v: `${MODEL_NAME}, versión 1.0. Propuesta metodológica independiente y orientativa; no certificada, no validada psicométricamente y no avalada por ISO ni por el AGN.` },
    ...LEVEL_NAMES.map((n, i) => ({ k: `Nivel ${i}`, v: n })),
    { k: 'Consolidación', v: 'Una respuesta por participante (la más reciente) y mediana entre participantes. Las respuestas especiales no se convierten en cero.' },
    { k: 'Validación', v: 'El nivel validado lo asigna el evaluador con justificación; nunca sobrescribe las respuestas originales.' },
    { k: 'Cobertura del diagnóstico', v: 'Criterios con puntuación numérica / criterios aplicables del alcance. Solo la no aplicabilidad validada excluye criterios.' },
    { k: 'Alcance sobre el banco', v: 'Criterios aplicables del alcance / 225 criterios del banco.' },
    { k: 'Cobertura del banco', v: 'Criterios del banco con puntuación / 225.' },
    { k: 'Brecha frente a la meta', v: 'Promedio ponderado de MAX(0; meta − nivel) por criterio puntuado, en la serie correspondiente.' },
    { k: 'Índice orientativo de solidez', v: '0,4·Cobertura + 0,4·Soporte de evidencias + 0,2·(Acuerdo × 100). Escala 0–100.' },
    { k: 'Lecturas organizacional y tecnológica', v: `Promedio ponderado por dimensión de ${dimensionRangeLabel([...LENS_DIMENSIONS.organizational])} (organizacional) y ${dimensionRangeLabel([...LENS_DIMENSIONS.technological])} (tecnológica).` },
    { k: 'Interpretación', v: '0–0,49 Inexistente; 0,50–1,49 Inicial; 1,50–2,49 En desarrollo; 2,50–3,49 Definido; 3,50–4,49 Gestionado; 4,50–5 Optimizado.' },
    { k: 'Prioridad', v: '0,30·Brecha + 0,25·Impacto + 0,20·Criticidad + 0,15·Urgencia + 0,10·Habilitador. Los factores estimados se identifican como tales.' },
  ]);

  sheet(wb, '15_Cobertura', [{ header: 'Dimensión', key: 'd', width: 10 }, { header: 'Criterios del alcance', key: 's', width: 14 }, { header: 'Aplicables', key: 'a', width: 12 }, { header: 'Con puntuación', key: 'n', width: 14 }, { header: 'Cobertura (%)', key: 'c', width: 12 }, { header: 'Cobertura ponderada (%)', key: 'w', width: 14 }, { header: 'Validados (%)', key: 'v', width: 12 }],
    a.dimensions.map((d) => ({ d: d.dimensionId, s: d.scope, a: d.applicable, n: a.states.filter((s) => s.dimensionId === d.dimensionId && s.applicable && s.preliminary !== null).length, c: num(d.preliminaryCoverage, 1), w: num(d.weightedCoverage, 1), v: num(d.validatedCoverage, 1) })), { pctCols: ['c'] });

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
