import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { AssessmentModality } from '@/types/domain';
import type { RespondentProfile } from '@/types/bank';
import { Callout, EmptyState, buttonClass } from '@/components/ui';
import { questionIdsForTier } from '@/data/bank';
import { Loader2 } from 'lucide-react';
import { LOCAL_DATA_NOTICE, PROFILE_LABEL as PROFILE_LABEL_ALL } from '@/config/vocabulary';

export { STATUS_LABEL, STATUS_ORDER, MODALITY_LABEL, PROFILE_LABEL, modalityLabel } from '@/config/vocabulary';
export const MODALITY_INFO: Record<AssessmentModality, { count: number | null; text: string }> = {
  quick: { count: questionIdsForTier('quick').length, text: 'Dos criterios estratégicos por dimensión. Primera aproximación, comparación de percepciones y ejercicios de clase. No es un diagnóstico integral.' },
  standard: { count: questionIdsForTier('standard').length, text: 'Seis criterios por dimensión, incluidos los del diagnóstico rápido. Lectura amplia de capacidades.' },
  professional: { count: questionIdsForTier('professional').length, text: 'Banco completo de 225 criterios, distribuibles entre distintos entrevistados.' },
  custom: { count: null, text: 'Dimensiones, criterios, metas, ponderaciones y preguntas propias definidas por el equipo evaluador.' },
};

export const PROFILES = Object.keys(PROFILE_LABEL_ALL) as RespondentProfile[];

export function Loading() {
  return <div className="flex min-h-[30vh] items-center justify-center text-sm text-muted" role="status"><Loader2 className="mr-2 size-4 animate-spin" aria-hidden />Cargando…</div>;
}

export function NotFound({ what = 'La evaluación' }: { what?: string }) {
  return (
    <EmptyState
      title={`${what} no existe en este navegador`}
      description="Los datos de DOCMATURITY se almacenan localmente. Si trabajó en otro dispositivo o navegador, importe el archivo exportado."
      actions={<Link to="/app" className={buttonClass('primary')}>Volver al inicio</Link>}
    />
  );
}

export function SimulationBanner({ kind }: { kind: 'demo' | 'academic' | null }) {
  if (!kind) return null;
  return (
    <div className="mb-6 rounded-md border border-[#ead9bd] bg-[#fbf6ee] px-4 py-2.5 text-sm text-[#6b5228]">
      <strong className="font-semibold">{kind === 'demo' ? 'Demostración.' : 'Caso académico.'}</strong> Organización, entrevistas y evidencias ficticias con fines {kind === 'demo' ? 'demostrativos' : 'pedagógicos'}. No corresponden a una organización real.
    </div>
  );
}

export function Count({ children }: { children: ReactNode }) {
  return <span className="ml-1.5 rounded-sm bg-slate-100 px-1.5 py-0.5 text-[0.68rem] font-medium text-muted num">{children}</span>;
}

/** Aviso único de almacenamiento local. La versión breve se usa en «Responder entrevista». */
export function LocalDataNotice({ variant = 'full', extra }: { variant?: 'full' | 'short'; extra?: ReactNode }) {
  if (variant === 'short') return <p className="text-xs text-muted">{LOCAL_DATA_NOTICE.short}</p>;
  return <Callout tone="info" title="Datos locales">{LOCAL_DATA_NOTICE.full}{extra ? <> {extra}</> : null}</Callout>;
}

/** Pestañas de vista con contador. */
export function ViewTabs<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count: number }[]; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex flex-wrap rounded-md border border-line bg-white p-0.5">
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded px-3 py-1.5 text-sm transition-colors ${value === o.value ? 'bg-navy text-white' : 'text-muted hover:text-navy'}`}>
          {o.label}<span className={`rounded-full px-1.5 text-[0.7rem] num ${value === o.value ? 'bg-white/20 text-white' : 'bg-slate-100 text-muted'}`}>{o.count}</span>
        </button>
      ))}
    </div>
  );
}
