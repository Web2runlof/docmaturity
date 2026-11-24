# Registro de cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/); versiones semánticas.

## [2.1.0] — 2026-11-24

Portada de nivel superior. Sin cambios en el modelo, el motor de cálculo, la base de datos local ni los formatos.

### Portada
- Video de fondo nuevo: escena 3D propia a 1280 × 720 con profundidad de campo real (planos cercanos y lejanos desenfocados como en una lente), luz más contenida y grano fino; 655 KB en WebM.
- Titular que entra palabra por palabra al cargar, botones con destello y efecto magnético.
- Vista del producto a doble densidad con borde luminoso giratorio, reflejo que la recorre, inclinación con el puntero y tres anotaciones con cifras reales del caso de demostración (madurez percibida 2,64, cobertura 97,9 %, solidez 66). Una prueba unitaria verifica que esas cifras coinciden con el motor.
- Método en tres pasos como narrativa fija: la imagen se queda en pantalla y cambia según el paso que se lee.
- Mosaico «Cifras que se pueden auditar» con recortes reales del tablero (validación, mapa de calor, radar, riesgos y hoja de ruta).
- Página oscura continua con paneles claros redondeados; cifras con degradado; plan recomendado con borde animado; preguntas frecuentes sobre fondo oscuro; la declaración y el acceso comparten el bloque final con video.
- Cursor «Arrastre» en el carrusel.
- Precarga de las fuentes del titular: el diseño ya no se mueve al llegar la fuente (CLS 0).

### Corregido
- Mapa de calor del tablero: los nombres de perfil largos («Seguridad de la información», «Responsables de procesos») se encimaban sobre la columna vecina. Ahora se parten por palabras y, en pantallas estrechas, se inclinan.

## [2.0.0] — 2026-11-21 (rama `redesign/identidad-v2`, sin publicar)

