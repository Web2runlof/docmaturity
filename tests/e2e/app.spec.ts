import { expect, test, type Page } from '@playwright/test';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Registra toda petición que salga del origen local: por defecto no debe existir ninguna. */
function watchExternal(page: Page) {
  const external: string[] = [];
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith('http://localhost:4173') && !u.startsWith('data:') && !u.startsWith('blob:')) external.push(u);
  });
  return external;
}

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  return errors;
}

test('59/60 · rutas públicas y de la aplicación funcionan bajo la base de GitHub Pages sin envíos externos', async ({ page }) => {
  const external = watchExternal(page);
  const errors = watchErrors(page);
  const routes: [string, RegExp][] = [
    ['', /Conozca la madurez documental/],
    ['#/como-funciona', /Del primer dato a la hoja de ruta/],
    ['#/metodologia', /Modelo Integrado de Evaluación DocMaturity/],
    ['#/referentes', /Referentes normativos/],
    ['#/privacidad', /Privacidad y datos locales/],
    ['#/responder', /Responder una entrevista/],
    ['#/app', /Inicio|organizaci/i],
    ['#/app/cuestionarios', /Cuestionarios/],
    ['#/app/biblioteca', /Biblioteca metodológica/],
    ['#/app/academico', /Laboratorio de diagnóstico documental/],
    ['#/app/configuracion', /Configuración/],
  ];
  for (const [hash, heading] of routes) {
    await page.goto(hash);
    await expect(page.getByRole('heading', { level: 1 }).first()).toContainText(heading);
  }
  // Una ruta inexistente muestra la página 404 (pública y dentro de la aplicación).
  await page.goto('#/ruta-inexistente');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Esta página no existe');
  await page.goto('#/app/ruta-inexistente');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Esta página no existe');
  expect(external, `Peticiones externas: ${external.join(', ')}`).toEqual([]);
  expect(errors).toEqual([]);
  // La política de seguridad de contenido restringe las conexiones al mismo origen.
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(csp).toContain("connect-src 'self'");
});

