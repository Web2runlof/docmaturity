/**
 * Mantenimiento local al iniciar la aplicación y después de restaurar un respaldo.
 * Es idempotente: puede ejecutarse varias veces sin efectos acumulados.
 */
import { db, guarded } from '@/database/db';
import { dedupeSimulatedCases } from './demo';

const EARLY_STATUSES = ['borrador', 'planificacion', 'entrevistas', 'consolidacion'];

export async function runMaintenance(): Promise<void> {
  try {
    await dedupeSimulatedCases();
    const withFindings = new Set((await db.findings.toArray()).map((f) => f.assessmentId));
    const initiatives = await db.initiatives.toArray();
    await guarded(() => db.assessments.toCollection().modify((a) => {
      if (withFindings.has(a.id) && EARLY_STATUSES.includes(a.status)) a.status = 'validacion';
      if (!a.roadmapStartDate) {
        const first = initiatives.filter((i) => i.assessmentId === a.id && i.startDate).map((i) => i.startDate).sort()[0];
        if (first) a.roadmapStartDate = first;
      }
    }));
  } catch {
    // El mantenimiento nunca debe impedir el uso de la aplicación.
  }
}
