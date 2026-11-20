# Limitaciones conocidas y alcance pendiente

Registro explícito de lo que la versión 1.0.0 no hace o hace de forma parcial. Ninguna de estas funciones se presenta en la interfaz como capacidad operativa.

## 1. Verificación de fuentes

Durante el desarrollo no fue posible abrir directamente las páginas oficiales ni los artículos académicos: la herramienta de consulta de páginas web requería una aprobación que no pudo obtenerse en la sesión. La verificación se hizo con resultados de búsqueda y resúmenes oficiales. Estado actual de los 29 referentes:

| Estado | Referentes |
|---|---|
| Verificado (1) | F05 |
| Verificado parcialmente (5) | F01, F02, F11, F14, A02 |
| Referencia conceptual (10) | F04, F18, F19, F20, F21, F22, F23, F24, F25, F26 |
| No verificado (13) | F03, F06, F07, F08, F09, F10, F12, F13, F15, F16, F17, F27, A01 |

Pendiente: confirmar versiones vigentes, URL y alcance de los referentes no verificados, en especial las partes vigentes de ISO 16175 e ISO 23081, la versión de ISO 14721 (OAIS) y el contenido del artículo A01, del cual no se atribuyen hallazgos. Las asociaciones entre criterios y referentes son conceptuales y no se han contrastado cláusula por cláusula.

## 2. Datos y sincronización

- No hay sincronización entre dispositivos ni trabajo colaborativo simultáneo: el intercambio es por archivos.
- IndexedDB no se cifra por la aplicación; la protección depende del dispositivo y del perfil del navegador.
- El navegador puede borrar el almacenamiento (por ejemplo, Safari tras periodos sin uso o al liberar espacio). La solicitud de almacenamiento persistente no garantiza su conservación.
- **Restaurar un respaldo reemplaza todos los datos locales**; no existe restauración selectiva ni fusión de respaldos.
- Los paquetes de evaluación (`.dm-assessment.json`) **no incluyen los adjuntos** de las evidencias; solo el respaldo completo los incluye.
- La exportación de organización (`.dm-organization.json`) no tiene importación dedicada; para trasladar una organización con sus evaluaciones use el paquete de evaluación o el respaldo.

## 3. Identidad y autenticidad

- No hay autenticación ni control de acceso. Los modos evaluador y entrevistado son modos de interfaz.
- El hash SHA-256 detecta alteraciones, pero **no es una firma digital** ni acredita la identidad de quien respondió.

## 4. Inteligencia artificial

- No hay proveedor de IA conectado. El asistente solo genera prompts; la CSP de producción (`connect-src 'self'`) bloquea cualquier conexión externa.
- Una instalación propia que quiera un proveedor automático debe implementar `AIProvider` con un intermediario autenticado propio y ajustar la CSP. No se deben incluir claves en el frontend.

## 5. Metodología

- Pesos, factores de evidencia, umbrales y fórmula de solidez son convenciones del modelo, no derivadas estadísticamente; el banco no ha sido validado psicométricamente ni por pares externos.
- El carácter `sectorial` existe en el modelo, pero ningún criterio de la versión 1.0.0 lo usa; la regulación sectorial se registra como texto libre y no activa reglas específicas.
- La aplicabilidad normativa sugerida requiere validación jurídica; la aplicación no emite conceptos jurídicos.
- No hay benchmarks sectoriales ni percentiles nacionales; la comparación histórica se limita a evaluaciones de la misma organización.

## 6. Informes

- Los PDF usan la fuente estándar Helvetica: los caracteres del español se reproducen correctamente, pero símbolos fuera de Latin-1 se sustituyen (por ejemplo, «≥» por «>=»).
- El libro XLSX no incluye gráficos nativos de Excel (ExcelJS no los genera); incluye tablas, filtros, encabezados fijos, formato condicional y fórmulas.
- Los textos de IA aprobados se guardan en la evaluación y se exportan en el paquete JSON, pero no se insertan automáticamente en los PDF.

## 6 bis. Resultados y demostración

- La serie validada de la demostración se calcula solo sobre D01–D05 (24 criterios validados) y por eso se marca «Exploratorio»; es intencional para mostrar cómo se informan universos distintos.
- El orden de prioridades respeta solo los prerrequisitos declarados en el banco; varios criterios (por ejemplo, D11-Q07) no declaran prerrequisitos y se ordenan únicamente por su prioridad.
- El mapa de dependencias usa un canal superior para las relaciones que saltan fases; con muchas relaciones de ese tipo las líneas del canal pueden superponerse entre sí (nunca sobre las tarjetas).
- Con el sitio en `*.github.io`, otras páginas del mismo origen podrían leer los datos locales; use un dominio propio para información real.

## 7. Accesibilidad

- Se aplicaron prácticas WCAG 2.2 AA (enlace de salto, foco visible, etiquetas, tablas alternativas a cada gráfico, estados con texto además de color, movimiento reducido) y se probaron con teclado y en móvil, pero no se realizó una auditoría formal con lectores de pantalla.
- Los gráficos se dibujan en canvas; su contenido accesible está en la tabla alternativa y en el resumen textual.

## 8. Plataforma y pruebas

- Las pruebas end-to-end se ejecutaron en Chromium (escritorio y emulación Pixel 7). Firefox y Safari no se probaron automáticamente.
- La primera visita requiere conexión; después la aplicación funciona sin conexión.
- El *chunk* principal pesa ≈ 1 MB (255 KB comprimido) porque incluye el banco completo.

## 9. Integraciones fuera de alcance

Moodle u otros LMS (el entregable se carga manualmente), sistemas de gestión documental, directorios corporativos y correo. Ninguna requiere credenciales en esta versión porque no existen.
