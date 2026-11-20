import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { FileCheck2, Paperclip, Plus, Trash2 } from 'lucide-react';
import type { Evidence, EvidenceStatus } from '@/types/domain';
import { useAssessmentData } from '@/hooks/useAssessment';
import { Button, Callout, ConfirmDialog, Dialog, EmptyState, Field, Input, PageHeader, Section, Select, Tag, Textarea } from '@/components/ui';
import { EVIDENCE_LABEL } from '@/engine/constants';
import { MAX_ATTACHMENT_BYTES, deleteEvidence, newEvidence, saveEvidence } from '@/services/repo';
import { attempt, attemptOk } from '@/app/store';
import { downloadBlob, fmtBytes, plainText } from '@/utils/core';
import { Loading, NotFound } from '../common';

const STATUSES: EvidenceStatus[] = ['E0', 'E1', 'E2', 'E3'];
const TONE: Record<EvidenceStatus, 'neutral' | 'warning' | 'info' | 'teal'> = { E0: 'neutral', E1: 'warning', E2: 'info', E3: 'teal' };

export default function EvidencePage() {
  const { aid = '' } = useParams();
  const [params] = useSearchParams();
  const { bundle, analysis, loading, missing } = useAssessmentData(aid);
  const [edit, setEdit] = useState<Evidence | null>(null);
  const [del, setDel] = useState<Evidence | null>(null);
  const [filter, setFilter] = useState<'all' | EvidenceStatus>('all');
  const list = useMemo(() => (bundle?.evidence ?? []).filter((e) => filter === 'all' || e.status === filter).sort((a, b) => a.questionId.localeCompare(b.questionId)), [bundle, filter]);
  if (loading) return <Loading />;
  if (missing || !bundle || !analysis) return <NotFound />;
  const locked = bundle.assessment.status === 'finalizado';
  const reported = analysis.states.filter((s) => s.answers.some((a) => a.reportedEvidence.trim()) && s.evidenceCount === 0);

  return (
    <>
      <PageHeader eyebrow="Soporte de evidencias" title="Evidencias" description="Registre referencias a documentos en lugar de almacenar documentos completos. Solo el responsable del diagnóstico asigna el estado E3 tras revisar la evidencia." actions={<Button variant="primary" disabled={locked} icon={<Plus className="size-4" />} onClick={() => setEdit(newEvidence(aid, params.get('q') ?? analysis.states[0]?.question.id ?? ''))}>Registrar evidencia</Button>} />
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        {STATUSES.map((s) => (
          <div key={s} className="panel px-4 py-3"><div className="text-xs text-muted">{s} · {EVIDENCE_LABEL[s]}</div><div className="mt-1 font-display text-2xl font-semibold text-navy num">{analysis.evidence.byStatus[s]}</div><div className="text-xs text-muted">criterios aplicables</div></div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Section title="Registro de evidencias" actions={<Select aria-label="Filtrar por estado" className="w-52" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}><option value="all">Todos los estados</option>{STATUSES.map((s) => <option key={s} value={s}>{s} · {EVIDENCE_LABEL[s]}</option>)}</Select>}>
          {!list.length ? <EmptyState icon={<FileCheck2 className="size-7" />} title="Sin evidencias registradas" description="Las evidencias sustentan el nivel validado de cada criterio y se muestran separadamente de la madurez." /> : (
            <div className="overflow-x-auto">
              <table className="table-pro">
                <thead><tr><th>Criterio</th><th>Evidencia</th><th>Estado</th><th>Revisión</th><th /></tr></thead>
                <tbody>
                  {list.map((e) => (
                    <tr key={e.id}>
                      <td className="font-medium text-navy">{e.questionId}</td>
                      <td><div>{e.title || 'Sin título'}</div><div className="text-xs text-muted">{e.reference}{e.attachment && <span className="ml-2 inline-flex items-center gap-1"><Paperclip className="size-3" />{e.attachment.name} ({fmtBytes(e.attachment.size)})</span>}</div></td>
                      <td><Tag tone={TONE[e.status]}>{e.status} · {EVIDENCE_LABEL[e.status]}</Tag></td>
                      <td className="text-xs text-muted">{e.reviewer || '—'}{e.reviewResult && <div className="max-w-xs">{e.reviewResult}</div>}</td>
                      <td><div className="flex justify-end gap-1">
                        {e.attachment && <Button size="sm" variant="ghost" onClick={() => downloadBlob(e.attachment!.data, e.attachment!.name)}>Abrir</Button>}
                        <Button size="sm" disabled={locked} onClick={() => setEdit(e)}>Editar</Button>
                        <Button size="sm" variant="ghost" disabled={locked} icon={<Trash2 className="size-3.5" />} aria-label="Eliminar evidencia" onClick={() => setDel(e)} />
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
        <div className="space-y-6">
          <Section title="Evidencias reportadas sin registrar" description="Los participantes mencionaron evidencias en estos criterios. Una declaración del entrevistado no convierte la respuesta en verificada.">
            {reported.length ? (
              <ul className="space-y-3 text-sm">
                {reported.slice(0, 15).map((s) => (
                  <li key={s.question.id} className="border-b border-line pb-2 last:border-0">
                    <div className="flex items-center justify-between gap-2"><span className="font-medium text-navy">{s.question.id}</span><Button size="sm" variant="subtle" disabled={locked} onClick={() => setEdit(newEvidence(aid, s.question.id, { title: s.answers.find((a) => a.reportedEvidence)?.reportedEvidence.slice(0, 120) ?? '', status: 'E1', source: 'Reportada por participante' }))}>Registrar</Button></div>
                    <p className="text-xs text-muted">{s.answers.filter((a) => a.reportedEvidence).map((a) => `${a.code}: ${a.reportedEvidence}`).join(' · ').slice(0, 220)}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">No hay evidencias reportadas pendientes de registro.</p>}
          </Section>
          <Callout tone="warning" title="Información sensible">No adjunte historias clínicas, expedientes reservados, credenciales ni información personal innecesaria. Los adjuntos son opcionales, se limitan a 5 MB y permanecen solo en este navegador.</Callout>
        </div>
      </div>
      {edit && <EvidenceDialog evidence={edit} questionIds={analysis.states.map((s) => s.question.id)} participants={bundle.participants.map((p) => ({ id: p.id, code: p.code }))} onClose={() => setEdit(null)} />}
      <ConfirmDialog open={Boolean(del)} onOpenChange={(o) => !o && setDel(null)} danger title="Eliminar evidencia" confirmLabel="Eliminar" onConfirm={async () => { if (del) await attempt(() => deleteEvidence(del.id), 'Evidencia eliminada'); }} />
    </>
  );
}

export function EvidenceDialog({ evidence, questionIds, participants, onClose }: { evidence: Evidence; questionIds: string[]; participants: { id: string; code: string }[]; onClose: () => void }) {
  const [e, setE] = useState<Evidence>(evidence);
  const [fileError, setFileError] = useState('');
  const set = (patch: Partial<Evidence>) => setE((x) => ({ ...x, ...patch }));
  const onFile = (f: File) => {
    setFileError('');
    if (f.size > MAX_ATTACHMENT_BYTES) return setFileError('El archivo supera 5 MB. Registre una referencia al documento.');
    set({ attachment: { name: f.name, type: f.type || 'application/octet-stream', size: f.size, data: f }, fileName: f.name });
  };
  return (
    <Dialog wide open onOpenChange={(o) => !o && onClose()} title="Evidencia" footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" disabled={!e.questionId || !e.title.trim()} onClick={async () => { const ok = await attemptOk(() => saveEvidence({ ...e, title: plainText(e.title, 300), reviewResult: plainText(e.reviewResult, 2000) }), 'Evidencia guardada'); if (ok) onClose(); }}>Guardar</Button></>}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Criterio" htmlFor="ev-q" required><Select id="ev-q" value={e.questionId} onChange={(x) => set({ questionId: x.target.value })}>{questionIds.map((q) => <option key={q} value={q}>{q}</option>)}</Select></Field>
        <Field label="Estado" htmlFor="ev-s" hint="E3 requiere revisión del responsable del diagnóstico."><Select id="ev-s" value={e.status} onChange={(x) => set({ status: x.target.value as EvidenceStatus })}>{STATUSES.map((s) => <option key={s} value={s}>{s} · {EVIDENCE_LABEL[s]}</option>)}</Select></Field>
        <Field label="Título" htmlFor="ev-t" required><Input id="ev-t" value={e.title} onChange={(x) => set({ title: x.target.value })} /></Field>
        <Field label="Referencia documental" htmlFor="ev-r" hint="Código, radicado, ruta o ubicación del documento."><Input id="ev-r" value={e.reference} onChange={(x) => set({ reference: x.target.value })} /></Field>
        <Field label="Fecha del documento" htmlFor="ev-d"><Input id="ev-d" type="date" value={e.date} onChange={(x) => set({ date: x.target.value })} /></Field>
        <Field label="Fuente" htmlFor="ev-f"><Input id="ev-f" value={e.source} onChange={(x) => set({ source: x.target.value })} /></Field>
        <Field label="Participante que la reporta" htmlFor="ev-p"><Select id="ev-p" value={e.participantId ?? ''} onChange={(x) => set({ participantId: x.target.value || null })}><option value="">Ninguno</option>{participants.map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}</Select></Field>
        <Field label="Responsable de revisión" htmlFor="ev-rv"><Input id="ev-rv" value={e.reviewer} onChange={(x) => set({ reviewer: x.target.value })} /></Field>
        <Field label="Alcance de la muestra" htmlFor="ev-m"><Input id="ev-m" value={e.sampleScope} onChange={(x) => set({ sampleScope: x.target.value })} /></Field>
        <Field label="Restricciones de acceso" htmlFor="ev-a"><Input id="ev-a" value={e.accessRestrictions} onChange={(x) => set({ accessRestrictions: x.target.value })} /></Field>
        <div className="md:col-span-2"><Field label="Resultado de la revisión" htmlFor="ev-rr"><Textarea id="ev-rr" value={e.reviewResult} onChange={(x) => set({ reviewResult: x.target.value })} /></Field></div>
        <div className="md:col-span-2">
          <p className="mb-1 text-sm font-medium">Adjunto local (opcional, máximo 5 MB)</p>
          {e.attachment ? <div className="flex items-center gap-3 text-sm"><Paperclip className="size-4" />{e.attachment.name} · {fmtBytes(e.attachment.size)}<Button size="sm" variant="ghost" onClick={() => set({ attachment: null })}>Quitar</Button></div> : <input type="file" aria-label="Adjuntar archivo" onChange={(x) => { const f = x.target.files?.[0]; if (f) onFile(f); }} className="text-sm" />}
          {fileError && <p className="mt-1 text-xs text-danger" role="alert">{fileError}</p>}
        </div>
      </div>
    </Dialog>
  );
}
