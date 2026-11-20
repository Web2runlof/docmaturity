import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Database, Download, HardDrive, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { db } from '@/database/db';
import { useSettings } from '@/hooks/useAssessment';
import { Button, Callout, ConfirmDialog, Field, FileDrop, Input, KeyValue, PageHeader, Progress, Section, TabPanel, Tabs, Tag } from '@/components/ui';
import { clearAllLocalData, getStorageStatus, requestPersistentStorage, type StorageStatus } from '@/services/storage';
import { LocalDataNotice } from '../common';
import { buildBackup, getSettings, restoreBackup, validateBackup } from '@/services/packages';
import { decryptPackage, isEncryptedPackage } from '@/services/crypto';
import { removeSimulatedData } from '@/services/demo';
import { PACKAGE_LIMITS, type BackupPackage } from '@/schemas/packages';
import { attempt, attemptOk, notify } from '@/app/store';
import { fmtBytes, fmtDate, fmtPct, readFileText, safeParseJSON } from '@/utils/core';
import { BANK_VERSION, METHODOLOGY_VERSION } from '@/data/bank';
import { DB_VERSION } from '@/database/db';
import { APP_VERSION } from '@/services/packages';
import { ExportDialog } from '../shared/ExportDialog';

const TABLE_LABEL: Record<string, string> = {
  organizations: 'Organizaciones', departments: 'Dependencias', assessments: 'Evaluaciones', snapshots: 'Versiones', participants: 'Participantes', assignments: 'Asignaciones',
  interviews: 'Entrevistas', interviewRevisions: 'Revisiones', responses: 'Respuestas', evidence: 'Evidencias', findings: 'Validaciones', applicability: 'Decisiones N/A',
  risks: 'Riesgos', priorityInputs: 'Factores de prioridad', initiatives: 'Iniciativas', recommendations: 'Recomendaciones', auditEvents: 'Auditoría', importEvents: 'Importaciones', respondentSessions: 'Sesiones de entrevistado',
};

export default function SettingsPage() {
  const [tab, setTab] = useState('datos');
  return (
    <>
      <PageHeader eyebrow="Aplicación" title="Configuración" description="Almacenamiento local, copias de seguridad, datos simulados y registros de auditoría." />
      <Tabs value={tab} onValueChange={setTab} tabs={[{ value: 'datos', label: 'Datos y respaldo' }, { value: 'preferencias', label: 'Preferencias' }, { value: 'auditoria', label: 'Auditoría' }, { value: 'importaciones', label: 'Importaciones' }, { value: 'acerca', label: 'Acerca de' }]}>
        <TabPanel value="datos"><DataTab /></TabPanel>
        <TabPanel value="preferencias"><Preferences /></TabPanel>
        <TabPanel value="auditoria"><AuditLog /></TabPanel>
        <TabPanel value="importaciones"><ImportLog /></TabPanel>
        <TabPanel value="acerca"><About /></TabPanel>
      </Tabs>
    </>
  );
}

