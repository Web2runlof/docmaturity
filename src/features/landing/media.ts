/**
 * Medios originales de la portada. El video y los renders 3D se generan con
 * `scripts/media/` (escena propia en three.js); las pantallas son capturas reales de la
 * aplicación con datos de demostración ficticios. Ningún recurso proviene de terceros.
 */
import heroWebm from '@/assets/landing/hero-loop.webm';
import heroMp4 from '@/assets/landing/hero-loop.mp4';
import heroPoster from '@/assets/landing/hero-poster.webp';
import renderField from '@/assets/landing/render-field.webp';
import renderField800 from '@/assets/landing/render-field-800.webp';
import renderStack from '@/assets/landing/render-stack.webp';
import renderStack800 from '@/assets/landing/render-stack-800.webp';
import renderStrata from '@/assets/landing/render-strata.webp';
import renderStrata800 from '@/assets/landing/render-strata-800.webp';
import renderVault from '@/assets/landing/render-vault.webp';
import renderVault800 from '@/assets/landing/render-vault-800.webp';
import shotResultados from '@/assets/landing/shot-resultados.webp';
import shotResultados960 from '@/assets/landing/shot-resultados-960.webp';
import shotCuestionario from '@/assets/landing/shot-cuestionario.webp';
import shotCuestionario960 from '@/assets/landing/shot-cuestionario-960.webp';
import shotValidacion from '@/assets/landing/shot-validacion.webp';
import shotValidacion960 from '@/assets/landing/shot-validacion-960.webp';
import shotBrechas from '@/assets/landing/shot-brechas.webp';
import shotBrechas960 from '@/assets/landing/shot-brechas-960.webp';
import shotRuta from '@/assets/landing/shot-hoja-de-ruta.webp';
import shotRuta960 from '@/assets/landing/shot-hoja-de-ruta-960.webp';
import shotInformes from '@/assets/landing/shot-informes.webp';
import shotInformes960 from '@/assets/landing/shot-informes-960.webp';
import shotResumen from '@/assets/landing/shot-resumen.webp';
import shotResumen960 from '@/assets/landing/shot-resumen-960.webp';

export const HERO_VIDEO = { webm: heroWebm, mp4: heroMp4, poster: heroPoster };
export const RENDERS = {
  field: { src: renderField, small: renderField800 },
  stack: { src: renderStack, small: renderStack800 },
  strata: { src: renderStrata, small: renderStrata800 },
  vault: { src: renderVault, small: renderVault800 },
};
export const SHOTS = {
  resultados: { src: shotResultados, small: shotResultados960 },
  cuestionario: { src: shotCuestionario, small: shotCuestionario960 },
  validacion: { src: shotValidacion, small: shotValidacion960 },
  brechas: { src: shotBrechas, small: shotBrechas960 },
  ruta: { src: shotRuta, small: shotRuta960 },
  informes: { src: shotInformes, small: shotInformes960 },
  resumen: { src: shotResumen, small: shotResumen960 },
};
