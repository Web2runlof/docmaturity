import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BarChart3, Building2, ClipboardCheck, FileJson, FileSearch, GraduationCap, Lock, Route, ShieldCheck, Users } from 'lucide-react';
import { DIMENSIONS, QUESTIONS, SOURCES, LEVEL_NAMES } from '@/data/bank';
import type { MgdaComponent } from '@/types/bank';
import { EChart } from '@/components/charts/EChart';
import { heatmapOption, radarOption } from '@/components/charts/options';
import { LEVEL_COLORS } from '@/engine/constants';
import { db } from '@/database/db';
import { loadCase } from '@/services/demo';
import { attempt } from '@/app/store';
import { Button } from '@/components/ui';
import { cx } from '@/utils/core';

/** Datos ilustrativos simulados para la composición visual de la portada (no provienen de ninguna organización). */
const ILLUSTRATIVE = {
  current: [2.4, 2.1, 1.6, 2.6, 2.8, 2.2, 1.7, 2.5, 1.9, 2.7, 1.2, 2.0, 1.5, 0.9, 1.8],
  target: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
  heat: [
    [3.1, 2.4, 2.0, 1.2],
    [2.6, 2.9, 1.8, 2.2],
    [1.4, 2.1, 2.7, 0.8],
  ],
};

const FAMILIES: { key: MgdaComponent; title: string; text: string }[] = [
  { key: 'Estratégico', title: 'Dirección y gobierno', text: 'Política, responsabilidades, gobierno de datos y mejora continua.' },
  { key: 'Administración de archivos', title: 'Recursos y custodia', text: 'Presupuesto, infraestructura física y condiciones de conservación.' },
  { key: 'Documental', title: 'Instrumentos y procesos', text: 'Procesos, instrumentos archivísticos y expedientes electrónicos.' },
  { key: 'Tecnológico', title: 'Tecnología y protección', text: 'Arquitectura, interoperabilidad, seguridad, preservación y automatización.' },
  { key: 'Cultural', title: 'Personas y cultura', text: 'Competencias, apropiación y cultura documental.' },
];

const STEPS = [
  { icon: Building2, title: 'Caracterizar', text: 'Perfil de la organización, volumen documental, sistemas y condiciones normativas que determinan la aplicabilidad.' },
  { icon: ClipboardCheck, title: 'Definir el alcance', text: 'Modalidad, dimensiones, metas por criterio y ponderaciones. Las exclusiones quedan justificadas.' },
  { icon: Users, title: 'Entrevistar', text: 'Entrevistas dirigidas o distribuidas por archivo a cada perfil, con respuestas especiales que nunca se convierten en cero.' },
  { icon: FileSearch, title: 'Triangular y validar', text: 'Mediana por participante, discrepancias, contradicciones entre criterios y evidencias revisadas.' },
  { icon: BarChart3, title: 'Analizar', text: 'Madurez por dimensión, cobertura, soporte de evidencias, solidez del diagnóstico y alertas críticas.' },
  { icon: Route, title: 'Planear la transformación', text: 'Brechas, riesgos, prioridades explicadas y una hoja de ruta en cuatro fases con dependencias.' },
];

const MODALITIES = [
  { name: 'Rápido', count: 30, time: 'Una sesión', color: '#142B3A', text: 'Panorama inicial con los criterios esenciales de cada dimensión.' },
  { name: 'Estándar', count: 90, time: 'Varias entrevistas', color: '#0D9488', text: 'Diagnóstico equilibrado para planificar con varios perfiles. Incluye el núcleo rápido.' },
  { name: 'Profesional', count: 225, time: 'Consultoría', color: '#9FD8D1', text: 'Todos los criterios del banco, con evidencias y validación detallada.' },
];

const FAQ = [
  { q: '¿DOCMATURITY certifica a la organización?', a: 'No. Es una herramienta de autodiagnóstico y consultoría. Sus resultados no constituyen certificación, auditoría oficial ni puntaje de instrumentos como el MGDA o el FURAG, y no acreditan conformidad con normas ISO o MoReq.' },
  { q: '¿Dónde se guardan los datos?', a: 'En el navegador del dispositivo, mediante IndexedDB. No hay servidor, registro de usuarios ni sincronización. Para trasladar información se exportan archivos que pueden protegerse con contraseña.' },
  { q: '¿Cómo responden las personas entrevistadas si no tienen la aplicación instalada?', a: 'El evaluador genera un archivo de asignación. La persona lo abre en la sección «Responder entrevista», responde sin conexión y devuelve un archivo de respuestas que el evaluador importa en la mesa de validación.' },
  { q: '¿Qué pasa con las respuestas «No sé» o «No aplica»?', a: 'No se convierten en cero. Se excluyen del promedio y reducen la cobertura. Solo un «No aplica» validado por el evaluador retira el criterio del alcance.' },
  { q: '¿Se puede usar en clase?', a: 'Sí. El laboratorio académico incluye cinco casos ficticios, una sesión guiada de 60 minutos, insignias por la calidad del proceso y un entregable en PDF apto para Moodle.' },
  { q: '¿Usa inteligencia artificial?', a: 'El motor de cálculo y la narrativa son deterministas. Existe un asistente opcional que solo genera un prompt anonimizado para que el evaluador lo use, si lo desea, en una herramienta autorizada por su organización.' },
  { q: '¿Funciona sin conexión?', a: 'Sí. Después de la primera visita la aplicación se instala como aplicación web progresiva y funciona sin conexión.' },
];

