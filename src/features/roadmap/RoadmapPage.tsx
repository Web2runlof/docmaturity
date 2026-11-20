import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarClock, Plus, Sparkles, Trash2 } from 'lucide-react';
import type { RoadmapInitiative } from '@/types/domain';
import { useAssessmentData } from '@/hooks/useAssessment';
import { Button, Callout, Dialog, EmptyState, Field, Input, PageHeader, Section, Select, TabPanel, Tabs, Tag, Textarea } from '@/components/ui';
import { EChart } from '@/components/charts/EChart';
import { ganttOption, impactEffortOption } from '@/components/charts/options';
import { DependencyMap } from '@/components/charts/DependencyMap';
import { PHASES, dateViolations, phaseViolation } from '@/engine/recommendations';
import { PHASE_COLORS } from '@/engine/constants';
import { INITIATIVE_STATUS_LABEL } from '@/config/vocabulary';
import { deleteInitiative, generateRoadmap, moveInitiative, newInitiative, rescheduleRoadmap, roadmapAnchor, saveInitiative, setRoadmapStart } from '@/services/repo';
import { attempt, attemptOk, notify } from '@/app/store';
import { cx, fmtCOP, fmtDate, fmtScore, plural } from '@/utils/core';
import { Loading, NotFound } from '../common';

const STATUS: Record<RoadmapInitiative['status'], string> = INITIATIVE_STATUS_LABEL;

