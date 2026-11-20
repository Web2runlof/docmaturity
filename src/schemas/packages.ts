/**
 * Esquemas de los archivos portables de DOCMATURITY (.dm-assignment, .dm-interview, .dm-assessment, .dm-backup).
 * Cada paquete incluye su versión de esquema y un hash SHA-256 del contenido. El hash detecta cambios o
 * corrupción, pero no acredita identidad ni autoría.
 */
import { z } from 'zod';

export const PACKAGE_SCHEMA_VERSION = 1;

export const PACKAGE_LIMITS = {
  assignment: 2 * 1024 * 1024,
  interview: 5 * 1024 * 1024,
  assessment: 60 * 1024 * 1024,
  backup: 250 * 1024 * 1024,
  encrypted: 340 * 1024 * 1024,
} as const;

const id = z.string().min(1).max(120).regex(/^[A-Za-z0-9-]+$/, 'Identificador con caracteres no válidos');
const text = (max = 20000) => z.string().max(max);
const iso = z.string().max(40);
const levelOrNull = z.number().int().min(0).max(5).nullable();
const special = z.enum(['NO_SABE', 'NO_APLICA_PROPUESTO', 'NO_APLICA_VALIDADO', 'OMITIDA', 'PENDIENTE', 'NO_ASIGNADA']).nullable();
const profile = z.enum([
  'direccion', 'planeacion', 'gestion_documental', 'archivo', 'tecnologia', 'seguridad', 'juridica', 'control_interno',
  'financiera', 'talento_humano', 'calidad', 'gobierno_datos', 'procesos', 'usuarios', 'proveedores', 'otros',
]);
const questionId = z.string().regex(/^(D(0[1-9]|1[0-5])-Q(0[1-9]|1[0-5])|CUS-[A-Za-z0-9]{1,24}-Q\d{2,3})$/, 'Identificador de pregunta no válido');

export const responseDataSchema = z.object({
  questionId,
  value: levelOrNull,
  special,
  note: text(4000),
  flagged: z.boolean(),
  reportedEvidence: text(4000),
  updatedAt: iso,
}).refine((r) => !(r.value !== null && r.special !== null), { message: 'Una respuesta no puede tener nivel y código especial a la vez' })
  .refine((r) => r.special !== 'NO_APLICA_VALIDADO', { message: 'La no aplicabilidad solo puede validarla el evaluador' });

export const customQuestionSchema = z.object({
  id: questionId,
  dimensionId: z.string().regex(/^D(0[1-9]|1[0-5])$/),
  criterion: text(300),
  question: text(1000),
  explanation: text(2000),
  maturityDescriptors: z.array(text(600)).max(6),
  isCritical: z.boolean(),
  weight: z.number().min(0).max(10),
});

export const assignmentPackageSchema = z.object({
  format: z.literal('docmaturity.assignment'),
  schemaVersion: z.number().int(),
  assignmentId: id,
  assessmentId: id,
  organizationId: id,
  organizationName: text(300),
  assessmentName: text(300),
  participantCode: text(80),
  profile,
  questionIds: z.array(questionId).min(1).max(400),
  customQuestions: z.array(customQuestionSchema).max(100),
  bankVersion: text(20),
  instructions: text(4000),
  createdAt: iso,
  dueDate: text(40),
  hash: z.string().regex(/^[a-f0-9]{64}$/),
});

export const interviewPackageSchema = z.object({
  format: z.literal('docmaturity.interview'),
  schemaVersion: z.number().int(),
  assignmentId: id,
  assessmentId: id,
  organizationId: id,
  participantCode: text(80),
  profile,
  bankVersion: text(20),
  revision: z.number().int().min(1).max(100000),
  status: z.enum(['en_curso', 'finalizada']),
  exportedAt: iso,
  responses: z.array(responseDataSchema).max(400),
  hash: z.string().regex(/^[a-f0-9]{64}$/),
});

/** Paquetes de evaluación y respaldo: se valida la estructura general y los campos críticos. */
const record = z.record(z.string(), z.unknown());

export const assessmentPackageSchema = z.object({
  format: z.literal('docmaturity.assessment'),
  schemaVersion: z.number().int(),
  appVersion: text(20),
  methodologyVersion: text(40),
  bankVersion: text(20),
  exportedAt: iso,
  organization: record,
  departments: z.array(record),
  assessment: record,
  participants: z.array(record),
  assignments: z.array(record),
  interviews: z.array(record),
  interviewRevisions: z.array(record),
  responses: z.array(record),
  evidence: z.array(record),
  findings: z.array(record),
  applicability: z.array(record),
  risks: z.array(record),
  priorityInputs: z.array(record),
  initiatives: z.array(record),
  recommendations: z.array(record),
  hash: z.string().regex(/^[a-f0-9]{64}$/),
});

export const backupPackageSchema = z.object({
  format: z.literal('docmaturity.backup'),
  schemaVersion: z.number().int(),
  manifest: z.object({
    appVersion: text(20),
    createdAt: iso,
    dbVersion: z.number().int(),
    counts: z.record(z.string(), z.number().int()),
  }),
  tables: z.record(z.string(), z.array(record)),
  hash: z.string().regex(/^[a-f0-9]{64}$/),
});

export const encryptedPackageSchema = z.object({
  format: z.literal('docmaturity.encrypted'),
  version: z.literal(1),
  payloadFormat: z.string().max(60),
  kdf: z.object({ name: z.literal('PBKDF2'), hash: z.literal('SHA-256'), iterations: z.number().int().min(100000).max(5000000), salt: z.string().max(200) }),
  cipher: z.object({ name: z.literal('AES-GCM'), iv: z.string().max(200), tagLength: z.literal(128) }),
  ciphertext: z.string(),
});

export type AssignmentPackage = z.infer<typeof assignmentPackageSchema>;
export type InterviewPackage = z.infer<typeof interviewPackageSchema>;
export type AssessmentPackage = z.infer<typeof assessmentPackageSchema>;
export type BackupPackage = z.infer<typeof backupPackageSchema>;
export type EncryptedPackage = z.infer<typeof encryptedPackageSchema>;
