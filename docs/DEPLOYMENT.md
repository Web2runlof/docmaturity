# Despliegue

DOCMATURITY es un sitio estático. Se publica en GitHub Pages mediante GitHub Actions; no requiere servidor, base de datos ni secretos.

## 1. Requisitos

- Repositorio en GitHub (por ejemplo, `Web2runlof/docmaturity`).
- Node.js 22 y npm 10 para compilar localmente.

## 2. Configurar GitHub Pages (una sola vez)

1. Abra el repositorio en GitHub → **Settings → Pages**.
2. En **Build and deployment → Source** seleccione **GitHub Actions**.
3. No es necesario crear secretos ni tokens: el flujo usa la identidad OIDC de GitHub con permisos mínimos.

## 3. Flujo de publicación

Archivo: `.github/workflows/deploy.yml`.

| Paso | Comando |
|---|---|
| Instalación reproducible | `npm ci` |
| Lint | `npm run lint` |
| Tipos | `npm run typecheck` |
| Pruebas | `npm run test` |
| Build | `npm run build` con `VITE_BASE=/<nombre-del-repositorio>/` |
| Publicación | `actions/upload-pages-artifact` + `actions/deploy-pages` |

Permisos: `contents: read` a nivel global; `pages: write` e `id-token: write` solo en el job de publicación. Las *pull requests* ejecutan las verificaciones y el build, pero no publican.

Se ejecuta con cada push a `main` y manualmente desde **Actions → Desplegar en GitHub Pages → Run workflow**. Al terminar, el sitio queda en:

```
https://<usuario>.github.io/<repositorio>/
```

## 4. Rutas y base

- `HashRouter`: todas las rutas viven después de `#/` (por ejemplo, `…/docmaturity/#/app/evaluaciones`). GitHub Pages no necesita reescrituras ni un `404.html`.
- La base de Vite es `/docmaturity/` por defecto. Para otro nombre de repositorio el flujo la ajusta automáticamente; localmente use `VITE_BASE=/otro-nombre/ npm run build`.
- Para un dominio propio en la raíz: configure el dominio en Settings → Pages, agregue `public/CNAME` con el dominio y compile con `VITE_BASE=/`.

## 5. Publicar una nueva versión

1. Actualice `version` en `package.json` y `APP_VERSION` en `src/services/packages.ts`.
2. Registre los cambios en `docs/CHANGELOG.md`.
3. Ejecute localmente `npm run lint && npm run typecheck && npm run test && npm run build && npm run test:e2e`.
4. Haga push a `main`.

Los usuarios con la versión anterior verán el aviso «Hay una nueva versión de DOCMATURITY» y podrán actualizar; sus datos locales se conservan.

## 6. Actualizar el banco sin perder evaluaciones

Las evaluaciones guardan la lista de criterios (`questionIds`) y las versiones de metodología y banco con que se crearon. Para publicar una nueva versión del banco:

1. Edite los archivos `src/data/question-bank/source/Dxx.txt`.
2. **Nunca reutilice ni renumere** un identificador existente con otro significado. Para retirar un criterio, consérvelo en el banco o documente su retiro; para uno nuevo, use el siguiente número libre de la dimensión.
3. Incremente `BANK_VERSION` (versión semántica) en `scripts/build-bank.mjs` y documente el cambio en `docs/CHANGELOG.md`.
4. Ejecute `npm run bank`: valida 15 dimensiones, 15 criterios por dimensión, seis descriptores distintos por criterio, fuentes registradas, recomendaciones por nivel y unicidad global; regenera las exportaciones y la trazabilidad.
5. Si cambia la estructura de los datos guardados, agregue una migración en `src/database/db.ts` (`this.version(n).stores(...).upgrade(...)`).

Efectos sobre los datos existentes:
- Las evaluaciones existentes conservan sus criterios y respuestas.
- Al importar un paquete con otra versión del banco se muestra una advertencia.
- La comparación histórica usa solo los criterios comunes y advierte la diferencia de versiones.

## 7. Verificación después de publicar

- Abra el sitio, recorra el inicio y **Abrir aplicación**.
- En las herramientas del navegador verifique que el service worker esté activo y que no haya peticiones a otros dominios.
- Desconecte la red y recargue: la aplicación debe seguir funcionando.

## 8. Ejecución local del sitio compilado

```bash
npm run build
npm run preview   # http://localhost:4173/docmaturity/
```
