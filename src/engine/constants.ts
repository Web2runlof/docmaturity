import type { EvidenceStatus, Thresholds } from '@/types/domain';

/** Factores de soporte de evidencia: convenciones metodológicas del DIAM. */
export const EVIDENCE_FACTOR: Record<EvidenceStatus, number> = { E0: 0, E1: 0.25, E2: 0.6, E3: 1 };

export const EVIDENCE_LABEL: Record<EvidenceStatus, string> = {
  E0: 'Sin evidencia disponible',
  E1: 'Reportada, no revisada',
  E2: 'Revisada parcialmente',
  E3: 'Revisada y suficiente',
};

export const DEFAULT_THRESHOLDS: Thresholds = {
  coverageInsufficient: 50,
  coverageExploratory: 70,
  coveragePartial: 90,
  discrepancyRange: 2,
  highScoreWithoutEvidence: 4,
};

export const DEFAULT_TARGET = 3;

export const SOLIDITY_WEIGHTS = { coverage: 0.4, evidence: 0.4, agreement: 0.2 } as const;

export const PRIORITY_WEIGHTS = { gap: 0.3, impact: 0.25, criticality: 0.2, urgency: 0.15, enabler: 0.1 } as const;

export const RISK_BANDS = [
  { max: 4, label: 'Bajo', key: 'bajo' },
  { max: 9, label: 'Moderado', key: 'moderado' },
  { max: 16, label: 'Alto', key: 'alto' },
  { max: 25, label: 'Crítico', key: 'critico' },
] as const;

export const SPECIAL_LABEL: Record<string, string> = {
  NO_SABE: 'No sabe',
  NO_APLICA_PROPUESTO: 'No aplica (propuesto)',
  NO_APLICA_VALIDADO: 'No aplica (validado)',
  OMITIDA: 'Omitida',
  PENDIENTE: 'Pendiente',
  NO_ASIGNADA: 'No asignada',
};

/** Paleta semántica por nivel. El color nunca es el único portador del estado. */
export const LEVEL_COLORS = ['#B91C1C', '#C2410C', '#B7791F', '#2563EB', '#0D9488', '#166534'] as const;
export const NO_DATA_COLOR = '#94A3B8';
