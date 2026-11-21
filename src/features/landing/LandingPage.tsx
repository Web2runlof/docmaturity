import { Suspense, lazy, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Database, FileJson, FileSearch, HardDriveDownload, KeyRound, Lock, WifiOff } from 'lucide-react';
import { DIMENSIONS, QUESTIONS, SOURCES, getDimensionFamily } from '@/data/bank';
import type { VerificationStatus } from '@/types/bank';
import { EVIDENCE_FACTOR, LEVEL_COLORS, PRIORITY_WEIGHTS } from '@/engine/constants';
import { openOrLoadDemo } from '@/services/demo';
import { attempt } from '@/app/store';
import { MGDA_FAMILIES, MODALITY_LABEL, TIER_LABEL, VERIFICATION_LABEL, WORK_CYCLE } from '@/config/vocabulary';
import { buttonClass, SkeletonLoader } from '@/components/ui';
import { AmbientImage, AnimatedCounter, MotionScope, Reveal, useInViewOnce, useScrollProgress } from '@/components/motion';
import { cx, fmtPct } from '@/utils/core';
import { EvidenceLadder, ExportChips, HeatStrip, HeroVisual, LevelScale, MedianDots, PhaseLanes, RiskGrid, StepVisual } from './visuals';
import estratos1024 from '@/assets/images/estratos-1024.webp';
import estratos1920 from '@/assets/images/estratos-1920.webp';
import fachada1024 from '@/assets/images/fachada-1024.webp';
import fachada1920 from '@/assets/images/fachada-1920.webp';
import topografia1024 from '@/assets/images/topografia-1024.webp';
import topografia1920 from '@/assets/images/topografia-1920.webp';

/** La vista de producto usa ECharts: se carga solo cuando el bloque se acerca a la vista. */
const ProductShowcase = lazy(() => import('./ProductShowcase'));

const CRITICAL = QUESTIONS.filter((q) => q.isCritical).length;
const TIER_COUNTS = { quick: QUESTIONS.filter((q) => q.coreTier === 'quick').length, standard: QUESTIONS.filter((q) => q.coreTier !== 'professional').length, professional: QUESTIONS.length };
const WORDS: Record<number, string> = { 4: 'cuatro', 5: 'cinco', 6: 'seis', 15: 'quince' };
const spell = (v: number) => WORDS[v] ?? v.toLocaleString('es-CO');
const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const n = (v: number) => v.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Cifras del producto: todas se derivan del banco versionado y de la configuración, nunca se escriben a mano. */
const METRICS = [
  { value: DIMENSIONS.length, label: 'dimensiones', note: `en ${MGDA_FAMILIES.length} familias de capacidades` },
  { value: QUESTIONS.length, label: 'criterios', note: 'con verificaciones observables' },
  { value: QUESTIONS.length * 6, label: 'descriptores de nivel', note: 'redactados para cada criterio' },
  { value: CRITICAL, label: 'criterios críticos', note: 'alertan en los niveles 0 y 1' },
  { value: Object.keys(MODALITY_LABEL).length, label: 'modalidades', note: 'de rápida a personalizada' },
  { value: SOURCES.length, label: 'referentes', note: 'con estado de verificación' },
];

const MODALITIES = [
  { key: 'quick', name: TIER_LABEL.quick, count: TIER_COUNTS.quick, time: 'Una sesión', color: LEVEL_COLORS[5], text: 'Panorama inicial con los criterios esenciales de cada dimensión.' },
  { key: 'standard', name: TIER_LABEL.standard, count: TIER_COUNTS.standard, time: 'Varias entrevistas', color: LEVEL_COLORS[3], text: `Diagnóstico equilibrado para planificar con varios perfiles. Incluye los criterios de la modalidad ${TIER_LABEL.quick}.` },
  { key: 'professional', name: TIER_LABEL.professional, count: TIER_COUNTS.professional, time: 'Consultoría', color: '#8FC9C0', text: 'Todos los criterios del banco, con evidencias y validación detallada.' },
];

const FAQ = [
  { q: '¿DOCMATURITY certifica a la organización?', a: 'No. Es una herramienta de autodiagnóstico y consultoría. Sus resultados no constituyen certificación, auditoría oficial ni puntaje de instrumentos como el MGDA o el FURAG, y no acreditan conformidad con normas ISO o MoReq.' },
  { q: '¿Dónde se guardan los datos?', a: 'En el navegador del dispositivo, mediante IndexedDB. No hay servidor, registro de usuarios ni sincronización. Para trasladar información se exportan archivos que pueden protegerse con contraseña.' },
  { q: '¿Cómo responden las personas entrevistadas si no tienen la aplicación instalada?', a: 'La persona evaluadora genera un archivo de asignación. La persona entrevistada lo abre en la sección «Responder entrevista», responde sin conexión y devuelve un archivo de respuestas que la persona evaluadora importa.' },
  { q: '¿Qué pasa con las respuestas «No sé» o «No aplica»?', a: 'No se convierten en cero. «No sé», «Omitida», «Pendiente» y «No aplica (propuesto)» dejan el criterio sin puntuación y reducen la cobertura. «No aplica (validado)» retira el criterio del alcance y «No asignada» indica que la pregunta no forma parte de esa entrevista: ninguna de las dos reduce la cobertura.' },
  { q: '¿Se puede usar en clase?', a: 'Sí. El laboratorio académico incluye cinco casos ficticios, una sesión guiada de 60 minutos, insignias por la calidad del proceso y un entregable en PDF apto para Moodle.' },
  { q: '¿Usa inteligencia artificial?', a: 'El motor de cálculo y la narrativa son deterministas. Existe un asistente opcional que solo genera una instrucción anonimizada para que la persona evaluadora la use, si lo desea, en una herramienta autorizada por su organización.' },
  { q: '¿Funciona sin conexión?', a: 'Sí. Después de la primera visita la aplicación se instala como aplicación web progresiva y funciona sin conexión.' },
];

