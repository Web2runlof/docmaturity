import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Download, FileUp, MessageSquarePlus, Trash2, UserPlus } from 'lucide-react';
import type { InterviewAssignment, Participant } from '@/types/domain';
import type { DimensionId, RespondentProfile } from '@/types/bank';
import { db } from '@/database/db';
import { useAssessmentData } from '@/hooks/useAssessment';
import { Button, Callout, ConfirmDialog, Dialog, EmptyState, Field, FileDrop, Input, PageHeader, Section, Select, Tag, Textarea } from '@/components/ui';
import { DIMENSIONS, questionsForAssessment } from '@/data/bank';
import { PROFILE_DIMENSIONS, SHARED_CORE, addParticipant, deleteParticipant, saveAssignment, startDirectedInterview, suggestedQuestionsFor } from '@/services/repo';
import { buildAssignmentPackage, diffRevision, importInterviewPackage, resolveRevision, type RevisionDiff } from '@/services/packages';
import { decryptPackage, isEncryptedPackage } from '@/services/crypto';
import { PACKAGE_LIMITS } from '@/schemas/packages';
import { SPECIAL_LABEL } from '@/engine/constants';
import { attempt, notify } from '@/app/store';
import { downloadJSON, fmtDate, readFileText, safeParseJSON, slugify } from '@/utils/core';
import { Loading, NotFound, PROFILES, PROFILE_LABEL } from '../common';

