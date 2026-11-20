import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { loadBundle } from '@/services/repo';
import { analyzeAssessment } from '@/engine/analyze';
import { db } from '@/database/db';

/** Datos vivos de una evaluación y su análisis memoizado. */
export function useAssessmentData(aid: string | undefined) {
  const bundle = useLiveQuery(() => (aid ? loadBundle(aid) : Promise.resolve(null)), [aid], undefined);
  const analysis = useMemo(() => (bundle ? analyzeAssessment(bundle) : null), [bundle]);
  return { bundle, analysis, loading: bundle === undefined, missing: bundle === null };
}

export function useSettings() {
  return useLiveQuery(() => db.settings.get('app'), [], undefined);
}
