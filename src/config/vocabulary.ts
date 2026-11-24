/**
 * Vocabulario único de la interfaz: etiquetas, ciclo de trabajo, familias, estados y avisos.
 * Toda pantalla, informe y narrativa debe tomar estos textos de aquí para no divergir.
 * Tratamiento: «usted», español de Colombia.
 */
import type { AssessmentModality, AssessmentStatus } from '@/types/domain';
import type { MgdaComponent, RespondentProfile } from '@/types/bank';

export const APP_NAME = 'DOCMATURITY';
export const APP_TAGLINE = 'Documentos. Información. Inteligencia.';
export const MODEL_NAME = 'Modelo Integrado de Evaluación DocMaturity (DIAM)';
export const MODEL_SHORT = 'DIAM v1.0';

/** Término único para el nivel que se quiere alcanzar. */
export const TARGET_TERM = { one: 'meta', capital: 'Meta' } as const;

/** Ciclo de trabajo de seis momentos: idéntico en la portada, el héroe y «Cómo funciona». */
export const WORK_CYCLE = [
  { key: 'caracterizar', title: 'Caracterizar', text: 'Perfil de la organización, volumen documental, sistemas y condiciones normativas que determinan la aplicabilidad.', where: [{ label: 'Organizaciones', to: '/app/organizaciones' }] },
  { key: 'alcance', title: 'Definir el alcance', text: 'Modalidad, dimensiones, metas por criterio y ponderaciones. Las exclusiones quedan justificadas.', where: [{ label: 'Evaluaciones', to: '/app/evaluaciones' }, { label: 'Alcance y metas', to: null }] },
  { key: 'entrevistar', title: 'Entrevistar', text: 'Entrevistas dirigidas o distribuidas por archivo a cada perfil. Las respuestas especiales nunca se convierten en cero.', where: [{ label: 'Entrevistas', to: null }, { label: 'Responder entrevista', to: '/responder' }] },
  { key: 'validar', title: 'Triangular y validar', text: 'Evidencias revisadas, una respuesta por participante y mediana entre participantes, discrepancias y contradicciones entre criterios.', where: [{ label: 'Evidencias', to: null }, { label: 'Mesa de validación', to: null }] },
  { key: 'analizar', title: 'Analizar', text: 'Madurez percibida y validada por dimensión, cobertura, soporte de evidencias, solidez del diagnóstico y alertas críticas.', where: [{ label: 'Resultados', to: null }] },
  { key: 'planear', title: 'Planear la transformación', text: 'Brechas, riesgos, prioridades explicadas y una hoja de ruta en cuatro fases con dependencias.', where: [{ label: 'Brechas y riesgos', to: null }, { label: 'Hoja de ruta', to: null }, { label: 'Informes', to: null }] },
] as const;

/** Las cinco familias de dimensiones: la familia de cada dimensión es su componente MGDA predominante. */
export const MGDA_FAMILIES: { key: MgdaComponent; title: string; text: string }[] = [
  { key: 'Estratégico', title: 'Dirección y gobierno', text: 'Política, responsabilidades, gobierno de datos y mejora continua.' },
  { key: 'Administración de archivos', title: 'Recursos y custodia', text: 'Presupuesto, infraestructura física y condiciones de conservación.' },
  { key: 'Documental', title: 'Instrumentos y procesos', text: 'Procesos, instrumentos archivísticos y expedientes electrónicos.' },
  { key: 'Tecnológico', title: 'Tecnología y protección', text: 'Arquitectura, interoperabilidad, seguridad, preservación y automatización.' },
  { key: 'Cultural', title: 'Personas y cultura', text: 'Competencias, apropiación y cultura documental.' },
];

export const STATUS_LABEL: Record<AssessmentStatus, string> = {
  borrador: 'Borrador', planificacion: 'En planificación', entrevistas: 'Entrevistas en curso', consolidacion: 'En consolidación',
  validacion: 'En validación', finalizado: 'Finalizado', archivado: 'Archivado',
};
export const STATUS_ORDER: AssessmentStatus[] = ['borrador', 'planificacion', 'entrevistas', 'consolidacion', 'validacion', 'finalizado'];

/** Nombres de modalidad. «Rápido», «Estándar» y «Profesional» se usan igual en el banco y en las evaluaciones. */
export const TIER_LABEL = { quick: 'Rápido', standard: 'Estándar', professional: 'Profesional' } as const;
export const MODALITY_LABEL: Record<AssessmentModality, string> = {
  quick: 'Diagnóstico rápido', standard: 'Diagnóstico estándar', professional: 'Diagnóstico profesional', custom: 'Diagnóstico personalizado',
};

/** Etiqueta completa de la modalidad de una evaluación: la misma en encabezados, fichas, narrativa e informes. */
export function modalityLabel(a: { modality: AssessmentModality; questionIds: string[]; customQuestions?: unknown[] }): string {
  const n = a.questionIds.length + (a.customQuestions?.length ?? 0);
  return a.modality === 'custom' ? `${MODALITY_LABEL.custom} · ${n.toLocaleString('es-CO')} criterios` : MODALITY_LABEL[a.modality];
}

export const PROFILE_LABEL: Record<RespondentProfile, string> = {
  direccion: 'Alta dirección', planeacion: 'Planeación', gestion_documental: 'Gestión documental', archivo: 'Administración de archivos',
  tecnologia: 'Tecnología', seguridad: 'Seguridad de la información', juridica: 'Jurídica', control_interno: 'Control interno', financiera: 'Gestión financiera',
  talento_humano: 'Talento humano', calidad: 'Calidad', gobierno_datos: 'Gobierno de datos', procesos: 'Responsables de procesos', usuarios: 'Usuarios finales',
  proveedores: 'Proveedores autorizados', otros: 'Otros',
};

/** Aviso único de almacenamiento local (versión completa y versión breve). */
export const LOCAL_DATA_NOTICE = {
  full: 'Los datos de los diagnósticos se almacenan localmente en este navegador. No existe sincronización automática entre dispositivos. La protección de la información depende también de las condiciones de seguridad del dispositivo y de los canales utilizados para compartir archivos.',
  short: 'Sus respuestas se guardan solo en este navegador hasta que usted exporte el archivo de resultados.',
} as const;

/** Etiqueta de verificación de fuentes. */
export const VERIFICATION_LABEL = {
  verificado: 'Verificado',
  verificado_parcial: 'Verificado parcialmente',
  referencia_conceptual: 'Referencia conceptual',
  no_verificado: 'No verificado',
} as const;

/** Estados de las iniciativas de la hoja de ruta. */
export const INITIATIVE_STATUS_LABEL = { propuesta: 'Propuesta', aprobada: 'Aprobada', en_ejecucion: 'En ejecución', finalizada: 'Finalizada', cancelada: 'Cancelada' } as const;

/** Licencia de la obra: Creative Commons Atribución 4.0 Internacional (resumen en español). */
export const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/deed.es';
