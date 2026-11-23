# Medios de la portada

Todos los medios de `src/assets/landing/` son originales:

- **Video y renders 3D** (`hero-loop.*`, `hero-poster.webp`, `render-*.webp`): escena propia en three.js (`scene.html`) renderizada cuadro a cuadro con Chrome sin interfaz (`render.mjs`). Modos: `field` (campo de documentos en bucle), `stack` (pila de evidencias), `strata` (estratos del modelo) y `vault` (bóveda local).
- **Pantallas** (`shot-*.webp`): capturas reales de la aplicación con el caso de demostración ficticio.

```bash
npm i --no-save three@0.170.0
# Video: 12 s en bucle a 24 cuadros por segundo
node scripts/media/render.mjs field 960 540 288 /tmp/frames 12 0 24
ffmpeg -framerate 24 -i /tmp/frames/f%04d.png -vf "gblur=sigma=5,eq=saturation=1.15:contrast=1.04,format=yuv420p" \
  -c:v libvpx-vp9 -b:v 0 -crf 40 -row-mt 1 -an src/assets/landing/hero-loop.webm
ffmpeg -framerate 24 -i /tmp/frames/f%04d.png -vf "gblur=sigma=5,eq=saturation=1.15:contrast=1.04,format=yuv420p" \
  -c:v libx264 -preset veryfast -crf 27 -movflags +faststart -an src/assets/landing/hero-loop.mp4
# Imagen fija
node scripts/media/render.mjs stack 1600 1000 1 /tmp/render-stack.png
```

El desenfoque del video se aplica al codificarlo: el archivo pesa menos y el navegador no tiene que desenfocarlo en tiempo real.
