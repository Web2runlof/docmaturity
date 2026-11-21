/**
 * Sistema de movimiento de DOCMATURITY. Todo efecto se apoya en CSS y APIs nativas
 * (IntersectionObserver, requestAnimationFrame) y se desactiva con «prefers-reduced-motion».
 * Reglas: sin scroll-jacking, sin bloquear interacciones y sin animaciones permanentes en
 * formularios, tablas o cuestionarios (ver docs/DESIGN_SYSTEM.md).
 */
import { createElement, useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { cx } from '@/utils/core';

const query = '(prefers-reduced-motion: reduce)';
export const prefersReducedMotion = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.(query).matches);

/** Preferencia de movimiento reducido, reactiva a cambios del sistema. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

/** Ejecuta `onEnter` una sola vez, cuando el elemento entra en la vista. */
export function useInViewOnce<T extends Element>(onEnter: () => void, rootMargin = '0px 0px -12% 0px') {
  const ref = useRef<T>(null);
  const cb = useRef(onEnter);
  cb.current = onEnter;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { cb.current(); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { cb.current(); io.disconnect(); }
    }, { rootMargin, threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return ref;
}

/** Aparición suave al entrar en la vista (opacidad y desplazamiento corto). */
export function Reveal({ as = 'div', delay = 0, className, children, style, ...rest }: { as?: ElementType; delay?: number; className?: string; children: ReactNode; style?: CSSProperties; id?: string; 'aria-label'?: string; 'aria-labelledby'?: string; role?: string }) {
  const [shown, setShown] = useState(false);
  const ref = useInViewOnce<HTMLElement>(() => setShown(true));
  return createElement(as, { ref, className: cx('reveal', shown && 'is-visible', className), style: { ...style, '--reveal-delay': `${delay}ms` } as CSSProperties, ...rest }, children);
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/**
 * Contador que aumenta hasta su valor final al entrar en la vista, una sola vez. El valor final
 * está siempre disponible para tecnologías de asistencia.
 */
export function AnimatedCounter({ value, duration = 1100, format = (n: number) => n.toLocaleString('es-CO'), className }: { value: number; duration?: number; format?: (n: number) => string; className?: string }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value : 0);
  const done = useRef(false);
  const ref = useInViewOnce<HTMLSpanElement>(() => {
    if (done.current) return;
    done.current = true;
    if (prefersReducedMotion()) { setShown(value); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(Math.round(value * easeOutCubic(t)));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  return (
    <span ref={ref} className={cx('num', className)}>
      <span aria-hidden>{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}

/**
 * Paralaje vertical moderado para una capa decorativa. Usa transform (sin reflujo), se calcula en
 * requestAnimationFrame y se desactiva con movimiento reducido. No intercepta el desplazamiento.
 */
export function useParallax<T extends HTMLElement>(factor = 0.08) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const center = r.top + r.height / 2 - window.innerHeight / 2;
      el.style.transform = `translate3d(0, ${(-center * factor).toFixed(1)}px, 0)`;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (frame) cancelAnimationFrame(frame); };
  }, [factor]);
  return ref;
}

/** Pausa las animaciones decorativas (flotación, luz ambiental, Ken Burns) del bloque cuando no está visible. */
export function MotionScope({ as = 'div', className, children, ...rest }: { as?: ElementType; className?: string; children: ReactNode; id?: string; 'aria-labelledby'?: string; 'aria-label'?: string }) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return createElement(as, { ref, className, 'data-motion': visible ? 'running' : 'paused', ...rest }, children);
}

/** Avance (0–1) del desplazamiento a través de un bloque, para líneas de progreso. No altera el desplazamiento. */
export function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [progress, setProgress] = useState(prefersReducedMotion() ? 1 : 0);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) { setProgress(1); return; }
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = (vh * 0.75 - r.top) / (r.height + vh * 0.25);
      setProgress(Math.max(0, Math.min(1, p)));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (frame) cancelAnimationFrame(frame); };
  }, []);
  return [ref, progress] as const;
}

/**
 * Imagen ambiental decorativa (WebP local, dos anchos). Se carga de forma diferida salvo en el
 * héroe, no se anuncia a lectores de pantalla y cuenta con color de respaldo en su contenedor.
 */
export function AmbientImage({ small, large, className, eager = false, kenburns = false }: { small: string; large: string; className?: string; eager?: boolean; kenburns?: boolean }) {
  return (
    <img
      src={small}
      srcSet={`${small} 1024w, ${large} 1920w`}
      sizes="100vw"
      alt=""
      aria-hidden
      draggable={false}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={cx('pointer-events-none absolute inset-0 size-full object-cover select-none', kenburns && 'kenburns', className)}
    />
  );
}
