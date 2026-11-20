import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { FolderKanban, Plus, Upload } from 'lucide-react';
import { db } from '@/database/db';
import { Button, EmptyState, PageHeader, Section, Select, Tag } from '@/components/ui';
import { fmtDate } from '@/utils/core';
import { MODALITY_LABEL, STATUS_LABEL } from '../common';
import { ImportAssessmentDialog } from './ImportAssessmentDialog';

export default function AssessmentsPage() {
  const data = useLiveQuery(async () => ({ a: await db.assessments.orderBy('updatedAt').reverse().toArray(), o: await db.organizations.toArray() }), []);
  const [filter, setFilter] = useState<'reales' | 'simuladas' | 'archivadas'>('reales');
  const [importOpen, setImportOpen] = useState(false);
  const list = (data?.a ?? []).filter((a) => (filter === 'simuladas' ? a.isDemo || a.isAcademic : filter === 'archivadas' ? a.status === 'archivado' && !a.isDemo && !a.isAcademic : !a.isDemo && !a.isAcademic && a.status !== 'archivado'));
  return (
    <>
      <PageHeader eyebrow="Proyectos de diagnóstico" title="Evaluaciones" description="Cada evaluación congela su versión metodológica, su banco y sus ponderaciones para garantizar la reproducibilidad." actions={
        <><Button icon={<Upload className="size-4" />} onClick={() => setImportOpen(true)}>Importar</Button><Link to="/app/evaluaciones/nueva"><Button variant="primary" icon={<Plus className="size-4" />}>Nueva evaluación</Button></Link></>
      } />
      <Section>
        <div className="mb-4 flex justify-end">
          <Select aria-label="Filtrar evaluaciones" className="w-56" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="reales">Diagnósticos reales</option><option value="archivadas">Archivadas</option><option value="simuladas">Casos simulados</option>
          </Select>
        </div>
        {!list.length ? (
          <EmptyState icon={<FolderKanban className="size-8" />} title="No hay evaluaciones en esta vista" description="Cree una evaluación sobre una organización existente o importe un archivo .dm-assessment.json." actions={<Link to="/app/evaluaciones/nueva"><Button variant="primary">Nueva evaluación</Button></Link>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-pro">
              <thead><tr><th>Evaluación</th><th>Organización</th><th>Modalidad</th><th>Criterios</th><th>Estado</th><th>Actualizada</th></tr></thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id}>
                    <td><Link to={`/app/evaluaciones/${a.id}`} className="font-medium text-navy hover:underline">{a.name || 'Sin nombre'}</Link><div className="text-xs text-muted">Revisión {a.revision} · {a.methodologyVersion} · banco {a.bankVersion}</div></td>
                    <td className="text-muted">{data?.o.find((o) => o.id === a.organizationId)?.name}</td>
                    <td className="text-muted">{MODALITY_LABEL[a.modality]}</td>
                    <td className="num">{a.questionIds.length}</td>
                    <td><Tag tone={a.status === 'finalizado' ? 'teal' : 'neutral'}>{STATUS_LABEL[a.status]}</Tag></td>
                    <td className="text-muted">{fmtDate(a.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
      <ImportAssessmentDialog open={importOpen} onOpenChange={setImportOpen} />
    </>
  );
}
