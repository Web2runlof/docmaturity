# Metodología DIAM v1.0

**DIAM — DocMaturity Integrated Assessment Model v1.0.** Modelo original de DOCMATURITY para evaluar capacidades organizacionales de gestión documental y gobierno de la información. Es una propuesta metodológica independiente y orientativa: no está certificada ni avalada por los referentes consultados.

## 1. Estructura

- 15 dimensiones × 15 criterios = **225 criterios**.
- Cada criterio tiene: pregunta, aclaración, por qué importa, **seis descriptores de nivel específicos** (0 a 5), verificaciones observables, ejemplo, evidencias sugeridas, recomendaciones para cada nivel, referentes asociados, componente MGDA, perfiles sugeridos, condiciones de aplicabilidad, aplicabilidad normativa, peso, criticidad, nivel mínimo recomendado, prerrequisitos, criterios relacionados y guía de validación.
- **1.350 descriptores** distintos y **1.350 recomendaciones** por nivel.
- 22 criterios críticos (D05-Q03, D05-Q05, D05-Q07, D05-Q13, D05-Q14, D06-Q08, D06-Q11, D07-Q08, D07-Q09, D07-Q11, D07-Q14, D08-Q13, D08-Q14, D10-Q04, D10-Q10, D10-Q11, D10-Q13, D10-Q15, D11-Q01, D11-Q06, D11-Q07, D14-Q13).

| ID | Dimensión | Componente MGDA | Peso |
|---|---|---|---|
| D01 | Estratégica | Estratégico | 8 |
| D02 | Gobernanza | Estratégico | 8 |
| D03 | Administración y presupuesto | Administración de archivos | 5 |
| D04 | Operativa y procesos | Documental | 8 |
| D05 | Archivística y documental | Documental | 11 |
| D06 | Administración de archivos | Administración de archivos | 5 |
| D07 | Documentos y expedientes electrónicos | Documental | 11 |
| D08 | Tecnología y arquitectura | Tecnológico | 8 |
| D09 | Interoperabilidad y metadatos | Tecnológico | 7 |
| D10 | Seguridad, riesgos y cumplimiento | Tecnológico | 8 |
| D11 | Preservación digital | Tecnológico | 8 |
| D12 | Cultura y talento humano | Cultural | 5 |
| D13 | Gobierno de datos y conocimiento | Estratégico | 3 |
| D14 | Automatización e inteligencia artificial | Tecnológico | 2 |
| D15 | Desempeño y mejora continua | Estratégico | 3 |

Los pesos suman 100. El bajo peso de D14 es deliberado: la automatización y la IA no compensan deficiencias en capacidades esenciales.

## 2. Escala de madurez

| Nivel | Nombre | Descripción general |
|---|---|---|
| 0 | Inexistente | No se identifica capacidad, control o práctica organizacional. |
| 1 | Inicial | Prácticas informales, aisladas, dependientes de personas y reactivas. |
| 2 | En desarrollo | Capacidades parciales con formalización o implementación limitada. |
| 3 | Definido | Capacidades formalizadas, implementadas y consistentes en el alcance. |
| 4 | Gestionado | Capacidades controladas, monitoreadas, medidas y evaluadas. |
| 5 | Optimizado | Capacidades sostenibles sujetas a mejora continua basada en evidencia. |

Los descriptores de cada criterio concretan esta escala. Ningún nivel 5 exige adoptar una tecnología específica (en D14 el nivel 5 admite la decisión documentada de no adoptar IA).

Interpretación de valores agregados: [0; 0,5) Inexistente, [0,5; 1,5) Inicial, [1,5; 2,5) En desarrollo, [2,5; 3,5) Definido, [3,5; 4,5) Gestionado, [4,5; 5] Optimizado. El porcentaje del máximo teórico no es un porcentaje de cumplimiento legal.

## 3. Modalidades

| Modalidad | Criterios | Selección |
|---|---|---|
| Rápida | 30 | 2 criterios núcleo por dimensión (`coreTier = quick`). |
| Estándar | 90 | Los 30 rápidos + 4 por dimensión (`standard`). |
| Profesional | 225 | Banco completo. |
| Personalizada | Variable | Dimensiones seleccionadas con base rápida, estándar o profesional, preguntas propias y exclusiones justificadas. |

## 4. Proceso metodológico

1. **Caracterización** de la organización y de sus condiciones jurídicas.
2. **Definición del alcance**, metas y ponderaciones.
3. **Entrevistas** a varios perfiles (dirección, gestión documental, archivo, tecnología, seguridad, jurídica, control interno, entre otros), con un núcleo compartido de 8 criterios para triangular.
4. **Registro de evidencias** con estado E0–E3.
5. **Triangulación y validación**: el evaluador contrasta percepciones, reglas de contradicción y evidencias y registra el nivel validado con justificación.
6. **Análisis**: madurez por dimensión y global, cobertura, evidencias, acuerdo y solidez.
7. **Planeación**: brechas, riesgos, prioridades y hoja de ruta.

Las fórmulas se documentan en [SCORING_ENGINE.md](SCORING_ENGINE.md) y las reglas jurídicas en [APPLICABILITY_RULES.md](APPLICABILITY_RULES.md).

## 5. Fundamentación

El modelo se construyó a partir de 27 referentes normativos, técnicos y de buenas prácticas y 2 referentes académicos, registrados en [SOURCE_REGISTER.md](SOURCE_REGISTER.md) con su estado de verificación (verificado, verificado parcialmente, referencia conceptual, no verificado). La matriz [SOURCE_TRACEABILITY.csv](SOURCE_TRACEABILITY.csv) relaciona cada criterio con su dimensión, fuentes, componente MGDA, criticidad, carácter normativo u orientativo y estado de verificación.

Las asociaciones entre criterios y referentes son **conceptuales**: no implican correspondencia con cláusulas o artículos específicos. Los criterios son redacción original y no reproducen textos protegidos.

## 6. Versionado

El banco tiene versión propia (`bankVersion` 1.0.0) y la metodología se identifica como «DIAM 1.0». Cada evaluación registra ambas versiones. La comparación histórica se limita a la intersección de criterios y advierte cuando las versiones o las modalidades difieren.

## 7. Limitaciones metodológicas

- El nivel de madurez agregado resume capacidades heterogéneas; debe leerse junto con la cobertura, las alertas críticas y las lecturas diferenciadas.
- La percepción de los entrevistados puede estar sesgada; la validación con evidencias es la que sustenta conclusiones.
- Los factores de evidencia (0; 0,25; 0,6; 1), los pesos y los umbrales son convenciones del modelo, configurables y no derivadas estadísticamente.
- La aplicabilidad normativa sugerida requiere validación jurídica para cada organización.