export default function LandingPage() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const demo = async () => {
    if (busy) return;
    setBusy(true);
    const id = await attempt(() => openOrLoadDemo());
    setBusy(false);
    if (id) nav(`/app/evaluaciones/${id}/resultados`);
  };

  return (
    <>
      <Hero busy={busy} onDemo={demo} />
      <Metrics />
      <HowItWorks />
      <Capabilities />
      <Product />
      <Methodology />
      <Dimensions />
      <References />
      <Modalities />
      <Interviews />
      <Privacy />
      <Faq />
      <Closing busy={busy} onDemo={demo} />
    </>
  );
}

/* ===================================================================== */
/* 6.1 Héroe                                                              */
/* ===================================================================== */

function Hero({ busy, onDemo }: { busy: boolean; onDemo: () => void }) {
  return (
    <MotionScope as="section" className="on-dark relative isolate flex min-h-[88svh] items-center overflow-hidden bg-midnight text-white" aria-labelledby="hero-t">
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
        <AmbientImage small={estratos1024} large={estratos1920} eager kenburns className="opacity-80" />
        <div className="ambient-drift absolute -top-[25%] -right-[12%] size-[880px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(142,120,247,0.20), transparent 62%)' }} />
        <div className="absolute -bottom-[35%] -left-[12%] size-[760px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(53,217,164,0.13), transparent 64%)' }} />
        <div className="absolute inset-0 bg-gradient-to-r from-midnight via-midnight/85 to-midnight/25" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-midnight to-transparent" />
      </div>

      <div className="mx-auto grid w-full max-w-[1240px] grid-cols-[minmax(0,1fr)] items-center gap-14 px-5 pt-28 pb-16 md:px-8 lg:pt-32 xl:grid-cols-[1fr_1.04fr] xl:gap-10 xl:pb-20">
        <div>
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-3.5 py-1.5 text-xs text-fog backdrop-blur">
              <span className="size-1.5 rounded-full bg-mint" aria-hidden />
              Modelo DIAM, versión 1.0 · {DIMENSIONS.length} dimensiones · {QUESTIONS.length} criterios
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1 id="hero-t" className="mt-7 max-w-[620px] font-display text-[2.3rem] leading-[1.06] font-extrabold tracking-[-0.028em] text-white sm:text-[2.85rem] lg:text-[3.3rem]">
              Diagnostique lo que funciona. Evidencie lo que falta. <span className="sm:whitespace-nowrap">Priorice <span className="text-mint">lo que sigue.</span></span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 max-w-[540px] text-lg leading-relaxed text-fog">Evalúe la madurez documental, archivística, tecnológica y de gobierno de la información de su organización con un método que separa lo percibido de lo validado y lo convierte en una hoja de ruta.</p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link to="/app/organizaciones/nueva" className={buttonClass('primary', 'lg')}>Iniciar diagnóstico <ArrowRight className="size-4" aria-hidden /></Link>
              <Link to="/metodologia" className={buttonClass('outline-light', 'lg')}>Conocer la metodología</Link>
            </div>
            <button type="button" onClick={onDemo} disabled={busy} aria-busy={busy} className="mt-5 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-fog underline-offset-4 transition-colors hover:text-white hover:underline disabled:opacity-60">
              {busy ? 'Abriendo…' : 'Explorar demostración'}<ArrowRight className="size-3.5" aria-hidden />
            </button>
            <p className="mt-5 flex max-w-md items-start gap-2 text-xs leading-relaxed text-fog"><Lock className="mt-0.5 size-3.5 shrink-0 text-mint" aria-hidden />Funciona en el navegador, sin registro ni servidor. Los datos permanecen en el dispositivo de la persona evaluadora.</p>
          </Reveal>
        </div>
        <Reveal delay={200}><HeroVisual /></Reveal>
      </div>
    </MotionScope>
  );
}

/* ===================================================================== */
/* 6.2 Métricas                                                           */
/* ===================================================================== */

function Metrics() {
  return (
    <section aria-label="El modelo en cifras" className="on-dark border-t border-white/[0.07] bg-midnight text-white">
      <dl className="mx-auto grid max-w-[1240px] grid-cols-2 px-5 md:grid-cols-3 md:px-8 lg:grid-cols-6">
        {METRICS.map((m, i) => (
          <Reveal key={m.label} delay={i * 60} className="py-8 pr-4 lg:py-10">
            <dt className="sr-only">{m.label}</dt>
            <dd className="font-display text-[2.4rem] leading-none font-bold tracking-tight text-white lg:text-[2.75rem]"><AnimatedCounter value={m.value} duration={1200} /></dd>
            <dd className="mt-2 text-sm font-medium text-white" aria-hidden>{m.label}</dd>
            <dd className="mt-0.5 text-xs text-fog">{m.note}</dd>
          </Reveal>
        ))}
      </dl>
    </section>
  );
}