export default function LandingPage() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const demo = async () => {
    setBusy(true);
    const existing = await db.assessments.filter((a) => a.isDemo).first().catch(() => undefined);
    const id = existing?.id ?? (await attempt(() => loadCase('caso-financiera', 'demo'), 'Caso de demostración cargado'));
    setBusy(false);
    if (id) nav(`/app/evaluaciones/${id}/resultados`);
  };
  const dimsShort = DIMENSIONS.map((d) => ({ name: d.id, full: d.name }));
  const typeCounts = SOURCES.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.type]: (acc[s.type] ?? 0) + 1 }), {});
  const critical = QUESTIONS.filter((q) => q.isCritical).length;

  return (
    <>
      {/* Hero */}
      <section className="border-b border-line bg-canvas">
        <div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-16 md:px-8 lg:grid-cols-[1fr_1.08fr] lg:py-20">
          <div className="flex flex-col justify-center">
            <p className="eyebrow">Modelo DIAM v1.0 · 15 dimensiones · {QUESTIONS.length} criterios</p>
            <h1 className="mt-4 max-w-xl text-4xl font-bold leading-[1.08] md:text-[3.15rem]">Conoce la madurez documental de tu organización.</h1>
            <p className="mt-5 max-w-lg text-lg text-muted">Evalúa capacidades, identifica brechas y convierte los resultados en una hoja de ruta de transformación.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/app/organizaciones/nueva" className="inline-flex h-11 items-center gap-2 rounded-md bg-navy px-5 text-sm font-semibold text-white transition-colors hover:bg-navy-dark">Iniciar diagnóstico <ArrowRight className="size-4" aria-hidden /></Link>
              <Button className="h-11 px-5" busy={busy} onClick={demo}>Explorar demostración</Button>
            </div>
            <p className="mt-6 max-w-md text-xs text-muted">Funciona en el navegador, sin registro ni servidor. Los datos permanecen en el dispositivo del evaluador.</p>
          </div>
          <HeroComposition dims={dimsShort} />
        </div>
      </section>

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
          {STEPS.map((s, i) => (
            <li key={s.title} className="border-t-2 border-navy pt-5">
              <div className="flex items-baseline justify-between"><span className="font-display text-3xl font-semibold text-slate-300 num">{String(i + 1).padStart(2, '0')}</span><s.icon className="size-5 text-teal" aria-hidden /></div>
              <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </Band>

      {/* 3. Dimensiones */}
      <Band id="dimensiones" eyebrow="03 · Dimensiones de evaluación" title="Quince dimensiones organizadas en cinco familias.">
        <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line lg:grid-cols-5">
          {FAMILIES.map((f) => {
            const dims = DIMENSIONS.filter((d) => d.mgdaComponent === f.key);
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
        <p className="mt-4 text-xs text-muted">Las familias corresponden a los componentes del Modelo de Gestión Documental y Administración de Archivos, usados como lente de lectura. {critical} criterios están marcados como críticos y generan alertas cuando se ubican en niveles 0 o 1.</p>
      </Band>

      {/* 4. Referentes */}
      <Band id="referentes" eyebrow="04 · Referentes metodológicos" title="Fundamentación declarada y verificable." tone="white">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4 text-sm text-muted">
            <p>El modelo DIAM se construyó a partir de normativa colombiana, estándares internacionales de gestión de documentos y preservación, modelos de madurez y requisitos de sistemas, y literatura académica.</p>
            <p>Cada referente tiene un estado de verificación explícito. DOCMATURITY no reproduce textos protegidos ni afirma correspondencias con cláusulas específicas.</p>
            <Link to="/referentes" className="inline-flex items-center gap-1 font-medium text-teal hover:underline">Ver el registro de referentes <ArrowRight className="size-4" aria-hidden /></Link>
          </div>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
            {[
              ['norma_juridica', 'Normas jurídicas'], ['estandar_tecnico', 'Estándares técnicos'], ['modelo_madurez', 'Modelos de madurez'], ['modelo_requisitos', 'Modelos de requisitos'],
              ['metodologia', 'Metodologías'], ['buena_practica', 'Buenas prácticas'], ['modelo_gestion', 'Modelos de gestión'], ['referente_academico', 'Referentes académicos'],
            ].map(([k, label]) => (
              <div key={k} className="bg-white p-4"><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 font-display text-2xl font-semibold text-navy num">{typeCounts[k] ?? 0}</dd></div>
            ))}
          </dl>
        </div>
      </Band>

      {/* 5. Modalidades */}
      <Band id="modalidades" eyebrow="05 · Modalidades de diagnóstico" title="La profundidad se ajusta al propósito.">
        <div className="panel p-6">
          <div className="relative h-3 rounded-full bg-slate-100" aria-hidden>
            {MODALITIES.slice().reverse().map((m) => <span key={m.name} className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(m.count / 225) * 100}%`, background: m.color }} />)}
          </div>
          <div className="mt-6 grid gap-8 md:grid-cols-4">
            {MODALITIES.map((m) => (
              <div key={m.name}>
                <p className="font-display text-3xl font-semibold text-navy num">{m.count}</p>
                <p className="text-xs text-muted">criterios · {Math.round((m.count / 225) * 100)} % del banco</p>
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
            <figcaption className="mb-2 flex items-baseline justify-between"><span className="text-sm font-semibold text-navy">Mapa de calor por perfil y componente</span><span className="text-[11px] text-muted">Datos ilustrativos</span></figcaption>
            <EChart height={240} label="Mapa de calor ilustrativo por perfil de entrevistado" option={heatmapOption(['Dirección', 'Gestión documental', 'Tecnología'], ['Estratégico', 'Documental', 'Tecnológico', 'Cultural'], ILLUSTRATIVE.heat, { valueLabel: 'Mediana' })} />
          </figure>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['Madurez percibida y validada', 'Se presentan por separado; la validada solo considera criterios revisados por el evaluador.'],
              ['Cobertura', 'Cuántos criterios del alcance tienen datos. Con cobertura baja, el resultado se marca como exploratorio.'],
              ['Soporte de evidencias', 'Nivel de sustento documental de cada respuesta, de E0 a E3.'],
              ['Solidez diagnóstica', 'Índice orientativo que combina cobertura, evidencias y acuerdo entre entrevistados.'],
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
              <button onClick={demo} disabled={busy} className="inline-flex h-11 items-center rounded-md border border-white/30 px-5 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-60">Explorar demostración</button>
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

/** Composición de la portada construida con componentes funcionales y datos ilustrativos. */
function HeroComposition({ dims }: { dims: { name: string; full: string }[] }) {
  const flow = ['Caracterizar', 'Entrevistar', 'Validar', 'Analizar', 'Planear'];
  return (
    <div className="relative" aria-label="Vista parcial ilustrativa del dashboard">
      <div className="panel overflow-hidden shadow-[0_24px_60px_-28px_rgba(20,43,58,0.35)]">
        <div className="flex items-center justify-between border-b border-line bg-white px-4 py-2.5">
          <div className="flex items-center gap-1.5" aria-hidden><span className="size-2 rounded-full bg-slate-200" /><span className="size-2 rounded-full bg-slate-200" /><span className="size-2 rounded-full bg-slate-200" /></div>
          <span className="text-[11px] text-muted">Resultados · datos ilustrativos simulados</span>
        </div>
        <div className="grid grid-cols-3 divide-x divide-line border-b border-line">
          {[['Madurez preliminar', '2,1', 'En desarrollo'], ['Cobertura', '86 %', 'Alta'], ['Soporte de evidencias', '41 %', 'Parcial']].map(([k, v, h]) => (
            <div key={k} className="px-4 py-3"><p className="text-[11px] text-muted">{k}</p><p className="font-display text-2xl font-semibold text-navy num">{v}</p><p className="text-[11px] text-teal">{h}</p></div>
          ))}
        </div>
        <div className="grid sm:grid-cols-[1.35fr_1fr]">
          <div className="border-line p-3 sm:border-r">
            <EChart height={260} label="Radar ilustrativo de madurez por dimensión" option={radarOption(dims, [{ name: 'Actual', values: ILLUSTRATIVE.current, color: '#0D9488', area: true }, { name: 'Objetivo', values: ILLUSTRATIVE.target, color: '#C69B59', dashed: true }])} />
          </div>
          <div className="flex flex-col gap-4 p-4">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">Brechas prioritarias</p>
              <ul className="mt-2 space-y-2">
                {[['D11-Q01', 'Política de preservación', 1.2], ['D14-Q11', 'Gobierno de IA', 0.9], ['D03-Q02', 'Presupuesto documental', 1.6]].map(([id, n, v]) => (
                  <li key={id as string} className="text-xs">
                    <div className="flex justify-between"><span><span className="font-semibold text-navy">{id}</span> · {n}</span><span className="num text-muted">{String(v).replace('.', ',')}</span></div>
                    <div className="mt-1 h-1.5 rounded-sm bg-slate-100"><div className="h-full rounded-sm" style={{ width: `${(Number(v) / 5) * 100}%`, background: LEVEL_COLORS[Math.floor(Number(v))] }} /></div>
                  </li>
                ))}
              </ul>
            </div>
            <DocumentLayers />
          </div>
        </div>
        <div className="border-t border-line px-4 py-3">
          <ol className="relative flex justify-between" aria-label="Flujo de evaluación">
            <span className="absolute top-[5px] right-2 left-2 h-px bg-line" aria-hidden />
            {flow.map((f, i) => (
              <li key={f} className="relative flex flex-col items-center gap-1.5">
                <span className={cx('size-[11px] rounded-full border-2', i < 3 ? 'border-petrol bg-petrol' : i === 3 ? 'border-petrol bg-white' : 'border-slate-300 bg-white')} aria-hidden />
                <span className={cx('text-[10px]', i <= 3 ? 'font-medium text-navy' : 'text-muted')}>{f}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

/** Ilustración original: documentos estructurados como capas con metadatos. */
function DocumentLayers() {
  return (
    <svg viewBox="0 0 220 104" className="w-full" role="img" aria-label="Ilustración de documentos estructurados en capas">
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${i * 14} ${i * 12})`}>
          <rect x="8" y="6" width="150" height="62" rx="4" fill="#fff" stroke="#E2E8F0" />
          <rect x="18" y="16" width={i === 2 ? 60 : 40} height="5" rx="1" fill={i === 2 ? '#142B3A' : '#CBD5E1'} />
          <rect x="18" y="27" width="110" height="3" rx="1" fill="#E2E8F0" />
          <rect x="18" y="34" width="96" height="3" rx="1" fill="#E2E8F0" />
          {i === 2 && (
            <>
              <rect x="18" y="45" width="34" height="13" rx="2" fill="#F0FDFA" stroke="#0D9488" strokeWidth="0.8" />
              <rect x="56" y="45" width="34" height="13" rx="2" fill="#FDF8F0" stroke="#C69B59" strokeWidth="0.8" />
              <rect x="94" y="45" width="34" height="13" rx="2" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="0.8" />
              <text x="35" y="54" fontSize="6" textAnchor="middle" fill="#0F766E" fontFamily="Inter, sans-serif">Serie</text>
              <text x="73" y="54" fontSize="6" textAnchor="middle" fill="#8A6A35" fontFamily="Inter, sans-serif">TRD</text>
              <text x="111" y="54" fontSize="6" textAnchor="middle" fill="#475569" fontFamily="Inter, sans-serif">Metadatos</text>
            </>
          )}
        </g>
      ))}
    </svg>
  );
}

/** Carriles del flujo distribuido de entrevistas. */
function InterviewLanes() {
  const lanes = [
    { who: 'Evaluador', steps: [{ col: 1, n: 1, t: 'Crea la asignación', d: 'Perfil, criterios e instrucciones' }, { col: 4, n: 6, t: 'Importa y consolida', d: 'Verificación de hash, revisiones y duplicados' }, { col: 5, n: 7, t: 'Valida en la mesa', d: 'Discrepancias, contradicciones y evidencias' }] },
    { who: 'Archivo', steps: [{ col: 2, n: 2, t: '.dm-assignment.json', d: 'Opcionalmente cifrado' }, { col: 3, n: 5, t: '.dm-interview.json', d: 'Con hash SHA-256' }] },
    { who: 'Entrevistado', steps: [{ col: 2, n: 3, t: 'Abre «Responder entrevista»', d: 'Sin cuenta ni instalación' }, { col: 3, n: 4, t: 'Responde sin conexión', d: 'Guarda avance y exporta' }] },
  ];
  return (
    <div>
      <div className="hidden overflow-hidden rounded-lg border border-line md:block">
        {lanes.map((l, li) => (
          <div key={l.who} className={cx('grid grid-cols-[140px_repeat(5,1fr)]', li > 0 && 'border-t border-line')}>
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
        {['Evaluador: crea la asignación', 'Archivo .dm-assignment.json', 'Entrevistado: responde sin conexión', 'Archivo .dm-interview.json con hash', 'Evaluador: importa, consolida y valida'].map((t, i) => <li key={t} className="panel flex gap-3 p-3 text-sm"><span className="font-semibold text-teal num">{i + 1}</span>{t}</li>)}
      </ol>
      <p className="mt-4 text-xs text-muted">El intercambio se realiza por los canales que la organización autorice (correo institucional, carpeta compartida, memoria USB). La aplicación nunca carga archivos a servidores externos.</p>
    </div>
  );
}
