import { TIER_LABEL } from '@/config/vocabulary';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import type { DimensionId } from '@/types/bank';
import type { Assessment, CustomQuestion, LegalStatus } from '@/types/domain';
import { useAssessmentData } from '@/hooks/useAssessment';
import { Button, Callout, Dialog, Field, Input, PageHeader, Section, Select, TabPanel, Tabs, Tag, Textarea } from '@/components/ui';
import { DIMENSIONS, QUESTIONS, dimensionName } from '@/data/bank';
import { diamWeights, updateAssessment } from '@/services/repo';
import { LEGAL_STATUS_LABEL, legalApplicability, suggestNotApplicable } from '@/engine/applicability';
import { attempt } from '@/app/store';
import { plainText } from '@/utils/core';
import { Loading, NotFound } from '../common';

export default function ScopePage() {
  const { aid = '' } = useParams();
  const { bundle, loading, missing } = useAssessmentData(aid);
  const [tab, setTab] = useState('alcance');
  if (loading) return <Loading />;
  if (missing || !bundle) return <NotFound />;
  const a = bundle.assessment;
  const locked = a.status === 'finalizado';
  const save = (patch: Partial<Assessment>, msg = 'Cambios guardados') => attempt(() => updateAssessment(aid, patch, 'configurar alcance'), msg);
  return (
    <>
      <PageHeader eyebrow="Configuración de la evaluación" title="Alcance, metas y ponderaciones" description="Las ponderaciones utilizadas quedan registradas en la evaluación para garantizar la reproducibilidad de los resultados." />
      {locked && <div className="mb-6"><Callout tone="warning">La evaluación está finalizada. Reábrala desde el resumen para modificar su configuración.</Callout></div>}
      <Tabs value={tab} onValueChange={setTab} tabs={[
        { value: 'alcance', label: 'Criterios del alcance' }, { value: 'propias', label: 'Preguntas propias' }, { value: 'pesos', label: 'Ponderaciones' },
        { value: 'metas', label: 'Metas de madurez' }, { value: 'juridica', label: 'Aplicabilidad jurídica' }, { value: 'umbrales', label: 'Umbrales' },
      ]}>
        <TabPanel value="alcance"><ScopeCriteria a={a} locked={locked} save={save} org={bundle.organization} /></TabPanel>
        <TabPanel value="propias"><CustomQuestions a={a} locked={locked} save={save} /></TabPanel>
        <TabPanel value="pesos"><Weights a={a} locked={locked} save={save} /></TabPanel>
        <TabPanel value="metas"><Targets a={a} locked={locked} save={save} /></TabPanel>
        <TabPanel value="juridica"><Legal a={a} locked={locked} save={save} org={bundle.organization} /></TabPanel>
        <TabPanel value="umbrales"><ThresholdsTab a={a} locked={locked} save={save} /></TabPanel>
      </Tabs>
    </>
  );
}

type Props = { a: Assessment; locked: boolean; save: (p: Partial<Assessment>, msg?: string) => Promise<unknown> };

