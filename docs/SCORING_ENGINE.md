# Motor de calificación

Implementado en `src/engine/` como funciones puras y deterministas. El orquestador `analyzeAssessment(bundle)` (`src/engine/analyze.ts`) produce todos los resultados a partir de los datos locales. Las pruebas en `tests/unit/engine.test.ts` cubren los casos matemáticos obligatorios.

## 1. Universo de criterios

| Conjunto | Definición |
|---|---|
| Alcance | Criterios seleccionados por la modalidad o la personalización, menos exclusiones justificadas. |
| Aplicables | Alcance menos criterios con `NO_APLICA_VALIDADO` (decisión del evaluador con justificación y revisor). |
| Con puntuación | Aplicables con al menos una respuesta numérica de un participante. |

Respuestas especiales (en la interfaz se muestran con su nombre legible, nunca con el código interno): «No sabe», «No aplica (propuesto)», «Omitida» y «Pendiente» **no se convierten en cero**: no entran al cálculo y dejan el criterio sin puntuación, por lo que reducen la cobertura. «No aplica (validado)» retira el criterio del universo aplicable (reduce el denominador) y «No asignada» indica que la pregunta no forma parte de la entrevista de esa persona: ninguna de las dos reduce la cobertura.

## 2. Consolidación por criterio

Regla: **una respuesta por participante y mediana entre participantes**.

1. Se toma una respuesta por participante único (la más reciente si hay varias entrevistas del mismo participante).
2. Valor preliminar (serie percibida) = **mediana** de esas respuestas numéricas.
3. Estadísticos: n, media, mínimo, máximo, rango, desviación estándar (n ≥ 2), número de perfiles y distribución por nivel.
4. **Acuerdo** = 1 − rango / 5 (solo con n ≥ 2).
5. **Discrepancia**: rango ≥ umbral (por defecto 2).

Caso de prueba: respuestas 4, 3, 2, 1 → mediana 2,5; media 2,5; rango 3; acuerdo 0,4; alerta de discrepancia. Una preliminar de 2,5 no equivale a un nivel 3 validado.

## 3. Valor validado y valor actual

- Valor validado = nivel entero 0–5 registrado por el evaluador en la mesa de validación, con justificación obligatoria. No modifica las respuestas.
- Valor actual = validado si existe; en otro caso, preliminar. Se usa solo en la lista de brechas por criterio y en la priorización.
- Los agregados (madurez, brecha frente a la meta, coberturas de la serie, lecturas diferenciadas, alertas críticas, componentes MGDA y referentes) se calculan **por serie**: percibida (preliminar) o validada. Una vista nunca mezcla las dos series; los indicadores que solo dependen de las respuestas (discrepancias, acuerdo, solidez) se marcan «solo percibida» en las vistas validada y de comparación.
- **Validado sin evidencia suficiente**: criterio validado en nivel ≥ 3 cuya mejor evidencia es E0 o E1. Se marca en la mesa de validación, en los resultados y en los informes, se advierte al guardar y no cuenta en «Capacidades sustentadas con evidencia».

## 4. Madurez por dimensión

```
Dimensión(vista) = Σ (valor_criterio × peso_criterio) / Σ peso_criterio
```
sobre los criterios aplicables con valor en la vista (preliminar o validada). Los pesos se **renormalizan** sobre los criterios disponibles. Sin datos, el resultado es nulo (nunca cero).

Una dimensión sin datos se marca como insuficiente. Una dimensión con cobertura inferior al umbral de insuficiencia (50 %) genera la alerta «baja cobertura de dimensión» y se muestra con su cobertura declarada para que el evaluador decida si la interpreta.

## 5. Madurez global

```
Global = Σ (Dimensión × peso_dimensión) / Σ pesos de las dimensiones incluidas
```

Se excluyen del global, con su motivo, las dimensiones sin criterios aplicables, sin datos en la vista o con ponderación cero.

Cada serie informa sobre qué dimensiones se calculó («calculada sobre D01–D05»). La serie se marca **«Exploratorio»** cuando su cobertura es insuficiente o exploratoria, o cuando la validada se calcula sobre menos dimensiones que la percibida; en la vista de comparación se advierte que los universos difieren.

