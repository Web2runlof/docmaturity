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

/** Progreso (0–1) de un elemento mientras cruza la vista, con origen y recorrido configurables. */
export function useElementProgress<T extends HTMLElement>(start = 0.9, span = 0.6) {
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
      setProgress(Math.max(0, Math.min(1, (vh * start - r.top) / (vh * span))));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (frame) cancelAnimationFrame(frame); };
  }, [start, span]);
  return [ref, progress] as const;
}

/**
 * Video de fondo decorativo (local, silenciado, en bucle). Se reproduce solo mientras está en la
 * vista; con movimiento reducido o ahorro de datos se muestra únicamente el póster.
 */
export function BackgroundVideo({ webm, mp4, poster, className }: { webm: string; mp4: string; poster: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();
  const saveData = typeof navigator !== 'undefined' && Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
  const still = reduced || saveData;
  useEffect(() => {
    const v = ref.current;
    if (!v || still) return;
    v.muted = true;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) void v.play().catch(() => undefined); else v.pause(); }, { threshold: 0.05 });
    io.observe(v);
    return () => { io.disconnect(); v.pause(); };
  }, [still]);
  const cls = cx('pointer-events-none absolute inset-0 size-full object-cover select-none', className);
  if (still) return <img src={poster} alt="" aria-hidden className={cls} />;
  return (
    <video ref={ref} className={cls} poster={poster} muted loop playsInline autoPlay preload="metadata" aria-hidden tabIndex={-1} disablePictureInPicture disableRemotePlayback>
      <source src={webm} type="video/webm" />
      <source src={mp4} type="video/mp4" />
    </video>
  );
}

/** Marquesina continua: la segunda copia es decorativa y se oculta a tecnologías de asistencia. */
export function Marquee({ items, label, reverse = false, duration = 48, className, itemClassName }: { items: ReactNode[]; label: string; reverse?: boolean; duration?: number; className?: string; itemClassName?: string }) {
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined} aria-label={hidden ? undefined : label}>
      {items.map((it, i) => <li key={i} className={cx('flex shrink-0 items-center', itemClassName)}>{it}</li>)}
    </ul>
  );
  return (
    <div className={cx('marquee overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]', className)}>
      <div className={cx('marquee-track flex w-max', reverse && 'is-reverse')} style={{ '--marquee-dur': `${duration}s` } as CSSProperties}>
        {row(false)}{row(true)}
      </div>
    </div>
  );
}

/**
 * Palabra que rota con una transición breve; el texto completo queda disponible para lectores de
 * pantalla. Todas las variantes ocupan la misma celda, centradas: el ancho no cambia y nada salta.
 */
export function WordRotator({ words, prefix, interval = 2600, className, wordClassName }: { words: string[]; prefix?: string; interval?: number; className?: string; wordClassName?: string }) {
  const [i, setI] = useState(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced || words.length < 2) return;
    const id = window.setInterval(() => setI((x) => (x + 1) % words.length), interval);
    return () => window.clearInterval(id);
  }, [reduced, words.length, interval]);
  return (
    <span className={cx('relative inline-grid justify-items-center', className)}>
      <span className="sr-only">{prefix ? `${prefix} ` : ''}{words.join(', ')}</span>
      {words.map((w, k) => (
        <span key={k === i ? `on-${i}` : k} aria-hidden className={cx('whitespace-nowrap [grid-area:1/1]', k === i ? 'word-in' : 'invisible')}>
          {prefix && <>{prefix} </>}<span className={wordClassName}>{w}</span>
        </span>
      ))}
    </span>
  );
}

/** Texto que se ilumina palabra por palabra según el desplazamiento (sin interceptarlo). */
export function ScrollRevealText({ text, className, as = 'p', id }: { text: string; className?: string; as?: ElementType; id?: string }) {
  const [ref, p] = useElementProgress<HTMLDivElement>(0.85, 0.7);
  const words = text.split(' ');
  return (
    <div ref={ref}>
      {createElement(as, { className, id }, words.map((w, k) => {
        const o = Math.max(0.16, Math.min(1, p * words.length * 1.15 - k));
        return <span key={k} style={{ opacity: o, transition: 'opacity 120ms linear' }}>{w}{k < words.length - 1 ? ' ' : ''}</span>;
      }))}
    </div>
  );
}

/** Luz que sigue al puntero: actualiza --mx y --my en el elemento `.spotlight` bajo el puntero. */
export function useSpotlight() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const on = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.('.spotlight') as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    document.addEventListener('pointermove', on, { passive: true });
    return () => document.removeEventListener('pointermove', on);
  }, []);
}

const finePointer = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches;

/**
 * Botones «magnéticos»: los elementos con `data-magnetic` se desplazan levemente hacia el puntero.
 * Solo con ratón o panel táctil y sin movimiento reducido.
 */
export function useMagnetic(strength = 0.22, max = 8) {
  useEffect(() => {
    if (prefersReducedMotion() || !finePointer()) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-magnetic]'));
    const offs: Array<() => void> = [];
    for (const el of els) {
      const move = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const dx = Math.max(-max, Math.min(max, (e.clientX - (r.left + r.width / 2)) * strength));
        const dy = Math.max(-max, Math.min(max, (e.clientY - (r.top + r.height / 2)) * strength));
        el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      };
      const leave = () => { el.style.transform = ''; };
      el.style.transition = 'transform 260ms cubic-bezier(0.22,1,0.36,1)';
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerleave', leave);
      offs.push(() => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); el.style.transform = ''; });
    }
    return () => offs.forEach((f) => f());
  }, [strength, max]);
}

/**
 * Inclinación 3D según la posición del puntero sobre un elemento. Devuelve la referencia y los
 * grados actuales (x, y); en reposo, con movimiento reducido o en pantallas táctiles, ambos son 0.
 */
export function usePointerTilt<T extends HTMLElement>(maxDeg = 4) {
  const ref = useRef<T>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || !finePointer()) return;
    let frame = 0;
    const move = (e: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        setTilt({ x: -py * maxDeg, y: px * maxDeg });
      });
    };
    const leave = () => setTilt({ x: 0, y: 0 });
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); if (frame) cancelAnimationFrame(frame); };
  }, [maxDeg]);
  return [ref, tilt] as const;
}

/** Divide un texto en palabras que entran escalonadas al cargar (no depende del desplazamiento). */
export function SplitWords({ text, start = 0 }: { text: string; start?: number }) {
  return (
    <>
      {text.split(' ').map((w, k, arr) => (
        <span key={k}><span className="hero-word" style={{ '--i': start + k } as CSSProperties}>{w}</span>{k < arr.length - 1 ? ' ' : ''}</span>
      ))}
    </>
  );
}

/** Índice del paso activo de una narrativa con desplazamiento: el que cruza el centro de la vista. */
export function useActiveStep(count: number) {
  const refs = useRef<Array<HTMLElement | null>>([]);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
    }, { rootMargin: '-45% 0px -45% 0px' });
    refs.current.slice(0, count).forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [count]);
  const bind = (i: number) => (el: HTMLElement | null) => { refs.current[i] = el; };
  return [active, bind] as const;
}
