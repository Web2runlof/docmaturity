import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import type { Risk } from '@/types/domain';
import { useAssessmentData } from '@/hooks/useAssessment';
import { Button, Callout, Dialog, Field, Input, LevelTag, PageHeader, Section, Select, TabPanel, Tabs, Tag, Textarea } from '@/components/ui';
import { EChart } from '@/components/charts/EChart';
import { impactEffortOption, riskMatrixOption } from '@/components/charts/options';
import { dimensionName } from '@/data/bank';
import { currentScore } from '@/engine/scoring';
import { RISK_STATUS_LABEL, riskBand, riskMatrix, riskScore } from '@/engine/risk';
import { QUADRANT_LABEL } from '@/engine/prioritization';
import { VERB_LABEL } from '@/engine/recommendations';
import { addSuggestedRisks, deleteRisk, savePriorityInput, saveRisk } from '@/services/repo';
import { attempt, attemptOk } from '@/app/store';
import { fmtNumber, nowISO, uuid } from '@/utils/core';
import { Loading, NotFound } from '../common';

export default function GapsRisksPage() {
  const { aid = '' } = useParams();
  const { bundle, analysis: a, loading, missing } = useAssessmentData(aid);
  const [tab, setTab] = useState('brechas');
  if (loading) return <Loading />;
  if (missing || !bundle || !a) return <NotFound />;
  const locked = bundle.assessment.status === 'finalizado';
  return (
    <>
      <PageHeader eyebrow="Análisis" title="Brechas, riesgos y prioridades" description="Las brechas se calculan como max(0, objetivo − actual). Los riesgos se sugieren a partir de brechas y los valora el evaluador; la priorización es determinista y explica cada resultado." />
      <Tabs value={tab} onValueChange={setTab} tabs={[{ value: 'brechas', label: 'Brechas y recomendaciones' }, { value: 'riesgos', label: `Riesgos (${bundle.risks.length})` }, { value: 'prioridades', label: 'Priorización' }]}>
        <TabPanel value="brechas"><Gaps a={a} aid={aid} /></TabPanel>
        <TabPanel value="riesgos"><Risks a={a} risks={bundle.risks} aid={aid} locked={locked} /></TabPanel>
        <TabPanel value="prioridades"><Priorities a={a} aid={aid} locked={locked} inputs={bundle.priorityInputs} /></TabPanel>
      </Tabs>
    </>
  );
}

type A = NonNullable<ReturnType<typeof useAssessmentData>['analysis']>;

function Gaps({ a, aid }: { a: A; aid: string }) {
  const [dim, setDim] = useState('');
  const [status, setStatus] = useState<'brecha' | 'evaluar' | 'superado' | ''>('brecha');
  const rows = a.recommendations.filter((r) => (!dim || r.dimensionId === dim) && (!status || r.status === status));
  return (
    <Section title="Brechas por criterio" description="Sin puntuación actual, la recomendación es evaluar la capacidad y no una brecha numérica. Si el objetivo es inferior al nivel actual, la condición se muestra como superada." actions={
      <>
        <Select aria-label="Dimensión" className="w-44" value={dim} onChange={(e) => setDim(e.target.value)}><option value="">Todas</option>{a.dimensionIds.map((d) => <option key={d} value={d}>{d}</option>)}</Select>
        <Select aria-label="Estado" className="w-44" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><option value="brecha">Con brecha</option><option value="evaluar">Por evaluar</option><option value="superado">Superado</option><option value="">Todos</option></Select>
      </>
    }>
      <div className="overflow-x-auto"><table className="table-pro">
        <thead><tr><th>Criterio</th><th>Actual</th><th>Objetivo</th><th>Brecha</th><th>Tipo de acción</th><th>Acción propuesta</th><th>Responsable</th><th>Evidencia de cumplimiento</th></tr></thead>
        <tbody>{rows.map((r) => {
          const s = a.states.find((x) => x.question.id === r.questionId)!;
          const cur = currentScore(s);
          return (
            <tr key={r.questionId}>
              <td><Link to={`/app/evaluaciones/${aid}/validacion?q=${r.questionId}`} className="font-medium text-navy hover:underline">{r.questionId}</Link><div className="text-xs text-muted">{r.criterion}</div>{s.question.isCritical && <Tag tone="danger">crítico</Tag>}</td>
              <td><LevelTag score={cur} size="sm" showName={false} /></td>
              <td className="num">{r.target}</td>
              <td className="num font-medium">{cur === null ? 'Evaluar' : fmtNumber(Math.max(0, r.target - cur))}</td>
              <td>{r.verb ? <Tag tone="teal">{VERB_LABEL[r.verb]}</Tag> : <Tag>Evaluar</Tag>}</td>
              <td className="max-w-sm text-sm">{r.action}<div className="mt-1 text-xs text-muted">Resultado esperado: {r.expectedResult}</div></td>
              <td className="text-xs text-muted">{r.responsible}</td>
              <td className="max-w-xs text-xs text-muted">{r.complianceEvidence}<div className="mt-1">Indicador: {r.indicator}</div></td>
            </tr>
          );
        })}</tbody>
      </table></div>
      <p className="mt-4 text-xs text-muted">Las recomendaciones distinguen formular, formalizar, implementar, controlar, evaluar y optimizar según el nivel actual. No recomiendan comprar software, digitalizar todo el archivo ni adoptar IA o blockchain sin un problema y un beneficio identificables.</p>
    </Section>
  );
}

