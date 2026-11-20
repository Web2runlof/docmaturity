# Modelo de datos

Tipos en `src/types/domain.ts` y `src/types/bank.ts`; esquemas de validación en `src/schemas/`. La base local usa IndexedDB mediante Dexie (`src/database/db.ts`), nombre `docmaturity`, versión de esquema **2**.

## 1. Tablas locales

| Tabla | Clave e índices | Contenido |
|---|---|---|
| `organizations` | `id`, archived, isDemo, updatedAt | Organización, perfil, caracterización (`documentary`), condiciones jurídicas (`legalFlags`), logo local, marcas `isDemo`/`isAcademic`. |
| `departments` | `id`, organizationId | Dependencias o áreas. |
| `assessments` | `id`, organizationId, status, updatedAt | Evaluación: modalidad, alcance, `questionIds`, `excludedQuestions`, `customQuestions`, ponderaciones, metas, umbrales, `legalOverrides`, estado, revisión, versiones de metodología y banco. |
| `snapshots` | `id`, assessmentId | Instantánea serializada al reabrir una evaluación finalizada. |
| `participants` | `id`, assessmentId | Código, perfil, área, nombre autorizado opcional. |
| `assignments` | `id`, assessmentId, participantId | Preguntas asignadas, instrucciones, fecha de entrega, fecha de exportación y hash. |
| `interviews` | `id`, assessmentId, participantId, assignmentId | Modo (dirigida o autoadministrada), estado, revisión, origen (local o importada), hash, notas. |
| `interviewRevisions` | `id`, interviewId, assessmentId | Revisiones importadas pendientes o resueltas, con respuestas y decisión. |
| `responses` | `id`, interviewId, assessmentId, questionId, [interviewId+questionId] | Nivel 0–5 o código especial, nota, marca, evidencia reportada. |
| `evidence` | `id`, assessmentId, questionId | Evidencia con estado E0–E3, revisión y adjunto opcional (`Blob`). |
| `findings` | `id`, assessmentId, [assessmentId+questionId] | Nivel validado, justificación, evidencias, evaluador, fecha, contradicciones resueltas. |
| `applicability` | `id`, assessmentId, [assessmentId+questionId] | Decisión de no aplicabilidad (propuesta o validada) con justificación y revisor. |
| `risks` | `id`, assessmentId | Riesgo con probabilidad, impacto, residual, responsable, tratamiento y estado. |
| `priorityInputs` | `id`, assessmentId, [assessmentId+questionId] | Factores valorados (impacto, urgencia, habilitador, esfuerzo) y justificación. |
| `initiatives` | `id`, assessmentId | Iniciativa de la hoja de ruta: fase, fechas, dependencias, presupuesto COP opcional, productos, indicadores, estado. |
| `recommendations` | `id`, assessmentId | Recomendaciones registradas; los textos externos de IA aprobados se guardan con `questionId = "IA-EXTERNA"` y la nota de origen. |
| `auditEvents` | `++seq`, at, assessmentId | Registro de acciones. |
| `importEvents` | `++seq`, at | Historial de importaciones con resultado y hash. |
| `settings` | `id = "app"` | Último respaldo, persistencia, nombre del evaluador. |
| `respondentSessions` | `id`, assignmentId, updatedAt | Sesiones del modo entrevistado (separadas de los datos del evaluador). |

### Migraciones

- **v1**: tablas iniciales.
- **v2**: tabla `respondentSessions`; en `assessments` se completan `legalOverrides`, `thresholds` (con valores por defecto) y `excludedQuestions`.

Las nuevas versiones se agregan con `this.version(n).stores(...).upgrade(...)`, sin borrar datos. El respaldo registra la versión de la base (`dbVersion`).

## 2. Paquetes de intercambio

Todos los paquetes son JSON con `format`, `schemaVersion` (1) y `hash` (SHA-256 del JSON canónico sin el campo `hash`). Se validan con Zod, se rechazan claves `__proto__`, `constructor` y `prototype`, y se aplican límites de tamaño.

| Formato | Extensión | Límite | Contenido |
|---|---|---|---|
| `docmaturity.assignment` | `.dm-assignment.json` | 2 MB | Identificadores, nombre autorizado de la organización, nombre de la evaluación, código y perfil del participante, preguntas asignadas (y preguntas propias), versión del banco, instrucciones y fechas. |
| `docmaturity.interview` | `.dm-interview.json` | 5 MB | Identificadores de asignación, evaluación y participante, revisión, respuestas, notas, estado y fechas. |
| `docmaturity.assessment` | `.dm-assessment.json` | 60 MB | Organización, dependencias, evaluación y todas sus entidades. Las evidencias van sin adjuntos. |
| `docmaturity.backup` | `.dm-backup.json` | 250 MB | Todas las tablas, incluidos los adjuntos en Base64, con manifiesto (versión de la aplicación, fecha, versión de la base y conteos). |
| `docmaturity.encrypted` | `*.cifrado.json` | 340 MB | Envoltura cifrada de cualquiera de los anteriores. |

Envoltura cifrada (clave AES de 256 bits derivada con PBKDF2; salt e IV aleatorios en cada exportación):

```json
{
  "format": "docmaturity.encrypted",
  "version": 1,
  "payloadFormat": "dm-backup",
  "kdf": { "name": "PBKDF2", "hash": "SHA-256", "iterations": 310000, "salt": "<base64, 16 bytes>" },
  "cipher": { "name": "AES-GCM", "iv": "<base64, 12 bytes>", "tagLength": 128 },
  "ciphertext": "<base64>"
}
```

## 3. Banco metodológico

`src/data/question-bank/bank.generated.json` (generado por `npm run bank` desde `source/D01.txt … D15.txt`): `bankVersion`, `methodology`, `dimensions[]` y `questions[]` con los campos descritos en [METHODOLOGY_DIAM.md](METHODOLOGY_DIAM.md). Fuentes en `src/data/sources/sources.json`; glosario en `src/data/glossary.json`; perfiles en `src/data/sector-profiles/`; plantillas de iniciativa en `src/data/recommendations/initiatives.ts`; casos ficticios en `src/data/demo/cases.ts`.

## 4. Datos simulados

Las organizaciones y evaluaciones de demostración o académicas tienen `isDemo` o `isAcademic` en `true`, se cargan solo a petición, muestran un aviso permanente y se eliminan desde Configuración sin afectar los datos reales.
