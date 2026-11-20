import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Bot, ClipboardCopy, FileJson, FileSpreadsheet, FileText, Trash2 } from 'lucide-react';
import { useAssessmentData } from '@/hooks/useAssessment';
import { Button, Callout, ConfirmDialog, Field, PageHeader, Section, Select, Tag, Textarea } from '@/components/ui';
import { buildNarrative } from '@/engine/narrative';
import { buildExecutivePDF, buildTechnicalPDF } from '@/services/exports/pdf';
import { buildWorkbook } from '@/services/exports/xlsx';
import { buildAssessmentPackage } from '@/services/packages';
import { AI_ORIGIN_LABEL, AI_PROVIDERS, AI_PURPOSES, buildAIPrompt, reviewExternalText, type AIPurpose } from '@/services/ai';
import { db, guarded, logEvent } from '@/database/db';
import { attempt, notify } from '@/app/store';
import { downloadBlob, fmtDate, nowISO, plainText, slugify, uuid } from '@/utils/core';
import { COVERAGE_BAND_LABEL } from '@/engine/scoring';
import { Loading, NotFound, SimulationBanner } from '../common';
import { ExportDialog } from '../shared/ExportDialog';

/** Los textos aprobados de origen externo se guardan como recomendaciones con este identificador. */
export const AI_NOTE_ID = 'IA-EXTERNA';

