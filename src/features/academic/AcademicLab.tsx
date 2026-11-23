import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Award, BookOpen, Download, GraduationCap, Pause, Play, RotateCcw, Timer } from 'lucide-react';
import { db } from '@/database/db';
import { ACADEMIC_CASES, ACADEMIC_READINGS, LAB_PHASES, type AcademicCase } from '@/data/demo/cases';
import { getProfile } from '@/data/sector-profiles';
import { useAssessmentData } from '@/hooks/useAssessment';
import { Button, Callout, Field, Input, PageHeader, Section, TabPanel, Tabs, Tag, Textarea } from '@/components/ui';
import { loadCase } from '@/services/demo';
import { CONTRADICTION_RULES } from '@/engine/triangulation';
import { buildAcademicPDF } from '@/services/exports/pdf';
import { attempt, notify } from '@/app/store';
import { cx, downloadBlob, fmtNumber, fmtPct, slugify } from '@/utils/core';
import { PROFILE_LABEL } from '../common';

const TIMER_KEY = 'docmaturity.lab.timer';

export default function AcademicLab() {
  const [params, setParams] = useSearchParams();
  const assessments = useLiveQuery(() => db.assessments.filter((a) => a.isAcademic).toArray(), []) ?? [];
  const orgs = useLiveQuery(() => db.organizations.filter((o) => o.isAcademic).toArray(), []) ?? [];
  const selected = params.get('evaluacion') ?? '';
  const [busy, setBusy] = useState<string | null>(null);
  const open = async (c: AcademicCase) => {
    setBusy(c.id);
    const id = await attempt(() => loadCase(c.id, 'academic'), 'Caso cargado como simulación académica');
    setBusy(null);
    if (id) setParams({ evaluacion: id });
  };

  return (
    <>
      <PageHeader tone="academic" eyebrow="Modo académico" title="Laboratorio de diagnóstico documental" description="Sesión guiada de 60 minutos (ajustable) sobre casos ficticios: caracterizar, entrevistar, triangular, priorizar y sustentar. Los casos se cargan solo a petición y quedan marcados como simulación." />
      <Callout tone="info" title="Casos ficticios">Las organizaciones, personas, sistemas y hechos de los casos son simulaciones pedagógicas y no deben atribuirse a organizaciones reales. Puede eliminarlos en Configuración.</Callout>

      <Section className="mt-6" title="Casos disponibles">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ACADEMIC_CASES.map((c) => {
            const org = orgs.find((o) => o.name === c.title);
            const existing = org ? assessments.filter((a) => a.organizationId === org.id) : [];
            return (
              <article key={c.id} className={cx('rounded-lg border p-4', existing.some((e) => e.id === selected) ? 'border-violet bg-violet-soft/60 shadow-[0_0_0_1px_var(--color-violet)]' : 'border-line bg-white')}>
                <p className="text-xs text-muted">{getProfile(c.profileId).label}</p>
                <h3 className="mt-1 font-semibold">{c.title}</h3>
                <p className="mt-1 text-sm text-muted line-clamp-3">{c.context}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {existing.map((e, i) => <Button key={e.id} size="sm" variant={e.id === selected || (!selected && i === 0) ? 'primary' : 'secondary'} onClick={() => setParams({ evaluacion: e.id })}>{i === 0 ? 'Abrir caso' : `Abrir sesión ${i + 1}`}</Button>)}
                  <Button size="sm" variant={existing.length ? 'ghost' : 'secondary'} busy={busy === c.id} onClick={() => open(c)}>{existing.length ? 'Nueva sesión' : 'Cargar caso'}</Button>
                </div>
              </article>
            );
          })}
        </div>
      </Section>
      {selected ? <LabSession aid={selected} /> : <p className="mt-6 text-sm text-muted">Cargue o abra un caso para iniciar la sesión del laboratorio.</p>}
    </>
  );
}

type PhaseDef = (typeof LAB_PHASES)[number] & { minutes: number };

