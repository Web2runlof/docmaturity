import { useMemo, useState } from 'react';
import { ExternalLink, Download, Search } from 'lucide-react';
import type { LegalApplicability, SourceReference, VerificationStatus } from '@/types/bank';
import { DIMENSIONS, GLOSSARY, QUESTIONS, SOURCES, getSource } from '@/data/bank';
import { Callout, Field, Input, PageHeader, Section, Select, TabPanel, Tabs, Tag, Button } from '@/components/ui';
import { downloadBlob, sanitizeCell } from '@/utils/core';

export const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  verificado: 'Verificado',
  verificado_parcial: 'Verificado parcialmente',
  referencia_conceptual: 'Referencia conceptual',
  no_verificado: 'No verificado',
};
const VERIFICATION_TONE: Record<VerificationStatus, 'teal' | 'info' | 'neutral' | 'warning'> = {
  verificado: 'teal', verificado_parcial: 'info', referencia_conceptual: 'neutral', no_verificado: 'warning',
};
export const LEGAL_APPLICABILITY_LABEL: Record<LegalApplicability, string> = {
  obligacion_publica: 'Obligación para sujetos públicos',
  obligacion_general: 'Obligación general',
  sectorial: 'Regulación sectorial',
  buena_practica: 'Buena práctica',
};
const TYPE_LABEL: Record<SourceReference['type'], string> = {
  norma_juridica: 'Norma jurídica', estandar_tecnico: 'Estándar técnico', modelo_madurez: 'Modelo de madurez', modelo_requisitos: 'Modelo de requisitos',
  metodologia: 'Metodología', buena_practica: 'Buena práctica', referente_academico: 'Referente académico', modelo_gestion: 'Modelo de gestión',
};

export default function LibraryPage() {
  const [tab, setTab] = useState('referentes');
  return (
    <>
      <PageHeader eyebrow="Metodología" title="Biblioteca de referentes" description="Referentes normativos, técnicos y académicos que sustentan conceptualmente el modelo DIAM, con su estado de verificación, la trazabilidad de cada criterio y el glosario." />
      <Callout tone="info" title="Uso de los referentes">
        DOCMATURITY no reproduce textos protegidos por derechos de autor ni emite certificaciones. Las asociaciones entre criterios y referentes son conceptuales y no implican correspondencia con cláusulas o artículos específicos. Verifique siempre la versión vigente en la fuente oficial.
      </Callout>
      <div className="mt-6">
        <Tabs value={tab} onValueChange={setTab} tabs={[{ value: 'referentes', label: `Referentes (${SOURCES.length})` }, { value: 'trazabilidad', label: 'Trazabilidad' }, { value: 'glosario', label: `Glosario (${GLOSSARY.length})` }]}>
          <TabPanel value="referentes"><Sources /></TabPanel>
          <TabPanel value="trazabilidad"><Traceability /></TabPanel>
          <TabPanel value="glosario"><Glossary /></TabPanel>
        </Tabs>
      </div>
    </>
  );
}

export function Sources() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [group, setGroup] = useState('');
  const groups = [...new Set(SOURCES.map((s) => s.group))];
  const list = SOURCES.filter((s) => (!status || s.verificationStatus === status) && (!group || s.group === group) && (!q || `${s.id} ${s.title} ${s.shortLabel} ${s.author}`.toLowerCase().includes(q.toLowerCase())));
  const byGroup = groups.map((g) => ({ g, items: list.filter((s) => s.group === g) })).filter((x) => x.items.length);
  return (
    <div className="space-y-6">
      <div className="panel grid gap-3 p-4 md:grid-cols-[1fr_220px_220px]">
        <Field label="Buscar" htmlFor="src-q"><div className="relative"><Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted" aria-hidden /><Input id="src-q" className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Título, autor o código" /></div></Field>
        <Field label="Familia" htmlFor="src-g"><Select id="src-g" value={group} onChange={(e) => setGroup(e.target.value)}><option value="">Todas</option>{groups.map((g) => <option key={g}>{g}</option>)}</Select></Field>
        <Field label="Estado de verificación" htmlFor="src-s"><Select id="src-s" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos</option>{(Object.keys(VERIFICATION_LABEL) as VerificationStatus[]).map((s) => <option key={s} value={s}>{VERIFICATION_LABEL[s]}</option>)}</Select></Field>
      </div>
      {byGroup.map(({ g, items }) => (
        <section key={g} aria-label={g}>
          <h2 className="eyebrow mb-3">{g}</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {items.map((s) => (
              <article key={s.id} className="panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div><p className="text-xs text-muted">{s.id} · {TYPE_LABEL[s.type]}{s.year ? ` · ${s.year}` : ''}</p><h3 className="mt-1 text-base font-semibold">{s.title}</h3><p className="text-sm text-muted">{s.author}{s.version ? ` · ${s.version}` : ''}</p></div>
                  <Tag tone={VERIFICATION_TONE[s.verificationStatus]}>{VERIFICATION_LABEL[s.verificationStatus]}</Tag>
                </div>
                <dl className="mt-3 grid gap-2 text-sm">
                  <div><dt className="font-medium">Alcance</dt><dd className="text-muted">{s.scope}</dd></div>
                  <div><dt className="font-medium">Relación con DIAM</dt><dd className="text-muted">{s.relation}</dd></div>
                  {s.notEvaluates && <div><dt className="font-medium">Lo que DOCMATURITY no evalúa</dt><dd className="text-muted">{s.notEvaluates}</dd></div>}
                  {s.verifiedParts && <div><dt className="font-medium">Partes verificadas</dt><dd className="text-muted">{s.verifiedParts}</dd></div>}
                  {s.accessLimitations && <div><dt className="font-medium">Limitaciones de acceso</dt><dd className="text-muted">{s.accessLimitations}</dd></div>}
                </dl>
                <div className="mt-3 flex flex-wrap gap-1">{s.dimensions.map((d) => <Tag key={d}>{d}</Tag>)}</div>
                {s.urls.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm">{s.urls.map((u) => <li key={u}><a href={u} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all text-teal hover:underline">{u}<ExternalLink className="size-3 shrink-0" aria-hidden /><span className="sr-only">(se abre en una pestaña nueva)</span></a></li>)}</ul>
                )}
                {s.consultedAt && <p className="mt-2 text-xs text-muted">Fecha de consulta: {s.consultedAt}</p>}
              </article>
            ))}
          </div>
        </section>
      ))}
      {!byGroup.length && <p className="text-sm text-muted">No hay referentes con esos filtros.</p>}
    </div>
  );
}

