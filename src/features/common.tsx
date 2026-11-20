import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { AssessmentModality, AssessmentStatus } from '@/types/domain';
import type { RespondentProfile } from '@/types/bank';
import { Button, EmptyState } from '@/components/ui';
import { questionIdsForTier } from '@/data/bank';
import { Loader2 } from 'lucide-react';

export const STATUS_LABEL: Record<AssessmentStatus, string> = {
  borrador: 'Borrador', planificacion: 'En planificación', entrevistas: 'Entrevistas en curso', consolidacion: 'En consolidación',
  validacion: 'En validación', finalizado: 'Finalizado', archivado: 'Archivado',
};
export const STATUS_ORDER: AssessmentStatus[] = ['borrador', 'planificacion', 'entrevistas', 'consolidacion', 'validacion', 'finalizado'];

export const MODALITY_LABEL: Record<AssessmentModality, string> = {
  quick: 'Diagnóstico rápido', standard: 'Diagnóstico estándar', professional: 'Diagnóstico profesional', custom: 'Diagnóstico personalizado',
};
export const MODALITY_INFO: Record<AssessmentModality, { count: number | null; text: string }> = {
  quick: { count: questionIdsForTier('quick').length, text: 'Dos criterios estratégicos por dimensión. Primera aproximación, comparación de percepciones y ejercicios de clase. No es un diagnóstico integral.' },
  standard: { count: questionIdsForTier('standard').length, text: 'Seis criterios por dimensión, incluidos los del diagnóstico rápido. Lectura amplia de capacidades.' },
  professional: { count: questionIdsForTier('professional').length, text: 'Banco completo de 225 criterios, distribuibles entre distintos entrevistados.' },
  custom: { count: null, text: 'Dimensiones, criterios, metas, ponderaciones y preguntas propias definidas por el equipo evaluador.' },
};

export const PROFILE_LABEL: Record<RespondentProfile, string> = {
  direccion: 'Alta dirección', planeacion: 'Planeación', gestion_documental: 'Gestión documental', archivo: 'Administración de archivos',
  tecnologia: 'Tecnología', seguridad: 'Seguridad de la información', juridica: 'Jurídica', control_interno: 'Control interno', financiera: 'Gestión financiera',
  talento_humano: 'Talento humano', calidad: 'Calidad', gobierno_datos: 'Gobierno de datos', procesos: 'Responsables de procesos', usuarios: 'Usuarios finales',
  proveedores: 'Proveedores autorizados', otros: 'Otros',
};
export const PROFILES = Object.keys(PROFILE_LABEL) as RespondentProfile[];

export function Loading() {
  return <div className="flex min-h-[30vh] items-center justify-center text-sm text-muted" role="status"><Loader2 className="mr-2 size-4 animate-spin" aria-hidden />Cargando…</div>;
}

export function NotFound({ what = 'La evaluación' }: { what?: string }) {
  return (
    <EmptyState
      title={`${what} no existe en este navegador`}
      description="Los datos de DOCMATURITY se almacenan localmente. Si trabajó en otro dispositivo o navegador, importe el archivo exportado."
      actions={<Link to="/app"><Button variant="primary">Volver al inicio</Button></Link>}
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
