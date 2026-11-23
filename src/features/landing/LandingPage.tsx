import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, Check, ClipboardList, FileDown, FileSearch, GitBranch, HardDrive, KeyRound, Layers3, MessagesSquare, Scale, ShieldAlert, ShieldCheck, WifiOff,
} from 'lucide-react';
import { DIMENSIONS, QUESTIONS, SOURCES } from '@/data/bank';
import { MGDA_FAMILIES, MODALITY_LABEL } from '@/config/vocabulary';
import { openOrLoadDemo } from '@/services/demo';
import { attempt } from '@/app/store';
import { buttonClass } from '@/components/ui';
import { AnimatedCounter, BackgroundVideo, Marquee, MotionScope, Reveal, ScrollRevealText, WordRotator, useElementProgress, useSpotlight } from '@/components/motion';
import { cx, fmtPct } from '@/utils/core';
import { MODALITY_INFO } from '../common';
import { Carousel, type Slide } from './Carousel';
import { HERO_VIDEO, RENDERS, SHOTS } from './media';

const CRITICAL = QUESTIONS.filter((q) => q.isCritical).length;
const pill = (...extra: (string | false | undefined)[]) => cx('rounded-full', ...extra);

/** Cifras del producto: se derivan del banco versionado y de la configuración. */
const METRICS = [
  { value: DIMENSIONS.length, label: 'dimensiones', note: `en ${MGDA_FAMILIES.length} familias de capacidades` },
  { value: QUESTIONS.length, label: 'criterios', note: 'con verificaciones observables' },
  { value: QUESTIONS.length * 6, label: 'descriptores de nivel', note: 'redactados uno a uno' },
  { value: CRITICAL, label: 'criterios críticos', note: 'alertan en los niveles 0 y 1' },
  { value: SOURCES.length, label: 'referentes', note: 'con estado de verificación' },
];

const SLIDES: Slide[] = [
  { ...SHOTS.cuestionario, tag: 'Entrevista', title: 'Un criterio a la vez', text: 'Seis niveles descritos, aclaraciones, ejemplos y evidencias sugeridas. Las respuestas especiales nunca se convierten en cero.' },
  { ...SHOTS.validacion, tag: 'Validación', title: 'Mesa de validación', text: 'Lo declarado frente a lo demostrado: discrepancias, contradicciones y evidencias de cada criterio.' },
  { ...SHOTS.resumen, tag: 'Seguimiento', title: 'Cada evaluación, con su estado', text: 'Avance del ciclo, madurez preliminar y validada, cobertura y siguiente paso recomendado.' },
  { ...SHOTS.brechas, tag: 'Análisis', title: 'Brechas y riesgos explicados', text: 'Cada brecha frente a la meta, con la acción propuesta, el responsable y la evidencia de cumplimiento.' },
  { ...SHOTS.ruta, tag: 'Transformación', title: 'Hoja de ruta en cuatro fases', text: 'Iniciativas priorizadas que respetan las dependencias entre criterios y se pueden editar.' },
  { ...SHOTS.informes, tag: 'Informes', title: 'Informes listos para presentar', text: 'Informe ejecutivo y técnico en PDF, libro de análisis en XLSX y paquetes con verificación de integridad.' },
];

const STEPS = [
  { img: RENDERS.field, kicker: 'Paso 1', title: 'Caracterice y entreviste', accent: 'entreviste', text: 'Registre la organización, elija la modalidad y entreviste a cada perfil. Las entrevistas también se distribuyen por archivo y se responden sin conexión.', points: ['Aplicabilidad según la naturaleza jurídica', 'Una respuesta por participante, consolidada por mediana'] },
  { img: RENDERS.stack, kicker: 'Paso 2', title: 'Evidencie y valide', accent: 'valide', text: 'Cada criterio guarda su sustento documental del E0 al E3. En la mesa de validación se contrasta lo percibido con lo demostrado.', points: ['Discrepancias y contradicciones detectadas', 'Lo validado nunca sobrescribe lo respondido'] },
  { img: RENDERS.strata, kicker: 'Paso 3', title: 'Analice y priorice', accent: 'priorice', text: 'Madurez por dimensión y familia, brechas frente a la meta, riesgos y una hoja de ruta ordenada por prioridad explicada.', points: ['Fórmulas deterministas y documentadas', 'Informes ejecutivo y técnico'] },
];

