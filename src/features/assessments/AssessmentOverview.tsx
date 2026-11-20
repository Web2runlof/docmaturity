import { Link, useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { Archive, CheckCircle2, Download, Lock, RotateCcw, Trash2 } from 'lucide-react';
import type { AssessmentStatus } from '@/types/domain';
import { useAssessmentData } from '@/hooks/useAssessment';
import { Button, Callout, ConfirmDialog, Dialog, Field, KeyValue, LevelTag, PageHeader, Progress, Section, Tag, Textarea } from '@/components/ui';
import { deleteAssessment, reopenAssessment, updateAssessment } from '@/services/repo';
import { buildAssessmentPackage } from '@/services/packages';
import { attempt } from '@/app/store';
import { cx, fmtDate, fmtPct, slugify } from '@/utils/core';
import { COVERAGE_BAND_LABEL } from '@/engine/scoring';
import { Loading, MODALITY_LABEL, NotFound, SimulationBanner, STATUS_LABEL, STATUS_ORDER } from '../common';
import { ExportDialog } from '../shared/ExportDialog';

const NEXT: Record<string, { label: string; to: string }> = {
  borrador: { label: 'Definir alcance y metas', to: 'alcance' },
  planificacion: { label: 'Registrar participantes y entrevistas', to: 'entrevistas' },
  entrevistas: { label: 'Continuar entrevistas', to: 'entrevistas' },
  consolidacion: { label: 'Revisar la mesa de validación', to: 'validacion' },
  validacion: { label: 'Analizar resultados', to: 'resultados' },
  finalizado: { label: 'Generar informes', to: 'informes' },
  archivado: { label: 'Consultar resultados', to: 'resultados' },
};

export default function AssessmentOverview() {
  const { aid = '' } = useParams();
  const nav = useNavigate();
  const { bundle, analysis, loading, missing } = useAssessmentData(aid);
  const [reopen, setReopen] = useState(false);
  const [reason, setReason] = useState('');
  const [del, setDel] = useState(false);
  const [exp, setExp] = useState(false);
  const [finalize, setFinalize] = useState(false);
  if (loading) return <Loading />;
  if (missing || !bundle || !analysis) return <NotFound />;
  const a = bundle.assessment;
  const o = bundle.organization;
  const setStatus = (s: AssessmentStatus) => attempt(() => updateAssessment(aid, { status: s }, `estado: ${STATUS_LABEL[s]}`), `Estado: ${STATUS_LABEL[s]}`);
  const step = STATUS_ORDER.indexOf(a.status);
  const next = NEXT[a.status];

  return (
    <>
      <SimulationBanner kind={a.isDemo ? 'demo' : a.isAcademic ? 'academic' : null} />
      <PageHeader eyebrow={`${MODALITY_LABEL[a.modality]} · revisión ${a.revision}`} title={a.name} description={<><Link to={`/app/organizaciones/${o.id}`} className="text-teal hover:underline">{o.name}</Link> · {a.methodologyVersion} · banco {a.bankVersion}</>} actions={
        <>
          <Button icon={<Download className="size-4" />} onClick={() => setExp(true)}>Exportar evaluación</Button>
          {a.status === 'finalizado' ? <Button icon={<RotateCcw className="size-4" />} onClick={() => setReopen(true)}>Reabrir</Button> : a.status !== 'archivado' && <Button variant="primary" icon={<CheckCircle2 className="size-4" />} onClick={() => setFinalize(true)}>Finalizar</Button>}
          {a.status !== 'archivado' ? <Button icon={<Archive className="size-4" />} onClick={() => setStatus('archivado')}>Archivar</Button> : <Button onClick={() => setStatus('validacion')}>Desarchivar</Button>}
          <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={() => setDel(true)}>Eliminar</Button>
        </>
      } />

      <ol className="mb-8 grid grid-cols-2 gap-y-4 border-y border-line py-4 sm:grid-cols-3 lg:grid-cols-6" aria-label="Estado de la evaluación">
        {STATUS_ORDER.map((s, i) => (
          <li key={s} className="flex items-center gap-3 pr-3" aria-current={a.status === s ? 'step' : undefined}>
            <span className={cx('flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold num', i < step ? 'border-petrol bg-petrol text-white' : i === step ? 'border-navy bg-navy text-white' : 'border-line text-muted')}>{i + 1}</span>
            <span className={cx('text-xs', i === step ? 'font-semibold text-navy' : 'text-muted')}>{STATUS_LABEL[s]}</span>
          </li>
        ))}
      </ol>

      {a.status === 'finalizado' && <div className="mb-6"><Callout tone="success" title="Evaluación finalizada"><Lock className="mr-1 inline size-3.5" />Los datos históricos no se modifican silenciosamente. Para cambios, reabra la evaluación: se conservará una instantánea de la revisión actual.</Callout></div>}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Section title="Estado del diagnóstico" actions={next && <Link to={`/app/evaluaciones/${aid}/${next.to}`}><Button size="sm" variant="primary">{next.label}</Button></Link>}>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted">{analysis.globalPreliminary.labelText}</p>
              <div className="mt-1 font-display text-3xl font-semibold text-navy num">{analysis.globalPreliminary.score === null ? '—' : analysis.globalPreliminary.score.toLocaleString('es-CO', { maximumFractionDigits: 2 })}</div>
              <LevelTag score={analysis.globalPreliminary.score} size="sm" />
            </div>
            <div>
              <p className="text-xs text-muted">{analysis.globalValidated.labelText}</p>
              <div className="mt-1 font-display text-3xl font-semibold text-navy num">{analysis.globalValidated.score === null ? '—' : analysis.globalValidated.score.toLocaleString('es-CO', { maximumFractionDigits: 2 })}</div>
              <LevelTag score={analysis.globalValidated.score} size="sm" />
            </div>
          </div>
          <div className="mt-6 space-y-4">
            {[
              { k: 'Cobertura del diagnóstico', v: analysis.coverage.coverage, note: analysis.coverage.band ? COVERAGE_BAND_LABEL[analysis.coverage.band] : 'Sin respuestas' },
              { k: 'Cobertura de validación', v: analysis.coverage.validationCoverage, note: `${analysis.coverage.validated} de ${analysis.coverage.applicable} criterios aplicables` },
              { k: 'Cobertura del banco completo', v: analysis.coverage.scopeCoverage, note: `${analysis.coverage.applicable} criterios aplicables del alcance frente a 225` },
              { k: 'Soporte de evidencias', v: analysis.evidence.support, note: 'Indicador separado de la madurez' },
            ].map((x) => (
              <div key={x.k}>
                <div className="mb-1 flex justify-between text-sm"><span>{x.k}</span><span className="num font-medium">{fmtPct(x.v)}</span></div>
                <Progress value={x.v} label={x.k} />
                <p className="mt-1 text-xs text-muted">{x.note}</p>
              </div>
            ))}
          </div>
        </Section>
        <div className="space-y-6">
          <Section title="Ficha">
            <KeyValue items={[
              { k: 'Objetivo', v: a.objective }, { k: 'Alcance', v: a.scope }, { k: 'Responsable', v: a.lead }, { k: 'Equipo', v: a.team },
              { k: 'Inicio', v: fmtDate(a.startDate) }, { k: 'Cierre', v: fmtDate(a.endDate) }, { k: 'Criterios del alcance', v: String(a.questionIds.length + a.customQuestions.filter((c) => !a.questionIds.includes(c.id)).length) },
              { k: 'Ponderación', v: a.weights.mode === 'diam' ? 'Inicial DIAM' : a.weights.mode === 'uniforme' ? 'Uniforme' : 'Personalizada' },
            ]} />
          </Section>
          <Section title="Alertas">
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between"><span>Capacidades críticas con alerta</span><Tag tone={analysis.critical.length ? 'danger' : 'teal'}>{analysis.critical.length}</Tag></li>
              <li className="flex justify-between"><span>Discrepancias entre entrevistados</span><Tag tone={analysis.discrepancies ? 'warning' : 'teal'}>{analysis.discrepancies}</Tag></li>
              <li className="flex justify-between"><span>Contradicciones entre criterios</span><Tag tone={analysis.contradictions.length ? 'warning' : 'teal'}>{analysis.contradictions.length}</Tag></li>
              <li className="flex justify-between"><span>Participantes</span><Tag>{bundle.participants.length}</Tag></li>
              <li className="flex justify-between"><span>Entrevistas finalizadas</span><Tag>{analysis.interviews.finished}</Tag></li>
            </ul>
            <Link to={`/app/evaluaciones/${aid}/validacion`} className="mt-4 inline-block text-sm font-medium text-teal hover:underline">Ir a la mesa de validación</Link>
          </Section>
        </div>
      </div>

      <ConfirmDialog open={finalize} onOpenChange={setFinalize} title="Finalizar evaluación" confirmLabel="Finalizar" onConfirm={() => setStatus('finalizado').then(() => undefined)} description="Una evaluación finalizada no admite cambios hasta que se reabra explícitamente. ¿Desea continuar?">
        {(analysis.coverage.validationCoverage ?? 0) < 50 && <Callout tone="warning">La cobertura de validación es inferior al 50 %. Los resultados permanecerán mayoritariamente preliminares.</Callout>}
      </ConfirmDialog>
      <Dialog open={reopen} onOpenChange={setReopen} title="Reabrir evaluación" description="Se creará la revisión siguiente y se conservará una instantánea de la actual." footer={<><Button onClick={() => setReopen(false)}>Cancelar</Button><Button variant="primary" disabled={!reason.trim()} onClick={async () => { await attempt(() => reopenAssessment(aid, reason), 'Evaluación reabierta'); setReopen(false); setReason(''); }}>Reabrir</Button></>}>
        <Field label="Motivo de la reapertura" htmlFor="reason" required><Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      </Dialog>
      <ConfirmDialog open={del} onOpenChange={setDel} danger title="Eliminar evaluación" requireText="ELIMINAR" confirmLabel="Eliminar" description="Se eliminarán participantes, entrevistas, respuestas, evidencias, validaciones, riesgos e iniciativas de esta evaluación. Exporte antes una copia si la necesita." onConfirm={async () => { await attempt(() => deleteAssessment(aid), 'Evaluación eliminada'); nav('/app/evaluaciones'); }} />
      <ExportDialog open={exp} onOpenChange={setExp} title="Exportar evaluación" build={() => buildAssessmentPackage(aid)} fileName={`${slugify(o.shortName || o.name)}-${slugify(a.name)}.dm-assessment.json`} payloadFormat="docmaturity.assessment" note="Incluye organización, participantes (por código), entrevistas, respuestas, referencias de evidencias, validaciones, riesgos e iniciativas. Los adjuntos locales no se incluyen." />
    </>
  );
}