export default function RoadmapPage() {
  const { aid = '' } = useParams();
  const { bundle, analysis: a, loading, missing } = useAssessmentData(aid);
  const [edit, setEdit] = useState<RoadmapInitiative | null>(null);
  const [tab, setTab] = useState('fases');
  if (loading) return <Loading />;
  if (missing || !bundle || !a) return <NotFound />;
  const locked = bundle.assessment.status === 'finalizado';
  const items = [...bundle.initiatives].sort((x, y) => x.phase - y.phase || x.startDate.localeCompare(y.startDate) || x.order - y.order);
  const byId = new Map(items.map((i) => [i.id, i]));
  const missingProposals = a.initiatives.filter((p) => !items.some((i) => i.templateId === p.template.id));
  const anchor = roadmapAnchor(bundle.assessment);
  const violations = dateViolations(items);

  const move = async (i: RoadmapInitiative, phase: number) => {
    if (phase < 1 || phase > 4) return;
    const depPhases = i.dependencies.map((d) => byId.get(d)?.phase ?? 1);
    if (phaseViolation(phase, depPhases)) return notify('warning', 'Movimiento no permitido', 'La iniciativa no puede ubicarse en una fase anterior a la de las iniciativas de las que depende.');
    const r = await attempt(() => moveInitiative(i.id, phase as 1 | 2 | 3 | 4));
    if (!r) return;
    const parts = [r.phase !== phase ? `Por sus dependencias quedó en la fase ${r.phase}.` : '', r.rescheduled.length ? `Se reprogramaron las iniciativas que dependen de ella: ${r.rescheduled.join(', ')}.` : ''].filter(Boolean);
    notify('success', `${i.code} movida a la fase ${r.phase}`, parts.join(' ') || undefined);
  };

  return (
    <>
      <PageHeader eyebrow="Transformación" title="Hoja de ruta" description="Propuesta editable de iniciativas por fases. Los plazos son horizontes orientativos, no cronogramas contractuales. No se inventan presupuestos: puede registrarlos en pesos colombianos." actions={
        <>
          <Button icon={<Plus className="size-4" />} disabled={locked} onClick={() => setEdit(newInitiative(aid, items.length))}>Iniciativa propia</Button>
          <Button variant="primary" icon={<Sparkles className="size-4" />} disabled={locked || !missingProposals.length} onClick={() => attempt(() => generateRoadmap(bundle.assessment, a.initiatives), 'Hoja de ruta actualizada')}>{items.length ? `Agregar propuestas (${missingProposals.length})` : 'Generar propuesta'}</Button>
        </>
      } />
      {items.length > 0 && <RoadmapControls aid={aid} anchor={anchor} locked={locked} violations={violations.map((v) => `${v.code} inicia antes de que termine ${v.dependsOnCode}`)} />}
      {!items.length ? (
        <Section><EmptyState icon={<Sparkles className="size-7" />} title="Hoja de ruta sin generar" description={a.initiatives.length ? `El motor propone ${a.initiatives.length} iniciativas a partir de las brechas, agrupadas para no duplicar propósitos y ordenadas según dependencias.` : 'Registre respuestas para que el motor identifique brechas y proponga iniciativas.'} actions={a.initiatives.length ? <Button variant="primary" disabled={locked} onClick={() => attempt(() => generateRoadmap(bundle.assessment, a.initiatives), 'Hoja de ruta generada')}>Generar propuesta</Button> : undefined} /></Section>
      ) : (
        <Tabs value={tab} onValueChange={setTab} tabs={[{ value: 'fases', label: 'Fases' }, { value: 'gantt', label: 'Línea de tiempo' }, { value: 'deps', label: 'Dependencias' }, { value: 'portafolio', label: 'Portafolio' }]}>
          <TabPanel value="fases">
            <div className="grid gap-4 xl:grid-cols-4">
              {PHASES.map((ph) => (
                <section key={ph.phase} className="panel flex flex-col" aria-label={`Fase ${ph.phase}`}>
                  <header className="border-b border-line px-4 py-3" style={{ borderTop: `3px solid ${PHASE_COLORS[ph.phase - 1]}` }}><p className="eyebrow">Fase {ph.phase} · {ph.horizon}</p><h2 className="mt-1 text-base font-semibold">{ph.name}</h2></header>
                  <ul className="flex-1 space-y-2 p-3">
                    {items.filter((i) => i.phase === ph.phase).map((i) => (
                      <li key={i.id} className="rounded-md border border-line bg-white p-3">
                        <button onClick={() => setEdit(i)} className="text-left"><span className="text-xs text-muted">{i.code}</span><span className="block text-sm font-medium text-navy hover:underline">{i.name}</span></button>
                        <div className="mt-2 flex flex-wrap gap-1"><Tag>{STATUS[i.status]}</Tag>{i.priority !== null && <Tag tone="teal">Prioridad {fmtScore(i.priority)}</Tag>}{i.dependencies.length > 0 && <Tag tone="info">Depende de {i.dependencies.map((d) => byId.get(d)?.code).join(', ')}</Tag>}</div>
                        <p className="mt-2 text-xs text-muted">{fmtDate(i.startDate)} – {fmtDate(i.endDate)}{i.budgetCOP !== null ? ` · ${fmtCOP(i.budgetCOP)}` : ''}</p>
                        <div className="mt-2 flex justify-between">
                          <Button size="sm" variant="ghost" disabled={locked || ph.phase === 1} icon={<ArrowLeft className="size-3.5" />} aria-label="Mover a la fase anterior" onClick={() => move(i, ph.phase - 1)} />
                          <Button size="sm" variant="ghost" disabled={locked || ph.phase === 4} icon={<ArrowRight className="size-3.5" />} aria-label="Mover a la fase siguiente" onClick={() => move(i, ph.phase + 1)} />
                        </div>
                      </li>
                    ))}
                    {!items.some((i) => i.phase === ph.phase) && <li className="text-xs text-muted">Sin iniciativas.</li>}
                  </ul>
                </section>
              ))}
            </div>
          </TabPanel>
          <TabPanel value="gantt">
            <Section title="Línea de tiempo" description={`Inicio de la hoja de ruta: ${fmtDate(anchor)}. Cada barra va del inicio al fin de la iniciativa; el color identifica la fase.`}>
              <EChart height={Math.max(280, items.length * 32 + 80)} label="Línea de tiempo de la hoja de ruta" option={ganttOption(items.map((i) => ({ name: `${i.code} ${i.name}`, start: i.startDate, end: i.endDate, phase: i.phase })), [...PHASES], anchor)} table={{ columns: ['Código', 'Iniciativa', 'Fase', 'Inicio', 'Fin', 'Depende de'], rows: items.map((i) => [i.code, i.name, i.phase, i.startDate, i.endDate, i.dependencies.map((d) => byId.get(d)?.code).join(', ') || '—']) }} summary="Edite las fechas en el detalle de cada iniciativa. Una iniciativa dependiente inicia cuando termina su prerrequisito." />
            </Section>
          </TabPanel>
          <TabPanel value="deps">
            <Section title="Dependencias entre iniciativas" description="Una columna por fase, con las iniciativas en el orden de la hoja de ruta.">
              <DependencyMap nodes={items.map((i) => ({ id: i.id, code: i.code, name: i.name, phase: i.phase }))} edges={items.flatMap((i) => i.dependencies.filter((d) => byId.has(d)).map((d) => ({ source: d, target: i.id })))} phases={[...PHASES]} />
            </Section>
          </TabPanel>
          <TabPanel value="portafolio">
            <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
              <Section title="Portafolio de proyectos">
                <div className="overflow-x-auto"><table className="table-pro">
                  <thead><tr><th>Código</th><th>Iniciativa</th><th>Fase</th><th>Responsable</th><th>Criterios</th><th>Presupuesto</th><th>Estado</th></tr></thead>
                  <tbody>{items.map((i) => <tr key={i.id}><td className="text-muted">{i.code}</td><td><button className="text-left font-medium text-navy hover:underline" onClick={() => setEdit(i)}>{i.name}</button></td><td className="num whitespace-nowrap">Fase {i.phase}</td><td className="text-xs text-muted">{i.owner}</td><td className="text-xs text-muted">{i.questionIds.length}</td><td className="num text-xs">{fmtCOP(i.budgetCOP)}</td><td><Tag>{STATUS[i.status]}</Tag></td></tr>)}</tbody>
                </table></div>
              </Section>
              <Section title="Matriz impacto–esfuerzo de iniciativas" description={`Solo iniciativas con impacto y esfuerzo valorados (${items.filter((i) => i.impact !== null && i.effort !== null).length} de ${items.length}).`}>
                <EChart height={300} label="Matriz impacto esfuerzo de iniciativas" option={impactEffortOption(items.filter((i) => i.impact !== null && i.effort !== null).map((i) => ({ id: i.code, impact: i.impact as number, effort: i.effort as number, score: i.priority ?? 2, estimated: false })))} empty={items.some((i) => i.impact !== null && i.effort !== null) ? undefined : 'Valore impacto y esfuerzo en el detalle de las iniciativas.'} />
              </Section>
            </div>
          </TabPanel>
        </Tabs>
      )}
      {edit && <InitiativeDialog initiative={edit} all={items} locked={locked} onClose={() => setEdit(null)} questionIds={a.states.map((s) => s.question.id)} />}
    </>
  );
}