function DataTab() {
  const settings = useSettings();
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [exp, setExp] = useState(false);
  const [restoreText, setRestoreText] = useState<string | null>(null);
  const [encrypted, setEncrypted] = useState(false);
  const [password, setPassword] = useState('');
  const [pkg, setPkg] = useState<BackupPackage | null>(null);
  const [error, setError] = useState('');
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [clearAll, setClearAll] = useState(false);
  const [removeKind, setRemoveKind] = useState<'demo' | 'academic' | null>(null);
  const counts = useLiveQuery(async () => ({
    orgs: await db.organizations.count(),
    assessments: await db.assessments.count(),
    demo: await db.organizations.filter((o) => o.isDemo).count(),
    academic: await db.organizations.filter((o) => o.isAcademic).count(),
  }), []) ?? { orgs: 0, assessments: 0, demo: 0, academic: 0 };
  const refresh = () => getStorageStatus().then(setStatus);
  useEffect(() => { refresh(); }, []);

  const onFile = async (f: File) => {
    setError(''); setPkg(null); setPassword('');
    try {
      const t = await readFileText(f, PACKAGE_LIMITS.encrypted);
      const enc = isEncryptedPackage(safeParseJSON(t));
      setEncrypted(enc);
      setRestoreText(t);
      if (!enc) setPkg(await validateBackup(t));
    } catch (e) { setError((e as Error).message); }
  };
  const decrypt = async () => {
    if (!restoreText) return;
    setError('');
    try { setPkg(await validateBackup(await decryptPackage(safeParseJSON(restoreText), password))); } catch (e) { setError((e as Error).message); }
  };
  const daysSinceBackup = settings?.lastBackupAt ? Math.floor((Date.now() - new Date(settings.lastBackupAt).getTime()) / 86400000) : null;

  return (
    <div className="space-y-6">
      <LocalDataNotice />
      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Almacenamiento del navegador" actions={<Button size="sm" onClick={refresh}>Actualizar</Button>}>
          {status ? (
            <div className="space-y-4">
              <KeyValue items={[
                { k: 'Espacio usado', v: fmtBytes(status.usage) },
                { k: 'Cuota estimada', v: fmtBytes(status.quota) },
                { k: 'Organizaciones', v: String(counts.orgs) },
                { k: 'Evaluaciones', v: String(counts.assessments) },
                { k: 'Almacenamiento persistente', v: status.persisted === null ? 'No informado por el navegador' : status.persisted ? 'Concedido' : 'No concedido' },
                { k: 'Último respaldo', v: settings?.lastBackupAt ? fmtDate(settings.lastBackupAt, true) : 'Nunca' },
              ]} />
              <Progress value={status.percent} label={`Uso de la cuota: ${fmtPct(status.percent)}`} tone={status.percent !== null && status.percent > 80 ? 'gold' : 'teal'} />
              {status.warning && <Callout tone="warning">{status.warning}</Callout>}
              {!status.persisted && <Button size="sm" icon={<HardDrive className="size-3.5" />} onClick={async () => { const g = await requestPersistentStorage(); notify(g ? 'success' : 'info', g ? 'Almacenamiento persistente concedido' : 'El navegador no concedió el almacenamiento persistente', 'Incluso con persistencia, mantenga copias de seguridad.'); refresh(); }}>Solicitar almacenamiento persistente</Button>}
            </div>
          ) : <p className="text-sm text-muted">Consultando…</p>}
        </Section>

        <Section title="Copia de seguridad completa" description="Incluye todas las organizaciones, evaluaciones y evidencias con sus adjuntos. Puede protegerse con contraseña.">
          {(daysSinceBackup === null || daysSinceBackup > 14) && counts.assessments > 0 && <div className="mb-4"><Callout tone="warning">{daysSinceBackup === null ? 'No se ha exportado ninguna copia de seguridad.' : `La última copia de seguridad tiene ${daysSinceBackup} días.`} Si se borran los datos del navegador, la información no podrá recuperarse sin un respaldo.</Callout></div>}
          <Button variant="primary" icon={<Download className="size-4" />} onClick={() => setExp(true)}>Exportar copia de seguridad</Button>
          <hr className="my-5 border-line" />
          <h3 className="mb-2 text-sm font-semibold">Restaurar</h3>
          <FileDrop accept=".json,application/json" onFile={onFile} label="Seleccione un archivo .dm-backup.json" hint="La restauración reemplaza todos los datos locales actuales." />
          {encrypted && !pkg && (
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
              <Field label="Contraseña del respaldo" htmlFor="rs-p"><Input id="rs-p" type="password" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
              <Button onClick={decrypt} disabled={!password}>Descifrar</Button>
            </div>
          )}
          {error && <div className="mt-3"><Callout tone="danger">{error}</Callout></div>}
          {pkg && (
            <div className="mt-4 space-y-3">
              <Callout tone="success" title="Respaldo válido">Creado el {fmtDate(pkg.manifest.createdAt, true)} con la versión {pkg.manifest.appVersion}. Integridad verificada mediante SHA-256.</Callout>
              <ul className="grid grid-cols-2 gap-1 text-xs text-muted">{Object.entries(pkg.manifest.counts).filter(([, n]) => n > 0).map(([k, n]) => <li key={k}>{TABLE_LABEL[k] ?? k}: <span className="font-medium text-ink">{n}</span></li>)}</ul>
              <Button variant="danger" icon={<Upload className="size-4" />} onClick={() => setConfirmRestore(true)}>Restaurar y reemplazar los datos actuales</Button>
            </div>
          )}
        </Section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Datos simulados" description="Los casos de demostración y académicos se cargan solo a petición y se pueden eliminar sin afectar los diagnósticos reales.">
          <div className="flex flex-wrap gap-2">
            <Button disabled={!counts.demo} icon={<Trash2 className="size-4" />} onClick={() => setRemoveKind('demo')}>Eliminar demostraciones ({counts.demo})</Button>
            <Button disabled={!counts.academic} icon={<Trash2 className="size-4" />} onClick={() => setRemoveKind('academic')}>Eliminar casos académicos ({counts.academic})</Button>
          </div>
        </Section>
        <Section title="Borrar todos los datos locales">
          <p className="text-sm text-muted">Elimina organizaciones, evaluaciones, evidencias, sesiones de entrevistado y registros de este navegador. Exporte antes una copia de seguridad.</p>
          <Button className="mt-3" variant="danger" icon={<Database className="size-4" />} onClick={() => setClearAll(true)}>Borrar todo</Button>
        </Section>
      </div>

      <ExportDialog open={exp} onOpenChange={setExp} title="Exportar copia de seguridad" fileName={`docmaturity-${new Date().toISOString().slice(0, 10)}.dm-backup.json`} payloadFormat="dm-backup" build={buildBackup} note="Contiene toda la información local, incluidos los adjuntos de evidencias. Guárdela en un lugar seguro; se recomienda protegerla con contraseña." />
      <ConfirmDialog open={confirmRestore} onOpenChange={setConfirmRestore} danger title="Restaurar copia de seguridad" description="Todos los datos locales actuales serán reemplazados por el contenido del respaldo. Esta acción no se puede deshacer." confirmLabel="Restaurar" requireText="RESTAURAR" onConfirm={async () => { if (!pkg) return; const ok = await attemptOk(() => restoreBackup(pkg), 'Respaldo restaurado'); if (ok) { setPkg(null); setRestoreText(null); refresh(); } }} />
      <ConfirmDialog open={clearAll} onOpenChange={setClearAll} danger title="Borrar todos los datos locales" description="Se eliminará toda la información almacenada por DOCMATURITY en este navegador." confirmLabel="Borrar todo" requireText="BORRAR" onConfirm={async () => { await attempt(() => clearAllLocalData(), 'Datos locales eliminados'); refresh(); }} />
      <ConfirmDialog open={removeKind !== null} onOpenChange={(o) => !o && setRemoveKind(null)} danger title={removeKind === 'demo' ? 'Eliminar demostraciones' : 'Eliminar casos académicos'} description="Se eliminarán las organizaciones simuladas y todas sus evaluaciones." confirmLabel="Eliminar" onConfirm={async () => { if (removeKind) await attempt(async () => { const n = await removeSimulatedData(removeKind); notify('success', `${n} organizaciones simuladas eliminadas`); }); setRemoveKind(null); }} />
    </div>
  );
}

