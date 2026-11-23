import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight, Building2, DatabaseBackup, FolderKanban, HardDrive, Inbox, PlayCircle, Plus, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { db } from '@/database/db';
import type { Assessment, Organization } from '@/types/domain';
import { Button, buttonClass, Callout, EmptyState, PageHeader, Progress, Section, StatusBadge, Tag } from '@/components/ui';
import { useNextStep } from '@/components/layout/nextStep';
import { cx, fmtBytes, fmtDate, fmtPct } from '@/utils/core';
import { getStorageStatus, type StorageStatus } from '@/services/storage';
import { openOrLoadDemo } from '@/services/demo';
import { attempt } from '@/app/store';
import { LocalDataNotice, STATUS_LABEL, modalityLabel } from '../common';
import { ImportAssessmentDialog } from '../assessments/ImportAssessmentDialog';

const DAY = 86_400_000;
/** Días desde la última copia de seguridad a partir de los cuales se recomienda una nueva. */
const BACKUP_STALE_DAYS = 14;

const ENTITY_TEXT: Record<string, string> = { recomendacion: 'recomendación', organizacion: 'organización', evaluacion: 'evaluación' };
const actionText = (a: string) => { const t = a.replace(/_/g, ' ').replace('texto ia', 'texto asistido'); return t.charAt(0).toUpperCase() + t.slice(1); };

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'hace un momento';
  if (diff < 3_600_000) return `hace ${Math.round(diff / 60_000)} min`;
  if (diff < DAY) return `hace ${Math.round(diff / 3_600_000)} h`;
  if (diff < 7 * DAY) { const d = Math.round(diff / DAY); return `hace ${d} ${d === 1 ? 'día' : 'días'}`; }
  return fmtDate(iso);
}

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
  const activity = useLiveQuery(() => db.auditEvents.orderBy('at').reverse().limit(6).toArray(), []);
  const settings = useLiveQuery(() => db.settings.get('app'), []);
  const [storage, setStorage] = useState<StorageStatus | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [busyDemo, setBusyDemo] = useState(false);
  useEffect(() => { getStorageStatus().then(setStorage); }, [assessments?.length]);

  if (!orgs || !assessments) return null;
  const real = orgs.filter((o) => !o.isDemo && !o.isAcademic && !o.archived);
  const realAssessments = assessments.filter((a) => !a.isDemo && !a.isAcademic);
  const inProgress = realAssessments.filter((a) => !['finalizado', 'archivado'].includes(a.status));
  const finished = realAssessments.filter((a) => a.status === 'finalizado');
  const simulated = assessments.filter((a) => a.isDemo || a.isAcademic);
  const orgOf = (a: Assessment) => orgs.find((o) => o.id === a.organizationId);
  const nameOf = (id: string | null) => (id ? assessments.find((a) => a.id === id)?.name : undefined);

  const hasDemo = assessments.some((a) => a.isDemo);
  const demoLabel = hasDemo ? 'Abrir caso de demostración' : 'Explorar caso de demostración';
  const demo = async () => {
    if (busyDemo) return;
    setBusyDemo(true);
    const id = await attempt(() => openOrLoadDemo(), hasDemo ? undefined : 'Caso de demostración cargado');
    setBusyDemo(false);
    if (id) nav(`/app/evaluaciones/${id}/resultados`);
  };
  const backupAge = settings?.lastBackupAt ? Math.floor((Date.now() - new Date(settings.lastBackupAt).getTime()) / DAY) : null;
  const backupStale = realAssessments.length > 0 && (backupAge === null || backupAge >= BACKUP_STALE_DAYS);

  const simulatedList = (
    <ul className="divide-y divide-line">
      {simulated.map((a) => (
        <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <Link to={`/app/evaluaciones/${a.id}`} className="font-medium text-navy hover:underline">{orgOf(a)?.name}</Link>
            <p className="text-xs text-muted">{a.name} · {STATUS_LABEL[a.status]} · actualizado {fmtDate(a.updatedAt, true)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Tag tone="gold">{a.isDemo ? 'Demostración' : 'Caso académico'}</Tag>
            <Link to={`/app/evaluaciones/${a.id}/resultados`} className={buttonClass('secondary', 'sm')}>Ver resultados</Link>
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <PageHeader eyebrow="Espacio de trabajo local" title="Inicio" description="Panorama de sus diagnósticos, pendientes y estado del almacenamiento de este navegador." actions={
        <>
          <Button icon={<Upload className="size-4" />} onClick={() => setImportOpen(true)}>Importar evaluación</Button>
          <Link to="/app/organizaciones/nueva" className={buttonClass('primary')}><Plus className="size-4" aria-hidden />Crear organización</Link>
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
                <Link to="/app/organizaciones/nueva" className={buttonClass('primary')}><Plus className="size-4" aria-hidden />Crear organización</Link>
                <Button icon={<Upload className="size-4" />} onClick={() => setImportOpen(true)}>Importar evaluación</Button>
                <Button icon={<PlayCircle className="size-4" />} busy={busyDemo} onClick={demo}>{demoLabel}</Button>
              </>}
            />
          </Section>
          <LocalDataNotice extra="Borrar los datos del navegador puede eliminar los diagnósticos." />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Panorama: superficie oscura, coherente con la navegación. */}
          <section aria-label="Panorama" className="on-dark overflow-hidden rounded-xl bg-midnight text-white">
            <dl className="grid grid-cols-2 divide-white/[0.08] md:grid-cols-5 md:divide-x">
              {[
                { k: 'Organizaciones', v: real.length, to: '/app/organizaciones' },
                { k: 'Evaluaciones en curso', v: inProgress.length, to: '/app/evaluaciones' },
                { k: 'Evaluaciones finalizadas', v: finished.length, to: '/app/evaluaciones' },
                { k: 'Entrevistas por consolidar', v: pendingImports?.awaiting ?? 0, hint: 'Asignaciones exportadas sin resultado importado' },
                { k: 'Revisiones por decidir', v: pendingImports?.pendingRevisions ?? 0, hint: 'Respuestas reimportadas con cambios' },
              ].map((s) => (
                <div key={s.k} className="px-5 py-5">
                  <dt className="text-[0.7rem] font-medium tracking-wider text-fog uppercase">{s.k}</dt>
                  <dd className={cx('mt-1.5 font-display text-[1.9rem] leading-none font-bold num', s.v > 0 && s.hint ? 'text-mint' : 'text-white')}>{s.to ? <Link to={s.to} className="rounded-sm hover:underline">{s.v}</Link> : s.v}</dd>
                  {s.hint && <dd className="mt-1.5 text-[0.7rem] leading-snug text-fog">{s.hint}</dd>}
                </div>
              ))}
            </dl>
          </section>

          {backupStale && (
            <Callout tone="warning" title={backupAge === null ? 'Aún no hay copia de seguridad' : `La última copia de seguridad tiene ${backupAge} días`}>
              Los diagnósticos solo existen en este navegador. <Link to="/app/configuracion" className="font-medium underline">Genere una copia de seguridad</Link> y consérvela en un lugar autorizado por su organización.
            </Callout>
          )}

          <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[1.6fr_1fr]">
            <div className="space-y-6">
              <Section title="Evaluaciones en curso" description="Avance del ciclo de trabajo y siguiente paso recomendado, calculados con los datos de cada evaluación." actions={<Link to="/app/evaluaciones/nueva" className={buttonClass('secondary', 'sm')}><Plus className="size-3.5" aria-hidden />Nueva evaluación</Link>}>
                {inProgress.length ? (
                  <ul className="divide-y divide-line">
                    {inProgress.slice(0, 6).map((a) => <AssessmentRow key={a.id} a={a} org={orgOf(a)} />)}
                  </ul>
                ) : <p className="text-sm text-muted">No hay evaluaciones en curso. <Link to="/app/evaluaciones/nueva" className="font-medium text-mint-strong underline">Cree una nueva</Link>.</p>}
              </Section>
              {finished.length > 0 && (
                <Section title="Evaluaciones finalizadas">
                  <ul className="divide-y divide-line">
                    {finished.slice(0, 5).map((a) => (
                      <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <Link to={`/app/evaluaciones/${a.id}`} className="font-medium text-navy hover:underline">{a.name || 'Evaluación sin nombre'}</Link>
                          <p className="text-xs text-muted">{orgOf(a)?.name} · {modalityLabel(a)} · actualizado {fmtDate(a.updatedAt, true)}</p>
                        </div>
                        <div className="flex items-center gap-2"><StatusBadge kind="finalizado" /><Link to={`/app/evaluaciones/${a.id}/informes`} className={buttonClass('ghost', 'sm')}>Informes</Link></div>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
              {simulated.length > 0 && (
                <Section title="Casos simulados" description="Demostraciones y casos académicos ficticios, separados de los diagnósticos reales.">
                  {simulatedList}
                </Section>
              )}
            </div>
            <div className="space-y-6">
              <Section title="Acciones rápidas">
                <div className="grid gap-2">
                  <Link to="/app/evaluaciones/nueva" className={buttonClass('secondary', 'md', 'w-full justify-start')}><FolderKanban className="size-4" aria-hidden />Nueva evaluación</Link>
                  <Link to="/app/configuracion" className={buttonClass('secondary', 'md', 'w-full justify-start')}><DatabaseBackup className="size-4" aria-hidden />Copia de seguridad</Link>
                  <Link to="/responder" className={buttonClass('secondary', 'md', 'w-full justify-start')}><Inbox className="size-4" aria-hidden />Responder una entrevista</Link>
                  <Button className="w-full justify-start" icon={<PlayCircle className="size-4" />} busy={busyDemo} onClick={demo}>{demoLabel}</Button>
                </div>
              </Section>
              <Section title="Actividad reciente" description="Registro local de acciones de este navegador.">
                {activity?.length ? (
                  <ol className="relative space-y-3.5 pl-5">
                    <span aria-hidden className="absolute top-1.5 bottom-1.5 left-[4px] w-px bg-line" />
                    {activity.map((e) => (
                      <li key={e.seq} className="relative text-sm">
                        <span aria-hidden className="absolute top-1.5 -left-5 size-[9px] rounded-full border-2 border-white bg-mint-strong ring-1 ring-line" />
                        <p className="font-medium text-ink">{actionText(e.action)} <span className="font-normal text-muted">· {ENTITY_TEXT[e.entity] ?? e.entity}</span></p>
                        <p className="text-xs text-muted">{nameOf(e.assessmentId) ? `${nameOf(e.assessmentId)} · ` : ''}<time dateTime={e.at}>{relative(e.at)}</time></p>
                      </li>
                    ))}
                  </ol>
                ) : <p className="text-sm text-muted">Aún no hay acciones registradas.</p>}
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
        </div>
      )}
      <ImportAssessmentDialog open={importOpen} onOpenChange={setImportOpen} />
    </>
  );
}

/** Fila de una evaluación en curso con su avance y el siguiente paso, derivados de sus datos. */
function AssessmentRow({ a, org }: { a: Assessment; org?: Organization }) {
  const next = useNextStep(a.id);
  const pct = next ? Math.round((Math.min(next.index, next.total) / next.total) * 100) : 0;
  return (
    <li className="grid gap-3 py-4 md:grid-cols-[1fr_200px] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/app/evaluaciones/${a.id}`} className="font-semibold text-navy hover:underline">{a.name || 'Evaluación sin nombre'}</Link>
          <StatusBadge kind="en_curso" label={STATUS_LABEL[a.status]} />
        </div>
        <p className="mt-0.5 text-xs text-muted">{org?.name} · {modalityLabel(a)} · actualizado {fmtDate(a.updatedAt, true)}</p>
        {next && <Link to={next.to} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-mint-strong hover:underline">Siguiente paso: {next.label}<ArrowRight className="size-3.5" aria-hidden /></Link>}
      </div>
      <div>
        <div className="mb-1 flex justify-between text-xs text-muted"><span>Avance del ciclo</span><span className="num">{pct} %</span></div>
        <Progress value={pct} label={`Avance del ciclo de ${a.name}`} />
      </div>
    </li>
  );
}