export default function InterviewsPage() {
  const { aid = '' } = useParams();
  const nav = useNavigate();
  const { bundle, loading, missing } = useAssessmentData(aid);
  const assignments = useLiveQuery(() => db.assignments.where('assessmentId').equals(aid).toArray(), [aid]);
  const revisions = useLiveQuery(() => db.interviewRevisions.where('assessmentId').equals(aid).toArray(), [aid]);
  const imports = useLiveQuery(() => db.importEvents.orderBy('at').reverse().limit(12).toArray(), []);
  const departments = useLiveQuery(() => (bundle ? db.departments.where('organizationId').equals(bundle.organization.id).toArray() : []), [bundle?.organization.id]);
  const [addOpen, setAddOpen] = useState(false);
  const [asgFor, setAsgFor] = useState<Participant | null>(null);
  const [delP, setDelP] = useState<Participant | null>(null);
  const [rev, setRev] = useState<{ id: string; diff: RevisionDiff[] } | null>(null);
  const [encText, setEncText] = useState<{ text: string; name: string } | null>(null);
  const [pwd, setPwd] = useState('');
  if (loading) return <Loading />;
  if (missing || !bundle) return <NotFound />;
  const a = bundle.assessment;
  const locked = a.status === 'finalizado' || a.status === 'archivado';

  const handleImport = async (text: string, name: string) => {
    const r = await attempt(() => importInterviewPackage(text, name));
    if (!r) return;
    notify(r.status === 'aceptado' ? 'success' : r.status === 'duplicado' ? 'info' : 'warning', r.status === 'aceptado' ? 'Entrevista importada' : r.status === 'duplicado' ? 'Importación duplicada' : 'Nueva revisión recibida', r.message);
    r.warnings.forEach((w) => notify('warning', 'Advertencia', w));
  };
  const onFile = async (f: File) => {
    try {
      const text = await readFileText(f, PACKAGE_LIMITS.encrypted);
      if (isEncryptedPackage(safeParseJSON(text))) { setEncText({ text, name: f.name }); return; }
      await handleImport(text, f.name);
    } catch (e) { notify('error', 'Archivo rechazado', (e as Error).message); }
  };
  const exportAssignment = async (asg: InterviewAssignment, p: Participant) => {
    const pkg = await attempt(() => buildAssignmentPackage(asg.id));
    if (pkg) downloadJSON(pkg, `${slugify(a.name)}-${slugify(p.code)}.dm-assignment.json`);
  };
  const pending = (revisions ?? []).filter((r) => r.status === 'pendiente_decision');

  return (
    <>
      <PageHeader eyebrow="Entrevistas" title="Participantes y entrevistas" description="Entrevistas dirigidas por el evaluador o autoadministradas mediante archivos. No hay transmisión automática: los resultados se consideran recibidos solo cuando se importan aquí." actions={<Button variant="primary" icon={<UserPlus className="size-4" />} disabled={locked} onClick={() => setAddOpen(true)}>Agregar participante</Button>} />
      {pending.length > 0 && (
        <div className="mb-6"><Callout tone="warning" title={`${pending.length} revisión(es) pendientes de decisión`}>
          <ul className="mt-2 space-y-1">{pending.map((r) => {
            const i = bundle.interviews.find((x) => x.id === r.interviewId);
            const p = bundle.participants.find((x) => x.id === i?.participantId);
            return <li key={r.id} className="flex items-center justify-between gap-3"><span>{p?.code} · revisión {r.revision} · {fmtDate(r.importedAt, true)}</span><Button size="sm" onClick={async () => setRev({ id: r.id, diff: await diffRevision(r.id) })}>Ver diferencias</Button></li>;
          })}</ul>
        </Callout></div>
      )}
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Section title="Participantes" description="Identificados por código o seudónimo. No se exige nombre completo, correo ni documento de identidad.">
          {!bundle.participants.length ? (
            <EmptyState icon={<UserPlus className="size-7" />} title="Sin participantes" description="Agregue participantes por perfil. La asignación de dimensiones se sugiere según el perfil y puede modificarse." actions={<Button variant="primary" disabled={locked} onClick={() => setAddOpen(true)}>Agregar participante</Button>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-pro">
                <thead><tr><th>Código</th><th>Perfil</th><th>Asignación</th><th>Entrevistas</th><th className="text-right">Acciones</th></tr></thead>
                <tbody>
                  {bundle.participants.map((p) => {
                    const asg = assignments?.find((x) => x.participantId === p.id);
                    const ivs = bundle.interviews.filter((i) => i.participantId === p.id);
                    return (
                      <tr key={p.id}>
                        <td><span className="font-medium text-navy">{p.code}</span>{p.area && <div className="text-xs text-muted">{p.area}</div>}</td>
                        <td className="text-muted">{PROFILE_LABEL[p.profile]}</td>
                        <td>{asg ? <span className="text-sm num">{asg.questionIds.length} preguntas{asg.exportedAt && <span className="block text-xs text-muted">Exportada {fmtDate(asg.exportedAt)}</span>}</span> : <span className="text-xs text-muted">Sin asignación</span>}</td>
                        <td className="space-y-1">{ivs.length ? ivs.map((i) => <div key={i.id}><Tag tone={i.status === 'finalizada' ? 'teal' : 'neutral'}>{i.mode === 'dirigida' ? 'Dirigida' : 'Autoadministrada'} · {i.status === 'finalizada' ? 'finalizada' : 'en curso'}{i.source === 'importada' ? ` · rev. ${i.revision}` : ''}</Tag></div>) : <span className="text-xs text-muted">—</span>}</td>
                        <td>
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <Button size="sm" disabled={locked} onClick={() => setAsgFor(p)}>{asg ? 'Editar asignación' : 'Asignar preguntas'}</Button>
                            {asg && <Button size="sm" icon={<Download className="size-3.5" />} onClick={() => exportAssignment(asg, p)}>Paquete</Button>}
                            <Button size="sm" variant="subtle" disabled={locked} icon={<MessageSquarePlus className="size-3.5" />} onClick={async () => { const i = await attempt(() => startDirectedInterview(aid, p.id, asg?.id ?? null)); if (i) nav(`/app/evaluaciones/${aid}/entrevistas/${i.id}`); }}>Dirigida</Button>
                            <Button size="sm" variant="ghost" disabled={locked} icon={<Trash2 className="size-3.5" />} aria-label={`Eliminar ${p.code}`} onClick={() => setDelP(p)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>
        <div className="space-y-6">
          <Section title="Importar resultados" description="Archivo .dm-interview.json devuelto por un participante.">
            {locked ? <Callout tone="warning">La evaluación no admite nuevas importaciones mientras esté finalizada o archivada.</Callout> : <FileDrop accept=".json,application/json" onFile={onFile} label="Seleccione o arrastre un archivo de entrevista" hint="Se validan versión, identificadores, preguntas autorizadas, valores e integridad SHA-256." />}
            <p className="mt-3 text-xs text-muted">El hash SHA-256 permite detectar cambios o corrupción, pero no acredita por sí solo la identidad ni la autoría del archivo.</p>
          </Section>
          <Section title="Flujo de entrevista distribuida">
            <ol className="space-y-2 text-sm">
              {['Agregue el participante y asigne preguntas.', 'Descargue el paquete de asignación.', 'Compártalo con el enlace de DOCMATURITY por un canal autorizado.', 'El participante abre «Responder una entrevista», importa, responde y exporta.', 'Importe aquí el resultado; la aplicación valida su correspondencia.'].map((t, i) => (
                <li key={t} className="flex gap-3"><span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-line text-[0.68rem] font-semibold text-navy num">{i + 1}</span><span>{t}</span></li>
              ))}
            </ol>
            <Link to="/responder" className="mt-3 inline-block text-sm font-medium text-teal hover:underline">Abrir modo entrevistado</Link>
          </Section>
          <Section title="Registro de importaciones">
            {imports?.length ? <ul className="space-y-2 text-xs">{imports.map((e) => <li key={e.seq} className="flex justify-between gap-2"><span className="min-w-0 truncate" title={e.detail}>{fmtDate(e.at, true)} · {e.fileName}</span><Tag tone={e.result === 'aceptado' ? 'teal' : e.result === 'rechazado' ? 'danger' : 'warning'}>{e.result.replace('_', ' ')}</Tag></li>)}</ul> : <p className="text-sm text-muted">Sin importaciones.</p>}
          </Section>
        </div>
      </div>

      <AddParticipant open={addOpen} onOpenChange={setAddOpen} departments={departments?.map((d) => d.name) ?? []} onAdd={async (data) => { await attempt(() => addParticipant(aid, data), 'Participante agregado'); }} />
      {asgFor && <AssignmentDialog participant={asgFor} assessment={a} existing={assignments?.find((x) => x.participantId === asgFor.id)} onClose={() => setAsgFor(null)} />}
      <ConfirmDialog open={Boolean(delP)} onOpenChange={(o) => !o && setDelP(null)} danger title={`Eliminar ${delP?.code}`} description="Se eliminarán su asignación, entrevistas y respuestas. Las evidencias se conservan sin vínculo al participante." confirmLabel="Eliminar" onConfirm={async () => { if (delP) await attempt(() => deleteParticipant(delP.id), 'Participante eliminado'); }} />
      <Dialog wide open={Boolean(rev)} onOpenChange={(o) => !o && setRev(null)} title="Diferencias entre revisiones" description="La revisión anterior se conserva. Seleccione la revisión vigente y registre el motivo.">
        {rev && <RevisionDecision id={rev.id} diff={rev.diff} onDone={() => setRev(null)} />}
      </Dialog>
      <Dialog open={Boolean(encText)} onOpenChange={(o) => !o && setEncText(null)} title="Archivo cifrado" footer={<><Button onClick={() => setEncText(null)}>Cancelar</Button><Button variant="primary" disabled={!pwd} onClick={async () => { if (!encText) return; try { const plain = await decryptPackage(safeParseJSON(encText.text), pwd); setEncText(null); setPwd(''); await handleImport(plain, encText.name); } catch (e) { notify('error', 'No fue posible descifrar', (e as Error).message); } }}>Descifrar e importar</Button></>}>
        <Field label="Contraseña" htmlFor="dec-p"><Input id="dec-p" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} autoComplete="off" /></Field>
      </Dialog>
    </>
  );
}

function AddParticipant({ open, onOpenChange, onAdd, departments }: { open: boolean; onOpenChange: (o: boolean) => void; onAdd: (d: Pick<Participant, 'code' | 'profile' | 'area' | 'displayName'>) => Promise<void>; departments: string[] }) {
  const [code, setCode] = useState('');
  const [profile, setProfile] = useState<RespondentProfile>('gestion_documental');
  const [area, setArea] = useState('');
  const [displayName, setDisplayName] = useState('');
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Agregar participante" footer={<><Button onClick={() => onOpenChange(false)}>Cancelar</Button><Button variant="primary" disabled={!code.trim()} onClick={async () => { await onAdd({ code, profile, area, displayName }); setCode(''); setArea(''); setDisplayName(''); onOpenChange(false); }}>Agregar</Button></>}>
      <div className="grid gap-4">
        <Field label="Código o seudónimo" htmlFor="p-code" required hint="Por ejemplo: GD-01, TEC-02."><Input id="p-code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={40} /></Field>
        <Field label="Perfil" htmlFor="p-prof"><Select id="p-prof" value={profile} onChange={(e) => setProfile(e.target.value as RespondentProfile)}>{PROFILES.map((p) => <option key={p} value={p}>{PROFILE_LABEL[p]}</option>)}</Select></Field>
        <Field label="Área (opcional)" htmlFor="p-area"><Input id="p-area" list="p-areas" value={area} onChange={(e) => setArea(e.target.value)} /><datalist id="p-areas">{departments.map((d) => <option key={d} value={d} />)}</datalist></Field>
        <Field label="Nombre autorizado (opcional)" htmlFor="p-name" hint="Solo si el participante autoriza su uso en los informes."><Input id="p-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></Field>
      </div>
    </Dialog>
  );
}

function AssignmentDialog({ participant, assessment, existing, onClose }: { participant: Participant; assessment: Parameters<typeof suggestedQuestionsFor>[0] & { id: string }; existing?: InterviewAssignment; onClose: () => void }) {
  const scope = questionsForAssessment(assessment);
  const suggestedDims = PROFILE_DIMENSIONS[participant.profile] ?? DIMENSIONS.map((d) => d.id);
  const [dims, setDims] = useState<DimensionId[]>(existing ? [...new Set(existing.questionIds.map((q) => q.slice(0, 3) as DimensionId))].filter((d) => !d.startsWith('CU')) : suggestedDims);
  const [shared, setShared] = useState(true);
  const [instructions, setInstructions] = useState(existing?.instructions ?? 'Responda según su conocimiento directo. Si desconoce una práctica, seleccione «No sabe».');
  const [due, setDue] = useState(existing?.dueDate ?? '');
  const ids = (() => {
    const set = new Set(scope.filter((q) => dims.includes(q.dimensionId)).map((q) => q.id));
    if (shared) SHARED_CORE.forEach((id) => assessment.questionIds.includes(id) && set.add(id));
    return scope.filter((q) => set.has(q.id)).map((q) => q.id);
  })();
  return (
    <Dialog wide open onOpenChange={(o) => !o && onClose()} title={`Asignación para ${participant.code}`} description={`Dimensiones sugeridas para ${PROFILE_LABEL[participant.profile]}: ${suggestedDims.join(', ')}. Todas las asignaciones pueden modificarse.`} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" disabled={!ids.length} onClick={async () => { await attempt(() => saveAssignment({ id: existing?.id, assessmentId: assessment.id, participantId: participant.id, questionIds: ids, instructions, dueDate: due }), 'Asignación guardada'); onClose(); }}>Guardar asignación ({ids.length})</Button></>}>
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {DIMENSIONS.map((d) => {
            const n = scope.filter((q) => q.dimensionId === d.id).length;
            return (
              <label key={d.id} className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${n ? 'border-line' : 'border-dashed border-line opacity-50'}`}>
                <input type="checkbox" disabled={!n} checked={dims.includes(d.id)} onChange={(e) => setDims((x) => (e.target.checked ? [...x, d.id] : x.filter((y) => y !== d.id)))} />
                <span><span className="font-medium">{d.id}</span> {d.name} <span className="text-xs text-muted num">({n})</span></span>
              </label>
            );
          })}
        </div>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={shared} onChange={(e) => setShared(e.target.checked)} /> Incluir el núcleo compartido de triangulación ({SHARED_CORE.filter((x) => assessment.questionIds.includes(x)).length} preguntas comunes a todos los perfiles).</label>
        <div className="grid gap-4 md:grid-cols-[1fr_200px]">
          <Field label="Instrucciones" htmlFor="asg-i"><Textarea id="asg-i" value={instructions} onChange={(e) => setInstructions(e.target.value)} /></Field>
          <Field label="Fecha de entrega (opcional)" htmlFor="asg-d"><Input id="asg-d" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
        </div>
        <p className="text-xs text-muted">El paquete incluye únicamente: identificadores, nombre autorizado de la organización, código y perfil del participante, preguntas asignadas, versión del banco, instrucciones, fechas y hash. No incluye respuestas de otras personas, presupuestos, hallazgos ni evidencias.</p>
      </div>
    </Dialog>
  );
}

function RevisionDecision({ id, diff, onDone }: { id: string; diff: RevisionDiff[]; onDone: () => void }) {
  const [note, setNote] = useState('');
  const show = (r: RevisionDiff['before']) => (!r ? '—' : r.value !== null ? `Nivel ${r.value}` : r.special ? SPECIAL_LABEL[r.special] : '—');
  return (
    <div className="space-y-4">
      {diff.length ? (
        <div className="max-h-80 overflow-auto rounded-md border border-line">
          <table className="table-pro"><thead><tr><th>Criterio</th><th>Vigente</th><th>Nueva revisión</th></tr></thead>
            <tbody>{diff.map((d) => <tr key={d.questionId}><td>{d.questionId}</td><td>{show(d.before)}</td><td className="font-medium">{show(d.after)}</td></tr>)}</tbody>
          </table>
        </div>
      ) : <p className="text-sm text-muted">La nueva revisión no presenta diferencias de nivel o estado.</p>}
      <Field label="Motivo de la decisión" htmlFor="rev-n" required><Textarea id="rev-n" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <div className="flex justify-end gap-2">
        <Button disabled={!note.trim()} onClick={async () => { await attempt(() => resolveRevision(id, false, note), 'Revisión descartada'); onDone(); }}>Conservar la vigente</Button>
        <Button variant="primary" disabled={!note.trim()} icon={<FileUp className="size-4" />} onClick={async () => { await attempt(() => resolveRevision(id, true, note), 'Nueva revisión vigente'); onDone(); }}>Adoptar nueva revisión</Button>
      </div>
    </div>
  );
}

