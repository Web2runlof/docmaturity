import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';

/** Registro del service worker y aviso de nueva versión. Solo en producción. */
export function UpdatePrompt() {
  const [update, setUpdate] = useState<null | (() => Promise<void>)>(null);
  const [offlineReady, setOfflineReady] = useState(false);
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    let cancelled = false;
    import('virtual:pwa-register').then(({ registerSW }) => {
      if (cancelled) return;
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh: () => setUpdate(() => () => updateSW(true)),
        onOfflineReady: () => setOfflineReady(true),
      });
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  // El aviso de disponibilidad sin conexión es informativo: se cierra solo.
  useEffect(() => {
    if (!offlineReady) return;
    const t = window.setTimeout(() => setOfflineReady(false), 8000);
    return () => window.clearTimeout(t);
  }, [offlineReady]);
  if (!update && !offlineReady) return null;
  return (
    <div role="status" className="fixed bottom-4 left-4 z-[60] max-w-sm rounded-md border border-line bg-white p-4 text-sm shadow-lg">
      {update ? (
        <>
          <p className="font-medium text-ink">Hay una nueva versión de DOCMATURITY</p>
          <p className="mt-1 text-muted">Sus datos locales se conservan al actualizar.</p>
          <div className="mt-3 flex gap-2"><Button size="sm" variant="primary" onClick={() => update()}>Actualizar</Button><Button size="sm" onClick={() => setUpdate(null)}>Más tarde</Button></div>
        </>
      ) : (
        <>
          <p className="font-medium text-ink">Lista para usar sin conexión</p>
          <p className="mt-1 text-muted">La aplicación quedó almacenada en este navegador.</p>
          <div className="mt-3"><Button size="sm" onClick={() => setOfflineReady(false)}>Entendido</Button></div>
        </>
      )}
    </div>
  );
}
