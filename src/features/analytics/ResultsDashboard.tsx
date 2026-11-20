import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowUpRight, TriangleAlert } from 'lucide-react';
import { useAssessmentData } from '@/hooks/useAssessment';
import { db } from '@/database/db';
import { Button, Callout, EmptyState, LevelTag, PageHeader, Section, Select, Tag, Tip } from '@/components/ui';
import { EChart } from '@/components/charts/EChart';
import {
  currentVsTargetOption, distributionOption, ganttOption, heatmapOption, historyOption, impactEffortOption, percentBarsOption, radarAxesWithData, radarOption,
  riskMatrixOption, scatterDiscrepancyOption, stackedMgdaOption,
} from '@/components/charts/options';
import { LEVEL_NAMES, dimensionName } from '@/data/bank';
import { COVERAGE_BAND_LABEL, currentScore, levelIndex, type View } from '@/engine/scoring';
import { riskMatrix } from '@/engine/risk';
import { analyzeAssessment, compareAssessments } from '@/engine/analyze';
import { loadBundle } from '@/services/repo';
import { cx, fmtNumber, fmtPct } from '@/utils/core';
import { Loading, NotFound, PROFILE_LABEL, SimulationBanner } from '../common';

type Mode = 'percibida' | 'validada' | 'comparacion';

