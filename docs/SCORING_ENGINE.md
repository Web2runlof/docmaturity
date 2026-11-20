# Motor de calificación

Implementado en `src/engine/` como funciones puras y deterministas. El orquestador `analyzeAssessment(bundle)` (`src/engine/analyze.ts`) produce todos los resultados a partir de los datos locales. Las pruebas en `tests/unit/engine.test.ts` cubren los casos matemáticos obligatorios.

## 1. Universo de criterios

| Conjunto | Definición |
|---|---|
| Alcance | Criterios seleccionados por la modalidad o la personalización, menos exclusiones justificadas. |
| Aplicables | Alcance menos criterios con `NO_APLICA_VALIDADO` (decisión del evaluador con justificación y revisor). |
| Con puntuación | Aplicables con al menos una respuesta numérica de un participante. |

Respuestas especiales: `NO_SABE`, `NO_APLICA_PROPUESTO`, `OMITIDA`, `PENDIENTE` y `NO_ASIGNADA` **no se convierten en cero**: no entran al cálculo y reducen la cobertura. Solo `NO_APLICA_VALIDADO` reduce el denominador.

## 2. Consolidación por criterio

1. Se toma una respuesta por participante único (la más reciente si hay varias entrevistas del mismo participante).
2. Valor preliminar = **mediana** de las respuestas numéricas.
3. Estadísticos: n, media, mínimo, máximo, rango, desviación estándar (n ≥ 2), número de perfiles y distribución por nivel.
4. **Acuerdo** = 1 − rango / 5 (solo con n ≥ 2).
5. **Discrepancia**: rango ≥ umbral (por defecto 2).

Caso de prueba: respuestas 4, 3, 2, 1 → mediana 2,5; media 2,5; rango 3; acuerdo 0,4; alerta de discrepancia. Una preliminar de 2,5 no equivale a un nivel 3 validado.

## 3. Valor validado y valor actual

- Valor validado = nivel entero 0–5 registrado por el evaluador en la mesa de validación, con justificación obligatoria. No modifica las respuestas.
- Valor actual = validado si existe; en otro caso, preliminar.

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

Etiquetas: «Madurez preliminar del alcance evaluado», «Madurez validada del alcance evaluado» y «Madurez integral validada». Esta última solo se usa en la vista validada cuando se incluyen las 15 dimensiones, el alcance cubre el banco completo y la cobertura de validación alcanza el umbral de cobertura alta (90 %).

## 6. Cobertura

```
Cobertura = criterios aplicables con puntuación / criterios aplicables × 100
CoberturaValidación = criterios aplicables validados / criterios aplicables × 100
CoberturaPonderada = Σ peso (con puntuación) / Σ peso (aplicables) × 100
ScopeCoverage = criterios aplicables del alcance / 225 × 100
```

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
Índice orientativo; no es una confianza estadística. Si falta alguno de los componentes (por ejemplo, un único entrevistado sin acuerdo calculable) no se calcula y se informa qué falta.

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
Brecha = máx(0, meta − valor actual)
```
Meta por defecto 3, configurable por dimensión y por criterio. Sin valor actual, la recomendación es «evaluar la capacidad». Si la meta es inferior al nivel actual, el criterio se muestra como superado.

## 11. Riesgos

`Valor = probabilidad (1–5) × impacto (1–5)`. Bandas iniciales: 1–4 bajo, 5–9 moderado, 10–16 alto, 17–25 crítico. Los riesgos se sugieren desde brechas en criterios disparadores, pero la probabilidad y el impacto los asigna el evaluador.

## 12. Priorización

```
Prioridad = 0,30·Brecha + 0,25·Impacto + 0,20·Criticidad + 0,15·Urgencia + 0,10·Habilitador
```
Factores en escala 0–5. Brecha y criticidad se calculan; impacto, urgencia, habilitador y esfuerzo pueden valorarse o se estiman (y se marcan como estimación). Cuadrantes impacto–esfuerzo: victorias rápidas (impacto ≥ 3, esfuerzo < 3), proyectos estratégicos (≥ 3, ≥ 3), mejoras menores (< 3, < 3), requieren reevaluación (< 3, ≥ 3).

Reglas: el esfuerzo no reduce la prioridad de riesgos críticos; los criterios de incorporación de tecnologías inteligentes (D14 salvo controles) quedan limitados por debajo de los controles esenciales pendientes, salvo justificación registrada; el orden respeta prerrequisitos.

## 13. Hoja de ruta

Las brechas se agrupan en plantillas de iniciativa (32). Dependencias: primero las explícitas de las plantillas; luego las derivadas de prerrequisitos entre criterios, solo si no generan ciclos. Fase = máx(fase sugerida, fases de las dependencias); una capacidad crítica en nivel 0–1 lleva la iniciativa a la fase 1. Dentro de cada fase, las dependencias se ubican antes y luego se ordena por prioridad.

## 14. Comparación histórica

Solo entre evaluaciones de la misma organización, sobre la intersección de criterios no personalizados. Se advierte cuando difieren las versiones del banco o las modalidades. No se generan benchmarks sectoriales.
