# Sistema visual DOCMATURITY 2.0

Documento de referencia del rediseño visual y de experiencia (rama `redesign/identidad-v2`). El rediseño cambia la presentación, la jerarquía y la navegación; **no** cambia el modelo DIAM, el banco versionado, el motor de cálculo, el esquema de IndexedDB ni los formatos de importación y exportación.

Fuente única de los tokens: `src/styles/index.css` (bloque `@theme`). Los componentes no definen colores sueltos salvo los de las visualizaciones ilustrativas de la portada, que reutilizan los mismos valores.

## 1. Dirección

| Referente | Peso | Qué se reinterpreta (sin copiar estructura, textos ni recursos) |
|---|---|---|
| Ashton | 35 % | Profundidad oscura, luz ambiental muy lenta, capas tecnológicas flotantes y composición de vidrio en el héroe. |
| Youth | 20 % | Ritmo editorial: titulares amplios, imágenes de fondo a sangre con Ken Burns, aparición escalonada al desplazarse. |
| Rapidhost | 45 % | Carbón con verde luminoso, tarjetas SaaS, cifras destacadas, bloques modulares y un bento asimétrico de capacidades. |

Principios:

- **Navegación oscura, lectura clara.** El sitio público y la navegación de la aplicación usan la base Midnight; las pantallas de trabajo leen sobre superficies claras.
- **El menta es la acción.** Solo los botones principales, los indicadores activos y los acentos de avance usan menta. El violeta se reserva para la iluminación ambiental, el laboratorio académico y la capa de evidencias.
- **Sin decoración gratuita.** Nada de emojis, iconos sin función, degradados indiscriminados ni sombras en todo. Los iconos acompañan una etiqueta; las sombras se limitan a paneles flotantes.
- **Diagramas con estructura propia.** Escalera del modelo, carriles de entrevistas, matriz de riesgos, carriles de fases. No se usan diagramas radiales tipo mapa mental ni filas de flechas tipo chevron.

## 2. Color

| Token | Valor | Uso |
|---|---|---|
| `midnight` | `#0B1020` | Fondo del sitio público, barra lateral, encabezado del cuestionario, superficies de resumen. |
| `surface` | `#121A2A` | Tarjetas sobre fondo oscuro. |
| `elevated` | `#1A2536` | Tarjetas destacadas sobre fondo oscuro. |
| `edge` | `#26334A` | Bordes sobre fondo oscuro. |
| `fog` | `#AAB6C7` | Texto secundario sobre fondo oscuro (≈ 9:1 sobre Midnight). |
| `mint` | `#35D9A4` | Acción principal (botón menta con texto Midnight ≈ 10:1). |
| `mint-strong` | `#0B7A58` | Texto y enlaces de acento sobre fondo claro (≈ 5,3:1 sobre blanco). |
| `mint-soft` | `#E7FAF2` | Fondo de selección. |
| `violet` / `violet-strong` | `#8E78F7` / `#5B45D6` | Ambiente y laboratorio; texto violeta sobre claro ≈ 6,4:1. |
| `soft` / `neutral` / `canvas` | `#F7F9FC` / `#E9EEF4` / `#F4F7FB` | Superficies claras de trabajo. |
| `ink` / `muted` | `#172033` / `#5B6B82` | Texto principal y secundario sobre claro (muted ≈ 5,2:1 sobre canvas). |

Los nombres heredados (`navy`, `teal`, `petrol`, `line`, `ink`, `muted`, `canvas`, escala `teal-50…700`) se **remapearon** a la nueva identidad: todas las pantallas heredan la paleta sin reescribirse.

La **escala de madurez 0–5** (`lv0…lv5`, `LEVEL_COLORS`) y los colores de riesgo y de estado **no cambian**: son datos, no decoración, y deben coincidir con informes y gráficos.

## 3. Tipografía

- **Inter Tight** (500, 600, 700) para titulares y cifras: `font-display`, con interletrado de −0,035 a −0,045 em en los titulares grandes.
- **Instrument Serif** itálica para la expresión destacada de cada titular de la portada («lo que sigue», «decisión», «aquí»): `font-serif`. Es el rasgo editorial de la identidad; no se usa en la aplicación de trabajo.
- **Inter** (400, 500, 600) para lectura e interfaz: `font-sans`.
- Las tres se sirven localmente (`@fontsource`, subconjunto latino), sin solicitudes a terceros.
- Titular del héroe: 2,6–4,8 rem. Titulares de sección: 2,2–3,4 rem. Cuerpo: 15–20 px con `leading-relaxed`.
- Cifras con `tabular-nums` (clase `num`) y formato es-CO: coma decimal, punto de miles.

## 4. Espaciado, radios y sombras