function Risks({ a, risks, aid, locked }: { a: A; risks: Risk[]; aid: string; locked: boolean }) {
  const [edit, setEdit] = useState<Risk | null>(null);
  const matrix = riskMatrix(risks);
  const pendingSuggestions = a.suggestedRisks.filter((s) => !risks.some((r) => r.libraryId === s.libraryId));
  return (
    <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <Section title="Registro de riesgos" actions={<Button size="sm" disabled={locked} icon={<Plus className="size-3.5" />} onClick={() => setEdit({ id: uuid(), assessmentId: aid, libraryId: 'MANUAL', title: '', description: '', questionIds: [], status: 'valorado', probability: null, impact: null, residualProbability: null, residualImpact: null, owner: '', treatment: '', createdAt: nowISO(), updatedAt: nowISO() })}>Riesgo manual</Button>}>
        {pendingSuggestions.length > 0 && (
          <div className="mb-4"><Callout tone="info" title={`${pendingSuggestions.length} riesgos potenciales sugeridos por las brechas`}>
            <p>{pendingSuggestions.map((s) => s.title).join(' · ')}</p>
            <Button size="sm" className="mt-2" disabled={locked} onClick={() => attempt(() => addSuggestedRisks(aid, pendingSuggestions), 'Riesgos incorporados')}>Incorporar al registro</Button>
          </Callout></div>
        )}
        {risks.length ? (
          <div className="overflow-x-auto"><table className="table-pro">
            <thead><tr><th>Riesgo</th><th>Estado</th><th>P</th><th>I</th><th>Valor</th><th>Residual</th><th /></tr></thead>
            <tbody>{risks.map((r) => {
              const v = riskScore(r.probability, r.impact);
              const band = riskBand(v);
              return (
                <tr key={r.id}>
                  <td><span className="font-medium">{r.title}</span><div className="text-xs text-muted">{r.questionIds.join(', ')}</div></td>
                  <td><Tag tone={r.status === 'sugerido' ? 'neutral' : 'info'}>{RISK_STATUS_LABEL[r.status]}</Tag></td>
                  <td className="num">{r.probability ?? '—'}</td><td className="num">{r.impact ?? '—'}</td>
                  <td>{v === null ? <span className="text-xs text-muted">Sin valorar</span> : <Tag tone={band?.key === 'critico' || band?.key === 'alto' ? 'danger' : band?.key === 'moderado' ? 'warning' : 'teal'}>{v} · {band?.label}</Tag>}</td>
                  <td className="num">{riskScore(r.residualProbability, r.residualImpact) ?? '—'}</td>
                  <td><div className="flex justify-end gap-1"><Button size="sm" disabled={locked} onClick={() => setEdit(r)}>Valorar</Button><Button size="sm" variant="ghost" disabled={locked} icon={<Trash2 className="size-3.5" />} aria-label="Eliminar riesgo" onClick={() => attempt(() => deleteRisk(r.id))} /></div></td>
                </tr>
              );
            })}</tbody>
          </table></div>
        ) : <p className="text-sm text-muted">No hay riesgos registrados. Las probabilidades no se asignan como si hubieran sido observadas: la valoración corresponde al evaluador.</p>}
      </Section>
      <Section title="Matriz de riesgos" description="Clasificación inicial configurable: 1–4 bajo, 5–9 moderado, 10–16 alto, 17–25 crítico.">
        <EChart height={300} label="Matriz de riesgos valorados" option={matrix ? riskMatrixOption(matrix) : {}} empty={matrix ? undefined : 'La matriz se muestra cuando existan riesgos valorados.'} />
      </Section>
      {edit && <RiskDialog risk={edit} onClose={() => setEdit(null)} questionIds={a.states.map((s) => s.question.id)} />}
    </div>
  );
}

