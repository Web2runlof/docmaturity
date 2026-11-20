/**
 * Demostración «Cooperativa Financiera Puente Claro (simulación)» frente a los criterios de aceptación
 * de la auditoría funcional.
 *
 * 1. Línea base (loadCase con `baseline: true`): reproduce el caso auditado, antes del enriquecimiento
 *    V14. Verifica los valores de aceptación con las definiciones corregidas (C1–C11).
 * 2. Demostración enriquecida (la que carga la aplicación): verifica C12, C14 y V14.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '@/database/db';
import { loadCase, openOrLoadDemo } from '@/services/demo';
import { loadBundle } from '@/services/repo';
import { analyzeAssessment, dimensionRangeLabel, type Analysis } from '@/engine/analyze';
import { buildNarrative } from '@/engine/narrative';
import { dateViolations } from '@/engine/recommendations';
import { currentScore } from '@/engine/scoring';
import { weightedMean } from '@/engine/scoring/stats';
import { LENS_DIMENSIONS } from '@/engine/constants';
import { fmtPct, fmtScore } from '@/utils/core';
import type { AssessmentBundle } from '@/types/domain';

const narrativeText = (a: Analysis, b: AssessmentBundle) => buildNarrative(a, { risks: b.risks, initiatives: b.initiatives }).flatMap((s) => s.paragraphs.map((p) => p.text)).join(' ');

describe('Línea base auditada (valores de aceptación)', () => {
  let a: Analysis;
  let bundle: AssessmentBundle;
  beforeAll(async () => {
    await db.delete();
    await db.open();
    const id = await loadCase('caso-financiera', 'demo', { baseline: true });
    bundle = (await loadBundle(id))!;
    a = analyzeAssessment(bundle);
  });

  it('madurez percibida 2,60 y validada 2,31 sobre D01–D05, marcada como exploratoria', () => {
    expect(fmtScore(a.views.preliminary.global.score)).toBe('2,60');
    expect(fmtScore(a.views.validated.global.score)).toBe('2,31');
    expect(a.views.validated.global.included).toEqual(['D01', 'D02', 'D03', 'D04', 'D05']);
    expect(a.views.validated.includedLabel).toBe('D01–D05');
    expect(a.views.validated.exploratory).toBe(true);
    expect(a.views.preliminary.exploratory).toBe(false);
  });

  it('coberturas: diagnóstico 91,6 % (87/95), alcance sobre el banco 42,2 %, cobertura del banco 38,7 %', () => {
    expect(a.coverage.numeric).toBe(87);
    expect(a.coverage.applicable).toBe(95);
    expect(fmtPct(a.coverage.coverage)).toBe('91,6 %');
    expect(fmtPct(a.views.preliminary.coverage)).toBe('91,6 %');
    expect(fmtPct(a.coverage.scopeCoverage)).toBe('42,2 %');
    expect(a.coverage.bankScored).toBe(87);
    expect(fmtPct(a.coverage.bankCoverage)).toBe('38,7 %');
    expect(fmtPct(a.views.preliminary.bankCoverage)).toBe('38,7 %');
  });

  it('solidez 54 con la fórmula publicada 0,4·Cobertura + 0,4·Soporte + 0,2·(Acuerdo × 100)', () => {
    const manual = 0.4 * (a.coverage.coverage as number) + 0.4 * (a.evidence.support as number) + 0.2 * ((a.agreement.agreement as number) * 100);
    expect(a.solidity.index).toBeCloseTo(manual, 6);
    expect(Math.round(a.solidity.index as number)).toBe(54);
  });

  it('brecha frente a la meta = promedio ponderado de máx(0, meta − nivel) por criterio puntuado', () => {
    const manual = weightedMean(a.states.filter((s) => s.applicable).map((s) => {
      const v = currentScore(s, 'preliminary');
      return { value: v === null ? null : Math.max(0, s.target - v), weight: s.weight };
    }));
    expect(a.views.preliminary.gap).toBeCloseTo(manual as number, 10);
    // Ya no se calcula como meta promedio menos madurez global (definición anterior: 0,398).
    expect(a.views.preliminary.gap).not.toBeCloseTo(0.398, 3);
  });

  it('lecturas organizacional y tecnológica reproducibles como promedio ponderado por dimensión', () => {
    for (const [key, ids] of Object.entries(LENS_DIMENSIONS) as [keyof typeof LENS_DIMENSIONS, readonly string[]][]) {
      const rows = a.dimensions.filter((d) => ids.includes(d.dimensionId));
      const manual = weightedMean(rows.map((d) => ({ value: d.preliminary, weight: d.weight })));
      expect(a.views.preliminary[key].score).toBeCloseTo(manual as number, 10);
    }
    // Partición completa de las quince dimensiones (incluye D10 y D13).
    expect([...LENS_DIMENSIONS.organizational, ...LENS_DIMENSIONS.technological].sort()).toEqual(a.dimensionIds);
  });

  it('prioridad de D11-Q07 = 3,85 y primera de la lista', () => {
    const p = a.priorities.find((x) => x.questionId === 'D11-Q07')!;
    expect(fmtScore(p.score)).toBe('3,85');
    expect(a.priorities[0].questionId).toBe('D11-Q07');
  });

  it('la narrativa usa una sola serie, sin códigos internos ni redacción defectuosa', () => {
    const text = narrativeText(a, bundle);
    expect(text).not.toContain('Archivística y documental presenta una brecha de 1,3');
    expect(text).not.toMatch(/NO_SABE|NO_APLICA|NO_ASIGNADA|mgdaComponent|\bR\d{2}\b/);
    expect(text).not.toMatch(/\(simulación\) \(/);
    expect(text).not.toContain('organización financiera del sector financiero');
    expect(text).not.toMatch(/\bia\b/);
    expect(text).not.toMatch(/\bd\d{2}-q\d{2}\b/);
    expect(text).not.toContain('deben ser valorados');
  });

  it('ninguna dependencia inicia antes de que termine su prerrequisito', () => {
    expect(dateViolations(bundle.initiatives)).toEqual([]);
    expect(bundle.initiatives.length).toBeGreaterThan(0);
  });

  it('riesgo normativo solo con posible obligación (C12): para esta organización se sugiere debilidad de control', () => {
    const ids = a.suggestedRisks.map((r) => r.libraryId);
    expect(ids).not.toContain('RK07');
    expect(ids).toContain('RK16');
  });

  it('con criterios validados la evaluación queda «En validación» (C14)', () => {
    expect(bundle.assessment.status).toBe('validacion');
    expect(bundle.findings.length).toBeGreaterThan(0);
  });

  it('las dimensiones sin datos validados se listan con rangos legibles', () => {
    expect(dimensionRangeLabel(['D01', 'D02', 'D03', 'D04', 'D05'])).toBe('D01–D05');
    expect(dimensionRangeLabel(['D02', 'D07'])).toBe('D02, D07');
    expect(dimensionRangeLabel([...LENS_DIMENSIONS.organizational])).toBe('D01–D06, D12, D13, D15');
    expect(dimensionRangeLabel([...LENS_DIMENSIONS.technological])).toBe('D07–D11, D14');
  });
});

describe('Demostración enriquecida (V14)', () => {
  let a: Analysis;
  let bundle: AssessmentBundle;
  let id: string;
  beforeAll(async () => {
    await db.delete();
    await db.open();
    id = await openOrLoadDemo();
    bundle = (await loadBundle(id))!;
    a = analyzeAssessment(bundle);
  });

  it('incluye una entrevista distribuida importada con hash', () => {
    const imported = bundle.interviews.filter((i) => i.source === 'importada');
    expect(imported).toHaveLength(1);
    expect(imported[0].mode).toBe('autoadministrada');
    expect(imported[0].contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(bundle.responses.some((r) => r.interviewId === imported[0].id)).toBe(true);
  });

  it('no deja sesiones de entrevistado en el navegador de la persona evaluadora', async () => {
    expect(await db.respondentSessions.count()).toBe(0);
  });

  it('tiene evidencias E2 y E3 en varias dimensiones y soporte de evidencias superior al 20 %', () => {
    const dims = new Set(bundle.evidence.filter((e) => e.status === 'E2' || e.status === 'E3').map((e) => e.questionId.slice(0, 3)));
    expect(dims.size).toBeGreaterThanOrEqual(8);
    expect(a.evidence.support as number).toBeGreaterThan(20);
  });

  it('valora impacto y esfuerzo en algunas iniciativas y tiene al menos una en la fase 4', () => {
    expect(bundle.initiatives.filter((i) => i.impact !== null && i.effort !== null).length).toBeGreaterThanOrEqual(3);
    expect(bundle.initiatives.filter((i) => i.impact === null).length).toBeGreaterThan(0);
    expect(bundle.initiatives.some((i) => i.phase === 4)).toBe(true);
    expect(dateViolations(bundle.initiatives)).toEqual([]);
  });

  it('las validaciones en nivel ≥ 3 sin evidencia suficiente se marcan y no cuentan como sustentadas', () => {
    const flagged = a.states.filter((s) => s.insufficientEvidence);
    expect(flagged.every((s) => (s.validated as number) >= 3 && (s.evidenceStatus === 'E0' || s.evidenceStatus === 'E1'))).toBe(true);
    expect(a.lenses.insufficientEvidence).toEqual(flagged.map((s) => s.question.id));
    expect(a.lenses.evidencedCount).toBe(a.states.filter((s) => s.applicable && s.validated !== null && (s.evidenceStatus === 'E2' || s.evidenceStatus === 'E3')).length);
  });

  it('«Explorar demostración» repetido (incluso simultáneo) no crea duplicados', async () => {
    const [x, y] = await Promise.all([openOrLoadDemo(), openOrLoadDemo()]);
    const z = await openOrLoadDemo();
    expect(new Set([id, x, y, z]).size).toBe(1);
    expect(await db.organizations.filter((o) => o.isDemo).count()).toBe(1);
    expect(await db.assessments.filter((o) => o.isDemo).count()).toBe(1);
  });
});
