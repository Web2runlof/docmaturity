import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/brand/Logo';
import { SkipLink, buttonClass } from '@/components/ui';
import { cx } from '@/utils/core';

const LINKS = [
  { to: '/como-funciona', label: 'Cómo funciona' },
  { to: '/metodologia', label: 'Metodología' },
  { to: '/referentes', label: 'Referentes' },
  { to: '/privacidad', label: 'Privacidad' },
  { to: '/responder', label: 'Responder entrevista' },
];

/** Autoría del producto (pie de página). */
export const AUTHOR = { name: 'Sergio Gómez Flórez', url: 'https://www.linkedin.com/in/sergio-gomez-florez/' } as const;

export function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const home = pathname === '/';
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => setOpen(false), [pathname]);
  // En la portada el encabezado es transparente sobre el héroe hasta que la persona se desplaza.
  const solid = !home || scrolled || open;

  return (
    <div className="min-h-screen bg-white">
      <SkipLink />
      {/* Navegación flotante en forma de cápsula; sobre el héroe es translúcida. */}
      <header className={cx('on-dark z-40 px-3 pt-3 text-white md:px-5', home ? 'fixed inset-x-0 top-0' : 'sticky top-0 bg-midnight pb-3')}>
        <div className={cx('mx-auto flex h-14 max-w-[1180px] items-center justify-between rounded-full border pr-2 pl-4 transition-[background-color,border-color,box-shadow] duration-300 md:pl-5', solid ? 'border-white/12 bg-midnight/80 shadow-[0_20px_50px_-25px_rgba(0,0,0,0.8)] backdrop-blur-xl' : 'border-white/10 bg-white/[0.04] backdrop-blur-md')}>
          <Link to="/" aria-label="DOCMATURITY, inicio" className="rounded-full"><Logo inverted /></Link>
          <nav aria-label="Sitio" className="hidden items-center gap-1 xl:flex">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => cx('rounded-full px-3.5 py-2 text-sm transition-colors duration-200', isActive ? 'bg-white/10 text-white' : 'text-[#cfd7e3] hover:bg-white/[0.06] hover:text-white')}>{l.label}</NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/app" className={buttonClass('primary', 'sm', 'hidden h-10 rounded-full px-5 sm:inline-flex')}>Abrir aplicación</Link>
            <button className="flex size-10 items-center justify-center rounded-full text-white hover:bg-white/10 xl:hidden" onClick={() => setOpen(!open)} aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open}>{open ? <X className="size-5" /> : <Menu className="size-5" />}</button>
          </div>
        </div>
        {open && (
          <nav aria-label="Sitio móvil" className="page-in mx-auto mt-2 max-w-[1180px] rounded-[24px] border border-white/12 bg-midnight/95 px-5 pt-2 pb-5 backdrop-blur-xl xl:hidden">
            {LINKS.map((l) => <Link key={l.to} to={l.to} className="flex min-h-12 items-center border-b border-white/[0.06] text-[0.95rem] text-slate-200">{l.label}</Link>)}
            <Link to="/app" className={buttonClass('primary', 'md', 'mt-4 w-full rounded-full')}>Abrir aplicación</Link>
          </nav>
        )}
      </header>
      <main id="contenido" tabIndex={-1} className="outline-none"><Outlet /></main>
      <footer className="on-dark border-t border-white/10 bg-midnight text-fog">
        <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-14 md:grid-cols-[1.5fr_1fr_1fr_1fr] md:px-8">
          <div>
            <Logo inverted />
            <p className="mt-5 max-w-sm text-sm leading-relaxed">Diagnóstico de madurez en gestión documental y gobierno de la información. Herramienta independiente: no está avalada por el AGN, ISO ni otras organizaciones citadas como referentes.</p>
          </div>
          <FooterCol title="Producto" links={[['/app', 'Aplicación'], ['/responder', 'Responder una entrevista'], ['/app/academico', 'Laboratorio académico']]} />
          <FooterCol title="Metodología" links={[['/metodologia', 'Modelo DIAM, versión 1.0'], ['/como-funciona', 'Cómo funciona'], ['/app/biblioteca', 'Biblioteca metodológica']]} />
          <FooterCol title="Confianza" links={[['/referentes', 'Referentes y fuentes'], ['/privacidad', 'Privacidad y datos locales']]} />
        </div>
        <div aria-hidden className="pointer-events-none mx-auto max-w-[1280px] overflow-hidden px-5 select-none md:px-8">
          <p className="bg-gradient-to-b from-white/[0.14] to-white/0 bg-clip-text font-display text-[12.6vw] leading-[0.82] font-semibold tracking-[-0.055em] text-transparent xl:text-[10.6rem]">DOCMATURITY</p>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-5 py-5 text-xs md:flex-row md:items-center md:justify-between md:px-8">
            <p>Código abierto bajo licencia MIT. Los referentes citados conservan sus propias licencias.</p>
            <p>
              Diseñado y creado por:{' '}
              <a href={AUTHOR.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium text-white underline decoration-mint/60 underline-offset-4 transition-colors hover:text-mint">
                {AUTHOR.name}<ArrowUpRight className="size-3" aria-hidden /><span className="sr-only"> (perfil de LinkedIn, se abre en una pestaña nueva)</span>
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="text-sm">
      <p className="mb-4 text-sm font-medium text-white">{title}</p>
      <ul className="space-y-2.5">
        {links.map(([to, label]) => <li key={to}><Link to={to} className="transition-colors hover:text-white">{label}</Link></li>)}
      </ul>
    </div>
  );
}
