import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Logo } from '@/components/brand/Logo';
import { SkipLink } from '@/components/ui';
import { cx } from '@/utils/core';

const LINKS = [
  { to: '/como-funciona', label: 'Cómo funciona' },
  { to: '/metodologia', label: 'Metodología' },
  { to: '/referentes', label: 'Referentes' },
  { to: '/privacidad', label: 'Privacidad' },
  { to: '/responder', label: 'Responder entrevista' },
];

export function PublicLayout() {
  const [open, setOpen] = useState(false);
  const dark = useLocation().pathname === '/';
  return (
    <div className="min-h-screen bg-white">
      <SkipLink />
      <header className={cx('sticky top-0 z-30 border-b backdrop-blur', dark ? 'border-white/10 bg-[#07131D]/85 text-white' : 'border-line bg-white/95')}>
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-5 md:px-8">
          <Link to="/" aria-label="DOCMATURITY, inicio"><Logo inverted={dark} /></Link>
          <nav aria-label="Sitio" className="hidden items-center gap-6 lg:flex">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => cx('text-sm transition-colors', dark ? 'text-slate-300 hover:text-white' : isActive ? 'font-medium text-navy' : 'text-muted hover:text-navy')}>{l.label}</NavLink>
            ))}
            <Link to="/app" className={cx('inline-flex h-9 items-center rounded-md px-4 text-sm font-medium', dark ? 'bg-white text-[#07131D] hover:bg-slate-100' : 'bg-navy text-white hover:bg-navy-dark')}>Abrir aplicación</Link>
          </nav>
          <button className="lg:hidden" onClick={() => setOpen(!open)} aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open}>{open ? <X className="size-5" /> : <Menu className="size-5" />}</button>
        </div>
        {open && (
          <nav aria-label="Sitio móvil" className={cx('border-t px-5 py-3 lg:hidden', dark ? 'border-white/10' : 'border-line')}>
            {LINKS.map((l) => <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className={cx('block py-2 text-sm', dark ? 'text-slate-200' : 'text-ink')}>{l.label}</Link>)}
            <Link to="/app" onClick={() => setOpen(false)} className="mt-2 inline-flex h-9 items-center rounded-md bg-navy px-4 text-sm font-medium text-white">Abrir aplicación</Link>
          </nav>
        )}
      </header>
      <main id="contenido" tabIndex={-1} className="outline-none"><Outlet /></main>
      <footer className="border-t border-line bg-canvas">
        <div className="mx-auto grid max-w-[1240px] gap-8 px-5 py-12 md:grid-cols-[1.4fr_1fr_1fr] md:px-8">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-sm text-muted">Diagnóstico de madurez en gestión documental y gobierno de la información. Herramienta independiente: no está avalada por el AGN, ISO ni otras organizaciones citadas como referentes.</p>
          </div>
          <div className="text-sm">
            <p className="eyebrow mb-3">Producto</p>
            <ul className="space-y-2 text-muted">
              <li><Link to="/app" className="hover:text-navy">Aplicación</Link></li>
              <li><Link to="/responder" className="hover:text-navy">Responder una entrevista</Link></li>
              <li><Link to="/app/academico" className="hover:text-navy">Laboratorio académico</Link></li>
            </ul>
          </div>
          <div className="text-sm">
            <p className="eyebrow mb-3">Metodología</p>
            <ul className="space-y-2 text-muted">
              <li><Link to="/metodologia" className="hover:text-navy">Modelo DIAM, versión 1.0</Link></li>
              <li><Link to="/referentes" className="hover:text-navy">Referentes y fuentes</Link></li>
              <li><Link to="/privacidad" className="hover:text-navy">Privacidad y datos locales</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-line py-4 text-center text-xs text-muted">Código abierto bajo licencia MIT. Los referentes citados conservan sus propias licencias.</div>
      </footer>
    </div>
  );
}