function RoadmapControls({ aid, anchor, locked, violations }: { aid: string; anchor: string; locked: boolean; violations: string[] }) {
  const [date, setDate] = useState(anchor);
  useEffect(() => setDate(anchor), [anchor]);
  return (
    <section className="panel mb-6 p-4" aria-label="Programación de la hoja de ruta">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Fecha de inicio de la hoja de ruta" htmlFor="rm-start" hint="Todas las fechas se calculan desde esta fecha. Cambiarla desplaza las iniciativas sin alterar su duración.">
          <Input id="rm-start" type="date" className="w-48" value={date} disabled={locked} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Button disabled={locked || !date || date === anchor} onClick={() => attempt(() => setRoadmapStart(aid, date), 'Fecha de inicio actualizada')}>Aplicar fecha</Button>
        <Button icon={<CalendarClock className="size-4" />} disabled={locked} onClick={async () => { const n = await attempt(() => rescheduleRoadmap(aid)); if (n !== undefined) notify('success', n ? `${plural(n, 'iniciativa reprogramada', 'iniciativas reprogramadas')}` : 'Las fechas ya respetan las dependencias'); }}>Reprogramar según dependencias</Button>
      </div>
      {violations.length > 0 && <div className="mt-3"><Callout tone="warning" title="Fechas que no respetan las dependencias">{violations.join('; ')}. Use «Reprogramar según dependencias» o ajuste las fechas en el detalle de cada iniciativa.</Callout></div>}
    </section>
  );
}