- Contenedor público: 1240 px; aplicación: 1400 px. Bandas públicas: 80–112 px de alto de relleno vertical.
- Radios: `sm` 4 px, `md` 6 px (botones y campos), `lg` 10 px (paneles), `xl` 14 px (tarjetas destacadas). No se usan radios exagerados.
- Sombras: `shadow-panel` (casi plana) para paneles de trabajo; `shadow-pop` para menús y tarjetas flotantes; sombras profundas solo en la composición del héroe y la vista de producto.

## 5. Movimiento

Implementado con CSS y APIs nativas (`IntersectionObserver`, `requestAnimationFrame`) en `src/components/motion`. Sin bibliotecas de animación.

| Patrón | Dónde | Duración |
|---|---|---|
| Aparición al desplazarse (`Reveal`) | Portada | 680 ms, escalonada 60–80 ms |
| Contador (`AnimatedCounter`) | Cifras del modelo | 1 200 ms, una sola vez |
| Paralaje (`useParallax`) | Solo capas del héroe | Factor 0,04–0,05 |
| Flotación y luz ambiental | Solo portada | 9–22 s, pausadas fuera de la vista (`MotionScope`) |
| Ken Burns | Imágenes de fondo de la portada | 28 s, pausado fuera de la vista |
| Progreso del ciclo (`useScrollProgress`) | Línea de tiempo «Cómo funciona» | Ligado al desplazamiento, sin interceptarlo |
| Transición de página (`page-in`) | Cambio de ruta en la aplicación | 260 ms |
| Microinteracciones | Botones, navegación, tarjetas | 180–320 ms |
| Video de fondo desenfocado (`BackgroundVideo`) | Héroe y cierre | Bucle de 12 s, pausado fuera de la vista |
| Marquesina (`Marquee`) | Referentes | 55–62 s por vuelta; se detiene al pasar el puntero o enfocar |
| Palabra rotativa (`WordRotator`) | Héroe | Cada 2,6 s; ancho reservado para que el texto no salte |
| Texto que se ilumina (`ScrollRevealText`) | Declaración | Ligado al desplazamiento |
| Carrusel con avance automático | Pantallas de la aplicación | 6 s por diapositiva, con botón de pausa |
| Luz que sigue al puntero (`.spotlight`) | Tarjetas de capacidades y modalidades | Inmediata |
| Gráficos | ECharts | 650 ms de entrada, 380 ms de actualización |

Reglas:

- `prefers-reduced-motion: reduce` desactiva apariciones, contadores, paralaje, flotación, Ken Burns, transiciones de página y animaciones de ECharts. El contenido se muestra completo y de inmediato.
- No hay *scroll-jacking*: ningún efecto intercepta ni modifica el desplazamiento.
- No hay animaciones permanentes en formularios, tablas ni cuestionarios.
- Las animaciones decorativas se pausan cuando su bloque sale de la vista.

## 6. Video e imágenes

Todos los medios son originales y locales (`src/assets/landing/`); el procedimiento está en `scripts/media/README.md`.

| Recurso | Qué es | Uso | Peso |
|---|---|---|---|
| `hero-loop.webm` / `.mp4` | Escena 3D propia (campo de documentos de vidrio con luz menta y violeta), 12 s en bucle perfecto, desenfocada al codificar | Fondo del héroe y del cierre | 247 KB / 524 KB |
| `hero-poster.webp` | Primer cuadro del video | Póster, movimiento reducido y ahorro de datos | 8 KB |
| `render-field`, `render-stack`, `render-strata`, `render-vault` | Renders 3D fijos (800 y 1600 px) | Pasos del método y privacidad | 7–67 KB |
| `shot-*` | Capturas reales de la aplicación con el caso de demostración (960 y 1600 px) | Vista del producto en el héroe y carrusel | 32–120 KB |

Reglas:

- El video es silenciado, en bucle, `playsinline`, sin controles y oculto a tecnologías de asistencia. Solo se reproduce mientras está en la vista; con movimiento reducido o ahorro de datos se muestra el póster.
- El desenfoque va «horneado» en el archivo: el navegador no aplica filtros en tiempo real.
- Las imágenes usan `srcset`, carga diferida (salvo la vista del producto del héroe) y fondo Midnight de respaldo.
- Los medios de la portada no entran en el precache de la PWA: se guardan en caché la primera vez que se ven (`dm-imagenes`). El video no se guarda; sin conexión se ve el póster.

## 7. Componentes