test('01/04/49 · crea una organización, persiste tras recargar y no interpreta HTML', async ({ page }) => {
  await page.goto('#/app/organizaciones/nueva');
  const name = 'Entidad E2E <img src=x onerror=alert(1)>';
  await page.getByLabel('Nombre o razón social').fill(name);
  await page.getByRole('button', { name: 'Guardar' }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Entidad E2E');
  expect(await page.locator('img[src="x"]').count()).toBe(0);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Entidad E2E');
  await page.goto('#/app/organizaciones');
  await expect(page.getByText('Entidad E2E', { exact: false }).first()).toBeVisible();
});

test('19–24 · flujo distribuido: asignación exportada, respondida en otro navegador e importada', async ({ page, browser }) => {
  // Evaluador: organización, evaluación rápida y participante.
  await page.goto('#/app/organizaciones/nueva');
  await page.getByLabel('Nombre o razón social').fill('Organización flujo distribuido');
  await page.getByRole('button', { name: 'Guardar' }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Organización flujo distribuido');
  await page.goto('#/app/evaluaciones/nueva');
  await page.locator('#org').selectOption({ label: 'Organización flujo distribuido' });
  await page.locator('#name').fill('Diagnóstico E2E');
  await page.getByRole('button', { name: 'Crear evaluación' }).first().click();
  await expect(page).toHaveURL(/evaluaciones\/[0-9a-f-]{36}/);
  const aid = page.url().match(/evaluaciones\/([0-9a-f-]{36})/)?.[1];
  await page.goto(`#/app/evaluaciones/${aid}/entrevistas`);
  await page.getByRole('button', { name: 'Agregar participante' }).first().click();
  await page.getByLabel('Código o seudónimo').fill('GD-01');
  await page.getByRole('button', { name: 'Agregar', exact: true }).click();
  await page.getByRole('button', { name: 'Asignar preguntas' }).click();
  await page.getByRole('button', { name: /Guardar asignación/ }).click();
  const [assignmentDl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Paquete' }).click()]);
  expect(assignmentDl.suggestedFilename()).toMatch(/\.dm-assignment\.json$/);
  // Ruta ASCII: Chrome no siempre lee archivos cuya ruta contiene caracteres no ASCII.
  const dir = await mkdtemp(join(tmpdir(), 'docmaturity-e2e-'));
  const assignmentPath = join(dir, 'asignacion.dm-assignment.json');
  await assignmentDl.saveAs(assignmentPath);

  // Entrevistado: otro contexto de navegador, sin datos del evaluador.
  const other = await browser.newContext({ locale: 'es-CO', acceptDownloads: true });
  const rp = await other.newPage();
  const external = watchExternal(rp);
  await rp.goto('#/responder');
  await expect(rp.getByRole('heading', { name: 'Responder una entrevista' })).toBeVisible();
  await expect(rp.getByText('No hay entrevistas importadas en este navegador.')).toBeVisible();
  await rp.locator('input[type="file"]').setInputFiles(assignmentPath);
  await expect(rp).toHaveURL(/responder\/[0-9a-f-]{36}/, { timeout: 15_000 });
  // 13/15/16: responder, saltar, regresar y cambiar la respuesta.
  await rp.getByText('Nivel 3 · Definido').first().click();
  await rp.getByRole('button', { name: 'Siguiente' }).click();
  await rp.getByRole('button', { name: 'Omitir pregunta' }).click();
  await rp.getByText('Nivel 2 · En desarrollo').first().click();
  await rp.getByRole('button', { name: 'Anterior' }).click();
  await rp.getByRole('button', { name: 'Anterior' }).click();
  await rp.getByText('Nivel 4 · Gestionado').first().click();
  // 17/18: guardar y reanudar.
  await rp.reload();
  await expect(rp.getByRole('heading', { level: 1 })).toBeVisible();
  const [interviewDl] = await Promise.all([rp.waitForEvent('download'), (async () => {
    await rp.getByRole('button', { name: 'Exportar respuestas' }).click();
    await rp.getByRole('dialog').getByRole('button', { name: 'Exportar' }).click();
  })()]);
  expect(interviewDl.suggestedFilename()).toMatch(/\.dm-interview\.json$/);
  const interviewPath = join(dir, 'entrevista.dm-interview.json');
  await interviewDl.saveAs(interviewPath);
  const pkg = JSON.parse(await readFile(interviewPath, 'utf-8'));
  expect(pkg.format).toBe('docmaturity.interview');
  expect(pkg.hash).toMatch(/^[0-9a-f]{64}$/);
  expect(external).toEqual([]);
  await other.close();

  // Evaluador: importa la entrevista y detecta la importación duplicada.
  await page.locator('input[type="file"]').setInputFiles(interviewPath);
  await expect(page.getByText('Entrevista importada').first()).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(interviewPath);
  await expect(page.getByText('Importación duplicada').first()).toBeVisible();
  await expect(page.getByText(/Autoadministrada · finalizada|Autoadministrada · en curso/).first()).toBeVisible();
});

test('43/44/45 · demostración: resultados, informes PDF y XLSX, y respaldo', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('');
  await page.getByRole('button', { name: 'Explorar demostración' }).first().click();
  await expect(page).toHaveURL(/resultados/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Resultados', exact: true })).toBeVisible();
  await expect(page.getByText('Demostración.').first()).toBeVisible();
  // 53: las dimensiones sin datos se informan y no se representan como cero.
  await expect(page.getByText(/Omitidas por falta de datos|Todas las dimensiones tienen datos/).first()).toBeVisible();
  // Alternativa textual accesible de los gráficos.
  await page.getByRole('button', { name: 'Ver tabla de datos' }).first().click();
  await expect(page.locator('table').first()).toBeVisible();

  await page.goto(page.url().replace('/resultados', '/informes'));
  for (const [label, ext] of [['Informe ejecutivo (PDF)', /\.pdf$/], ['Informe técnico (PDF)', /\.pdf$/], ['Libro de análisis (XLSX)', /\.xlsx$/]] as const) {
    const card = page.locator('section', { has: page.getByRole('heading', { name: label }) });
    const [dl] = await Promise.all([page.waitForEvent('download'), card.getByRole('button', { name: 'Descargar' }).click()]);
    expect(dl.suggestedFilename()).toMatch(ext);
    const bytes = await readFile(await dl.path());
    expect(bytes.length).toBeGreaterThan(5_000);
    if (ext.source.includes('pdf')) expect(bytes.subarray(0, 4).toString()).toBe('%PDF');
    else expect(bytes.subarray(0, 2).toString()).toBe('PK');
  }

  await page.goto('#/app/configuracion');
  const [backup] = await Promise.all([page.waitForEvent('download'), (async () => {
    await page.getByRole('button', { name: 'Exportar copia de seguridad' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Exportar' }).click();
  })()]);
  expect(backup.suggestedFilename()).toMatch(/\.dm-backup\.json$/);
  const b = JSON.parse(await readFile(await backup.path(), 'utf-8'));
  expect(b.format).toBe('docmaturity.backup');
  expect(b.tables.assessments.length).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('42 · la hoja de ruta de la demostración es editable', async ({ page }) => {
  await page.goto('');
  await page.getByRole('button', { name: 'Explorar demostración' }).first().click();
  await expect(page).toHaveURL(/resultados/, { timeout: 30_000 });
  await page.goto(page.url().replace('/resultados', '/hoja-de-ruta'));
  await expect(page.getByRole('heading', { name: 'Hoja de ruta' })).toBeVisible();
  await page.locator('section[aria-label="Fase 1"] li button').first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Presupuesto estimado (COP, opcional)').fill('25000000');
  await dialog.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText(/25\.000\.000/).first()).toBeVisible();
});

test('55 · navegación por teclado: enlace de salto, foco visible y diálogos con Escape', async ({ page }) => {
  await page.goto('');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Saltar al contenido' });
  await expect(skip).toBeFocused();
  // Con HashRouter el enlace no debe cambiar la ruta: mueve el foco al contenido principal.
  await page.keyboard.press('Enter');
  await expect(page.locator('main#contenido')).toBeFocused();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Conozca la madurez documental');
  await page.goto('#/app/configuracion');
  await page.getByRole('button', { name: 'Exportar copia de seguridad' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('56 · funciona sin conexión después de la primera visita', async ({ page, context }) => {
  await page.goto('');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Conozca la madurez documental');
  await page.goto('#/app/cuestionarios');
  await expect(page.getByRole('heading', { name: 'Cuestionarios' })).toBeVisible();
  await context.setOffline(false);
});