const CAPABILITIES = [
  { icon: MessagesSquare, title: 'Entrevistas distribuidas', text: 'Asignaciones por archivo, respuestas sin conexión y consolidación con verificación de integridad.' },
  { icon: FileSearch, title: 'Evidencias graduadas', text: 'Del E0 al E3, con soporte expresado en porcentaje y trazabilidad hasta el criterio.' },
  { icon: Scale, title: 'Mesa de validación', text: 'Percibido frente a validado, con justificación y registro de cada decisión.' },
  { icon: ShieldAlert, title: 'Brechas y riesgos', text: 'Matriz de probabilidad e impacto y bandas de riesgo explícitas.' },
  { icon: GitBranch, title: 'Hoja de ruta con dependencias', text: 'Cuatro fases, prioridad de cinco factores y reprogramación según dependencias.' },
  { icon: FileDown, title: 'Informes y exportaciones', text: 'PDF ejecutivo y técnico, XLSX y paquetes cifrables con contraseña.' },
];

const MODALITIES = [
  { key: 'quick', featured: false, use: 'Una sesión', includes: ['Criterios estratégicos de cada dimensión', 'Comparación rápida de percepciones', 'Ideal para clase o primer acercamiento'] },
  { key: 'standard', featured: true, use: 'Varias entrevistas', includes: [`Incluye la modalidad ${MODALITY_LABEL.quick.toLowerCase()}`, 'Lectura amplia de capacidades', 'Evidencias, validación y hoja de ruta'] },
  { key: 'professional', featured: false, use: 'Consultoría', includes: [`Banco completo de ${QUESTIONS.length} criterios`, 'Distribución entre perfiles', 'Validación detallada criterio a criterio'] },
  { key: 'custom', featured: false, use: 'Alcance focalizado', includes: ['Dimensiones elegidas', 'Preguntas propias y metas', 'Exclusiones justificadas'] },
] as const;

const FAQ = [
  { q: '¿DOCMATURITY certifica a la organización?', a: 'No. Es una herramienta de autodiagnóstico y consultoría. Sus resultados no constituyen certificación, auditoría oficial ni puntaje de instrumentos como el MGDA o el FURAG, y no acreditan conformidad con normas ISO o MoReq.' },
  { q: '¿Dónde se guardan los datos?', a: 'En el navegador del dispositivo, mediante IndexedDB. No hay servidor, registro de usuarios ni sincronización. Para trasladar información se exportan archivos que pueden protegerse con contraseña.' },
  { q: '¿Cómo responden las personas entrevistadas sin instalar nada?', a: 'La persona evaluadora genera un archivo de asignación. La persona entrevistada lo abre en «Responder entrevista», responde sin conexión y devuelve un archivo de respuestas que se importa en la evaluación.' },
  { q: '¿Qué pasa con las respuestas «No sé» o «No aplica»?', a: 'No se convierten en cero. «No sé», «Omitida», «Pendiente» y «No aplica (propuesto)» dejan el criterio sin puntuación y reducen la cobertura. «No aplica (validado)» retira el criterio del alcance.' },
  { q: '¿Se puede usar en clase?', a: 'Sí. El laboratorio académico incluye cinco casos ficticios, una sesión guiada de 60 minutos, insignias por la calidad del proceso y un entregable en PDF.' },
  { q: '¿Funciona sin conexión?', a: 'Sí. Después de la primera visita la aplicación se instala como aplicación web progresiva y funciona sin conexión.' },
];

export default function LandingPage() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  useSpotlight();
  const demo = async () => {
    if (busy) return;
    setBusy(true);
    const id = await attempt(() => openOrLoadDemo());
    setBusy(false);
    if (id) nav(`/app/evaluaciones/${id}/resultados`);
  };
  return (
    <div className="bg-midnight">
      <Hero busy={busy} onDemo={demo} />
      <ReferencesMarquee />
      <Metrics />
      <Method />
      <Showcase />
      <Capabilities />
      <Modalities />
      <Privacy />
      <Statement />
      <Faq />
      <Closing busy={busy} onDemo={demo} />
    </div>
  );
}

