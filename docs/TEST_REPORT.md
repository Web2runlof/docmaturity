# Informe de pruebas

Ejecución del 20 de noviembre de 2026 sobre la versión 1.0.0 (Node.js 22.23, Chromium/Chrome 153 en Linux).

## 1. Resumen

| Verificación | Comando | Resultado |
|---|---|---|
| Lint | `npm run lint` | Sin errores ni advertencias |
| Tipos | `npm run typecheck` | Sin errores (TypeScript estricto) |
| Banco | `npm run bank` | 15 dimensiones, 225 criterios, 1.350 descriptores únicos, 22 críticos |
| Unitarias e integración | `npm run test` | **73 de 73 aprobadas** (5 archivos) |
| Build de producción | `npm run build` | Correcto; 107 recursos precargados por el service worker (≈ 4,4 MB) |
| End-to-end | `npm run test:e2e` | **8 de 8 aprobadas** (7 escritorio 1440 × 900 y 1 móvil Pixel 7) |

## 2. Cobertura de los 60 casos obligatorios

U = prueba unitaria o de integración (Vitest, `tests/unit`); E = prueba end-to-end (Playwright, `tests/e2e`).

| # | Caso | Prueba |
|---|---|---|
| 01 | Crear una organización | U `persistence` · E `01/04/49` |
| 02 | Dos organizaciones sin mezclar información | U `persistence 01/02/03` |
| 03 | Evaluaciones independientes | U `persistence 01/02/03` |
| 04 | Persistencia tras recargar | U `persistence 04/05` · E `01/04/49` (recarga) |
| 05 | Persistencia tras cerrar y reabrir | U `persistence 04/05` (cierre y reapertura de la base) |
| 06 | Rápido de 30 criterios | U `bank 06` |
| 07 | Estándar de 90 criterios | U `bank 07` |
| 08 | Profesional de 225 criterios | U `bank 08` |
| 09 | Unicidad de identificadores | U `bank 09` |
| 10 | Seis descriptores específicos | U `bank 10` |
| 11 | Fuentes por criterio | U `bank 11` |
| 12 | Recomendaciones por nivel | U `bank 12` |
| 13 | Saltar pregunta | U `persistence 13–18` · E `19–24` |
| 14 | Saltar sección | U `persistence 13–18` |
| 15 | Regresar a una pregunta | U `persistence 13–18` · E `19–24` |
| 16 | Cambiar respuesta | U `persistence 13–18` · E `19–24` |
| 17 | Guardar entrevista incompleta | U `persistence 13–18` · E `19–24` |
| 18 | Reanudar entrevista | U `persistence 13–18` · E `19–24` (recarga) |
| 19 | Exportar asignación | U `persistence 19–23` · E `19–24` (descarga real) |
| 20 | Importar asignación en otro contexto | E `19–24` (nuevo contexto de navegador sin datos) |
| 21 | Responder entrevista distribuida | U `persistence 19–23` · E `19–24` |
| 22 | Exportar entrevista | U `persistence 19–23` · E `19–24` |
| 23 | Importar entrevista al diagnóstico original | U `persistence 19–23` · E `19–24` |
| 24 | Importación duplicada | U `persistence 24` · E `19–24` |
| 25 | Conflicto de revisiones | U `persistence 25` |
| 26 | Rechazar archivos incompatibles | U `persistence 26` · U `security 26` |
| 27 | Rechazar valores inválidos | U `persistence 27` · U `engine 27` |
| 28 | Mediana | U `engine 28` |
| 29 | Cobertura | U `engine 29/32` (caso 62,5 % exploratorio) |
| 30 | NO_SABE no es cero | U `engine 30/31` |
| 31 | OMITIDA no es cero | U `engine 30/31` |
| 32 | Solo NO_APLICA_VALIDADO sale del denominador | U `engine 29/32` |
| 33 | NO_ASIGNADA fuera de lo esperado | U `engine 33` |
| 34 | Ponderaciones | U `engine 34` |
| 35 | División por cero | U `engine 35` |
| 36 | Discrepancias | U `engine` (4, 3, 2, 1 → acuerdo 0,4 y alerta) |
| 37 | Reglas de contradicción | U `engine 37` · U `exports` (contradicciones deliberadas de los casos) |
| 38 | Alertas de críticos | U `engine 38` |
| 39 | Validar sin alterar respuestas | U `engine 39` |
| 40 | Brechas | U `engine 40` |
| 41 | Recomendaciones | U `engine 41` |
| 42 | Editar hoja de ruta | U `engine 42` · U `security` (dependencias sin ciclos) · E `42` |
| 43 | Exportar PDF | U `exports 43` · E `43/44/45` (descarga y firma `%PDF`) |
| 44 | Exportar XLSX | U `exports 44` (15 hojas, filtros, encabezados fijos, fórmulas) · E `43/44/45` |
| 45 | Exportar respaldo | U `persistence 45/46` · E `43/44/45` |
| 46 | Restaurar respaldo | U `persistence 45/46` |
| 47 | Cifrar y descifrar | U `persistence 47/48` |
| 48 | Contraseña incorrecta | U `persistence 47/48` |
| 49 | HTML malicioso | U `security 49` · E `01/04/49` (nombre con `<img onerror>` no se interpreta) |
| 50 | Inyección de fórmulas | U `persistence 50` |
| 51 | Comparar evaluaciones compatibles | U `exports 51/52` |
| 52 | Advertir incompatibilidades | U `exports 51/52` |
| 53 | Gráficos sin datos | U `engine 53` · E `43/44/45` (dimensiones sin datos omitidas del radar, nunca como cero) |
| 54 | Experiencia móvil | E `mobile 54` (menú, sin desbordamiento horizontal) |
| 55 | Navegación por teclado | E `55` (enlace de salto, foco en el contenido, diálogo con Enter y Escape) |
| 56 | Funcionamiento offline | E `56` (service worker; recarga y navegación sin red) |
| 57 | Límites de almacenamiento | U `security 57` (error de cuota y tamaño máximo de archivos) |
| 58 | Build de producción | `npm run build` (sección 1) |
| 59 | Rutas en GitHub Pages | E `59/60` (11 rutas bajo `/docmaturity/#/…`, ruta inexistente) |
| 60 | Sin envíos externos | E `59/60` y `19–24` (cero peticiones fuera del origen; CSP `connect-src 'self'`) |

