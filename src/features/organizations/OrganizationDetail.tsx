import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Archive, ArchiveRestore, Copy, Download, Pencil, Plus, Trash2 } from 'lucide-react';
import { db } from '@/database/db';
import { Button, ConfirmDialog, KeyValue, PageHeader, Section, Tag } from '@/components/ui';
import { DOCUMENTARY_FIELDS, getProfile } from '@/data/sector-profiles';
import { deleteOrganization, duplicateOrganization, organizationDependencies, setOrganizationArchived } from '@/services/repo';
import { buildAssessmentPackage, buildOrganizationPackage } from '@/services/packages';
import { ExportDialog } from '../shared/ExportDialog';
import { attempt } from '@/app/store';
import { downloadJSON, fmtDate, slugify } from '@/utils/core';
import { Loading, MODALITY_LABEL, NotFound, STATUS_LABEL } from '../common';

const TRI: Record<string, string> = { si: 'Sí', no: 'No', desconocido: 'Desconocido' };

export default function OrganizationDetail() {
  const { oid = '' } = useParams();
  const nav = useNavigate();
  const org = useLiveQuery(() => db.organizations.get(oid).then((o) => o ?? null), [oid]);
  const deps = useLiveQuery(() => db.departments.where('organizationId').equals(oid).toArray(), [oid]);
  const assessments = useLiveQuery(() => db.assessments.where('organizationId').equals(oid).toArray(), [oid]);
  const [del, setDel] = useState(false);
  const [exp, setExp] = useState(false);
  const [counts, setCounts] = useState<Awaited<ReturnType<typeof organizationDependencies>> | null>(null);
  if (org === undefined) return <Loading />;
  if (org === null) return <NotFound what="La organización" />;

  const openDelete = async () => { setCounts(await organizationDependencies(oid)); setDel(true); };
  const exportAll = async () => {
    for (const a of assessments ?? []) downloadJSON(await buildAssessmentPackage(a.id), `${slugify(org.name)}-${slugify(a.name)}.dm-assessment.json`);
  };

  return (
    <>
      <PageHeader eyebrow={getProfile(org.profileId).label} title={org.name} description={org.shortName} actions={
        <>
          <Link to={`/app/organizaciones/${oid}/editar`}><Button icon={<Pencil className="size-4" />}>Editar</Button></Link>
          <Button icon={<Download className="size-4" />} onClick={() => setExp(true)}>Exportar JSON</Button>
          <Button icon={<Copy className="size-4" />} onClick={async () => { const id = await attempt(() => duplicateOrganization(oid), 'Organización duplicada'); if (id) nav(`/app/organizaciones/${id}`); }}>Duplicar</Button>
          <Button icon={org.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />} onClick={() => attempt(() => setOrganizationArchived(oid, !org.archived), org.archived ? 'Organización restaurada' : 'Organización archivada')}>{org.archived ? 'Restaurar' : 'Archivar'}</Button>
          <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={openDelete}>Eliminar</Button>
        </>
      } />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Section title="Evaluaciones" actions={<Link to={`/app/evaluaciones/nueva?org=${oid}`}><Button size="sm" variant="primary" icon={<Plus className="size-3.5" />}>Nueva evaluación</Button></Link>}>
            {assessments?.length ? (
              <ul className="divide-y divide-line">
                {assessments.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <Link to={`/app/evaluaciones/${a.id}`} className="font-medium text-navy hover:underline">{a.name}</Link>
                      <p className="text-xs text-muted">{MODALITY_LABEL[a.modality]} · {a.questionIds.length} criterios · revisión {a.revision} · {fmtDate(a.updatedAt)}</p>
                    </div>
                    <Tag>{STATUS_LABEL[a.status]}</Tag>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">Sin evaluaciones.</p>}
          </Section>
          <Section title="Datos básicos">
            <KeyValue items={[
              { k: 'Sector', v: org.sector }, { k: 'Actividad principal', v: org.mainActivity }, { k: 'Ubicación', v: [org.municipality, org.department].filter(Boolean).join(', ') },
              { k: 'Tamaño', v: org.size }, { k: 'Empleados', v: org.employees }, { k: 'Contratistas', v: org.contractors }, { k: 'Sedes', v: org.sites }, { k: 'NIT', v: org.nit },
              { k: 'Sitio web', v: org.website }, { k: 'Año de constitución', v: org.foundedYear },
              { k: 'Dependencias', v: deps?.map((d) => d.name).join(', ') }, { k: 'Procesos misionales', v: org.missionProcesses },
            ]} />
            {org.description && <p className="mt-4 border-t border-line pt-4 text-sm text-ink">{org.description}</p>}
          </Section>
        </div>
        <div className="space-y-6">
          <Section title="Aplicabilidad jurídica declarada">
            <KeyValue items={[
              { k: 'Funciones públicas', v: TRI[org.legalFlags.publicFunctions] }, { k: 'Recursos públicos', v: TRI[org.legalFlags.publicResources] },
              { k: 'Servicios públicos', v: TRI[org.legalFlags.publicServices] }, { k: 'Datos personales', v: TRI[org.legalFlags.personalData] },
              { k: 'Valor histórico', v: TRI[org.legalFlags.historicalValue] }, { k: 'Regulación sectorial', v: org.legalFlags.sectoralRegulation },
            ]} />
          </Section>
          <Section title="Caracterización documental">
            <dl className="space-y-2 text-sm">
              {DOCUMENTARY_FIELDS.filter((f) => org.documentary[f.key]?.value).map((f) => (
                <div key={f.key} className="flex justify-between gap-3 border-b border-line pb-2 last:border-0">
                  <dt className="text-muted">{f.label}</dt>
                  <dd className="text-right">{TRI[org.documentary[f.key].value] ?? org.documentary[f.key].value} <span className="text-xs text-muted">({org.documentary[f.key].quality})</span></dd>
                </div>
              ))}
              {!DOCUMENTARY_FIELDS.some((f) => org.documentary[f.key]?.value) && <p className="text-muted">Sin caracterización documental registrada.</p>}
            </dl>
          </Section>
        </div>
      </div>
      <ConfirmDialog open={del} onOpenChange={setDel} danger title="Eliminar organización" confirmLabel="Eliminar definitivamente" requireText="ELIMINAR" onConfirm={async () => { await attempt(() => deleteOrganization(oid), 'Organización eliminada'); nav('/app/organizaciones'); }}
        description="Esta operación elimina de forma consistente la organización y todos sus datos dependientes. No se puede deshacer.">
        {counts && (
          <div className="space-y-3 text-sm">
            <p>Dependencias: <strong>{counts.assessments}</strong> evaluaciones, <strong>{counts.participants}</strong> participantes, <strong>{counts.interviews}</strong> entrevistas, <strong>{counts.responses}</strong> respuestas y <strong>{counts.evidence}</strong> evidencias.</p>
            {counts.assessments > 0 && <Button size="sm" icon={<Download className="size-3.5" />} onClick={exportAll}>Exportar evaluaciones antes de eliminar</Button>}
          </div>
        )}
      </ConfirmDialog>
      <ExportDialog open={exp} onOpenChange={setExp} title="Exportar organización" fileName={`${slugify(org.name)}.dm-organization.json`} payloadFormat="dm-organization" build={() => buildOrganizationPackage(oid)} note="Incluye la caracterización, las condiciones jurídicas y las dependencias, con versiones de esquema y metodología. No incluye evaluaciones: expórtelas desde cada evaluación." />
    </>
  );
}