export default function ResultsDashboard() {
  const { aid = '' } = useParams();
  const { bundle, analysis: a, loading, missing } = useAssessmentData(aid);
  const [mode, setMode] = useState<Mode>('percibida');
  const [heatKey, setHeatKey] = useState<'profile' | 'area'>('profile');
  const [drill, setDrill] = useState<string | null>(null);
  const history = useLiveQuery(async () => {
    if (!bundle) return null;
    const others = await db.assessments.where('organizationId').equals(bundle.organization.id).toArray();
    if (others.length < 2) return null;
    const analyses = [];
    for (const o of others.sort((x, y) => (x.startDate || x.createdAt).localeCompare(y.startDate || y.createdAt))) {
      const b = await loadBundle(o.id);
      if (b) analyses.push(analyzeAssessment(b));
    }
    return compareAssessments(analyses);
  }, [bundle?.organization.id, bundle?.responses.length, bundle?.findings.length]);

  const view: View = mode === 'validada' ? 'validated' : 'preliminary';
  const derived = useMemo(() => {
    if (!a) return null;
    const dims = a.dimensions;
    const indicators = dims.map((d) => ({ name: d.dimensionId, full: dimensionName(d.dimensionId) }));
    const prel = dims.map((d) => d.preliminary);
    const val = dims.map((d) => d.validated);
    const curr = dims.map((d) => (view === 'validated' ? d.validated : d.preliminary));
    const target = dims.map((d) => d.target);
    const gapBuckets = ['Sin brecha', '0–1', '1–2', '2–3', '≥ 3', 'Evaluar'];
    const gapCells = dims.map((d) => {
      const row = [0, 0, 0, 0, 0, 0];
      a.states.filter((s) => s.dimensionId === d.dimensionId && s.applicable).forEach((s) => {
        const c = currentScore(s, view === 'validated' ? 'validated' : 'current');
        if (c === null) return void (row[5] += 1);
        const g = Math.max(0, s.target - c);
        row[g === 0 ? 0 : g <= 1 ? 1 : g <= 2 ? 2 : g < 3 ? 3 : 4] += 1;
      });
      return row;
    });
    return { indicators, prel, val, curr, target, gapBuckets, gapCells };
  }, [a, view]);

  if (loading) return <Loading />;
  if (missing || !bundle || !a || !derived) return <NotFound />;
  const g = view === 'validated' ? a.globalValidated : a.globalPreliminary;
  const avgTarget = a.dimensions.filter((d) => g.included.includes(d.dimensionId)).reduce((s, d, _, arr) => s + d.target / arr.length, 0);
  const gapGlobal = g.score === null ? null : Math.max(0, avgTarget - g.score);
  const dist = view === 'validated' ? a.levelDistribution.validated : a.levelDistribution.preliminary;
  const heat = heatKey === 'profile' ? a.heatmapByProfile : a.heatmapByArea;
  const heatCols = heatKey === 'profile' ? heat.cols.map((c) => PROFILE_LABEL[c as keyof typeof PROFILE_LABEL] ?? c) : heat.cols;
  const matrix = riskMatrix(bundle.risks);
  const ieItems = a.priorities.slice(0, 40).map((p) => ({ id: p.questionId, impact: p.impact.value, effort: p.effort.value, score: p.score, estimated: p.impact.source === 'estimado' || p.effort.source === 'estimado' }));
  const discrepancyPts = a.states.filter((s) => s.stats && s.stats.n >= 2).map((s) => ({ id: s.question.id, median: s.stats!.median, range: s.stats!.range, n: s.stats!.n }));
  const initiatives = [...bundle.initiatives].sort((x, y) => x.phase - y.phase || x.order - y.order);
  const mgdaKeys = Object.keys(a.mgda) as (keyof typeof a.mgda)[];
  const noData = a.coverage.numeric === 0;
  const radarSeries = mode === 'comparacion'
    ? [{ name: 'Percibida (preliminar)', values: derived.prel, color: '#0D9488', area: true }, { name: 'Validada', values: derived.val, color: '#142B3A' }, { name: 'Objetivo', values: derived.target, color: '#C69B59', dashed: true }]
    : [{ name: mode === 'validada' ? 'Validada' : 'Percibida (preliminar)', values: derived.curr, color: mode === 'validada' ? '#142B3A' : '#0D9488', area: true }, { name: 'Objetivo', values: derived.target, color: '#C69B59', dashed: true }];
  const missingDims = a.dimensions.filter((d) => (view === 'validated' ? d.validated : d.preliminary) === null).map((d) => d.dimensionId);
  const drillDim = drill ? a.dimensions.find((d) => d.dimensionId === drill) : null;

  return (
    <>
      <SimulationBanner kind={a.assessment.isDemo ? 'demo' : a.assessment.isAcademic ? 'academic' : null} />
      <PageHeader eyebrow={a.organization.name} title="Resultados del diagnóstico" description="Los resultados preliminares reflejan percepciones consolidadas por mediana; los validados, decisiones del evaluador con justificación. No constituyen certificación ni puntaje oficial de ningún referente." actions={
        <div role="radiogroup" aria-label="Vista de madurez" className="inline-flex rounded-md border border-line bg-white p-0.5">
          {([['percibida', 'Percibida'], ['validada', 'Validada'], ['comparacion', 'Comparación']] as const).map(([k, l]) => (
            <button key={k} role="radio" aria-checked={mode === k} onClick={() => setMode(k)} className={cx('rounded px-3 py-1.5 text-sm transition-colors', mode === k ? 'bg-navy text-white' : 'text-muted hover:text-navy')}>{l}</button>
          ))}
        </div>
      } />

      {noData ? (
        <Section><EmptyState title="Todavía no hay respuestas" description="Los gráficos se construyen con datos reales del diagnóstico. Registre entrevistas dirigidas o importe entrevistas autoadministradas." actions={<Link to={`/app/evaluaciones/${aid}/entrevistas`}><Button variant="primary">Ir a entrevistas</Button></Link>} /></Section>
      ) : (
        <div className="space-y-6">
          <section className="panel overflow-hidden" aria-label="Indicadores principales">
            <div className="grid lg:grid-cols-[320px_1fr]">
              <div className="border-b border-line bg-navy-dark p-6 text-white lg:border-b-0 lg:border-r">
                <p className="text-xs uppercase tracking-[0.14em] text-gold">{g.labelText}</p>
                <div className="mt-3 flex items-baseline gap-2"><span className="font-display text-5xl font-semibold num">{g.score === null ? '—' : g.score.toLocaleString('es-CO', { maximumFractionDigits: 2 })}</span><span className="text-slate-300">/ 5</span></div>
                <p className="mt-1 text-sm text-slate-200">{g.score === null ? 'Sin datos validados' : `${LEVEL_NAMES[levelIndex(g.score)]} · ${fmtPct(g.percentOfMax)} del máximo teórico`}</p>
                <p className="mt-3 text-xs text-slate-400">El porcentaje del máximo teórico no es un porcentaje de cumplimiento legal.{g.excluded.length ? ` Dimensiones excluidas: ${g.excluded.map((e) => e.dimensionId).join(', ')}.` : ''}</p>
                {mode === 'comparacion' && <p className="mt-3 text-sm text-slate-200">Validada: <strong className="num">{fmtNumber(a.globalValidated.score, 2)}</strong></p>}
              </div>
              <dl className="grid grid-cols-2 divide-line sm:grid-cols-3 xl:grid-cols-5 [&>div]:border-b [&>div]:border-line [&>div]:px-5 [&>div]:py-4">
                {[
                  { k: 'Brecha frente a objetivo', v: fmtNumber(gapGlobal, 2), h: `Objetivo promedio ${fmtNumber(avgTarget, 1)}` },
                  { k: 'Cobertura del diagnóstico', v: fmtPct(a.coverage.coverage), h: a.coverage.band ? COVERAGE_BAND_LABEL[a.coverage.band] : '' },
                  { k: 'Cobertura del banco completo', v: fmtPct(a.coverage.scopeCoverage), h: `${a.coverage.applicable} de 225 criterios` },
                  { k: 'Soporte de evidencias', v: fmtPct(a.evidence.support), h: `Verificación E3: ${fmtPct(a.evidence.verificationCoverage)}` },
                  { k: 'Cobertura de validación', v: fmtPct(a.coverage.validationCoverage), h: `${a.coverage.validated} criterios validados` },
                  { k: 'Entrevistas realizadas', v: String(a.interviews.finished), h: `${a.interviews.pending} pendientes` },
                  { k: 'Criterios críticos en alerta', v: String(a.critical.length), h: `${a.critical.filter((c) => c.kind === 'critico_no_evaluado').length} sin evaluar`, tone: a.critical.length ? 'text-lv0' : '' },
                  { k: 'Discrepancias por resolver', v: String(a.unresolvedDiscrepancies), h: `${a.discrepancies} detectadas`, tone: a.unresolvedDiscrepancies ? 'text-lv2' : '' },
                  { k: 'Acuerdo entre entrevistados', v: fmtNumber(a.agreement.agreement, 2), h: `${fmtPct(a.agreement.contrastableRatio)} de criterios contrastables` },
                  { k: 'Índice orientativo de solidez', v: a.solidity.index === null ? 'No calculable' : fmtNumber(a.solidity.index, 0), h: a.solidity.index === null ? `Falta ${a.solidity.missing.join(', ')}` : 'No es confianza estadística' },
                ].map((x) => (
                  <div key={x.k}><dt className="text-[0.68rem] font-medium uppercase tracking-wider text-muted">{x.k}</dt><dd className={cx('mt-1 font-display text-xl font-semibold text-navy num', x.tone)}>{x.v}</dd><dd className="text-[0.7rem] text-muted">{x.h}</dd></div>
                ))}
              </dl>
            </div>
          </section>

          <Section title="Lecturas diferenciadas" description="El DIAM no fusiona estos conceptos en un único indicador. Cada lectura se calcula sobre un subconjunto distinto de criterios o fuentes.">
            <div className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
              {[
                { k: 'Madurez organizacional', v: fmtNumber(a.lenses.organizational, 2), h: 'D01–D06, D12, D15' },
                { k: 'Madurez tecnológica', v: fmtNumber(a.lenses.technological, 2), h: 'D07–D09, D11, D14' },
                { k: 'Capacidades funcionales de sistemas', v: fmtNumber(a.lenses.systemCapabilities, 2), h: 'Criterios de captura, retención, integridad, metadatos y portabilidad' },
                { k: 'Posibles brechas normativas', v: String(a.lenses.possibleLegalGaps.length), h: `Requieren validación · ${a.lenses.legalObligations} posibles obligaciones, ${a.lenses.legalToValidate} por validar` },
                { k: 'Percepción de los entrevistados', v: fmtNumber(a.lenses.perceived, 2), h: 'Medianas preliminares' },
                { k: 'Capacidades sustentadas con evidencia', v: fmtNumber(a.lenses.evidenced, 2), h: `${a.lenses.evidencedCount} criterios validados con evidencia E3` },
                { k: 'Riesgos organizacionales', v: String(a.lenses.risks), h: bundle.risks.length ? 'Registrados en la evaluación' : 'Sugeridos por el motor (sin valorar)' },
                { k: 'Oportunidades de transformación', v: String(a.lenses.opportunities), h: 'Iniciativas propuestas a partir de brechas' },
              ].map((x) => <div key={x.k} className="bg-white px-4 py-3"><div className="text-xs text-muted">{x.k}</div><div className="mt-1 font-display text-xl font-semibold text-navy num">{x.v}</div><div className="text-[0.7rem] text-muted">{x.h}</div></div>)}
            </div>
          </Section>

          <div className="grid gap-6 xl:grid-cols-2">
            <Section title="Radar de las dimensiones" description="Las dimensiones sin datos se omiten del radar en lugar de representarse como cero. Una serie incompleta se muestra solo con puntos.">
              <EChart height={380} label="Radar de madurez por dimensión" option={radarOption(derived.indicators, radarSeries)}
                empty={radarAxesWithData(radarSeries, derived.indicators.length) < 3 ? 'El radar requiere datos en al menos tres dimensiones. Consulte las barras de madurez actual frente al objetivo.' : undefined}
                summary={missingDims.length ? `Sin datos (omitidas del radar): ${missingDims.join(', ')}.` : 'Todas las dimensiones tienen datos en esta vista.'}
                table={{ columns: ['Dimensión', 'Preliminar', 'Validada', 'Objetivo'], rows: a.dimensions.map((d) => [`${d.dimensionId} ${dimensionName(d.dimensionId)}`, d.preliminary, d.validated, d.target]) }} />
            </Section>
            <Section title="Madurez actual frente a objetivo" description="La marca dorada indica el objetivo. Seleccione una barra para ver los criterios de la dimensión.">
              <EChart height={380} label="Barras de madurez actual frente al objetivo" option={currentVsTargetOption(a.dimensions.map((d) => `${d.dimensionId} ${dimensionName(d.dimensionId)}`), derived.curr, derived.target)} onClick={(p) => { const d = a.dimensionIds[p.dataIndex ?? -1]; if (d) setDrill(d); }}
                table={{ columns: ['Dimensión', 'Actual', 'Objetivo', 'Brecha'], rows: a.dimensions.map((d, i) => [d.dimensionId, derived.curr[i], d.target, derived.curr[i] === null ? 'Evaluar' : Math.max(0, d.target - (derived.curr[i] as number))]) }} />
            </Section>
          </div>

          {drillDim && (
            <Section title={`${drillDim.dimensionId} · ${dimensionName(drillDim.dimensionId)}`} description="Organización › evaluación › dimensión › criterio › respuesta › evidencia" actions={<Button size="sm" onClick={() => setDrill(null)}>Cerrar detalle</Button>}>
              <div className="overflow-x-auto"><table className="table-pro">
                <thead><tr><th>Criterio</th><th>Preliminar</th><th>Validado</th><th>Objetivo</th><th>Respuestas</th><th>Evidencia</th><th /></tr></thead>
                <tbody>{a.states.filter((s) => s.dimensionId === drillDim.dimensionId).map((s) => (
                  <tr key={s.question.id}><td><span className="font-medium text-navy">{s.question.id}</span> {s.question.criterion}{s.question.isCritical && <Tag tone="danger">crítico</Tag>}</td><td><LevelTag score={s.preliminary} size="sm" showName={false} /></td><td><LevelTag score={s.validated} size="sm" showName={false} /></td><td className="num">{s.target}</td><td className="num">{s.stats?.n ?? 0}</td><td>{s.evidenceStatus}</td><td><Link to={`/app/evaluaciones/${aid}/validacion?q=${s.question.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-teal hover:underline">Ver respuestas <ArrowUpRight className="size-3" /></Link></td></tr>
                ))}</tbody>
              </table></div>
            </Section>
          )}

          <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
            <Section title="Distribución de criterios por nivel" description="Los criterios sin datos se muestran aparte y no como nivel cero.">
              <EChart height={280} label="Distribución de criterios por nivel" option={distributionOption(dist.counts, dist.noData)} table={{ columns: ['Nivel', 'Criterios'], rows: [...dist.counts.map((c, i) => [`${i} · ${LEVEL_NAMES[i]}`, c]), ['Sin datos', dist.noData]] }} />
            </Section>
            <Section title="Capacidades críticas" description="Alertas independientes del promedio global.">
              {a.critical.length ? (
                <ul className="max-h-[300px] divide-y divide-line overflow-y-auto text-sm">
                  {a.critical.map((c) => {
                    const s = a.states.find((x) => x.question.id === c.questionId)!;
                    return <li key={c.questionId} className="flex items-start gap-3 py-2"><TriangleAlert className={cx('mt-0.5 size-4 shrink-0', c.kind === 'critico_bajo' ? 'text-lv0' : 'text-nodata')} aria-hidden /><div className="min-w-0 flex-1"><Link to={`/app/evaluaciones/${aid}/validacion?q=${c.questionId}`} className="font-medium text-navy hover:underline">{c.questionId} · {s.question.criterion}</Link><p className="text-xs text-muted">{c.message}</p></div><LevelTag score={c.score} size="sm" showName={false} /></li>;
                  })}
                </ul>
              ) : <Callout tone="success">Ninguna capacidad crítica aplicable está en nivel 0 o 1 ni sin evaluar.</Callout>}
            </Section>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Section title="Mapa de calor por dimensión" actions={<Select aria-label="Agrupar mapa de calor" className="w-44" value={heatKey} onChange={(e) => setHeatKey(e.target.value as typeof heatKey)}><option value="profile">Por perfil</option><option value="area">Por área</option></Select>} description="Mediana de las respuestas por grupo. Las celdas sin respuestas muestran «—».">
              <EChart height={Math.max(320, a.dimensionIds.length * 26 + 80)} label="Mapa de calor de dimensiones y áreas" option={heatmapOption(a.dimensionIds, heatCols, heat.cells, { valueLabel: 'Mediana' })} empty={heat.cols.length ? undefined : 'Sin respuestas por grupo'} table={{ columns: ['Dimensión', ...heatCols], rows: heat.rows.map((r, i) => [r, ...heat.cells[i]]) }} />
            </Section>
            <Section title="Comparación entre entrevistados" description="Mediana de las respuestas de cada participante por dimensión.">
              <EChart height={Math.max(320, a.participantComparison.length * 30 + 100)} label="Comparación entre entrevistados" option={heatmapOption(a.participantComparison.map((p) => `${p.participant.code}`), a.dimensionIds, a.participantComparison.map((p) => p.values), { valueLabel: 'Mediana' })} empty={a.participantComparison.length ? undefined : 'Sin participantes'} table={{ columns: ['Participante', ...a.dimensionIds], rows: a.participantComparison.map((p) => [p.participant.code, ...p.values]) }} />
            </Section>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Section title="Discrepancias" description="Cada punto es un criterio con al menos dos respuestas. La banda superior señala rangos de 2 o más puntos.">
              <EChart height={320} label="Dispersión de discrepancias" option={scatterDiscrepancyOption(discrepancyPts)} empty={discrepancyPts.length ? undefined : 'Se requieren al menos dos participantes por criterio'} onClick={(p) => { const id = (p.data as unknown[])?.[3]; if (typeof id === 'string') window.location.hash = `#/app/evaluaciones/${aid}/validacion?q=${id}`; }} table={{ columns: ['Criterio', 'Mediana', 'Rango', 'n'], rows: discrepancyPts.map((p) => [p.id, p.median, p.range, p.n]) }} />
            </Section>
            <Section title="Matriz de brechas" description="Número de criterios por dimensión y tamaño de brecha frente al objetivo.">
              <EChart height={Math.max(320, a.dimensionIds.length * 26 + 80)} label="Matriz de brechas" option={heatmapOption(a.dimensionIds, derived.gapBuckets, derived.gapCells, { min: 0, max: Math.max(1, ...derived.gapCells.flat()), colors: ['#F8FAFC', '#FDE2E2', '#B91C1C'], valueLabel: 'Criterios' })} table={{ columns: ['Dimensión', ...derived.gapBuckets], rows: a.dimensionIds.map((d, i) => [d, ...derived.gapCells[i]]) }} />
            </Section>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Section title="Cobertura por dimensión"><EChart height={260} label="Cobertura por dimensión" option={percentBarsOption(a.dimensionIds, a.dimensions.map((d) => (view === 'validated' ? d.validatedCoverage : d.preliminaryCoverage)), '#142B3A', a.thresholds.coverageInsufficient)} table={{ columns: ['Dimensión', 'Cobertura %', 'Validada %'], rows: a.dimensions.map((d) => [d.dimensionId, d.preliminaryCoverage, d.validatedCoverage]) }} /></Section>
            <Section title="Soporte de evidencias por dimensión"><EChart height={260} label="Soporte de evidencias por dimensión" option={percentBarsOption(a.dimensionIds, a.dimensions.map((d) => d.evidenceSupport), '#0D9488')} summary="Indicador separado de la madurez: no la multiplica ni la reduce." table={{ columns: ['Dimensión', 'Soporte %'], rows: a.dimensions.map((d) => [d.dimensionId, d.evidenceSupport]) }} /></Section>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Section title="Matriz de riesgos" description="Solo riesgos valorados por el evaluador (probabilidad × impacto).">
              <EChart height={300} label="Matriz de riesgos" option={matrix ? riskMatrixOption(matrix) : {}} empty={matrix ? undefined : <span>Aún no hay riesgos valorados. <Link className="text-teal underline" to={`/app/evaluaciones/${aid}/brechas`}>Valorar riesgos</Link></span>} table={matrix ? { columns: ['Probabilidad', 'I1', 'I2', 'I3', 'I4', 'I5'], rows: matrix.map((r, i) => [i + 1, ...r]) } : undefined} />
            </Section>
            <Section title="Matriz impacto–esfuerzo" description="Los puntos grises usan estimaciones iniciales; los verdes, valoraciones del evaluador.">
              <EChart height={300} label="Matriz impacto esfuerzo" option={impactEffortOption(ieItems)} empty={ieItems.length ? undefined : 'Sin brechas priorizables'} table={{ columns: ['Criterio', 'Impacto', 'Esfuerzo', 'Prioridad'], rows: ieItems.map((p) => [p.id, p.impact, p.effort, p.score]) }} />
            </Section>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <Section title="Hoja de ruta" actions={<Link to={`/app/evaluaciones/${aid}/hoja-de-ruta`}><Button size="sm">Editar</Button></Link>}>
              <EChart height={Math.max(240, initiatives.length * 26 + 60)} label="Hoja de ruta de iniciativas" option={ganttOption(initiatives.map((i) => ({ name: `${i.code} ${i.name}`, start: i.startDate, end: i.endDate, phase: i.phase })))} empty={initiatives.length ? undefined : <span>Hoja de ruta sin generar. <Link className="text-teal underline" to={`/app/evaluaciones/${aid}/hoja-de-ruta`}>Generar propuesta</Link></span>} table={{ columns: ['Iniciativa', 'Fase', 'Inicio', 'Fin'], rows: initiatives.map((i) => [i.name, i.phase, i.startDate, i.endDate]) }} />
            </Section>
            <Section title="Hallazgos por componente MGDA" description="Criterios con brecha, sin brecha y sin evaluar por componente.">
              <EChart height={260} label="Distribución de hallazgos por componente MGDA" option={stackedMgdaOption(mgdaKeys, mgdaKeys.map((k) => a.mgda[k].withGap), mgdaKeys.map((k) => a.mgda[k].evaluated - a.mgda[k].withGap), mgdaKeys.map((k) => a.mgda[k].total - a.mgda[k].evaluated))} table={{ columns: ['Componente', 'Con brecha', 'Evaluados', 'Total'], rows: mgdaKeys.map((k) => [k, a.mgda[k].withGap, a.mgda[k].evaluated, a.mgda[k].total]) }} />
            </Section>
          </div>

          <Section title="Evolución histórica" description="Compara evaluaciones de la misma organización solo sobre criterios comunes con escala compatible.">
            {history?.compatible ? (
              <>
                {history.limitations.length > 0 && <div className="mb-3"><Callout tone="warning">{history.limitations.join(' ')}</Callout></div>}
                <EChart height={280} label="Evolución histórica de madurez" option={historyOption(history.series.map((s) => `${s.name} (${s.date})`), [{ name: `Global (${history.commonCriteria} criterios comunes)`, values: history.series.map((s) => s.overall), color: '#142B3A' }])} table={{ columns: ['Evaluación', 'Fecha', 'Madurez sobre criterios comunes'], rows: history.series.map((s) => [s.name, s.date, s.overall]) }} />
              </>
            ) : <p className="text-sm text-muted">{history === null ? 'Se requiere más de una evaluación de la organización con criterios comunes.' : 'Calculando…'} No se fabrican benchmarks sectoriales ni percentiles nacionales.</p>}
          </Section>

          <Section title="Resultado de criterios DIAM asociados a cada referente" description="Cobertura y promedio de los criterios internos relacionados con cada referente. No es una certificación ISO, un puntaje oficial MGDA, un cumplimiento oficial MoReq ni un resultado oficial FURAG.">
            <div className="overflow-x-auto"><table className="table-pro">
              <thead><tr><th>Referente</th><th>Criterios asociados</th><th>Cobertura</th><th>Resultado de criterios DIAM asociados</th><th>Verificación de la fuente</th></tr></thead>
              <tbody>{a.byReference.map((r) => (
                <tr key={r.source.id}><td><Tip content={r.source.relation}><span className="cursor-help font-medium text-navy">{r.source.shortLabel}</span></Tip><div className="text-xs text-muted">{r.source.id}</div></td><td className="num">{r.related}</td><td className="num">{fmtPct(r.coverage)}</td><td><LevelTag score={r.score} size="sm" /></td><td className="text-xs text-muted">{r.source.verificationStatus.replace('_', ' ')}</td></tr>
              ))}</tbody>
            </table></div>
          </Section>
        </div>
      )}
    </>
  );
}