function RiskDialog({ risk, onClose, questionIds }: { risk: Risk; onClose: () => void; questionIds: string[] }) {
  const [r, setR] = useState(risk);
  const opt = (label: string, key: 'probability' | 'impact' | 'residualProbability' | 'residualImpact') => (
    <Field label={label} htmlFor={`rk-${key}`}><Select id={`rk-${key}`} value={r[key] ?? ''} onChange={(e) => setR({ ...r, [key]: e.target.value ? Number(e.target.value) : null })}><option value="">Sin valorar</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</Select></Field>
  );
  return (
    <Dialog wide open onOpenChange={(o) => !o && onClose()} title={r.title || 'Nuevo riesgo'} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" disabled={!r.title.trim()} onClick={async () => { const ok = await attemptOk(() => saveRisk(r), 'Riesgo guardado'); if (ok) onClose(); }}>Guardar</Button></>}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Riesgo" htmlFor="rk-t" required><Input id="rk-t" value={r.title} onChange={(e) => setR({ ...r, title: e.target.value })} /></Field>
        <Field label="Estado" htmlFor="rk-s"><Select id="rk-s" value={r.status} onChange={(e) => setR({ ...r, status: e.target.value as Risk['status'] })}>{(Object.keys(RISK_STATUS_LABEL) as Risk['status'][]).map((s) => <option key={s} value={s}>{RISK_STATUS_LABEL[s]}</option>)}</Select></Field>
        <div className="md:col-span-2"><Field label="Descripción" htmlFor="rk-d"><Textarea id="rk-d" value={r.description} onChange={(e) => setR({ ...r, description: e.target.value })} /></Field></div>
        {opt('Probabilidad (1–5)', 'probability')}{opt('Impacto (1–5)', 'impact')}{opt('Probabilidad residual', 'residualProbability')}{opt('Impacto residual', 'residualImpact')}
        <Field label="Responsable" htmlFor="rk-o"><Input id="rk-o" value={r.owner} onChange={(e) => setR({ ...r, owner: e.target.value })} /></Field>
        <Field label="Criterios relacionados" htmlFor="rk-q" hint="Separados por coma."><Input id="rk-q" value={r.questionIds.join(', ')} onChange={(e) => setR({ ...r, questionIds: e.target.value.split(',').map((x) => x.trim()).filter((x) => questionIds.includes(x)) })} /></Field>
        <div className="md:col-span-2"><Field label="Tratamiento" htmlFor="rk-tr"><Textarea id="rk-tr" value={r.treatment} onChange={(e) => setR({ ...r, treatment: e.target.value })} /></Field></div>
      </div>
    </Dialog>
  );
}

