import { useState } from 'react';
import { Button, Callout, Dialog, Field, Input } from '@/components/ui';
import { encryptText } from '@/services/crypto';
import { downloadBlob } from '@/utils/core';
import { notify } from '@/app/store';

/** Exportación JSON con cifrado opcional AES-GCM. La contraseña nunca se guarda. */
export function ExportDialog({ open, onOpenChange, title, build, fileName, payloadFormat, note }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  build: () => Promise<unknown>;
  fileName: string;
  payloadFormat: string;
  note?: string;
}) {
  const [encrypt, setEncrypt] = useState(false);
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [busy, setBusy] = useState(false);
  const mismatch = encrypt && p2 && p1 !== p2;
  const weak = encrypt && p1.length > 0 && p1.length < 10;
  const run = async () => {
    setBusy(true);
    try {
      const data = await build();
      const text = JSON.stringify(data, null, encrypt ? 0 : 2);
      if (encrypt) {
        const enc = await encryptText(text, p1, payloadFormat);
        downloadBlob(new Blob([JSON.stringify(enc)], { type: 'application/json' }), fileName.replace(/\.json$/, '.cifrado.json'));
      } else downloadBlob(new Blob([text], { type: 'application/json' }), fileName);
      notify('success', 'Archivo exportado', encrypt ? 'Conserve la contraseña: sin ella no es posible recuperar el contenido.' : undefined);
      onOpenChange(false);
      setP1(''); setP2('');
    } catch (e) {
      notify('error', 'No fue posible exportar', (e as Error).message);
    } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description="El archivo se genera en este navegador y no se envía a ningún servidor." footer={
      <><Button onClick={() => onOpenChange(false)}>Cancelar</Button><Button variant="primary" busy={busy} disabled={encrypt && (p1.length < 10 || p1 !== p2)} onClick={run}>Exportar</Button></>
    }>
      <div className="space-y-4 text-sm">
        {note && <p className="text-muted">{note}</p>}
        <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={encrypt} onChange={(e) => setEncrypt(e.target.checked)} /> <span>Proteger con contraseña (AES-GCM de 256 bits, clave derivada con PBKDF2-SHA-256 y salt aleatorio).</span></label>
        {encrypt && (
          <>
            <Field label="Contraseña (mínimo 10 caracteres)" htmlFor="exp-p1" error={weak ? 'Use al menos 10 caracteres.' : undefined}><Input id="exp-p1" type="password" autoComplete="new-password" value={p1} onChange={(e) => setP1(e.target.value)} /></Field>
            <Field label="Confirme la contraseña" htmlFor="exp-p2" error={mismatch ? 'Las contraseñas no coinciden.' : undefined}><Input id="exp-p2" type="password" autoComplete="new-password" value={p2} onChange={(e) => setP2(e.target.value)} /></Field>
            <Callout tone="warning">Si pierde la contraseña no será posible recuperar el archivo. Proteger el archivo exportado no cifra los datos almacenados en este navegador.</Callout>
          </>
        )}
      </div>
    </Dialog>
  );
}
