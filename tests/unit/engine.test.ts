import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '@/data/bank';
import { DEFAULT_THRESHOLDS } from '@/engine/constants';
import {
  computeAgreement, computeCoverage, computeCriticalAlerts, computeDimensions, computeEvidence, computeGlobal, computeSolidity,
  coverageBand, currentScore, levelIndex,
} from '@/engine/scoring';
import { median, mean, ratio, weightedMean } from '@/engine/scoring/stats';
import { computeValidationAlerts, evaluateContradictions } from '@/engine/triangulation';
import { computePriorities } from '@/engine/prioritization';
import { proposeInitiatives, recommendationFor, phaseViolation } from '@/engine/recommendations';
import { riskBand, riskMatrix, riskScore, suggestRisks } from '@/engine/risk';
import { legalApplicability, suggestNotApplicable } from '@/engine/applicability';
import { EMPTY_LEGAL_FLAGS } from '@/data/sector-profiles';
import { evidence, finding, naValidated, participant, response, states } from './helpers';

const q10 = QUESTIONS.slice(0, 10);
const T = DEFAULT_THRESHOLDS;

describe('Estadística básica', () => {
  it('28 · mediana correcta (pares e impares)', () => {
    expect(median([4, 3, 2, 1])).toBe(2.5);
    expect(median([1, 5, 3])).toBe(3);
    expect(median([])).toBeNull();
  });
  it('35 · división por cero gestionada', () => {
    expect(ratio(3, 0)).toBeNull();
    expect(weightedMean([{ value: 3, weight: 0 }])).toBeNull();
    expect(weightedMean([])).toBeNull();
  });
});

describe('Caso matemático obligatorio de cobertura', () => {
  it('29/32 · 10 seleccionados, 2 NA validados, 5 numéricos, 3 pendientes u omitidos → 62,5 % exploratorio', () => {
    const p = participant();
    const responses = [
      ...q10.slice(0, 5).map((q) => response(p, q.id, 3)),
      response(p, q10[5].id, null, 'OMITIDA'),
      response(p, q10[6].id, null, 'PENDIENTE'),
      response(p, q10[7].id, null, 'NO_SABE'),
    ];
    const s = states({ questions: q10, participants: [p], responses, applicability: [naValidated(q10[8].id), naValidated(q10[9].id)] });
    const cov = computeCoverage(s, T, 225);
    expect(cov.scope).toBe(10);
    expect(cov.applicable).toBe(8);
    expect(cov.numeric).toBe(5);
    expect(cov.coverage).toBeCloseTo(62.5, 6);
    expect(cov.coverage).not.toBe(50);
    expect(cov.coverage).not.toBe(100);
    expect(cov.band).toBe('exploratorio');
  });

  it('bandas de cobertura con umbrales configurables', () => {
    expect(coverageBand(49.9, T)).toBe('insuficiente');
    expect(coverageBand(50, T)).toBe('exploratorio');
    expect(coverageBand(70, T)).toBe('parcial');
    expect(coverageBand(90, T)).toBe('alta');
    expect(coverageBand(80, { ...T, coveragePartial: 80 })).toBe('alta');
  });
});

