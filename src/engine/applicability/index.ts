/**
 * Aplicabilidad jurídica y sugerencias de no aplicabilidad.
 * Nunca se clasifica a una organización como sujeto obligado solo por su nombre o sector:
 * las obligaciones públicas dependen de las respuestas del evaluador sobre funciones,
 * recursos y servicios públicos. Las sugerencias de no aplicabilidad requieren validación.
 */
import type { ApplicabilityCondition, Question } from '@/types/bank';
import type { LegalStatus, Organization } from '@/types/domain';
import { getProfile } from '@/data/sector-profiles';

export interface LegalApplicabilityResult {
  status: LegalStatus;
  reason: string;
  overridden: boolean;
}

export function isPublicSubject(org: Pick<Organization, 'profileId' | 'legalFlags'>): boolean | null {
  const p = getProfile(org.profileId);
  const f = org.legalFlags;
  if (p.publicNature === true) return true;
  if (f.publicFunctions === 'si' || f.publicResources === 'si' || f.publicServices === 'si') return true;
  if (p.publicNature === false && f.publicFunctions !== 'desconocido' && f.publicResources !== 'desconocido' && f.publicServices !== 'desconocido') return false;
  if (f.publicFunctions === 'no' && f.publicResources === 'no' && f.publicServices === 'no') return false;
  return null;
}

export function legalApplicability(
  q: Pick<Question, 'id' | 'legalApplicability' | 'applicabilityRules'>,
  org: Pick<Organization, 'profileId' | 'legalFlags'>,
  overrides: Record<string, LegalStatus> = {},
): LegalApplicabilityResult {
  const o = overrides[q.id];
  if (o) return { status: o, reason: 'Decisión registrada en el panel de aplicabilidad jurídica.', overridden: true };
  switch (q.legalApplicability) {
    case 'obligacion_publica': {
      const pub = isPublicSubject(org);
      if (pub === true) return { status: 'obligatoria', reason: 'La organización ejerce funciones, administra recursos o presta servicios públicos, o es entidad pública. Validar el ámbito de información afectado.', overridden: false };
      if (pub === false) return { status: 'buena_practica', reason: 'La organización no parece sujeta a esta obligación; se evalúa como capacidad equivalente o buena práctica.', overridden: false };
      return { status: 'por_validar', reason: 'Faltan datos sobre funciones, recursos o servicios públicos para determinar la obligación.', overridden: false };
    }
    case 'obligacion_general':
      if (q.applicabilityRules.includes('datos_personales') && org.legalFlags.personalData === 'no') {
        return { status: 'buena_practica', reason: 'El evaluador indicó que no se tratan datos personales en el alcance.', overridden: false };
      }
      return { status: org.legalFlags.personalData === 'desconocido' ? 'por_validar' : 'obligatoria', reason: 'Obligación de alcance general, sujeta a verificación del ámbito de tratamiento.', overridden: false };
    case 'sectorial':
      return org.legalFlags.sectoralRegulation.trim()
        ? { status: 'por_validar', reason: 'Existe regulación sectorial declarada; validar su alcance.', overridden: false }
        : { status: 'buena_practica', reason: 'No se declaró regulación sectorial aplicable.', overridden: false };
    default:
      return { status: 'buena_practica', reason: 'Referente orientativo; no constituye obligación jurídica.', overridden: false };
  }
}

export const LEGAL_STATUS_LABEL: Record<LegalStatus, string> = {
  obligatoria: 'Posible obligación aplicable',
  por_validar: 'Aplicabilidad por validar',
  buena_practica: 'Buena práctica',
};

const CONDITION_FIELD: Partial<Record<ApplicabilityCondition, { key: string; label: string }>> = {
  fisico: { key: 'hasPhysical', label: 'no conserva archivos físicos' },
  electronico: { key: 'hasNativeDigital', label: 'no produce documentos nativos digitales' },
  firma: { key: 'eSignature', label: 'no usa firma electrónica ni digital' },
  nube: { key: 'cloud', label: 'no usa servicios en la nube' },
  terceros: { key: 'outsourcedCustody', label: 'no terceriza custodia ni procesamiento documental' },
  ia: { key: 'aiTools', label: 'no usa automatización ni IA (requiere decisión documentada)' },
};

/** Sugiere no aplicabilidad según la caracterización. Solo es una propuesta para el evaluador. */
export function suggestNotApplicable(q: Pick<Question, 'applicabilityRules'>, org: Pick<Organization, 'documentary' | 'legalFlags'>): string | null {
  for (const c of q.applicabilityRules) {
    const f = CONDITION_FIELD[c];
    if (f && org.documentary[f.key]?.value === 'no') return `La caracterización indica que la organización ${f.label}.`;
    if (c === 'hist' && org.legalFlags.historicalValue === 'no') return 'La caracterización indica que no hay documentos con valor histórico o patrimonial.';
  }
  return null;
}

/** Texto prudente para posibles brechas normativas. */
export const possibleLegalGapText = (criterion: string) => `Posible brecha normativa que requiere validación: ${criterion}.`;
