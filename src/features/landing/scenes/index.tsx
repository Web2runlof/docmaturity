/**
 * Escenas animadas de la portada. Cada una se dibuja en SVG con la tipografía y la paleta del sitio,
 * pesa unos pocos kilobytes, se detiene fuera de la vista y, con movimiento reducido, se muestra quieta
 * en su estado final. Se montan solo al acercarse a la vista, para no competir con la carga inicial.
 */
import { useEffect, useInsertionEffect, useRef, useState, type ReactNode } from 'react';
import { SCENE_DEVICE_CSS, SceneDevice } from './SceneDevice';
import { SCENE_EVIDENCE_CSS, SceneEvidence } from './SceneEvidence';
import { SCENE_INTERVIEW_CSS, SceneInterview } from './SceneInterview';
import { SCENE_PRIORITY_CSS, ScenePriority } from './ScenePriority';

const SHARED_CSS = `
@keyframes sd-march { to { stroke-dashoffset: -32; } }
.sd-march { animation: sd-march 3.2s linear infinite; }
`;

/** Hoja de estilos de todas las escenas. */
export const SCENES_CSS = [SHARED_CSS, SCENE_INTERVIEW_CSS, SCENE_EVIDENCE_CSS, SCENE_PRIORITY_CSS, SCENE_DEVICE_CSS].join('\n');

/** Inserta la hoja de estilos de las escenas una sola vez por página, al montarse la primera. */
function SceneStyles() {
  useInsertionEffect(() => {
    if (typeof document === 'undefined' || document.head.querySelector('style[data-escenas]')) return;
    const el = document.createElement('style');
    el.setAttribute('data-escenas', '');
    el.textContent = SCENES_CSS;
    document.head.appendChild(el);
  }, []);
  return null;
}

/** Monta su contenido cuando el bloque está a menos de `margin` de la vista; antes reserva el espacio. */
export function WhenNear({ children, className, margin = '900px' }: { children: ReactNode; className?: string; margin?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setNear(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect(); } }, { rootMargin: `${margin} 0px` });
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return <div ref={ref} className={className}>{near ? <><SceneStyles />{children}</> : null}</div>;
}

/** Verdadero en pantallas anchas (escritorio), donde el método usa el visual fijo. */
export function useWide(query = '(min-width: 1024px)'): boolean {
  const get = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.(query).matches);
  const [wide, setWide] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return wide;
}

/** Escenas de los tres pasos de «Cómo funciona», en orden. */
export const METHOD_SCENES = [SceneInterview, SceneEvidence, ScenePriority] as const;

export { SceneDevice };
