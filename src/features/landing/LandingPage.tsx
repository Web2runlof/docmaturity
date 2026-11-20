import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BarChart3, Building2, Check, ClipboardCheck, FileJson, FileSearch, GraduationCap, Lock, Route, ShieldCheck, Users } from 'lucide-react';
import { DIMENSIONS, QUESTIONS, SOURCES, LEVEL_NAMES, getDimensionFamily } from '@/data/bank';
import type { VerificationStatus } from '@/types/bank';
import { EChart } from '@/components/charts/EChart';
import { LevelLegend } from '@/components/charts/LevelLegend';
import { heatmapOption } from '@/components/charts/options';
import { DEFAULT_THRESHOLDS, LEVEL_COLORS } from '@/engine/constants';
import { levelIndex } from '@/engine/scoring';
import { openOrLoadDemo } from '@/services/demo';
import { attempt } from '@/app/store';
import { MGDA_FAMILIES, TIER_LABEL, VERIFICATION_LABEL, WORK_CYCLE } from '@/config/vocabulary';
import { cx, fmtPct, fmtScore } from '@/utils/core';

/** Datos ilustrativos simulados para la composición visual de la portada (no provienen de ninguna organización). */
const ILLUSTRATIVE = {
  global: 2.1,
  coverage: 86,
  support: 41,
  families: [2.62, 1.9, 2.45, 1.38, 2.05],
  /** Brechas en orden de prioridad, con códigos y nombres reales del banco. */
  gaps: [
    { id: 'D11-Q01', level: 1, target: 3 },
    { id: 'D03-Q02', level: 1.5, target: 3 },
    { id: 'D03-Q01', level: 2, target: 3 },
  ],
  /** Mapa de calor ilustrativo: familia (filas) × perfil (columnas). */
  heatCols: ['Alta dirección', 'Gestión documental', 'Tecnología', 'Jurídica'],
  heat: [
    [3.0, 2.5, 2.0, 2.5],
    [2.0, 2.5, 1.5, 1.0],
    [2.5, 3.0, 2.0, 2.0],
    [1.5, 2.0, 2.5, 1.0],
    [2.0, 2.5, 1.5, 2.0],
  ],
};

const CYCLE_ICONS = { caracterizar: Building2, alcance: ClipboardCheck, entrevistar: Users, validar: FileSearch, analizar: BarChart3, planear: Route } as const;