/* ===================================================================== */
/* Encabezados y bandas                                                   */
/* ===================================================================== */

function SectionHeading({ id, eyebrow, title, lead, dark = false, className, children }: { id: string; eyebrow: string; title: ReactNode; lead?: ReactNode; dark?: boolean; className?: string; children?: ReactNode }) {
  return (
    <Reveal className={cx('max-w-3xl', className)}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={`${id}-t`} className={cx('mt-3 font-display text-[1.8rem] leading-[1.12] font-bold tracking-[-0.02em] md:text-[2.45rem]', dark ? 'text-white' : 'text-navy')}>{title}</h2>
      {lead && <p className={cx('mt-4 max-w-2xl text-base leading-relaxed md:text-[1.0625rem]', dark ? 'text-fog' : 'text-muted')}>{lead}</p>}
      {children}
    </Reveal>
  );
}

const TONES = { soft: 'bg-soft', white: 'bg-white', canvas: 'bg-canvas' } as const;

function Band({ id, tone = 'soft', children, className }: { id: string; tone?: keyof typeof TONES; children: ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className={cx(TONES[tone], className)}>
      <div className="mx-auto max-w-[1240px] px-5 py-20 md:px-8 md:py-28">{children}</div>
    </section>
  );
}

function TextLink({ to, children, dark = false }: { to: string; children: ReactNode; dark?: boolean }) {
  return <Link to={to} className={cx('group inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline', dark ? 'text-mint' : 'text-mint-strong')}>{children}<ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden /></Link>;
}

/* ===================================================================== */
/* 6.3 Cómo funciona: línea de tiempo                                     */
/* ===================================================================== */

function HowItWorks() {
  const [ref, progress] = useScrollProgress<HTMLOListElement>();
  const last = WORK_CYCLE.length - 1;
  return (
    <Band id="como-funciona">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading id="como-funciona" eyebrow="01 · Cómo funciona" title="Seis momentos de un mismo ciclo de trabajo." lead="Cada momento deja un registro que alimenta al siguiente: lo que se caracteriza define la aplicabilidad, lo que se entrevista se valida y lo que se valida se prioriza." />
        <TextLink to="/como-funciona">Ver dónde se hace cada momento</TextLink>
      </div>
      <ol ref={ref} className="relative mt-16 grid gap-12 xl:grid-cols-6 xl:gap-0">
        {/* Riel horizontal (escritorio) y vertical (pantallas angostas); el avance acompaña el desplazamiento. */}
        <span aria-hidden className="absolute top-[15px] left-[15px] hidden h-px w-[83.333%] bg-[#d5dde8] xl:block" />
        <span aria-hidden className="absolute top-[14px] left-[15px] hidden h-[3px] rounded-full bg-mint-strong xl:block" style={{ width: `calc(83.333% * ${progress})` }} />
        <span aria-hidden className="absolute top-2 bottom-2 left-[15px] w-px bg-[#d5dde8] xl:hidden" />
        <span aria-hidden className="absolute top-2 left-[14px] w-[3px] rounded-full bg-mint-strong xl:hidden" style={{ height: `calc((100% - 1rem) * ${progress})` }} />
        {WORK_CYCLE.map((s, i) => {
          const reached = progress >= i / last - 0.03;
          return (
            <li key={s.key} className="relative pl-14 xl:pr-7 xl:pl-0">
              <span aria-hidden className={cx('absolute top-0 left-0 flex size-8 items-center justify-center rounded-full border-2 bg-soft text-xs font-bold transition-colors duration-300 num xl:static', reached ? 'border-mint-strong text-mint-strong' : 'border-[#cbd5e1] text-muted')}>{i + 1}</span>
              <div className="rounded-lg border border-line bg-white px-3 py-2.5 md:max-w-sm xl:mt-6 xl:max-w-none"><StepVisual step={s.key} /></div>
              <h3 className="mt-5 font-display text-lg font-bold text-navy">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
              <p className="mt-3 text-xs text-muted"><span className="font-medium text-ink">En la aplicación:</span> {s.where.map((w) => w.label).join(' · ')}</p>
            </li>
          );
        })}
      </ol>
    </Band>
  );
}

/* ===================================================================== */
/* 6.4 Capacidades: bento asimétrico                                      */
/* ===================================================================== */

