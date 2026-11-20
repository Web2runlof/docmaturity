import { beforeEach, describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { db } from '@/database/db';
import { loadCase, removeSimulatedData } from '@/services/demo';
import { loadBundle } from '@/services/repo';
import { analyzeAssessment, compareAssessments } from '@/engine/analyze';
import { buildWorkbook } from '@/services/exports/xlsx';
import { buildAcademicPDF, buildExecutivePDF, buildTechnicalPDF, pdfSafe } from '@/services/exports/pdf';
import { ACADEMIC_CASES } from '@/data/demo/cases';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('Casos simulados', () => {
  it('cada caso genera entrevistas, evidencias y las contradicciones deliberadas declaradas', async () => {
    for (const c of ACADEMIC_CASES) {
      const aid = await loadCase(c.id, 'academic');
      const a = analyzeAssessment((await loadBundle(aid))!);
      expect(a.participantComparison.length).toBe(c.participants.length);
      expect(a.coverage.coverage).toBeGreaterThan(50);
      const ruleIds = a.contradictions.map((x) => x.rule.id);
      const declared = c.deliberateContradictions.map((d) => d.slice(0, 3)).filter((d) => d.startsWith('R'));
      for (const r of declared) expect(ruleIds).toContain(r);
      expect(a.organization.isAcademic).toBe(true);
    }
  }, 60000);

  it('los datos de demostración se mantienen separados y pueden eliminarse', async () => {
    await loadCase('caso-financiera', 'demo');
    expect(await db.organizations.filter((o) => o.isDemo).count()).toBe(1);
    expect(await db.findings.count()).toBeGreaterThan(0);
    expect(await db.initiatives.count()).toBeGreaterThan(0);
    expect(await removeSimulatedData('demo')).toBe(1);
    expect(await db.assessments.count()).toBe(0);
  });
});

describe('Exportaciones', () => {
  it('43 · genera los informes PDF ejecutivo, técnico y académico', async () => {
    const aid = await loadCase('caso-alcaldia', 'demo');
    const bundle = (await loadBundle(aid))!;
    const a = analyzeAssessment(bundle);
    for (const blob of [buildExecutivePDF(a, bundle), buildTechnicalPDF(a, bundle), buildAcademicPDF(a, bundle, { group: 'Grupo 3', members: 'Ana, Luis', course: 'Gobierno y Transformación Digital', conclusions: 'Conclusión de prueba con tildes: gestión, información, ñ.' })]) {
      expect(blob.size).toBeGreaterThan(5000);
      const head = new TextDecoder().decode(new Uint8Array(await blob.slice(0, 8).arrayBuffer()));
      expect(head.startsWith('%PDF-')).toBe(true);
    }
    expect(pdfSafe('Nivel ≥ 3 → “bien” ñandú')).toBe('Nivel >= 3 -> “bien” ñandú');
  }, 60000);

  it('44 · genera un .xlsx real con 15 hojas, filtros, encabezados fijos y fórmulas', async () => {
    const aid = await loadCase('caso-ips', 'demo');
    const bundle = (await loadBundle(aid))!;
    const a = analyzeAssessment(bundle);
    const blob = await buildWorkbook(a, bundle);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await blob.arrayBuffer());
    const names = wb.worksheets.map((w) => w.name);
    expect(names).toEqual(['01_Resumen', '02_Organizacion', '03_Entrevistados', '04_Respuestas', '05_Consolidacion', '06_Dimensiones', '07_Matriz_Brechas', '08_Riesgos', '09_Recomendaciones', '10_Hoja_Ruta', '11_Evidencias', '12_Referentes', '13_Ponderaciones', '14_Metodologia', '15_Cobertura']);
    const ws = wb.getWorksheet('07_Matriz_Brechas')!;
    expect(ws.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 });
    expect(ws.autoFilter).toBeTruthy();
    const f = ws.getCell('F2').value as { formula?: string } | string;
    expect(typeof f === 'string' ? f : f.formula).toMatch(/MAX|Evaluar/);
  }, 60000);

  it('51/52 · compara evaluaciones compatibles y advierte incompatibilidades', async () => {
    const a1 = await loadCase('caso-alcaldia', 'academic');
    const a2 = await loadCase('caso-alcaldia', 'demo');
    const an1 = analyzeAssessment((await loadBundle(a1))!);
    const an2 = analyzeAssessment((await loadBundle(a2))!);
    const cmp = compareAssessments([an1, an2])!;
    expect(cmp.compatible).toBe(true);
    expect(cmp.commonCriteria).toBeGreaterThan(80);
    const modified = { ...an2, assessment: { ...an2.assessment, bankVersion: '0.9.0' } };
    expect(compareAssessments([an1, modified])!.limitations.length).toBeGreaterThan(0);
  }, 60000);
});
