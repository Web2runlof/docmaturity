import type { Level } from '@/types/bank';
import type {
  ApplicabilityDecision, Evidence, EvidenceStatus, Participant, Response, SpecialCode, ValidatedFinding,
} from '@/types/domain';
import { QUESTIONS } from '@/data/bank';
import { DEFAULT_THRESHOLDS } from '@/engine/constants';
import { buildQuestionStates, type ScoringInput } from '@/engine/scoring';

let counter = 0;
const nid = (p: string) => `${p}-${++counter}`;

export const participant = (profile: Participant['profile'] = 'gestion_documental', code?: string): Participant => ({
  id: nid('p'), assessmentId: 'a1', code: code ?? nid('E'), profile, area: '', displayName: '', createdAt: '2026-01-01T00:00:00Z',
});

export const response = (p: Participant, questionId: string, value: Level | null, special: SpecialCode | null = null, updatedAt = '2026-01-02T00:00:00Z'): Response => ({
  id: nid('r'), interviewId: `i-${p.id}`, assessmentId: 'a1', participantId: p.id, questionId, value, special, note: '', flagged: false, reportedEvidence: '', updatedAt,
});

export const evidence = (questionId: string, status: EvidenceStatus): Evidence => ({
  id: nid('e'), assessmentId: 'a1', questionId, participantId: null, title: 't', reference: '', fileName: '', date: '', source: '', reviewer: '', reviewResult: '', sampleScope: '', status, accessRestrictions: '', attachment: null, createdAt: '', updatedAt: '',
});

export const finding = (questionId: string, finalLevel: Level, preliminaryValue: number | null = null): ValidatedFinding => ({
  id: nid('f'), assessmentId: 'a1', questionId, preliminaryValue, finalLevel, justification: 'j', evidenceIds: [], evaluator: 'ev', date: '2026-01-03', contradictionsResolved: '', createdAt: '', updatedAt: '',
});

export const naValidated = (questionId: string): ApplicabilityDecision => ({
  id: nid('na'), assessmentId: 'a1', questionId, status: 'validado', justification: 'No hay archivos físicos', profileContext: '', reviewer: 'ev', date: '2026-01-03', createdAt: '',
});

export function input(over: Partial<ScoringInput> = {}): ScoringInput {
  const questions = over.questions ?? QUESTIONS.slice(0, 10);
  return {
    questions,
    dimensionIds: [...new Set(questions.map((q) => q.dimensionId))],
    dimensionWeights: { D01: 8 },
    questionWeights: {},
    participants: [],
    responses: [],
    evidence: [],
    findings: [],
    applicability: [],
    thresholds: DEFAULT_THRESHOLDS,
    defaultTarget: 3,
    dimensionTargets: {},
    questionTargets: {},
    bankTotal: QUESTIONS.length,
    ...over,
  };
}

export const states = (over: Partial<ScoringInput> = {}) => buildQuestionStates(input(over));