| Componente | Archivo | Notas |
|---|---|---|
| `MarketingHero` (héroe) | `features/landing/LandingPage.tsx` · `Hero` | Video de fondo desenfocado, titular con serif itálica, palabra rotativa y vista real del producto que se endereza al desplazarse. |
| `Carousel` | `features/landing/Carousel.tsx` | Desplazamiento nativo con imanes, arrastre, teclado, avance automático pausable y Ken Burns en la diapositiva activa. |
| `BackgroundVideo`, `Marquee`, `WordRotator`, `ScrollRevealText`, `useSpotlight` | `components/motion` | Ver § 5. |
| `AppShell` | `components/layout/AppLayout.tsx` | Barra lateral agrupada (Trabajo, Conocimiento, Sistema), barra activa menta, tarjeta de evaluación activa, migas de pan, siguiente paso, menú móvil con Escape. |
| `SectionHeading` | `LandingPage.tsx` | Antetítulo, título y entrada. |
| `AnimatedCounter`, `Reveal`, `MotionScope`, `AmbientImage` | `components/motion` | Ver § 5. |
| `FeatureCard` | `LandingPage.tsx` · `Capabilities` | Tarjetas con icono y luz que sigue al puntero. |
| Planes por modalidad | `LandingPage.tsx` · `Modalities` | Formato de tabla de planes: cifra grande, inclusiones y modalidad recomendada. |
| `KPIStat`, `ProgressRing`, `Progress`, `SkeletonLoader` | `components/ui` | `Progress` admite variante oscura. |
| `StatusBadge` | `components/ui` | Estado con icono y texto (pendiente, validado, discrepancia, contradicción, evidencia insuficiente…). |
| `AssessmentModeCard` | `features/assessments/NewAssessment.tsx` | Tarjetas comparables por modalidad con resumen fijo. |
| `ChartContainer` | `components/charts/EChart.tsx` | Etiqueta accesible, tabla alternativa y estado vacío. |
| `EmptyState`, `Callout`, `PageHeader` | `components/ui` | `PageHeader` con tono académico (violeta). |
| Siguiente paso | `components/layout/nextStep.ts` | Derivado de IndexedDB: alcance → participantes → entrevistas → evidencias → validación → hoja de ruta → informes. |
| Enlaces con aspecto de botón | `buttonClass()` | Sustituye los botones anidados dentro de enlaces. |

## 8. Inventario de pantallas

| Pantalla | Nivel de rediseño |
|---|---|
| Portada | Reconstruida dos veces. Versión actual: navegación flotante, héroe con video desenfocado y vista real del producto, marquesina de referentes, cifras, método en tres pasos con renders 3D, carrusel de pantallas, capacidades, modalidades como planes, privacidad, declaración que se ilumina, preguntas y cierre con video. |
| Navegación y pie públicos | Cápsula flotante translúcida; pie con marca a gran escala y «Diseñado y creado por: Sergio Gómez Flórez» (LinkedIn, pestaña nueva). |
| Cómo funciona, Metodología, Referentes, Privacidad | Banda de entrada oscura; contenido sin cambios. |
| Estructura de la aplicación | Reconstruida (navegación, encabezado, transición). |
| Inicio | Reorganizado como panorama: indicadores, evaluaciones en curso con avance y siguiente paso, finalizadas, actividad reciente, respaldo. |
| Organizaciones / formulario | Tabla existente; formulario con bloques numerados e índice fijo. |
| Nueva evaluación | Pasos, tarjetas de modalidad comparables y resumen fijo. |
| Cuestionario | Modo enfocado: encabezado oscuro, niveles con selección inequívoca y foco visible, respuestas especiales agrupadas. Sin animaciones. |
| Evidencias y mesa de validación | Estados con icono y texto. |
| Resultados, brechas, hoja de ruta | Heredan la paleta y los gráficos; sin cambios de cálculo. |
| Informes | Agrupados: Informes · Datos y análisis · Intercambio y respaldo. |
| Laboratorio académico | Acento violeta dentro del mismo sistema. |

## 9. Accesibilidad (objetivo WCAG 2.2 AA)

- Contrastes verificados en § 2. Foco visible menta oscuro sobre claro y menta sobre oscuro.
- Estados nunca solo por color: `StatusBadge`, evidencias E0–E3 con icono y texto.
- Las cifras animadas exponen su valor final a tecnologías de asistencia; las visualizaciones ilustrativas tienen descripción textual y los gráficos de producto, tabla alternativa.
- Objetivos táctiles de al menos 44 px en los menús móviles, el botón de demostración del héroe y las preguntas frecuentes.
- Menú móvil de la aplicación: diálogo modal, cierre con Escape y retorno del foco.

## 10. Rendimiento (Chrome, CPU 4×, mediana de 3)

| Ruta | Antes (v1.1) FCP / LCP | Ahora FCP / LCP | JS | CLS |
|---|---|---|---|---|
| Portada | 472 / 1 172 ms | 524 / 1 224 ms | 698 → 473 KB | 0,007 |
| Inicio de la aplicación | 520 / 820 ms | 504 / 852 ms | 460 → 467 KB | 0 |
| Metodología | 492 / 724 ms | 580 / 908 ms | 465 → 470 KB | 0 |

La portada carga 108 KB de imagen al inicio (póster y vista del producto); el video (247 KB en WebM) se descarga después y solo si el movimiento no está reducido. El titular del héroe entra con una animación de carga, no de desplazamiento, para no retrasar el LCP.
