import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Download, FileInput, Trash2 } from 'lucide-react';
import { db } from '@/database/db';
import { Button, Callout, ConfirmDialog, FileDrop, Section, Tag } from '@/components/ui';
import { lookupQuestion } from '@/data/bank';
import { buildInterviewPackage, importAssignmentPackage, saveRespondentResponse } from '@/services/packages';
import { PACKAGE_LIMITS } from '@/schemas/packages';
import { LOCAL_DATA_NOTICE } from '@/config/vocabulary';
import { notify } from '@/app/store';
import type { Question } from '@/types/bank';
import { fmtDate, readFileText, slugify } from '@/utils/core';
import { Questionnaire } from '../questionnaire/Questionnaire';
import { Loading, PROFILE_LABEL } from '../common';
import { ExportDialog } from '../shared/ExportDialog';

export function RespondentHome() {
  const nav = useNavigate();
  const sessions = useLiveQuery(() => db.respondentSessions.orderBy('updatedAt').reverse().toArray(), []);
  const [del, setDel] = useState<string | null>(null);
  const onFile = async (f: File) => {
    try {
      const text = await readFileText(f, PACKAGE_LIMITS.assignment);
      const r = await importAssignmentPackage(text);
      notify('success', r.resumed ? 'Entrevista reanudada' : 'Entrevista importada', r.bankWarning ?? undefined);
      nav(`/responder/${r.session.id}`);
    } catch (e) {
      notify('error', 'No fue posible abrir la asignación', (e as Error).message);
    }
  };
  return (
    <div className="mx-auto max-w-4xl px-5 py-14 md:px-8">
      <p className="eyebrow">Modo entrevistado</p>
      <h1 className="mt-2 text-3xl font-semibold">Responder una entrevista</h1>
      <p className="mt-3 max-w-2xl text-muted">Importe el archivo de asignación (.dm-assignment.json) que recibió del equipo evaluador. Sus respuestas se guardan en este navegador; al terminar, exporte el archivo de resultados y envíelo por el canal autorizado. Nada se envía automáticamente.</p>
      <div className="mt-8 grid gap-6 md:grid-cols-[1.2fr_1fr]">
        <Section title="Importar asignación">
          <FileDrop accept=".json,application/json" onFile={onFile} label="Seleccione o arrastre su archivo de asignación" hint="Se verifica su integridad antes de abrirlo." />
          <p className="mt-3 text-xs text-muted">Si ya había comenzado, importar el mismo archivo reanuda la entrevista sin perder sus respuestas.</p>
        </Section>
        <Callout tone="info" title="Antes de comenzar">
          <ul className="mt-1 list-disc space-y-1 pl-4">
            <li>Responda solo lo que conoce: puede marcar «No sabe».</li>
            <li>No incluya datos personales ni información reservada en las observaciones.</li>
            <li>{LOCAL_DATA_NOTICE.short}</li>
          </ul>
        </Callout>
      </div>
      <Section title="Entrevistas en este dispositivo" className="mt-8">
        {!sessions ? <Loading /> : !sessions.length ? <p className="text-sm text-muted">No hay entrevistas importadas en este navegador.</p> : (
          <ul className="divide-y divide-line">
            {sessions.map((s) => {
              const answered = Object.values(s.responses).filter((r) => r.value !== null || r.special).length;
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-navy">{s.assessmentName}</p>
                    <p className="text-xs text-muted">{s.organizationName} · {s.participantCode} · {PROFILE_LABEL[s.profile]} · {answered}/{s.questionIds.length} · {fmtDate(s.updatedAt, true)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag tone={s.status === 'finalizada' ? 'teal' : 'neutral'}>{s.status === 'finalizada' ? 'Finalizada' : 'En curso'}</Tag>
                    <Link to={`/responder/${s.id}`}><Button size="sm" variant="primary" icon={<FileInput className="size-3.5" />}>{s.status === 'finalizada' ? 'Consultar' : 'Continuar'}</Button></Link>
                    <Button size="sm" variant="ghost" icon={<Trash2 className="size-3.5" />} aria-label="Eliminar entrevista de este dispositivo" onClick={() => setDel(s.id)} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
      <ConfirmDialog open={Boolean(del)} onOpenChange={(o) => !o && setDel(null)} danger title="Eliminar entrevista de este dispositivo" description="Si no exportó sus respuestas, se perderán. El equipo evaluador no recibe ninguna notificación." confirmLabel="Eliminar" onConfirm={async () => { if (del) await db.respondentSessions.delete(del); }} />
    </div>
  );
}

export function RespondentSessionPage() {
  const { sid = '' } = useParams();
  const nav = useNavigate();
  const session = useLiveQuery(() => db.respondentSessions.get(sid).then((s) => s ?? null), [sid]);
  const [exp, setExp] = useState(false);
  const questions = useMemo<Question[]>(() => (session ? session.questionIds.map((id) => lookupQuestion(id, session.customQuestions)).filter((q): q is Question => Boolean(q)) : []), [session]);
  if (session === undefined) return <Loading />;
  if (session === null) return <div className="p-8"><Callout tone="warning">La entrevista no existe en este navegador. <Link to="/responder" className="underline">Importe su asignación</Link>.</Callout></div>;
  const fileName = `${slugify(session.assessmentName)}-${slugify(session.participantCode)}.dm-interview.json`;
  return (
    <>
      <Questionnaire
        questions={questions}
        responses={session.responses}
        context={{ organization: session.organizationName, assessment: session.assessmentName, profile: PROFILE_LABEL[session.profile], participant: session.participantCode }}
        onSave={async (qid, patch) => {
          if (session.status === 'finalizada') await db.respondentSessions.update(sid, { status: 'en_curso' });
          await saveRespondentResponse(sid, qid, patch);
        }}
        onSkipSection={async (ids) => {
          let n = 0;
          for (const id of ids) {
            const r = session.responses[id];
            if (!r || (r.value === null && !r.special)) { await saveRespondentResponse(sid, id, { special: 'OMITIDA' }); n += 1; }
          }
          return n;
        }}
        onExit={() => nav('/responder')}
        onFinish={async () => { await db.respondentSessions.update(sid, { status: 'finalizada' }); setExp(true); }}
        extraActions={<Button size="sm" icon={<Download className="size-3.5" />} onClick={() => setExp(true)}>Exportar respuestas</Button>}
      />
      <ExportDialog open={exp} onOpenChange={setExp} title="Exportar entrevista" fileName={fileName} payloadFormat="docmaturity.interview" build={() => buildInterviewPackage(sid)}
        note="Envíe el archivo al responsable del diagnóstico por un canal autorizado. Cada exportación genera una revisión numerada; si corrige respuestas, exporte nuevamente." />
    </>
  );
}