Etiquetas: «Madurez preliminar del alcance evaluado», «Madurez validada del alcance evaluado» y «Madurez integral validada». Esta última solo se usa en la vista validada cuando se incluyen las 15 dimensiones, el alcance cubre el banco completo y la cobertura de validación alcanza el umbral de cobertura alta (90 %).

## 6. Cobertura

```
Cobertura = criterios aplicables con puntuación / criterios aplicables × 100
CoberturaValidación = criterios aplicables validados / criterios aplicables × 100
CoberturaPonderada = Σ peso (con puntuación) / Σ peso (aplicables) × 100
Alcance sobre el banco = criterios aplicables del alcance / 225 × 100
Cobertura del banco = criterios del banco con puntuación (en la serie) / 225 × 100
```

En la demostración (línea base): cobertura del diagnóstico 87/95 = 91,6 %; alcance sobre el banco 95/225 = 42,2 %; cobertura del banco 87/225 = 38,7 %.

Bandas configurables: < 50 % información insuficiente; < 70 % exploratoria; < 90 % parcial; ≥ 90 % alta.

Caso obligatorio: 10 seleccionados, 2 no aplica validados, 5 numéricos, 3 pendientes u omitidos → aplicables 8 → cobertura 5/8 = **62,5 %**, banda **exploratoria** (no 50 % ni 100 %).

## 7. Soporte de evidencias

Factor por criterio según el mejor estado entre sus evidencias registradas: E0 = 0; E1 = 0,25; E2 = 0,6; E3 = 1.

```
Soporte = Σ (factor × peso) / Σ peso × 100   (criterios con puntuación)
CoberturaVerificación = criterios aplicables con E3 / criterios aplicables × 100
```

El soporte de evidencias es un indicador separado: no multiplica ni reduce la madurez.

## 8. Solidez diagnóstica

```
Solidez = 0,4 × Cobertura + 0,4 × Soporte + 0,2 × (Acuerdo × 100)
```
Escala 0–100: cobertura y soporte en porcentaje; el acuerdo (0–1) se multiplica por 100. Ejemplo: cobertura 91,6 %, soporte 27,2 % y acuerdo 0,52 → 0,4·91,6 + 0,4·27,2 + 0,2·52 = 57,9. Índice orientativo; no es una confianza estadística. Si falta alguno de los componentes (por ejemplo, un único entrevistado sin acuerdo calculable) no se calcula y se informa qué falta.

## 9. Alertas

| Alerta | Condición |
|---|---|
| Crítico bajo | Criterio crítico con valor actual ≤ 1. |
| Crítico no evaluado | Criterio crítico aplicable sin puntuación. |
| Discrepancia | Rango ≥ 2 con n ≥ 2. |
| Contradicción | Se activa una de las 30 reglas (R01–R30): criterio A ≤ 1 y criterio B ≥ 4 (o viceversa). |
| No aplica controvertido | Hay propuestas de «no aplica» y respuestas numéricas, sin decisión del evaluador. |
| Alto sin evidencia | Valor actual ≥ 4 con factor de evidencia inferior a 0,6 (sin evidencia E2 o E3). |
| Baja cobertura de dimensión | Cobertura de la dimensión por debajo del umbral. |

## 10. Brechas

```
Brecha del criterio = máx(0, meta − valor)
Brecha frente a la meta (serie) = Σ (brecha del criterio × peso) / Σ peso   (criterios puntuados en la serie)
```
La brecha frente a la meta **no** se calcula como meta promedio menos madurez global. Meta por defecto 3, configurable por dimensión y por criterio. Sin valor actual, la recomendación es «evaluar la capacidad». Si la meta es inferior al nivel actual, el criterio se muestra como superado.

## 11. Riesgos

`Valor = probabilidad (1–5) × impacto (1–5)`. Bandas iniciales: 1–4 bajo, 5–9 moderado, 10–16 alto, 17–25 crítico. Los riesgos se sugieren desde brechas en criterios disparadores, pero la probabilidad y el impacto los asigna el evaluador. «Incumplimiento normativo potencial» (RK07) solo se sugiere si algún criterio vinculado es una posible obligación o una obligación validada según la aplicabilidad jurídica de la organización; en los demás casos se sugiere «Debilidad de control» (RK16).