function Traceability() {
  const [dim, setDim] = useState('D01');
  const rows = useMemo(() => QUESTIONS.filter((q) => !dim || q.dimensionId === dim), [dim]);
  const exportCsv = () => {
    const header = ['Dimensión', 'Criterio', 'Nombre', 'Componente MGDA', 'Referentes', 'Estado de asociación', 'Aplicabilidad normativa', 'Crítico', 'Núcleo'];
    const lines = QUESTIONS.map((q) => [q.dimensionId, q.id, q.criterion, q.mgdaComponent, q.sourceRefs.join(' '), q.sourceMappingStatus, LEGAL_APPLICABILITY_LABEL[q.legalApplicability], q.isCritical ? 'sí' : 'no', q.coreTier]);
    const csv = [header, ...lines].map((r) => r.map((c) => `"${sanitizeCell(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    downloadBlob(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), 'docmaturity-trazabilidad.csv');
  };
  return (
    <Section title="Dimensión → criterio → componente MGDA → referentes → aplicabilidad" description="El componente MGDA se usa como lente de lectura; no constituye un puntaje oficial del instrumento." actions={
      <>
        <Select aria-label="Dimensión" className="w-60" value={dim} onChange={(e) => setDim(e.target.value)}><option value="">Todas las dimensiones</option>{DIMENSIONS.map((d) => <option key={d.id} value={d.id}>{d.id} · {d.name}</option>)}</Select>
        <Button size="sm" icon={<Download className="size-3.5" />} onClick={exportCsv}>CSV completo</Button>
      </>
    }>
      <div className="overflow-x-auto"><table className="table-pro">
        <thead><tr><th>Criterio</th><th>Componente MGDA</th><th>Referentes</th><th>Asociación</th><th>Aplicabilidad</th></tr></thead>
        <tbody>{rows.map((q) => (
          <tr key={q.id}>
            <td><span className="font-medium text-navy">{q.id}</span>{q.isCritical && <span className="ml-2"><Tag tone="danger">crítico</Tag></span>}<div className="text-xs text-muted">{q.criterion}</div></td>
            <td className="text-xs">{q.mgdaComponent}</td>
            <td><div className="flex flex-wrap gap-1">{q.sourceRefs.map((r) => { const s = getSource(r); return <span key={r} title={s?.title} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px]">{r}{s ? ` · ${s.shortLabel}` : ''}</span>; })}</div></td>
            <td className="text-xs text-muted">{q.sourceMappingStatus === 'verificada' ? 'Verificada' : 'Asociación conceptual'}</td>
            <td className="text-xs">{LEGAL_APPLICABILITY_LABEL[q.legalApplicability]}</td>
          </tr>
        ))}</tbody>
      </table></div>
    </Section>
  );
}

function Glossary() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const cats = [...new Set(GLOSSARY.map((g) => g.category))].sort((a, b) => a.localeCompare(b, 'es'));
  const list = GLOSSARY.filter((g) => (!cat || g.category === cat) && (!q || `${g.term} ${g.aliases.join(' ')} ${g.definition}`.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => a.term.localeCompare(b.term, 'es'));
  return (
    <div className="space-y-4">
      <div className="panel grid gap-3 p-4 md:grid-cols-[1fr_260px]">
        <Field label="Buscar término" htmlFor="gl-q"><Input id="gl-q" value={q} onChange={(e) => setQ(e.target.value)} /></Field>
        <Field label="Categoría" htmlFor="gl-c"><Select id="gl-c" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Todas</option>{cats.map((c) => <option key={c}>{c}</option>)}</Select></Field>
      </div>
      <dl className="grid gap-3 lg:grid-cols-2">
        {list.map((g) => (
          <div key={g.id} id={`termino-${g.id}`} className="panel p-4">
            <dt className="flex flex-wrap items-baseline justify-between gap-2"><span className="font-display font-semibold text-navy">{g.term}</span><span className="text-xs text-muted">{g.category}</span></dt>
            <dd className="mt-1 text-sm text-ink">{g.definition}</dd>
            {(g.aliases.length > 0 || g.refs.length > 0) && <dd className="mt-2 text-xs text-muted">{g.aliases.length > 0 && <>También: {g.aliases.join(', ')}. </>}{g.refs.length > 0 && <>Referentes: {g.refs.join(', ')}.</>}</dd>}
          </div>
        ))}
      </dl>
      {!list.length && <p className="text-sm text-muted">Sin resultados.</p>}
    </div>
  );
}
