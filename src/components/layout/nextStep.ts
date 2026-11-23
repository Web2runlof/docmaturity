/**
 * Siguiente paso recomendado de una evaluación, derivado solo de los datos locales (IndexedDB).
 * Sigue el ciclo de trabajo: alcance → participantes → entrevistas → evidencias → validación →
 * hoja de ruta → informes. No modifica datos.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/database/db';

export interface NextStep {
  /** Índice del paso actual (0–7); 7 = evaluación finalizada. */
  index: number;
  total: number;
  label: string;
  hint: string;
  to: string;
}

export const NEXT_STEP_TOTAL = 7;

export function useNextStep(aid: string | undefined): NextStep | undefined {
  return useLiveQuery(async () => {
    if (!aid) return undefined;
    const a = await db.assessments.get(aid);
    if (!a) return undefined;
    const base = `/app/evaluaciones/${aid}`;
    const [participants, interviews, evidence, findings, initiatives] = await Promise.all([
      db.participants.where('assessmentId').equals(aid).count(),
      db.interviews.where('assessmentId').equals(aid).toArray(),
      db.evidence.where('assessmentId').equals(aid).count(),
      db.findings.where('assessmentId').equals(aid).count(),
      db.initiatives.where('assessmentId').equals(aid).count(),
    ]);
    const finished = interviews.filter((i) => i.status === 'finalizada').length;
    const step = (index: number, label: string, hint: string, to: string): NextStep => ({ index, total: NEXT_STEP_TOTAL, label, hint, to });
    if (a.questionIds.length + (a.customQuestions?.length ?? 0) === 0) return step(0, 'Definir el alcance', 'La evaluación aún no tiene criterios en su alcance.', `${base}/alcance`);
    if (participants === 0) return step(1, 'Registrar participantes', 'Agregue a las personas que serán entrevistadas.', `${base}/entrevistas`);
    if (finished === 0) return step(2, interviews.length ? 'Completar entrevistas' : 'Realizar entrevistas', interviews.length ? 'Hay entrevistas en curso sin finalizar.' : 'Aún no hay entrevistas registradas.', `${base}/entrevistas`);
    if (evidence === 0) return step(3, 'Registrar evidencias', 'Documente el sustento de los criterios con respuesta.', `${base}/evidencias`);
    if (findings === 0) return step(4, 'Validar en la mesa', 'Contraste lo declarado con la evidencia revisada.', `${base}/validacion`);
    if (initiatives === 0) return step(5, 'Construir la hoja de ruta', 'Convierta las brechas priorizadas en iniciativas.', `${base}/hoja-de-ruta`);
    if (a.status !== 'finalizado') return step(6, 'Preparar los informes', 'Genere los informes y finalice la evaluación.', `${base}/informes`);
    return step(7, 'Evaluación finalizada', 'Puede consultar y exportar los informes.', `${base}/informes`);
  }, [aid]);
}