function Preferences() {
  const settings = useSettings();
  const [name, setName] = useState('');
  useEffect(() => { if (settings) setName(settings.evaluatorName); }, [settings]);
  return (
    <Section title="Evaluador" description="El nombre se usa por defecto al registrar validaciones y revisiones de evidencias. Se guarda solo en este navegador.">
      <div className="flex max-w-xl flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1"><Field label="Nombre del evaluador" htmlFor="st-n"><Input id="st-n" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /></Field></div>
        <Button variant="primary" onClick={() => attempt(async () => { await db.settings.put({ ...(await getSettings()), evaluatorName: name.trim() }); }, 'Preferencia guardada')}>Guardar</Button>
      </div>
    </Section>
  );
}

function AuditLog() {
  const [limit, setLimit] = useState(100);
  const events = useLiveQuery(() => db.auditEvents.orderBy('seq').reverse().limit(limit).toArray(), [limit]) ?? [];
  return (
    <Section title="Registro de auditoría" description="Acciones relevantes registradas localmente: creación, importación, validación, exportación y restauración.">
      <div className="overflow-x-auto"><table className="table-pro">
        <thead><tr><th>Fecha</th><th>Acción</th><th>Entidad</th><th>Detalle</th></tr></thead>
        <tbody>{events.map((e) => <tr key={e.seq}><td className="whitespace-nowrap text-xs text-muted">{fmtDate(e.at, true)}</td><td>{e.action}</td><td className="text-xs">{e.entity}</td><td className="max-w-md text-xs text-muted">{e.detail}</td></tr>)}</tbody>
      </table></div>
      {!events.length && <p className="text-sm text-muted">Sin eventos registrados.</p>}
      {events.length >= limit && <Button className="mt-3" size="sm" onClick={() => setLimit((l) => l + 200)}>Ver más</Button>}
    </Section>
  );
}

