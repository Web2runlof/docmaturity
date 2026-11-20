# Especificación del producto

DOCMATURITY es una aplicación web progresiva para diagnosticar la madurez en gestión documental y gobierno de la información. Esta especificación describe el producto tal como quedó implementado en la versión 1.0.0.

## 1. Propósito y principios

- Diagnosticar capacidades organizacionales con un modelo explícito (DIAM v1.0) y resultados reproducibles.
- Distinguir lo percibido (respuestas de entrevistas) de lo validado (decisión del evaluador con justificación y evidencias).
- Declarar siempre la cobertura, el soporte de evidencias y las limitaciones del resultado.
- Convertir brechas en riesgos, prioridades explicadas y una hoja de ruta editable.
- Funcionar sin servidor: los datos permanecen en el navegador del evaluador.
- No emitir certificaciones, puntajes oficiales ni afirmaciones de cumplimiento normativo.

## 2. Usuarios y modos

| Modo | Usuario | Alcance |
|---|---|---|
| Evaluador (profesional) | Consultor, jefe de gestión documental, control interno | Todo el ciclo: caracterización, alcance, entrevistas, evidencias, validación, análisis, planeación e informes. Sin gamificación. |
| Entrevistado | Persona que recibe un archivo de asignación | Importa la asignación, responde sin conexión, exporta el archivo de resultados. Solo ve sus preguntas. |
| Académico | Docente y estudiantes | Laboratorio de 60 minutos con casos ficticios, insignias por calidad del proceso y entregable PDF. Usa el mismo motor de cálculo. |

Los modos son modos de interfaz, no roles autenticados por un servidor.

## 3. Mapa de navegación

**Sitio público:** inicio (landing con 10 secciones), cómo funciona, metodología, referentes, privacidad, abrir aplicación, responder entrevista.

**Aplicación:** inicio, organizaciones, evaluaciones, cuestionarios (banco), biblioteca metodológica, laboratorio académico, configuración. Dentro de una evaluación se muestra la navegación contextual: resumen, alcance y metas, entrevistas, evidencias, mesa de validación, resultados, brechas y riesgos, hoja de ruta, informes.

## 4. Funcionalidades

### 4.1 Organizaciones
Registro con 15 perfiles organizacionales, datos básicos, dependencias, procesos misionales, caracterización documental y tecnológica (volumen físico y digital, sistemas, nube, firma, preservación, custodia tercerizada, herramientas de IA) con calidad del dato (proporcionado, estimado, verificado, desconocido), condiciones jurídicas (funciones, recursos o servicios públicos, datos personales, valor histórico, regulación sectorial) y logo local opcional. Duplicar, archivar y eliminar con verificación de dependencias.

### 4.2 Evaluaciones
Modalidades rápida (30), estándar (90), profesional (225) y personalizada. Alcance con exclusiones justificadas, preguntas propias (prefijo `CUS-`), metas por dimensión y por criterio (meta por defecto 3), ponderaciones configurables con renormalización, umbrales configurables, panel de aplicabilidad jurídica. Estados: borrador, planificación, entrevistas, consolidación, validación, finalizado, archivado. Reapertura de una evaluación finalizada con nueva revisión e instantánea previa.

### 4.3 Entrevistas
Participantes identificados por código y perfil; asignación sugerida de dimensiones por perfil con núcleo compartido de triangulación. Entrevista dirigida y distribuida. Cuestionario con descriptores de nivel, aclaraciones, ejemplos, evidencias sugeridas, respuestas especiales (no sabe, no aplica propuesto, omitida), omisión de secciones, marcas para revisión, guardado automático y reanudación.

### 4.4 Evidencias
Registro por criterio con referencia, fecha, fuente, revisor, resultado de la revisión, alcance de la muestra, restricciones de acceso y estado E0–E3. Adjuntos opcionales de hasta 5 MB, guardados localmente y excluidos de los paquetes de evaluación.

### 4.5 Mesa de validación
Alertas de discrepancia (rango ≥ 2), contradicción (30 reglas), no aplica controvertido, nivel alto sin evidencia, crítico sin evaluar y baja cobertura por dimensión. El evaluador registra el nivel validado, la justificación, las evidencias y las contradicciones resueltas; las respuestas originales no se modifican.

### 4.6 Resultados
Vistas percibida, validada y comparación. Indicadores: madurez preliminar y validada del alcance, brecha frente al objetivo, cobertura del diagnóstico y del banco completo, soporte de evidencias, cobertura de validación, entrevistas, críticos en alerta, discrepancias, acuerdo, índice orientativo de solidez. Lecturas diferenciadas (organizacional, tecnológica, capacidades de sistemas, percepción, evidencia, posibles brechas normativas, riesgos, oportunidades). Quince visualizaciones con alternativa en tabla.

### 4.7 Brechas, riesgos y priorización
Brecha por criterio con tipo de acción, acción propuesta, resultado esperado, responsable, evidencia de cumplimiento e indicador. Biblioteca de 15 riesgos sugeridos por brechas y valorados por el evaluador (probabilidad, impacto, residual, tratamiento). Priorización con factores valorados o estimados (marcados como estimación), matriz impacto–esfuerzo y regla que impide priorizar tecnologías inteligentes antes de los controles esenciales sin justificación.

### 4.8 Hoja de ruta
Propuesta a partir de 32 plantillas de iniciativa, agrupadas sin duplicar propósitos y ordenadas por dependencias en cuatro fases (0–3, 3–6, 6–12 y 12–24 meses). Edición completa, presupuesto opcional en pesos colombianos, bloqueo de movimientos que violan dependencias, línea de tiempo, grafo de dependencias y portafolio.

### 4.9 Informes y exportaciones
PDF ejecutivo, PDF técnico, XLSX (hojas `01_Resumen` a `15_Cobertura`), paquete `.dm-assessment.json`, respaldo `.dm-backup.json`, cifrado opcional. Narrativa diagnóstica determinista con referencias a criterios. Asistente de IA opcional basado en prompts.

### 4.10 Biblioteca metodológica
Registro de 29 referentes con estado de verificación, trazabilidad dimensión → criterio → componente MGDA → referentes → aplicabilidad (exportable a CSV), glosario de 80 términos y explorador del banco con exportación JSON y CSV.

### 4.11 Configuración
Estado del almacenamiento y solicitud de persistencia, copia de seguridad completa y restauración con confirmación, preferencia del evaluador, eliminación de datos simulados, borrado total, auditoría e historial de importaciones.

## 5. Requisitos no funcionales

| Requisito | Implementación |
|---|---|
| Sin backend | Sitio estático; IndexedDB local; intercambio por archivos. |
| Sin envíos externos | CSP `connect-src 'self'`; sin analítica ni fuentes remotas; verificado en pruebas e2e. |
| Sin conexión | Service worker (Workbox) con precarga de todos los recursos. |
| Accesibilidad | Objetivo WCAG 2.2 AA: enlace de salto, foco visible, etiquetas, tablas alternativas a gráficos, estados no dependientes solo del color, movimiento reducido. |
| Seguridad | Sin HTML arbitrario, validación Zod, rechazo de claves de prototipo, límites de tamaño, protección contra inyección de fórmulas, cifrado con Web Crypto. |
| Reproducibilidad | Motor determinista, banco versionado, hash SHA-256 de paquetes. |
| Despliegue | GitHub Actions con `npm ci`, lint, tipos, pruebas y build; publicación oficial de Pages. |

## 6. Fuera de alcance

Sincronización entre dispositivos, autenticación, firma digital, integración con Moodle u otros LMS, conexión directa a servicios de IA, benchmarks sectoriales y certificación. Ver [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md).