describe('Consolidación por criterio', () => {
  const qid = q10[0].id;
  const ps = [participant('direccion'), participant('archivo'), participant('tecnologia'), participant('usuarios')];
  const rs = [4, 3, 2, 1].map((v, i) => response(ps[i], qid, v as 0 | 1 | 2 | 3 | 4 | 5));

  it('respuestas 4, 3, 2, 1 → mediana 2,5; media 2,5; rango 3; acuerdo 0,4; alerta de discrepancia', () => {
    const s = states({ questions: [q10[0]], participants: ps, responses: rs });
    expect(s[0].stats?.median).toBe(2.5);
    expect(s[0].stats?.mean).toBe(2.5);
    expect(s[0].stats?.range).toBe(3);
    expect(s[0].agreement).toBeCloseTo(0.4, 10);
    const alerts = computeValidationAlerts(s, T, []);
    expect(alerts.some((a) => a.kind === 'discrepancia' && a.questionId === qid)).toBe(true);
  });

  it('una preliminar de 2,5 no se confunde con un nivel 3 validado', () => {
    const s = states({ questions: [q10[0]], participants: ps, responses: rs });
    expect(s[0].preliminary).toBe(2.5);
    expect(s[0].validated).toBeNull();
    expect(levelIndex(2.5)).toBe(3); // la etiqueta del rango es "Definido" pero sigue siendo preliminar
    const dims = computeDimensions(s, ['D01'], { D01: 8 }, T, 3, {});
    expect(dims[0].validated).toBeNull();
    const cov = computeCoverage(s, T, 225);
    expect(computeGlobal(dims, 'validated', cov, T).score).toBeNull();
    expect(computeGlobal(dims, 'preliminary', cov, T).label).toBe('preliminar_alcance');
  });

  it('participantes duplicados no cuentan como observaciones independientes', () => {
    const p = participant();
    const s = states({ questions: [q10[0]], participants: [p], responses: [response(p, qid, 1, null, '2026-01-01'), response(p, qid, 4, null, '2026-02-01')] });
    expect(s[0].stats?.n).toBe(1);
    expect(s[0].preliminary).toBe(4);
    expect(s[0].agreement).toBeNull();
  });

  it('30/31 · NO_SABE y OMITIDA no se contabilizan como cero', () => {
    const [a, b, c] = [participant(), participant(), participant()];
    const s = states({ questions: [q10[0]], participants: [a, b, c], responses: [response(a, qid, 4), response(b, qid, null, 'NO_SABE'), response(c, qid, null, 'OMITIDA')] });
    expect(s[0].preliminary).toBe(4);
    expect(s[0].stats?.n).toBe(1);
    expect(s[0].specials.NO_SABE).toBe(1);
  });

  it('33 · NO_ASIGNADA (sin respuesta) queda fuera del universo de respuestas esperadas', () => {
    const a = participant();
    const s = states({ questions: q10.slice(0, 2), participants: [a], responses: [response(a, q10[0].id, 3)] });
    expect(s[1].answers).toHaveLength(0);
    expect(s[1].preliminary).toBeNull();
    const cov = computeCoverage(s, T, 225);
    expect(cov.applicable).toBe(2);
    expect(cov.numeric).toBe(1);
  });

  it('27 · un valor especial con nivel no es posible (el motor ignora el nivel)', () => {
    const a = participant();
    const s = states({ questions: [q10[0]], participants: [a], responses: [{ ...response(a, qid, 4), special: 'NO_SABE' }] });
    expect(s[0].preliminary).toBeNull();
  });
});

describe('Puntuación validada y agregados', () => {
  it('39 · validar un hallazgo no altera las respuestas originales', () => {
    const p = participant();
    const r = response(p, q10[0].id, 2);
    const snapshot = JSON.stringify(r);
    const s = states({ questions: [q10[0]], participants: [p], responses: [r], findings: [finding(q10[0].id, 4, 2)] });
    expect(s[0].validated).toBe(4);
    expect(s[0].preliminary).toBe(2);
    expect(currentScore(s[0])).toBe(4);
    expect(JSON.stringify(r)).toBe(snapshot);
  });

  it('34 · ponderaciones de dimensión y global con renormalización y exclusiones explícitas', () => {
    const d1 = QUESTIONS.filter((q) => q.dimensionId === 'D01').slice(0, 2);
    const d2 = QUESTIONS.filter((q) => q.dimensionId === 'D02').slice(0, 1);
    const d3 = QUESTIONS.filter((q) => q.dimensionId === 'D03').slice(0, 1);
    const p = participant();
    const s = states({
      questions: [...d1, ...d2, ...d3], participants: [p],
      questionWeights: { [d1[0].id]: 3, [d1[1].id]: 1 },
      responses: [response(p, d1[0].id, 4), response(p, d1[1].id, 0), response(p, d2[0].id, 2)],
    });
    const dims = computeDimensions(s, ['D01', 'D02', 'D03'], { D01: 8, D02: 8, D03: 5 }, T, 3, {});
    expect(dims[0].preliminary).toBeCloseTo(3, 10); // (4·3 + 0·1)/4
    expect(dims[1].preliminary).toBe(2);
    expect(dims[2].preliminary).toBeNull();
    expect(dims[2].insufficient).toBe(true);
    const g = computeGlobal(dims, 'preliminary', computeCoverage(s, T, 225), T);
    expect(g.score).toBeCloseTo((3 * 8 + 2 * 8) / 16, 10);
    expect(g.excluded.map((e) => e.dimensionId)).toEqual(['D03']);
    expect(g.percentOfMax).toBeCloseTo((2.5 / 5) * 100, 10);
  });

  it('rangos de interpretación con precisión completa', () => {
    expect(levelIndex(0.49)).toBe(0);
    expect(levelIndex(0.5)).toBe(1);
    expect(levelIndex(1.4999)).toBe(1);
    expect(levelIndex(2.5)).toBe(3);
    expect(levelIndex(4.4999)).toBe(4);
    expect(levelIndex(4.5)).toBe(5);
  });

  it('soporte de evidencias y cobertura de verificación son indicadores distintos', () => {
    const p = participant();
    const qs = q10.slice(0, 4);
    const s = states({
      questions: qs, participants: [p],
      responses: [response(p, qs[0].id, 3), response(p, qs[1].id, 3)],
      evidence: [evidence(qs[0].id, 'E3'), evidence(qs[1].id, 'E1'), evidence(qs[2].id, 'E3')],
    });
    const ev = computeEvidence(s);
    expect(ev.support).toBeCloseTo(((1 + 0.25) / 2) * 100, 10);
    expect(ev.verificationCoverage).toBeCloseTo((2 / 4) * 100, 10);
  });

  it('solidez solo se calcula cuando existe acuerdo; con un único entrevistado no es evaluable', () => {
    const p = participant();
    const s = states({ questions: [q10[0]], participants: [p], responses: [response(p, q10[0].id, 3)] });
    const ag = computeAgreement(s);
    expect(ag.agreement).toBeNull();
    const sol = computeSolidity(100, 0, ag.agreement);
    expect(sol.index).toBeNull();
    expect(sol.missing).toContain('acuerdo entre entrevistados');
    expect(computeSolidity(80, 50, 0.6).index).toBeCloseTo(0.4 * 80 + 0.4 * 50 + 0.2 * 60, 10);
  });

  it('38 · alertas de criterios críticos (bajo y no evaluado)', () => {
    const crit = QUESTIONS.filter((q) => q.isCritical).slice(0, 2);
    const p = participant();
    const s = states({ questions: crit, participants: [p], responses: [response(p, crit[0].id, 1)] });
    const al = computeCriticalAlerts(s);
    expect(al.find((a) => a.questionId === crit[0].id)?.kind).toBe('critico_bajo');
    expect(al.find((a) => a.questionId === crit[1].id)?.kind).toBe('critico_no_evaluado');
  });
});

