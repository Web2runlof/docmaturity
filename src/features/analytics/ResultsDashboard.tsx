import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowUpRight, TriangleAlert } from 'lucide-react';
import { useAssessmentData } from '@/hooks/useAssessment';
import { db } from '@/database/db';
import { Button, Callout, EmptyState, LevelTag, PageHeader, Section, Select, Tag, Tip, buttonClass } from '@/components/ui';
import { EChart } from '@/components/charts/EChart';
import { LevelLegend } from '@/components/charts/LevelLegend';
import {
  currentVsTargetOption, distributionOption, familyBarsOption, ganttOption, gapMatrixOption, heatmapOption, historyOption, impactEffortOption, percentBarsOption,
  radarAxesWithData, radarOption, riskMatrixOption, scatterDiscrepancyOption, stackedMgdaOption,
} from '@/components/charts/options';
import { LEVEL_NAMES, dimensionName } from '@/data/bank';
import { COVERAGE_BAND_LABEL, currentScore, levelIndex, type View } from '@/engine/scoring';
import { EVIDENCE_LABEL, GAP_BUCKETS, GAP_EVALUATE, LENS_DIMENSIONS, LEVEL_COLORS, VALIDATED_EVIDENCE_LEVEL } from '@/engine/constants';
import { riskMatrix } from '@/engine/risk';
import { PHASES } from '@/engine/recommendations';
import { analyzeAssessment, compareAssessments, dimensionRangeLabel, type ViewSummary } from '@/engine/analyze';
import { loadBundle, roadmapAnchor } from '@/services/repo';
import { MGDA_FAMILIES, TARGET_TERM, VERIFICATION_LABEL } from '@/config/vocabulary';
import { cx, fmtPct, fmtScore, plural } from '@/utils/core';
import { Loading, NotFound, PROFILE_LABEL, SimulationBanner } from '../common';

type Mode = 'percibida' | 'validada' | 'comparacion';
type Scope = 'serie' | 'percibida' | 'comun';

const SERIES_NAME: Record<View, string> = { preliminary: 'Percibida (preliminar)', validated: 'Validada' };
const SERIES_COLOR: Record<View, string> = { preliminary: LEVEL_COLORS[3], validated: LEVEL_COLORS[5] };
const META = TARGET_TERM.capital;

/** Indica a qué serie corresponde un bloque cuando la vista activa no es la percibida. */
function ScopeTag({ scope, mode }: { scope: Scope; mode: Mode }) {
  if (mode === 'percibida' || scope === 'serie') return null;
  return scope === 'percibida'
    ? <Tip content="Este bloque se construye con las respuestas de los participantes; no depende de la validación."><span className="cursor-help"><Tag tone="neutral">Solo percibida</Tag></span></Tip>
    : <Tip content="Este bloque no depende de la serie: es el mismo en todas las vistas."><span className="cursor-help"><Tag tone="neutral">Común a las vistas</Tag></span></Tip>;
}

function ExploratoryTag({ v }: { v: ViewSummary }) {
  if (!v.exploratory) return null;
  return <Tip content="Cobertura insuficiente o exploratoria, o agregado calculado sobre menos dimensiones que el alcance. Interprételo con cautela."><span className="cursor-help"><Tag tone="warning">Exploratorio</Tag></span></Tip>;
}

type Kpi = { k: string; v: string; v2?: string; h: ReactNode; scope: Scope; tone?: string };

function KpiCell({ x, mode }: { x: Kpi; mode: Mode }) {
  return (
    <div className="bg-white px-4 py-3">
      <dt className="flex flex-wrap items-center gap-1.5 text-[0.68rem] font-medium uppercase tracking-wider text-muted">{x.k}<span className="normal-case tracking-normal"><ScopeTag scope={x.scope} mode={mode} /></span></dt>
      <dd className={cx('mt-1 font-display text-xl font-semibold text-navy num', x.tone)}>
        {x.v2 !== undefined && <span className="mr-1.5 align-middle font-sans text-[0.68rem] font-medium text-muted">Percibida</span>}{x.v}
      </dd>
      {x.v2 !== undefined && <dd className="font-display text-base font-semibold text-slate-500 num"><span className="mr-1.5 align-middle font-sans text-[0.68rem] font-medium text-muted">Validada</span>{x.v2}</dd>}
      <dd className="text-[0.7rem] leading-snug text-muted">{x.h}</dd>
    </div>
  );
}

