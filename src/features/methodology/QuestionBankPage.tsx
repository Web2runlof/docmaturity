import { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import type { CoreTier, Question } from '@/types/bank';
import { BANK, BANK_VERSION, DIMENSIONS, LEVEL_NAMES, QUESTIONS, getSource } from '@/data/bank';
import { Button, Dialog, Field, Input, PageHeader, Section, Select, Tag } from '@/components/ui';
import { VERB_LABEL } from '@/engine/recommendations';
import { PROFILE_LABEL } from '../common';
import { downloadBlob, downloadJSON, sanitizeCell, cx } from '@/utils/core';
import { LEGAL_APPLICABILITY_LABEL } from './LibraryPage';

const TIER_LABEL: Record<CoreTier, string> = { quick: 'Rápido (30)', standard: 'Estándar (90)', professional: 'Profesional (225)' };
const TIER_INCLUDED: Record<CoreTier, CoreTier[]> = { quick: ['quick'], standard: ['quick', 'standard'], professional: ['quick', 'standard', 'professional'] };

export default function QuestionBankPage() {
  const [dim, setDim] = useState('D01');
  const [tier, setTier] = useState<CoreTier | ''>('');
  const [critical, setCritical] = useState(false);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Question | null>(null);
  const list = useMemo(() => QUESTIONS.filter((x) => (!dim || x.dimensionId === dim) && (!tier || TIER_INCLUDED[tier].includes(x.coreTier)) && (!critical || x.isCritical) && (!q || `${x.id} ${x.criterion} ${x.question}`.toLowerCase().includes(q.toLowerCase()))), [dim, tier, critical, q]);
  const d = DIMENSIONS.find((x) => x.id === dim);
  const exportCsv = () => {
    const header = ['id', 'dimension', 'orden', 'criterio', 'pregunta', 'nucleo', 'critico', 'peso', 'componente_mgda', ...LEVEL_NAMES.map((_, i) => `nivel_${i}`), 'referentes'];
    const rows = QUESTIONS.map((x) => [x.id, x.dimensionId, x.order, x.criterion, x.question, x.coreTier, x.isCritical ? 'si' : 'no', x.defaultWeight, x.mgdaComponent, ...x.maturityDescriptors, x.sourceRefs.join(' ')]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${sanitizeCell(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    downloadBlob(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), `diam-banco-${BANK_VERSION}.csv`);
  };
  return (
    <>
      <PageHeader eyebrow="Metodología" title="Banco de criterios DIAM" description={`Versión ${BANK_VERSION}: ${QUESTIONS.length} criterios originales en ${DIMENSIONS.length} dimensiones, cada uno con seis descriptores de nivel redactados individualmente.`} actions={
        <>
          <Button icon={<Download className="size-4" />} onClick={() => downloadJSON(BANK, `diam-banco-${BANK_VERSION}.json`)}>JSON</Button>
          <Button icon={<Download className="size-4" />} onClick={exportCsv}>CSV</Button>
        </>
      } />
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <nav aria-label="Dimensiones" className="panel h-fit p-2">
          <button onClick={() => setDim('')} className={cx('w-full rounded-md px-3 py-2 text-left text-sm', !dim ? 'bg-navy text-white' : 'hover:bg-slate-50')}>Todas las dimensiones</button>
          {DIMENSIONS.map((x) => (
            <button key={x.id} onClick={() => setDim(x.id)} aria-current={dim === x.id ? 'true' : undefined} className={cx('mt-0.5 flex w-full items-baseline gap-2 rounded-md px-3 py-2 text-left text-sm', dim === x.id ? 'bg-navy text-white' : 'hover:bg-slate-50')}>
              <span className={cx('text-xs', dim === x.id ? 'text-white/70' : 'text-muted')}>{x.id}</span><span>{x.name}</span>
            </button>
          ))}
        </nav>
        <div className="space-y-4">
          {d && <Section><p className="eyebrow">{d.id} · Componente MGDA: {d.mgdaComponent}</p><h2 className="mt-1 text-lg font-semibold">{d.name}</h2><p className="mt-1 text-sm text-muted">{d.summary}</p>{d.note && <p className="mt-2 text-xs text-muted">{d.note}</p>}</Section>}
          <div className="panel grid gap-3 p-4 md:grid-cols-[1fr_200px_auto] md:items-end">
            <Field label="Buscar" htmlFor="qb-q"><div className="relative"><Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted" aria-hidden /><Input id="qb-q" className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} /></div></Field>
            <Field label="Modalidad" htmlFor="qb-t"><Select id="qb-t" value={tier} onChange={(e) => setTier(e.target.value as CoreTier | '')}><option value="">Todo el banco</option>{(Object.keys(TIER_LABEL) as CoreTier[]).map((t) => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}</Select></Field>
            <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={critical} onChange={(e) => setCritical(e.target.checked)} />Solo críticos</label>
          </div>
          <p className="text-sm text-muted" aria-live="polite">{list.length} criterios</p>
          <ul className="space-y-2">
            {list.map((x) => (
              <li key={x.id}>
                <button onClick={() => setOpen(x)} className="panel block w-full p-4 text-left transition hover:border-petrol">
                  <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-medium text-muted">{x.id}</span><Tag>{x.coreTier === 'quick' ? 'Núcleo rápido' : x.coreTier === 'standard' ? 'Estándar' : 'Profesional'}</Tag>{x.isCritical && <Tag tone="danger">Crítico</Tag>}<Tag tone="neutral">{x.mgdaComponent}</Tag></div>
                  <p className="mt-1 font-medium text-navy">{x.criterion}</p>
                  <p className="text-sm text-muted">{x.question}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {open && <QuestionDetail q={open} onClose={() => setOpen(null)} />}
    </>
  );
}

export function QuestionDetail({ q, onClose }: { q: Question; onClose: () => void }) {
  return (
    <Dialog wide open onOpenChange={(o) => !o && onClose()} title={`${q.id} · ${q.criterion}`} description={q.question}>
      <div className="space-y-5 text-sm">
        <p className="text-muted">{q.explanation}</p>
        <div><h3 className="font-semibold">Por qué importa</h3><p className="mt-1">{q.whyItMatters}</p></div>
        <div>
          <h3 className="font-semibold">Descriptores de nivel</h3>
          <ol className="mt-2 space-y-1.5">{q.maturityDescriptors.map((t, i) => (
            <li key={i} className="grid grid-cols-[110px_1fr] gap-3 rounded-md border border-line p-2.5"><span className="font-medium" style={{ color: `var(--color-lv${i})` }}>{i} · {LEVEL_NAMES[i]}</span><span>{t}</span></li>
          ))}</ol>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div><h3 className="font-semibold">Verificaciones observables</h3><ul className="mt-1 list-disc space-y-1 pl-5">{q.observableChecks.map((t) => <li key={t}>{t}</li>)}</ul></div>
          <div><h3 className="font-semibold">Evidencias sugeridas</h3><ul className="mt-1 list-disc space-y-1 pl-5">{q.evidenceSuggestions.map((t) => <li key={t}>{t}</li>)}</ul><p className="mt-2 text-xs text-muted">No adjunte historias clínicas, expedientes reservados, credenciales ni datos personales innecesarios.</p></div>
        </div>
        {q.examples.length > 0 && <div><h3 className="font-semibold">Ejemplo</h3>{q.examples.map((t) => <p key={t} className="mt-1 text-muted">{t}</p>)}</div>}
        <div>
          <h3 className="font-semibold">Recomendación según el nivel actual</h3>
          <ul className="mt-2 space-y-1.5">{q.recommendationByLevel.map((r) => <li key={r.level} className="grid grid-cols-[110px_1fr] gap-3"><span className="text-muted">Nivel {r.level} · {VERB_LABEL[r.verb]}</span><span>{r.text}</span></li>)}</ul>
        </div>
        <dl className="grid gap-3 rounded-md bg-slate-50 p-4 md:grid-cols-2">
          <div><dt className="text-xs text-muted">Peso · Criticidad</dt><dd>{q.defaultWeight} · {q.criticality}{q.isCritical ? ' (crítico)' : ''}</dd></div>
          <div><dt className="text-xs text-muted">Nivel mínimo recomendado</dt><dd>{q.minimumRecommendedLevel}</dd></div>
          <div><dt className="text-xs text-muted">Aplicabilidad normativa</dt><dd>{LEGAL_APPLICABILITY_LABEL[q.legalApplicability]}</dd></div>
          <div><dt className="text-xs text-muted">Perfiles sugeridos</dt><dd>{q.suggestedRespondents.map((r) => PROFILE_LABEL[r]).join(', ')}</dd></div>
          <div><dt className="text-xs text-muted">Prerrequisitos</dt><dd>{q.prerequisiteQuestionIds.join(', ') || '—'}</dd></div>
          <div><dt className="text-xs text-muted">Referentes (asociación conceptual)</dt><dd>{q.sourceRefs.map((r) => `${r} ${getSource(r)?.shortLabel ?? ''}`).join(' · ')}</dd></div>
        </dl>
        {q.validationGuidance && <p className="text-xs text-muted">Guía de validación: {q.validationGuidance}</p>}
      </div>
    </Dialog>
  );
}