const TIER_COUNTS = { quick: QUESTIONS.filter((q) => q.coreTier === 'quick').length, standard: QUESTIONS.filter((q) => q.coreTier !== 'professional').length, professional: QUESTIONS.length };
const MODALITIES = [
  { name: TIER_LABEL.quick, count: TIER_COUNTS.quick, time: 'Una sesión', color: LEVEL_COLORS[5], text: 'Panorama inicial con los criterios esenciales de cada dimensión.' },
  { name: TIER_LABEL.standard, count: TIER_COUNTS.standard, time: 'Varias entrevistas', color: LEVEL_COLORS[3], text: `Diagnóstico equilibrado para planificar con varios perfiles. Incluye los criterios de la modalidad ${TIER_LABEL.quick}.` },
  { name: TIER_LABEL.professional, count: TIER_COUNTS.professional, time: 'Consultoría', color: '#8FC9C0', text: 'Todos los criterios del banco, con evidencias y validación detallada.' },
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

const coverageBandLabel = (v: number) => (v < DEFAULT_THRESHOLDS.coverageInsufficient ? 'Insuficiente' : v < DEFAULT_THRESHOLDS.coverageExploratory ? 'Exploratoria' : v < DEFAULT_THRESHOLDS.coveragePartial ? 'Parcial' : 'Alta');

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
  const typeCounts = SOURCES.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.type]: (acc[s.type] ?? 0) + 1 }), {});
  const verification = (Object.keys(VERIFICATION_LABEL) as VerificationStatus[]).map((k) => ({ k, label: VERIFICATION_LABEL[k], n: SOURCES.filter((s) => s.verificationStatus === k).length }));
  const critical = QUESTIONS.filter((q) => q.isCritical).length;

  return (
    <>
      <Hero busy={busy} onDemo={demo} />

      {/* 1. Introducción */}
      <Band id="introduccion" eyebrow="01 · El diagnóstico" title="Un diagnóstico que distingue lo que se percibe de lo que se demuestra.">
        <div className="grid gap-10 md:grid-cols-3">
          <Prose title="Qué evalúa">Capacidades organizacionales para crear, gestionar, proteger, preservar y aprovechar documentos e información, desde la política hasta la automatización.</Prose>
          <Prose title="Cómo lo sustenta">Cada criterio tiene seis descriptores de nivel, verificaciones observables y evidencias sugeridas. Los resultados declaran su cobertura y su soporte de evidencias.</Prose>
          <Prose title="Qué no hace">No certifica, no emite puntajes oficiales y no reemplaza el análisis jurídico. Las asociaciones con referentes son conceptuales y verificables.</Prose>
        </div>
      </Band>

      {/* 2. Cómo funciona */}
      <Band id="como-funciona" eyebrow="02 · Cómo funciona" title="Seis momentos de un mismo ciclo de trabajo." tone="white">
        <ol className="grid gap-x-10 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
          {WORK_CYCLE.map((s, i) => {
            const Icon = CYCLE_ICONS[s.key as keyof typeof CYCLE_ICONS];
            return (
              <li key={s.key} className="border-t-2 border-navy pt-5">
                <div className="flex items-baseline justify-between"><span className="font-display text-3xl font-semibold text-slate-300 num">{String(i + 1).padStart(2, '0')}</span><Icon className="size-5 text-teal" aria-hidden /></div>
                <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted">{s.text}</p>
              </li>
            );
          })}
        </ol>
        <p className="mt-8 text-sm"><Link to="/como-funciona" className="inline-flex items-center gap-1 font-medium text-teal hover:underline">Ver dónde se hace cada momento en la aplicación <ArrowRight className="size-4" aria-hidden /></Link></p>
      </Band>

      {/* 3. Dimensiones */}
      <Band id="dimensiones" eyebrow="03 · Dimensiones de evaluación" title="Quince dimensiones organizadas en cinco familias.">
        <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line lg:grid-cols-5">
          {MGDA_FAMILIES.map((f) => {
            const dims = DIMENSIONS.filter((d) => getDimensionFamily(d.id) === f.key);
            return (
              <div key={f.key} className="flex flex-col bg-white p-5">
                <p className="text-[11px] font-semibold tracking-[0.1em] text-gold uppercase">{f.key}</p>
                <h3 className="mt-2 text-base font-semibold">{f.title}</h3>
                <p className="mt-1 text-xs text-muted">{f.text}</p>
                <ul className="mt-4 space-y-2.5 border-t border-line pt-4">
                  {dims.map((d) => (
                    <li key={d.id} className="grid grid-cols-[36px_1fr] gap-2 text-sm">
                      <span className="text-xs font-semibold text-teal num">{d.id}</span>
                      <span><span className="font-medium text-ink">{d.name}</span><span className="block text-xs text-muted">{QUESTIONS.filter((q) => q.dimensionId === d.id).length} criterios</span></span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="mt-4 max-w-4xl text-xs text-muted">Las familias se inspiran en los componentes del Modelo de Gestión Documental y Administración de Archivos, usados como lente de lectura. La familia de cada dimensión corresponde a su componente MGDA predominante; cada criterio conserva su propio componente. {critical} criterios están marcados como críticos y generan alertas cuando se ubican en niveles 0 o 1. <Link to="/metodologia#componentes" className="text-teal hover:underline">Ver criterios por componente</Link>.</p>
      </Band>

      {/* 4. Referentes */}
      <Band id="referentes" eyebrow="04 · Referentes metodológicos" title="Fundamentación declarada, con estado de verificación por referente." tone="white">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4 text-sm text-muted">
            <p>El modelo se construyó a partir de normativa colombiana, estándares internacionales de gestión de documentos y preservación, modelos de madurez y requisitos de sistemas, y literatura académica.</p>
            <p>Cada uno de los {SOURCES.length} referentes declara si fue verificado, verificado parcialmente, usado como referencia conceptual o aún no verificado. DOCMATURITY no reproduce textos protegidos ni afirma correspondencias con cláusulas específicas.</p>
            <Link to="/referentes" className="inline-flex items-center gap-1 font-medium text-teal hover:underline">Ver el registro de referentes <ArrowRight className="size-4" aria-hidden /></Link>
          </div>
          <div className="space-y-5">
            <figure>
              <figcaption className="mb-2 text-xs font-semibold tracking-[0.08em] text-muted uppercase">Estado de verificación</figcaption>
              <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                {verification.map((v, i) => <span key={v.k} style={{ width: `${(v.n / SOURCES.length) * 100}%`, background: [LEVEL_COLORS[3], '#5FA59B', '#B9D8D3', '#E2E8F0'][i] }} />)}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
                {verification.map((v, i) => (
                  <div key={v.k}><dt className="flex items-center gap-1.5 text-xs text-muted"><span className="inline-block size-2.5 rounded-[2px]" style={{ background: [LEVEL_COLORS[3], '#5FA59B', '#B9D8D3', '#CBD5E1'][i] }} aria-hidden />{v.label}</dt><dd className="font-display text-2xl font-semibold text-navy num">{v.n}</dd></div>
                ))}
              </dl>
            </figure>
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
              {[
                ['norma_juridica', 'Normas jurídicas'], ['estandar_tecnico', 'Estándares técnicos'], ['modelo_madurez', 'Modelos de madurez'], ['modelo_requisitos', 'Modelos de requisitos'],
                ['metodologia', 'Metodologías'], ['buena_practica', 'Buenas prácticas'], ['modelo_gestion', 'Modelos de gestión'], ['referente_academico', 'Referentes académicos'],
              ].map(([k, label]) => (
                <div key={k} className="bg-white p-4"><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 font-display text-2xl font-semibold text-navy num">{typeCounts[k] ?? 0}</dd></div>
              ))}
            </dl>
          </div>
        </div>
      </Band>

      {/* 5. Modalidades */}
      <Band id="modalidades" eyebrow="05 · Modalidades de diagnóstico" title="La profundidad se ajusta al propósito.">
        <div className="panel p-6">
          <div className="relative h-3 rounded-full bg-slate-100" aria-hidden>
            {MODALITIES.slice().reverse().map((m) => <span key={m.name} className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(m.count / QUESTIONS.length) * 100}%`, background: m.color }} />)}
          </div>
          <div className="mt-6 grid gap-8 md:grid-cols-4">
            {MODALITIES.map((m) => (
              <div key={m.name}>
                <p className="font-display text-3xl font-semibold text-navy num">{m.count}</p>
                <p className="text-xs text-muted">criterios · {fmtPct((m.count / QUESTIONS.length) * 100)} del banco</p>
                <h3 className="mt-3 flex items-center gap-2 text-base font-semibold"><span className="size-2.5 rounded-sm" style={{ background: m.color }} aria-hidden />{m.name}</h3>
                <p className="text-xs font-medium text-teal">{m.time}</p>
                <p className="mt-1 text-sm text-muted">{m.text}</p>
              </div>
            ))}
            <div>
              <p className="font-display text-3xl font-semibold text-navy">A la medida</p>
              <p className="text-xs text-muted">dimensiones y criterios elegidos</p>
              <h3 className="mt-3 flex items-center gap-2 text-base font-semibold"><span className="size-2.5 rounded-sm border border-dashed border-slate-400" aria-hidden />Personalizado</h3>
              <p className="text-xs font-medium text-teal">Alcance focalizado</p>
              <p className="mt-1 text-sm text-muted">Dimensiones seleccionadas, preguntas propias y exclusiones justificadas.</p>
            </div>
          </div>
        </div>
      </Band>

      {/* 6. Entrevistas */}
      <Band id="entrevistas" eyebrow="06 · Entrevistas y consolidación" title="Entrevistas distribuidas sin servidor." tone="white">
        <InterviewLanes />
      </Band>

      {/* 7. Resultados visuales */}
      <Band id="resultados" eyebrow="07 · Resultados visuales" title="Resultados que muestran su propio grado de certeza.">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <figure className="panel p-5">
            <figcaption className="mb-2 flex items-baseline justify-between"><span className="text-sm font-semibold text-navy">Mapa de calor por familia y perfil</span><span className="text-[11px] text-muted">Datos ilustrativos</span></figcaption>
            <EChart height={260} label="Mapa de calor ilustrativo de mediana por familia y perfil de entrevistado" option={heatmapOption(MGDA_FAMILIES.map((f) => f.title), ILLUSTRATIVE.heatCols, ILLUSTRATIVE.heat, { valueLabel: 'Mediana' })} />
            <div className="mt-2"><LevelLegend /></div>
            <p className="mt-2 text-xs text-muted">En la aplicación, el mismo mapa se construye por dimensión y perfil (o área) con la mediana de las respuestas.</p>
          </figure>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['Madurez percibida y validada', 'Se presentan por separado; la validada solo considera criterios revisados por la persona evaluadora.'],
              ['Cobertura', `Cuántos criterios del alcance tienen datos. Por debajo de ${DEFAULT_THRESHOLDS.coverageExploratory} %, el resultado se marca como exploratorio.`],
              ['Soporte de evidencias', 'Nivel de sustento documental de cada criterio, de E0 a E3, expresado en porcentaje.'],
              ['Solidez diagnóstica', 'Índice orientativo de 0 a 100 que combina cobertura, evidencias y acuerdo entre entrevistados.'],
            ].map(([t, d]) => <div key={t} className="panel p-4"><h3 className="text-sm font-semibold">{t}</h3><p className="mt-1 text-xs text-muted">{d}</p></div>)}
            <div className="panel p-4 sm:col-span-2">
              <h3 className="text-sm font-semibold">Escala de madurez</h3>
              <ol className="mt-3 grid grid-cols-6 gap-1">{LEVEL_NAMES.map((n, i) => <li key={n} className="text-center"><span className="block h-1.5 rounded-sm" style={{ background: LEVEL_COLORS[i] }} /><span className="mt-1.5 block text-[11px] font-semibold num">{i}</span><span className="block text-[10px] leading-tight text-muted">{n}</span></li>)}</ol>
            </div>
          </div>
        </div>
      </Band>

      {/* 8. Protección */}
      <Band id="proteccion" eyebrow="08 · Protección de información" title="Minimización de datos por diseño." tone="white">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {[
            [Lock, 'Datos en el dispositivo', 'Sin servidor, sin cuentas, sin telemetría ni rastreadores externos.'],
            [FileJson, 'Archivos verificables', 'Paquetes con hash SHA-256 para detectar alteraciones accidentales. No constituyen firma digital.'],
            [ShieldCheck, 'Cifrado opcional', 'Exportaciones con AES-GCM de 256 bits y clave derivada con PBKDF2. La contraseña no se guarda.'],
            [FileSearch, 'Evidencias mínimas', 'Se recomienda registrar referencias y no adjuntar historias clínicas, expedientes reservados ni credenciales.'],
          ].map(([Icon, t, d]) => {
            const I = Icon as typeof Lock;
            return <div key={t as string}><I className="size-5 text-teal" aria-hidden /><h3 className="mt-3 text-base font-semibold">{t as string}</h3><p className="mt-1 text-sm text-muted">{d as string}</p></div>;
          })}
        </div>
        <p className="mt-8 max-w-3xl text-xs text-muted">La protección con contraseña de un archivo exportado no cifra los datos almacenados en el navegador. La aplicación no sustituye el análisis institucional de protección de datos personales. <Link to="/privacidad" className="text-teal hover:underline">Leer la política de privacidad</Link>.</p>
      </Band>

      {/* 9. FAQ */}
      <Band id="preguntas" eyebrow="09 · Preguntas frecuentes" title="Preguntas frecuentes.">
        <div className="max-w-3xl divide-y divide-line border-y border-line">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-navy"><span>{f.q}</span><span className="text-xl leading-none text-muted transition-transform group-open:rotate-45" aria-hidden>+</span></summary>
              <p className="mt-2 text-sm text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </Band>

      {/* 10. Acceso */}
      <section id="acceso" className="bg-navy text-white">
        <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-16 md:px-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] text-gold uppercase">10 · Acceso al producto</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Empiece por caracterizar la organización.</h2>
            <p className="mt-3 max-w-lg text-slate-300">La aplicación guía cada etapa. Puede explorar primero un caso de demostración ficticio y eliminarlo después.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/app/organizaciones/nueva" className="inline-flex h-11 items-center gap-2 rounded-md bg-white px-5 text-sm font-semibold text-navy hover:bg-slate-100">Iniciar diagnóstico</Link>
              <button onClick={demo} disabled={busy} className="inline-flex h-11 items-center rounded-md border border-white/30 px-5 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-60">Explorar caso de demostración</button>
            </div>
          </div>
          <ul className="grid gap-px overflow-hidden rounded-lg bg-white/10 text-sm">
            {[
              ['/app', 'Abrir la aplicación', 'Organizaciones, evaluaciones e informes.'],
              ['/responder', 'Responder una entrevista', 'Para personas que recibieron un archivo de asignación.'],
              ['/app/academico', 'Laboratorio académico', 'Casos ficticios para diplomados y pregrado.'],
            ].map(([to, t, d]) => (
              <li key={to}><Link to={to} className="flex items-center justify-between gap-4 bg-navy-dark/60 px-5 py-4 hover:bg-navy-dark"><span><span className="block font-semibold text-white">{t}</span><span className="text-xs text-slate-300">{d}</span></span>{to === '/app/academico' ? <GraduationCap className="size-5 text-gold" aria-hidden /> : <ArrowRight className="size-4 text-gold" aria-hidden />}</Link></li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

/** Héroe oscuro con tarjetas de vidrio: la composición usa datos ilustrativos y nombres reales del modelo. */
function Hero({ busy, onDemo }: { busy: boolean; onDemo: () => void }) {
  return (
    <section className="relative isolate overflow-hidden bg-[#07131D] text-white" aria-labelledby="hero-t">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '64px 64px', maskImage: 'radial-gradient(ellipse 70% 60% at 68% 42%, #000 20%, transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 68% 42%, #000 20%, transparent 75%)' }} />
        <div className="absolute top-[-6%] right-[-4%] size-[720px] rounded-full opacity-70" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(13,148,136,0.30), rgba(13,148,136,0.08) 45%, transparent 70%)' }} />
        <div className="absolute top-[7%] right-[4%] hidden size-[260px] rounded-full lg:block" style={{ background: 'radial-gradient(circle at 34% 28%, #E6FFFB 0%, #7FE3D5 12%, #14A898 34%, #0B5D63 58%, #0A2B3A 80%, #07131D 100%)', boxShadow: '0 0 140px 30px rgba(20,168,152,0.28), inset -30px -40px 80px rgba(7,19,29,0.75)' }} />
        <div className="absolute bottom-0 left-0 h-40 w-full bg-gradient-to-t from-[#07131D] to-transparent" />
      </div>

      <div className="mx-auto grid max-w-[1240px] items-center gap-14 px-5 pt-16 pb-20 md:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:pt-20 lg:pb-28">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-xs text-slate-200 backdrop-blur">
            <span className="size-1.5 rounded-full bg-[#5EEAD4]" aria-hidden />
            Modelo DIAM, versión 1.0 · {DIMENSIONS.length} dimensiones · {QUESTIONS.length} criterios
          </p>
          <h1 id="hero-t" className="mt-6 max-w-xl text-[2.5rem] leading-[1.05] font-bold tracking-[-0.02em] text-white md:text-[3.25rem]">Conozca la madurez documental de su organización.</h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-300">Evalúe capacidades, identifique brechas y convierta los resultados en una hoja de ruta de transformación.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/app/organizaciones/nueva" className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-[#07131D] shadow-[0_8px_30px_-8px_rgba(255,255,255,0.45)] transition-colors hover:bg-slate-100">Iniciar diagnóstico <ArrowRight className="size-4" aria-hidden /></Link>
            <button type="button" onClick={onDemo} disabled={busy} aria-busy={busy} className="inline-flex h-12 items-center rounded-full border border-white/25 bg-white/[0.04] px-6 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/10 disabled:opacity-60">{busy ? 'Abriendo…' : 'Explorar demostración'}</button>
          </div>
          <p className="mt-7 max-w-md text-xs text-slate-400">Funciona en el navegador, sin registro ni servidor. Los datos permanecen en el dispositivo de la persona evaluadora.</p>
        </div>
        <HeroCards />
      </div>
    </section>
  );
}

const glass = 'rounded-2xl border border-white/12 bg-[#0E2130]/70 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.75)] backdrop-blur-xl';

/** Tarjetas de la portada: tablero (claro), brechas prioritarias y ciclo de trabajo (vidrio). */
function HeroCards() {
  const fam = MGDA_FAMILIES.map((f, i) => ({ title: f.title, v: ILLUSTRATIVE.families[i] }));
  const gaps = ILLUSTRATIVE.gaps.map((g) => ({ ...g, name: QUESTIONS.find((q) => q.id === g.id)?.criterion ?? g.id }));
  const current = 4; // «Analizar»
  return (
    <div className="relative mx-auto w-full max-w-[600px]" aria-label="Vista ilustrativa del tablero de resultados con datos simulados">
      {/* Tablero principal */}
      <div className="relative z-10 rounded-2xl border border-white/60 bg-white/[0.97] text-ink shadow-[0_40px_100px_-30px_rgba(0,0,0,0.8)] lg:mr-10 lg:pb-8">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <span className="text-xs font-semibold text-navy">Resultados</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-muted">Datos ilustrativos simulados</span>
        </div>
        <dl className="grid grid-cols-3 divide-x divide-line border-b border-line">
          {[
            ['Madurez percibida', fmtScore(ILLUSTRATIVE.global), LEVEL_NAMES[levelIndex(ILLUSTRATIVE.global)]],
            ['Cobertura del diagnóstico', fmtPct(ILLUSTRATIVE.coverage), `Resultado ${coverageBandLabel(ILLUSTRATIVE.coverage).toLowerCase()}`],
            ['Soporte de evidencias', fmtPct(ILLUSTRATIVE.support), 'E0 a E3'],
          ].map(([k, v, h]) => (
            <div key={k} className="px-4 py-3"><dt className="text-[10.5px] leading-tight text-muted">{k}</dt><dd className="mt-1 font-display text-[1.45rem] leading-none font-semibold text-navy num">{v}</dd><dd className="mt-1 text-[10.5px] text-teal">{h}</dd></div>
          ))}
        </dl>
        <div className="px-5 pt-4 pb-5">
          <div className="flex items-baseline justify-between"><p className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">Madurez por familia</p><p className="flex items-center gap-1.5 text-[10.5px] text-muted"><span className="inline-block h-3 w-[3px] rounded-sm bg-gold" aria-hidden />Meta 3,00</p></div>
          <ul className="mt-3 space-y-2.5">
            {fam.map((f) => (
              <li key={f.title} className="grid grid-cols-[150px_1fr_34px] items-center gap-3 text-xs">
                <span className="whitespace-nowrap text-ink">{f.title}</span>
                <span className="relative h-2.5 rounded-sm bg-slate-100">
                  <span className="absolute inset-y-0 left-0 rounded-sm" style={{ width: `${(f.v / 5) * 100}%`, background: LEVEL_COLORS[levelIndex(f.v)] }} />
                  <span className="absolute -top-1 -bottom-1 w-[3px] rounded-sm bg-gold" style={{ left: `calc(${(3 / 5) * 100}% - 1px)` }} aria-hidden />
                </span>
                <span className="text-right font-medium num">{fmtScore(f.v)}</span>
              </li>
            ))}
          </ul>
          <ol className="mt-4 grid grid-cols-6 gap-1" aria-label="Escala de madurez">{LEVEL_NAMES.map((n, i) => <li key={n} title={`${i} · ${n}`}><span className="block h-1 rounded-sm" style={{ background: LEVEL_COLORS[i] }} /><span className="mt-1 block text-center text-[9.5px] text-muted num">{i}</span></li>)}</ol>
        </div>
      </div>

      <div className="relative z-20 mt-4 grid gap-4 sm:grid-cols-[1.08fr_1fr] lg:-mt-8 lg:ml-10">
      {/* Brechas prioritarias */}
      <div className={cx(glass, 'p-4')}>
        <p className="text-[10.5px] font-semibold tracking-[0.1em] text-[#5EEAD4] uppercase">Brechas prioritarias</p>
        <p className="text-[10.5px] text-slate-400">Ordenadas por prioridad</p>
        <ol className="mt-3 space-y-3">
          {gaps.map((g, i) => (
            <li key={g.id} className="grid grid-cols-[16px_1fr] gap-2 text-xs">
              <span className="font-semibold text-slate-400 num">{i + 1}</span>
              <span>
                <span className="block font-semibold text-white">{g.id}</span>
                <span className="block leading-snug text-slate-300">{g.name}</span>
                <span className="mt-0.5 block text-[10.5px] text-slate-400 num">nivel {fmtScore(g.level)} · brecha {fmtScore(g.target - g.level)}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* Ciclo de trabajo */}
      <div className={cx(glass, 'p-4')}>
        <p className="text-[10.5px] font-semibold tracking-[0.1em] text-[#5EEAD4] uppercase">Ciclo de trabajo</p>
        <p className="text-[10.5px] text-slate-400">Seis momentos</p>
        <ol className="mt-3 space-y-2">
          {WORK_CYCLE.map((s, i) => (
            <li key={s.key} className="flex items-center gap-2 text-[11.5px]">
              <span className={cx('flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold num', i < current ? 'border-[#14A898] bg-[#14A898] text-white' : i === current ? 'border-[#5EEAD4] text-[#5EEAD4]' : 'border-white/20 text-slate-400')} aria-hidden>{i < current ? <Check className="size-3" /> : i + 1}</span>
              <span className={cx('leading-tight', i <= current ? 'text-white' : 'text-slate-400')}>{s.title}</span>
              <span className="sr-only">{i < current ? '(completado)' : i === current ? '(en curso)' : '(pendiente)'}</span>
            </li>
          ))}
        </ol>
      </div>
      </div>
    </div>
  );
}

function Band({ id, eyebrow, title, children, tone = 'canvas' }: { id: string; eyebrow: string; title: string; children: ReactNode; tone?: 'canvas' | 'white' }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className={cx('border-b border-line', tone === 'white' ? 'bg-white' : 'bg-canvas')}>
      <div className="mx-auto max-w-[1240px] px-5 py-16 md:px-8 md:py-20">
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={`${id}-t`} className="mt-3 mb-10 max-w-2xl text-2xl font-semibold md:text-[2rem]">{title}</h2>
        {children}
      </div>
    </section>
  );
}

function Prose({ title, children }: { title: string; children: ReactNode }) {
  return <div className="border-l-2 border-gold pl-5"><h3 className="text-base font-semibold">{title}</h3><p className="mt-2 text-sm text-muted">{children}</p></div>;
}

/** Carriles del flujo distribuido de entrevistas. */
function InterviewLanes() {
  const lanes = [
    { who: 'Persona evaluadora', steps: [{ col: 1, n: 1, t: 'Crea la asignación', d: 'Perfil, criterios e instrucciones' }, { col: 4, n: 6, t: 'Importa y consolida', d: 'Verificación de hash, revisiones y duplicados' }, { col: 5, n: 7, t: 'Valida en la mesa', d: 'Discrepancias, contradicciones y evidencias' }] },
    { who: 'Archivo', steps: [{ col: 2, n: 2, t: '.dm-assignment.json', d: 'Opcionalmente cifrado' }, { col: 3, n: 5, t: '.dm-interview.json', d: 'Con hash SHA-256' }] },
    { who: 'Persona entrevistada', steps: [{ col: 2, n: 3, t: 'Abre «Responder entrevista»', d: 'Sin cuenta ni instalación' }, { col: 3, n: 4, t: 'Responde sin conexión', d: 'Guarda avance y exporta' }] },
  ];
  return (
    <div>
      <div className="hidden overflow-hidden rounded-lg border border-line md:block">
        {lanes.map((l, li) => (
          <div key={l.who} className={cx('grid grid-cols-[150px_repeat(5,1fr)]', li > 0 && 'border-t border-line')}>
            <div className="flex items-center bg-slate-50 px-4 py-5 text-sm font-semibold text-navy">{l.who}</div>
            {[1, 2, 3, 4, 5].map((c) => {
              const s = l.steps.find((x) => x.col === c);
              return (
                <div key={c} className="border-l border-dashed border-line p-3">
                  {s && <div className={cx('rounded-md border p-3', l.who === 'Archivo' ? 'border-gold/50 bg-[#FDF8F0]' : 'border-line bg-white')}><p className="flex items-baseline gap-2 text-sm font-semibold text-ink"><span className="text-xs font-semibold text-teal num">{s.n}</span>{s.t}</p><p className="mt-0.5 text-xs text-muted">{s.d}</p></div>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <ol className="space-y-3 md:hidden">
        {['Persona evaluadora: crea la asignación', 'Archivo .dm-assignment.json', 'Persona entrevistada: responde sin conexión', 'Archivo .dm-interview.json con hash', 'Persona evaluadora: importa, consolida y valida'].map((t, i) => <li key={t} className="panel flex gap-3 p-3 text-sm"><span className="font-semibold text-teal num">{i + 1}</span>{t}</li>)}
      </ol>
      <p className="mt-4 text-xs text-muted">El intercambio se realiza por los canales que la organización autorice (correo institucional, carpeta compartida, memoria USB). La aplicación nunca carga archivos a servidores externos.</p>
    </div>
  );
}
