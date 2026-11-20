# Reglas de aplicabilidad

Implementadas en `src/engine/applicability/index.ts`. DOCMATURITY distingue dos preguntas diferentes:

1. **¿El criterio es pertinente para esta organización?** (aplicabilidad operativa: si no hay archivos físicos, los criterios de depósitos pueden no aplicar).
2. **¿El criterio corresponde a una obligación jurídica?** (aplicabilidad normativa).

Ninguna de las dos se decide automáticamente.

## 1. Aplicabilidad operativa

Cada criterio puede tener condiciones (`applicabilityRules`):

| Condición | Campo de la caracterización | Sugerencia cuando el valor es «no» |
|---|---|---|
| `fisico` | `hasPhysical` | La organización no conserva archivos físicos. |
| `electronico` | `hasNativeDigital` | No produce documentos nativos digitales. |
| `firma` | `eSignature` | No usa firma electrónica ni digital. |
| `nube` | `cloud` | No usa servicios en la nube. |
| `terceros` | `outsourcedCustody` | No terceriza custodia ni procesamiento documental. |
| `ia` | `aiTools` | No usa automatización ni IA (requiere decisión documentada). |
| `hist` | `historicalValue` (condiciones jurídicas) | No hay documentos con valor histórico o patrimonial. |
| `datos_personales` | `personalData` | Se usa en la aplicabilidad normativa. |

Distribución en el banco: electrónico 44, físico 14, terceros 5, IA 5, valor histórico 2, firma 1, nube 1, datos personales 1.

Flujo:
1. La aplicación **sugiere** la no aplicabilidad en el alcance y en la mesa de validación.
2. Un participante puede **proponer** «no aplica» (`NO_APLICA_PROPUESTO`), que no se cuenta como cero ni reduce el denominador.
3. Solo el evaluador puede **validar** la no aplicabilidad con justificación y revisor (`NO_APLICA_VALIDADO`). Esa decisión retira el criterio del denominador y queda en la auditoría.
4. Si hay propuestas de «no aplica» y también respuestas numéricas, se genera la alerta «no aplica controvertido».

## 2. Aplicabilidad normativa

Cada criterio tiene un carácter (`legalApplicability`): `obligacion_publica` (20 criterios), `obligacion_general` (1), `sectorial` (0 en la versión 1.0.0) o `buena_practica` (204).

### Sujeto público

`isPublicSubject` **no clasifica por nombre ni por sector**. Devuelve:

- **Sí**, si el perfil es de naturaleza pública (entidad nacional, territorial o empresa industrial y comercial del Estado) o si el evaluador indicó que la organización ejerce funciones públicas, administra recursos públicos o presta servicios públicos.
- **No**, si el perfil es privado y las tres condiciones están respondidas sin «sí», o si las tres son «no».
- **Desconocido**, en cualquier otro caso.

### Estado por criterio

| Carácter | Resultado |
|---|---|
| `obligacion_publica` | Sujeto público → **posible obligación aplicable**; no público → **buena práctica**; desconocido → **por validar**. |
| `obligacion_general` | Si exige datos personales y el evaluador indicó que no se tratan → buena práctica; si el tratamiento es desconocido → por validar; en otro caso → posible obligación aplicable. |
| `sectorial` | Con regulación sectorial declarada → por validar; sin ella → buena práctica. |
| `buena_practica` | Referente orientativo; no constituye obligación jurídica. |

El evaluador puede sobrescribir el estado de cualquier criterio en el panel de aplicabilidad jurídica del alcance; la decisión se registra.

### Posibles brechas normativas

Un criterio con estado distinto de «buena práctica» cuyo nivel actual es inferior a su nivel mínimo recomendado se informa como **«Posible brecha normativa que requiere validación»**. La aplicación no afirma incumplimientos ni sustituye el análisis jurídico.

## 3. Perfiles organizacionales

15 perfiles: entidad pública nacional, entidad pública territorial, empresa industrial y comercial del Estado, empresa privada que ejerce funciones públicas, empresa privada prestadora de servicios públicos, empresa privada que administra recursos públicos, empresa privada ordinaria, institución de educación superior, organización de salud, organización financiera, organización industrial, organización comercial, organización de servicios, organización sin ánimo de lucro y otro. Cada perfil define una naturaleza pública (sí, no, depende), valores iniciales de las condiciones jurídicas y consideraciones sectoriales para las recomendaciones.
