import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Building2, DatabaseBackup, FolderKanban, HardDrive, Inbox, PlayCircle, Plus, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { db } from '@/database/db';
import { Button, Callout, EmptyState, PageHeader, Progress, Section, Tag } from '@/components/ui';
import { fmtBytes, fmtDate, fmtPct } from '@/utils/core';
import { getStorageStatus, type StorageStatus } from '@/services/storage';
import { openOrLoadDemo } from '@/services/demo';
import { attempt } from '@/app/store';
import { LocalDataNotice, STATUS_LABEL, modalityLabel } from '../common';
import { ImportAssessmentDialog } from '../assessments/ImportAssessmentDialog';

export default function HomePage() {
  const nav = useNavigate();
  const orgs = useLiveQuery(() => db.organizations.toArray(), []);
  const assessments = useLiveQuery(() => db.assessments.orderBy('updatedAt').reverse().toArray(), []);
  const pendingImports = useLiveQuery(async () => {
    const asg = await db.assignments.toArray();
    const imported = await db.interviews.filter((i) => i.source === 'importada').toArray();
    const done = new Set(imported.map((i) => i.assignmentId));
    const pendingRevisions = await db.interviewRevisions.filter((r) => r.status === 'pendiente_decision').count();
    return { awaiting: asg.filter((a) => a.exportedAt && !done.has(a.id)).length, pendingRevisions };
  }, []);
  const settings = useLiveQuery(() => db.settings.get('app'), []);
  const [storage, setStorage] = useState<StorageStatus | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [busyDemo, setBusyDemo] = useState(false);
  useEffect(() => { getStorageStatus().then(setStorage); }, [assessments?.length]);

  if (!orgs || !assessments) return null;
  const real = orgs.filter((o) => !o.isDemo && !o.isAcademic && !o.archived);
  const realAssessments = assessments.filter((a) => !a.isDemo && !a.isAcademic);
  const inProgress = realAssessments.filter((a) => !['finalizado', 'archivado'].includes(a.status));
  const simulated = assessments.filter((a) => a.isDemo || a.isAcademic);

  const hasDemo = assessments.some((a) => a.isDemo);
  const demoLabel = hasDemo ? 'Abrir caso de demostración' : 'Explorar caso de demostración';
  const demo = async () => {
    if (busyDemo) return;
    setBusyDemo(true);
    const id = await attempt(() => openOrLoadDemo(), hasDemo ? undefined : 'Caso de demostración cargado');
    setBusyDemo(false);
    if (id) nav(`/app/evaluaciones/${id}/resultados`);
  };
  const simulatedList = (
    <ul className="divide-y divide-line">
      {simulated.map((a) => (
        <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <Link to={`/app/evaluaciones/${a.id}`} className="font-medium text-navy hover:underline">{orgs.find((o) => o.id === a.organizationId)?.name}</Link>
            <p className="text-xs text-muted">{a.name} · {STATUS_LABEL[a.status]} · actualizado {fmtDate(a.updatedAt, true)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Tag tone="gold">{a.isDemo ? 'Demostración' : 'Caso académico'}</Tag>
            <Link to={`/app/evaluaciones/${a.id}/resultados`}><Button size="sm">Ver resultados</Button></Link>
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <PageHeader eyebrow="Espacio de trabajo local" title="Inicio" description="Organizaciones, evaluaciones en curso y estado del almacenamiento de este navegador." actions={
        <>
          <Button icon={<Upload className="size-4" />} onClick={() => setImportOpen(true)}>Importar evaluación</Button>
          <Link to="/app/organizaciones/nueva"><Button variant="primary" icon={<Plus className="size-4" />}>Crear organización</Button></Link>
        </>
      } />

      {!real.length && !realAssessments.length ? (
        <div className="space-y-6">
          {simulated.length > 0 && (
            <Section title="Casos simulados en este navegador" description="Demostraciones y casos académicos ficticios, separados de los diagnósticos reales. Ábralos directamente o elimínelos desde Configuración.">
              {simulatedList}
            </Section>
          )}
          <Section>
            <EmptyState
              icon={<Building2 className="size-8" />}
              title={simulated.length ? 'Aún no hay diagnósticos reales' : 'Aún no hay diagnósticos en este navegador'}
              description={<>Comience caracterizando una organización. También puede importar una evaluación exportada desde otro dispositivo{hasDemo ? '' : ' o explorar un caso de demostración, que se mantiene separado de sus datos reales'}.</>}
              actions={<>
                <Link to="/app/organizaciones/nueva"><Button variant="primary" icon={<Plus className="size-4" />}>Crear organización</Button></Link>
                <Button icon={<Upload className="size-4" />} onClick={() => setImportOpen(true)}>Importar evaluación</Button>
                <Button icon={<PlayCircle className="size-4" />} busy={busyDemo} onClick={demo}>{demoLabel}</Button>
              </>}
            />
          </Section>
          <LocalDataNotice extra="Borrar los datos del navegador puede eliminar los diagnósticos." />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            <div className="panel grid grid-cols-2 divide-x divide-line md:grid-cols-4">
              {[
                { k: 'Organizaciones', v: real.length, to: '/app/organizaciones' },
                { k: 'Evaluaciones en curso', v: inProgress.length, to: '/app/evaluaciones' },
                { k: 'Entrevistas por consolidar', v: pendingImports?.awaiting ?? 0, hint: 'Asignaciones exportadas sin resultado importado' },
                { k: 'Revisiones por decidir', v: pendingImports?.pendingRevisions ?? 0 },
              ].map((s) => (
                <div key={s.k} className="px-5 py-4">
                  <div className="text-[0.7rem] font-medium uppercase tracking-wider text-muted">{s.k}</div>
                  <div className="mt-1 font-display text-2xl font-semibold text-navy num">{s.v}</div>
                  {s.hint && <div className="mt-0.5 text-[0.7rem] text-muted">{s.hint}</div>}
                </div>
              ))}
            </div>
            <Section title="Evaluaciones recientes" actions={<Link to="/app/evaluaciones/nueva"><Button size="sm" icon={<Plus className="size-3.5" />}>Nueva evaluación</Button></Link>}>
              {realAssessments.length ? (
                <ul className="divide-y divide-line">
                  {realAssessments.slice(0, 8).map((a) => {
                    const o = orgs.find((x) => x.id === a.organizationId);
                    return (
                      <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <Link to={`/app/evaluaciones/${a.id}`} className="font-medium text-navy hover:underline">{a.name || 'Evaluación sin nombre'}</Link>
                          <p className="text-xs text-muted">{o?.name} · {modalityLabel(a)} · actualizado {fmtDate(a.updatedAt, true)}</p>
                        </div>
                        <Tag tone={a.status === 'finalizado' ? 'teal' : 'neutral'}>{STATUS_LABEL[a.status]}</Tag>
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="text-sm text-muted">No hay evaluaciones reales. <Link to="/app/evaluaciones/nueva" className="text-teal underline">Cree la primera</Link>.</p>}
            </Section>
            {simulated.length > 0 && (
              <Section title="Casos simulados" description="Demostraciones y casos académicos ficticios, separados de los diagnósticos reales.">
                {simulatedList}
              </Section>
            )}
          </div>
          <div className="space-y-6">
            <Section title="Acciones rápidas">
              <div className="grid gap-2">
                <Link to="/app/evaluaciones/nueva"><Button className="w-full justify-start" icon={<FolderKanban className="size-4" />}>Nueva evaluación</Button></Link>
                <Link to="/app/configuracion"><Button className="w-full justify-start" icon={<DatabaseBackup className="size-4" />}>Copia de seguridad</Button></Link>
                <Link to="/responder"><Button className="w-full justify-start" icon={<Inbox className="size-4" />}>Responder una entrevista</Button></Link>
                <Button className="w-full justify-start" icon={<PlayCircle className="size-4" />} busy={busyDemo} onClick={demo}>{demoLabel}</Button>
              </div>
            </Section>
            <Section title="Almacenamiento local" actions={<HardDrive className="size-4 text-muted" aria-hidden />}>
              {storage?.supported ? (
                <div className="space-y-3 text-sm">
                  <Progress value={storage.percent} label="Uso del almacenamiento" />
                  <p className="text-muted">{fmtBytes(storage.usage)} usados de {fmtBytes(storage.quota)} disponibles ({fmtPct(storage.percent)}).</p>
                  <p className="text-muted">Almacenamiento persistente: {storage.persisted === null ? 'no informado' : storage.persisted ? 'concedido' : 'no concedido'}.</p>
                  {storage.warning && <Callout tone="warning">{storage.warning}</Callout>}
                </div>
              ) : <p className="text-sm text-muted">El navegador no informa el espacio disponible.</p>}
              <p className="mt-4 border-t border-line pt-3 text-sm">Última copia de seguridad: <strong className="font-medium">{settings?.lastBackupAt ? fmtDate(settings.lastBackupAt, true) : 'nunca'}</strong></p>
            </Section>
            <LocalDataNotice extra="Borrar los datos del navegador puede eliminar los diagnósticos." />
          </div>
        </div>
      )}
      <ImportAssessmentDialog open={importOpen} onOpenChange={setImportOpen} />
    </>
  );
}