## 3. Casos matemáticos obligatorios

- **Cobertura**: 10 seleccionados, 2 no aplica validados, 5 numéricos, 3 pendientes u omitidos → aplicables 8, cobertura 62,5 %, banda exploratoria. Aprobado.
- **Consolidación**: respuestas 4, 3, 2, 1 → mediana 2,5; media 2,5; rango 3; acuerdo 0,4; alerta de discrepancia; la preliminar 2,5 no se presenta como nivel 3 validado. Aprobado.

## 4. Otras pruebas relevantes

- Banco: esquema Zod, preguntas no duplicadas, aclaraciones y evidencias en todos los criterios, pesos que suman 100, glosario ≥ 60, ≥ 25 reglas de contradicción, ≥ 30 plantillas de iniciativa con cobertura completa, 15 riesgos, nivel 5 de D14 sin exigir IA.
- Motor: participantes duplicados no cuentan como observaciones independientes; soporte de evidencias y cobertura de verificación son indicadores distintos; la solidez no se calcula con un único entrevistado; IA no priorizada sobre controles esenciales sin justificación.
- Aplicabilidad: no se clasifica como sujeto obligado por nombre o sector; las sugerencias de no aplicabilidad no excluyen criterios por sí solas.
- Datos simulados: cada caso genera entrevistas, evidencias y las contradicciones declaradas; la demostración se elimina sin afectar otros datos.
- IA: el prompt anonimizado no contiene nombre de la organización ni códigos de participantes; se advierten afirmaciones de certificación en textos externos.
- Consistencia: eliminación de organizaciones sin registros huérfanos; reapertura con instantánea; importación de una evaluación existente como copia.

## 5. Defectos encontrados y corregidos durante la verificación

| Defecto | Corrección |
|---|---|
| Guardar una organización, evaluación, riesgo, iniciativa o evidencia no navegaba ni cerraba el diálogo porque las funciones sin valor de retorno se interpretaban como fallo. | Nueva función `attemptOk` que devuelve verdadero o falso según el resultado. |
| Las asignaciones nuevas no se guardaban desde la interfaz (un `id` indefinido sobrescribía el generado). | `saveAssignment` separa el identificador antes de construir el registro. |
| El radar dibujaba hacia el centro las dimensiones sin datos, como si fueran cero. | Los ejes sin datos se omiten y las series incompletas se dibujan solo con puntos. |
| El enlace «Saltar al contenido» cambiaba la ruta con `HashRouter`. | Componente `SkipLink` que mueve el foco al contenido principal. |
| Dependencias circulares posibles entre iniciativas derivadas de prerrequisitos. | Las dependencias explícitas prevalecen y las derivadas solo se agregan si no generan ciclos; orden topológico por fase. |
| Celdas sin datos invisibles en los mapas de calor; etiquetas superpuestas. | Serie específica para celdas sin datos y etiquetas con ajuste de línea. |

## 6. Cómo reproducir

```bash
npm ci
npm run lint && npm run typecheck && npm run test
npm run build
npx playwright install chromium   # o PLAYWRIGHT_CHROME_PATH=/ruta/a/chrome
npm run test:e2e
```
