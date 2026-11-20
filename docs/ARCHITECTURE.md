# Arquitectura

## 1. Visión general

Aplicación de página única (SPA) estática, sin backend. Todo el procesamiento ocurre en el navegador.

```
 Navegador
 ├─ Interfaz React (src/features, src/components)
 │    └─ consulta datos vivos con useLiveQuery (dexie-react-hooks)
 ├─ Motor determinista (src/engine)  ← funciones puras, sin E/S
 ├─ Servicios (src/services)
 │    ├─ repo.ts        persistencia de entidades y reglas de negocio
 │    ├─ packages.ts    paquetes de intercambio, revisiones, respaldo
 │    ├─ crypto.ts      AES-GCM + PBKDF2 con Web Crypto API
 │    ├─ exports/       PDF (jsPDF) y XLSX (ExcelJS)
 │    ├─ storage.ts     cuota, persistencia, borrado
 │    ├─ demo.ts        carga de casos ficticios
 │    └─ ai.ts          generador de prompts (sin red)
 ├─ IndexedDB (src/database/db.ts, Dexie)
 └─ Service worker (Workbox, generado por vite-plugin-pwa)
```

## 2. Tecnologías

| Capa | Elección |
|---|---|
| Lenguaje | TypeScript estricto |
| UI | React 18, Tailwind CSS 4 (tokens en `@theme`), Radix UI (diálogos, pestañas, tooltips), Lucide |
| Enrutamiento | React Router 6 con `HashRouter` (compatible con GitHub Pages sin reescrituras) |
| Estado | Zustand para notificaciones y estado de interfaz; IndexedDB como fuente de verdad |
| Formularios | React Hook Form + Zod |
| Gráficos | Apache ECharts 6 modular con renderizador canvas |
| Persistencia | Dexie 4 sobre IndexedDB |
| Exportación | jsPDF + jspdf-autotable, ExcelJS |
| PWA | vite-plugin-pwa (Workbox, `registerType: prompt`) |
| Pruebas | Vitest + jsdom + fake-indexeddb; Playwright |
| Build | Vite 8; base `/docmaturity/` (sobrescribible con `VITE_BASE`) |

Las fuentes Inter y Plus Jakarta Sans se empaquetan localmente con `@fontsource`; no hay CDN.

## 3. Flujo de datos

1. Las pantallas leen el *bundle* de una evaluación (`loadBundle`) con `useLiveQuery`; cualquier escritura en IndexedDB actualiza la vista.
2. `useAssessmentData` memoiza `analyzeAssessment(bundle)`, que construye los estados por criterio y todos los indicadores, alertas, riesgos sugeridos, prioridades, iniciativas propuestas y recomendaciones.
3. Las acciones del usuario llaman a servicios (`repo.ts`, `packages.ts`) que validan, escriben en transacciones y registran auditoría.
4. Los errores de cuota se traducen a `StorageQuotaError` con un mensaje comprensible.

## 4. Motor

| Módulo | Responsabilidad |
|---|---|
| `scoring` | Estados por criterio, consolidación por mediana, cobertura, dimensiones, global, evidencias, acuerdo, solidez, alertas críticas. |
| `triangulation` | 30 reglas de contradicción y alertas de validación. |
| `applicability` | Sujeto público, estado normativo por criterio, sugerencias de no aplicabilidad. |
| `risk` | Biblioteca de 15 riesgos, sugerencias, valor y bandas, matriz. |
| `prioritization` | Factores, fórmula, cuadrantes, límite para tecnologías inteligentes, orden por dependencias. |
| `recommendations` | Recomendación por criterio y nivel, iniciativas propuestas, fases y dependencias. |
| `narrative` | Narrativa diagnóstica por reglas con referencias a criterios. |
| `analyze` | Orquestación y comparación histórica. |

## 5. Rendimiento

- Rutas cargadas de forma diferida (`React.lazy`) y *chunks* separados para gráficos, PDF y XLSX.
- El banco (≈ 600 KB) se incluye en el *chunk* principal porque lo usan casi todas las pantallas; el service worker lo conserva en caché.
- El análisis se recalcula en memoria; para 225 criterios y decenas de participantes tarda pocos milisegundos.

## 6. Seguridad en la construcción

- CSP inyectada solo en el build de producción: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'` y `referrer no-referrer`. `style-src 'unsafe-inline'` se requiere para los estilos que ECharts y Radix aplican en línea.
- ESLint prohíbe `dangerouslySetInnerHTML`.
- Dependencias con versiones exactas y `package-lock.json`.

## 7. Extensión

- **Nuevo proveedor de IA**: implementar `AIProvider` en `src/services/ai.ts` dentro de una instalación propia con un intermediario autenticado y ampliar la CSP. No se debe incluir ninguna clave en el frontend.
- **Nueva versión del banco**: editar `src/data/question-bank/source/*.txt`, incrementar `bankVersion` y ejecutar `npm run bank` (ver [DEPLOYMENT.md](DEPLOYMENT.md)).
- **Migración de datos**: agregar una versión en `DocMaturityDB` con su función `upgrade`.