describe('Triangulación', () => {
  it('37 · regla R01 (retención definida baja, aplicación electrónica alta)', () => {
    const qs = QUESTIONS.filter((q) => ['D05-Q05', 'D07-Q14'].includes(q.id));
    const p = participant();
    const s = states({ questions: qs, participants: [p], responses: [response(p, 'D05-Q05', 1), response(p, 'D07-Q14', 4)] });
    const t = evaluateContradictions(s);
    expect(t.map((x) => x.rule.id)).toContain('R01');
    // No cambia ninguna respuesta
    expect(s.find((x) => x.question.id === 'D05-Q05')?.preliminary).toBe(1);
  });

  it('puntuación alta sin evidencia y NA controvertida generan alertas', () => {
    const [a, b] = [participant(), participant()];
    const s = states({ questions: [q10[0]], participants: [a, b], responses: [response(a, q10[0].id, 5), response(b, q10[0].id, null, 'NO_APLICA_PROPUESTO')] });
    const al = computeValidationAlerts(s, T, []);
    expect(al.some((x) => x.kind === 'alto_sin_evidencia')).toBe(true);
    expect(al.some((x) => x.kind === 'na_controvertida')).toBe(true);
  });
});

describe('Brechas, riesgos, priorización y recomendaciones', () => {
  it('40 · brecha = max(0, objetivo − actual); sin puntuación → evaluar la capacidad', () => {
    const p = participant();
    const qs = q10.slice(0, 3);
    const s = states({ questions: qs, participants: [p], responses: [response(p, qs[0].id, 1), response(p, qs[1].id, 5)] });
    const org = { profileId: 'privada_ordinaria' };
    expect(recommendationFor(s[0], org).status).toBe('brecha');
    expect(recommendationFor(s[1], org).status).toBe('superado');
    expect(recommendationFor(s[2], org).action).toBe('Evaluar la capacidad antes de definir acciones.');
    const dims = computeDimensions(s, ['D01'], { D01: 8 }, T, 3, {});
    expect(dims[0].gap).toBe(0); // promedio 3 → sin brecha negativa
  });

  it('41 · recomendaciones distinguen formular de implementar según el nivel', () => {
    const p = participant();
    const q = QUESTIONS.find((x) => x.id === 'D01-Q01')!;
    const s0 = states({ questions: [q], participants: [p], responses: [response(p, q.id, 0)] });
    const s2 = states({ questions: [q], participants: [p], responses: [response(p, q.id, 2)] });
    expect(recommendationFor(s0[0], { profileId: 'otro' }).verb).toBe('formular');
    expect(recommendationFor(s2[0], { profileId: 'otro' }).verb).toBe('implementar');
  });

  it('riesgo = probabilidad × impacto con clasificación configurable inicial', () => {
    expect(riskScore(4, 4)).toBe(16);
    expect(riskBand(16)?.key).toBe('alto');
    expect(riskBand(17)?.key).toBe('critico');
    expect(riskBand(4)?.key).toBe('bajo');
    expect(riskScore(null, 3)).toBeNull();
    expect(riskMatrix([])).toBeNull();
  });

  it('riesgos sugeridos a partir de brechas en disparadores', () => {
    const q = QUESTIONS.find((x) => x.id === 'D08-Q13')!;
    const p = participant();
    const s = states({ questions: [q], participants: [p], responses: [response(p, q.id, 1)] });
    expect(suggestRisks(s).map((r) => r.libraryId)).toContain('RK01');
  });

  it('la IA no se prioriza sobre controles esenciales sin justificación y se respetan dependencias', () => {
    const ids = ['D07-Q08', 'D14-Q06', 'D05-Q03'];
    const qs = QUESTIONS.filter((x) => ids.includes(x.id));
    const p = participant();
    const s = states({ questions: qs, participants: [p], responses: [response(p, 'D07-Q08', 2), response(p, 'D14-Q06', 0), response(p, 'D05-Q03', 2)] });
    const pr = computePriorities(s, []);
    const ai = pr.find((x) => x.questionId === 'D14-Q06')!;
    const ess = pr.find((x) => x.questionId === 'D07-Q08')!;
    expect(ai.score).toBeLessThan(ess.score);
    expect(ai.capped).toBe(true);
    // D14-Q06 depende de D05-Q03
    expect(pr.findIndex((x) => x.questionId === 'D05-Q03')).toBeLessThan(pr.findIndex((x) => x.questionId === 'D14-Q06'));
  });

  it('42 · propuesta de iniciativas con fases que respetan dependencias', () => {
    const ids = ['D05-Q01', 'D07-Q05', 'D09-Q01', 'D09-Q11'];
    const qs = QUESTIONS.filter((x) => ids.includes(x.id));
    const p = participant();
    const s = states({ questions: qs, participants: [p], responses: ids.map((id) => response(p, id, 1)) });
    const ini = proposeInitiatives(s, computePriorities(s, []));
    const phase = (t: string) => ini.find((i) => i.template.id === t)?.phase ?? 0;
    expect(phase('T09')).toBeGreaterThanOrEqual(phase('T08'));
    expect(phaseViolation(1, [2])).toBe(true);
    expect(phaseViolation(3, [2, 3])).toBe(false);
  });
});