function Capabilities() {
  return (
    <MotionScope as="section" id="capacidades" aria-labelledby="capacidades-t" className="on-dark relative isolate overflow-hidden bg-midnight text-white">
      <div aria-hidden className="ambient-drift absolute top-[10%] -left-[15%] -z-10 size-[700px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(53,217,164,0.10), transparent 65%)' }} />
      <div className="mx-auto max-w-[1240px] px-5 py-20 md:px-8 md:py-28">
        <SectionHeading id="capacidades" dark eyebrow="02 · Capacidades" title="Del dato de entrevista a la decisión, con trazabilidad en cada paso." lead="Las capacidades trabajan sobre el mismo registro: ninguna cifra del informe se calcula fuera del motor ni pierde su vínculo con el criterio y la evidencia que la sustentan." />
        <div className="mt-14 grid gap-4 lg:grid-cols-12">
          <Bento className="lg:col-span-7" title="Mapa de calor por dimensión y perfil" text="La mediana de cada perfil o área por dimensión muestra dónde coinciden las percepciones y dónde divergen." featured>
            <HeatStrip />
            <p className="mt-3 text-[11px] text-fog">Filas: perfiles entrevistados · columnas: dimensiones D01 a D15 · datos ilustrativos</p>
          </Bento>
          <Bento className="lg:col-span-5" title="Entrevistas distribuidas sin servidor" text="Una respuesta por participante y la mediana entre participantes. Las respuestas especiales nunca se convierten en cero.">
            <MedianDots />
          </Bento>
          <Bento className="lg:col-span-4" title="Evidencias graduadas" text="Cada criterio registra su sustento documental, del E0 al E3, y el soporte se expresa en porcentaje.">
            <EvidenceLadder />
          </Bento>
          <Bento className="lg:col-span-4" title="Mesa de validación" text="La persona evaluadora contrasta lo declarado con lo demostrado y resuelve discrepancias y contradicciones.">
            <ValidationMini />
          </Bento>
          <Bento className="lg:col-span-4" title="Riesgos documentales" text="Probabilidad e impacto en una matriz de cinco por cinco, con bandas de riesgo explícitas.">
            <div className="max-w-[180px]"><RiskGrid /></div>
          </Bento>
          <Bento className="lg:col-span-5" title="Hoja de ruta en cuatro fases" text="Iniciativas ordenadas por prioridad explicada, con dependencias entre criterios que el plan respeta." featured>
            <PhaseLanes />
          </Bento>
          <Bento className="lg:col-span-4" title="Informes y exportaciones" text="Informe ejecutivo y técnico, libro de análisis y paquetes con verificación de integridad.">
            <ExportChips />
          </Bento>
          <Bento className="lg:col-span-3" title="Laboratorio académico" text="Casos ficticios, sesión guiada e insignias por la calidad del proceso." academic>
            <ul className="flex gap-1.5" aria-hidden>{[1, 2, 3, 4, 5].map((c) => <li key={c} className="flex size-9 items-center justify-center rounded-md border border-violet/40 bg-violet/15 text-[11px] font-semibold text-white num">C{c}</li>)}</ul>
          </Bento>
        </div>
      </div>
    </MotionScope>
  );
}

function Bento({ title, text, children, className, featured = false, academic = false }: { title: string; text: string; children: ReactNode; className?: string; featured?: boolean; academic?: boolean }) {
  return (
    <Reveal className={cx('group relative flex flex-col justify-between gap-6 overflow-hidden rounded-xl border p-6 transition-colors duration-300', featured ? 'border-white/12 bg-elevated' : 'border-white/[0.07] bg-surface hover:border-white/15', academic && 'border-violet/30 bg-[linear-gradient(160deg,rgba(142,120,247,0.16),rgba(18,26,42,1)_60%)]', className)}>
      <div>
        <h3 className="font-display text-[1.05rem] font-bold text-white">{title}</h3>
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-fog">{text}</p>
      </div>
      <div>{children}</div>
    </Reveal>
  );
}