function Priorities({ a, aid, locked, inputs }: { a: A; aid: string; locked: boolean; inputs: { questionId: string; justification: string }[] }) {
  const items = a.priorities;
  const chart = useMemo(() => items.slice(0, 40).map((p) => ({ id: p.questionId, impact: p.impact.value, effort: p.effort.value, score: p.score, estimated: p.impact.source === 'estimado' || p.effort.source === 'estimado' })), [items]);
  const factor = (qid: string, key: 'impact' | 'urgency' | 'enabler' | 'effort', value: number, source: string) => (
    <Select aria-label={`${key} ${qid}`} disabled={locked} className={`w-16 px-1.5 py-1 text-xs ${source === 'estimado' ? 'text-muted italic' : ''}`} value={source === 'valorado' ? value : ''} onChange={(e) => attempt(() => savePriorityInput(aid, qid, { [key]: e.target.value === '' ? null : Number(e.target.value) }))}>
      <option value="">{value}*</option>{[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
    </Select>
  );
  return (
    <div className="space-y-6">
      <Section title="Matriz impacto–esfuerzo" description="Modifique los factores en la tabla y observe el efecto inmediato. El esfuerzo ubica la oportunidad en la matriz, pero nunca reduce la prioridad de riesgos críticos.">
        <EChart height={340} label="Matriz impacto esfuerzo" option={impactEffortOption(chart)} empty={chart.length ? undefined : 'No hay criterios con brecha y puntuación disponible.'} />
      </Section>
      <Section title="Prioridades" description="Prioridad = 0,30·Brecha + 0,25·Impacto + 0,20·Criticidad + 0,15·Urgencia + 0,10·Habilitador. Los valores con asterisco son estimaciones iniciales pendientes de valoración. El orden respeta las dependencias entre capacidades.">
        <div className="overflow-x-auto"><table className="table-pro">
          <thead><tr><th>#</th><th>Criterio</th><th>Brecha</th><th>Impacto</th><th>Criticidad</th><th>Urgencia</th><th>Habilitador</th><th>Esfuerzo</th><th>Prioridad</th><th>Cuadrante</th></tr></thead>
          <tbody>{items.map((p, i) => (
            <tr key={p.questionId}>
              <td className="num text-muted">{i + 1}</td>
              <td><span className="font-medium text-navy">{p.questionId}</span><div className="max-w-xs text-xs text-muted">{p.criterion} · {dimensionName(p.dimensionId)}</div>{p.capped && <div className="mt-1 max-w-xs text-xs text-lv2">Limitada por controles esenciales pendientes.{!inputs.find((x) => x.questionId === p.questionId)?.justification && ' Puede registrar una justificación para levantar el límite.'}</div>}</td>
              <td className="num">{fmtNumber(p.gap.value)}</td>
              <td>{factor(p.questionId, 'impact', p.impact.value, p.impact.source)}</td>
              <td className="num">{p.criticality.value}</td>
              <td>{factor(p.questionId, 'urgency', p.urgency.value, p.urgency.source)}</td>
              <td>{factor(p.questionId, 'enabler', p.enabler.value, p.enabler.source)}</td>
              <td>{factor(p.questionId, 'effort', p.effort.value, p.effort.source)}</td>
              <td className="font-display font-semibold text-navy num">{fmtNumber(p.score, 2)}</td>
              <td className="text-xs text-muted">{QUADRANT_LABEL[p.quadrant]}</td>
            </tr>
          ))}</tbody>
        </table></div>
        {items.some((p) => p.capped) && (
          <div className="mt-4"><JustifyCap aid={aid} locked={locked} ids={items.filter((p) => p.capped).map((p) => p.questionId)} /></div>
        )}
      </Section>
    </div>
  );
}

function JustifyCap({ aid, ids, locked }: { aid: string; ids: string[]; locked: boolean }) {
  const [qid, setQid] = useState(ids[0]);
  const [text, setText] = useState('');
  return (
    <Callout tone="warning" title="Justificar la priorización de tecnologías inteligentes">
      <div className="mt-2 grid gap-2 md:grid-cols-[180px_1fr_auto]">
        <Select aria-label="Criterio" value={qid} onChange={(e) => setQid(e.target.value)}>{ids.map((i) => <option key={i} value={i}>{i}</option>)}</Select>
        <Input aria-label="Justificación" placeholder="Problema y beneficio identificables que justifican priorizarlo" value={text} onChange={(e) => setText(e.target.value)} />
        <Button size="sm" disabled={locked || !text.trim()} onClick={() => attempt(() => savePriorityInput(aid, qid, { justification: text }), 'Justificación registrada')}>Registrar</Button>
      </div>
    </Callout>
  );
}
