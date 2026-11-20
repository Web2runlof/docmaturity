import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, CircleDashed, Plus, Search, TriangleAlert } from 'lucide-react';
import type { Level } from '@/types/bank';
import { useAssessmentData } from '@/hooks/useAssessment';
import { useSettings } from '@/hooks/useAssessment';
import { Button, Callout, Field, Input, LevelTag, PageHeader, Section, Select, Tag, Textarea } from '@/components/ui';
import { LEVEL_NAMES, dimensionName, getSource } from '@/data/bank';
import { ALERT_LABEL, CONTRADICTION_RULES, type ValidationAlertKind } from '@/engine/triangulation';
import { EVIDENCE_LABEL, SPECIAL_LABEL, VALIDATED_EVIDENCE_LEVEL } from '@/engine/constants';
import { suggestNotApplicable } from '@/engine/applicability';
import type { QuestionState } from '@/engine/scoring';
import { deleteFinding, newEvidence, saveFinding, setApplicabilityDecision } from '@/services/repo';
import { attempt, attemptOk, notify } from '@/app/store';
import { cx, fmtScore, plainText, plural, todayISO } from '@/utils/core';
import { Loading, NotFound, PROFILE_LABEL } from '../common';
import { EvidenceDialog } from '../evidence/EvidencePage';
import type { Evidence } from '@/types/domain';

type Filter = 'todos' | 'pendientes' | 'validados' | ValidationAlertKind;

