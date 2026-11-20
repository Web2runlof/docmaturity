# Flujo de entrevistas

DOCMATURITY ofrece dos formas de entrevistar. En ambas, cada participante es una observación independiente y las respuestas especiales no se convierten en cero.

## 1. Entrevista dirigida

El evaluador conduce la entrevista en su propio navegador.

1. **Entrevistas → Agregar participante** (código, perfil, área opcional).
2. **Asignar preguntas** (opcional): dimensiones sugeridas por perfil más el núcleo compartido de triangulación.
3. **Dirigida**: se abre el cuestionario. Si existe una entrevista dirigida en curso para ese participante, se reanuda.
4. Al terminar, **Finalizar entrevista**. Las respuestas quedan registradas como entrevista dirigida.

## 2. Entrevista distribuida (sin servidor)

```
Evaluador                         Archivo                        Entrevistado
─────────                         ───────                        ────────────
1. Crea la asignación
2. Descarga «Paquete»  ─────────▶ .dm-assignment.json ─────────▶ 3. Abre /responder e importa
                                                                 4. Responde sin conexión
                                                                    (guarda avance, reanuda)
6. Importa y consolida ◀───────── .dm-interview.json ◀────────── 5. Exporta respuestas
7. Valida en la mesa
```

### Paquete de asignación
Contiene solo lo necesario: identificadores, nombre autorizado de la organización, nombre de la evaluación, código y perfil del participante, preguntas asignadas, versión del banco, instrucciones, fechas y hash. **No** incluye respuestas de otras personas, presupuestos, hallazgos ni evidencias. Puede cifrarse con contraseña.

### Modo entrevistado
En **Responder entrevista** la persona importa el archivo (si ya lo había importado, se reanuda la misma sesión), responde, marca preguntas para revisión, omite preguntas o secciones y exporta. Las sesiones del entrevistado se guardan separadas de los datos del evaluador. Cada exportación genera una revisión numerada.

### Importación en el diagnóstico original
En **Entrevistas → Importar resultados** el evaluador carga el `.dm-interview.json` (simple o cifrado). Se verifica:

- formato, versión del esquema y estructura (Zod);
- que la evaluación, la asignación y el participante existan;
- que las preguntas respondidas estén dentro de la asignación;
- valores de nivel 0–5 y códigos especiales válidos;
- hash SHA-256 del contenido;
- versión del banco (advertencia si difiere).

Resultados posibles:

| Resultado | Situación | Efecto |
|---|---|---|
| Aceptado | Primera importación válida | Se crea la entrevista autoadministrada con sus respuestas. |
| Duplicado | Mismo contenido (mismo hash) ya importado | No se duplican respuestas. |
| Revisión pendiente | Nueva revisión de una entrevista ya importada | Se guarda sin aplicar; el evaluador ve las diferencias por criterio y decide adoptar la nueva revisión o conservar la vigente, con motivo. |
| Rechazado | Archivo incompatible, alterado o con preguntas no autorizadas | No se guarda nada; se registra en el historial. |

Todas las importaciones quedan en el historial (Configuración → Importaciones) con resultado y hash.

## 3. Respuestas especiales

| Código | Quién | Efecto |
|---|---|---|
| `NO_SABE` | Participante | Excluida del cálculo; reduce cobertura. |
| `NO_APLICA_PROPUESTO` | Participante | Excluida; alimenta la alerta «no aplica controvertido». |
| `NO_APLICA_VALIDADO` | Evaluador | Retira el criterio del denominador, con justificación y revisor. |
| `OMITIDA` | Participante | Excluida; reduce cobertura. |
| `PENDIENTE` | Sistema | Pregunta asignada sin respuesta. |
| `NO_ASIGNADA` | Sistema | Pregunta fuera de la asignación del participante; no forma parte de sus respuestas esperadas. |

## 4. Consolidación y validación

Tras importar, la **mesa de validación** muestra por criterio las respuestas de cada participante, estadísticos, evidencias y alertas. El evaluador registra el nivel validado con justificación; las respuestas originales no cambian. Ver [SCORING_ENGINE.md](SCORING_ENGINE.md).

## 5. Canales de intercambio

Use los canales que su organización autorice (correo institucional, carpeta compartida con control de acceso, medios extraíbles). Para información sensible, cifre los archivos y comparta la contraseña por un canal distinto. DOCMATURITY nunca carga archivos a servidores externos.
