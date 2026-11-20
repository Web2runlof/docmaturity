# DOCMATURITY

**Records. Information. Intelligence.**

Aplicación web para diagnosticar la madurez en gestión documental y gobierno de la información de una organización, consolidar entrevistas con varios perfiles, triangular la información con evidencias y convertir los resultados en una hoja de ruta de transformación.

Funciona por completo en el navegador: no tiene servidor, no requiere registro, no usa telemetría y no envía datos de forma automática. Se publica como sitio estático en GitHub Pages y funciona sin conexión después de la primera visita.

> DOCMATURITY es una herramienta de autodiagnóstico y consultoría. Sus resultados no constituyen certificación, auditoría oficial ni puntaje de instrumentos oficiales (MGDA, FURAG, ISO, MoReq). No está avalada por el Archivo General de la Nación, ISO ni otras organizaciones citadas como referentes.

## Qué incluye

| Área | Contenido |
|---|---|
| Modelo DIAM v1.0 | 15 dimensiones, **225 criterios originales**, **1.350 descriptores de nivel** redactados individualmente, 1.350 recomendaciones por nivel, 22 criterios críticos, 30 reglas de contradicción, 15 riesgos tipo, 32 plantillas de iniciativa y glosario de 80 términos. |
| Modalidades | Rápida (30 criterios), estándar (90), profesional (225) y personalizada (dimensiones seleccionadas, preguntas propias y exclusiones justificadas). |
| Organizaciones | 15 perfiles organizacionales, caracterización documental y tecnológica, condiciones jurídicas que determinan la aplicabilidad. |
| Entrevistas | Entrevista dirigida y entrevista distribuida mediante archivos `.dm-assignment.json` → `.dm-interview.json` con hash SHA-256, revisiones numeradas y detección de duplicados. |
| Validación | Mesa de validación con discrepancias, contradicciones, «no aplica» propuestos, niveles altos sin evidencia y criterios críticos; nivel validado con justificación sin alterar las respuestas originales. |
| Analítica | Dashboard con radar, barras frente al objetivo, distribución por nivel, capacidades críticas, mapas de calor por perfil y área, comparación de participantes, discrepancias, matriz de brechas, cobertura, soporte de evidencias, matriz de riesgos, impacto–esfuerzo, línea de tiempo, componentes MGDA, evolución histórica y lectura por referente. |
| Planeación | Brechas, riesgos valorados (P × I), priorización explicada, recomendaciones por nivel, hoja de ruta en cuatro fases con dependencias, portafolio y presupuesto opcional en COP. |
| Informes | PDF ejecutivo, PDF técnico, libro XLSX de 15 hojas, paquete JSON de evaluación, respaldo completo; cifrado opcional AES-GCM. Narrativa basada en reglas con referencias a criterios. |
| Académico | Laboratorio de 60 minutos con cinco casos ficticios, temporizador ajustable, insignias por calidad del proceso y entregable en PDF apto para Moodle. |
| IA opcional | Generador de prompts anonimizados; la respuesta externa se marca como «generada externamente mediante IA». Sin claves ni conexiones. |

## Ejecución local

Requisitos: Node.js 22 o superior y npm 10.

```bash
npm install
npm run dev          # servidor de desarrollo en http://localhost:5173/docmaturity/
npm run lint
npm run typecheck
npm run test         # pruebas unitarias e integración (Vitest)
npm run build        # genera el banco, compila y produce dist/
npm run preview      # sirve dist/ en http://localhost:4173/docmaturity/
npm run test:e2e     # pruebas end-to-end (Playwright); requiere npm run build
```

Para las pruebas end-to-end se necesita un navegador Chromium. Instálelo con `npx playwright install chromium` o indique uno existente con `PLAYWRIGHT_CHROME_PATH=/ruta/a/chrome`.

## Despliegue en GitHub Pages

El flujo `.github/workflows/deploy.yml` instala dependencias con `npm ci`, ejecuta lint, verificación de tipos, pruebas y build, y publica `dist/` con el mecanismo oficial de GitHub Pages. Para activarlo:

1. En el repositorio, abra **Settings → Pages**.
2. En **Build and deployment → Source**, seleccione **GitHub Actions**.
3. Haga push a `main` o ejecute el flujo manualmente desde **Actions → Desplegar en GitHub Pages → Run workflow**.

El sitio queda en `https://<usuario>.github.io/docmaturity/`. Detalles, dominio propio y actualización del banco sin perder evaluaciones: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Estructura

```
src/
  app/                 enrutamiento (HashRouter), estado global, registro del service worker
  components/          sistema de diseño, gráficos accesibles (ECharts), layouts
  data/                banco DIAM, fuentes, glosario, perfiles, plantillas, casos ficticios
  database/            IndexedDB (Dexie) con migraciones
  engine/              motor determinista: puntuación, triangulación, aplicabilidad, riesgos,
                       priorización, recomendaciones, narrativa
  features/            pantallas de la aplicación
  schemas/             validación Zod del banco y de los paquetes
  services/            persistencia, paquetes, cifrado, exportaciones PDF/XLSX, IA opcional
scripts/build-bank.mjs generador y validador del banco
tests/unit             pruebas Vitest
tests/e2e              pruebas Playwright
docs/                  documentación, banco exportable (JSON/CSV) y trazabilidad
```

## Documentación

- [Especificación del producto](docs/PRODUCT_SPECIFICATION.md)
- [Metodología DIAM](docs/METHODOLOGY_DIAM.md) · [Banco de criterios](docs/QUESTION_BANK.md) · [Registro de fuentes](docs/SOURCE_REGISTER.md) · [Trazabilidad (CSV)](docs/SOURCE_TRACEABILITY.csv)
- [Motor de calificación](docs/SCORING_ENGINE.md) · [Reglas de aplicabilidad](docs/APPLICABILITY_RULES.md)
- [Modelo de datos](docs/DATA_MODEL.md) · [Arquitectura](docs/ARCHITECTURE.md) · [Privacidad y seguridad](docs/PRIVACY_AND_SECURITY.md)
- [Flujo de entrevistas](docs/INTERVIEW_WORKFLOW.md) · [Guía de usuario](docs/USER_GUIDE.md) · [Guía académica](docs/ACADEMIC_GUIDE.md)
- [Despliegue](docs/DEPLOYMENT.md) · [Informe de pruebas](docs/TEST_REPORT.md) · [Limitaciones conocidas](docs/KNOWN_LIMITATIONS.md) · [Cambios](docs/CHANGELOG.md) · [Progreso](docs/PROGRESS.md)

Banco exportable: [JSON](docs/question-bank/diam-question-bank.json) · [CSV](docs/question-bank/diam-question-bank.csv).

## Licencia

El código original se distribuye bajo licencia [MIT](LICENSE). Las normas, estándares, modelos y publicaciones citados como referentes conservan sus propias licencias y derechos; este repositorio no los reproduce ni los relicencia. Las fuentes tipográficas Inter y Plus Jakarta Sans se distribuyen bajo SIL Open Font License 1.1.
