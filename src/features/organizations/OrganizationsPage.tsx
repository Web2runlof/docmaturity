import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Building2, Plus, Search } from 'lucide-react';
import { db } from '@/database/db';
import { Button, EmptyState, Input, PageHeader, Section, Select, Tag } from '@/components/ui';
import { getProfile } from '@/data/sector-profiles';
import { fmtDate } from '@/utils/core';

export default function OrganizationsPage() {
  const orgs = useLiveQuery(() => db.organizations.toArray(), []);
  const counts = useLiveQuery(async () => {
    const all = await db.assessments.toArray();
    return all.reduce<Record<string, number>>((m, a) => ({ ...m, [a.organizationId]: (m[a.organizationId] ?? 0) + 1 }), {});
  }, []);
  const [q, setQ] = useState('');
  const [view, setView] = useState<'activas' | 'archivadas' | 'simuladas'>('activas');
  const list = useMemo(() => (orgs ?? []).filter((o) => {
    if (view === 'simuladas') return o.isDemo || o.isAcademic;
    if (o.isDemo || o.isAcademic) return false;
    return view === 'archivadas' ? o.archived : !o.archived;
  }).filter((o) => `${o.name} ${o.shortName} ${o.sector} ${o.municipality}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name)), [orgs, q, view]);

  return (
    <>
      <PageHeader eyebrow="Caracterización" title="Organizaciones" description="Cada organización puede tener múltiples evaluaciones. Los datos se separan por organización y evaluación." actions={<Link to="/app/organizaciones/nueva"><Button variant="primary" icon={<Plus className="size-4" />}>Crear organización</Button></Link>} />
      <Section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted" aria-hidden />
            <Input aria-label="Buscar organizaciones" placeholder="Buscar por nombre, sector o municipio" className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select aria-label="Filtrar organizaciones" className="sm:w-56" value={view} onChange={(e) => setView(e.target.value as typeof view)}>
            <option value="activas">Activas</option>
            <option value="archivadas">Archivadas</option>
            <option value="simuladas">Casos simulados</option>
          </Select>
        </div>
        {!orgs ? null : list.length === 0 ? (
          <EmptyState icon={<Building2 className="size-8" />} title={view === 'activas' ? 'No hay organizaciones activas' : 'No hay resultados'} description="Cree una organización para iniciar su caracterización y sus evaluaciones." actions={<Link to="/app/organizaciones/nueva"><Button variant="primary">Crear organización</Button></Link>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-pro">
              <thead><tr><th>Organización</th><th>Perfil</th><th>Ubicación</th><th>Evaluaciones</th><th>Actualizada</th></tr></thead>
              <tbody>
                {list.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link to={`/app/organizaciones/${o.id}`} className="font-medium text-navy hover:underline">{o.name}</Link>
                      {o.shortName && <span className="ml-2 text-xs text-muted">{o.shortName}</span>}
                      {(o.isDemo || o.isAcademic) && <span className="ml-2"><Tag tone="gold">{o.isDemo ? 'Demostración' : 'Caso académico'}</Tag></span>}
                    </td>
                    <td className="text-muted">{getProfile(o.profileId).label}</td>
                    <td className="text-muted">{[o.municipality, o.department].filter(Boolean).join(', ') || '—'}</td>
                    <td className="num">{counts?.[o.id] ?? 0}</td>
                    <td className="text-muted">{fmtDate(o.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}
