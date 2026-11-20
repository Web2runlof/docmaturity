import { NavLink, Outlet, useLocation, useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  BarChart3, BookOpen, Building2, ChevronLeft, ChevronRight, ClipboardList, FileCheck2, FileText, FolderKanban, GraduationCap, Home, Library, ListChecks,
  Map, Menu, MessagesSquare, Scale, Settings, ShieldAlert, SlidersHorizontal, X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { SkipLink } from '@/components/ui';
import { Logo } from '@/components/brand/Logo';
import { useUI } from '@/app/store';
import { db } from '@/database/db';
import { cx } from '@/utils/core';

interface Item { to: string; label: string; icon: ReactNode; end?: boolean }

const GLOBAL: Item[] = [
  { to: '/app', label: 'Inicio', icon: <Home className="size-4" />, end: true },
  { to: '/app/organizaciones', label: 'Organizaciones', icon: <Building2 className="size-4" /> },
  { to: '/app/evaluaciones', label: 'Evaluaciones', icon: <FolderKanban className="size-4" /> },
  { to: '/app/cuestionarios', label: 'Cuestionarios', icon: <ClipboardList className="size-4" /> },
  { to: '/app/biblioteca', label: 'Biblioteca metodológica', icon: <Library className="size-4" /> },
  { to: '/app/academico', label: 'Laboratorio académico', icon: <GraduationCap className="size-4" /> },
  { to: '/app/configuracion', label: 'Configuración', icon: <Settings className="size-4" /> },
];

const contextual = (aid: string): Item[] => [
  { to: `/app/evaluaciones/${aid}`, label: 'Resumen', icon: <FileCheck2 className="size-4" />, end: true },
  { to: `/app/evaluaciones/${aid}/alcance`, label: 'Alcance y metas', icon: <SlidersHorizontal className="size-4" /> },
  { to: `/app/evaluaciones/${aid}/entrevistas`, label: 'Entrevistas', icon: <MessagesSquare className="size-4" /> },
  { to: `/app/evaluaciones/${aid}/evidencias`, label: 'Evidencias', icon: <ListChecks className="size-4" /> },
  { to: `/app/evaluaciones/${aid}/validacion`, label: 'Mesa de validación', icon: <Scale className="size-4" /> },
  { to: `/app/evaluaciones/${aid}/resultados`, label: 'Resultados', icon: <BarChart3 className="size-4" /> },
  { to: `/app/evaluaciones/${aid}/brechas`, label: 'Brechas y riesgos', icon: <ShieldAlert className="size-4" /> },
  { to: `/app/evaluaciones/${aid}/hoja-de-ruta`, label: 'Hoja de ruta', icon: <Map className="size-4" /> },
  { to: `/app/evaluaciones/${aid}/informes`, label: 'Informes', icon: <FileText className="size-4" /> },
];

function NavItems({ items, collapsed, onNavigate }: { items: Item[]; collapsed: boolean; onNavigate?: () => void }) {
  return (
    <ul className="space-y-0.5">
      {items.map((it) => (
        <li key={it.to}>
          <NavLink
            to={it.to}
            end={it.end}
            onClick={onNavigate}
            title={collapsed ? it.label : undefined}
            className={({ isActive }) => cx(
              'flex items-center gap-3 rounded-md px-2.5 py-1.5 text-[0.8125rem] transition-colors duration-150',
              isActive ? 'bg-white/10 font-medium text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white',
              collapsed && 'justify-center',
            )}
          >
            <span className="shrink-0" aria-hidden>{it.icon}</span>
            <span className={collapsed ? 'sr-only' : ''}>{it.label}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

const SEGMENT_LABEL: Record<string, string> = {
  organizaciones: 'Organizaciones', evaluaciones: 'Evaluaciones', nueva: 'Nueva', editar: 'Editar', alcance: 'Alcance y metas', entrevistas: 'Entrevistas',
  evidencias: 'Evidencias', validacion: 'Mesa de validación', resultados: 'Resultados', brechas: 'Brechas y riesgos', 'hoja-de-ruta': 'Hoja de ruta',
  informes: 'Informes', biblioteca: 'Biblioteca metodológica', academico: 'Laboratorio académico', configuracion: 'Configuración', cuestionarios: 'Cuestionarios',
};

function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.replace(/^\/app\/?/, '').split('/').filter(Boolean);
  const names = useLiveQuery(async () => {
    const out: Record<string, string> = {};
    for (const p of parts) {
      if (p.length < 30) continue;
      const a = await db.assessments.get(p);
      if (a) { out[p] = a.name; continue; }
      const o = await db.organizations.get(p);
      if (o) out[p] = o.shortName || o.name;
      const i = await db.interviews.get(p);
      if (i) out[p] = 'Entrevista';
    }
    return out;
  }, [pathname]);
  const crumbs = parts.map((p, i) => ({ label: SEGMENT_LABEL[p] ?? names?.[p] ?? '…', to: `/app/${parts.slice(0, i + 1).join('/')}` }));
  return (
    <nav aria-label="Ruta de navegación" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
        <li><Link to="/app" className="hover:text-navy">Inicio</Link></li>
        {crumbs.map((c, i) => (
          <li key={c.to} className="flex min-w-0 items-center gap-1.5">
            <ChevronRight className="size-3 shrink-0" aria-hidden />
            {i === crumbs.length - 1 ? <span aria-current="page" className="truncate text-ink">{c.label}</span> : <Link to={c.to} className="truncate hover:text-navy">{c.label}</Link>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function AppLayout() {
  const { aid } = useParams();
  const { sidebarCollapsed, toggleSidebar, mobileNavOpen, setMobileNav } = useUI();
  const assessment = useLiveQuery(() => (aid ? db.assessments.get(aid) : undefined), [aid]);
  const org = useLiveQuery(() => (assessment ? db.organizations.get(assessment.organizationId) : undefined), [assessment?.organizationId]);

  const sidebar = (collapsed: boolean, onNavigate?: () => void) => (
    <div className="flex h-full flex-col">
      <div className={cx('flex h-14 items-center border-b border-white/10 px-4', collapsed && 'justify-center px-2')}>
        <Link to="/" aria-label="Ir al sitio público"><Logo inverted compact={collapsed} /></Link>
      </div>
      <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto px-2 py-4">
        <NavItems items={GLOBAL} collapsed={collapsed} onNavigate={onNavigate} />
        {aid && assessment && (
          <div className="mt-6">
            {!collapsed && (
              <div className="mb-2 px-2.5">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-gold">Evaluación activa</p>
                <p className="mt-1 truncate text-xs text-white" title={assessment.name}>{assessment.name}</p>
                <p className="truncate text-[0.7rem] text-slate-400">{org?.shortName || org?.name}{assessment.isDemo ? ' · demostración' : assessment.isAcademic ? ' · caso académico' : ''}</p>
              </div>
            )}
            <NavItems items={contextual(aid)} collapsed={collapsed} onNavigate={onNavigate} />
          </div>
        )}
      </nav>
      <div className="border-t border-white/10 p-2">
        <Link to="/responder" onClick={onNavigate} className={cx('flex items-center gap-3 rounded-md px-2.5 py-1.5 text-[0.8125rem] text-slate-300 hover:bg-white/5 hover:text-white', collapsed && 'justify-center')} title="Responder una entrevista">
          <BookOpen className="size-4" aria-hidden />
          <span className={collapsed ? 'sr-only' : ''}>Modo entrevistado</span>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas">
      <SkipLink />
      <aside className={cx('fixed inset-y-0 left-0 z-30 hidden bg-navy-dark transition-[width] duration-200 lg:block', sidebarCollapsed ? 'w-16' : 'w-64')}>
        {sidebar(sidebarCollapsed)}
        <button onClick={toggleSidebar} className="absolute -right-3 top-16 flex size-6 items-center justify-center rounded-full border border-line bg-white text-muted shadow-sm hover:text-navy" aria-label={sidebarCollapsed ? 'Expandir navegación' : 'Contraer navegación'}>
          {sidebarCollapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
        </button>
      </aside>
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-dark/50" onClick={() => setMobileNav(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-navy-dark">
            <button onClick={() => setMobileNav(false)} className="absolute right-3 top-4 text-slate-300" aria-label="Cerrar navegación"><X className="size-5" /></button>
            {sidebar(false, () => setMobileNav(false))}
          </aside>
        </div>
      )}
      <div className={cx('transition-[padding] duration-200', sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64')}>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-white/95 px-4 backdrop-blur md:px-8">
          <button onClick={() => setMobileNav(true)} className="text-navy lg:hidden" aria-label="Abrir navegación"><Menu className="size-5" /></button>
          <Breadcrumbs />
        </header>
        <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-[1400px] px-4 py-8 outline-none md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