/* ---------------------------------------------------------------------- */

function Chip({ children, dark = true }: { children: ReactNode; dark?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium', dark ? 'border-white/12 bg-white/[0.06] text-[#cfd7e3] backdrop-blur' : 'border-line bg-white text-muted')}>
      <span className={cx('size-1.5 rounded-full', dark ? 'bg-mint' : 'bg-mint-strong')} aria-hidden />{children}
    </span>
  );
}

/** Titular con una expresión en serif itálica: rasgo editorial de la identidad. */
function Accent({ text, accent, className }: { text: string; accent?: string; className?: string }) {
  if (!accent || !text.includes(accent)) return <>{text}</>;
  const i = text.indexOf(accent);
  return <>{text.slice(0, i)}<em className={cx('font-serif font-normal tracking-normal italic', className)}>{accent}</em>{text.slice(i + accent.length)}</>;
}

function Heading({ id, chip, title, accent, lead, dark = true, center = false, className }: { id: string; chip: string; title: string; accent?: string; lead?: ReactNode; dark?: boolean; center?: boolean; className?: string }) {
  return (
    <Reveal className={cx(center ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl', className)}>
      <Chip dark={dark}>{chip}</Chip>
      <h2 id={id} className={cx('mt-5 font-display text-[2.2rem] leading-[1.04] font-semibold tracking-[-0.035em] md:text-[3.4rem]', dark ? 'text-white' : 'text-ink')}>
        <Accent text={title} accent={accent} className={dark ? 'text-mint' : 'text-mint-strong'} />
      </h2>
      {lead && <p className={cx('mt-5 max-w-2xl text-base leading-relaxed md:text-lg', center && 'mx-auto', dark ? 'text-fog' : 'text-muted')}>{lead}</p>}
    </Reveal>
  );
}

/* ===== Héroe con video de fondo desenfocado ===== */

const HERO_FEATURES = [
  { icon: ShieldCheck, text: 'Sin registro ni servidor' },
  { icon: WifiOff, text: 'Funciona sin conexión' },
  { icon: KeyRound, text: 'Exportación cifrable' },
];

function Hero({ busy, onDemo }: { busy: boolean; onDemo: () => void }) {
  const [frameRef, p] = useElementProgress<HTMLDivElement>(1, 0.55);
  return (
    <MotionScope as="section" aria-labelledby="hero-t" className="on-dark relative isolate overflow-hidden bg-midnight text-white">
      <div aria-hidden className="grain absolute inset-0 -z-10">
        <BackgroundVideo {...HERO_VIDEO} className="scale-110 opacity-90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(11,16,32,0.1),rgba(11,16,32,0.72)_72%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-b from-transparent to-midnight" />
      </div>

      <div className="mx-auto flex max-w-[1240px] flex-col items-center px-5 pt-36 pb-16 text-center md:px-8 md:pt-44">
        <Reveal><Chip>Modelo DIAM 1.0 · {QUESTIONS.length} criterios<span className="hidden sm:inline"> · 100 % en su navegador</span></Chip></Reveal>
        {/* El titular entra con una animación de carga (no de desplazamiento) para no retrasar el LCP. */}
        <div className="hero-in">
          <h1 id="hero-t" className="mt-7 max-w-[1100px] font-display text-[2.6rem] leading-[1] font-semibold tracking-[-0.035em] text-white sm:text-[3.6rem] lg:text-[4.8rem]">
            Diagnostique lo que funciona. Evidencie lo que falta. <span className="sm:whitespace-nowrap">Priorice <em className="font-serif font-normal tracking-normal text-mint italic">lo que sigue.</em></span>
          </h1>
        </div>
        <Reveal delay={180}>
          <p className="mx-auto mt-7 max-w-[660px] text-lg leading-relaxed text-[#cfd7e3] md:text-xl">Madurez documental y de gobierno de la información con entrevistas, evidencias y resultados trazables.</p>
          <p className="mt-3 text-base text-fog md:text-lg"><WordRotator prefix="Para" wordClassName="font-medium text-white" words={['entidades públicas', 'empresas privadas', 'archivos y centros de documentación', 'equipos de consultoría', 'programas académicos']} /></p>
        </Reveal>
        <Reveal delay={260} className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link to="/app/organizaciones/nueva" className={buttonClass('primary', 'lg', pill('h-12 px-7 shadow-[0_10px_40px_-10px_rgba(53,217,164,0.7)]'))}>Iniciar diagnóstico <ArrowRight className="size-4" aria-hidden /></Link>
          <Link to="/metodologia" className={buttonClass('outline-light', 'lg', pill('h-12 border-white/20 bg-white/[0.06] px-7 backdrop-blur'))}>Conocer la metodología</Link>
        </Reveal>
        <Reveal delay={320}>
          <button type="button" onClick={onDemo} disabled={busy} aria-busy={busy} className="mt-5 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-fog underline-offset-4 transition-colors hover:text-white hover:underline disabled:opacity-60">
            {busy ? 'Abriendo…' : 'Explorar demostración'}<ArrowRight className="size-3.5" aria-hidden />
          </button>
        </Reveal>
        <Reveal delay={380} className="mt-6">
          <ul className="flex flex-wrap justify-center gap-x-7 gap-y-3 text-sm text-[#cfd7e3]" aria-label="Funcionamiento">
            {HERO_FEATURES.map((f) => <li key={f.text} className="flex items-center gap-2"><f.icon className="size-4 text-mint" aria-hidden />{f.text}</li>)}
          </ul>
        </Reveal>

        {/* Vista real del producto: se endereza al desplazarse. */}
        <div ref={frameRef} className="mt-16 w-full [perspective:1800px]">
          <div className="relative mx-auto max-w-[1120px] origin-top will-change-transform" style={{ transform: `rotateX(${(1 - p) * 16}deg) scale(${0.94 + p * 0.06})` }}>
            <div aria-hidden className="absolute -inset-x-10 top-10 -bottom-10 -z-10 rounded-[40px] bg-[radial-gradient(ellipse_at_center,rgba(53,217,164,0.35),transparent_65%)] blur-2xl" />
            <div className="overflow-hidden rounded-[18px] border border-white/15 bg-white/[0.05] p-1.5 shadow-[0_50px_120px_-30px_rgba(0,0,0,0.9)] backdrop-blur">
              <div className="flex items-center justify-between gap-3 px-3 py-2 text-[11px] text-fog">
                <span className="flex gap-1.5" aria-hidden><span className="size-2.5 rounded-full bg-white/20" /><span className="size-2.5 rounded-full bg-white/20" /><span className="size-2.5 rounded-full bg-white/20" /></span>
                <span className="truncate">docmaturity · Resultados</span>
                <span className="rounded-full border border-mint/40 px-2 py-0.5 text-[10px] text-mint">Datos de demostración</span>
              </div>
              <img src={SHOTS.resultados.src} srcSet={`${SHOTS.resultados.small} 960w, ${SHOTS.resultados.src} 1600w`} sizes="(min-width: 1180px) 1120px, 94vw" alt="Tablero de resultados de DOCMATURITY con un caso de demostración: madurez percibida, cobertura, soporte de evidencias y solidez del diagnóstico" className="block h-auto w-full rounded-[12px]" width={1600} height={1000} decoding="async" />
            </div>
          </div>
        </div>
      </div>
    </MotionScope>
  );
}

/* ===== Marquesina de referentes ===== */

function ReferencesMarquee() {
  const names = SOURCES.filter((s) => s.type !== 'referente_academico' && s.shortLabel !== 'Complementarios').map((s) => s.shortLabel);
  const half = Math.ceil(names.length / 2);
  const row = (xs: string[]) => xs.map((t) => (
    <span className="flex items-center">
      <span className="px-6 font-display text-lg font-medium tracking-[-0.01em] whitespace-nowrap text-white/60 transition-colors hover:text-white md:text-xl">{t}</span>
      <span className="size-1 rounded-full bg-mint/60" aria-hidden />
    </span>
  ));
  return (
    <MotionScope as="section" aria-label="Referentes metodológicos" className="on-dark border-y border-white/[0.07] bg-midnight py-12">
      <p className="mb-8 px-5 text-center text-sm text-fog">Construido a partir de normativa colombiana, estándares internacionales y modelos de madurez. <Link to="/referentes" className="ml-1 font-medium text-mint hover:underline">Ver los {SOURCES.length} referentes</Link></p>
      <Marquee label="Referentes, primera fila" items={row(names.slice(0, half))} duration={55} />
      <Marquee label="Referentes, segunda fila" items={row(names.slice(half))} duration={62} reverse className="mt-4" />
      <p className="mx-auto mt-8 max-w-2xl px-5 text-center text-xs text-fog/80">Asociaciones conceptuales: no implican aval del AGN ni de organismos de normalización.</p>
    </MotionScope>
  );
}

/* ===== Cifras ===== */

function Metrics() {
  return (
    <section aria-label="El modelo en cifras" className="on-dark bg-midnight text-white">
      <dl className="mx-auto grid max-w-[1240px] grid-cols-2 gap-y-12 px-5 py-20 md:grid-cols-5 md:px-8 md:py-24">
        {METRICS.map((m, i) => (
          <Reveal key={m.label} delay={i * 70} className="border-l border-white/10 pl-5">
            <dt className="sr-only">{m.label}</dt>
            <dd className="font-display text-[3rem] leading-none font-semibold tracking-[-0.045em] text-white lg:text-[4.2rem]"><AnimatedCounter value={m.value} duration={1300} /></dd>
            <dd className="mt-3 text-sm font-medium text-white" aria-hidden>{m.label}</dd>
            <dd className="mt-0.5 text-xs text-fog">{m.note}</dd>
          </Reveal>
        ))}
      </dl>
    </section>
  );
}

/* ===== Método en tres pasos ===== */

function Method() {
  return (
    <section id="como-funciona" aria-labelledby="como-funciona-t" className="bg-soft">
      <div className="mx-auto max-w-[1240px] px-5 py-24 md:px-8 md:py-32">
        <Heading id="como-funciona-t" dark={false} center chip="Cómo funciona" title="Del documento a la decisión, en tres pasos." accent="decisión" lead="Cada paso deja un registro que alimenta al siguiente. Nada se calcula fuera del motor ni pierde su vínculo con el criterio y la evidencia." />
        <ol className="mt-20 space-y-24 md:space-y-32">
          {STEPS.map((s, i) => (
            <li key={s.title} className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
              <Reveal className={cx('relative', i % 2 === 1 && 'md:order-2')}>
                <div className="group relative overflow-hidden rounded-[28px] bg-midnight shadow-[0_40px_80px_-40px_rgba(11,16,32,0.55)]">
                  <img src={s.img.small} srcSet={`${s.img.small} 800w, ${s.img.src} 1600w`} sizes="(min-width: 768px) 600px, 92vw" alt="" aria-hidden loading="lazy" decoding="async" className="aspect-[16/11] w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]" />
                  <span className="absolute top-5 left-5 rounded-full border border-white/15 bg-midnight/60 px-3 py-1 text-xs font-medium text-white backdrop-blur">{s.kicker}</span>
                </div>
              </Reveal>
              <Reveal delay={120}>
                <p className="font-display text-sm font-semibold text-mint-strong num">0{i + 1} — 03</p>
                <h3 className="mt-3 font-display text-[2rem] leading-[1.05] font-semibold tracking-[-0.03em] text-ink md:text-[2.75rem]"><Accent text={s.title} accent={s.accent} className="text-mint-strong" /></h3>
                <p className="mt-5 max-w-lg text-base leading-relaxed text-muted md:text-lg">{s.text}</p>
                <ul className="mt-7 space-y-3">
                  {s.points.map((pt) => <li key={pt} className="flex items-start gap-3 text-sm text-ink"><span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-mint-soft text-mint-strong"><Check className="size-3" aria-hidden /></span>{pt}</li>)}
                </ul>
              </Reveal>
            </li>
          ))}
        </ol>
        <Reveal className="mt-20 text-center"><Link to="/como-funciona" className="inline-flex items-center gap-1.5 text-sm font-semibold text-mint-strong hover:underline">Ver los seis momentos del ciclo de trabajo <ArrowRight className="size-4" aria-hidden /></Link></Reveal>
      </div>
    </section>
  );
}

/* ===== Carrusel de pantallas reales ===== */

function Showcase() {
  return (
    <MotionScope as="section" id="plataforma" aria-labelledby="plataforma-t" className="on-dark relative isolate overflow-hidden bg-midnight py-24 text-white md:py-32">
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(142,120,247,0.22),transparent_65%)]" />
      <div className="mx-auto mb-14 flex max-w-[1240px] flex-wrap items-end justify-between gap-6 px-5 md:px-8">
        <Heading id="plataforma-t" chip="La plataforma por dentro" title="Pensada para trabajar, no solo para mirar." accent="trabajar" />
        <Reveal><Link to="/app" className={buttonClass('outline-light', 'md', pill('border-white/20'))}>Abrir la aplicación <ArrowUpRight className="size-4" aria-hidden /></Link></Reveal>
      </div>
      <Carousel slides={SLIDES} label="Pantallas de la aplicación" />
    </MotionScope>
  );
}

/* ===== Capacidades ===== */

function Capabilities() {
  return (
    <section aria-labelledby="capacidades-t" className="bg-white">
      <div className="mx-auto max-w-[1240px] px-5 py-24 md:px-8 md:py-32">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-end">
          <Heading id="capacidades-t" dark={false} chip="Capacidades" title="Todo el diagnóstico en un mismo registro." accent="mismo registro" />
          <Reveal delay={100}><p className="max-w-xl text-base leading-relaxed text-muted lg:ml-auto">Las cifras del informe salen del motor y conservan su vínculo con la respuesta, la evidencia y la decisión de validación que las sustentan.</p></Reveal>
        </div>
        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((c, i) => (
            <Reveal as="li" key={c.title} delay={(i % 3) * 80} className="spotlight group rounded-[20px] border border-line bg-soft p-7 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-mint-strong/30 hover:shadow-[0_24px_50px_-30px_rgba(11,16,32,0.4)]">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-midnight text-mint transition-transform duration-300 group-hover:scale-105"><c.icon className="size-5" aria-hidden /></span>
              <h3 className="mt-6 font-display text-xl font-semibold tracking-[-0.02em] text-ink">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{c.text}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ===== Modalidades como planes ===== */

function Modalities() {
  return (
    <MotionScope as="section" id="modalidades" aria-labelledby="modalidades-t" className="on-dark relative isolate overflow-hidden bg-midnight text-white">
      <div aria-hidden className="absolute -bottom-40 left-1/2 -z-10 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(53,217,164,0.16),transparent_65%)]" />
      <div className="mx-auto max-w-[1240px] px-5 py-24 md:px-8 md:py-32">
        <Heading id="modalidades-t" center chip="Modalidades" title="Elija la profundidad del diagnóstico." accent="profundidad" lead="Las tres modalidades del banco son acumulativas: cada una incluye los criterios de la anterior." />
        <ul className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {MODALITIES.map((m, i) => {
            const n = MODALITY_INFO[m.key].count;
            return (
              <Reveal as="li" key={m.key} delay={i * 80} className={cx('spotlight relative flex flex-col rounded-[24px] border p-7', m.featured ? 'border-mint/60 bg-[linear-gradient(180deg,rgba(53,217,164,0.14),rgba(18,26,42,1)_55%)] shadow-[0_30px_80px_-40px_rgba(53,217,164,0.6)]' : 'border-white/10 bg-surface')}>
                {m.featured && <span className="absolute -top-3 left-7 rounded-full bg-mint px-3 py-1 text-[11px] font-semibold text-midnight">Recomendada</span>}
                <h3 className="font-display text-lg font-semibold text-white">{MODALITY_LABEL[m.key]}</h3>
                <p className="mt-1 text-sm text-fog">{m.use}</p>
                <p className="mt-8 flex items-baseline gap-2">
                  <span className={cx('font-display leading-none font-semibold tracking-[-0.04em] text-white num', n ? 'text-[3.2rem]' : 'text-[2.4rem]')}>{n ?? 'A medida'}</span>
                  {n && <span className="text-sm text-fog">criterios</span>}
                </p>
                <p className="mt-2 text-xs text-fog">{n ? `${fmtPct((n / QUESTIONS.length) * 100)} del banco` : 'Dimensiones y criterios elegidos'}</p>
                <ul className="mt-7 flex-1 space-y-3 border-t border-white/10 pt-6">
                  {m.includes.map((t) => <li key={t} className="flex items-start gap-2.5 text-sm text-[#d6dde8]"><Check className="mt-0.5 size-4 shrink-0 text-mint" aria-hidden />{t}</li>)}
                </ul>
                <Link to="/app/evaluaciones/nueva" className={buttonClass(m.featured ? 'primary' : 'outline-light', 'md', pill('mt-8 w-full', !m.featured && 'border-white/20'))}>Elegir esta modalidad<span className="sr-only">: {MODALITY_LABEL[m.key]}</span></Link>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </MotionScope>
  );
}

/* ===== Privacidad ===== */

const PRIVACY = [
  { icon: HardDrive, title: 'Datos en el dispositivo', text: 'IndexedDB del navegador. Sin servidor, cuentas, telemetría ni rastreadores.' },
  { icon: WifiOff, title: 'Sin conexión', text: 'Se instala como aplicación web progresiva después de la primera visita.' },
  { icon: KeyRound, title: 'Cifrado opcional', text: 'AES-GCM de 256 bits con clave derivada por PBKDF2. La contraseña no se guarda.' },
  { icon: Layers3, title: 'Respaldos bajo su control', text: 'Copia completa en un archivo que usted conserva y restaura donde quiera.' },
];

function Privacy() {
  return (
    <section id="proteccion" aria-labelledby="proteccion-t" className="bg-soft">
      <div className="mx-auto grid max-w-[1240px] items-center gap-14 px-5 py-24 md:px-8 md:py-32 lg:grid-cols-2">
        <Reveal className="relative order-last lg:order-first">
          <div className="group relative overflow-hidden rounded-[28px] bg-midnight">
            <img src={RENDERS.vault.small} srcSet={`${RENDERS.vault.small} 800w, ${RENDERS.vault.src} 1600w`} sizes="(min-width: 1024px) 600px, 92vw" alt="" aria-hidden loading="lazy" decoding="async" className="aspect-[16/12] w-full object-cover transition-transform duration-[1200ms] group-hover:scale-[1.04]" />
            <div className="absolute inset-x-5 bottom-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-midnight/60 p-4 text-white backdrop-blur-md">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-mint text-midnight"><ShieldCheck className="size-5" aria-hidden /></span>
              <p className="text-sm"><span className="block font-semibold">Ninguna solicitud a servidores externos</span><span className="text-fog">Se comprueba en cada versión con pruebas automáticas.</span></p>
            </div>
          </div>
        </Reveal>
        <div>
          <Heading id="proteccion-t" dark={false} chip="Privacidad y autonomía" title="Su información no sale del dispositivo." accent="no sale" lead="Usted decide qué se exporta, con quién se comparte y cuándo se respalda." />
          <ul className="mt-10 grid gap-7 sm:grid-cols-2">
            {PRIVACY.map((it, i) => (
              <Reveal as="li" key={it.title} delay={i * 70}>
                <it.icon className="size-5 text-mint-strong" aria-hidden />
                <h3 className="mt-3 font-semibold text-ink">{it.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{it.text}</p>
              </Reveal>
            ))}
          </ul>
          <Reveal className="mt-10"><Link to="/privacidad" className="inline-flex items-center gap-1.5 text-sm font-semibold text-mint-strong hover:underline">Leer la política de privacidad <ArrowRight className="size-4" aria-hidden /></Link></Reveal>
        </div>
      </div>
    </section>
  );
}

/* ===== Declaración que se ilumina al desplazarse ===== */

function Statement() {
  return (
    <section aria-labelledby="declaracion-t" className="on-dark bg-midnight text-white">
      <div className="mx-auto max-w-[1100px] px-5 py-28 md:px-8 md:py-40">
        <ScrollRevealText as="h2" id="declaracion-t" className="font-display text-[2rem] leading-[1.12] font-semibold tracking-[-0.035em] text-white md:text-[3.6rem]" text="Una organización no alcanza madurez por tener documentos. La demuestra en sus capacidades de gestión." />
        <Reveal className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4 text-sm text-fog">
          <span className="flex items-center gap-2"><ClipboardList className="size-4 text-mint" aria-hidden />Herramienta de autodiagnóstico y consultoría</span>
          <span>No certifica ni emite puntajes oficiales</span>
          <Link to="/metodologia" className="font-medium text-mint hover:underline">Ver la metodología</Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ===== Preguntas frecuentes ===== */

function Faq() {
  return (
    <section id="preguntas" aria-labelledby="preguntas-t" className="bg-white">
      <div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-24 md:px-8 md:py-32 lg:grid-cols-[0.8fr_1.2fr]">
        <Heading id="preguntas-t" dark={false} chip="Preguntas frecuentes" title="Lo que conviene saber antes de empezar." accent="antes de empezar" />
        <div className="divide-y divide-line border-y border-line">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-medium tracking-[-0.01em] text-ink"><span>{f.q}</span><span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line text-lg leading-none text-muted transition-[transform,background-color] duration-200 group-open:rotate-45 group-open:bg-mint-soft" aria-hidden>+</span></summary>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ===== Cierre con video ===== */

const ACCESS = [
  { to: '/app', title: 'Abrir la aplicación', text: 'Organizaciones, evaluaciones e informes.' },
  { to: '/responder', title: 'Responder una entrevista', text: 'Para quien recibió un archivo de asignación.' },
  { to: '/app/academico', title: 'Laboratorio académico', text: 'Casos ficticios para diplomados y pregrado.' },
];

function Closing({ busy, onDemo }: { busy: boolean; onDemo: () => void }) {
  return (
    <section id="acceso" aria-labelledby="acceso-t" className="bg-white px-3 pb-3 md:px-5 md:pb-5">
      <MotionScope className="on-dark grain relative isolate overflow-hidden rounded-[32px] bg-midnight text-white">
        <div aria-hidden className="absolute inset-0 -z-10">
          <BackgroundVideo {...HERO_VIDEO} className="scale-125 opacity-80" />
          <div className="absolute inset-0 bg-midnight/45" />
        </div>
        <div className="mx-auto grid max-w-[1240px] gap-12 px-6 py-24 md:px-10 md:py-32 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <Reveal>
            <Chip>Comience hoy, sin registro</Chip>
            <h2 id="acceso-t" className="mt-6 font-display text-[2.4rem] leading-[1.02] font-semibold tracking-[-0.04em] text-white md:text-[4rem]">Su próximo diagnóstico empieza <em className="font-serif font-normal tracking-normal text-mint italic">aquí.</em></h2>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/app/evaluaciones/nueva" className={buttonClass('primary', 'lg', pill('h-12 px-7'))}>Crear una evaluación <ArrowRight className="size-4" aria-hidden /></Link>
              <button type="button" onClick={onDemo} disabled={busy} aria-busy={busy} className={buttonClass('outline-light', 'lg', pill('h-12 border-white/20 bg-white/[0.06] px-7 backdrop-blur'))}>{busy ? 'Abriendo…' : 'Explorar caso de demostración'}</button>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <ul className="divide-y divide-white/10 overflow-hidden rounded-[20px] border border-white/10 bg-midnight/50 backdrop-blur-md">
              {ACCESS.map((a) => (
                <li key={a.to}><Link to={a.to} className="group flex min-h-16 items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-white/[0.06]"><span><span className="block font-semibold text-white">{a.title}</span><span className="text-xs text-fog">{a.text}</span></span><ArrowUpRight className="size-4 shrink-0 text-mint transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden /></Link></li>
              ))}
            </ul>
          </Reveal>
        </div>
      </MotionScope>
    </section>
  );
}
