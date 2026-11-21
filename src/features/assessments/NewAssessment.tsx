import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check } from 'lucide-react';
import type { AssessmentModality } from '@/types/domain';
import type { DimensionId } from '@/types/bank';
import { db } from '@/database/db';
import { Button, Callout, Field, Input, PageHeader, Section, Select, Textarea } from '@/components/ui';
import { DIMENSIONS, QUESTIONS, questionIdsForTier } from '@/data/bank';
import { newAssessment, saveAssessment } from '@/services/repo';
import { attemptOk } from '@/app/store';
import { cx, fmtPct, plainText } from '@/utils/core';
import { MODALITY_INFO, MODALITY_LABEL } from '../common';

const MODALITIES: AssessmentModality[] = ['quick', 'standard', 'professional', 'custom'];

export default function NewAssessment() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const orgs = useLiveQuery(() => db.organizations.filter((o) => !o.archived && !o.isDemo && !o.isAcademic).toArray(), []);
  const [orgId, setOrgId] = useState(params.get('org') ?? '');
  const [modality, setModality] = useState<AssessmentModality>('standard');
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState('');
  const [lead, setLead] = useState('');
  const [team, setTeam] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [dims, setDims] = useState<DimensionId[]>(DIMENSIONS.map((d) => d.id));
  const [customTier, setCustomTier] = useState<'quick' | 'standard' | 'professional'>('standard');
  const [touched, setTouched] = useState(false);

  const count = useMemo(() => (modality === 'custom' ? questionIdsForTier(customTier, dims).length : MODALITY_INFO[modality].count ?? 0), [modality, customTier, dims]);
  const valid = orgId && name.trim().length >= 3 && (modality !== 'custom' || dims.length > 0);

  const create = async () => {
    setTouched(true);
    if (!valid) return;
    const tier = modality === 'custom' ? customTier : modality;
    const a = newAssessment(orgId, modality, {
      name: plainText(name, 200), objective: plainText(objective), description: plainText(description), scope: plainText(scope), lead, team, startDate, endDate,
      selectedDimensions: modality === 'custom' ? dims : DIMENSIONS.map((d) => d.id), questionIds: questionIdsForTier(tier, modality === 'custom' ? dims : undefined),
      status: 'planificacion',
    });
    const ok = await attemptOk(() => saveAssessment(a, 'crear'), 'Evaluación creada');
    if (ok) nav(`/app/evaluaciones/${a.id}${modality === 'custom' ? '/alcance' : ''}`);
  };

  if (orgs && !orgs.length) {
    return (
      <>
        <PageHeader title="Nueva evaluación" />
        <Callout tone="info" title="Primero cree una organización">Las evaluaciones se asocian a una organización caracterizada. <Link to="/app/organizaciones/nueva" className="font-medium text-teal underline">Crear organización</Link>.</Callout>
      </>
    );
  }

  const org = orgs?.find((o) => o.id === orgId);
  const USE: Record<AssessmentModality, string> = { quick: 'Una sesión', standard: 'Varias entrevistas', professional: 'Consultoría', custom: 'Alcance focalizado' };
  return (
    <>
      <PageHeader eyebrow="Proyecto de diagnóstico" title="Nueva evaluación" description="La versión metodológica, la versión del banco y las ponderaciones quedan congeladas en la evaluación." actions={<><Button onClick={() => nav(-1)}>Cancelar</Button><Button variant="primary" onClick={create} disabled={touched && !valid}>Crear evaluación</Button></>} />
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Section eyebrow="Paso 1 de 2" title="Modalidad de diagnóstico" description="La selección de criterios no es aleatoria: cada modalidad incluye la anterior según relevancia, transversalidad y criticidad.">
            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4" role="radiogroup" aria-label="Modalidad">
              {MODALITIES.map((m, i) => {
                const on = modality === m;
                const n = MODALITY_INFO[m].count;
                return (
                  <button key={m} type="button" role="radio" aria-checked={on} onClick={() => setModality(m)} className={cx('relative flex flex-col rounded-lg border p-4 text-left transition-[border-color,box-shadow,background-color] duration-200', on ? 'border-mint-strong bg-mint-soft/50 shadow-[0_0_0_1px_var(--color-mint-strong)]' : 'border-line bg-white hover:border-[#b8c4d4]')}>
                    <span className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-navy">{MODALITY_LABEL[m]}</span>
                      <span aria-hidden className={cx('flex size-5 items-center justify-center rounded-full border-2 transition-colors', on ? 'border-mint-strong bg-mint-strong text-white' : 'border-[#cbd5e1]')}>{on && <Check className="size-3" />}</span>
                    </span>
                    <span className="mt-1 text-xs font-medium text-mint-strong">{USE[m]}</span>
                    <span className="mt-4 font-display text-[2rem] leading-none font-bold text-navy num">{n ?? 'A la medida'}</span>
                    <span className="mt-1 text-xs text-muted">{n ? `criterios · ${fmtPct((n / QUESTIONS.length) * 100)} del banco` : 'dimensiones y criterios elegidos'}</span>
                    <span className="mt-3 flex gap-0.5" aria-hidden>{[0, 1, 2, 3].map((x) => <span key={x} className={cx('h-1 flex-1 rounded-full', x <= i ? 'bg-petrol' : 'bg-neutral')} />)}</span>
                    <span className="mt-3 text-xs leading-relaxed text-muted">{MODALITY_INFO[m].text}</span>
                  </button>
                );
              })}
            </div>
            {modality === 'custom' && (
              <div className="mt-5 space-y-4 rounded-lg border border-dashed border-[#b8c4d4] bg-soft p-4">
                <Field label="Base de criterios para las dimensiones seleccionadas" htmlFor="ctier"><Select id="ctier" className="max-w-sm" value={customTier} onChange={(e) => setCustomTier(e.target.value as typeof customTier)}><option value="quick">Criterios rápidos</option><option value="standard">Criterios estándar</option><option value="professional">Todos los criterios</option></Select></Field>
                <fieldset>
                  <legend className="mb-2 text-sm font-medium">Dimensiones incluidas</legend>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {DIMENSIONS.map((d) => (
                      <label key={d.id} className={cx('flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-sm transition-colors focus-within:ring-2 focus-within:ring-mint-strong/40', dims.includes(d.id) ? 'border-mint-strong/50 bg-white' : 'border-line bg-white/60 hover:bg-white')}>
                        <input type="checkbox" className="size-4 accent-[#0b7a58]" checked={dims.includes(d.id)} onChange={(e) => setDims((x) => (e.target.checked ? [...x, d.id].sort() as DimensionId[] : x.filter((y) => y !== d.id)))} />
                        <span className="font-semibold text-mint-strong num">{d.id}</span> {d.name}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <p className="text-xs text-muted">Después de crearla podrá incluir o excluir criterios específicos con justificación, incorporar preguntas propias, ajustar metas y ponderaciones.</p>
              </div>
            )}
            <p className="mt-4 text-sm text-ink">Criterios seleccionados antes de filtros de pertinencia: <strong className="num">{count}</strong> de {QUESTIONS.length}.</p>
          </Section>
          <Section eyebrow="Paso 2 de 2" title="Datos de la evaluación">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Organización" htmlFor="org" required error={touched && !orgId ? 'Seleccione una organización' : undefined}>
                <Select id="org" value={orgId} onChange={(e) => setOrgId(e.target.value)}><option value="">Seleccione…</option>{orgs?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</Select>
              </Field>
              <Field label="Nombre" htmlFor="name" required error={touched && name.trim().length < 3 ? 'Indique un nombre de al menos 3 caracteres' : undefined}><Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Diagnóstico inicial 2026" /></Field>
              <Field label="Objetivo del diagnóstico" htmlFor="obj"><Textarea id="obj" value={objective} onChange={(e) => setObjective(e.target.value)} /></Field>
              <Field label="Descripción" htmlFor="desc"><Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
              <Field label="Alcance" htmlFor="scope" hint="Por ejemplo: toda la organización, una dependencia o un proceso."><Textarea id="scope" value={scope} onChange={(e) => setScope(e.target.value)} /></Field>
              <div className="grid gap-4">
                <Field label="Responsable" htmlFor="lead"><Input id="lead" value={lead} onChange={(e) => setLead(e.target.value)} /></Field>
                <Field label="Equipo evaluador" htmlFor="team"><Input id="team" value={team} onChange={(e) => setTeam(e.target.value)} /></Field>
              </div>
              <Field label="Fecha de inicio" htmlFor="sd"><Input id="sd" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
              <Field label="Fecha de cierre" htmlFor="ed"><Input id="ed" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></Field>
            </div>
          </Section>
        </div>
        {/* Resumen permanente de lo que se va a crear. */}
        <aside aria-label="Resumen de la evaluación" className="xl:sticky xl:top-20 xl:self-start">
          <div className="on-dark rounded-xl bg-midnight p-5 text-white">
            <p className="eyebrow">Resumen</p>
            <dl className="mt-4 space-y-3.5 text-sm">
              <div><dt className="text-xs text-fog">Organización</dt><dd className="mt-0.5 font-medium">{org?.name ?? <span className="text-fog">Sin seleccionar</span>}</dd></div>
              <div><dt className="text-xs text-fog">Nombre</dt><dd className="mt-0.5 font-medium break-words">{name.trim() || <span className="text-fog">Sin nombre</span>}</dd></div>
              <div><dt className="text-xs text-fog">Modalidad</dt><dd className="mt-0.5 font-medium">{MODALITY_LABEL[modality]}</dd></div>
              <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-3.5">
                <div><dt className="text-xs text-fog">Criterios</dt><dd className="mt-0.5 font-display text-2xl font-bold text-mint num">{count}</dd></div>
                <div><dt className="text-xs text-fog">Dimensiones</dt><dd className="mt-0.5 font-display text-2xl font-bold num">{modality === 'custom' ? dims.length : DIMENSIONS.length}</dd></div>
              </div>
            </dl>
            <Button variant="primary" className="mt-5 w-full" onClick={create} disabled={touched && !valid}>Crear evaluación</Button>
            {touched && !valid && <p className="mt-2 text-xs text-[#F1D08B]" role="status">Complete la organización y un nombre de al menos 3 caracteres{modality === 'custom' ? ', y elija al menos una dimensión' : ''}.</p>}
          </div>
        </aside>
      </div>
    </>
  );
}
