# Registro de cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/); versiones semánticas.

## [1.1.0] — 2026-11-20

Correcciones de la auditoría funcional. No cambia la arquitectura (sin servidor) ni el contenido del banco de criterios.

### Cálculos e indicadores (P0)
- C1 «Alcance sobre el banco» (antes «Cobertura del banco completo») y nuevo indicador «Cobertura del banco» (criterios con puntuación / 225) en Resultados, Resumen, narrativa, PDF y XLSX.
- C2 «Brecha frente a la meta» como promedio ponderado de máx(0, meta − nivel) por criterio puntuado, por serie.
- C3 Fórmula publicada de solidez con el acuerdo × 100 (escala 0–100).
- C4–C5 Cada vista recalcula sus indicadores sobre su serie o los marca «Solo percibida» / «Común a las vistas»; sello «Exploratorio» y «Calculada sobre D01–D05»; aviso de universos distintos en Comparación; la narrativa usa una sola serie.
- C6 «Validado sin evidencia suficiente» (nivel ≥ 3 con E0/E1) en la mesa, los resultados y los informes; advertencia al guardar; excluido de las capacidades sustentadas.
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
- Respuestas especiales con su efecto sobre la cobertura; códigos internos ocultos; nombres legibles de las reglas de contraste; pluralización real.
- Referentes: «Lo que este referente no cubre», «Limitaciones de la verificación», F27 marcado como agrupador, filtro por tipo y orden por código.
- Aviso de almacenamiento único; «Abrir entrevista».

### Visualización (P3)
- Paleta secuencial única 0→5 en barras, etiquetas, escala y mapas de calor (contraste AA).
- Línea de tiempo con fases neutras, leyenda, etiquetas completas y mes de inicio; mapa de dependencias propio (SVG) con encabezado por fase y conectores que no cruzan tarjetas.
- Matriz de brechas por severidad de columna; discrepancias agregadas con conteo; impacto–esfuerzo con cortes en 2,5 y desplazamiento determinista; matriz de riesgos con leyenda de bandas.
- Radar en sentido horario y alternativa de barras por familia; «Sin datos» explícito en las barras; cobertura coloreada por banda con umbrales rotulados; hallazgos MGDA con «Sin evaluar».
- Ajustes de maquetación (menú, Alcance, Mesa, tablas, Entrevistas, Referentes).
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
