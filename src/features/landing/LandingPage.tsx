import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check, HardDrive, KeyRound, Layers3, ShieldCheck, WifiOff } from 'lucide-react';
import { DIMENSIONS, QUESTIONS, SOURCES } from '@/data/bank';
import { MGDA_FAMILIES, MODALITY_LABEL } from '@/config/vocabulary';
import { openOrLoadDemo } from '@/services/demo';
import { attempt } from '@/app/store';
import { buttonClass } from '@/components/ui';
import {
  AnimatedCounter, BackgroundVideo, Marquee, MotionScope, Reveal, ScrollRevealText, SplitWords, WordRotator,
  useActiveStep, useElementProgress, useMagnetic, usePointerTilt, useSpotlight,
} from '@/components/motion';
import { cx, fmtPct } from '@/utils/core';
import { MODALITY_INFO } from '../common';
import { Carousel, type Slide } from './Carousel';
import { DEMO_FIGURES } from './figures';
import { DETAILS, HERO_PRODUCT, HERO_VIDEO, SHOTS } from './media';
import { METHOD_SCENES, SceneDevice, WhenNear, useWide } from './scenes';

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
  { title: 'Caracterice y entreviste', accent: 'entreviste', text: 'Registre la organización, elija la modalidad y entreviste a cada perfil. Las entrevistas también se distribuyen por archivo y se responden sin conexión.', points: ['Aplicabilidad según la naturaleza jurídica', 'Una respuesta por participante, consolidada por mediana', 'Respuestas especiales que nunca se convierten en cero'] },
  { title: 'Evidencie y valide', accent: 'valide', text: 'Cada criterio guarda su sustento documental del E0 al E3. En la mesa de validación se contrasta lo percibido con lo demostrado.', points: ['Discrepancias y contradicciones detectadas', 'Lo validado nunca sobrescribe lo respondido', 'Justificación y registro de cada decisión'] },
  { title: 'Analice y priorice', accent: 'priorice', text: 'Madurez por dimensión y familia, brechas frente a la meta, riesgos y una hoja de ruta ordenada por prioridad explicada.', points: ['Fórmulas deterministas y documentadas', 'Prioridad de cinco factores con dependencias', 'Informes ejecutivo y técnico'] },
];

const MODALITIES = [
  { key: 'quick', featured: false, use: 'Una sesión', includes: ['Criterios estratégicos de cada dimensión', 'Comparación rápida de percepciones', 'Ideal para clase o primer acercamiento'] },
  { key: 'standard', featured: true, use: 'Varias entrevistas', includes: [`Incluye la modalidad ${MODALITY_LABEL.quick.toLowerCase()}`, 'Lectura amplia de capacidades', 'Evidencias, validación y hoja de ruta'] },
  { key: 'professional', featured: false, use: 'Consultoría', includes: [`Banco completo de ${QUESTIONS.length} criterios`, 'Distribución entre perfiles', 'Validación detallada criterio a criterio'] },
  { key: 'custom', featured: false, use: 'Alcance focalizado', includes: ['Dimensiones elegidas', 'Preguntas propias y metas', 'Exclusiones justificadas'] },
] as const;

const PRIVACY = [
  { icon: HardDrive, title: 'Datos en el dispositivo', text: 'IndexedDB del navegador. Sin servidor, cuentas, telemetría ni rastreadores.' },
  { icon: WifiOff, title: 'Sin conexión', text: 'Se instala como aplicación web progresiva después de la primera visita.' },
  { icon: KeyRound, title: 'Cifrado opcional', text: 'AES-GCM de 256 bits con clave derivada por PBKDF2. La contraseña no se guarda.' },
  { icon: Layers3, title: 'Respaldos bajo su control', text: 'Copia completa en un archivo que usted conserva y restaura donde quiera.' },
];

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
  useMagnetic();
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
      <ResultsBento />
      <Showcase />
      <Modalities />
      <Privacy />
      <Faq />
      <Closing busy={busy} onDemo={demo} />
    </div>
  );
}

/* ---------------------------------------------------------------------- */