export default function ReportsPage() {
  const { aid = '' } = useParams();
  const { bundle, analysis: a, loading, missing } = useAssessmentData(aid);
  const [busy, setBusy] = useState<string | null>(null);
  const [exp, setExp] = useState(false);
  const narrative = useMemo(() => (a ? buildNarrative(a) : []), [a]);
  if (loading) return <Loading />;
  if (missing || !bundle || !a) return <NotFound />;
  const base = slugify(`${bundle.organization.shortName || bundle.organization.name}-${bundle.assessment.name}`);
  const run = async (key: string, fn: () => Promise<Blob> | Blob, file: string) => {
    setBusy(key);
    try {
      const blob = await fn();
      downloadBlob(blob, file);
      await logEvent('exportar', 'informe', aid, aid, file);
      notify('success', 'Informe generado', file);
    } catch (e) {
      notify('error', 'No fue posible generar el informe', (e as Error).message);
    } finally { setBusy(null); }
  };
  const preliminary = a.coverage.band === 'insuficiente' || a.coverage.band === 'exploratorio' || a.globalValidated.score === null;
  const simulated = bundle.assessment.isAcademic ? 'academic' : bundle.assessment.isDemo ? 'demo' : null;

  return (
    <>
      <PageHeader eyebrow="Resultados" title="Informes" description="Todos los informes se generan en este navegador a partir de los datos locales. Ninguno constituye una certificación ni un resultado oficial." />
      <SimulationBanner kind={simulated} />
      {preliminary && (
        <div className="mb-6"><Callout tone="warning" title="Resultados de carácter preliminar">
          Cobertura {a.coverage.band ? COVERAGE_BAND_LABEL[a.coverage.band].toLowerCase() : 'sin datos'}{a.globalValidated.score === null ? ' y sin criterios validados' : ''}. Los informes lo indican expresamente en la portada y en la sección de limitaciones.
        </Callout></div>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReportCard icon={<FileText className="size-5" />} title="Informe ejecutivo (PDF)" text="Resultado global, mapa por dimensiones, alertas críticas, prioridades y hoja de ruta resumida para la alta dirección." action={<Button variant="primary" busy={busy === 'exec'} onClick={() => run('exec', () => buildExecutivePDF(a, bundle), `${base}-informe-ejecutivo.pdf`)}>Descargar</Button>} />
        <ReportCard icon={<FileText className="size-5" />} title="Informe técnico (PDF)" text="Metodología, alcance, fórmulas, resultados por criterio, evidencias, validación, riesgos, referentes y limitaciones." action={<Button variant="primary" busy={busy === 'tech'} onClick={() => run('tech', () => buildTechnicalPDF(a, bundle), `${base}-informe-tecnico.pdf`)}>Descargar</Button>} />
        <ReportCard icon={<FileSpreadsheet className="size-5" />} title="Libro de análisis (XLSX)" text="Quince hojas: resumen, dimensiones, criterios, respuestas, evidencias, validación, brechas, riesgos, prioridades, hoja de ruta y cobertura." action={<Button variant="primary" busy={busy === 'xlsx'} onClick={() => run('xlsx', () => buildWorkbook(a, bundle), `${base}-analisis.xlsx`)}>Descargar</Button>} />
        <ReportCard icon={<FileJson className="size-5" />} title="Paquete de evaluación" text="Archivo .dm-assessment.json para trasladar la evaluación a otro equipo, con cifrado opcional. Excluye adjuntos de evidencias." action={<Button variant="primary" onClick={() => setExp(true)}>Exportar</Button>} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Section title="Narrativa diagnóstica" description="Generada con reglas deterministas a partir de los resultados. Cada afirmación enlaza los criterios que la sustentan; no se afirma causalidad.">
          <div className="space-y-6">
            {narrative.map((sec) => (
              <article key={sec.key}>
                <h3 className="font-display text-base font-semibold text-navy">{sec.title}</h3>
                {sec.paragraphs.map((p, i) => (
                  <p key={i} className="mt-2 text-sm leading-relaxed text-ink">
                    {p.text}
                    {p.refs.length > 0 && (
                      <span className="ml-1 inline-flex flex-wrap gap-1 align-middle">
                        {p.refs.slice(0, 8).map((r) => <Link key={r} to={`/app/evaluaciones/${aid}/validacion?q=${r}`} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-navy hover:underline">{r}</Link>)}
                        {p.refs.length > 8 && <span className="text-[11px] text-muted">+{p.refs.length - 8}</span>}
                      </span>
                    )}
                  </p>
                ))}
              </article>
            ))}
          </div>
        </Section>
        <AIAssistant aid={aid} a={a} />
      </div>

      <ExportDialog open={exp} onOpenChange={setExp} title="Exportar paquete de evaluación" fileName={`${base}.dm-assessment.json`} payloadFormat="dm-assessment" build={() => buildAssessmentPackage(aid)} note="Incluye organización, alcance, participantes (con código), respuestas, evidencias sin adjuntos, validación, riesgos y hoja de ruta. El hash SHA-256 permite detectar alteraciones accidentales; no es una firma digital." />
    </>
  );
}

function ReportCard({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action: React.ReactNode }) {
  return (
    <section className="panel flex flex-col p-5">
      <span className="inline-flex size-10 items-center justify-center rounded-md bg-teal-50 text-teal-700" aria-hidden>{icon}</span>
      <h2 className="mt-3 text-base font-semibold">{title}</h2>
      <p className="mt-1 flex-1 text-sm text-muted">{text}</p>
      <div className="mt-4">{action}</div>
    </section>
  );
}

type A = NonNullable<ReturnType<typeof useAssessmentData>['analysis']>;

function AIAssistant({ aid, a }: { aid: string; a: A }) {
  const [purpose, setPurpose] = useState<AIPurpose>('resumen_ejecutivo');
  const [anonymize, setAnonymize] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [pasted, setPasted] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [del, setDel] = useState<string | null>(null);
  const prompt = useMemo(() => buildAIPrompt(a, { purpose, anonymize, includeNotes }), [a, purpose, anonymize, includeNotes]);
  const warnings = useMemo(() => (pasted.trim() ? reviewExternalText(pasted, a) : []), [pasted, a]);
  const notes = useLiveQuery(() => db.recommendations.where('assessmentId').equals(aid).filter((r) => r.questionId === AI_NOTE_ID).toArray(), [aid]) ?? [];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      notify('success', 'Prompt copiado', 'Péguelo en la herramienta de IA que su organización autorice.');
    } catch {
      notify('warning', 'No fue posible copiar automáticamente', 'Seleccione el texto del prompt y cópielo manualmente.');
    }
  };
  const approve = () => attempt(async () => {
    await guarded(() => db.recommendations.put({ id: uuid(), assessmentId: aid, questionId: AI_NOTE_ID, level: -1, text: plainText(pasted, 20000), status: 'aceptada', note: `${AI_ORIGIN_LABEL}. Propósito: ${AI_PURPOSES[purpose].label}.`, createdAt: nowISO() }));
    await logEvent('aprobar_texto_ia', 'recomendacion', aid, aid, AI_PURPOSES[purpose].label);
    setPasted(''); setReviewed(false);
  }, 'Texto incorporado como contenido de origen externo');

  return (
    <Section title="Asistente de IA (opcional)" description="DOCMATURITY no envía datos a servicios de IA. Genera un prompt que usted copia en la herramienta autorizada por su organización y, si lo desea, pega aquí la respuesta para revisarla.">
      <div className="space-y-4 text-sm">
        <Callout tone="info" title="Sin conexión automática">
          Proveedor disponible: {AI_PROVIDERS[0].label}. No se almacenan claves de acceso y la política de seguridad del sitio bloquea conexiones externas.
        </Callout>
        <Field label="Propósito" htmlFor="ai-p"><Select id="ai-p" value={purpose} onChange={(e) => setPurpose(e.target.value as AIPurpose)}>{(Object.keys(AI_PURPOSES) as AIPurpose[]).map((k) => <option key={k} value={k}>{AI_PURPOSES[k].label}</option>)}</Select></Field>
        <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={anonymize} onChange={(e) => setAnonymize(e.target.checked)} /><span>Anonimizar: omitir nombre de la organización, NIT, sedes y participantes (recomendado).</span></label>
        <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={includeNotes} onChange={(e) => setIncludeNotes(e.target.checked)} /><span>Incluir justificaciones de validación. Revise que no contengan datos personales ni información reservada.</span></label>
        {!anonymize && <Callout tone="warning">El prompt incluirá el nombre de la organización. Verifique que la herramienta externa esté autorizada para tratar esa información.</Callout>}
        <Field label="Prompt generado" htmlFor="ai-prompt"><Textarea id="ai-prompt" readOnly rows={10} className="font-mono text-xs" value={prompt} /></Field>
        <Button icon={<ClipboardCopy className="size-4" />} onClick={copy}>Copiar prompt</Button>
        <hr className="border-line" />
        <Field label="Respuesta obtenida externamente (opcional)" htmlFor="ai-r" hint="El texto se guarda marcado como generado externamente mediante IA. Revíselo antes de incorporarlo."><Textarea id="ai-r" rows={6} value={pasted} onChange={(e) => { setPasted(e.target.value); setReviewed(false); }} /></Field>
        {warnings.map((w) => <Callout key={w} tone="warning">{w}</Callout>)}
        {pasted.trim() && (
          <>
            <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} /><span>Revisé el texto, verifiqué que se sustenta en los resultados y asumo la responsabilidad de su contenido.</span></label>
            <Button variant="primary" icon={<Bot className="size-4" />} disabled={!reviewed} onClick={approve}>Aprobar e incorporar</Button>
          </>
        )}
        {notes.length > 0 && (
          <div>
            <h3 className="mt-2 font-semibold">Textos de origen externo aprobados</h3>
            <ul className="mt-2 space-y-3">{notes.map((n) => (
              <li key={n.id} className="rounded-md border border-line p-3">
                <div className="flex items-start justify-between gap-2"><Tag tone="gold" icon={<Bot className="size-3" />}>Generado externamente mediante IA</Tag><Button size="sm" variant="ghost" aria-label="Eliminar texto" icon={<Trash2 className="size-3.5" />} onClick={() => setDel(n.id)} /></div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{n.text}</p>
                <p className="mt-2 text-xs text-muted">{n.note} · {fmtDate(n.createdAt, true)}</p>
              </li>
            ))}</ul>
          </div>
        )}
      </div>
      <ConfirmDialog open={del !== null} onOpenChange={(o) => !o && setDel(null)} title="Eliminar texto aprobado" description="El texto dejará de formar parte de la evaluación." danger confirmLabel="Eliminar" onConfirm={async () => { if (del) await attempt(() => guarded(() => db.recommendations.delete(del)), 'Texto eliminado'); setDel(null); }} />
    </Section>
  );
}
