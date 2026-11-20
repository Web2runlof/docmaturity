import { describe, expect, it } from 'vitest';
import { BANK, QUESTIONS, DIMENSIONS, SOURCES, GLOSSARY, questionIdsForTier } from '@/data/bank';
import { bankSchema } from '@/schemas/bank';
import { CONTRADICTION_RULES } from '@/engine/triangulation';
import { INITIATIVE_TEMPLATES, templateByQuestion } from '@/data/recommendations/initiatives';
import { RISK_LIBRARY } from '@/engine/risk';

describe('Banco maestro DIAM', () => {
  it('cumple el esquema Zod (225 criterios, 15 dimensiones)', () => {
    const r = bankSchema.safeParse(BANK);
    if (!r.success) console.error(r.error.issues.slice(0, 5));
    expect(r.success).toBe(true);
    expect(QUESTIONS).toHaveLength(225);
    expect(DIMENSIONS).toHaveLength(15);
  });

  it('08 · banco profesional de 225 criterios', () => {
    expect(questionIdsForTier('professional')).toHaveLength(225);
  });

  it('06 · diagnóstico rápido de 30 criterios antes de filtros (2 por dimensión)', () => {
    const quick = questionIdsForTier('quick');
    expect(quick).toHaveLength(30);
    for (const d of DIMENSIONS) expect(quick.filter((id) => id.startsWith(d.id))).toHaveLength(2);
  });

  it('07 · diagnóstico estándar de 90 criterios que incluye los 30 rápidos', () => {
    const std = questionIdsForTier('standard');
    expect(std).toHaveLength(90);
    for (const id of questionIdsForTier('quick')) expect(std).toContain(id);
    for (const d of DIMENSIONS) expect(std.filter((id) => id.startsWith(d.id))).toHaveLength(6);
  });

  it('09 · identificadores únicos y estables', () => {
    const ids = QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(225);
    expect(ids[0]).toBe('D01-Q01');
    expect(ids[224]).toBe('D15-Q15');
  });

  it('10 · seis descriptores específicos por pregunta y 1.350 descriptores distintos', () => {
    for (const q of QUESTIONS) {
      expect(q.maturityDescriptors).toHaveLength(6);
      expect(new Set(q.maturityDescriptors).size).toBe(6);
    }
    expect(new Set(QUESTIONS.flatMap((q) => q.maturityDescriptors)).size).toBeGreaterThanOrEqual(1350);
  });

  it('no hay preguntas duplicadas', () => {
    expect(new Set(QUESTIONS.map((q) => q.question.toLowerCase())).size).toBe(225);
  });

  it('11 · cada criterio tiene fuentes registradas', () => {
    const ids = new Set(SOURCES.map((s) => s.id));
    for (const q of QUESTIONS) {
      expect(q.sourceRefs.length).toBeGreaterThan(0);
      q.sourceRefs.forEach((r) => expect(ids.has(r)).toBe(true));
    }
    for (const s of SOURCES) expect(['verificado', 'verificado_parcial', 'referencia_conceptual', 'no_verificado']).toContain(s.verificationStatus);
  });

  it('12 · recomendaciones para los seis niveles en cada criterio', () => {
    for (const q of QUESTIONS) {
      expect(q.recommendationByLevel.map((r) => r.level)).toEqual([0, 1, 2, 3, 4, 5]);
      q.recommendationByLevel.forEach((r) => expect(r.text.length).toBeGreaterThan(10));
    }
  });

  it('cada criterio tiene aclaración y evidencias sugeridas', () => {
    for (const q of QUESTIONS) {
      expect(q.explanation.length).toBeGreaterThan(20);
      expect(q.evidenceSuggestions.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('ponderaciones iniciales suman 100 %', () => {
    expect(DIMENSIONS.reduce((a, d) => a + d.defaultWeight, 0)).toBe(100);
  });

  it('glosario con al menos 60 términos con referencias', () => {
    expect(GLOSSARY.length).toBeGreaterThanOrEqual(60);
    expect(new Set(GLOSSARY.map((g) => g.id)).size).toBe(GLOSSARY.length);
  });

  it('al menos 25 reglas de contradicción con criterios existentes', () => {
    expect(CONTRADICTION_RULES.length).toBeGreaterThanOrEqual(25);
    const ids = new Set(QUESTIONS.map((q) => q.id));
    for (const r of CONTRADICTION_RULES) {
      expect(ids.has(r.a.questionId)).toBe(true);
      expect(ids.has(r.b.questionId)).toBe(true);
    }
  });

  it('al menos 30 plantillas de iniciativas sin criterios duplicados y con cobertura completa', () => {
    expect(INITIATIVE_TEMPLATES.length).toBeGreaterThanOrEqual(30);
    const all = INITIATIVE_TEMPLATES.flatMap((t) => t.questionIds);
    expect(new Set(all).size).toBe(all.length);
    expect(templateByQuestion().size).toBe(225);
  });

  it('biblioteca de 15 riesgos con disparadores válidos', () => {
    expect(RISK_LIBRARY).toHaveLength(15);
    const ids = new Set(QUESTIONS.map((q) => q.id));
    RISK_LIBRARY.forEach((r) => r.triggers.forEach((t) => expect(ids.has(t)).toBe(true)));
  });

  it('el nivel 5 de D14 no exige adoptar IA', () => {
    for (const q of QUESTIONS.filter((x) => x.dimensionId === 'D14')) {
      expect(q.maturityDescriptors[5]).not.toMatch(/usa(r)? IA de forma/);
    }
  });
});
