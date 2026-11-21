/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// Base pública compatible con GitHub Pages (https://<usuario>.github.io/docmaturity/).
// Puede sobrescribirse con VITE_BASE (por ejemplo "/" para un dominio propio).
// Con CUSTOM_DOMAIN (por ejemplo "diagnostico.midominio.org") el build escribe dist/CNAME
// y, si no se indicó VITE_BASE, publica en la raíz del dominio.
const customDomain = (process.env.CUSTOM_DOMAIN ?? '').trim().toLowerCase();
if (customDomain && !/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(customDomain)) {
  throw new Error(`CUSTOM_DOMAIN no es un nombre de dominio válido: «${customDomain}».`);
}
const base = process.env.VITE_BASE || (customDomain ? '/' : '/docmaturity/');

// La política de seguridad de contenido solo se inyecta en el build de producción:
// el servidor de desarrollo necesita scripts en línea para el recargado en caliente.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

/** Escribe el archivo CNAME de GitHub Pages cuando se configura un dominio propio. */
function cnamePlugin(): Plugin {
  return {
    name: 'docmaturity-cname',
    apply: 'build',
    generateBundle() {
      if (customDomain) this.emitFile({ type: 'asset', fileName: 'CNAME', source: `${customDomain}\n` });
    },
  };
}

function cspPlugin(): Plugin {
  return {
    name: 'docmaturity-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />\n    <meta name="referrer" content="no-referrer" />`,
      );
    },
  };
}

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    cspPlugin(),
    cnamePlugin(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'DOCMATURITY — Diagnóstico de madurez documental',
        short_name: 'DOCMATURITY',
        description: 'Diagnóstico de madurez en gestión documental y gobierno de la información.',
        lang: 'es-CO',
        theme_color: '#0B1020',
        background_color: '#0B1020',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,avif,woff2,json}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/echarts') || id.includes('node_modules/zrender')) return 'charts';
          if (id.includes('node_modules/exceljs')) return 'xlsx';
          if (id.includes('node_modules/jspdf')) return 'pdf';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/unit/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    css: false,
  },
});
