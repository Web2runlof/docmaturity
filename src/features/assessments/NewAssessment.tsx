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
import { cx, plainText } from '@/utils/core';
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

  return (
    <>
      <PageHeader eyebrow="Proyecto de diagnóstico" title="Nueva evaluación" description="La versión metodológica, la versión del banco y las ponderaciones quedan congeladas en la evaluación." actions={<><Button onClick={() => nav(-1)}>Cancelar</Button><Button variant="primary" onClick={create} disabled={touched && !valid}>Crear evaluación</Button></>} />
      <div className="space-y-6">
        <Section title="Modalidad de diagnóstico" description="La selección de criterios no es aleatoria: cada modalidad incluye la anterior según relevancia, transversalidad y criticidad.">
          <div className="grid gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-4" role="radiogroup" aria-label="Modalidad">
            {MODALITIES.map((m, i) => (
              <button key={m} role="radio" aria-checked={modality === m} onClick={() => setModality(m)} className={cx('relative bg-white p-4 text-left transition-colors', modality === m ? 'bg-teal-50/40' : 'hover:bg-slate-50')}>
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-3xl font-semibold text-navy num">{MODALITY_INFO[m].count ?? '—'}</span>
                  {modality === m && <Check className="size-4 text-petrol" aria-hidden />}
                </div>
                <div className="mt-1 text-sm font-semibold text-ink">{MODALITY_LABEL[m]}</div>
                <p className="mt-2 text-xs text-muted">{MODALITY_INFO[m].text}</p>
                <div className="mt-3 flex gap-0.5" aria-hidden>{[0, 1, 2, 3].map((s) => <span key={s} className={cx('h-1 flex-1 rounded-full', s <= i ? 'bg-petrol' : 'bg-slate-200')} />)}</div>
              </button>
            ))}
          </div>
          {modality === 'custom' && (
            <div className="mt-5 space-y-4">
              <Field label="Base de criterios para las dimensiones seleccionadas" htmlFor="ctier"><Select id="ctier" className="max-w-sm" value={customTier} onChange={(e) => setCustomTier(e.target.value as typeof customTier)}><option value="quick">Criterios rápidos</option><option value="standard">Criterios estándar</option><option value="professional">Todos los criterios</option></Select></Field>
              <fieldset>
                <legend className="mb-2 text-sm font-medium">Dimensiones incluidas</legend>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {DIMENSIONS.map((d) => (
                    <label key={d.id} className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm">
                      <input type="checkbox" checked={dims.includes(d.id)} onChange={(e) => setDims((x) => (e.target.checked ? [...x, d.id].sort() as DimensionId[] : x.filter((y) => y !== d.id)))} />
                      <span className="font-medium text-navy">{d.id}</span> {d.name}
                    </label>
                  ))}
                </div>
              </fieldset>
              <p className="text-xs text-muted">Después de crearla podrá incluir o excluir criterios específicos con justificación, incorporar preguntas propias, ajustar metas y ponderaciones.</p>
            </div>
          )}
          <p className="mt-4 text-sm text-ink">Criterios seleccionados antes de filtros de pertinencia: <strong className="num">{count}</strong> de {QUESTIONS.length}.</p>
        </Section>
        <Section title="Datos de la evaluación">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Organización" htmlFor="org" required error={touched && !orgId ? 'Seleccione una organización' : undefined}>
              <Select id="org" value={orgId} onChange={(e) => setOrgId(e.target.value)}><option value="">Seleccione…</option>{orgs?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</Select>
            </Field>
            <Field label="Nombre" htmlFor="name" required error={touched && name.trim().length < 3 ? 'Indique un nombre de al menos 3 caracteres' : undefined}><Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Diagnóstico inicial 2026" /></Field>
            <Field label="Objetivo" htmlFor="obj"><Textarea id="obj" value={objective} onChange={(e) => setObjective(e.target.value)} /></Field>
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
    </>
  );
}
