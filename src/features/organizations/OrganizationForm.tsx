import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/database/db';
import { Button, Callout, Field, Input, PageHeader, Section, Select, Textarea } from '@/components/ui';
import { DOCUMENTARY_FIELDS, SECTOR_PROFILES, getProfile } from '@/data/sector-profiles';
import { newOrganization, saveOrganization } from '@/services/repo';
import type { CharacterizationField, DataQuality, Organization, Tri } from '@/types/domain';
import { attemptOk } from '@/app/store';
import { plainText } from '@/utils/core';
import { Loading } from '../common';

const tri = z.enum(['si', 'no', 'desconocido']);
const schema = z.object({
  name: z.string().trim().min(2, 'Indique el nombre o razón social').max(250),
  shortName: z.string().max(80),
  profileId: z.string(),
  nit: z.string().max(20).regex(/^[0-9.\- ]*$/, 'Use solo números, puntos o guiones'),
  sector: z.string().max(120),
  mainActivity: z.string().max(250),
  department: z.string().max(80),
  municipality: z.string().max(80),
  size: z.enum(['', 'micro', 'pequena', 'mediana', 'grande']),
  employees: z.string().max(20),
  contractors: z.string().max(20),
  sites: z.string().max(20),
  missionProcesses: z.string().max(2000),
  foundedYear: z.string().max(4).regex(/^(\d{4})?$/, 'Año de cuatro dígitos'),
  website: z.string().max(200).refine((v) => !v || /^https?:\/\/[^\s]+$/.test(v), 'Use una dirección que inicie con https://'),
  description: z.string().max(4000),
  departments: z.string().max(4000),
  publicFunctions: tri, publicResources: tri, publicServices: tri, personalData: tri, historicalValue: tri,
  sectoralRegulation: z.string().max(500),
  retentionObligations: z.string().max(1000),
  affectedScope: z.string().max(1000),
});
type FormValues = z.infer<typeof schema>;

const TRI_LABEL: Record<Tri, string> = { si: 'Sí', no: 'No', desconocido: 'Desconocido' };
const QUALITY_LABEL: Record<DataQuality, string> = { proporcionado: 'Proporcionado', estimado: 'Estimado', verificado: 'Verificado', desconocido: 'Desconocido' };

