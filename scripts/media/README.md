# Medios de la portada

Todos los medios de `src/assets/landing/` son originales:

- **Video y renders 3D** (`hero-loop.*`, `hero-poster.webp`, `render-*.webp`): escena propia en three.js (`scene.html`) renderizada cuadro a cuadro con Chrome sin interfaz (`render.mjs`). Modos: `field` (campo de documentos en bucle), `stack` (pila de evidencias), `strata` (estratos del modelo) y `vault` (bóveda local).
- **Pantallas** (`shot-*.webp`): capturas reales de la aplicación con el caso de demostración ficticio.

```bash
npm i --no-save three@0.170.0
# Video: 12 s en bucle a 24 cuadros por segundo, con profundidad de campo
SCENE_EXTRA="&dof=9&aperture=0.006&maxblur=0.014&light=13&bloom=0.65&threshold=0.24" \
  node scripts/media/render.mjs field 1280 720 288 /tmp/frames 12 0 24
VF="gblur=sigma=1.4,eq=saturation=1.15:contrast=1.04:gamma=1.12,noise=alls=3:allf=t,format=yuv420p"
ffmpeg -framerate 24 -i /tmp/frames/f%04d.png -vf "$VF" -c:v libvpx-vp9 -b:v 0 -crf 34 -row-mt 1 -an src/assets/landing/hero-loop.webm
ffmpeg -framerate 24 -i /tmp/frames/f%04d.png -vf "$VF" -c:v libx264 -preset veryfast -crf 25 -movflags +faststart -an src/assets/landing/hero-loop.mp4
# Imagen fija
node scripts/media/render.mjs stack 1600 1000 1 /tmp/render-stack.png
```

El desenfoque del video viene de la profundidad de campo de la escena y de un desenfoque leve al codificar: el navegador no aplica filtros en tiempo real. `SCENE_EXTRA` admite `dof`, `aperture`, `maxblur`, `light`, `bloom` y `threshold`.
