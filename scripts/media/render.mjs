/* global window */
// Renderiza la escena de scripts/media/scene.html con Chrome sin interfaz: un cuadro o una secuencia.
// Uso: npm i --no-save three@0.170.0 && node scripts/media/render.mjs <modo> <ancho> <alto> <cuadros> <salida> [bucle] [t] [fps]
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
const root = new URL('../../', import.meta.url).pathname; // raíz del repositorio
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const srv = createServer(async (req, res) => { const p = join(root, decodeURIComponent(req.url.split('?')[0])); let body; try { body = await readFile(p); } catch { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' }); res.end(body); }).listen(5181);
const [mode, w, h, frames, out, loop, t0, fpsArg] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROME_PATH || undefined, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
page.on('console', (m) => { if (m.type() === 'error') console.log('console', m.text()); });
page.on('pageerror', (e) => console.log('pageerror', e.message));
const EXTRA = process.env.SCENE_EXTRA || '';
await page.goto(`http://localhost:5181/scripts/media/scene.html?mode=${mode}&w=${w}&h=${h}&loop=${loop || 12}${EXTRA}`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 30000 });
const N = +frames; const fps = +(fpsArg || 30); const start = Date.now();
for (let i = 0; i < N; i++) {
  const t = N === 1 ? +(t0 || 0) : i / fps;
  await page.evaluate((tt) => window.renderAt(tt), t);
  await page.locator('canvas').screenshot({ path: N === 1 ? out : `${out}/f${String(i).padStart(4, '0')}.png` });
  if (i === 0) console.log('first frame ms', Date.now() - start);
}
console.log('done', N, 'frames in', ((Date.now() - start) / 1000).toFixed(1), 's');
await browser.close(); srv.close();