function useLabTimer() {
  const read = () => {
    try {
      const v = JSON.parse(localStorage.getItem(TIMER_KEY) ?? 'null') as { elapsed: number; minutes?: number[] } | null;
      return { elapsed: v?.elapsed ?? 0, minutes: v?.minutes?.length === LAB_PHASES.length ? v.minutes : LAB_PHASES.map((p) => p.minutes) };
    } catch { return { elapsed: 0, minutes: LAB_PHASES.map((p) => p.minutes) }; }
  };
  const initial = read();
  const [elapsed, setElapsed] = useState<number>(initial.elapsed);
  const [minutes, setMinutes] = useState<number[]>(initial.minutes);
  const [running, setRunning] = useState(false);
  const phases: PhaseDef[] = LAB_PHASES.map((p, i) => ({ ...p, minutes: minutes[i] }));
  const total = phases.reduce((s, p) => s + p.minutes, 0) * 60;
  const ref = useRef<number | null>(null);
  useEffect(() => {
    if (!running) return;
    ref.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { if (ref.current) window.clearInterval(ref.current); };
  }, [running]);
  useEffect(() => {
    try { localStorage.setItem(TIMER_KEY, JSON.stringify({ elapsed, minutes })); } catch { /* almacenamiento no disponible */ }
    if (elapsed >= total) setRunning(false);
  }, [elapsed, minutes, total]);
  let acc = 0;
  const phase = phases.find((p) => { acc += p.minutes * 60; return elapsed < acc; }) ?? phases[phases.length - 1];
  const phaseEnd = phases.slice(0, phase.id).reduce((s, p) => s + p.minutes * 60, 0);
  return {
    elapsed: Math.min(elapsed, total), total, running, phase, phases, remainingPhase: Math.max(0, phaseEnd - elapsed),
    toggle: () => setRunning((r) => !r),
    reset: () => { setRunning(false); setElapsed(0); },
    setPhaseMinutes: (i: number, m: number) => setMinutes((ms) => ms.map((x, j) => (j === i ? Math.max(1, Math.min(120, m)) : x))),
  };
}

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