function ImportLog() {
  const events = useLiveQuery(() => db.importEvents.orderBy('seq').reverse().limit(300).toArray(), []) ?? [];
  const TONE = { aceptado: 'teal', rechazado: 'danger', duplicado: 'neutral', revision_pendiente: 'warning' } as const;
  return (
    <Section title="Historial de importaciones" description="Cada archivo importado o rechazado queda registrado con su hash de contenido.">
      <div className="overflow-x-auto"><table className="table-pro">
        <thead><tr><th>Fecha</th><th>Tipo</th><th>Archivo</th><th>Resultado</th><th>Detalle</th><th>Hash</th></tr></thead>
        <tbody>{events.map((e) => <tr key={e.seq}><td className="whitespace-nowrap text-xs text-muted">{fmtDate(e.at, true)}</td><td className="text-xs">{e.kind}</td><td className="max-w-[200px] truncate text-xs">{e.fileName}</td><td><Tag tone={TONE[e.result]}>{e.result.replace('_', ' ')}</Tag></td><td className="max-w-sm text-xs text-muted">{e.detail}</td><td className="font-mono text-[10px] text-muted">{e.hash ? `${e.hash.slice(0, 12)}…` : '—'}</td></tr>)}</tbody>
      </table></div>
      {!events.length && <p className="text-sm text-muted">Sin importaciones registradas.</p>}
    </Section>
  );
}

function About() {
  return (
    <Section title="DOCMATURITY">
      <KeyValue items={[
        { k: 'Versión de la aplicación', v: APP_VERSION },
        { k: 'Metodología', v: METHODOLOGY_VERSION },
        { k: 'Versión del banco', v: BANK_VERSION },
        { k: 'Versión de la base local', v: String(DB_VERSION) },
      ]} />
      <div className="mt-5 space-y-2 text-sm text-muted">
        <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-teal" aria-hidden />Aplicación estática sin servidor, sin registro de usuarios, sin telemetría y sin envío automático de datos.</p>
        <p>DOCMATURITY es una herramienta de autodiagnóstico y consultoría. Sus resultados no constituyen certificación, auditoría oficial ni puntaje de instrumentos oficiales.</p>
        <p>Código abierto bajo licencia MIT.</p>
      </div>
    </Section>
  );
}