function ScopeCriteria({ a, locked, save, org }: Props & { org: Parameters<typeof suggestNotApplicable>[1] }) {
  const [dim, setDim] = useState<string>('D01');
  const [exclude, setExclude] = useState<{ id: string; reason: string } | null>(null);
  const inScope = new Set(a.questionIds);
  const questions = QUESTIONS.filter((q) => q.dimensionId === dim);
  const toggle = (id: string, on: boolean, reason = '') => {
    const ids = on ? [...a.questionIds, id] : a.questionIds.filter((x) => x !== id);
    const excluded = { ...a.excludedQuestions };
    if (on) delete excluded[id]; else excluded[id] = reason;
    const selected = new Set(a.selectedDimensions);
    if (on) selected.add(id.slice(0, 3) as DimensionId);
    return save({ questionIds: QUESTIONS.map((q) => q.id).filter((x) => ids.includes(x)).concat(ids.filter((x) => x.startsWith('CUS-'))), excludedQuestions: excluded, selectedDimensions: [...selected].sort() as DimensionId[], modality: a.modality === 'custom' ? 'custom' : 'custom' }, on ? 'Criterio incluido' : 'Criterio excluido');
  };
  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <nav aria-label="Dimensiones" className="panel h-fit p-2">
        {DIMENSIONS.map((d) => {
          const n = a.questionIds.filter((x) => x.startsWith(d.id)).length;
          const total = QUESTIONS.filter((q) => q.dimensionId === d.id).length;
          const excludedDim = n === 0;
          return (
            <button key={d.id} onClick={() => setDim(d.id)} aria-current={dim === d.id} className={`grid w-full grid-cols-[1fr_auto] items-start gap-3 rounded px-2.5 py-1.5 text-left text-sm ${dim === d.id ? 'bg-teal-50 font-medium text-navy' : 'text-ink hover:bg-slate-50'}`}>
              <span className="min-w-0"><span className="font-medium">{d.id}</span> <span className={excludedDim ? 'text-muted' : ''}>{d.name}</span>{excludedDim && <span className="mt-0.5 block text-[0.68rem] font-medium text-warning">Dimensión excluida</span>}</span>
              <span className="whitespace-nowrap pt-0.5 text-xs text-muted num" title={`${n} de ${total} criterios en el alcance`}>{n} de {total}</span>
            </button>
          );
        })}
      </nav>
      <Section title={`${dim} · ${dimensionName(dim)}`} description="Modificar el alcance convierte la evaluación en personalizada. Las exclusiones requieren justificación; para criterios no pertinentes use la no aplicabilidad validada en la mesa de validación.">
        <ul className="divide-y divide-line">
          {questions.map((q) => {
            const on = inScope.has(q.id);
            const na = suggestNotApplicable(q, org);
            return (
              <li key={q.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${on ? '' : 'text-muted'}`}><span className="font-medium text-navy">{q.id}</span> · {q.criterion}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {on ? <Tag tone="teal">Incluido</Tag> : <Tag tone="warning">Excluido</Tag>}
                    <Tag>Desde {TIER_LABEL[q.coreTier]}</Tag>
                    {q.isCritical && <Tag tone="danger">Crítico</Tag>}
                    {na && <Tag tone="warning">Posible no aplicabilidad</Tag>}
                  </div>
                  {!on && a.excludedQuestions[q.id] && <p className="mt-1 text-xs text-muted">Excluido: {a.excludedQuestions[q.id]}</p>}
                </div>
                <Button size="sm" disabled={locked} variant={on ? 'secondary' : 'subtle'} onClick={() => (on ? setExclude({ id: q.id, reason: '' }) : toggle(q.id, true))}>{on ? 'Excluir' : 'Incluir'}</Button>
              </li>
            );
          })}
        </ul>
      </Section>
      <Dialog open={Boolean(exclude)} onOpenChange={(o) => !o && setExclude(null)} title={`Excluir ${exclude?.id}`} description="La exclusión retira el criterio del alcance. Indique la justificación." footer={<><Button onClick={() => setExclude(null)}>Cancelar</Button><Button variant="primary" disabled={!exclude?.reason.trim()} onClick={async () => { if (exclude) await toggle(exclude.id, false, plainText(exclude.reason, 500)); setExclude(null); }}>Excluir</Button></>}>
        <Field label="Justificación" htmlFor="ex-r" required><Textarea id="ex-r" value={exclude?.reason ?? ''} onChange={(e) => setExclude((x) => (x ? { ...x, reason: e.target.value } : x))} /></Field>
      </Dialog>
    </div>
  );
}

function CustomQuestions({ a, locked, save }: Props) {
  const [draft, setDraft] = useState<CustomQuestion | null>(null);
  const prefix = `CUS-${a.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
  const nextId = () => `${prefix}-Q${String(a.customQuestions.length + 1).padStart(2, '0')}`;
  const store = async (c: CustomQuestion) => {
    const list = a.customQuestions.some((x) => x.id === c.id) ? a.customQuestions.map((x) => (x.id === c.id ? c : x)) : [...a.customQuestions, c];
    const ids = a.questionIds.includes(c.id) ? a.questionIds : [...a.questionIds, c.id];
    await save({ customQuestions: list, questionIds: ids, modality: 'custom' }, 'Pregunta propia guardada');
    setDraft(null);
  };
  return (
    <Section title="Preguntas propias" description={`Las preguntas personalizadas usan el espacio de nombres ${prefix}-Qnn y no alteran los identificadores del banco oficial.`} actions={<Button size="sm" variant="primary" disabled={locked} icon={<Plus className="size-3.5" />} onClick={() => setDraft({ id: nextId(), dimensionId: 'D01', criterion: '', question: '¿', explanation: '', maturityDescriptors: ['', '', '', '', '', ''], isCritical: false, weight: 1 })}>Agregar pregunta</Button>}>
      {a.customQuestions.length ? (
        <ul className="divide-y divide-line">
          {a.customQuestions.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-3 py-3">
              <div><p className="text-sm"><span className="font-medium text-navy">{c.id}</span> · {c.dimensionId} · {c.criterion}</p><p className="text-xs text-muted">{c.question}</p></div>
              <div className="flex gap-2">
                <Button size="sm" disabled={locked} onClick={() => setDraft(c)}>Editar</Button>
                <Button size="sm" variant="danger" disabled={locked} icon={<Trash2 className="size-3.5" />} onClick={() => save({ customQuestions: a.customQuestions.filter((x) => x.id !== c.id), questionIds: a.questionIds.filter((x) => x !== c.id) }, 'Pregunta eliminada')} aria-label={`Eliminar ${c.id}`} />
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted">No hay preguntas propias.</p>}
      <Dialog wide open={Boolean(draft)} onOpenChange={(o) => !o && setDraft(null)} title={draft?.id ?? ''} footer={<><Button onClick={() => setDraft(null)}>Cancelar</Button><Button variant="primary" disabled={!draft || draft.criterion.trim().length < 3 || !/^¿.+\?$/.test(draft.question.trim()) || draft.maturityDescriptors.some((d) => d.trim().length < 5)} onClick={() => draft && store({ ...draft, question: plainText(draft.question.trim(), 1000), criterion: plainText(draft.criterion, 300) })}>Guardar</Button></>}>
        {draft && (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Dimensión" htmlFor="cq-d"><Select id="cq-d" value={draft.dimensionId} onChange={(e) => setDraft({ ...draft, dimensionId: e.target.value as DimensionId })}>{DIMENSIONS.map((d) => <option key={d.id} value={d.id}>{d.id} · {d.name}</option>)}</Select></Field>
            <Field label="Criterio" htmlFor="cq-c" required><Input id="cq-c" value={draft.criterion} onChange={(e) => setDraft({ ...draft, criterion: e.target.value })} /></Field>
            <div className="md:col-span-2"><Field label="Pregunta (entre signos de interrogación)" htmlFor="cq-q" required><Textarea id="cq-q" value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} /></Field></div>
            <div className="md:col-span-2"><Field label="Aclaración" htmlFor="cq-e"><Textarea id="cq-e" value={draft.explanation} onChange={(e) => setDraft({ ...draft, explanation: e.target.value })} /></Field></div>
            {draft.maturityDescriptors.map((d, i) => (
              <Field key={i} label={`Descriptor del nivel ${i}`} htmlFor={`cq-l${i}`} required><Textarea id={`cq-l${i}`} rows={2} value={d} onChange={(e) => setDraft({ ...draft, maturityDescriptors: draft.maturityDescriptors.map((x, j) => (j === i ? e.target.value : x)) })} /></Field>
            ))}
            <Field label="Peso dentro de la dimensión" htmlFor="cq-w"><Input id="cq-w" type="number" min={0.1} max={10} step={0.1} value={draft.weight} onChange={(e) => setDraft({ ...draft, weight: Number(e.target.value) })} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.isCritical} onChange={(e) => setDraft({ ...draft, isCritical: e.target.checked })} /> Criterio crítico (genera alertas independientes del promedio)</label>
          </div>
        )}
      </Dialog>
    </Section>
  );
}

function Weights({ a, locked, save }: Props) {
  const [w, setW] = useState<Record<string, number>>({ ...diamWeights(), ...a.weights.dimensions });
  const [mode, setMode] = useState(a.weights.mode);
  const [reason, setReason] = useState(a.weights.reason);
  const total = Object.values(w).reduce((s, x) => s + (Number.isFinite(x) ? x : 0), 0);
  const changed = mode !== 'diam';
  return (
    <Section title="Ponderaciones por dimensión" description="Ponderaciones iniciales propuestas por el DIAM, no oficiales de los referentes. Puede usar ponderación uniforme o personalizada registrando el motivo." actions={<Button size="sm" variant="primary" disabled={locked || (changed && !reason.trim())} onClick={() => save({ weights: { mode, dimensions: mode === 'diam' ? diamWeights() : w, questions: a.weights.questions, reason: plainText(reason, 500), changedAt: new Date().toISOString() } }, 'Ponderaciones guardadas')}>Guardar ponderaciones</Button>}>
      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <Field label="Modo" htmlFor="w-mode"><Select id="w-mode" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}><option value="diam">Inicial DIAM</option><option value="uniforme">Uniforme</option><option value="personalizada">Personalizada</option></Select></Field>
        <Field label="Motivo del cambio" htmlFor="w-r" required={changed} hint="Obligatorio si no usa la ponderación inicial."><Input id="w-r" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      </div>
      <div className="grid gap-x-8 gap-y-2 md:grid-cols-2">
        {DIMENSIONS.map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-3 border-b border-line py-2">
            <label htmlFor={`w-${d.id}`} className="text-sm"><span className="font-medium">{d.id}</span> {d.name} <span className="text-xs text-muted">(DIAM {d.defaultWeight} %)</span></label>
            <Input id={`w-${d.id}`} className="w-24 text-right" type="number" min={0} max={100} step={0.5} disabled={mode !== 'personalizada' || locked} value={mode === 'uniforme' ? Number((100 / 15).toFixed(2)) : mode === 'diam' ? d.defaultWeight : w[d.id]} onChange={(e) => setW({ ...w, [d.id]: Number(e.target.value) })} />
          </div>
        ))}
      </div>
      {mode === 'personalizada' && <p className={`mt-4 text-sm ${Math.abs(total - 100) > 0.01 ? 'text-warning' : 'text-muted'}`}>Suma: {total.toLocaleString('es-CO')} %. El motor renormaliza las ponderaciones de las dimensiones incluidas en cada vista.</p>}
      <div className="mt-5"><Callout tone="info">Una elevada madurez en automatización e IA no compensa silenciosamente una deficiencia crítica: las alertas de criterios críticos se muestran siempre, independientemente del promedio.</Callout></div>
    </Section>
  );
}

function Targets({ a, locked, save }: Props) {
  const [def, setDef] = useState(a.defaultTarget);
  const [dims, setDims] = useState(a.dimensionTargets);
  const [qs, setQs] = useState(a.questionTargets);
  const [qid, setQid] = useState('');
  const missingReason = Object.values(dims).some((t) => !t.reason.trim()) || Object.values(qs).some((t) => !t.reason.trim());
  return (
    <Section title="Metas de madurez" description="No se asume nivel 5 para todos los criterios. Meta orientativa inicial: nivel 3. Los ajustes deben justificarse según naturaleza, riesgos, obligaciones, capacidad presupuestal y complejidad." actions={<Button size="sm" variant="primary" disabled={locked || missingReason} onClick={() => save({ defaultTarget: def, dimensionTargets: dims, questionTargets: qs }, 'Metas guardadas')}>Guardar metas</Button>}>
      <Field label="Meta por defecto" htmlFor="t-def"><Select id="t-def" className="max-w-xs" value={def} onChange={(e) => setDef(Number(e.target.value))}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</Select></Field>
      <h3 className="mb-2 mt-6 text-sm font-semibold">Metas por dimensión</h3>
      <div className="divide-y divide-line">
        {DIMENSIONS.map((d) => {
          const t = dims[d.id];
          return (
            <div key={d.id} className="grid gap-2 py-2 md:grid-cols-[1fr_120px_1.4fr] md:items-center">
              <span className="text-sm"><span className="font-medium">{d.id}</span> {d.name}</span>
              <Select aria-label={`Meta ${d.id}`} value={t?.level ?? ''} disabled={locked} onChange={(e) => { const v = e.target.value; const n = { ...dims }; if (!v) delete n[d.id]; else n[d.id] = { level: Number(v), reason: t?.reason ?? '' }; setDims(n); }}><option value="">Por defecto ({def})</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</Select>
              {t ? <Input aria-label={`Justificación ${d.id}`} placeholder="Justificación obligatoria" value={t.reason} onChange={(e) => setDims({ ...dims, [d.id]: { ...t, reason: e.target.value } })} aria-invalid={!t.reason.trim()} /> : <span />}
            </div>
          );
        })}
      </div>
      <h3 className="mb-2 mt-6 text-sm font-semibold">Metas por criterio</h3>
      <div className="flex gap-2">
        <Select aria-label="Criterio" value={qid} onChange={(e) => setQid(e.target.value)} className="max-w-md"><option value="">Seleccione un criterio…</option>{a.questionIds.filter((x) => !qs[x]).map((x) => <option key={x} value={x}>{x} · {QUESTIONS.find((q) => q.id === x)?.criterion ?? x}</option>)}</Select>
        <Button disabled={!qid || locked} onClick={() => { setQs({ ...qs, [qid]: { level: def, reason: '' } }); setQid(''); }}>Agregar meta</Button>
      </div>
      <div className="mt-3 divide-y divide-line">
        {Object.entries(qs).map(([id, t]) => (
          <div key={id} className="grid gap-2 py-2 md:grid-cols-[1fr_120px_1.4fr_auto] md:items-center">
            <span className="text-sm">{id}</span>
            <Select aria-label={`Meta ${id}`} value={t.level} onChange={(e) => setQs({ ...qs, [id]: { ...t, level: Number(e.target.value) } })}>{[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</Select>
            <Input aria-label={`Justificación ${id}`} placeholder="Justificación obligatoria" value={t.reason} onChange={(e) => setQs({ ...qs, [id]: { ...t, reason: e.target.value } })} aria-invalid={!t.reason.trim()} />
            <Button size="sm" variant="ghost" onClick={() => { const n = { ...qs }; delete n[id]; setQs(n); }}>Quitar</Button>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Legal({ a, locked, save, org }: Props & { org: Parameters<typeof legalApplicability>[1] }) {
  const rows = useMemo(() => QUESTIONS.filter((q) => a.questionIds.includes(q.id) && q.legalApplicability !== 'buena_practica').map((q) => ({ q, r: legalApplicability(q, org, a.legalOverrides) })), [a, org]);
  const set = (id: string, v: string) => {
    const o = { ...a.legalOverrides };
    if (!v) delete o[id]; else o[id] = v as LegalStatus;
    return save({ legalOverrides: o }, 'Aplicabilidad actualizada');
  };
  return (
    <Section title="Panel de aplicabilidad jurídica" description="Las obligaciones del AGN, MIPG, FURAG y transparencia no se aplican indiscriminadamente. Para organizaciones no sujetas se evalúan capacidades equivalentes. Una respuesta de encuesta no prueba un incumplimiento: se presenta como posible brecha normativa que requiere validación.">
      <div className="overflow-x-auto">
        <table className="table-pro">
          <thead><tr><th>Criterio</th><th>Tipo de referente</th><th>Aplicabilidad calculada</th><th>Fundamento</th><th>Decisión del evaluador</th></tr></thead>
          <tbody>
            {rows.map(({ q, r }) => (
              <tr key={q.id}>
                <td><span className="font-medium text-navy">{q.id}</span><div className="text-xs text-muted">{q.criterion}</div></td>
                <td className="text-xs text-muted">{q.legalApplicability === 'obligacion_publica' ? 'Obligación para sujetos públicos' : q.legalApplicability === 'obligacion_general' ? 'Obligación general' : 'Regulación sectorial'}</td>
                <td><Tag tone={r.status === 'obligatoria' ? 'info' : r.status === 'por_validar' ? 'warning' : 'neutral'}>{LEGAL_STATUS_LABEL[r.status]}</Tag></td>
                <td className="max-w-sm text-xs text-muted">{r.reason}</td>
                <td><Select aria-label={`Decisión ${q.id}`} disabled={locked} value={a.legalOverrides[q.id] ?? ''} onChange={(e) => set(q.id, e.target.value)} className="w-48"><option value="">Usar cálculo</option><option value="obligatoria">Posible obligación</option><option value="por_validar">Por validar</option><option value="buena_practica">Buena práctica</option></Select></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function ThresholdsTab({ a, locked, save }: Props) {
  const [t, setT] = useState(a.thresholds);
  const valid = t.coverageInsufficient < t.coverageExploratory && t.coverageExploratory < t.coveragePartial && t.coveragePartial <= 100;
  return (
    <Section title="Umbrales de interpretación" description="Los umbrales son configurables. Ningún resultado se presenta como aprobado o certificado por alcanzar un umbral." actions={<Button size="sm" variant="primary" disabled={locked || !valid} onClick={() => save({ thresholds: t }, 'Umbrales guardados')}>Guardar umbrales</Button>}>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Información insuficiente por debajo de (%)" htmlFor="th1"><Input id="th1" type="number" value={t.coverageInsufficient} onChange={(e) => setT({ ...t, coverageInsufficient: Number(e.target.value) })} /></Field>
        <Field label="Resultado exploratorio por debajo de (%)" htmlFor="th2"><Input id="th2" type="number" value={t.coverageExploratory} onChange={(e) => setT({ ...t, coverageExploratory: Number(e.target.value) })} /></Field>
        <Field label="Resultado parcial por debajo de (%)" htmlFor="th3"><Input id="th3" type="number" value={t.coveragePartial} onChange={(e) => setT({ ...t, coveragePartial: Number(e.target.value) })} /></Field>
        <Field label="Alerta de discrepancia con rango igual o superior a" htmlFor="th4"><Input id="th4" type="number" min={1} max={5} value={t.discrepancyRange} onChange={(e) => setT({ ...t, discrepancyRange: Number(e.target.value) })} /></Field>
        <Field label="Alerta de nivel alto sin evidencia desde el nivel" htmlFor="th5"><Input id="th5" type="number" min={1} max={5} value={t.highScoreWithoutEvidence} onChange={(e) => setT({ ...t, highScoreWithoutEvidence: Number(e.target.value) })} /></Field>
      </div>
      {!valid && <p className="mt-3 text-sm text-danger" role="alert">Los umbrales de cobertura deben ser crecientes y no superar 100.</p>}
    </Section>
  );
}