export default function ValidationDesk() {
  const { aid = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const { bundle, analysis, loading, missing } = useAssessmentData(aid);
  const [filter, setFilter] = useState<Filter>('todos');
  const [dim, setDim] = useState('');
  const [q, setQ] = useState('');
  const selected = params.get('q');
  const alertsBy = useMemo(() => {
    const m = new Map<string, ValidationAlertKind[]>();
    analysis?.alerts.forEach((a) => {
      if (!a.questionId) return;
      m.set(a.questionId, [...(m.get(a.questionId) ?? []), a.kind]);
      if (a.kind === 'contradiccion' && a.ruleId) {
        const rule = CONTRADICTION_RULES.find((r) => r.id === a.ruleId);
        if (rule) m.set(rule.b.questionId, [...(m.get(rule.b.questionId) ?? []), 'contradiccion']);
      }
    });
    return m;
  }, [analysis]);
  if (loading) return <Loading />;
  if (missing || !bundle || !analysis) return <NotFound />;
  const list = analysis.states.filter((s) => {
    if (dim && s.dimensionId !== dim) return false;
    if (q && !`${s.question.id} ${s.question.criterion}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === 'pendientes') return s.applicable && s.validated === null;
    if (filter === 'validados') return s.validated !== null;
    if (filter !== 'todos') return alertsBy.get(s.question.id)?.includes(filter);
    return true;
  });
  const current = analysis.states.find((s) => s.question.id === selected) ?? list[0];
  const select = (id: string) => setParams({ q: id });
  const lowCoverage = analysis.alerts.filter((a) => a.kind === 'baja_cobertura_dimension');

  return (
    <>
      <PageHeader eyebrow="Triangulación y consolidación" title="Mesa de validación" description="Contraste respuestas, evidencias y contradicciones. El nivel validado prevalece solo en los indicadores de madurez validada y nunca sobrescribe las respuestas originales." />
      {lowCoverage.length > 0 && <div className="mb-4"><Callout tone="warning" title="Dimensiones con baja cobertura">{lowCoverage.map((a) => `${a.dimensionId} (${a.message})`).join(' · ')}</Callout></div>}
      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Section>
          <div className="space-y-2">
            <div className="relative"><Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted" aria-hidden /><Input aria-label="Buscar criterio" placeholder="Buscar criterio" className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <div className="grid gap-2">
              <Select aria-label="Filtrar por estado o alerta" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
                <option value="todos">Todos</option><option value="pendientes">Pendientes de validar</option><option value="validados">Validados</option>
                {(Object.keys(ALERT_LABEL) as ValidationAlertKind[]).filter((k) => k !== 'baja_cobertura_dimension').map((k) => <option key={k} value={k}>{ALERT_LABEL[k]}</option>)}
              </Select>
              <Select aria-label="Filtrar por dimensión" value={dim} onChange={(e) => setDim(e.target.value)}><option value="">Todas las dimensiones</option>{analysis.dimensionIds.map((d) => <option key={d} value={d}>{d} · {dimensionName(d)}</option>)}</Select>
            </div>
            <p className="text-xs text-muted num">{plural(list.length, 'criterio', 'criterios')} · {analysis.coverage.validated} validados de {analysis.coverage.applicable} aplicables{analysis.lenses.insufficientEvidence.length ? ` · ${analysis.lenses.insufficientEvidence.length} sin evidencia suficiente` : ''}</p>
          </div>
          <ul className="mt-3 max-h-[68vh] divide-y divide-line overflow-y-auto">
            {list.map((s) => {
              const al = alertsBy.get(s.question.id) ?? [];
              return (
                <li key={s.question.id}>
                  <button onClick={() => select(s.question.id)} className={cx('flex w-full items-start gap-3 px-2 py-2.5 text-left', current?.question.id === s.question.id ? 'bg-teal-50/60' : 'hover:bg-slate-50')} aria-current={current?.question.id === s.question.id}>
                    {s.validated !== null ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-petrol" aria-label="Validado" /> : al.length ? <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-label="Con alertas" /> : <CircleDashed className="mt-0.5 size-4 shrink-0 text-nodata" aria-label="Pendiente" />}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm"><span className="font-medium text-navy">{s.question.id}</span> {s.question.criterion}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted num">
                        <span>Mediana {fmtScore(s.preliminary)}</span>
                        <span>n={s.stats?.n ?? 0}</span>
                        {s.stats && s.stats.n > 1 && <span>Rango {s.stats.range}</span>}
                        {!s.applicable && <span className="text-warning">No aplica (validado)</span>}
                        {s.insufficientEvidence && <Tag tone="warning">Validado sin evidencia suficiente</Tag>}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>
        {current ? <Detail key={current.question.id} s={current} aid={aid} alerts={alertsBy.get(current.question.id) ?? []} participants={bundle.participants.map((p) => ({ id: p.id, code: p.code }))} evidence={bundle.evidence.filter((e) => e.questionId === current.question.id)} org={bundle.organization} locked={bundle.assessment.status === 'finalizado'} contradictions={analysis.contradictions.filter((c) => c.rule.a.questionId === current.question.id || c.rule.b.questionId === current.question.id)} /> : <Section><p className="text-sm text-muted">Sin criterios para los filtros seleccionados.</p></Section>}
      </div>
    </>
  );
}

function Detail({ s, aid, alerts, participants, evidence, org, locked, contradictions }: {
  s: QuestionState; aid: string; alerts: ValidationAlertKind[]; participants: { id: string; code: string }[]; evidence: Evidence[];
  org: Parameters<typeof suggestNotApplicable>[1]; locked: boolean; contradictions: { rule: (typeof CONTRADICTION_RULES)[number]; scoreA: number; scoreB: number }[];
}) {
  const settings = useSettings();
  const q = s.question;
  const [level, setLevel] = useState<number | null>(s.finding?.finalLevel ?? (s.preliminary === null ? null : Math.round(s.preliminary)));
  const [just, setJust] = useState(s.finding?.justification ?? '');
  const [evaluator, setEvaluator] = useState(s.finding?.evaluator ?? settings?.evaluatorName ?? '');
  const [date, setDate] = useState(s.finding?.date ?? todayISO());
  const [resolved, setResolved] = useState(s.finding?.contradictionsResolved ?? '');
  const [evIds, setEvIds] = useState<string[]>(s.finding?.evidenceIds ?? []);
  const [naJust, setNaJust] = useState(s.naDecision?.justification ?? '');
  const [ev, setEv] = useState<Evidence | null>(null);
  const naSuggestion = suggestNotApplicable(q, org);
  const max = Math.max(1, ...(s.stats?.distribution ?? [0]));
  const weakEvidence = level !== null && level >= VALIDATED_EVIDENCE_LEVEL && (s.evidenceStatus === 'E0' || s.evidenceStatus === 'E1');

  return (
    <div className="space-y-6">
      <Section>
        <p className="eyebrow">{q.dimensionId} · {dimensionName(q.dimensionId)} · componente MGDA: {q.mgdaComponent}</p>
        <h2 className="mt-2 text-lg font-semibold">{q.id} · {q.criterion}</h2>
        <p className="mt-2 text-sm text-ink">{q.question}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {q.isCritical && <Tag tone="danger">Criterio crítico</Tag>}
          {alerts.map((a, i) => <Tag key={`${a}-${i}`} tone="warning">{ALERT_LABEL[a]}</Tag>)}
          <Tag>{q.sourceRefs.map((r) => getSource(r)?.shortLabel ?? r).join(' · ')}</Tag>
        </div>
        <div className="mt-5 grid gap-6 border-t border-line pt-5 md:grid-cols-[1fr_1fr_1.2fr]">
          <div><p className="text-xs text-muted">Nivel percibido (mediana)</p><div className="mt-1"><LevelTag score={s.preliminary} /></div><p className="mt-1 text-xs text-muted num">Media {fmtScore(s.stats?.mean ?? null)} · DE {fmtScore(s.stats?.sd ?? null)}</p></div>
          <div><p className="text-xs text-muted">Nivel validado</p><div className="mt-1"><LevelTag score={s.validated} /></div>{s.insufficientEvidence && <div className="mt-1"><Tag tone="warning">Validado sin evidencia suficiente</Tag></div>}<p className="mt-1 text-xs text-muted">Evidencia: {s.evidenceStatus} · {EVIDENCE_LABEL[s.evidenceStatus]}</p></div>
          <div>
            <p className="mb-1 text-xs text-muted">Distribución de respuestas ({s.stats?.n ?? 0} participantes, {s.stats?.profiles ?? 0} perfiles)</p>
            <div className="flex h-14 items-end gap-1" role="img" aria-label={`Distribución: ${(s.stats?.distribution ?? [0, 0, 0, 0, 0, 0]).map((v, i) => `nivel ${i}: ${v}`).join(', ')}`}>
              {(s.stats?.distribution ?? [0, 0, 0, 0, 0, 0]).map((v, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1"><div className="w-full rounded-t-sm bg-petrol/80" style={{ height: `${(v / max) * 40}px` }} /><span className="text-[0.65rem] text-muted num">{i}</span></div>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted">Acuerdo: {s.agreement === null ? 'No evaluable (menos de dos participantes)' : fmtScore(s.agreement)}</p>
          </div>
        </div>
      </Section>

      <Section title="Respuestas por participante">
        {s.answers.length ? (
          <div className="overflow-x-auto"><table className="table-pro">
            <thead><tr><th>Participante</th><th>Perfil</th><th>Área</th><th>Respuesta</th><th>Observación</th><th>Evidencia reportada</th></tr></thead>
            <tbody>{s.answers.map((a) => (
              <tr key={a.participantId}><td className="font-medium">{a.code}{a.flagged && <Tag tone="gold">revisar</Tag>}</td><td className="text-muted">{PROFILE_LABEL[a.profile as keyof typeof PROFILE_LABEL] ?? a.profile}</td><td className="text-muted">{a.area || '—'}</td><td>{a.value !== null ? <LevelTag score={a.value} size="sm" /> : <span className="text-xs text-muted">{a.special ? SPECIAL_LABEL[a.special] : '—'}</span>}</td><td className="max-w-xs text-xs">{a.note || '—'}</td><td className="max-w-xs text-xs">{a.reportedEvidence || '—'}</td></tr>
            ))}</tbody>
          </table></div>
        ) : <p className="text-sm text-muted">Ningún participante ha respondido este criterio. La falta de asignación no se interpreta como desconocimiento.</p>}
      </Section>

      {contradictions.length > 0 && (
        <Section title="Contradicciones con otros criterios" description="Hipótesis que requieren revisión; ninguna respuesta se modifica automáticamente.">
          <ul className="space-y-3 text-sm">{contradictions.map((c) => <li key={c.rule.id}><p className="font-medium text-navy">{c.rule.title}</p><p className="mt-0.5">{c.rule.message}</p><p className="mt-1 text-xs text-muted">{c.rule.a.questionId}: {fmtScore(c.scoreA)} · {c.rule.b.questionId}: {fmtScore(c.scoreB)}</p></li>)}</ul>
        </Section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Evidencias del criterio" actions={<Button size="sm" disabled={locked} icon={<Plus className="size-3.5" />} onClick={() => setEv(newEvidence(aid, q.id))}>Registrar</Button>}>
          {evidence.length ? <ul className="space-y-2 text-sm">{evidence.map((e) => <li key={e.id} className="flex items-start justify-between gap-2"><span><span className="font-medium">{e.title}</span><span className="block text-xs text-muted">{e.reference} · {e.status} {EVIDENCE_LABEL[e.status]}</span></span><Button size="sm" variant="ghost" disabled={locked} onClick={() => setEv(e)}>Revisar</Button></li>)}</ul> : <p className="text-sm text-muted">Sin evidencias. Sugeridas: {q.evidenceSuggestions.slice(0, 3).join('; ')}.</p>}
          <p className="mt-3 border-t border-line pt-3 text-xs text-muted">{q.validationGuidance}</p>
        </Section>
        <Section title="No aplicabilidad" description="Solo la no aplicabilidad validada excluye el criterio del universo aplicable.">
          {s.proposedNA > 0 && <p className="mb-2 text-sm">{plural(s.proposedNA, 'participante propuso', 'participantes propusieron')} «No aplica».</p>}
          {naSuggestion && <p className="mb-2 text-xs text-warning">{naSuggestion}</p>}
          {s.naDecision ? (
            <div className="space-y-2 text-sm"><Tag tone="warning">Validada por {s.naDecision.reviewer} el {s.naDecision.date}</Tag><p className="text-muted">{s.naDecision.justification}</p><Button size="sm" disabled={locked} onClick={() => attempt(() => setApplicabilityDecision({ assessmentId: aid, questionId: q.id, remove: true }), 'No aplicabilidad retirada')}>Retirar decisión</Button></div>
          ) : (
            <div className="space-y-2">
              <Field label="Justificación (perfil organizacional y contexto)" htmlFor="na-j"><Textarea id="na-j" rows={2} value={naJust} onChange={(e) => setNaJust(e.target.value)} /></Field>
              <Button size="sm" disabled={locked || !naJust.trim() || !evaluator.trim()} onClick={() => attempt(() => setApplicabilityDecision({ assessmentId: aid, questionId: q.id, status: 'validado', justification: plainText(naJust, 1000), profileContext: naSuggestion ?? '', reviewer: evaluator, date: todayISO() }), 'No aplicabilidad validada')}>Validar no aplicabilidad</Button>
              {!evaluator.trim() && <p className="text-xs text-muted">Indique el evaluador en el formulario de validación.</p>}
            </div>
          )}
        </Section>
      </div>

      <Section title="Validación del evaluador" description="Asigne un nivel final entero entre 0 y 5. Se registran el valor preliminar, el final, la justificación, las evidencias y las contradicciones resueltas.">
        {!s.applicable ? <Callout tone="info">El criterio está excluido por no aplicabilidad validada.</Callout> : (
          <div className="space-y-4">
            <fieldset disabled={locked}>
              <legend className="mb-2 text-sm font-medium">Nivel final</legend>
              <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
                {[0, 1, 2, 3, 4, 5].map((l) => (
                  <label key={l} className={cx('cursor-pointer rounded-md border px-2 py-2 text-center text-sm', level === l ? 'border-petrol bg-teal-50 font-semibold text-navy' : 'border-line hover:border-slate-300')}>
                    <input type="radio" name="final" className="sr-only" checked={level === l} onChange={() => setLevel(l)} />
                    <span className="block font-display text-lg num">{l}</span><span className="block text-[0.68rem] text-muted">{LEVEL_NAMES[l]}</span>
                  </label>
                ))}
              </div>
              {level !== null && <p className="mt-2 text-xs text-muted">{q.maturityDescriptors[level]}</p>}
            </fieldset>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Justificación" htmlFor="v-j" required><Textarea id="v-j" value={just} onChange={(e) => setJust(e.target.value)} disabled={locked} /></Field>
              <Field label="Contradicciones resueltas" htmlFor="v-c"><Textarea id="v-c" value={resolved} onChange={(e) => setResolved(e.target.value)} disabled={locked} /></Field>
              <Field label="Evaluador" htmlFor="v-e" required><Input id="v-e" value={evaluator} onChange={(e) => setEvaluator(e.target.value)} disabled={locked} /></Field>
              <Field label="Fecha" htmlFor="v-d"><Input id="v-d" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={locked} /></Field>
            </div>
            {evidence.length > 0 && (
              <fieldset disabled={locked}><legend className="mb-1 text-sm font-medium">Evidencia asociada</legend>
                <div className="flex flex-wrap gap-3">{evidence.map((e) => <label key={e.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={evIds.includes(e.id)} onChange={(x) => setEvIds((ids) => (x.target.checked ? [...ids, e.id] : ids.filter((i) => i !== e.id)))} />{e.title} ({e.status})</label>)}</div>
              </fieldset>
            )}
            {weakEvidence && <Callout tone="warning" title="Validado sin evidencia suficiente">La evidencia actual del criterio es {s.evidenceStatus} ({EVIDENCE_LABEL[s.evidenceStatus].toLowerCase()}). Si valida en nivel {VALIDATED_EVIDENCE_LEVEL} o superior, el criterio se marcará «Validado sin evidencia suficiente» en la mesa, los resultados y el informe, y no contará en «Capacidades sustentadas con evidencia». Registre o revise evidencia E2 o E3 para sustentarlo.</Callout>}
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" disabled={locked || level === null || !just.trim() || !evaluator.trim()} onClick={async () => { const ok = await attemptOk(() => saveFinding({ assessmentId: aid, questionId: q.id, preliminaryValue: s.preliminary, finalLevel: level as Level, justification: plainText(just, 3000), evidenceIds: evIds, evaluator: plainText(evaluator, 120), date, contradictionsResolved: plainText(resolved, 2000) }), weakEvidence ? undefined : 'Criterio validado'); if (ok && weakEvidence) notify('warning', 'Criterio validado sin evidencia suficiente', `${q.id} queda marcado y no cuenta en «Capacidades sustentadas con evidencia».`); }}>{s.finding ? 'Actualizar validación' : 'Validar criterio'}</Button>
              {s.finding && <Button disabled={locked} onClick={() => attempt(() => deleteFinding(aid, q.id), 'Validación retirada')}>Retirar validación</Button>}
            </div>
          </div>
        )}
      </Section>
      {ev && <EvidenceDialog evidence={ev} questionIds={[q.id]} participants={participants} onClose={() => setEv(null)} />}
    </div>
  );
}
