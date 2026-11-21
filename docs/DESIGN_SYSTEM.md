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

- **Plus Jakarta Sans** (600, 700, 800) para titulares y cifras: `font-display`.
- **Inter** (400, 500, 600) para lectura e interfaz: `font-sans`.
- Ambas se sirven localmente (`@fontsource`), sin solicitudes a terceros.
- Titulares de portada: 2,3–3,3 rem, `tracking` −0,028 em. Encabezados de página: 1,75–2,1 rem. Cuerpo: 15–17 px con `leading-relaxed`.
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
| Gráficos | ECharts | 650 ms de entrada, 380 ms de actualización |

Reglas:

- `prefers-reduced-motion: reduce` desactiva apariciones, contadores, paralaje, flotación, Ken Burns, transiciones de página y animaciones de ECharts. El contenido se muestra completo y de inmediato.
- No hay *scroll-jacking*: ningún efecto intercepta ni modifica el desplazamiento.
- No hay animaciones permanentes en formularios, tablas ni cuestionarios.
- Las animaciones decorativas se pausan cuando su bloque sale de la vista.

## 6. Imágenes

Tres composiciones generativas originales (sin fotografías ni recursos de terceros), en WebP local a 1024 y 1920 px:

| Archivo | Uso | Peso 1920 / 1024 |
|---|---|---|
| `estratos` | Héroe (carga inmediata) | 131 KB / 10 KB |
| `fachada` | Metodología (carga diferida) | 247 KB / 25 KB |
| `topografia` | Cierre (carga diferida) | 62 KB / 8 KB |

`AmbientImage` usa `srcset`, `loading="lazy"` salvo en el héroe, `decoding="async"`, `alt=""` y `aria-hidden`; su contenedor tiene el color Midnight como respaldo. El precache de la PWA incluye `webp` y `avif` para que funcionen sin conexión.

## 7. Componentes

| Componente | Archivo | Notas |
|---|---|---|
| `MarketingHero` (héroe) | `features/landing/LandingPage.tsx` · `Hero` | Composición en `visuals.tsx` · `HeroVisual` (tres capas con datos ilustrativos). |
| `AppShell` | `components/layout/AppLayout.tsx` | Barra lateral agrupada (Trabajo, Conocimiento, Sistema), barra activa menta, tarjeta de evaluación activa, migas de pan, siguiente paso, menú móvil con Escape. |
| `SectionHeading` | `LandingPage.tsx` | Antetítulo, título y entrada. |
| `AnimatedCounter`, `Reveal`, `MotionScope`, `AmbientImage` | `components/motion` | Ver § 5. |
| `FloatingVisual` | `visuals.tsx` | Capas `glass` con flotación y paralaje. |
| `FeatureCard` (bento) | `LandingPage.tsx` · `Bento` | Tamaños asimétricos; destacado y académico. |
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
| Portada | Reconstruida: héroe, cifras, ciclo, capacidades, producto, metodología, dimensiones, referentes, modalidades, entrevistas, privacidad, preguntas, cierre. |
| Pie de página público | Reconstruido, con «Diseñado y creado por: Sergio Gómez Flórez» (LinkedIn, pestaña nueva). |
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

| Ruta | Antes FCP / LCP | Después FCP / LCP | JS antes → después | CLS |
|---|---|---|---|---|
| Portada | 472 / 1 172 ms | 480 / 1 068 ms | 698 → 475 KB | 0 |
| Inicio de la aplicación | 520 / 820 ms | 512 / 808 ms | 460 → 467 KB | 0 |
| Metodología | 492 / 724 ms | 556 / 896 ms | 465 → 470 KB | 0 |

La portada ya no carga ECharts al inicio: la vista de producto se descarga solo al acercarse a la vista. La imagen del héroe agrega 131 KB en pantallas anchas (10 KB en móviles).
