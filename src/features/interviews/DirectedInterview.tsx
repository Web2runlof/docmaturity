import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { NotebookPen } from 'lucide-react';
import { db } from '@/database/db';
import { lookupQuestion, questionsForAssessment } from '@/data/bank';
import { setInterviewStatus, skipSection, updateInterviewNotes, upsertResponse } from '@/services/repo';
import { suggestNotApplicable } from '@/engine/applicability';
import { Button, Dialog, Field, Textarea } from '@/components/ui';
import type { Question } from '@/types/bank';
import type { ResponseData } from '@/types/domain';
import { attempt, notify } from '@/app/store';
import { Questionnaire } from '../questionnaire/Questionnaire';
import { Loading, NotFound, PROFILE_LABEL } from '../common';

export default function DirectedInterview() {
  const { aid = '', iid = '' } = useParams();
  const nav = useNavigate();
  const data = useLiveQuery(async () => {
    const interview = await db.interviews.get(iid);
    if (!interview) return null;
    const [assessment, participant, responses] = await Promise.all([db.assessments.get(aid), db.participants.get(interview.participantId), db.responses.where('interviewId').equals(iid).toArray()]);
    if (!assessment || !participant) return null;
    const org = await db.organizations.get(assessment.organizationId);
    const assignment = interview.assignmentId ? await db.assignments.get(interview.assignmentId) : undefined;
    return { interview, assessment, participant, responses, org, assignment };
  }, [aid, iid]);
  const [notesOpen, setNotesOpen] = useState(false);
  const questions = useMemo<Question[]>(() => {
    if (!data) return [];
    const ids = data.assignment?.questionIds ?? questionsForAssessment(data.assessment).map((q) => q.id);
    return ids.map((id) => lookupQuestion(id, data.assessment.customQuestions)).filter((q): q is Question => Boolean(q));
  }, [data]);
  if (data === undefined) return <Loading />;
  if (data === null) return <div className="p-8"><NotFound what="La entrevista" /></div>;
  const responses: Record<string, ResponseData> = Object.fromEntries(data.responses.map((r) => [r.questionId, r]));
  const locked = data.assessment.status === 'finalizado' || data.assessment.status === 'archivado';
  const exit = () => nav(`/app/evaluaciones/${aid}/entrevistas`);

  return (
    <>
      <Questionnaire
        questions={questions}
        responses={responses}
        context={{ organization: data.org?.shortName || data.org?.name || '', assessment: data.assessment.name, profile: PROFILE_LABEL[data.participant.profile], participant: `Entrevista dirigida · ${data.participant.code}` }}
        onSave={async (qid, patch) => {
          if (locked) throw new Error('La evaluación está finalizada.');
          if (data.interview.status === 'finalizada') await setInterviewStatus(iid, 'en_curso');
          await upsertResponse(data.interview, qid, patch);
        }}
        onSkipSection={(ids) => skipSection(data.interview, ids)}
        onExit={exit}
        onFinish={async () => { await attempt(() => setInterviewStatus(iid, 'finalizada'), 'Entrevista finalizada'); exit(); }}
        finished={locked}
        naHint={data.org ? (q) => suggestNotApplicable(q, data.org!) : undefined}
        extraActions={<Button size="sm" variant="ghost" icon={<NotebookPen className="size-3.5" />} onClick={() => setNotesOpen(true)}>Notas del evaluador</Button>}
      />
      <InterviewNotes open={notesOpen} onOpenChange={setNotesOpen} interview={data.interview} />
    </>
  );
}

function InterviewNotes({ open, onOpenChange, interview }: { open: boolean; onOpenChange: (o: boolean) => void; interview: { id: string; notes: string; contradictionsNoted: string; additionalFindings: string } }) {
  const [notes, setNotes] = useState(interview.notes);
  const [contr, setContr] = useState(interview.contradictionsNoted);
  const [find, setFind] = useState(interview.additionalFindings);
  return (
    <Dialog wide open={open} onOpenChange={onOpenChange} title="Notas del evaluador" description="Aclaraciones, contradicciones y hallazgos adicionales registrados durante la entrevista dirigida." footer={<Button variant="primary" onClick={async () => { await updateInterviewNotes(interview.id, { notes, contradictionsNoted: contr, additionalFindings: find }); notify('success', 'Notas guardadas'); onOpenChange(false); }}>Guardar notas</Button>}>
      <div className="grid gap-4">
        <Field label="Observaciones y aclaraciones" htmlFor="n1"><Textarea id="n1" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <Field label="Contradicciones percibidas" htmlFor="n2"><Textarea id="n2" rows={3} value={contr} onChange={(e) => setContr(e.target.value)} /></Field>
        <Field label="Hallazgos adicionales" htmlFor="n3"><Textarea id="n3" rows={3} value={find} onChange={(e) => setFind(e.target.value)} /></Field>
      </div>
    </Dialog>
  );
}