function LabSession({ aid }: { aid: string }) {
  const { bundle, analysis: a, loading, missing } = useAssessmentData(aid);
  const t = useLabTimer();
  const [tab, setTab] = useState('expediente');
  const [d, setD] = useState({ group: '', members: '', course: '', conclusions: '' });
  const lastPhase = useRef(t.phase.id);
  const [announce, setAnnounce] = useState('');
  useEffect(() => {
    if (t.phase.id !== lastPhase.current) { lastPhase.current = t.phase.id; setAnnounce(`Inicia la fase ${t.phase.id}: ${t.phase.name}`); }
  }, [t.phase.id, t.phase.name]);
  const c = useMemo(() => ACADEMIC_CASES.find((x) => x.title === bundle?.organization.name), [bundle]);
  if (loading) return null;
  if (missing || !bundle || !a) return <Callout tone="warning">La sesión seleccionada ya no existe.</Callout>;

  // Las insignias premian la calidad del proceso diagnóstico, nunca un nivel de madurez alto.
  const valuedRisks = bundle.risks.filter((r) => r.probability !== null && r.impact !== null).length;
  const resolvedContradictions = a.contradictions.filter((x) => [x.rule.a.questionId, x.rule.b.questionId].some((q) => bundle.findings.some((f) => f.questionId === q))).length;
  const reviewedEvidence = bundle.evidence.filter((e) => e.reviewer.trim() && e.reviewResult.trim()).length;
  const argued = bundle.priorityInputs.filter((p) => p.justification.trim() || [p.impact, p.urgency, p.enabler, p.effort].some((v) => v !== null)).length;
  const byId = new Map(bundle.initiatives.map((i) => [i.id, i]));
  const coherent = bundle.initiatives.length >= 3 && bundle.initiatives.every((i) => !i.dependencies.some((d) => (byId.get(d)?.phase ?? 1) > i.phase));
  const badges = [
    { id: 'cobertura', label: 'Cobertura adecuada', done: a.coverage.band === 'parcial' || a.coverage.band === 'alta', hint: 'Alcance una cobertura al menos parcial de los criterios aplicables.' },
    { id: 'contradicciones', label: 'Detección de contradicciones', done: a.contradictions.length > 0 && resolvedContradictions >= Math.min(2, a.contradictions.length), hint: 'Atienda en la mesa de validación al menos dos contradicciones detectadas.' },
    { id: 'evidencias', label: 'Validación de evidencias', done: reviewedEvidence >= 3, hint: 'Registre revisor y resultado en al menos 3 evidencias.' },
    { id: 'riesgos', label: 'Identificación de riesgos', done: valuedRisks >= 3, hint: 'Valore probabilidad e impacto de al menos 3 riesgos.' },
    { id: 'prioridad', label: 'Priorización argumentada', done: argued >= 3, hint: 'Valore factores o registre justificaciones en al menos 3 prioridades.' },
    { id: 'hoja', label: 'Coherencia de la hoja de ruta', done: coherent, hint: 'Defina al menos 3 iniciativas sin dependencias ubicadas en fases posteriores.' },
  ];
  const base = `/app/evaluaciones/${aid}`;
  const deliver = () => {
    if (!d.group.trim() || !d.conclusions.trim()) return notify('warning', 'Complete el grupo y las conclusiones');
    downloadBlob(buildAcademicPDF(a, bundle, d), `entregable-${slugify(d.group)}-${slugify(bundle.organization.shortName)}.pdf`);
    notify('success', 'Entregable generado', 'Puede cargarlo en Moodle u otra plataforma del curso.');
  };

  return (
    <div className="mt-6 space-y-6">
      <section className="panel grid gap-4 border-t-[3px] border-t-violet p-5 lg:grid-cols-[1fr_auto]" aria-label="Temporizador del laboratorio">
        <div>
          <p className="eyebrow !text-violet-strong">Fase {t.phase.id} de {t.phases.length} · {t.phase.minutes} minutos</p>
          <h2 className="mt-1 text-lg font-semibold">{t.phase.name}</h2>
          <p className="text-sm text-muted">{t.phase.goal}</p>
          <ol className="mt-4 grid grid-cols-4 gap-1" aria-label="Fases">
            {t.phases.map((p) => <li key={p.id} className={cx('rounded px-2 py-1.5 text-xs', p.id < t.phase.id ? 'bg-violet-soft text-violet-strong' : p.id === t.phase.id ? 'bg-violet-strong text-white' : 'bg-neutral text-muted')}><span className="font-semibold">{p.id}.</span> {p.name} · {p.minutes}′</li>)}
          </ol>
        </div>
        <div className="flex flex-col items-start justify-center gap-2 lg:items-end">
          <p className="font-display text-4xl font-semibold text-navy num" aria-label={`Tiempo restante de la fase: ${mmss(t.remainingPhase)}`}><Timer className="mr-2 inline size-6 text-muted" aria-hidden />{mmss(t.remainingPhase)}</p>
          <p className="text-xs text-muted">Total transcurrido {mmss(t.elapsed)} de {mmss(t.total)}</p>
          <div className="flex gap-2"><Button size="sm" variant="primary" icon={t.running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />} onClick={t.toggle}>{t.running ? 'Pausar' : t.elapsed ? 'Reanudar' : 'Iniciar'}</Button><Button size="sm" icon={<RotateCcw className="size-3.5" />} onClick={t.reset}>Reiniciar</Button></div>
        </div>
        <details className="text-sm lg:col-span-2">
          <summary className="cursor-pointer text-xs font-medium text-teal">Ajustar tiempos (docente)</summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-4">{t.phases.map((p, i) => <Field key={p.id} label={`Fase ${p.id}: ${p.name} (min)`} htmlFor={`lab-m-${p.id}`}><Input id={`lab-m-${p.id}`} type="number" min={1} max={120} value={p.minutes} onChange={(e) => t.setPhaseMinutes(i, Number(e.target.value) || 1)} /></Field>)}</div>
        </details>
        <p className="sr-only" aria-live="polite">{announce}</p>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[1fr_320px]">
        <Tabs value={tab} onValueChange={setTab} tabs={[{ value: 'expediente', label: 'Expediente del caso' }, { value: 'entrevistas', label: 'Entrevistas simuladas' }, { value: 'lecturas', label: 'Lecturas' }, { value: 'entregable', label: 'Entregable' }]}>
          <TabPanel value="expediente">
            {c ? (
              <Section title={c.title}>
                <dl className="grid gap-4 text-sm md:grid-cols-2">
                  <div className="md:col-span-2"><dt className="font-medium">Contexto</dt><dd className="text-muted">{c.context}</dd></div>
                  <div><dt className="font-medium">Estructura organizacional</dt><dd><ul className="mt-1 list-disc pl-5 text-muted">{c.orgChart.map((x) => <li key={x}>{x}</li>)}</ul></dd></div>
                  <div><dt className="font-medium">Sistemas de información</dt><dd><ul className="mt-1 list-disc pl-5 text-muted">{c.systems.map((x) => <li key={x}>{x}</li>)}</ul></dd></div>
                  <div><dt className="font-medium">Estado documental</dt><dd className="text-muted">{c.documentaryState}</dd></div>
                  <div><dt className="font-medium">Restricciones presupuestales</dt><dd className="text-muted">{c.budgetConstraints}</dd></div>
                  <div><dt className="font-medium">Retos tecnológicos</dt><dd className="text-muted">{c.techChallenges}</dd></div>
                  <div><dt className="font-medium">Necesidades</dt><dd className="text-muted">{c.needs}</dd></div>
                </dl>
                <h3 className="mt-6 font-semibold">Evidencias sintéticas</h3>
                <ul className="mt-2 space-y-1 text-sm">{c.evidence.map((e) => <li key={e.reference}><Tag tone={e.status === 'E3' ? 'teal' : e.status === 'E2' ? 'info' : 'neutral'}>{e.status}</Tag> <span className="font-medium">{e.questionId}</span> · {e.title}</li>)}</ul>
                <h3 className="mt-6 font-semibold">Preguntas de reflexión</h3>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">{c.reflection.map((r) => <li key={r}>{r}</li>)}</ol>
                <details className="mt-6 rounded-md border border-line p-3 text-sm"><summary className="cursor-pointer font-medium">Guía para el docente: situaciones deliberadas del caso</summary><ul className="mt-2 list-disc pl-5 text-muted">{c.deliberateContradictions.map((x) => { const m = /^(R\d{2}):\s*(.*)$/.exec(x); const rule = m ? CONTRADICTION_RULES.find((r) => r.id === m[1]) : undefined; const text = m ? m[2] : x; return <li key={x}>{rule ? <><strong className="font-medium text-ink">{rule.title}</strong>: {text}</> : text.charAt(0).toUpperCase() + text.slice(1)}</li>; })}</ul></details>
              </Section>
            ) : <Callout tone="info">No se encontró el expediente original del caso (la organización pudo haber sido renombrada).</Callout>}
          </TabPanel>
          <TabPanel value="entrevistas">
            <Section title="Participantes simulados" description="Cada participante tiene un sesgo de percepción distinto: contraste sus respuestas en la mesa de validación.">
              <ul className="grid gap-3 md:grid-cols-2">{(c?.participants ?? []).map((p) => (
                <li key={p.code} className="rounded-md border border-line p-3 text-sm"><p className="font-medium">{p.code} · {PROFILE_LABEL[p.profile]}</p><p className="text-xs text-muted">{p.area}</p><p className="mt-2 italic text-ink">“{p.voice}”</p></li>
              ))}</ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link className="text-sm font-medium text-teal hover:underline" to={`${base}/entrevistas`}>Ver entrevistas registradas</Link>
                <Link className="text-sm font-medium text-teal hover:underline" to={`${base}/validacion`}>Ir a la mesa de validación</Link>
              </div>
            </Section>
          </TabPanel>
          <TabPanel value="lecturas">
            <Section title="Lecturas complementarias" description="Referencias académicas para discutir el caso. Consulte el texto completo en la fuente.">
              <div className="space-y-5">{ACADEMIC_READINGS.map((r) => (
                <article key={r.sourceId}>
                  <h3 className="flex items-start gap-2 font-semibold"><BookOpen className="mt-0.5 size-4 shrink-0 text-teal" aria-hidden />{r.title}</h3>
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm break-all text-teal hover:underline">{r.url}<span className="sr-only"> (se abre en una pestaña nueva)</span></a>
                  <p className="mt-1 text-xs text-muted">{r.note}</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">{r.questions.map((q) => <li key={q}>{q}</li>)}</ol>
                </article>
              ))}</div>
            </Section>
          </TabPanel>
          <TabPanel value="entregable">
            <Section title="Entregable del grupo" description="Genera un PDF con identificación del grupo, tablero resumido, hallazgos, prioridades, hoja de ruta y conclusiones, listo para cargar en Moodle.">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nombre del grupo" htmlFor="ac-g" required><Input id="ac-g" value={d.group} onChange={(e) => setD({ ...d, group: e.target.value })} /></Field>
                <Field label="Curso o programa" htmlFor="ac-c"><Input id="ac-c" value={d.course} onChange={(e) => setD({ ...d, course: e.target.value })} /></Field>
                <div className="md:col-span-2"><Field label="Integrantes" htmlFor="ac-m" hint="Solo nombres; no incluya documentos de identidad."><Input id="ac-m" value={d.members} onChange={(e) => setD({ ...d, members: e.target.value })} /></Field></div>
                <div className="md:col-span-2"><Field label="Conclusiones y argumentación" htmlFor="ac-co" required><Textarea id="ac-co" rows={7} value={d.conclusions} onChange={(e) => setD({ ...d, conclusions: e.target.value })} /></Field></div>
              </div>
              <Button className="mt-4" variant="primary" icon={<Download className="size-4" />} onClick={deliver}>Generar PDF del entregable</Button>
            </Section>
          </TabPanel>
        </Tabs>

        <aside className="space-y-4">
          <Section title="Indicadores de la sesión">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-muted">Madurez preliminar</dt><dd className="font-display text-xl font-semibold text-navy">{fmtNumber(a.globalPreliminary.score)}</dd></div>
              <div><dt className="text-xs text-muted">Cobertura</dt><dd className="font-display text-xl font-semibold text-navy">{fmtPct(a.coverage.coverage)}</dd></div>
              <div><dt className="text-xs text-muted">Criterios validados</dt><dd className="font-display text-xl font-semibold text-navy">{bundle.findings.length}</dd></div>
              <div><dt className="text-xs text-muted">Contradicciones</dt><dd className="font-display text-xl font-semibold text-navy">{a.contradictions.length}</dd></div>
            </dl>
            <nav className="mt-4 grid gap-1 text-sm" aria-label="Accesos del caso">
              {[['validacion', 'Mesa de validación'], ['resultados', 'Resultados'], ['brechas', 'Brechas y riesgos'], ['hoja-de-ruta', 'Hoja de ruta']].map(([to, label]) => <Link key={to} to={`${base}/${to}`} className="rounded px-2 py-1.5 font-medium text-teal hover:bg-slate-50">{label}</Link>)}
            </nav>
          </Section>
          <Section title="Insignias">
            <ul className="space-y-2">{badges.map((b) => (
              <li key={b.id} className={cx('flex items-start gap-3 rounded-md border p-2.5 text-sm', b.done ? 'border-teal-200 bg-teal-50/60' : 'border-line')}>
                <Award className={cx('mt-0.5 size-4 shrink-0', b.done ? 'text-gold' : 'text-slate-300')} aria-hidden />
                <span><span className="font-medium">{b.label}</span><span className="sr-only">{b.done ? ': obtenida' : ': pendiente'}</span>{!b.done && <span className="block text-xs text-muted">{b.hint}</span>}</span>
              </li>
            ))}</ul>
            <p className="mt-3 flex items-center gap-1 text-xs text-muted"><GraduationCap className="size-3.5" aria-hidden />{badges.filter((b) => b.done).length} de {badges.length} insignias. Se otorgan por la calidad del diagnóstico, no por el nivel de madurez obtenido; no existe ranking entre estudiantes.</p>
          </Section>
        </aside>
      </div>
    </div>
  );
}
