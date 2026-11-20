/** Gestión del almacenamiento del navegador: estimación, persistencia y borrado local. */
import { ALL_TABLES, db } from '@/database/db';

export interface StorageStatus {
  supported: boolean;
  usage: number | null;
  quota: number | null;
  percent: number | null;
  persisted: boolean | null;
  warning: string | null;
}

export async function getStorageStatus(): Promise<StorageStatus> {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  if (!nav?.storage?.estimate) return { supported: false, usage: null, quota: null, percent: null, persisted: null, warning: 'El navegador no informa el espacio disponible.' };
  const [est, persisted] = await Promise.all([nav.storage.estimate(), nav.storage.persisted ? nav.storage.persisted() : Promise.resolve(null)]);
  const usage = est.usage ?? null;
  const quota = est.quota ?? null;
  const percent = usage !== null && quota ? (usage / quota) * 100 : null;
  let warning: string | null = null;
  if (percent !== null && percent > 80) warning = 'El almacenamiento local está por encima del 80 %. Exporte una copia de seguridad y elimine datos que no necesite.';
  else if (quota !== null && quota < 50 * 1024 * 1024) warning = 'El navegador ofrece poco espacio de almacenamiento para esta aplicación.';
  return { supported: true, usage, quota, percent, persisted, warning };
}

/** Solicita almacenamiento persistente cuando el navegador lo permite. No garantiza que los datos no se borren. */
export async function requestPersistentStorage(): Promise<boolean | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return null;
  const granted = await navigator.storage.persist();
  const s = (await db.settings.get('app')) ?? { id: 'app' as const, lastBackupAt: null, persistentStorageGranted: null, evaluatorName: '', acknowledgedLocalStorageNotice: false };
  await db.settings.put({ ...s, persistentStorageGranted: granted });
  return granted;
}

export async function clearAllLocalData(): Promise<void> {
  await db.transaction('rw', [...ALL_TABLES.map((t) => db.table(t)), db.settings], async () => {
    for (const t of ALL_TABLES) await db.table(t).clear();
    await db.settings.clear();
  });
}

export const LOCAL_DATA_NOTICE =
  'Los datos de los diagnósticos se almacenan localmente en este navegador. No existe sincronización automática entre dispositivos. La protección de la información depende también de las condiciones de seguridad del dispositivo y de los canales utilizados para compartir archivos.';