function GlobalBlock({ s, title, allDims }: { s: ViewSummary; title: string; allDims: number }) {
  return (
    <div>
      <p className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.14em] text-gold">{title}<span className="normal-case tracking-normal"><ExploratoryTag v={s} /></span></p>
      <div className="mt-2 flex items-baseline gap-2"><span className="font-display text-5xl font-semibold num">{fmtScore(s.global.score)}</span><span className="text-slate-300">/ 5</span></div>
      <p className="mt-1 text-sm text-slate-200">{s.global.score === null ? 'Sin datos en esta serie' : `${LEVEL_NAMES[levelIndex(s.global.score)]} · ${fmtPct(s.global.percentOfMax)} del máximo teórico`}</p>
      <p className="mt-1 text-xs text-slate-300">Calculada sobre {s.includedLabel}{s.global.included.length < allDims ? ` (${s.global.included.length} de ${allDims} dimensiones)` : ''} · {plural(s.scored, 'criterio puntuado', 'criterios puntuados')}</p>
    </div>
  );
}

export default function ResultsDashboard() {
  const { aid = '' } = useParams();
  const navigate = useNavigate();
  const { bundle, analysis: a, loading, missing } = useAssessmentData(aid);
  const [mode, setMode] = useState<Mode>('percibida');
  const [heatKey, setHeatKey] = useState<'profile' | 'area'>('profile');
  const [radarKind, setRadarKind] = useState<'radar' | 'familias'>('radar');
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

  /** Serie principal: la validada en su pestaña; la percibida en «Percibida» y como base en «Comparación». */
  const view: View = mode === 'validada' ? 'validated' : 'preliminary';
  const derived = useMemo(() => {
    if (!a) return null;
    const dims = a.dimensions;
    const pick = (vw: View) => dims.map((d) => (vw === 'validated' ? d.validated : d.preliminary));
    const gapCells = (vw: View) => dims.map((d) => {
      const row = [...GAP_BUCKETS.map(() => 0), 0];
      a.states.filter((s) => s.dimensionId === d.dimensionId && s.applicable).forEach((s) => {
        const c = currentScore(s, vw);
        if (c === null) { row[GAP_BUCKETS.length] += 1; return; }
        const g = Math.max(0, s.target - c);
        const k = GAP_BUCKETS.findIndex((b) => b.test(g));
        row[k < 0 ? GAP_BUCKETS.length : k] += 1;
      });
      return row;
    });
    return {
      indicators: dims.map((d) => ({ name: d.dimensionId, full: dimensionName(d.dimensionId) })),
      prel: pick('preliminary'), val: pick('validated'), target: dims.map((d) => d.target),
      gapCols: [...GAP_BUCKETS.map((b) => b.label), GAP_EVALUATE.label],
      gapCells: { preliminary: gapCells('preliminary'), validated: gapCells('validated') },
    };
  }, [a]);

  if (loading) return <Loading />;
  if (missing || !bundle || !a || !derived) return <NotFound />;

  const v = a.views[view];
  const vp = a.views.preliminary;
  const vv = a.views.validated;
  const cmp = mode === 'comparacion';
  const curr = view === 'validated' ? derived.val : derived.prel;
  const dist = a.levelDistribution[view];
  const heat = heatKey === 'profile' ? a.heatmapByProfile : a.heatmapByArea;
  const heatCols = heatKey === 'profile' ? heat.cols.map((c) => PROFILE_LABEL[c as keyof typeof PROFILE_LABEL] ?? c) : heat.cols;
  const matrix = riskMatrix(bundle.risks);
  const valuedRisks = bundle.risks.filter((r) => r.probability && r.impact).length;
  const ieItems = a.priorities.slice(0, 40).map((p) => ({ id: p.questionId, impact: p.impact.value, effort: p.effort.value, score: p.score, estimated: p.impact.source === 'estimado' || p.effort.source === 'estimado' }));
  const discrepancyPts = a.states.filter((s) => s.stats && s.stats.n >= 2).map((s) => ({ id: s.question.id, median: s.stats!.median, range: s.stats!.range, n: s.stats!.n }));
  const initiatives = [...bundle.initiatives].sort((x, y) => x.phase - y.phase || x.startDate.localeCompare(y.startDate) || x.order - y.order);
  const noData = a.coverage.numeric === 0;
  const insufficient = a.lenses.insufficientEvidence;
  const allDims = a.dimensionIds.length;
  const narrowerValidated = vv.global.included.length < allDims;
  const universesDiffer = vp.global.included.join() !== vv.global.included.join() || vp.scored !== vv.scored;

  const radarSeries = cmp
    ? [{ name: SERIES_NAME.preliminary, values: derived.prel, color: SERIES_COLOR.preliminary, area: true }, { name: SERIES_NAME.validated, values: derived.val, color: SERIES_COLOR.validated }, { name: META, values: derived.target, color: '#C69B59', dashed: true }]
    : [{ name: SERIES_NAME[view], values: curr, color: SERIES_COLOR[view], area: true }, { name: META, values: derived.target, color: '#C69B59', dashed: true }];
  const radarShown = a.dimensions.filter((_, i) => radarSeries.filter((s) => !s.dashed).every((s) => s.values[i] !== null)).map((d) => d.dimensionId);
  const radarOmitted = a.dimensionIds.filter((d) => !radarShown.includes(d));
  const drillDim = drill ? a.dimensions.find((d) => d.dimensionId === drill) : null;

  // Indicadores: v = serie principal; v2 = serie validada en «Comparación».
  const twin = (fp: (x: ViewSummary) => string) => (cmp ? { v: fp(vp), v2: fp(vv) } : { v: fp(v) });
  const kpis: Kpi[] = [
    { k: `Brecha frente a la ${TARGET_TERM.one}`, ...twin((x) => fmtScore(x.gap)), h: `Promedio ponderado de máx(0, ${TARGET_TERM.one} − nivel) por criterio puntuado`, scope: 'serie' },
    { k: 'Cobertura del diagnóstico', ...twin((x) => fmtPct(x.coverage)), h: `${v.scored} de ${a.coverage.applicable} criterios aplicables${v.band ? ` · ${COVERAGE_BAND_LABEL[v.band].toLowerCase()}` : ''}`, scope: 'serie' },
    { k: 'Alcance sobre el banco', v: fmtPct(a.coverage.scopeCoverage), h: `${a.coverage.applicable} de ${a.coverage.bankTotal} criterios en el alcance`, scope: 'comun' },
    { k: 'Cobertura del banco', ...twin((x) => fmtPct(x.bankCoverage)), h: `${v.bankScored} de ${a.coverage.bankTotal} criterios con puntuación`, scope: 'serie' },
    { k: 'Soporte de evidencias', ...twin((x) => fmtPct(x.evidenceSupport)), h: 'Sobre los criterios puntuados de la serie', scope: 'serie' },
    { k: 'Cobertura de validación', v: fmtPct(a.coverage.validationCoverage), h: plural(a.coverage.validated, 'criterio validado', 'criterios validados'), scope: 'comun' },
    { k: 'Validados sin evidencia suficiente', v: String(insufficient.length), h: `Nivel validado ≥ ${VALIDATED_EVIDENCE_LEVEL} con evidencia E0 o E1`, scope: 'comun', tone: insufficient.length ? 'text-warning' : '' },
    { k: 'Criterios críticos en alerta', ...twin((x) => String(x.critical.length)), h: `${v.critical.filter((c) => c.kind === 'critico_no_evaluado').length} sin evaluar en la serie`, scope: 'serie', tone: v.critical.length ? 'text-danger' : '' },
    { k: 'Discrepancias por resolver', v: String(a.unresolvedDiscrepancies), h: `${a.discrepancies} detectadas`, scope: 'percibida', tone: a.unresolvedDiscrepancies ? 'text-warning' : '' },
    { k: 'Acuerdo entre entrevistados', v: fmtScore(a.agreement.agreement), h: `${fmtPct(a.agreement.contrastableRatio)} de criterios contrastables`, scope: 'percibida' },
    { k: 'Índice orientativo de solidez', v: a.solidity.index === null ? 'No calculable' : String(Math.round(a.solidity.index)), h: a.solidity.index === null ? `Falta ${a.solidity.missing.join(', ')}` : 'Escala 0–100; no es confianza estadística', scope: 'percibida' },
    { k: 'Entrevistas realizadas', v: String(a.interviews.finished), h: `${a.interviews.pending} pendientes`, scope: 'comun' },
  ];

  const lensHint = (l: ViewSummary['organizational']) => {
    const declared = dimensionRangeLabel([...l.dimensions]);
    const excl = l.excluded.length ? ` · sin datos o fuera del alcance: ${dimensionRangeLabel(l.excluded)}` : '';
    return `Promedio ponderado por dimensión de ${declared}${excl}`;
  };
  const lenses: Kpi[] = [
    { k: 'Madurez organizacional', ...twin((x) => fmtScore(x.organizational.score)), h: lensHint(v.organizational), scope: 'serie' },
    { k: 'Madurez tecnológica', ...twin((x) => fmtScore(x.technological.score)), h: lensHint(v.technological), scope: 'serie' },
    { k: 'Capacidades funcionales de sistemas', ...twin((x) => fmtScore(x.systemCapabilities.score)), h: `${v.systemCapabilities.scored} de ${v.systemCapabilities.total} criterios de captura, retención, integridad, metadatos y portabilidad`, scope: 'serie' },
    {
      k: 'Posibles brechas normativas', ...twin((x) => String(x.legalGaps.length)),
      h: `${v.legalGaps.length ? 'Criterios con posible obligación por debajo del mínimo recomendado' : 'Ningún criterio con posible obligación está por debajo del mínimo recomendado'}. En el alcance: ${plural(a.lenses.legalObligations, 'posible obligación', 'posibles obligaciones')} y ${a.lenses.legalToValidate} por validar con el área jurídica`,
      scope: 'serie',
    },
    { k: 'Percepción de los entrevistados', v: fmtScore(a.lenses.perceived), h: 'Madurez preliminar: medianas por criterio', scope: 'percibida' },
    { k: 'Capacidades sustentadas con evidencia', v: fmtScore(a.lenses.evidenced), h: `${plural(a.lenses.evidencedCount, 'criterio validado', 'criterios validados')} con evidencia E2 o E3${insufficient.length ? `; no incluye ${plural(insufficient.length, 'criterio', 'criterios')} sin evidencia suficiente` : ''}`, scope: 'comun' },
    { k: 'Riesgos organizacionales', v: String(a.lenses.risks), h: bundle.risks.length ? `${plural(bundle.risks.length, 'riesgo registrado', 'riesgos registrados')}, ${valuedRisks} con probabilidad e impacto` : 'Sugeridos por el motor; aún sin valorar', scope: 'comun' },
    { k: 'Oportunidades de transformación', v: String(bundle.initiatives.length || a.lenses.opportunities), h: bundle.initiatives.length ? 'Iniciativas de la hoja de ruta guardada' : 'Iniciativas propuestas a partir de las brechas', scope: 'comun' },
  ];
  const familyLabel = (key: string) => MGDA_FAMILIES.find((x) => x.key === key)?.title ?? key;

  return (
    <>
      <SimulationBanner kind={a.assessment.isDemo ? 'demo' : a.assessment.isAcademic ? 'academic' : null} />
      <PageHeader eyebrow={a.organization.name} title="Resultados" description="La serie percibida consolida las respuestas de los participantes por mediana; la validada, las decisiones del evaluador con justificación. No constituyen certificación ni puntaje oficial de ningún referente." actions={
        <div role="radiogroup" aria-label="Serie de resultados" className="inline-flex rounded-md border border-line bg-white p-0.5">
          {([['percibida', 'Percibida'], ['validada', 'Validada'], ['comparacion', 'Comparación']] as const).map(([k, l]) => (
            <button key={k} role="radio" aria-checked={mode === k} onClick={() => setMode(k)} className={cx('rounded px-3 py-1.5 text-sm transition-colors', mode === k ? 'bg-navy text-white' : 'text-muted hover:text-navy')}>{l}</button>
          ))}
        </div>
      } />

      {noData ? (
        <Section><EmptyState title="Todavía no hay respuestas" description="Los gráficos se construyen con datos reales del diagnóstico. Registre entrevistas dirigidas o importe entrevistas autoadministradas." actions={<Link to={`/app/evaluaciones/${aid}/entrevistas`} className={buttonClass('primary')}>Ir a entrevistas</Link>} /></Section>
      ) : (
        <div className="space-y-6">
          {mode === 'validada' && narrowerValidated && (
            <Callout tone="warning" title="Serie validada parcial">
              La madurez validada se calcula sobre {vv.includedLabel} ({vv.global.included.length} de {allDims} dimensiones, {plural(vv.scored, 'criterio validado', 'criterios validados')}). Las dimensiones sin criterios validados quedan fuera del agregado; por eso el resultado se marca como exploratorio y no es comparable directamente con la serie percibida.
            </Callout>
          )}
          {cmp && universesDiffer && (
            <Callout tone="warning" title="Las series se calculan sobre universos distintos">
              La serie percibida cubre {vp.includedLabel} ({plural(vp.scored, 'criterio', 'criterios')}); la validada, {vv.includedLabel} ({plural(vv.scored, 'criterio', 'criterios')}). La diferencia entre ambas refleja en parte ese cambio de universo y no debe leerse como variación de madurez. El radar solo muestra las dimensiones con datos en las dos series.
            </Callout>
          )}

          <section className="panel overflow-hidden" aria-label="Indicadores principales">
            <div className="grid lg:grid-cols-[320px_1fr]">
              <div className="space-y-5 border-b border-line bg-navy-dark p-6 text-white lg:border-b-0 lg:border-r">
                {cmp
                  ? (<><GlobalBlock s={vp} title="Madurez percibida" allDims={allDims} /><GlobalBlock s={vv} title="Madurez validada" allDims={allDims} /></>)
                  : <GlobalBlock s={v} title={view === 'validated' ? 'Madurez validada' : 'Madurez percibida (preliminar)'} allDims={allDims} />}
                <p className="text-xs text-slate-400">El porcentaje del máximo teórico no es un porcentaje de cumplimiento legal.</p>
              </div>
              <dl className="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-4">
                {kpis.map((x) => <KpiCell key={x.k} x={x} mode={mode} />)}
              </dl>
            </div>
          </section>

          <Section title="Lecturas diferenciadas" description={`El DIAM no fusiona estos conceptos en un único indicador. Las madureces organizacional y tecnológica son particiones de las quince dimensiones (${dimensionRangeLabel([...LENS_DIMENSIONS.organizational])} y ${dimensionRangeLabel([...LENS_DIMENSIONS.technological])}) y se calculan igual que la madurez global: promedio ponderado por dimensión.`}>
            <dl className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
              {lenses.map((x) => <KpiCell key={x.k} x={x} mode={mode} />)}
            </dl>
          </Section>

          <div className="grid gap-6 xl:grid-cols-2">
            <Section title={radarKind === 'radar' ? 'Radar de las dimensiones' : 'Madurez por familia'} description={radarKind === 'radar' ? 'Recorrido en el sentido de las agujas del reloj desde D01. Las dimensiones sin datos se omiten en lugar de representarse como cero.' : 'Promedio ponderado por dimensión dentro de cada familia (componente MGDA predominante de la dimensión).'}
              actions={<div role="radiogroup" aria-label="Tipo de gráfico" className="inline-flex rounded-md border border-line bg-white p-0.5">{([['radar', 'Radar'], ['familias', 'Por familia']] as const).map(([k, l]) => <button key={k} role="radio" aria-checked={radarKind === k} onClick={() => setRadarKind(k)} className={cx('rounded px-2.5 py-1 text-xs', radarKind === k ? 'bg-navy text-white' : 'text-muted hover:text-navy')}>{l}</button>)}</div>}>
              {radarKind === 'radar' ? (
                <EChart height={380} label="Radar de madurez por dimensión" option={radarOption(derived.indicators, radarSeries)}
                  empty={radarAxesWithData(radarSeries, derived.indicators.length) < 3 ? 'El radar requiere datos en al menos tres dimensiones. Consulte las barras por familia o las barras de madurez frente a la meta.' : undefined}
                  summary={radarOmitted.length ? `Dimensiones representadas: ${dimensionRangeLabel(radarShown)}. Omitidas por falta de datos${cmp ? ' en alguna serie' : ''}: ${dimensionRangeLabel(radarOmitted)}.` : 'Todas las dimensiones tienen datos en esta vista.'}
                  table={{ columns: ['Dimensión', 'Percibida', 'Validada', META], rows: a.dimensions.map((d) => [`${d.dimensionId} ${dimensionName(d.dimensionId)}`, d.preliminary, d.validated, d.target]) }} />
              ) : (
                <EChart height={380} label="Madurez por familia" option={familyBarsOption((cmp ? vp : v).families.map((f) => ({ title: familyLabel(f.key), score: f.score, target: f.target })), SERIES_NAME[cmp ? 'preliminary' : view], META)}
                  summary={cmp ? 'En «Comparación» las familias muestran la serie percibida.' : undefined}
                  table={{ columns: ['Familia', 'Dimensiones', 'Percibida', 'Validada', META], rows: vp.families.map((f, i) => [familyLabel(f.key), f.dimensions.join(', '), f.score, vv.families[i].score, f.target]) }} />
              )}
            </Section>
            <Section title={`Madurez actual frente a la ${TARGET_TERM.one}`} description={`La marca dorada indica la ${TARGET_TERM.one}. Seleccione una barra para ver los criterios de la dimensión.`}>
              <EChart height={cmp ? 580 : 380} label={`Barras de madurez frente a la ${TARGET_TERM.one}`}
                option={currentVsTargetOption(a.dimensions.map((d) => `${d.dimensionId} ${dimensionName(d.dimensionId)}`), cmp ? derived.prel : curr, derived.target, META, cmp ? { currentName: SERIES_NAME.preliminary, compare: { name: SERIES_NAME.validated, values: derived.val } } : { currentName: SERIES_NAME[view] })}
                onClick={(p) => { const d = a.dimensionIds[p.dataIndex ?? -1]; if (d) setDrill(d); }}
                table={{ columns: ['Dimensión', 'Actual', META, 'Brecha ponderada'], rows: a.dimensions.map((d, i) => [d.dimensionId, curr[i], d.target, (view === 'validated' ? d.gapValidated : d.gapPreliminary) ?? 'Evaluar']) }} />
            </Section>
          </div>

          {drillDim && (
            <Section title={`${drillDim.dimensionId} · ${dimensionName(drillDim.dimensionId)}`} description="Organización › evaluación › dimensión › criterio › respuesta › evidencia" actions={<Button size="sm" onClick={() => setDrill(null)}>Cerrar detalle</Button>}>
              <div className="overflow-x-auto"><table className="table-pro">
                <thead><tr><th>Criterio</th><th>Percibido</th><th>Validado</th><th>{META}</th><th>Respuestas</th><th>Evidencia</th><th /></tr></thead>
                <tbody>{a.states.filter((s) => s.dimensionId === drillDim.dimensionId).map((s) => (
                  <tr key={s.question.id}>
                    <td><span className="font-medium text-navy">{s.question.id}</span> {s.question.criterion}{' '}{s.question.isCritical && <Tag tone="danger">crítico</Tag>}{' '}{s.insufficientEvidence && <Tag tone="warning">Validado sin evidencia suficiente</Tag>}</td>
                    <td><LevelTag score={s.preliminary} size="sm" showName={false} /></td><td><LevelTag score={s.validated} size="sm" showName={false} /></td><td className="num">{s.target}</td><td className="num">{s.stats?.n ?? 0}</td>
                    <td className="whitespace-nowrap text-xs"><Tip content={EVIDENCE_LABEL[s.evidenceStatus]}><span className="cursor-help">{s.evidenceStatus}</span></Tip></td>
                    <td><Link to={`/app/evaluaciones/${aid}/validacion?q=${s.question.id}`} className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-teal hover:underline">Ver respuestas <ArrowUpRight className="size-3" /></Link></td>
                  </tr>
                ))}</tbody>
              </table></div>
            </Section>
          )}

          <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
            <Section title="Distribución de criterios por nivel" description="Los criterios sin datos se muestran aparte y no como nivel cero." actions={cmp ? <Tag>Serie percibida</Tag> : undefined}>
              <EChart height={280} label="Distribución de criterios por nivel" option={distributionOption(dist.counts, dist.noData)} table={{ columns: ['Nivel', 'Criterios'], rows: [...dist.counts.map((c, i) => [`${i} · ${LEVEL_NAMES[i]}`, c]), ['Sin datos', dist.noData]] }} />
            </Section>
            <Section title="Capacidades críticas" description="Alertas independientes del promedio global, calculadas sobre la serie seleccionada." actions={cmp ? <Tag>Serie percibida</Tag> : undefined}>
              {v.critical.length ? (
                <ul className="max-h-[300px] divide-y divide-line overflow-y-auto text-sm">
                  {v.critical.map((c) => {
                    const s = a.states.find((x) => x.question.id === c.questionId)!;
                    return <li key={c.questionId} className="flex items-start gap-3 py-2"><TriangleAlert className={cx('mt-0.5 size-4 shrink-0', c.kind === 'critico_bajo' ? 'text-danger' : 'text-nodata')} aria-hidden /><div className="min-w-0 flex-1"><Link to={`/app/evaluaciones/${aid}/validacion?q=${c.questionId}`} className="font-medium text-navy hover:underline">{c.questionId} · {s.question.criterion}</Link><p className="text-xs text-muted">{c.message}</p></div><LevelTag score={c.score} size="sm" showName={false} /></li>;
                  })}
                </ul>
              ) : <Callout tone="success">Ninguna capacidad crítica aplicable está en nivel 0 o 1 ni sin evaluar en esta serie.</Callout>}
            </Section>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Section title="Mapa de calor por dimensión" actions={<div className="flex items-center gap-2"><ScopeTag scope="percibida" mode={mode} /><Select aria-label="Agrupar mapa de calor" className="w-40" value={heatKey} onChange={(e) => setHeatKey(e.target.value as typeof heatKey)}><option value="profile">Por perfil</option><option value="area">Por área</option></Select></div>} description="Mediana de las respuestas por grupo. Las celdas sin respuestas muestran «—».">
              <EChart height={Math.max(320, a.dimensionIds.length * 26 + 70)} label="Mapa de calor de dimensiones y grupos" option={heatmapOption(a.dimensionIds, heatCols, heat.cells, { valueLabel: 'Mediana' })} empty={heat.cols.length ? undefined : 'Sin respuestas por grupo'} summary={<LevelLegend noData />} table={{ columns: ['Dimensión', ...heatCols], rows: heat.rows.map((r, i) => [r, ...heat.cells[i]]) }} />
            </Section>
            <Section title="Comparación entre entrevistados" description="Mediana de las respuestas de cada participante por dimensión." actions={<ScopeTag scope="percibida" mode={mode} />}>
              <EChart height={Math.max(260, a.participantComparison.length * 34 + 80)} label="Comparación entre entrevistados" option={heatmapOption(a.participantComparison.map((p) => `${p.participant.code}`), a.dimensionIds, a.participantComparison.map((p) => p.values), { valueLabel: 'Mediana' })} empty={a.participantComparison.length ? undefined : 'Sin participantes'} summary={<LevelLegend noData />} table={{ columns: ['Participante', ...a.dimensionIds], rows: a.participantComparison.map((p) => [p.participant.code, ...p.values]) }} />
            </Section>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Section title="Discrepancias" description={`Criterios con al menos dos respuestas. Los criterios con la misma mediana y el mismo rango se agrupan: el número indica cuántos son. La banda superior señala rangos de ${a.thresholds.discrepancyRange} o más puntos.`} actions={<ScopeTag scope="percibida" mode={mode} />}>
              <EChart height={340} label="Dispersión de discrepancias" option={scatterDiscrepancyOption(discrepancyPts, a.thresholds.discrepancyRange)} empty={discrepancyPts.length ? undefined : 'Se requieren al menos dos participantes por criterio'}
                onClick={(p) => { const ids = (p.data as { ids?: string[] })?.ids; if (ids?.length === 1) navigate(`/app/evaluaciones/${aid}/validacion?q=${ids[0]}`); }}
                summary={`${plural(discrepancyPts.length, 'criterio', 'criterios')} con dos o más respuestas; ${discrepancyPts.filter((p) => p.range >= a.thresholds.discrepancyRange).length} con discrepancia.`}
                table={{ columns: ['Criterio', 'Mediana', 'Rango', 'Respuestas'], rows: discrepancyPts.map((p) => [p.id, p.median, p.range, p.n]) }} />
            </Section>
            <Section title="Matriz de brechas" description={`Número de criterios por dimensión y tamaño de la brecha frente a la ${TARGET_TERM.one}. Cada columna conserva el color de su severidad.`} actions={cmp ? <Tag>Serie percibida</Tag> : undefined}>
              <EChart height={Math.max(320, a.dimensionIds.length * 26 + 60)} label="Matriz de brechas" option={gapMatrixOption(a.dimensionIds, derived.gapCells[view])} table={{ columns: ['Dimensión', ...derived.gapCols], rows: a.dimensionIds.map((d, i) => [d, ...derived.gapCells[view][i]]) }} />
            </Section>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Section title="Cobertura por dimensión" description="Cada barra toma el color de su banda; las líneas marcan los umbrales configurados." actions={cmp ? <Tag>Serie percibida</Tag> : undefined}>
              <EChart height={280} label="Cobertura por dimensión" option={percentBarsOption(a.dimensionIds, a.dimensions.map((d) => (view === 'validated' ? d.validatedCoverage : d.preliminaryCoverage)), { thresholds: { insufficient: a.thresholds.coverageInsufficient, exploratory: a.thresholds.coverageExploratory, partial: a.thresholds.coveragePartial } })}
                table={{ columns: ['Dimensión', 'Cobertura percibida', 'Cobertura validada'], rows: a.dimensions.map((d) => [d.dimensionId, fmtPct(d.preliminaryCoverage), fmtPct(d.validatedCoverage)]) }} />
            </Section>
            <Section title="Soporte de evidencias por dimensión" actions={<ScopeTag scope="comun" mode={mode} />}>
              <EChart height={280} label="Soporte de evidencias por dimensión" option={percentBarsOption(a.dimensionIds, a.dimensions.map((d) => d.evidenceSupport), { color: LEVEL_COLORS[4] })} summary="Indicador separado de la madurez: no la multiplica ni la reduce. E0 = 0, E1 = 0,25, E2 = 0,6, E3 = 1." table={{ columns: ['Dimensión', 'Soporte'], rows: a.dimensions.map((d) => [d.dimensionId, fmtPct(d.evidenceSupport)]) }} />
            </Section>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Section title="Matriz de riesgos" description="Solo riesgos valorados por el evaluador (probabilidad × impacto)." actions={<ScopeTag scope="comun" mode={mode} />}>
              <EChart height={320} label="Matriz de riesgos" option={matrix ? riskMatrixOption(matrix) : {}} empty={matrix ? undefined : <span>Aún no hay riesgos valorados. <Link className="text-teal underline" to={`/app/evaluaciones/${aid}/brechas`}>Valorar riesgos</Link></span>} table={matrix ? { columns: ['Probabilidad', 'Impacto 1', 'Impacto 2', 'Impacto 3', 'Impacto 4', 'Impacto 5'], rows: matrix.map((r, i) => [i + 1, ...r]) } : undefined} />
            </Section>
            <Section title="Matriz impacto–esfuerzo" description="Gris: estimación inicial del motor. Verde: valoración del evaluador. Los cortes en 2,5 separan los valores de 3 o más." actions={<ScopeTag scope="comun" mode={mode} />}>
              <EChart height={320} label="Matriz impacto esfuerzo" option={impactEffortOption(ieItems)} empty={ieItems.length ? undefined : 'Sin brechas priorizables'} table={{ columns: ['Criterio', 'Impacto', 'Esfuerzo', 'Prioridad', 'Fuente'], rows: ieItems.map((p) => [p.id, p.impact, p.effort, p.score, p.estimated ? 'Estimada' : 'Valorada']) }} />
            </Section>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <Section title="Hoja de ruta" actions={<div className="flex items-center gap-2"><ScopeTag scope="comun" mode={mode} /><Link to={`/app/evaluaciones/${aid}/hoja-de-ruta`} className={buttonClass('secondary', 'sm')}>Editar</Link></div>}>
              <EChart height={Math.max(260, initiatives.length * 30 + 70)} label="Hoja de ruta de iniciativas" option={ganttOption(initiatives.map((i) => ({ name: `${i.code} ${i.name}`, start: i.startDate, end: i.endDate, phase: i.phase })), [...PHASES], roadmapAnchor(a.assessment))} empty={initiatives.length ? undefined : <span>Hoja de ruta sin generar. <Link className="text-teal underline" to={`/app/evaluaciones/${aid}/hoja-de-ruta`}>Generar propuesta</Link></span>} table={{ columns: ['Iniciativa', 'Fase', 'Inicio', 'Fin'], rows: initiatives.map((i) => [`${i.code} ${i.name}`, i.phase, i.startDate, i.endDate]) }} />
            </Section>
            <Section title="Hallazgos por componente MGDA" description="Criterios con brecha, sin brecha y sin evaluar por componente; cada criterio conserva su propio componente." actions={cmp ? <Tag>Serie percibida</Tag> : undefined}>
              <EChart height={280} label="Distribución de hallazgos por componente MGDA" option={stackedMgdaOption(v.mgda.map((m) => m.key), v.mgda.map((m) => m.withGap), v.mgda.map((m) => m.noGap), v.mgda.map((m) => m.notEvaluated))} table={{ columns: ['Componente', 'Con brecha', 'Sin brecha', 'Sin evaluar', 'Total'], rows: v.mgda.map((m) => [m.key, m.withGap, m.noGap, m.notEvaluated, m.total]) }} />
            </Section>
          </div>

          <Section title="Evolución histórica" description="Compara evaluaciones de la misma organización solo sobre criterios comunes con escala compatible." actions={<ScopeTag scope="comun" mode={mode} />}>
            {history?.compatible ? (
              <>
                {history.limitations.length > 0 && <div className="mb-3"><Callout tone="warning">{history.limitations.join(' ')}</Callout></div>}
                <EChart height={280} label="Evolución histórica de madurez" option={historyOption(history.series.map((s) => `${s.name} (${s.date})`), [{ name: `Global (${history.commonCriteria} criterios comunes)`, values: history.series.map((s) => s.overall), color: LEVEL_COLORS[5] }])} table={{ columns: ['Evaluación', 'Fecha', 'Madurez sobre criterios comunes'], rows: history.series.map((s) => [s.name, s.date, s.overall]) }} />
              </>
            ) : <p className="text-sm text-muted">{history === null ? 'Se requiere más de una evaluación de la organización con criterios comunes.' : 'Calculando…'} No se fabrican referentes sectoriales ni percentiles nacionales.</p>}
          </Section>

          <Section title="Resultado de criterios DIAM asociados a cada referente" description="Cobertura y promedio de los criterios internos relacionados con cada referente, en la serie seleccionada. No es una certificación ISO, un puntaje oficial MGDA, un cumplimiento oficial MoReq ni un resultado oficial FURAG." actions={cmp ? <Tag>Serie percibida</Tag> : undefined}>
            <div className="overflow-x-auto"><table className="table-pro">
              <thead><tr><th>Referente</th><th>Criterios asociados</th><th>Cobertura</th><th>Resultado de criterios DIAM asociados</th><th>Verificación de la fuente</th></tr></thead>
              <tbody>{v.byReference.map((r) => (
                <tr key={r.source.id}><td><Tip content={r.source.relation}><span className="cursor-help font-medium text-navy">{r.source.shortLabel}</span></Tip><div className="text-xs text-muted">{r.source.id}</div></td><td className="num">{r.related}</td><td className="num">{fmtPct(r.coverage)}</td><td><LevelTag score={r.score} size="sm" /></td><td className="whitespace-nowrap text-xs text-muted">{VERIFICATION_LABEL[r.source.verificationStatus as keyof typeof VERIFICATION_LABEL] ?? r.source.verificationStatus}</td></tr>
              ))}</tbody>
            </table></div>
          </Section>
        </div>
      )}
    </>
  );
}
