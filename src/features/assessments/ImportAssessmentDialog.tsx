import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Callout, Dialog, Field, FileDrop, Input } from '@/components/ui';
import { ConflictError, importAssessmentPackage } from '@/services/packages';
import { decryptPackage, isEncryptedPackage } from '@/services/crypto';
import { PACKAGE_LIMITS } from '@/schemas/packages';
import { readFileText, safeParseJSON } from '@/utils/core';
import { notify } from '@/app/store';

export function ImportAssessmentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const nav = useNavigate();
  const [text, setText] = useState<string | null>(null);
  const [encrypted, setEncrypted] = useState(false);
  const [password, setPassword] = useState('');
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => { setText(null); setEncrypted(false); setPassword(''); setConflict(false); setError(''); };
  const onFile = async (f: File) => {
    reset();
    try {
      const t = await readFileText(f, PACKAGE_LIMITS.encrypted);
      setEncrypted(isEncryptedPackage(safeParseJSON(t)));
      setText(t);
    } catch (e) { setError((e as Error).message); }
  };
  const run = async (asCopy = false) => {
    if (!text) return;
    setBusy(true); setError('');
    try {
      const plain = encrypted ? await decryptPackage(safeParseJSON(text), password) : text;
      const r = await importAssessmentPackage(plain, { asCopy });
      notify('success', 'Evaluación importada');
      onOpenChange(false); reset();
      nav(`/app/evaluaciones/${r.assessmentId}`);
    } catch (e) {
      if (e instanceof ConflictError) setConflict(true);
      setError((e as Error).message);
    } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }} title="Importar evaluación" description="Archivo .dm-assessment.json, simple o cifrado. Se verifica su estructura e integridad antes de guardarlo." footer={
      <>
        <Button onClick={() => onOpenChange(false)}>Cancelar</Button>
        {conflict && <Button onClick={() => run(true)} busy={busy}>Importar como copia</Button>}
        <Button variant="primary" disabled={!text || (encrypted && !password)} busy={busy} onClick={() => run(false)}>Importar</Button>
      </>
    }>
      <div className="space-y-4">
        <FileDrop accept=".json,application/json" onFile={onFile} label={text ? 'Archivo cargado. Seleccione otro si lo desea.' : 'Seleccione o arrastre el archivo de la evaluación'} hint="Las evidencias adjuntas no se incluyen en este tipo de archivo." />
        {encrypted && <Field label="Contraseña del archivo cifrado" htmlFor="imp-pass"><Input id="imp-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" /></Field>}
        {error && <Callout tone="danger">{error}</Callout>}
      </div>
    </Dialog>
  );
}