describe('Aplicabilidad', () => {
  const q = QUESTIONS.find((x) => x.id === 'D05-Q03')!;
  it('no clasifica como sujeto obligado por el nombre o el sector', () => {
    const r = legalApplicability(q, { profileId: 'salud', legalFlags: EMPTY_LEGAL_FLAGS });
    expect(r.status).toBe('por_validar');
    const priv = legalApplicability(q, { profileId: 'privada_ordinaria', legalFlags: { ...EMPTY_LEGAL_FLAGS, publicFunctions: 'no', publicResources: 'no', publicServices: 'no' } });
    expect(priv.status).toBe('buena_practica');
    const pub = legalApplicability(q, { profileId: 'privada_ordinaria', legalFlags: { ...EMPTY_LEGAL_FLAGS, publicServices: 'si' } });
    expect(pub.status).toBe('obligatoria');
  });
  it('las sugerencias de no aplicabilidad no excluyen el criterio por sí solas', () => {
    const fis = QUESTIONS.find((x) => x.id === 'D06-Q03')!;
    expect(suggestNotApplicable(fis, { documentary: { hasPhysical: { value: 'no', quality: 'proporcionado' } }, legalFlags: EMPTY_LEGAL_FLAGS })).toMatch(/físicos/);
    const s = states({ questions: [fis] });
    expect(s[0].applicable).toBe(true);
  });
});

describe('Datos desconocidos en agregados', () => {
  it('53 · sin respuestas no hay ceros: los resultados son nulos', () => {
    const s = states({ questions: q10 });
    const dims = computeDimensions(s, ['D01'], { D01: 8 }, T, 3, {});
    expect(dims[0].preliminary).toBeNull();
    expect(computeEvidence(s).support).toBeNull();
    expect(mean([])).toBeNull();
  });
});
