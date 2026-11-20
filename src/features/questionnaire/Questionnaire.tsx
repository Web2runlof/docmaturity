/**
 * Cuestionario profesional compartido por la entrevista dirigida y el modo entrevistado.
 * No obliga a responder preguntas desconocidas, permite volver y cambiar respuestas,
 * y no incluye elementos de gamificación que incentiven niveles altos.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, Check, CircleHelp, Flag, LogOut, SkipForward } from 'lucide-react';
import type { Question } from '@/types/bank';
import type { ResponseData, SpecialCode } from '@/types/domain';
import { Button, Callout, Dialog, Progress, Tip } from '@/components/ui';
import { GLOSSARY, dimensionName, getSource, LEVEL_NAMES } from '@/data/bank';
import { SPECIAL_LABEL } from '@/engine/constants';
import { cx } from '@/utils/core';

export interface QuestionnaireContext {
  organization: string;
  assessment: string;
  profile: string;
  participant: string;
}

export interface QuestionnaireProps {
  questions: Question[];
  responses: Record<string, ResponseData | undefined>;
  context: QuestionnaireContext;
  onSave: (questionId: string, patch: Partial<ResponseData>) => Promise<void>;
  onSkipSection: (questionIds: string[]) => Promise<number>;
  onExit: () => void;
  onFinish: () => Promise<void>;
  finished?: boolean;
  extraActions?: ReactNode;
  naHint?: (q: Question) => string | null;
}

type SaveState = { state: 'idle' | 'saving' | 'saved' | 'error'; at?: Date; message?: string };

const statusOf = (r?: ResponseData) => (!r ? 'pendiente' : r.value !== null ? 'respondida' : r.special === 'PENDIENTE' || !r.special ? 'pendiente' : r.special);

export function Questionnaire({ questions, responses, context, onSave, onSkipSection, onExit, onFinish, finished, extraActions, naHint }: QuestionnaireProps) {
  const [index, setIndex] = useState(() => Math.max(0, questions.findIndex((q) => statusOf(responses[q.id]) === 'pendiente')));
  const [save, setSave] = useState<SaveState>({ state: 'idle' });
  const [skipDim, setSkipDim] = useState<string | null>(null);
  const [summary, setSummary] = useState(false);
  const q = questions[Math.min(index, questions.length - 1)];
  const r = q ? responses[q.id] : undefined;
  const [note, setNote] = useState(r?.note ?? '');
  const [evidence, setEvidence] = useState(r?.reportedEvidence ?? '');
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setNote(responses[q?.id]?.note ?? '');
    setEvidence(responses[q?.id]?.reportedEvidence ?? '');
    headingRef.current?.focus({ preventScroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q?.id]);

  const groups = useMemo(() => {
    const m = new Map<string, Question[]>();
    questions.forEach((x) => m.set(x.dimensionId, [...(m.get(x.dimensionId) ?? []), x]));
    return [...m.entries()];
  }, [questions]);

  const counts = useMemo(() => {
    const c = { respondida: 0, NO_SABE: 0, NO_APLICA_PROPUESTO: 0, OMITIDA: 0, pendiente: 0, flagged: 0, evidence: 0 };
    for (const x of questions) {
      const s = statusOf(responses[x.id]);
      if (s === 'respondida') c.respondida += 1; else if (s === 'NO_SABE') c.NO_SABE += 1; else if (s === 'NO_APLICA_PROPUESTO' || s === 'NO_APLICA_VALIDADO') c.NO_APLICA_PROPUESTO += 1; else if (s === 'OMITIDA') c.OMITIDA += 1; else c.pendiente += 1;
      if (responses[x.id]?.flagged) c.flagged += 1;
      if (responses[x.id]?.reportedEvidence?.trim()) c.evidence += 1;
    }
    return c;
  }, [questions, responses]);

  if (!q) return <Callout tone="info">No hay preguntas asignadas.</Callout>;

  const persist = async (patch: Partial<ResponseData>) => {
    setSave({ state: 'saving' });
    try {
      await onSave(q.id, patch);
      setSave({ state: 'saved', at: new Date() });
    } catch (e) {
      setSave({ state: 'error', message: (e as Error).message });
    }
  };
  const go = (i: number) => setIndex(Math.max(0, Math.min(questions.length - 1, i)));
  const choose = async (value: number) => { await persist({ value: value as ResponseData['value'], special: null }); };
  const special = async (code: SpecialCode) => { await persist({ special: code, value: null }); go(index + 1); };
  const answeredPct = ((questions.length - counts.pendiente) / questions.length) * 100;
  const dimQuestions = groups.find(([d]) => d === q.dimensionId)?.[1] ?? [];
  const posInDim = dimQuestions.indexOf(q) + 1;
  const terms = GLOSSARY.filter((g) => q.glossaryTerms.includes(g.id));
  const hint = naHint?.(q) ?? null;
  const disabled = Boolean(finished);

  const context_ = (
    <div className="space-y-5 text-sm">
      <div><h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Aclaración</h3><p>{q.explanation}</p></div>
      <div><h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Por qué importa</h3><p>{q.whyItMatters}</p></div>
      {q.examples.length > 0 && <div><h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Ejemplo</h3>{q.examples.map((e) => <p key={e} className="text-muted">{e}</p>)}</div>}
      {q.evidenceSuggestions.length > 0 && <div><h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Evidencias sugeridas</h3><ul className="list-disc space-y-0.5 pl-4 text-muted">{q.evidenceSuggestions.map((e) => <li key={e}>{e}</li>)}</ul></div>}
      {q.sourceRefs.length > 0 && <div><h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Referentes</h3><p className="text-muted">{q.sourceRefs.map((s) => getSource(s)?.shortLabel ?? s).join(' · ')}</p><p className="mt-1 text-xs text-muted">Asociación conceptual, sin correspondencia con cláusulas específicas.</p></div>}
      {terms.length > 0 && <div><h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Glosario</h3><dl className="space-y-2">{terms.map((t) => <div key={t.id}><dt className="font-medium">{t.term}</dt><dd className="text-muted">{t.definition}</dd></div>)}</dl></div>}
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="min-w-0">
            <p className="truncate text-xs text-muted">{context.organization} · {context.assessment}</p>
            <p className="truncate text-sm font-medium text-navy">{context.participant} · {context.profile}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted" role="status" aria-live="polite">
              {save.state === 'saving' ? 'Guardando…' : save.state === 'saved' ? `Guardado ${save.at?.toLocaleTimeString('es-CO')}` : save.state === 'error' ? <span className="text-lv0">Error al guardar: {save.message}</span> : 'Guardado automático'}
            </span>
            {extraActions}
            <Button size="sm" icon={<LogOut className="size-3.5" />} onClick={onExit}>Guardar y salir</Button>
            <Button size="sm" variant="primary" icon={<Flag className="size-3.5" />} onClick={() => setSummary(true)}>Finalizar entrevista</Button>
          </div>
        </div>
        <div className="px-4 pb-2 md:px-6"><Progress value={answeredPct} label="Avance de la entrevista" /></div>
      </header>

      <div className="grid lg:grid-cols-[260px_minmax(0,1fr)_320px]">
        <nav aria-label="Dimensiones de la entrevista" className="hidden border-r border-line bg-white lg:block lg:h-[calc(100vh-74px)] lg:overflow-y-auto">
          <ul className="p-3">
            {groups.map(([d, qs]) => {
              const done = qs.filter((x) => statusOf(responses[x.id]) !== 'pendiente').length;
              const active = d === q.dimensionId;
              return (
                <li key={d} className="mb-1">
                  <button onClick={() => go(questions.indexOf(qs[0]))} className={cx('w-full rounded-md px-2.5 py-2 text-left', active ? 'bg-teal-50' : 'hover:bg-slate-50')} aria-current={active ? 'true' : undefined}>
                    <div className="flex items-center justify-between text-sm"><span className={active ? 'font-semibold text-navy' : 'text-ink'}>{d} · {dimensionName(d)}</span></div>
                    <div className="mt-1.5 flex items-center gap-2"><Progress value={(done / qs.length) * 100} label={`Avance ${d}`} /><span className="text-[0.68rem] text-muted num">{done}/{qs.length}</span></div>
                  </button>
                  {active && (
                    <ol className="mt-1 space-y-0.5 pl-2">
                      {qs.map((x) => {
                        const s = statusOf(responses[x.id]);
                        return (
                          <li key={x.id}>
                            <button onClick={() => go(questions.indexOf(x))} className={cx('flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs', x.id === q.id ? 'bg-white font-medium text-navy shadow-sm' : 'text-muted hover:text-ink')}>
                              <span className={cx('size-1.5 shrink-0 rounded-full', s === 'respondida' ? 'bg-petrol' : s === 'pendiente' ? 'border border-slate-300 bg-white' : 'bg-gold')} aria-hidden />
                              <span className="truncate">{x.id.replace(/^D\d\d-/, '')} {x.criterion}</span>
                              {responses[x.id]?.flagged && <Bookmark className="ml-auto size-3 text-gold" aria-label="Marcada para revisión" />}
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <main id="contenido" className="px-4 py-6 md:px-10 md:py-8">
          <div className="mb-4 lg:hidden">
            <label htmlFor="dim-jump" className="sr-only">Ir a otra dimensión</label>
            <select id="dim-jump" className="input" value={q.dimensionId} onChange={(e) => go(questions.findIndex((x) => x.dimensionId === e.target.value))}>
              {groups.map(([d]) => <option key={d} value={d}>{d} · {dimensionName(d)}</option>)}
            </select>
          </div>
          {finished && <div className="mb-4"><Callout tone="success">La entrevista está finalizada. Puede consultar las respuestas; para modificarlas, reábrala.</Callout></div>}
          <p className="eyebrow">{q.dimensionId} · {dimensionName(q.dimensionId)} · pregunta {posInDim} de {dimQuestions.length} · {index + 1} de {questions.length}</p>
          <p className="mt-2 text-xs font-medium text-muted">{q.id} · {q.criterion}{q.isCritical && <span className="ml-2 text-lv0">· Criterio crítico</span>}</p>
          <h1 ref={headingRef} tabIndex={-1} className="mt-3 max-w-3xl text-xl font-semibold leading-snug outline-none md:text-[1.4rem]">{q.question}</h1>

          <details className="mt-4 rounded-md border border-line bg-white p-4 lg:hidden"><summary className="cursor-pointer text-sm font-medium text-navy">Aclaraciones, ejemplos y referentes</summary><div className="mt-3">{context_}</div></details>

          <fieldset className="mt-6 max-w-3xl" disabled={disabled}>
            <legend className="mb-3 text-sm font-medium text-ink">Seleccione el nivel que mejor describe la situación actual</legend>
            <div className="space-y-2">
              {q.maturityDescriptors.map((d, i) => {
                const checked = r?.value === i;
                return (
                  <label key={i} className={cx('flex cursor-pointer gap-4 rounded-md border bg-white px-4 py-3 transition-colors duration-150', checked ? 'border-petrol ring-1 ring-petrol' : 'border-line hover:border-slate-300')}>
                    <input type="radio" name={`lvl-${q.id}`} className="sr-only" checked={checked} onChange={() => choose(i)} />
                    <span className={cx('flex size-8 shrink-0 items-center justify-center rounded-md border text-sm font-semibold num', checked ? 'border-petrol bg-petrol text-white' : 'border-line text-navy')}>{checked ? <Check className="size-4" aria-hidden /> : i}</span>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-muted">Nivel {i} · {LEVEL_NAMES[i]}</span>
                      <span className="mt-0.5 block text-sm text-ink">{d}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant={r?.special === 'NO_SABE' ? 'subtle' : 'secondary'} icon={<CircleHelp className="size-3.5" />} onClick={() => special('NO_SABE')}>No sabe</Button>
              <Tip content="Propone que el criterio no es pertinente. Solo el evaluador puede validar la no aplicabilidad con justificación.">
                <Button size="sm" variant={r?.special === 'NO_APLICA_PROPUESTO' ? 'subtle' : 'secondary'} onClick={() => special('NO_APLICA_PROPUESTO')}>No aplica</Button>
              </Tip>
              <Button size="sm" variant={r?.special === 'OMITIDA' ? 'subtle' : 'secondary'} icon={<SkipForward className="size-3.5" />} onClick={() => special('OMITIDA')}>Omitir pregunta</Button>
              <Button size="sm" onClick={() => setSkipDim(q.dimensionId)}>Omitir sección</Button>
              <Button size="sm" variant="ghost" icon={r?.flagged ? <BookmarkCheck className="size-3.5 text-gold" /> : <Bookmark className="size-3.5" />} onClick={() => persist({ flagged: !r?.flagged })} aria-pressed={Boolean(r?.flagged)}>{r?.flagged ? 'Marcada para revisión' : 'Marcar para revisión'}</Button>
            </div>
            {r?.special && <p className="mt-2 text-xs text-muted">Estado registrado: {SPECIAL_LABEL[r.special]}. Este estado no se contabiliza como cero.</p>}
            {hint && <p className="mt-2 text-xs text-lv2">{hint} Puede proponer «No aplica».</p>}
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="q-note" className="mb-1 block text-sm font-medium">Observaciones</label>
                <textarea id="q-note" className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== (r?.note ?? '') && persist({ note })} />
              </div>
              <div>
                <label htmlFor="q-ev" className="mb-1 block text-sm font-medium">Evidencias que puede reportar</label>
                <textarea id="q-ev" className="input" rows={3} value={evidence} onChange={(e) => setEvidence(e.target.value)} onBlur={() => evidence !== (r?.reportedEvidence ?? '') && persist({ reportedEvidence: evidence })} placeholder="Nombre o referencia del documento. No incluya datos sensibles." />
                <p className="mt-1 text-xs text-muted">Reportar una evidencia no la convierte en verificada: el evaluador la revisa.</p>
              </div>
            </div>
          </fieldset>

          <div className="mt-8 flex max-w-3xl items-center justify-between border-t border-line pt-4">
            <Button icon={<ArrowLeft className="size-4" />} onClick={() => go(index - 1)} disabled={index === 0}>Anterior</Button>
            {index < questions.length - 1 ? <Button variant="primary" onClick={() => go(index + 1)}>Siguiente <ArrowRight className="size-4" aria-hidden /></Button> : <Button variant="primary" onClick={() => setSummary(true)}>Revisar y finalizar</Button>}
          </div>
        </main>

        <aside className="hidden border-l border-line bg-white p-6 lg:block lg:h-[calc(100vh-74px)] lg:overflow-y-auto" aria-label="Información de apoyo">{context_}</aside>
      </div>

      <Dialog open={Boolean(skipDim)} onOpenChange={(o) => !o && setSkipDim(null)} title="Omitir sección" footer={<><Button onClick={() => setSkipDim(null)}>Cancelar</Button><Button variant="primary" onClick={async () => { const qs = (groups.find(([d]) => d === skipDim)?.[1] ?? []).map((x) => x.id); const n = await onSkipSection(qs); setSkipDim(null); setSave({ state: 'saved', at: new Date() }); const nextDim = groups.findIndex(([d]) => d === skipDim) + 1; if (groups[nextDim]) go(questions.indexOf(groups[nextDim][1][0])); void n; }}>Omitir sección</Button></>}>
        {skipDim && (() => {
          const qs = groups.find(([d]) => d === skipDim)?.[1] ?? [];
          const pending = qs.filter((x) => statusOf(responses[x.id]) === 'pendiente').length;
          return <p className="text-sm">Se marcarán como omitidas <strong>{pending}</strong> preguntas sin respuesta de {skipDim} ({Math.round((pending / questions.length) * 100)} % de su entrevista). La sección no se considerará evaluada y la cobertura del diagnóstico se reducirá. Las respuestas ya registradas se conservan.</p>;
        })()}
      </Dialog>

      <Dialog open={summary} onOpenChange={setSummary} title="Resumen antes de finalizar" footer={<><Button onClick={() => setSummary(false)}>Seguir respondiendo</Button><Button variant="primary" disabled={finished} onClick={async () => { await onFinish(); setSummary(false); }}>Finalizar entrevista</Button></>}>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {[['Respondidas', counts.respondida], ['No sabe', counts.NO_SABE], ['No aplica (propuesto)', counts.NO_APLICA_PROPUESTO], ['Omitidas', counts.OMITIDA], ['Pendientes', counts.pendiente], ['Marcadas para revisión', counts.flagged], ['Con evidencia reportada', counts.evidence]].map(([k, v]) => (
            <div key={k as string} className="rounded-md border border-line px-3 py-2"><dt className="text-xs text-muted">{k}</dt><dd className="font-display text-xl font-semibold text-navy num">{v}</dd></div>
          ))}
        </dl>
        {counts.pendiente > 0 && <p className="mt-3 text-sm text-muted">Las preguntas pendientes no se contabilizan como cero. Puede finalizar y retomarlas después si reabre la entrevista.</p>}
      </Dialog>
    </div>
  );
}