function Chip({ children, dark = true }: { children: ReactNode; dark?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium', dark ? 'border-white/12 bg-white/[0.06] text-[#cfd7e3] backdrop-blur' : 'border-line bg-white text-muted')}>
      <span className={cx('size-1.5 rounded-full', dark ? 'bg-mint shadow-[0_0_10px_2px_rgba(53,217,164,0.6)]' : 'bg-mint-strong')} aria-hidden />{children}
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
      <h2 id={id} className={cx('mt-6 font-display text-[2.3rem] leading-[1.02] font-semibold tracking-[-0.04em] md:text-[3.6rem]', dark ? 'text-white' : 'text-ink')}>
        <Accent text={title} accent={accent} className={dark ? 'text-mint' : 'text-mint-strong'} />
      </h2>
      {lead && <p className={cx('mt-6 max-w-2xl text-base leading-relaxed md:text-lg', center && 'mx-auto', dark ? 'text-fog' : 'text-muted')}>{lead}</p>}
    </Reveal>
  );
}

/** Panel claro redondeado sobre el fondo oscuro de la página. */
function LightPanel({ id, labelledBy, children, className }: { id?: string; labelledBy: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={labelledBy} className="bg-midnight px-3 md:px-5">
      <div className={cx('overflow-hidden rounded-[36px] bg-soft md:rounded-[44px]', className)}>{children}</div>
    </section>
  );
}

/* ===== Héroe ===== */

const HERO_FEATURES = [
  { icon: ShieldCheck, text: 'Sin registro ni servidor' },
  { icon: WifiOff, text: 'Funciona sin conexión' },
  { icon: KeyRound, text: 'Exportación cifrable' },
];

function Hero({ busy, onDemo }: { busy: boolean; onDemo: () => void }) {
  const [frameRef, p] = useElementProgress<HTMLDivElement>(1, 0.55);
  const [tiltRef, tilt] = usePointerTilt<HTMLDivElement>(5);
  const lead = 'Diagnostique lo que funciona. Evidencie lo que falta.';
  return (
    <MotionScope as="section" aria-labelledby="hero-t" className="on-dark relative isolate overflow-hidden bg-midnight text-white">
      <div aria-hidden className="grain absolute inset-0 -z-10">
        <BackgroundVideo {...HERO_VIDEO} className="scale-105 opacity-95" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(11,16,32,0.05),rgba(11,16,32,0.7)_70%)]" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-midnight/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-b from-transparent to-midnight" />
      </div>

      <div className="mx-auto flex max-w-[1240px] flex-col items-center px-5 pt-36 pb-10 text-center md:px-8 md:pt-48">
        <Reveal><Chip>Modelo DIAM 1.0 · {QUESTIONS.length} criterios<span className="hidden sm:inline"> · 100 % en su navegador</span></Chip></Reveal>
        <h1 id="hero-t" className="mt-8 max-w-[1120px] font-display text-[2.7rem] leading-[0.98] font-semibold tracking-[-0.045em] text-white sm:text-[3.8rem] lg:text-[5.4rem]">
          <SplitWords text={lead} />{' '}
          <span className="sm:whitespace-nowrap"><SplitWords text="Priorice" start={7} />{' '}<span className="hero-word" style={{ '--i': 8 } as CSSProperties}><em className="font-serif font-normal tracking-normal text-mint italic">lo que sigue.</em></span></span>
        </h1>
        <Reveal delay={420}>
          <p className="mx-auto mt-8 max-w-[640px] text-lg leading-relaxed text-[#cfd7e3] md:text-xl">Madurez documental y de gobierno de la información con entrevistas, evidencias y resultados trazables.</p>
          <p className="mt-3 text-base text-fog md:text-lg"><WordRotator prefix="Para" wordClassName="font-medium text-white" words={['entidades públicas', 'empresas privadas', 'archivos y centros de documentación', 'equipos de consultoría', 'programas académicos']} /></p>
        </Reveal>
        <Reveal delay={520} className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <span data-magnetic className="inline-flex"><Link to="/app/organizaciones/nueva" className={buttonClass('primary', 'lg', pill('btn-shine h-[52px] px-8 text-[0.95rem] shadow-[0_14px_44px_-12px_rgba(53,217,164,0.8)]'))}>Iniciar diagnóstico <ArrowRight className="size-4" aria-hidden /></Link></span>
          <span data-magnetic className="inline-flex"><Link to="/metodologia" className={buttonClass('outline-light', 'lg', pill('h-[52px] border-white/20 bg-white/[0.07] px-8 text-[0.95rem] backdrop-blur-md'))}>Conocer la metodología</Link></span>
        </Reveal>
        <Reveal delay={600}>
          <button type="button" onClick={onDemo} disabled={busy} aria-busy={busy} className="mt-5 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-fog underline-offset-4 transition-colors hover:text-white hover:underline disabled:opacity-60">
            {busy ? 'Abriendo…' : 'Explorar demostración'}<ArrowRight className="size-3.5" aria-hidden />
          </button>
        </Reveal>
        <Reveal delay={660} className="mt-5">
          <ul className="flex flex-wrap justify-center gap-x-7 gap-y-3 text-sm text-[#cfd7e3]" aria-label="Funcionamiento">
            {HERO_FEATURES.map((f) => <li key={f.text} className="flex items-center gap-2"><f.icon className="size-4 text-mint" aria-hidden />{f.text}</li>)}
          </ul>
        </Reveal>

        {/* Vista real del producto: se endereza al desplazarse y se inclina con el puntero. */}
        <div ref={frameRef} className="relative mt-20 w-full [perspective:2000px]">
          <div ref={tiltRef} className="relative mx-auto max-w-[1160px] origin-top transition-transform duration-200 ease-out will-change-transform" style={{ transform: `rotateX(${(1 - p) * 18 + tilt.x}deg) rotateY(${tilt.y}deg) scale(${0.93 + p * 0.07})` }}>
            <div aria-hidden className="absolute -inset-x-16 top-16 -bottom-16 -z-10 rounded-[60px] bg-[radial-gradient(ellipse_at_center,rgba(53,217,164,0.42),rgba(142,120,247,0.18)_45%,transparent_70%)] blur-3xl" />
            <div className="glow-border rounded-[22px]">
              <div className="overflow-hidden rounded-[22px] border border-white/12 bg-[#0f1626]/80 p-2 shadow-[0_60px_140px_-30px_rgba(0,0,0,0.95)] backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3 px-3 pt-1 pb-2.5 text-[11px] text-fog">
                  <span className="flex gap-1.5" aria-hidden><span className="size-2.5 rounded-full bg-white/20" /><span className="size-2.5 rounded-full bg-white/20" /><span className="size-2.5 rounded-full bg-white/20" /></span>
                  <span className="truncate">docmaturity · Resultados</span>
                  <span className="rounded-full border border-mint/40 px-2 py-0.5 text-[10px] text-mint">Datos de demostración</span>
                </div>
                <div className="glare rounded-[14px]">
                  <img src={HERO_PRODUCT.src} srcSet={`${HERO_PRODUCT.small} 1200w, ${HERO_PRODUCT.src} 2000w`} sizes="(min-width: 1200px) 1160px, 94vw" alt="Tablero de resultados de DOCMATURITY con un caso de demostración: madurez percibida, cobertura, soporte de evidencias y solidez del diagnóstico" className="block h-auto w-full rounded-[14px]" width={2000} height={1250} decoding="async" />
                </div>
              </div>
            </div>
            {/* Anotaciones con cifras reales del caso de demostración (verificadas por prueba unitaria). */}
            <ul aria-label="Cifras del caso de demostración" className="pointer-events-none absolute inset-0 hidden lg:block">
              <Annotation className="top-[18%] -left-14" delay="0s" label="Madurez percibida" value={DEMO_FIGURES.perceived} unit="/ 5" />
              <Annotation className="top-[46%] -right-12" delay="1.2s" label="Cobertura del diagnóstico" value={DEMO_FIGURES.coverage} />
              <Annotation className="bottom-[16%] -left-10" delay="2.1s" label="Índice de solidez" value={DEMO_FIGURES.solidity} unit="/ 100" />
            </ul>
          </div>
        </div>
      </div>
    </MotionScope>
  );
}

