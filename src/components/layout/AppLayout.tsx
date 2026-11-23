import { NavLink, Outlet, useLocation, useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowRight, BarChart3, BookOpen, Building2, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, FileCheck2, FileText, FolderKanban, GraduationCap, Home, Library, ListChecks,
  Map, Menu, MessagesSquare, Scale, Settings, ShieldAlert, SlidersHorizontal, X,
} from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { SkipLink } from '@/components/ui';
import { Logo } from '@/components/brand/Logo';
import { useUI } from '@/app/store';
import { db } from '@/database/db';
import { STATUS_LABEL } from '@/config/vocabulary';
import { cx } from '@/utils/core';
import { useNextStep } from './nextStep';

interface Item { to: string; label: string; icon: ReactNode; end?: boolean; /** Se desactiva dentro de una evaluación: allí se resalta el elemento contextual. */ yieldsToContext?: boolean }
interface Group { title: string; items: Item[] }

const GROUPS: Group[] = [
  {
    title: 'Trabajo',
    items: [
      { to: '/app', label: 'Inicio', icon: <Home className="size-4" />, end: true },
      { to: '/app/organizaciones', label: 'Organizaciones', icon: <Building2 className="size-4" /> },
      { to: '/app/evaluaciones', label: 'Evaluaciones', icon: <FolderKanban className="size-4" />, yieldsToContext: true },
      { to: '/app/cuestionarios', label: 'Cuestionarios', icon: <ClipboardList className="size-4" /> },
    ],
  },
  {
    title: 'Conocimiento',
    items: [
      { to: '/app/biblioteca', label: 'Biblioteca metodológica', icon: <Library className="size-4" /> },
      { to: '/app/academico', label: 'Laboratorio académico', icon: <GraduationCap className="size-4" /> },
    ],
  },
  { title: 'Sistema', items: [{ to: '/app/configuracion', label: 'Configuración', icon: <Settings className="size-4" /> }] },
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

const IN_ASSESSMENT = /^\/app\/evaluaciones\/[0-9a-f-]{36}/;

function NavItems({ items, collapsed, onNavigate }: { items: Item[]; collapsed: boolean; onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const inContext = IN_ASSESSMENT.test(pathname);
  return (
    <ul className="space-y-0.5">
      {items.map((it) => (
        <li key={it.to}>
          <NavLink
            to={it.to}
            end={it.end}
            onClick={onNavigate}
            title={collapsed ? it.label : undefined}
            aria-current={it.yieldsToContext && inContext ? 'false' : 'page'}
            className={({ isActive }) => cx(
              'group relative flex min-h-9 items-center gap-3 rounded-md px-2.5 py-1.5 text-[0.8125rem] transition-colors duration-150',
              isActive && !(it.yieldsToContext && inContext) ? 'bg-white/[0.07] font-medium text-white' : 'text-fog hover:bg-white/[0.04] hover:text-white',
              collapsed && 'justify-center',
            )}
          >
            {({ isActive: matched }) => { const isActive = matched && !(it.yieldsToContext && inContext); return (
              <>
                <span aria-hidden className={cx('absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-r-full bg-mint transition-opacity duration-200', isActive ? 'opacity-100' : 'opacity-0')} />
                <span className={cx('shrink-0 transition-colors', isActive ? 'text-mint' : 'text-fog/80 group-hover:text-white')} aria-hidden>{it.icon}</span>
                <span className={collapsed ? 'sr-only' : 'truncate'}>{it.label}</span>
              </>
            ); }}
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
        <li><Link to="/app" className="rounded-sm hover:text-navy">Inicio</Link></li>
        {crumbs.map((c, i) => (
          <li key={c.to} className="flex min-w-0 items-center gap-1.5">
            <ChevronRight className="size-3 shrink-0 text-[#b8c4d4]" aria-hidden />
            {i === crumbs.length - 1 ? <span aria-current="page" className="truncate font-medium text-ink">{c.label}</span> : <Link to={c.to} className="truncate rounded-sm hover:text-navy">{c.label}</Link>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Indicador del siguiente paso de la evaluación abierta (encabezado). */
function NextStepChip({ aid }: { aid: string }) {
  const next = useNextStep(aid);
  const { pathname } = useLocation();
  if (!next || pathname === next.to) return null;
  const done = next.index >= next.total;
  return (
    <Link to={next.to} title={next.hint} className="group ml-auto hidden shrink-0 items-center gap-2 rounded-full border border-line bg-soft py-1 pr-2.5 pl-1 text-xs text-ink transition-colors hover:border-mint-strong/40 hover:bg-mint-soft md:inline-flex">
      <span className={cx('flex size-6 items-center justify-center rounded-full text-[10px] font-bold num', done ? 'bg-mint-soft text-mint-strong' : 'bg-midnight text-mint')} aria-hidden>{done ? <CheckCircle2 className="size-3.5" /> : next.index + 1}</span>
      <span><span className="text-muted">Siguiente paso:</span> <span className="font-semibold">{next.label}</span></span>
      <ArrowRight className="size-3.5 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

/** Tarjeta de la evaluación activa en la barra lateral, con avance del ciclo y siguiente paso. */
function ActiveAssessmentCard({ aid, name, orgName, status, tag, onNavigate }: { aid: string; name: string; orgName?: string; status: string; tag?: string; onNavigate?: () => void }) {
  const next = useNextStep(aid);
  const pct = next ? Math.round((Math.min(next.index, next.total) / next.total) * 100) : 0;
  return (
    <div className="mx-0.5 mb-2 rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
      <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-mint uppercase">Evaluación activa</p>
      <p className="mt-1.5 truncate text-[0.8125rem] font-semibold text-white" title={name}>{name}</p>
      <p className="truncate text-[0.7rem] text-fog">{orgName}{tag ? ` · ${tag}` : ''}</p>
      <div className="mt-3 flex items-center justify-between text-[0.7rem] text-fog"><span>{status}</span><span className="num">{pct} %</span></div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Avance del ciclo de trabajo" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className="h-full rounded-full bg-mint transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      {next && next.index < next.total && (
        <Link to={next.to} onClick={onNavigate} className="mt-2.5 flex items-center justify-between gap-2 rounded-md text-[0.75rem] text-white hover:text-mint">
          <span className="truncate"><span className="text-fog">Siguiente:</span> {next.label}</span><ArrowRight className="size-3.5 shrink-0" aria-hidden />
        </Link>
      )}
    </div>
  );
}

export function AppLayout() {
  const { aid: routeAid } = useParams();
  const { pathname } = useLocation();
  const { sidebarCollapsed, toggleSidebar, mobileNavOpen, setMobileNav, activeAssessmentId, setActiveAssessment } = useUI();
  const aid = routeAid ?? activeAssessmentId ?? undefined;
  const assessment = useLiveQuery(() => (aid ? db.assessments.get(aid) : undefined), [aid]);
  useEffect(() => { if (routeAid) setActiveAssessment(routeAid); }, [routeAid, setActiveAssessment]);
  // Si la evaluación recordada ya no existe (fue eliminada), se olvida.
  useEffect(() => {
    if (!routeAid && activeAssessmentId) void db.assessments.get(activeAssessmentId).then((x) => { if (!x) setActiveAssessment(null); });
  }, [routeAid, activeAssessmentId, setActiveAssessment]);
  const org = useLiveQuery(() => (assessment ? db.organizations.get(assessment.organizationId) : undefined), [assessment?.organizationId]);

  // Menú móvil: Escape lo cierra y el foco vuelve al botón que lo abrió.
  const opener = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!mobileNavOpen) return;
    const trigger = opener.current;
    drawer.current?.querySelector<HTMLElement>('a, button')?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileNav(false); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); trigger?.focus(); };
  }, [mobileNavOpen, setMobileNav]);
  useEffect(() => { setMobileNav(false); }, [pathname, setMobileNav]);

  const sidebar = (collapsed: boolean, onNavigate?: () => void) => (
    <div className="flex h-full flex-col">
      <div className={cx('flex h-14 shrink-0 items-center px-4', collapsed && 'justify-center px-2')}>
        <Link to="/" aria-label="Ir al sitio público" className="rounded-sm"><Logo inverted compact={collapsed} /></Link>
      </div>
      <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto px-2 pt-3 pb-4">
        {GROUPS.map((g, gi) => (
          <div key={g.title} className={gi > 0 ? 'mt-5' : ''}>
            {collapsed ? (gi > 0 && <div className="mx-3 mb-3 h-px bg-white/[0.08]" aria-hidden />) : <p className="mb-1.5 px-2.5 text-[0.65rem] font-semibold tracking-[0.14em] text-fog/70 uppercase">{g.title}</p>}
            <NavItems items={g.items} collapsed={collapsed} onNavigate={onNavigate} />
          </div>
        ))}
        {aid && assessment && (
          <div className="mt-6 border-t border-white/[0.08] pt-5">
            {collapsed
              ? <div className="mx-3 mb-3 h-px bg-mint/40" aria-hidden />
              : <ActiveAssessmentCard aid={aid} name={assessment.name} orgName={org?.shortName || org?.name} status={STATUS_LABEL[assessment.status]} tag={assessment.isDemo ? 'demostración' : assessment.isAcademic ? 'caso académico' : undefined} onNavigate={onNavigate} />}
            <NavItems items={contextual(aid)} collapsed={collapsed} onNavigate={onNavigate} />
          </div>
        )}
      </nav>
      <div className="border-t border-white/[0.08] p-2">
        <Link to="/responder" onClick={onNavigate} className={cx('flex min-h-9 items-center gap-3 rounded-md px-2.5 py-1.5 text-[0.8125rem] text-fog hover:bg-white/[0.04] hover:text-white', collapsed && 'justify-center')} title="Responder una entrevista">
          <BookOpen className="size-4" aria-hidden />
          <span className={collapsed ? 'sr-only' : ''}>Modo entrevistado</span>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas">
      <SkipLink />
      <aside className={cx('on-dark fixed inset-y-0 left-0 z-30 hidden border-r border-white/[0.06] bg-midnight transition-[width] duration-200 lg:block', sidebarCollapsed ? 'w-16' : 'w-64')}>
        {sidebar(sidebarCollapsed)}
        <button onClick={toggleSidebar} className="absolute top-[60px] -right-3 flex size-6 items-center justify-center rounded-full border border-line bg-white text-muted shadow-sm transition-colors hover:text-navy" aria-label={sidebarCollapsed ? 'Expandir navegación' : 'Contraer navegación'}>
          {sidebarCollapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
        </button>
      </aside>
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navegación">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setMobileNav(false)} />
          <aside ref={drawer} className="on-dark page-in absolute inset-y-0 left-0 w-72 bg-midnight shadow-2xl">
            <button onClick={() => setMobileNav(false)} className="absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-md text-fog hover:bg-white/[0.06] hover:text-white" aria-label="Cerrar navegación"><X className="size-5" /></button>
            {sidebar(false, () => setMobileNav(false))}
          </aside>
        </div>
      )}
      <div className={cx('transition-[padding] duration-200', sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64')}>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur-md md:px-8">
          <button ref={opener} onClick={() => setMobileNav(true)} className="-ml-1.5 flex size-9 items-center justify-center rounded-md text-navy hover:bg-soft lg:hidden" aria-label="Abrir navegación"><Menu className="size-5" /></button>
          <Breadcrumbs />
          {routeAid && <NextStepChip aid={routeAid} />}
        </header>
        <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-[1400px] px-4 py-8 outline-none md:px-8">
          <div key={pathname} className="page-in"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}
