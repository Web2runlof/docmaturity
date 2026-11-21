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
      <header className={cx('on-dark z-40 text-white transition-[background-color,border-color] duration-300', home ? 'fixed inset-x-0 top-0' : 'sticky top-0', solid ? 'border-b border-white/10 bg-midnight/90 backdrop-blur-md' : 'border-b border-transparent bg-transparent')}>
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 md:px-8">
          <Link to="/" aria-label="DOCMATURITY, inicio"><Logo inverted /></Link>
          <nav aria-label="Sitio" className="hidden items-center gap-7 xl:flex">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => cx('relative text-sm transition-colors duration-200 after:absolute after:-bottom-1.5 after:left-0 after:h-px after:bg-mint after:transition-all after:duration-300', isActive ? 'text-white after:w-full' : 'text-fog after:w-0 hover:text-white hover:after:w-full')}>{l.label}</NavLink>
            ))}
            <Link to="/app" className={buttonClass('primary', 'sm', 'h-9 px-4')}>Abrir aplicación</Link>
          </nav>
          <div className="flex items-center gap-2 xl:hidden">
            <Link to="/app" className={buttonClass('primary', 'sm', 'hidden h-9 px-4 sm:inline-flex')}>Abrir aplicación</Link>
            <button className="flex size-10 items-center justify-center rounded-md text-white" onClick={() => setOpen(!open)} aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open}>{open ? <X className="size-5" /> : <Menu className="size-5" />}</button>
          </div>
        </div>
        {open && (
          <nav aria-label="Sitio móvil" className="border-t border-white/10 px-5 pb-5 pt-2 xl:hidden">
            {LINKS.map((l) => <Link key={l.to} to={l.to} className="flex min-h-11 items-center border-b border-white/5 text-[0.95rem] text-slate-200">{l.label}</Link>)}
            <Link to="/app" className={buttonClass('primary', 'md', 'mt-4 w-full')}>Abrir aplicación</Link>
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
      <p className="eyebrow mb-4">{title}</p>
      <ul className="space-y-2.5">
        {links.map(([to, label]) => <li key={to}><Link to={to} className="transition-colors hover:text-white">{label}</Link></li>)}
      </ul>
    </div>
  );
}