function Annotation({ label, value, unit, className, delay }: { label: string; value: string; unit?: string; className: string; delay: string }) {
  return (
    <li className={cx('float-slow absolute rounded-2xl border border-white/15 bg-midnight/70 px-4 py-3 text-left shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl', className)} style={{ animationDelay: delay }}>
      <span className="block text-[11px] text-fog">{label}</span>
      <span className="mt-0.5 flex items-baseline gap-1"><span className="font-display text-2xl font-semibold tracking-[-0.03em] text-white num">{value}</span>{unit && <span className="text-xs text-fog">{unit}</span>}</span>
    </li>
  );
}

/* ===== Marquesina de referentes ===== */

function ReferencesMarquee() {
  const names = SOURCES.filter((s) => s.type !== 'referente_academico' && s.shortLabel !== 'Complementarios').map((s) => s.shortLabel);
  const half = Math.ceil(names.length / 2);
  const row = (xs: string[]) => xs.map((t) => (
    <span className="flex items-center">
      <span className="px-7 font-display text-lg font-medium tracking-[-0.01em] whitespace-nowrap text-white/50 transition-colors duration-300 hover:text-white md:text-[1.35rem]">{t}</span>
      <span className="size-1 rounded-full bg-mint/50" aria-hidden />
    </span>
  ));
  return (
    <MotionScope as="section" aria-label="Referentes metodológicos" className="on-dark bg-midnight pt-10 pb-16">
      <p className="mb-9 px-5 text-center text-sm text-fog">Construido a partir de normativa colombiana, estándares internacionales y modelos de madurez. <Link to="/referentes" className="ml-1 font-medium text-mint hover:underline">Ver los {SOURCES.length} referentes</Link></p>
      <Marquee label="Referentes, primera fila" items={row(names.slice(0, half))} duration={60} />
      <Marquee label="Referentes, segunda fila" items={row(names.slice(half))} duration={68} reverse className="mt-5" />
      <p className="mx-auto mt-9 max-w-2xl px-5 text-center text-xs text-fog/75">Asociaciones conceptuales: no implican aval del AGN ni de organismos de normalización.</p>
    </MotionScope>
  );
}

