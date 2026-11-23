/**
 * Carrusel de imágenes de la portada: desplazamiento horizontal nativo con imanes, arrastre con
 * el ratón, avance automático pausable (WCAG 2.2.2), teclado y movimiento reducido.
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react';
import { ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react';
import { useReducedMotion } from '@/components/motion';
import { cx } from '@/utils/core';

export interface Slide { src: string; small: string; tag: string; title: string; text: string }

const DURATION = 6000;

export function Carousel({ slides, label }: { slides: Slide[]; label: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const [inView, setInView] = useState(false);
  const reduced = useReducedMotion();
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const n = slides.length;

  // Diapositiva activa: la que ocupa la mayor parte del carril.
  useEffect(() => {
    const root = track.current;
    if (!root) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting && e.intersectionRatio >= 0.6) setActive(Number((e.target as HTMLElement).dataset.index));
    }, { root, threshold: [0.6] });
    Array.from(root.children).forEach((c) => io.observe(c));
    const vis = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.3 });
    vis.observe(root);
    return () => { io.disconnect(); vis.disconnect(); };
  }, []);

  const go = useCallback((i: number) => {
    const root = track.current;
    if (!root) return;
    const target = ((i % n) + n) % n;
    const el = root.children[target] as HTMLElement | undefined;
    if (!el) return;
    const pad = parseFloat(getComputedStyle(root).paddingLeft) || 0;
    root.scrollTo({ left: el.offsetLeft - pad, behavior: reduced ? 'auto' : 'smooth' });
  }, [n, reduced]);

  // Arrastre con ratón (en pantallas táctiles el desplazamiento es nativo).
  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || !track.current) return;
    drag.current = { x: e.clientX, left: track.current.scrollLeft, moved: false };
    track.current.style.scrollSnapType = 'none';
    track.current.setPointerCapture(e.pointerId);
  };
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || !track.current) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 4) d.moved = true;
    track.current.scrollLeft = d.left - dx;
  };
  const onUp = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || !track.current) return;
    drag.current = null;
    track.current.releasePointerCapture(e.pointerId);
    track.current.style.scrollSnapType = '';
    if (d.moved) { const dx = e.clientX - d.x; go(active + (dx < -40 ? 1 : dx > 40 ? -1 : 0)); }
  };

  const autoplay = !reduced && !userPaused;
  const running = autoplay && !hover && inView;

  return (
    <div aria-roledescription="carrusel" aria-label={label} className="relative" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onFocus={() => setHover(true)} onBlur={() => setHover(false)}>
      <div
        ref={track}
        tabIndex={0}
        aria-label={`${label}: use las flechas para cambiar de diapositiva`}
        onKeyDown={(e) => { if (e.key === 'ArrowRight') { e.preventDefault(); go(active + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(active - 1); } }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        className="relative flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-5 px-5 pb-2 [scrollbar-width:none] select-none md:scroll-px-[max(2rem,calc((100vw-1240px)/2))] md:px-[max(2rem,calc((100vw-1240px)/2))] [&::-webkit-scrollbar]:hidden cursor-grab active:cursor-grabbing"
      >
        {slides.map((s, i) => (
          <figure key={s.title} data-index={i} role="group" aria-roledescription="diapositiva" aria-label={`${i + 1} de ${n}: ${s.title}`} className={cx('relative m-0 w-[88%] shrink-0 snap-start overflow-hidden rounded-[22px] border border-white/10 bg-elevated transition-[opacity,transform] duration-500 md:w-[74%] lg:w-[min(1000px,72vw)]', i === active ? 'opacity-100' : 'opacity-55')}>
            <div className="relative aspect-[16/10] overflow-hidden">
              <img src={s.small} srcSet={`${s.small} 960w, ${s.src} 1600w`} sizes="(min-width: 1024px) 1000px, 88vw" alt={`Pantalla de DOCMATURITY: ${s.title} (datos de demostración)`} loading="lazy" decoding="async" draggable={false} className={cx('size-full object-cover object-top', i === active && 'kenburns')} />
              <div aria-hidden className="absolute inset-0 hidden bg-gradient-to-t from-midnight via-midnight/25 to-transparent md:block" />
            </div>
            <figcaption className="flex flex-col gap-2 p-5 md:absolute md:inset-x-0 md:bottom-0 md:flex-row md:items-end md:justify-between md:gap-8 md:p-8">
              <div className="max-w-xl">
                <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">{s.tag}</span>
                <p className="mt-3 font-display text-[1.35rem] leading-tight font-semibold tracking-[-0.02em] text-white md:text-[2.1rem]">{s.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-fog md:text-base">{s.text}</p>
              </div>
              <span className="shrink-0 font-display text-sm text-fog num">{String(i + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</span>
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="mx-auto mt-6 flex max-w-[1240px] items-center justify-between gap-4 px-5 md:px-8">
        <ol className="flex flex-1 items-center gap-2" aria-label="Diapositivas">
          {slides.map((s, i) => (
            <li key={s.title} className="flex-1">
              <button type="button" onClick={() => go(i)} aria-label={`Ir a la diapositiva ${i + 1}: ${s.title}`} aria-current={i === active ? 'true' : undefined} className="group flex h-8 w-full items-center">
                <span className="relative block h-[3px] w-full overflow-hidden rounded-full bg-white/15 transition-colors group-hover:bg-white/30">
                  {i < active && <span className="absolute inset-0 bg-white/60" />}
                  {i === active && (autoplay
                    ? <span key={`${active}-${userPaused}`} className="carousel-progress absolute inset-0 bg-mint" style={{ '--carousel-dur': `${DURATION}ms`, animationPlayState: running ? 'running' : 'paused' } as CSSProperties} onAnimationEnd={() => go(active + 1)} />
                    : <span className="absolute inset-0 bg-mint" />)}
                </span>
              </button>
            </li>
          ))}
        </ol>
        <div className="flex shrink-0 items-center gap-2">
          {!reduced && (
            <button type="button" onClick={() => setUserPaused((x) => !x)} aria-label={userPaused ? 'Reanudar el carrusel' : 'Pausar el carrusel'} className="flex size-11 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10">
              {userPaused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
            </button>
          )}
          <button type="button" onClick={() => go(active - 1)} aria-label="Diapositiva anterior" className="flex size-11 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10"><ArrowLeft className="size-4" aria-hidden /></button>
          <button type="button" onClick={() => go(active + 1)} aria-label="Diapositiva siguiente" className="flex size-11 items-center justify-center rounded-full bg-mint text-midnight transition-colors hover:bg-mint-hover"><ArrowRight className="size-4" aria-hidden /></button>
        </div>
      </div>
    </div>
  );
}