function ValidationMini() {
  const rows = [['Percibido', 3, 'bg-fog/70'], ['Validado', 2, 'bg-mint']] as const;
  return (
    <div aria-hidden>
      <ul className="space-y-2">
        {rows.map(([k, v, c]) => (
          <li key={k} className="grid grid-cols-[64px_1fr_30px] items-center gap-2 text-[11px]">
            <span className="text-fog">{k}</span>
            <span className="h-2 rounded-sm bg-white/10"><span className={cx('block h-full rounded-sm', c)} style={{ width: `${(v / 5) * 100}%` }} /></span>
            <span className="text-right text-white num">{n(v)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-1.5 text-[10.5px]">
        <span className="rounded-full border border-[#E2B65C]/50 px-2 py-0.5 text-[#F1D08B]">Discrepancia</span>
        <span className="rounded-full border border-violet/50 px-2 py-0.5 text-[#C9BEFC]">Contradicción entre criterios</span>
      </div>
    </div>
  );
}

/* ===================================================================== */
/* 6.5 Visualización del producto                                         */
/* ===================================================================== */

function Product() {
  const [near, setNear] = useState(false);
  const ref = useInViewOnce<HTMLDivElement>(() => setNear(true), '600px 0px 600px 0px');
  const fallback = <div className="rounded-2xl border border-line bg-white p-8" style={{ minHeight: 640 }}><SkeletonLoader lines={6} /></div>;
  return (
    <Band id="resultados" tone="canvas">
      <SectionHeading id="resultados" eyebrow="03 · Resultados" title="Resultados que declaran su propio grado de certeza." lead="El tablero separa la madurez percibida de la validada, informa la cobertura del diagnóstico y el soporte de evidencias, y ordena las brechas frente a la meta." />
      <div ref={ref} className="mt-12">
        {near ? <Suspense fallback={fallback}><ProductShowcase /></Suspense> : fallback}
      </div>
      <dl className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Madurez percibida y validada', 'Se presentan por separado; la validada solo considera criterios revisados por la persona evaluadora.'],
          ['Cobertura', 'Cuántos criterios del alcance tienen datos. Por debajo del 70 %, el resultado se marca como exploratorio.'],
          ['Soporte de evidencias', `Promedio del factor de evidencia de E0 (${n(EVIDENCE_FACTOR.E0)}) a E3 (${n(EVIDENCE_FACTOR.E3)}), expresado en porcentaje.`],
          ['Solidez diagnóstica', 'Índice orientativo de 0 a 100 que combina cobertura, evidencias y acuerdo entre entrevistados.'],
        ].map(([t, d], i) => (
          <Reveal key={t} delay={i * 60} className="border-t-2 border-navy pt-4">
            <dt className="text-sm font-bold text-navy">{t}</dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-muted">{d}</dd>
          </Reveal>
        ))}
      </dl>
    </Band>
  );
}

/* ===================================================================== */
/* 6.6 Metodología y rigor                                                */
/* ===================================================================== */

function Methodology() {
  const priority = `${n(PRIORITY_WEIGHTS.gap)}·Brecha + ${n(PRIORITY_WEIGHTS.impact)}·Impacto + ${n(PRIORITY_WEIGHTS.criticality)}·Criticidad + ${n(PRIORITY_WEIGHTS.urgency)}·Urgencia + ${n(PRIORITY_WEIGHTS.enabler)}·Habilitador`;
  const layers = [
    { k: 'Dimensiones', v: String(DIMENSIONS.length), d: `Agrupadas en ${MGDA_FAMILIES.length} familias, de la estrategia a la automatización.` },
    { k: 'Criterios', v: String(QUESTIONS.length), d: 'Cada uno con explicación, verificaciones observables y evidencias sugeridas.' },
    { k: 'Niveles', v: '0 a 5', d: 'Seis descriptores redactados para cada criterio.', scale: true },
    { k: 'Evidencias', v: 'E0 a E3', d: `Factor de soporte ${(['E0', 'E1', 'E2', 'E3'] as const).map((e) => n(EVIDENCE_FACTOR[e])).join(' · ')}.` },
    { k: 'Percepción', v: 'Mediana', d: 'Una respuesta por participante; mediana entre participantes.' },
    { k: 'Validación', v: 'Mesa', d: 'Lo validado solo considera criterios revisados por la persona evaluadora.' },
    { k: 'Priorización', v: '5 factores', d: priority },
  ];
  return (
    <MotionScope as="section" id="metodologia" aria-labelledby="metodologia-t" className="on-dark relative isolate overflow-hidden bg-midnight text-white">
      <div aria-hidden className="absolute inset-0 -z-10">
        <AmbientImage small={fachada1024} large={fachada1920} kenburns className="opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-r from-midnight via-midnight/92 to-midnight/70" />
      </div>
      <div className="mx-auto grid max-w-[1240px] gap-14 px-5 py-20 md:px-8 md:py-28 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <SectionHeading id="metodologia" dark eyebrow="04 · Metodología y rigor" title="Un método que se puede revisar, no una caja negra." lead="El Modelo Integrado de Evaluación DocMaturity (DIAM) desciende de la dimensión al criterio, del criterio al nivel y del nivel a la evidencia. Las fórmulas son deterministas y están documentadas sin simplificaciones." />
          <Reveal delay={120}>
            <ul className="mt-8 space-y-3 text-sm text-fog">
              {[
                'No certifica ni emite puntajes oficiales: es una herramienta de autodiagnóstico y consultoría.',
                'No reemplaza el MGDA, el FURAG, las auditorías ni el análisis jurídico de la organización.',
                'Las asociaciones con normas y estándares son conceptuales y no implican respaldo del AGN ni de organismos de normalización.',
              ].map((t) => <li key={t} className="flex gap-3"><span className="mt-2 h-px w-4 shrink-0 bg-mint" aria-hidden />{t}</li>)}
            </ul>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3"><TextLink to="/metodologia" dark>Conocer la metodología</TextLink><TextLink to="/referentes" dark>Ver el registro de referentes</TextLink></div>
          </Reveal>
        </div>
        {/* Escalera del modelo: cada peldaño concreta el anterior. */}
        <ol className="relative space-y-2.5" aria-label="Estructura del modelo, de la dimensión a la priorización">
          {layers.map((l, i) => (
            <Reveal as="li" key={l.k} delay={i * 70} className="lg:[margin-left:var(--step)]" style={{ '--step': `${i * 3.2}%` } as CSSProperties}>
              <div className="grid grid-cols-[96px_1fr] items-start gap-4 rounded-lg border border-white/[0.08] bg-surface/80 px-4 py-3.5 backdrop-blur sm:grid-cols-[112px_92px_1fr]">
                <span className="text-[11px] font-semibold tracking-[0.1em] text-mint uppercase">{l.k}</span>
                <span className="hidden font-display text-base font-bold text-white sm:block num">{l.v}</span>
                <div className="text-sm leading-snug text-fog"><span className="font-semibold text-white sm:hidden">{l.v} · </span>{l.d}{l.scale && <div className="mt-2.5 max-w-[260px]"><LevelScale dark compact /></div>}</div>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </MotionScope>
  );
}

/* ===================================================================== */
/* Dimensiones, referentes, modalidades y entrevistas                     */
/* ===================================================================== */

function Dimensions() {
  return (
    <Band id="dimensiones" tone="white">
      <SectionHeading id="dimensiones" eyebrow="05 · Dimensiones de evaluación" title={`${capitalize(spell(DIMENSIONS.length))} dimensiones organizadas en ${spell(MGDA_FAMILIES.length)} familias.`} />
      <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-2 lg:grid-cols-5">
        {MGDA_FAMILIES.map((f, i) => {
          const dims = DIMENSIONS.filter((d) => getDimensionFamily(d.id) === f.key);
          return (
            <Reveal key={f.key} delay={i * 60} className="flex flex-col bg-white p-5 transition-colors duration-300 hover:bg-soft">
              <p className="text-[11px] font-semibold tracking-[0.1em] text-[#8A6A2F] uppercase">{f.key}</p>
              <h3 className="mt-2 font-display text-base font-bold text-navy">{f.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">{f.text}</p>
              <ul className="mt-4 space-y-2.5 border-t border-line pt-4">
                {dims.map((d) => (
                  <li key={d.id} className="grid grid-cols-[36px_1fr] gap-2 text-sm">
                    <span className="text-xs font-semibold text-mint-strong num">{d.id}</span>
                    <span><span className="font-medium text-ink">{d.name}</span><span className="block text-xs text-muted">{QUESTIONS.filter((q) => q.dimensionId === d.id).length} criterios</span></span>
                  </li>
                ))}
              </ul>
            </Reveal>
          );
        })}
      </div>
      <p className="mt-5 max-w-4xl text-xs leading-relaxed text-muted">Las familias se inspiran en los componentes del Modelo de Gestión Documental y Administración de Archivos, usados como lente de lectura. La familia de cada dimensión corresponde a su componente MGDA predominante; cada criterio conserva su propio componente. {CRITICAL} criterios están marcados como críticos y generan alertas cuando se ubican en niveles 0 o 1. <Link to="/metodologia#componentes" className="font-medium text-mint-strong hover:underline">Ver criterios por componente</Link>.</p>
    </Band>
  );
}

const VERIFICATION_COLORS = ['#0B7A58', '#35D9A4', '#A9ECD2', '#D5DDE8'];

function References() {
  const typeCounts = SOURCES.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.type]: (acc[s.type] ?? 0) + 1 }), {});
  const verification = (Object.keys(VERIFICATION_LABEL) as VerificationStatus[]).map((k) => ({ k, label: VERIFICATION_LABEL[k], n: SOURCES.filter((s) => s.verificationStatus === k).length }));
  return (
    <Band id="referentes">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
        <SectionHeading id="referentes" eyebrow="06 · Referentes metodológicos" title="Fundamentación declarada, con estado de verificación por referente.">
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted">
            <p>El modelo se construyó a partir de normativa colombiana, estándares internacionales de gestión de documentos y preservación, modelos de madurez y requisitos de sistemas, y literatura académica.</p>
            <p>Cada uno de los {SOURCES.length} referentes declara si fue verificado, verificado parcialmente, usado como referencia conceptual o aún no verificado. DOCMATURITY no reproduce textos protegidos ni afirma correspondencias con cláusulas específicas.</p>
            <TextLink to="/referentes">Ver el registro de referentes</TextLink>
          </div>
        </SectionHeading>
        <Reveal delay={100} className="flex flex-col gap-6">
          <figure className="m-0 rounded-xl border border-line bg-white p-5">
            <figcaption className="mb-3 text-xs font-semibold tracking-[0.08em] text-muted uppercase">Estado de verificación</figcaption>
            <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" aria-hidden>
              {verification.map((v, i) => <span key={v.k} style={{ width: `${(v.n / SOURCES.length) * 100}%`, background: VERIFICATION_COLORS[i] }} />)}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              {verification.map((v, i) => (
                <div key={v.k}><dt className="flex items-center gap-1.5 text-xs text-muted"><span className="inline-block size-2.5 rounded-[2px]" style={{ background: VERIFICATION_COLORS[i] }} aria-hidden />{v.label}</dt><dd className="font-display text-2xl font-bold text-navy num">{v.n}</dd></div>
              ))}
            </dl>
          </figure>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
            {[
              ['norma_juridica', 'Normas jurídicas'], ['estandar_tecnico', 'Estándares técnicos'], ['modelo_madurez', 'Modelos de madurez'], ['modelo_requisitos', 'Modelos de requisitos'],
              ['metodologia', 'Metodologías'], ['buena_practica', 'Buenas prácticas'], ['modelo_gestion', 'Modelos de gestión'], ['referente_academico', 'Referentes académicos'],
            ].map(([k, label]) => (
              <div key={k} className="bg-white p-4"><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 font-display text-2xl font-bold text-navy num">{typeCounts[k] ?? 0}</dd></div>
            ))}
          </dl>
        </Reveal>
      </div>
    </Band>
  );
}

function Modalities() {
  return (
    <Band id="modalidades" tone="white">
      <SectionHeading id="modalidades" eyebrow="07 · Modalidades de diagnóstico" title="La profundidad se ajusta al propósito." lead="Las tres modalidades del banco son acumulativas: cada una incluye los criterios de la anterior. La personalizada parte de dimensiones elegidas." />
      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {MODALITIES.map((m, i) => (
          <Reveal key={m.key} delay={i * 70} className="flex flex-col rounded-xl border border-line bg-soft p-6">
            <h3 className="flex items-center gap-2 font-display text-base font-bold text-navy"><span className="size-2.5 rounded-sm" style={{ background: m.color }} aria-hidden />{m.name}</h3>
            <p className="mt-1 text-xs font-semibold text-mint-strong">{m.time}</p>
            <p className="mt-6 font-display text-[2.6rem] leading-none font-extrabold tracking-tight text-navy num">{m.count}</p>
            <p className="mt-1 text-xs text-muted">criterios · {fmtPct((m.count / QUESTIONS.length) * 100)} del banco</p>
            <span className="mt-3 block h-1.5 rounded-full bg-neutral" aria-hidden><span className="block h-full rounded-full" style={{ width: `${(m.count / QUESTIONS.length) * 100}%`, background: m.color }} /></span>
            <p className="mt-5 text-sm leading-relaxed text-muted">{m.text}</p>
          </Reveal>
        ))}
        <Reveal delay={210} className="flex flex-col rounded-xl border border-dashed border-[#b8c4d4] bg-white p-6">
          <h3 className="flex items-center gap-2 font-display text-base font-bold text-navy"><span className="size-2.5 rounded-sm border border-dashed border-slate-500" aria-hidden />Personalizado</h3>
          <p className="mt-1 text-xs font-semibold text-mint-strong">Alcance focalizado</p>
          <p className="mt-6 font-display text-[2rem] leading-[1.3] font-extrabold tracking-tight text-navy">A la medida</p>
          <p className="mt-1 text-xs text-muted">dimensiones y criterios elegidos</p>
          <span className="mt-3 block h-1.5 rounded-full border border-dashed border-[#b8c4d4]" aria-hidden />
          <p className="mt-5 text-sm leading-relaxed text-muted">Dimensiones seleccionadas, preguntas propias y exclusiones justificadas.</p>
        </Reveal>
      </div>
    </Band>
  );
}

function Interviews() {
  const lanes = [
    { who: 'Persona evaluadora', steps: [{ col: 1, n: 1, t: 'Crea la asignación', d: 'Perfil, criterios e instrucciones' }, { col: 4, n: 6, t: 'Importa y consolida', d: 'Verificación de hash, revisiones y duplicados' }, { col: 5, n: 7, t: 'Valida en la mesa', d: 'Discrepancias, contradicciones y evidencias' }] },
    { who: 'Archivo', steps: [{ col: 2, n: 2, t: '.dm-assignment.json', d: 'Opcionalmente cifrado' }, { col: 3, n: 5, t: '.dm-interview.json', d: 'Con hash SHA-256' }] },
    { who: 'Persona entrevistada', steps: [{ col: 2, n: 3, t: 'Abre «Responder entrevista»', d: 'Sin cuenta ni instalación' }, { col: 3, n: 4, t: 'Responde sin conexión', d: 'Guarda avance y exporta' }] },
  ];
  return (
    <Band id="entrevistas">
      <SectionHeading id="entrevistas" eyebrow="08 · Entrevistas y consolidación" title="Entrevistas distribuidas por archivo, sin servidor." lead="La persona evaluadora prepara una asignación, la persona entrevistada responde sin conexión y el archivo de respuestas regresa con un hash que permite detectar alteraciones accidentales." />
      <Reveal className="mt-12">
        <div className="hidden overflow-hidden rounded-xl border border-line bg-white md:block">
          {lanes.map((l, li) => (
            <div key={l.who} className={cx('grid grid-cols-[160px_repeat(5,1fr)]', li > 0 && 'border-t border-line')}>
              <div className="flex items-center bg-soft px-4 py-5 text-sm font-bold text-navy">{l.who}</div>
              {[1, 2, 3, 4, 5].map((c) => {
                const s = l.steps.find((x) => x.col === c);
                return (
                  <div key={c} className="border-l border-dashed border-line p-3">
                    {s && <div className={cx('rounded-lg border p-3', l.who === 'Archivo' ? 'border-violet/30 bg-violet-soft' : 'border-line bg-white shadow-[0_1px_2px_rgba(11,16,32,0.04)]')}><p className="flex items-baseline gap-2 text-sm font-semibold text-ink [overflow-wrap:anywhere]"><span className="text-xs font-bold text-mint-strong num">{s.n}</span>{s.t}</p><p className="mt-0.5 text-xs text-muted">{s.d}</p></div>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <ol className="relative space-y-3 pl-6 md:hidden">
          <span aria-hidden className="absolute top-2 bottom-2 left-[7px] w-px bg-[#d5dde8]" />
          {['Persona evaluadora: crea la asignación', 'Archivo .dm-assignment.json', 'Persona entrevistada: responde sin conexión', 'Archivo .dm-interview.json con hash', 'Persona evaluadora: importa, consolida y valida'].map((t, i) => (
            <li key={t} className="relative rounded-lg border border-line bg-white p-3 text-sm"><span aria-hidden className="absolute top-4 -left-[22px] size-2.5 rounded-full border-2 border-mint-strong bg-soft" /><span className="mr-2 font-bold text-mint-strong num">{i + 1}</span>{t}</li>
          ))}
        </ol>
        <p className="mt-5 text-xs text-muted">El intercambio se realiza por los canales que la organización autorice (correo institucional, carpeta compartida, memoria USB). La aplicación nunca carga archivos a servidores externos.</p>
      </Reveal>
    </Band>
  );
}

/* ===================================================================== */
/* 6.7 Privacidad y autonomía                                             */
/* ===================================================================== */

function Privacy() {
  const items = [
    [Database, 'Datos en el dispositivo', 'IndexedDB del navegador. Sin servidor, sin cuentas, sin telemetría ni rastreadores externos.'],
    [WifiOff, 'Funciona sin conexión', 'Después de la primera visita se instala como aplicación web progresiva.'],
    [FileJson, 'Exportación verificable', 'Paquetes con hash SHA-256 para detectar alteraciones accidentales. No constituyen firma digital.'],
    [KeyRound, 'Cifrado opcional', 'AES-GCM de 256 bits con clave derivada mediante PBKDF2. La contraseña no se guarda.'],
    [HardDriveDownload, 'Respaldos bajo su control', 'Copia completa en un archivo que usted conserva y puede restaurar en otro equipo.'],
    [FileSearch, 'Evidencias mínimas', 'Se registran referencias. No adjunte historias clínicas, expedientes reservados ni credenciales.'],
  ] as const;
  return (
    <section id="proteccion" aria-labelledby="proteccion-t" className="on-dark bg-surface text-white">
      <div className="mx-auto grid max-w-[1240px] gap-14 px-5 py-20 md:px-8 md:py-28 lg:grid-cols-[0.85fr_1.15fr]">
        <SectionHeading id="proteccion" dark eyebrow="09 · Privacidad y autonomía" title="Su información no sale del dispositivo." lead="DOCMATURITY no tiene servidor ni base de datos remota. Usted decide qué se exporta, con quién se comparte y cuándo se respalda.">
          <p className="mt-6 max-w-xl text-xs leading-relaxed text-fog">El navegador aísla los datos por origen. En la publicación de demostración el origen se comparte con otras páginas del mismo dominio: para trabajar con información real, publique la aplicación en un dominio propio o use un perfil de navegador dedicado. La protección con contraseña de un archivo exportado no cifra los datos almacenados en el navegador.</p>
          <div className="mt-6"><TextLink to="/privacidad" dark>Leer la política de privacidad</TextLink></div>
        </SectionHeading>
        <ul className="grid gap-px overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.08] sm:grid-cols-2">
          {items.map(([Icon, t, d], i) => (
            <Reveal as="li" key={t} delay={i * 60} className="bg-surface p-6">
              <Icon className="size-5 text-mint" aria-hidden />
              <h3 className="mt-4 font-display text-base font-bold text-white">{t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-fog">{d}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ===================================================================== */
/* Preguntas frecuentes y cierre                                          */
/* ===================================================================== */

function Faq() {
  return (
    <Band id="preguntas" tone="white">
      <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHeading id="preguntas" eyebrow="10 · Preguntas frecuentes" title="Lo que conviene saber antes de empezar." />
        <div className="divide-y divide-line border-y border-line">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-semibold text-navy"><span>{f.q}</span><span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line text-lg leading-none text-muted transition-transform duration-200 group-open:rotate-45" aria-hidden>+</span></summary>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </Band>
  );
}

function Closing({ busy, onDemo }: { busy: boolean; onDemo: () => void }) {
  return (
    <MotionScope as="section" id="acceso" aria-labelledby="acceso-t" className="on-dark relative isolate overflow-hidden bg-midnight text-white">
      <div aria-hidden className="absolute inset-0 -z-10">
        <AmbientImage small={topografia1024} large={topografia1920} kenburns className="opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-b from-midnight/40 via-transparent to-midnight/80" />
      </div>
      <div className="mx-auto grid max-w-[1240px] gap-14 px-5 py-24 md:px-8 md:py-32 lg:grid-cols-[1.3fr_1fr] lg:items-end">
        <Reveal>
          <p className="eyebrow">11 · Acceso al producto</p>
          <h2 id="acceso-t" className="mt-4 max-w-3xl font-display text-[2rem] leading-[1.1] font-extrabold tracking-[-0.025em] text-white md:text-[2.9rem]">Una organización no alcanza madurez por tener documentos. <span className="text-mint">La demuestra en sus capacidades de gestión.</span></h2>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/app/evaluaciones/nueva" className={buttonClass('primary', 'lg')}>Crear una evaluación <ArrowRight className="size-4" aria-hidden /></Link>
            <button type="button" onClick={onDemo} disabled={busy} aria-busy={busy} className={buttonClass('outline-light', 'lg')}>{busy ? 'Abriendo…' : 'Explorar caso de demostración'}</button>
          </div>
        </Reveal>
        <Reveal delay={120}>
          <ul className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-midnight/60 backdrop-blur">
            {[
              ['/app', 'Abrir la aplicación', 'Organizaciones, evaluaciones e informes.'],
              ['/responder', 'Responder una entrevista', 'Para personas que recibieron un archivo de asignación.'],
              ['/app/academico', 'Laboratorio académico', 'Casos ficticios para diplomados y pregrado.'],
            ].map(([to, t, d]) => (
              <li key={to}><Link to={to} className="group flex min-h-16 items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-white/[0.05]"><span><span className="block font-semibold text-white">{t}</span><span className="text-xs text-fog">{d}</span></span><ArrowUpRight className="size-4 shrink-0 text-mint transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden /></Link></li>
            ))}
          </ul>
        </Reveal>
      </div>
    </MotionScope>
  );
}