/* ===== Cifras ===== */

function Metrics() {
  return (
    <section aria-label="El modelo en cifras" className="on-dark bg-midnight text-white">
      <div className="mx-auto max-w-[1240px] px-5 md:px-8">
        <dl className="grid grid-cols-2 gap-y-12 border-y border-white/[0.08] py-16 md:grid-cols-5 md:py-20">
          {METRICS.map((m, i) => (
            <Reveal key={m.label} delay={i * 80} className={cx('px-5', i > 0 && 'md:border-l md:border-white/[0.08]')}>
              <dt className="sr-only">{m.label}</dt>
              <dd className="text-gradient font-display text-[3.2rem] leading-none font-semibold tracking-[-0.05em] lg:text-[4.6rem]"><AnimatedCounter value={m.value} duration={1400} /></dd>
              <dd className="mt-4 text-sm font-medium text-white" aria-hidden>{m.label}</dd>
              <dd className="mt-0.5 text-xs text-fog">{m.note}</dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ===== Método: narrativa fija al desplazarse ===== */

/** Fondo de las escenas del método: superficie oscura, retícula de puntos y luz ambiental. */
function SceneBackdrop() {
  return (
    <>
      <div aria-hidden className="sc-dots absolute inset-0" />
      <div aria-hidden className="absolute -top-28 -left-24 size-[22rem] rounded-full bg-mint/[0.10] blur-3xl" />
      <div aria-hidden className="absolute -right-24 bottom-0 size-[26rem] rounded-full bg-violet/[0.13] blur-3xl" />
    </>
  );
}

function Method() {
  const [active, bind] = useActiveStep(STEPS.length);
  const wide = useWide();
  // Cada vez que un paso se activa, su escena empieza desde el principio.
  const [runs, setRuns] = useState(() => STEPS.map(() => 0));
  useEffect(() => { setRuns((r) => r.map((v, i) => (i === active ? v + 1 : v))); }, [active]);
  return (
    <MotionScope as="section" id="como-funciona" aria-labelledby="como-funciona-t" className="on-dark relative bg-midnight text-white">
      <div className="mx-auto max-w-[1240px] px-5 pt-28 pb-10 md:px-8 md:pt-36">
        <Heading id="como-funciona-t" chip="Cómo funciona" title="Del documento a la decisión, en tres pasos." accent="decisión" lead="Cada paso deja un registro que alimenta al siguiente. Nada se calcula fuera del motor ni pierde su vínculo con el criterio y la evidencia." />
      </div>
      <div className="mx-auto grid max-w-[1240px] gap-10 px-5 pb-28 md:px-8 lg:grid-cols-[1.08fr_1fr] lg:gap-20 md:pb-36">
        {/* Visual fijo (escritorio): la escena del paso activo se anima; las demás esperan en pausa. */}
        <div className="hidden lg:block">
          <div className="sticky top-28 h-[min(620px,calc(100vh-9rem))]">
            <div className="relative h-full overflow-hidden rounded-[32px] border border-white/10 bg-[#0D1424] shadow-[0_50px_120px_-50px_rgba(0,0,0,0.9)]">
              <SceneBackdrop />
              {wide && (
                <WhenNear className="absolute inset-0">
                  {METHOD_SCENES.map((Scene, i) => (
                    <div key={STEPS[i].title} data-paused={i !== active} className={cx('absolute inset-0 transition-[opacity,transform] duration-700 ease-out', i === active ? 'scale-100 opacity-100' : 'scale-[0.98] opacity-0')}>
                      <Scene key={runs[i]} />
                    </div>
                  ))}
                </WhenNear>
              )}
              <div className="absolute inset-x-7 bottom-7 flex items-end justify-between">
                <p aria-hidden className="font-display text-[clamp(3.5rem,9vh,5rem)] leading-none font-semibold tracking-[-0.05em] text-white/90 num">0{active + 1}</p>
                <ol className="mb-3 flex gap-2" aria-hidden>
                  {STEPS.map((s, i) => <li key={s.title} className={cx('h-1 rounded-full transition-all duration-500', i === active ? 'w-10 bg-mint' : 'w-4 bg-white/25')} />)}
                </ol>
              </div>
            </div>
          </div>
        </div>
        <ol className="space-y-16 lg:space-y-0">
          {STEPS.map((s, i) => {
            const Scene = METHOD_SCENES[i];
            return (
              <li key={s.title} ref={bind(i)} data-step={i} className={cx('transition-opacity duration-500 lg:flex lg:min-h-[78vh] lg:items-center', i === active ? 'lg:opacity-100' : 'lg:opacity-35')}>
                <div>
                  <div className="relative mb-8 overflow-hidden rounded-[24px] border border-white/10 bg-[#0D1424] lg:hidden">
                    <SceneBackdrop />
                    <WhenNear className="relative aspect-[560/520]">{!wide && <Scene viewBox="0 0 560 520" />}</WhenNear>
                  </div>
                  <p className="font-display text-sm font-semibold text-mint num">Paso 0{i + 1}</p>
                  <h3 className="mt-4 font-display text-[2.1rem] leading-[1.04] font-semibold tracking-[-0.035em] text-white md:text-[3rem]"><Accent text={s.title} accent={s.accent} className="text-mint" /></h3>
                  <p className="mt-6 max-w-lg text-base leading-relaxed text-fog md:text-lg">{s.text}</p>
                  <ul className="mt-8 space-y-3.5 border-t border-white/[0.08] pt-7">
                    {s.points.map((pt) => <li key={pt} className="flex items-start gap-3 text-[0.95rem] text-[#d6dde8]"><span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-mint/15 text-mint"><Check className="size-3" aria-hidden /></span>{pt}</li>)}
                  </ul>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </MotionScope>
  );
}

/* ===== Mosaico de resultados con recortes reales ===== */

function Tile({ title, text, img, alt, className, imgClassName, dark = false }: { title: string; text: string; img: string; alt: string; className?: string; imgClassName?: string; dark?: boolean }) {
  return (
    <Reveal as="li" className={cx('spotlight group relative flex flex-col overflow-hidden rounded-[28px] border p-7 md:p-8', dark ? 'border-white/10 bg-midnight text-white [--spot:rgb(53_217_164/0.18)]' : 'border-line bg-white', className)}>
      <h3 className={cx('font-display text-xl font-semibold tracking-[-0.02em] md:text-[1.4rem]', dark ? 'text-white' : 'text-ink')}>{title}</h3>
      <p className={cx('mt-2 max-w-md text-sm leading-relaxed', dark ? 'text-fog' : 'text-muted')}>{text}</p>
      <div className="relative mt-7 min-h-0 flex-1 [mask-image:linear-gradient(to_bottom,#000_78%,transparent)]">
        <img src={img} alt={alt} loading="lazy" decoding="async" className={cx('w-full rounded-[16px] border border-line bg-white object-cover object-top shadow-[0_30px_60px_-35px_rgba(11,16,32,0.55)] transition-transform duration-700 ease-out group-hover:-translate-y-1.5 group-hover:scale-[1.015]', imgClassName)} />
      </div>
    </Reveal>
  );
}

function ResultsBento() {
  return (
    <LightPanel labelledBy="resultados-t">
      <div className="mx-auto max-w-[1240px] px-5 py-24 md:px-10 md:py-32">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-end">
          <Heading id="resultados-t" dark={false} chip="Resultados" title="Cifras que se pueden auditar." accent="auditar" />
          <Reveal delay={100}><p className="max-w-xl text-base leading-relaxed text-muted lg:ml-auto">Cada gráfico tiene su tabla alternativa y cada cifra conserva su vínculo con la respuesta, la evidencia y la decisión de validación que la sustentan. Imágenes del caso de demostración.</p></Reveal>
        </div>
        <ul className="mt-16 grid gap-4 lg:grid-cols-6">
          <Tile className="lg:col-span-4" title="Mesa de validación" text="El nivel final se decide con justificación, evidencias asociadas y contradicciones resueltas; lo respondido se conserva." img={DETAILS.validacion} alt="Formulario de validación del evaluador con el nivel final, la justificación y la evidencia asociada" imgClassName="max-h-[330px]" />
          <Tile className="lg:col-span-2" dark title="Percepciones por perfil" text="La mediana de cada grupo por dimensión muestra dónde coinciden y dónde divergen." img={DETAILS.calor} alt="Mapa de calor con la mediana de respuestas por dimensión y perfil" imgClassName="border-white/10" />
          <Tile className="lg:col-span-2" title="Madurez por dimensión" text="Serie percibida frente a la meta en las quince dimensiones; la distancia es la brecha." img={DETAILS.radar} alt="Radar de madurez percibida por dimensión frente a la meta" imgClassName="max-h-[300px]" />
          <Tile className="lg:col-span-2" title="Matriz de riesgos" text="Probabilidad por impacto, con bandas explícitas." img={DETAILS.riesgos} alt="Matriz de riesgos de probabilidad por impacto" imgClassName="max-h-[300px]" />
          <Tile className="lg:col-span-2" title="Hoja de ruta por fases" text="Iniciativas en cuatro fases que respetan las dependencias." img={DETAILS.gantt} alt="Diagrama de la hoja de ruta con iniciativas en cuatro fases" imgClassName="max-h-[300px]" />
        </ul>
      </div>
    </LightPanel>
  );
}

/* ===== Carrusel de pantallas ===== */

function Showcase() {
  return (
    <MotionScope as="section" id="plataforma" aria-labelledby="plataforma-t" className="on-dark relative isolate overflow-hidden bg-midnight py-28 text-white md:py-36">
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[600px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(142,120,247,0.24),transparent_65%)]" />
      <div className="mx-auto mb-14 flex max-w-[1240px] flex-wrap items-end justify-between gap-6 px-5 md:px-8">
        <Heading id="plataforma-t" chip="La plataforma por dentro" title="Pensada para trabajar, no solo para mirar." accent="trabajar" />
        <Reveal><span data-magnetic className="inline-flex"><Link to="/app" className={buttonClass('outline-light', 'md', pill('h-11 border-white/20 px-5'))}>Abrir la aplicación <ArrowUpRight className="size-4" aria-hidden /></Link></span></Reveal>
      </div>
      <Carousel slides={SLIDES} label="Pantallas de la aplicación" />
    </MotionScope>
  );
}

/* ===== Modalidades ===== */

function Modalities() {
  return (
    <MotionScope as="section" id="modalidades" aria-labelledby="modalidades-t" className="on-dark relative isolate overflow-hidden bg-midnight text-white">
      <div aria-hidden className="absolute -bottom-48 left-1/2 -z-10 h-[620px] w-[1000px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(53,217,164,0.16),transparent_65%)]" />
      <div className="mx-auto max-w-[1240px] px-5 pt-8 pb-28 md:px-8 md:pb-36">
        <Heading id="modalidades-t" center chip="Modalidades" title="Elija la profundidad del diagnóstico." accent="profundidad" lead="Las tres modalidades del banco son acumulativas: cada una incluye los criterios de la anterior." />
        <ul className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {MODALITIES.map((m, i) => {
            const n = MODALITY_INFO[m.key].count;
            return (
              <Reveal as="li" key={m.key} delay={i * 80} className={cx('spotlight relative flex flex-col rounded-[26px] border p-7', m.featured ? 'glow-border border-mint/30 bg-[linear-gradient(180deg,rgba(53,217,164,0.16),rgba(18,26,42,1)_55%)] shadow-[0_40px_90px_-40px_rgba(53,217,164,0.65)]' : 'border-white/10 bg-surface/80')}>
                {m.featured && <span className="absolute -top-3 left-7 z-10 rounded-full bg-mint px-3 py-1 text-[11px] font-semibold text-midnight">Recomendada</span>}
                <h3 className="font-display text-lg font-semibold text-white">{MODALITY_LABEL[m.key]}</h3>
                <p className="mt-1 text-sm text-fog">{m.use}</p>
                <p className="mt-9 flex items-baseline gap-2">
                  <span className={cx('text-gradient font-display leading-none font-semibold tracking-[-0.05em] num', n ? 'text-[3.6rem]' : 'text-[2.5rem]')}>{n ?? 'A medida'}</span>
                  {n && <span className="text-sm text-fog">criterios</span>}
                </p>
                <p className="mt-2 text-xs text-fog">{n ? `${fmtPct((n / QUESTIONS.length) * 100)} del banco` : 'Dimensiones y criterios elegidos'}</p>
                <ul className="mt-8 flex-1 space-y-3 border-t border-white/10 pt-7">
                  {m.includes.map((t) => <li key={t} className="flex items-start gap-2.5 text-sm text-[#d6dde8]"><Check className="mt-0.5 size-4 shrink-0 text-mint" aria-hidden />{t}</li>)}
                </ul>
                <Link to="/app/evaluaciones/nueva" className={buttonClass(m.featured ? 'primary' : 'outline-light', 'md', pill('mt-9 h-11 w-full', m.featured ? 'btn-shine' : 'border-white/20'))}>Elegir esta modalidad<span className="sr-only">: {MODALITY_LABEL[m.key]}</span></Link>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </MotionScope>
  );
}

/* ===== Privacidad ===== */

function Privacy() {
  return (
    <LightPanel id="proteccion" labelledBy="proteccion-t">
      <div className="mx-auto grid max-w-[1240px] items-center gap-14 px-5 py-24 md:px-10 md:py-32 lg:grid-cols-[1.35fr_1fr] lg:gap-12">
        <Reveal className="relative order-last lg:order-first lg:-ml-6">
          <MotionScope className="relative">
            <WhenNear className="aspect-[640/508]"><SceneDevice /></WhenNear>
            <div className="mt-3 ml-[4%] flex max-w-md items-center gap-3 rounded-2xl bg-midnight p-4 text-white shadow-[0_30px_60px_-30px_rgba(11,16,32,0.6)]">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-mint text-midnight"><ShieldCheck className="size-5" aria-hidden /></span>
              <p className="text-sm"><span className="block font-semibold">Ninguna solicitud a servidores externos</span><span className="text-fog">Se comprueba en cada versión con pruebas automáticas.</span></p>
            </div>
          </MotionScope>
        </Reveal>
        <div>
          <Heading id="proteccion-t" dark={false} chip="Privacidad y autonomía" title="Su información no sale del dispositivo." accent="no sale" lead="Usted decide qué se exporta, con quién se comparte y cuándo se respalda." />
          <ul className="mt-12 grid gap-x-8 gap-y-9 sm:grid-cols-2">
            {PRIVACY.map((it, i) => (
              <Reveal as="li" key={it.title} delay={i * 70} className="border-t border-line pt-6">
                <it.icon className="size-5 text-mint-strong" aria-hidden />
                <h3 className="mt-4 font-display text-lg font-semibold tracking-[-0.01em] text-ink">{it.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{it.text}</p>
              </Reveal>
            ))}
          </ul>
          <Reveal className="mt-10"><Link to="/privacidad" className="inline-flex items-center gap-1.5 text-sm font-semibold text-mint-strong hover:underline">Leer la política de privacidad <ArrowRight className="size-4" aria-hidden /></Link></Reveal>
        </div>
      </div>
    </LightPanel>
  );
}

/* ===== Preguntas frecuentes ===== */

function Faq() {
  return (
    <section id="preguntas" aria-labelledby="preguntas-t" className="on-dark bg-midnight text-white">
      <div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-28 md:px-8 md:py-36 lg:grid-cols-[0.8fr_1.2fr]">
        <Heading id="preguntas-t" chip="Preguntas frecuentes" title="Lo que conviene saber antes de empezar." accent="antes de empezar" />
        <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-6">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-medium tracking-[-0.01em] text-white md:text-xl"><span>{f.q}</span><span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-lg leading-none text-fog transition-[transform,background-color,color] duration-300 group-open:rotate-45 group-open:bg-mint group-open:text-midnight" aria-hidden>+</span></summary>
              <p className="mt-4 max-w-2xl text-[0.95rem] leading-relaxed text-fog">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ===== Cierre: declaración y acceso sobre video ===== */

const ACCESS = [
  { to: '/app', title: 'Abrir la aplicación', text: 'Organizaciones, evaluaciones e informes.' },
  { to: '/responder', title: 'Responder una entrevista', text: 'Para quien recibió un archivo de asignación.' },
  { to: '/app/academico', title: 'Laboratorio académico', text: 'Casos ficticios para diplomados y pregrado.' },
];

function Closing({ busy, onDemo }: { busy: boolean; onDemo: () => void }) {
  return (
    <section id="acceso" aria-labelledby="acceso-t" className="bg-midnight px-3 pb-3 md:px-5 md:pb-5">
      <MotionScope className="on-dark grain relative isolate overflow-hidden rounded-[36px] border border-white/10 bg-midnight text-white md:rounded-[44px]">
        <div aria-hidden className="absolute inset-0 -z-10">
          <BackgroundVideo {...HERO_VIDEO} className="scale-125 opacity-85" />
          <div className="absolute inset-0 bg-midnight/50" />
        </div>
        <div className="mx-auto max-w-[1240px] px-6 pt-28 pb-24 md:px-12 md:pt-36 md:pb-28">
          <ScrollRevealText as="p" className="max-w-[1000px] font-display text-[2rem] leading-[1.1] font-semibold tracking-[-0.035em] text-white md:text-[3.5rem]" text="Una organización no alcanza madurez por tener documentos. La demuestra en sus capacidades de gestión." />
          <div className="mt-20 grid gap-12 border-t border-white/10 pt-14 lg:grid-cols-[1.3fr_1fr] lg:items-end">
            <Reveal>
              <Chip>Comience hoy, sin registro</Chip>
              <h2 id="acceso-t" className="mt-6 font-display text-[2.4rem] leading-[1.02] font-semibold tracking-[-0.045em] text-white md:text-[4.2rem]">Su próximo diagnóstico empieza <em className="font-serif font-normal tracking-normal text-mint italic">aquí.</em></h2>
              <div className="mt-10 flex flex-wrap gap-3">
                <span data-magnetic className="inline-flex"><Link to="/app/evaluaciones/nueva" className={buttonClass('primary', 'lg', pill('btn-shine h-[52px] px-8'))}>Crear una evaluación <ArrowRight className="size-4" aria-hidden /></Link></span>
                <span data-magnetic className="inline-flex"><button type="button" onClick={onDemo} disabled={busy} aria-busy={busy} className={buttonClass('outline-light', 'lg', pill('h-[52px] border-white/20 bg-white/[0.07] px-8 backdrop-blur-md'))}>{busy ? 'Abriendo…' : 'Explorar caso de demostración'}</button></span>
              </div>
              <p className="mt-8 text-xs text-fog">Herramienta de autodiagnóstico y consultoría: no certifica ni emite puntajes oficiales.</p>
            </Reveal>
            <Reveal delay={120}>
              <ul className="divide-y divide-white/10 overflow-hidden rounded-[22px] border border-white/10 bg-midnight/55 backdrop-blur-xl">
                {ACCESS.map((a) => (
                  <li key={a.to}><Link to={a.to} className="group flex min-h-[72px] items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-white/[0.06]"><span><span className="block font-semibold text-white">{a.title}</span><span className="text-xs text-fog">{a.text}</span></span><span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-mint transition-[transform,background-color,color] duration-300 group-hover:rotate-45 group-hover:bg-mint group-hover:text-midnight"><ArrowUpRight className="size-4" aria-hidden /></span></Link></li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </MotionScope>
    </section>
  );
}