Rediseño visual y de experiencia. No cambian el modelo DIAM, el banco versionado, el motor de cálculo, el esquema de IndexedDB ni los formatos de importación y exportación. Sistema documentado en [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

### Identidad y sistema visual
- Tokens nuevos (Midnight, Deep Surface, Elevated, Mint, Violet, Soft White, Neutral) con remapeo de los nombres heredados: todas las pantallas adoptan la paleta sin reescribirse. La escala de madurez y los colores de riesgo no cambian.
- Isotipo, favicon e íconos de la PWA renovados; color de tema `#0B1020`.
- Tipografía: Inter Tight para titulares e Instrument Serif itálica para la expresión destacada de la portada (locales).
- Sistema de movimiento propio (`src/components/motion`): aparición al desplazarse, contadores, paralaje del héroe, luz ambiental, Ken Burns, progreso ligado al desplazamiento y transición de página. Todo se desactiva con movimiento reducido y se pausa fuera de la vista.
- Tres imágenes generativas originales en WebP local (1024 y 1920 px), diferidas salvo la del héroe; el precache incluye `webp` y `avif`.

### Portada
- Héroe a casi toda la altura con composición propia (madurez por dimensión, brecha por familia frente a la meta y trazabilidad de una brecha hasta su evidencia) y llamadas a la acción reales: «Iniciar diagnóstico», «Conocer la metodología» y «Explorar demostración».
- Cifras derivadas del banco con contador: 15 dimensiones, 225 criterios, 1.350 descriptores, 22 críticos, 4 modalidades y 29 referentes.
- Ciclo de trabajo en línea de tiempo (horizontal en escritorio, vertical en pantallas angostas), capacidades en bento asimétrico, vista de producto con componentes reales sobre datos ilustrativos (cargada de forma diferida), escalera del modelo, privacidad y autonomía, y cierre «Una organización no alcanza madurez por tener documentos. La demuestra en sus capacidades de gestión.».
- Encabezado transparente sobre el héroe que se vuelve sólido al desplazarse; menú completo desde 1280 px.
- Pie de página con «Diseñado y creado por: Sergio Gómez Flórez» enlazado a LinkedIn (pestaña nueva, `noopener noreferrer`).
- Páginas informativas con banda de entrada oscura.

### Portada, segunda versión (tras la revisión del 23 de noviembre)
- Héroe con video de fondo propio desenfocado (escena 3D original, 12 s en bucle, 247 KB en WebM) y contenido encima; póster con movimiento reducido o ahorro de datos.
- Titular con serif itálica, palabra rotativa («Para entidades públicas, empresas privadas…») y vista real del producto que se endereza al desplazarse.
- Navegación flotante en cápsula, marquesina de referentes, cifras grandes, método en tres pasos con renders 3D originales, carrusel de seis pantallas reales (arrastre, teclado, avance automático con pausa y Ken Burns), capacidades con luz que sigue al puntero, modalidades como tabla de planes, privacidad con render, declaración que se ilumina al desplazarse y cierre con video.
- Pie con la marca a gran escala; se conserva «Diseñado y creado por: Sergio Gómez Flórez».
- Los medios de la portada se guardan en caché al verse y no engrosan el precache de la PWA.

### Aplicación
- Navegación lateral oscura agrupada (Trabajo, Conocimiento, Sistema) con indicador activo, tarjeta de evaluación activa con avance del ciclo y siguiente paso; «Evaluaciones» cede el resaltado dentro de una evaluación.
- Encabezado con migas de pan y «Siguiente paso» calculado con los datos locales (alcance → participantes → entrevistas → evidencias → validación → hoja de ruta → informes).
- Menú móvil como diálogo modal con cierre por Escape y retorno del foco; transición discreta entre rutas.
- Inicio como panorama: indicadores, evaluaciones en curso con avance y siguiente paso, finalizadas, actividad reciente del registro local y aviso de respaldo vencido.
- Nueva evaluación en dos pasos con tarjetas de modalidad comparables y resumen fijo.
- Formulario de organización con bloques numerados e índice fijo.
- Cuestionario en modo enfocado: encabezado oscuro, selección inequívoca, foco visible en los niveles y respuestas especiales agrupadas con estado presionado.
- Mesa de validación y evidencias con estados de icono y texto (`StatusBadge`).
- Informes agrupados: Informes · Datos y análisis · Intercambio y respaldo.
- Laboratorio académico con acento violeta.

### Accesibilidad y calidad
- Enlaces con aspecto de botón sin botones anidados (`buttonClass`).
- Rejillas de dos columnas con `minmax(0, 1fr)`: sin desbordamiento horizontal en 24 rutas a 360, 768, 1024 y 1440 px.
- Versión de la aplicación unificada en 2.0.0 (los paquetes declaraban 1.0.0).

### Pruebas
- E2E actualizadas al nuevo titular y cuatro pruebas nuevas: video de fondo, marquesina y carrusel con pausa; autoría del pie de página, cifras del banco, rutas de las llamadas a la acción, movimiento reducido y carga diferida de la vista de producto; siguiente paso y resaltado único de la navegación; exportación del paquete de evaluación e importación en otro navegador.

## [1.1.0] — 2026-11-20

Correcciones de la auditoría funcional. No cambia la arquitectura (sin servidor) ni el contenido del banco de criterios.

### Cálculos e indicadores (P0)
- C1 «Alcance sobre el banco» (antes «Cobertura del banco completo») y nuevo indicador «Cobertura del banco» (criterios con puntuación / 225) en Resultados, Resumen, narrativa, PDF y XLSX.
- C2 «Brecha frente a la meta» como promedio ponderado de máx(0, meta − nivel) por criterio puntuado, por serie.
- C3 Fórmula publicada de solidez con el acuerdo × 100 (escala 0–100), también en los informes PDF (tarjeta del informe ejecutivo y tabla «Indicadores y fórmulas» del informe técnico).
- C4–C5 Cada vista recalcula sus indicadores sobre su serie o los marca «Solo percibida» / «Común a las vistas»; sello «Exploratorio» y «Calculada sobre D01–D05»; aviso de universos distintos en Comparación; la narrativa usa una sola serie.
- C6 «Validado sin evidencia suficiente» (nivel ≥ 3 con E0/E1) en la mesa, los resultados y los informes (incluida una tarjeta en el informe ejecutivo); advertencia al guardar; excluido de las capacidades sustentadas.
- C7 Radar de comparación solo con dimensiones con datos en ambas series.
- C8 Lecturas organizacional y tecnológica en una constante compartida (partición de las 15 dimensiones), reproducibles y documentadas.
- C9 Componente MGDA por criterio como fuente de verdad; tabla de criterios por componente en Metodología.
- C10–C11 Fechas de la hoja de ruta desde una fecha de inicio editable; las dependientes inician cuando termina su prerrequisito; reprogramación; columna de prerrequisitos y texto corregido en la priorización.
- C12 «Incumplimiento normativo potencial» solo con posible obligación; en otro caso «Debilidad de control».
- C13 La narrativa de riesgos usa la valoración registrada.
- C14 Con criterios validados la evaluación pasa a «En validación»; finalizar exige confirmación con la lista de pendientes.
- C15 Etiqueta de modalidad única («Diagnóstico personalizado»).

### Navegación (P1)
- R1 «Explorar demostración» abre la demostración existente; fusión de demostraciones duplicadas.
- R2–R3 Casos simulados visibles en Inicio; pestañas con contadores en Organizaciones y Evaluaciones; «Abrir caso» en el Laboratorio.
- R4 El bloque «Evaluación activa» se mantiene en todas las rutas de la aplicación.
- R5 Página 404.
- R6 Explicación del origen compartido y despliegue en dominio propio con `CUSTOM_DOMAIN` (genera `dist/CNAME`).
- R7 Rutas reales enlazadas en «Cómo funciona».

### Textos (P2)
- Trato de «usted» en toda la interfaz, incluida la portada; tagline y nombre del modelo en español; «tablero» en lugar de «dashboard»; «meta» como término único.
- Bandas de cobertura de la metodología en la portada; brechas de ejemplo con códigos y nombres reales del banco; ciclo de seis momentos idéntico en portada, héroe y «Cómo funciona».
- Respuestas especiales con su efecto sobre la cobertura; códigos internos ocultos (verificado con un barrido automático del texto visible de 29 pantallas y de los PDF); nombres legibles de las reglas de contraste; pluralización real.
- Referentes: «Lo que este referente no cubre», «Limitaciones de la verificación», F27 marcado como agrupador, filtro por tipo y orden por código.
- Aviso de almacenamiento único; «Abrir entrevista».

### Visualización (P3)
- Paleta secuencial única 0→5 en barras, etiquetas, escala y mapas de calor (contraste AA).
- Línea de tiempo con fases neutras, leyenda, etiquetas completas y mes de inicio; mapa de dependencias propio (SVG) con encabezado por fase y conectores que no cruzan tarjetas.
- Matriz de brechas por severidad de columna; discrepancias agregadas con conteo; impacto–esfuerzo con cortes en 2,5 y desplazamiento determinista; matriz de riesgos con leyenda de bandas.
- Radar en sentido horario y alternativa de barras por familia; «Sin datos» explícito en las barras; cobertura coloreada por banda con umbrales rotulados; hallazgos MGDA con «Sin evaluar».
- Ajustes de maquetación (menú, Alcance, Mesa, tablas, Entrevistas, Referentes) y en los PDF: las notas de las tarjetas se ajustan al ancho y los títulos no quedan separados de su gráfico o tabla.
- Héroe de la portada rediseñado: fondo oscuro, tarjetas de vidrio con datos ilustrativos y nombres reales del modelo.

### Demostración (V14)
- Entrevista distribuida importada por el flujo real de archivos (con hash), evidencias E2/E3 en todas las dimensiones (soporte > 20 %), impacto y esfuerzo valorados en algunas iniciativas e iniciativa en la fase 4.

## [1.0.0] — 2026-11-20

Primera versión.

### Metodología
- Modelo DIAM v1.0 con 15 dimensiones y 225 criterios originales; 1.350 descriptores de nivel y 1.350 recomendaciones por nivel.
- 22 criterios críticos, 30 reglas de contradicción, 15 riesgos tipo, 32 plantillas de iniciativa, 15 perfiles organizacionales y glosario de 80 términos.
- Registro de 29 referentes con estado de verificación y matriz de trazabilidad.
- Generador y validador del banco (`npm run bank`) con exportación JSON y CSV.

### Aplicación
- Organizaciones con caracterización documental, tecnológica y jurídica; exportación JSON.
- Evaluaciones rápidas, estándar, profesionales y personalizadas; metas, ponderaciones, umbrales, exclusiones y preguntas propias.
- Entrevistas dirigidas y distribuidas con paquetes verificados por SHA-256, revisiones y detección de duplicados; modo entrevistado sin conexión.
- Evidencias E0–E3 con adjuntos locales.
- Mesa de validación con alertas y validación justificada.
- Dashboard de resultados con 15 visualizaciones y tablas accesibles; lecturas diferenciadas; comparación histórica.
- Brechas, riesgos, priorización explicada y hoja de ruta en cuatro fases con dependencias.
- Informes PDF ejecutivo y técnico, XLSX de 15 hojas, paquetes JSON, respaldo completo y cifrado AES-GCM.
- Narrativa diagnóstica por reglas y asistente de IA opcional basado en prompts.
- Laboratorio académico con cinco casos ficticios, temporizador ajustable, insignias y entregable PDF.
- Landing editorial y páginas públicas de metodología, referentes y privacidad.
- PWA sin conexión, CSP restrictiva, GitHub Actions para Pages.