function InitiativeDialog({ initiative, all, locked, onClose, questionIds }: { initiative: RoadmapInitiative; all: RoadmapInitiative[]; locked: boolean; onClose: () => void; questionIds: string[] }) {
  const [i, setI] = useState(initiative);
  const set = (p: Partial<RoadmapInitiative>) => setI((x) => ({ ...x, ...p }));
  const others = all.filter((x) => x.id !== i.id);
  const violation = phaseViolation(i.phase, i.dependencies.map((d) => all.find((x) => x.id === d)?.phase ?? 1));
  return (
    <Dialog wide open onOpenChange={(o) => !o && onClose()} title={`${i.code} · ${i.name}`} footer={
      <>
        {all.some((x) => x.id === i.id) && <Button variant="danger" disabled={locked} icon={<Trash2 className="size-4" />} onClick={async () => { await attempt(() => deleteInitiative(i.id), 'Iniciativa eliminada'); onClose(); }}>Eliminar</Button>}
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="primary" disabled={locked || !i.name.trim() || violation} onClick={async () => { const ok = await attemptOk(() => saveInitiative(i), 'Iniciativa guardada'); if (ok) onClose(); }}>Guardar</Button>
      </>
    }>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nombre" htmlFor="in-n" required><Input id="in-n" value={i.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="Responsable" htmlFor="in-o"><Input id="in-o" value={i.owner} onChange={(e) => set({ owner: e.target.value })} /></Field>
        <div className="md:col-span-2"><Field label="Objetivo de la iniciativa" htmlFor="in-obj"><Textarea id="in-obj" rows={2} value={i.objective} onChange={(e) => set({ objective: e.target.value })} /></Field></div>
        <div className="md:col-span-2"><Field label="Descripción" htmlFor="in-d"><Textarea id="in-d" rows={3} value={i.description} onChange={(e) => set({ description: e.target.value })} /></Field></div>
        <Field label="Fase" htmlFor="in-f"><Select id="in-f" value={i.phase} onChange={(e) => set({ phase: Number(e.target.value) as 1 | 2 | 3 | 4 })}>{PHASES.map((p) => <option key={p.phase} value={p.phase}>{p.phase}. {p.name} ({p.horizon})</option>)}</Select></Field>
        <Field label="Estado" htmlFor="in-s"><Select id="in-s" value={i.status} onChange={(e) => set({ status: e.target.value as RoadmapInitiative['status'] })}>{(Object.keys(STATUS) as RoadmapInitiative['status'][]).map((s) => <option key={s} value={s}>{STATUS[s]}</option>)}</Select></Field>
        <Field label="Fecha de inicio" htmlFor="in-sd"><Input id="in-sd" type="date" value={i.startDate} onChange={(e) => set({ startDate: e.target.value })} /></Field>
        <Field label="Fecha de finalización" htmlFor="in-ed" error={i.endDate < i.startDate ? 'Debe ser posterior al inicio' : undefined}><Input id="in-ed" type="date" value={i.endDate} onChange={(e) => set({ endDate: e.target.value })} /></Field>
        <Field label="Presupuesto estimado (COP, opcional)" htmlFor="in-b" hint="La aplicación no propone presupuestos."><Input id="in-b" type="number" min={0} step={1000} value={i.budgetCOP ?? ''} onChange={(e) => set({ budgetCOP: e.target.value === '' ? null : Number(e.target.value) })} /></Field>
        <Field label="Áreas participantes" htmlFor="in-a"><Input id="in-a" value={i.areas} onChange={(e) => set({ areas: e.target.value })} /></Field>
        <Field label="Impacto (1–5)" htmlFor="in-imp"><Select id="in-imp" value={i.impact ?? ''} onChange={(e) => set({ impact: e.target.value ? Number(e.target.value) : null })}><option value="">Sin valorar</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</Select></Field>
        <Field label="Esfuerzo (1–5)" htmlFor="in-eff"><Select id="in-eff" value={i.effort ?? ''} onChange={(e) => set({ effort: e.target.value ? Number(e.target.value) : null })}><option value="">Sin valorar</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</Select></Field>
        <div className="md:col-span-2"><Field label="Productos esperados" htmlFor="in-pr"><Textarea id="in-pr" rows={2} value={i.deliverables} onChange={(e) => set({ deliverables: e.target.value })} /></Field></div>
        <div className="md:col-span-2"><Field label="Indicadores" htmlFor="in-ind"><Textarea id="in-ind" rows={2} value={i.indicators} onChange={(e) => set({ indicators: e.target.value })} /></Field></div>
        <div className="md:col-span-2">
          <Field label="Brechas asociadas (criterios)" htmlFor="in-q" hint="Separados por coma."><Input id="in-q" value={i.questionIds.join(', ')} onChange={(e) => set({ questionIds: e.target.value.split(',').map((x) => x.trim()).filter((x) => questionIds.includes(x)) })} /></Field>
        </div>
        <fieldset className="md:col-span-2"><legend className="mb-1 text-sm font-medium">Dependencias</legend>
          <div className="flex flex-wrap gap-3">{others.map((o) => <label key={o.id} className={cx('flex items-center gap-2 text-sm', o.phase > i.phase && 'text-warning')}><input type="checkbox" checked={i.dependencies.includes(o.id)} onChange={(e) => set({ dependencies: e.target.checked ? [...i.dependencies, o.id] : i.dependencies.filter((d) => d !== o.id) })} />{o.code} {o.name} · fase {o.phase}</label>)}</div>
        </fieldset>
        <div className="md:col-span-2"><Field label="Observaciones" htmlFor="in-ob"><Textarea id="in-ob" rows={2} value={i.notes} onChange={(e) => set({ notes: e.target.value })} /></Field></div>
        {violation && <div className="md:col-span-2"><Callout tone="danger">La fase seleccionada es anterior a la de una iniciativa de la que depende. Ajuste la fase o las dependencias.</Callout></div>}
      </div>
    </Dialog>
  );
}