export default function OrganizationForm() {
  const { oid } = useParams();
  const nav = useNavigate();
  const existing = useLiveQuery<Organization | null | undefined>(async () => (oid ? (await db.organizations.get(oid)) ?? null : null), [oid]);
  const deps = useLiveQuery<{ name: string }[]>(async () => (oid ? db.departments.where('organizationId').equals(oid).toArray() : []), [oid]);
  const [documentary, setDocumentary] = useState<Record<string, CharacterizationField>>({});
  const [logo, setLogo] = useState('');
  const [logoError, setLogoError] = useState('');
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toForm(newOrganization(), []) });

  useEffect(() => {
    if (existing && deps) {
      reset(toForm(existing, deps.map((d) => d.name)));
      setDocumentary(existing.documentary);
      setLogo(existing.logoDataUrl);
    }
  }, [existing, deps, reset]);

  if (oid && existing === undefined) return <Loading />;
  const profile = getProfile(watch('profileId'));

  const onSubmit = async (v: FormValues) => {
    const base = existing ?? newOrganization();
    const org: Organization = {
      ...base,
      name: plainText(v.name, 250), shortName: v.shortName, profileId: v.profileId, nit: v.nit, sector: v.sector, mainActivity: v.mainActivity, department: v.department,
      municipality: v.municipality, size: v.size, employees: v.employees, contractors: v.contractors, sites: v.sites, missionProcesses: v.missionProcesses,
      foundedYear: v.foundedYear, website: v.website, description: plainText(v.description), logoDataUrl: logo, documentary,
      legalFlags: { publicFunctions: v.publicFunctions, publicResources: v.publicResources, publicServices: v.publicServices, personalData: v.personalData, historicalValue: v.historicalValue, sectoralRegulation: v.sectoralRegulation, retentionObligations: v.retentionObligations, affectedScope: v.affectedScope },
    };
    const ok = await attemptOk(() => saveOrganization(org, v.departments.split('\n')), existing ? 'Organización actualizada' : 'Organización creada');
    if (ok) nav(`/app/organizaciones/${org.id}`);
  };

  const onLogo = async (f: File) => {
    setLogoError('');
    if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(f.type)) return setLogoError('Use una imagen PNG, JPG, WEBP o SVG.');
    if (f.size > 300 * 1024) return setLogoError('El logo no debe superar 300 KB.');
    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result));
    reader.readAsDataURL(f);
  };

  const setDoc = (key: string, patch: Partial<CharacterizationField>) =>
    setDocumentary((d) => ({ ...d, [key]: { value: d[key]?.value ?? '', quality: d[key]?.quality ?? 'proporcionado', ...patch } }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <PageHeader eyebrow="Caracterización" title={existing ? `Editar ${existing.name}` : 'Nueva organización'} description="Los campos opcionales pueden dejarse vacíos o marcarse como desconocidos: la aplicación no los rellena automáticamente." actions={<><Button onClick={() => nav(-1)}>Cancelar</Button><Button type="submit" variant="primary" busy={isSubmitting}>Guardar</Button></>} />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Section title="Datos básicos">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nombre o razón social" htmlFor="name" required error={errors.name?.message}><Input id="name" {...register('name')} aria-invalid={Boolean(errors.name)} /></Field>
              <Field label="Nombre abreviado" htmlFor="shortName"><Input id="shortName" {...register('shortName')} /></Field>
              <Field label="NIT (opcional)" htmlFor="nit" error={errors.nit?.message} hint="No es obligatorio y no se usa para ningún cálculo."><Input id="nit" {...register('nit')} inputMode="numeric" /></Field>
              <Field label="Sector económico" htmlFor="sector"><Input id="sector" {...register('sector')} /></Field>
              <Field label="Actividad principal" htmlFor="mainActivity"><Input id="mainActivity" {...register('mainActivity')} /></Field>
              <Field label="Tamaño organizacional" htmlFor="size"><Select id="size" {...register('size')}><option value="">Sin definir</option><option value="micro">Micro</option><option value="pequena">Pequeña</option><option value="mediana">Mediana</option><option value="grande">Grande</option></Select></Field>
              <Field label="Departamento" htmlFor="department"><Input id="department" {...register('department')} /></Field>
              <Field label="Municipio" htmlFor="municipality"><Input id="municipality" {...register('municipality')} /></Field>
              <Field label="Número aproximado de empleados" htmlFor="employees"><Input id="employees" {...register('employees')} inputMode="numeric" /></Field>
              <Field label="Número de contratistas (cuando aplique)" htmlFor="contractors"><Input id="contractors" {...register('contractors')} inputMode="numeric" /></Field>
              <Field label="Número de sedes" htmlFor="sites"><Input id="sites" {...register('sites')} inputMode="numeric" /></Field>
              <Field label="Año de constitución (opcional)" htmlFor="foundedYear" error={errors.foundedYear?.message}><Input id="foundedYear" {...register('foundedYear')} inputMode="numeric" /></Field>
              <Field label="Sitio web (opcional)" htmlFor="website" error={errors.website?.message}><Input id="website" {...register('website')} placeholder="https://" /></Field>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Dependencias o áreas" htmlFor="departments" hint="Una por línea. Se usan para asignar participantes y en el mapa de calor por área."><Textarea id="departments" rows={5} {...register('departments')} /></Field>
              <Field label="Procesos misionales" htmlFor="missionProcesses"><Textarea id="missionProcesses" rows={5} {...register('missionProcesses')} /></Field>
            </div>
            <div className="mt-4"><Field label="Descripción organizacional" htmlFor="description"><Textarea id="description" rows={4} {...register('description')} /></Field></div>
          </Section>

          <Section title="Naturaleza jurídica y aplicabilidad" description="La aplicación no clasifica a la organización como sujeto obligado por su nombre, naturaleza societaria o sector. Responda según el ámbito de información afectado.">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Perfil organizacional" htmlFor="profileId"><Select id="profileId" {...register('profileId')}>{SECTOR_PROFILES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</Select></Field>
              <div className="rounded-md bg-canvas px-3 py-2 text-xs text-muted">{profile.description} {profile.terminologyNote}</div>
              {([['publicFunctions', '¿Ejerce funciones públicas?'], ['publicResources', '¿Administra recursos públicos?'], ['publicServices', '¿Presta servicios públicos?'], ['personalData', '¿Trata datos personales?'], ['historicalValue', '¿Tiene documentos con valor histórico o patrimonial?']] as const).map(([k, label]) => (
                <Field key={k} label={label} htmlFor={k}><Select id={k} {...register(k)}>{(['si', 'no', 'desconocido'] as Tri[]).map((t) => <option key={t} value={t}>{TRI_LABEL[t]}</option>)}</Select></Field>
              ))}
              <Field label="Regulaciones sectoriales" htmlFor="sectoralRegulation"><Input id="sectoralRegulation" {...register('sectoralRegulation')} /></Field>
              <Field label="Obligaciones específicas de conservación" htmlFor="retentionObligations"><Textarea id="retentionObligations" rows={2} {...register('retentionObligations')} /></Field>
              <Field label="Ámbito de información afectado por cada obligación" htmlFor="affectedScope"><Textarea id="affectedScope" rows={2} {...register('affectedScope')} /></Field>
            </div>
          </Section>

          <Section title="Caracterización documental" description="Indique para cada dato si fue proporcionado, estimado o verificado. Los datos desconocidos se registran como tales.">
            <div className="divide-y divide-line">
              {DOCUMENTARY_FIELDS.map((f) => {
                const cur = documentary[f.key];
                return (
                  <div key={f.key} className="grid gap-2 py-3 md:grid-cols-[1fr_1.2fr_160px] md:items-center">
                    <label htmlFor={`doc-${f.key}`} className="text-sm text-ink">{f.label}</label>
                    {f.kind === 'tri' ? (
                      <Select id={`doc-${f.key}`} value={cur?.value ?? ''} onChange={(e) => setDoc(f.key, { value: e.target.value })}>
                        <option value="">Sin registrar</option><option value="si">Sí</option><option value="no">No</option><option value="desconocido">Desconocido</option>
                      </Select>
                    ) : <Input id={`doc-${f.key}`} value={cur?.value ?? ''} onChange={(e) => setDoc(f.key, { value: e.target.value })} />}
                    <Select aria-label={`Calidad del dato: ${f.label}`} value={cur?.quality ?? 'proporcionado'} onChange={(e) => setDoc(f.key, { quality: e.target.value as DataQuality })} disabled={!cur?.value}>
                      {(Object.keys(QUALITY_LABEL) as DataQuality[]).map((q) => <option key={q} value={q}>{QUALITY_LABEL[q]}</option>)}
                    </Select>
                  </div>
                );
              })}
            </div>
          </Section>
        </div>
        <div className="space-y-6">
          <Section title="Logo (opcional)" description="Se guarda solo en este navegador.">
            {logo ? <img src={logo} alt="Logo de la organización" className="mb-3 max-h-24 rounded border border-line bg-white p-2" /> : <p className="mb-3 text-sm text-muted">Sin logo.</p>}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" aria-label="Cargar logo" onChange={(e) => { const f = e.target.files?.[0]; if (f) onLogo(f); }} className="text-sm" />
            {logoError && <p className="mt-2 text-xs text-danger" role="alert">{logoError}</p>}
            {logo && <Button size="sm" className="mt-3" onClick={() => setLogo('')}>Quitar logo</Button>}
          </Section>
          <Callout tone="info" title="Minimización de información">No registre información personal innecesaria. Para identificar participantes se usan códigos o seudónimos.</Callout>
        </div>
      </div>
    </form>
  );
}

function toForm(o: Organization, departments: string[]): FormValues {
  return {
    name: o.name, shortName: o.shortName, profileId: o.profileId, nit: o.nit, sector: o.sector, mainActivity: o.mainActivity, department: o.department,
    municipality: o.municipality, size: o.size, employees: o.employees, contractors: o.contractors, sites: o.sites, missionProcesses: o.missionProcesses,
    foundedYear: o.foundedYear, website: o.website, description: o.description, departments: departments.join('\n'),
    publicFunctions: o.legalFlags.publicFunctions, publicResources: o.legalFlags.publicResources, publicServices: o.legalFlags.publicServices,
    personalData: o.legalFlags.personalData, historicalValue: o.legalFlags.historicalValue, sectoralRegulation: o.legalFlags.sectoralRegulation,
    retentionObligations: o.legalFlags.retentionObligations, affectedScope: o.legalFlags.affectedScope,
  };
}