## 12. Priorización

```
Prioridad = 0,30·Brecha + 0,25·Impacto + 0,20·Criticidad + 0,15·Urgencia + 0,10·Habilitador
```
Factores en escala 0–5. Brecha y criticidad se calculan; impacto, urgencia, habilitador y esfuerzo pueden valorarse o se estiman (y se marcan como estimación). Cuadrantes impacto–esfuerzo: victorias rápidas (impacto ≥ 3, esfuerzo < 3), proyectos estratégicos (≥ 3, ≥ 3), mejoras menores (< 3, < 3), requieren reevaluación (< 3, ≥ 3).

Reglas: el esfuerzo no reduce la prioridad de riesgos críticos; los criterios de incorporación de tecnologías inteligentes (D14 salvo controles) quedan limitados por debajo de los controles esenciales pendientes, salvo justificación registrada. La lista se ordena por prioridad y, cuando un criterio tiene prerrequisitos declarados en el banco que también presentan brecha, esos prerrequisitos se ubican antes (la tabla muestra la columna «Prerrequisitos»). Los cortes de la matriz impacto–esfuerzo se dibujan en 2,5 (regla ≥ 3).

## 13. Hoja de ruta

Las brechas se agrupan en plantillas de iniciativa (32). Dependencias: primero las explícitas de las plantillas; luego las derivadas de prerrequisitos entre criterios, solo si no generan ciclos. Fase = máx(fase sugerida, fases de las dependencias); una capacidad crítica en nivel 0–1 lleva la iniciativa a la fase 1. Dentro de cada fase, las dependencias se ubican antes y luego se ordena por prioridad.

Fechas: se calculan desde la **fecha de inicio de la hoja de ruta**, guardada en la evaluación y editable. Cada iniciativa dura lo que su fase (0–3, 3–6, 6–12 y 12–24 meses). Una iniciativa dependiente inicia cuando termina su prerrequisito; si ese momento cae fuera de su fase, pasa a la fase siguiente. Mover una iniciativa de fase reprograma también las que dependen de ella. Guardar fechas que hagan iniciar una dependiente antes de que termine su prerrequisito se rechaza; «Reprogramar según dependencias» recalcula todas las fechas.

## 14. Lecturas diferenciadas

Se calculan por serie. Las subdivisiones de dimensiones están en `LENS_DIMENSIONS` (`src/engine/constants.ts`) y forman una partición de las quince dimensiones:

| Lectura | Dimensiones | Cálculo |
|---|---|---|
| Madurez organizacional | D01–D06, D12, D13, D15 | Promedio ponderado por dimensión con los pesos de dimensión vigentes (igual que la global). |
| Madurez tecnológica | D07–D11, D14 | Igual. |
| Capacidades funcionales de sistemas | 13 criterios (`SYSTEM_CAPABILITY_IDS`) | Promedio ponderado por criterio. |
| Capacidades sustentadas con evidencia | Criterios validados con E2 o E3 | Promedio ponderado por criterio. |
| Posibles brechas normativas | Criterios con posible obligación o por validar | Conteo de los que están por debajo del mínimo recomendado. |

Las dimensiones sin datos se informan y no cuentan como cero, de modo que cada lectura puede reproducirse con las madureces por dimensión y sus pesos.

## 15. Componentes MGDA

El componente MGDA es un atributo de cada criterio (fuente de verdad). La familia de cada dimensión es su componente predominante; los resultados por componente cuentan los criterios por su propio componente.

## 16. Formatos

Madurez, brechas y prioridades con dos decimales (2,60); porcentajes con un decimal (91,6 %); coma decimal. Las funciones `fmtScore` y `fmtPct` (`src/utils/core.ts`) son la única fuente de formato.

## 17. Comparación histórica

Solo entre evaluaciones de la misma organización, sobre la intersección de criterios no personalizados. Se advierte cuando difieren las versiones del banco o las modalidades. No se generan benchmarks sectoriales.
