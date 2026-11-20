import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { BANK_VERSION, DIMENSIONS, LEVEL_DESCRIPTIONS, LEVEL_NAMES, QUESTIONS, SOURCES } from '@/data/bank';
import { DEFAULT_TARGET, DEFAULT_THRESHOLDS, EVIDENCE_FACTOR, EVIDENCE_LABEL, LEVEL_COLORS, PRIORITY_WEIGHTS, RISK_BANDS, SOLIDITY_WEIGHTS, SPECIAL_LABEL } from '@/engine/constants';
import { CONTRADICTION_RULES } from '@/engine/triangulation';
import { INITIATIVE_TEMPLATES } from '@/data/recommendations/initiatives';
import { PHASES } from '@/engine/recommendations';
import { LOCAL_DATA_NOTICE } from '@/services/storage';
import { PBKDF2_ITERATIONS } from '@/services/crypto';
import { Sources, VERIFICATION_LABEL } from '@/features/methodology/LibraryPage';
import type { EvidenceStatus } from '@/types/domain';
import type { VerificationStatus } from '@/types/bank';

const n = (v: number) => v.toLocaleString('es-CO');

function Page({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <>
      <header className="border-b border-line bg-canvas">
        <div className="mx-auto max-w-[1040px] px-5 py-14 md:px-8">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold md:text-4xl">{title}</h1>
          <div className="mt-4 max-w-2xl text-base text-muted">{intro}</div>
        </div>
      </header>
      <div className="mx-auto max-w-[1040px] space-y-14 px-5 py-14 md:px-8">{children}</div>
    </>
  );
}

function Block({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-t` : undefined}>
      <h2 id={id ? `${id}-t` : undefined} className="border-b border-line pb-3 text-xl font-semibold">{title}</h2>
      <div className="mt-5 space-y-4 text-[0.95rem] leading-relaxed text-ink">{children}</div>
    </section>
  );
}

function Formula({ children, note }: { children: ReactNode; note?: ReactNode }) {
  return (
    <div className="rounded-md border border-line bg-slate-50 px-4 py-3">
      <p className="font-mono text-sm text-navy">{children}</p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </div>
  );
}

export function HowItWorksPage() {
  const steps: [string, string, string][] = [
    ['Caracterizar la organización', 'Se registra el perfil organizacional (público, privado, salud, educación, financiero, entre otros), el volumen documental y los sistemas. Los campos desconocidos se marcan como tales y no se rellenan automáticamente.', 'Organizaciones → Nueva organización'],
    ['Crear la evaluación y definir su alcance', 'Se elige la modalidad (rápida, estándar, profesional o personalizada), las metas por criterio y las ponderaciones. Las exclusiones deben justificarse y quedan registradas.', 'Evaluaciones → Nueva evaluación → Alcance'],
    ['Registrar participantes y entrevistar', 'Cada participante se identifica con un código y un perfil. La entrevista puede ser dirigida por el evaluador o distribuida mediante un archivo de asignación que la persona responde sin conexión.', 'Entrevistas'],
    ['Registrar evidencias', 'Cada evidencia se asocia a un criterio, con su estado de revisión E0 a E3. Se prefieren referencias a documentos antes que adjuntos con información sensible.', 'Evidencias'],
    ['Validar en la mesa de validación', 'El evaluador revisa discrepancias entre entrevistados, contradicciones entre criterios, respuestas «no aplica» y niveles altos sin evidencia, y registra el nivel validado con su justificación.', 'Mesa de validación'],
    ['Analizar, priorizar y planear', 'El dashboard muestra la madurez por dimensión con su cobertura y soporte de evidencias. Las brechas alimentan los riesgos, la priorización y una hoja de ruta editable en cuatro fases.', 'Resultados → Brechas → Hoja de ruta → Informes'],
  ];
  return (
    <Page eyebrow="Cómo funciona" title="Del primer dato a la hoja de ruta" intro="DOCMATURITY organiza el trabajo de diagnóstico en un ciclo de seis momentos. Todo ocurre en el navegador del evaluador; los archivos solo salen del dispositivo cuando él los exporta.">
      <Block title="El ciclo de trabajo">
        <ol className="space-y-0 divide-y divide-line border-y border-line">
          {steps.map(([t, d, where], i) => (
            <li key={t} className="grid gap-3 py-5 md:grid-cols-[64px_1fr_220px]">
              <span className="font-display text-2xl font-semibold text-slate-300 num">{String(i + 1).padStart(2, '0')}</span>
              <div><h3 className="font-semibold">{t}</h3><p className="mt-1 text-sm text-muted">{d}</p></div>
              <p className="text-xs text-teal md:text-right">{where}</p>
            </li>
          ))}
        </ol>
      </Block>
      <Block title="Respuestas especiales">
        <p>Una pregunta puede no tener respuesta numérica. Ninguna de estas situaciones se convierte en cero: se excluyen del cálculo y reducen la cobertura. Solo el «no aplica» validado retira el criterio del alcance.</p>
        <dl className="grid gap-3 sm:grid-cols-2">{Object.entries(SPECIAL_LABEL).map(([k, v]) => <div key={k} className="rounded-md border border-line p-3"><dt className="text-sm font-semibold">{v}</dt><dd className="font-mono text-xs text-muted">{k}</dd></div>)}</dl>
      </Block>
      <Block title="Entrevistas distribuidas">
        <p>El evaluador exporta un archivo <code className="rounded bg-slate-100 px-1">.dm-assignment.json</code> por participante. La persona lo abre en <Link to="/responder" className="text-teal hover:underline">Responder entrevista</Link>, responde a su ritmo y descarga un archivo <code className="rounded bg-slate-100 px-1">.dm-interview.json</code>. Al importarlo, la aplicación verifica estructura, versión del banco, asignación y hash SHA-256; detecta duplicados y, si llega una revisión, muestra las diferencias para aceptarla o rechazarla.</p>
        <p className="text-sm text-muted">El hash permite detectar alteraciones accidentales del contenido. No es una firma digital ni identifica de forma fehaciente a quien respondió.</p>
      </Block>
      <div><Link to="/app" className="inline-flex h-11 items-center gap-2 rounded-md bg-navy px-5 text-sm font-semibold text-white hover:bg-navy-dark">Abrir la aplicación <ArrowRight className="size-4" aria-hidden /></Link></div>
    </Page>
  );
}

export function MethodologyPage() {
  const t = DEFAULT_THRESHOLDS;
  return (
    <Page eyebrow={`Metodología · banco ${BANK_VERSION}`} title="Modelo DIAM: DocMaturity Integrated Assessment Model" intro={`${DIMENSIONS.length} dimensiones, ${QUESTIONS.length} criterios originales y ${QUESTIONS.length * 6} descriptores de nivel redactados individualmente. Las fórmulas se aplican de forma determinista y se documentan aquí sin simplificaciones.`}>
      <Block title="Escala de madurez" id="escala">
        <ol className="grid gap-2">{LEVEL_NAMES.map((name, i) => (
          <li key={name} className="grid grid-cols-[8px_120px_1fr] items-start gap-4 rounded-md border border-line bg-white p-3">
            <span className="h-full min-h-8 rounded-sm" style={{ background: LEVEL_COLORS[i] }} aria-hidden />
            <span className="font-semibold">{i} · {name}</span>
            <span className="text-sm text-muted">{LEVEL_DESCRIPTIONS[i]}</span>
          </li>
        ))}</ol>
        <p className="text-sm text-muted">Los resultados agregados se interpretan por intervalos: [0; 0,5) Inexistente, [0,5; 1,5) Inicial, [1,5; 2,5) En desarrollo, [2,5; 3,5) Definido, [3,5; 4,5) Gestionado y [4,5; 5] Optimizado.</p>
      </Block>
      <Block title="Dimensiones y ponderaciones" id="dimensiones">
        <div className="overflow-x-auto"><table className="table-pro">
          <thead><tr><th>Dimensión</th><th>Componente MGDA</th><th>Criterios</th><th>Peso por defecto</th></tr></thead>
          <tbody>{DIMENSIONS.map((d) => <tr key={d.id}><td><span className="font-medium text-navy">{d.id} · {d.name}</span><div className="max-w-md text-xs text-muted">{d.summary}</div></td><td className="text-xs">{d.mgdaComponent}</td><td className="num">{QUESTIONS.filter((q) => q.dimensionId === d.id).length}</td><td className="num">{n(d.defaultWeight)}</td></tr>)}</tbody>
        </table></div>
      </Block>
      <Block title="Consolidación de respuestas" id="consolidacion">
        <p>Primero se toma una respuesta por participante único; luego se consolida el criterio con la mediana, robusta frente a valores extremos. También se calculan media, mínimo, máximo, rango y desviación.</p>
        <Formula note="Con valores 4, 3, 2, 1: mediana 2,5; media 2,5; rango 3; acuerdo 0,4.">Puntaje del criterio = mediana(respuestas numéricas por participante)</Formula>
        <Formula note={`Hay discrepancia cuando el rango es igual o superior a ${t.discrepancyRange}.`}>Acuerdo = 1 − rango / 5</Formula>
      </Block>
      <Block title="Madurez por dimensión y global" id="madurez">
        <Formula note="Solo se incluyen criterios aplicables con puntuación; los pesos se renormalizan sobre los criterios disponibles.">Dimensión = Σ(puntaje × peso) / Σ(peso)</Formula>
        <Formula note="Las dimensiones con cobertura insuficiente se excluyen y se informa la exclusión.">Global = Σ(dimensión × peso de la dimensión) / Σ(pesos incluidos)</Formula>
        <p>Se presentan dos lecturas: la <strong>madurez preliminar</strong> (percibida, a partir de entrevistas) y la <strong>madurez validada</strong> (niveles confirmados por el evaluador en la mesa de validación). La etiqueta «madurez integral validada» solo se usa con alta cobertura de validación sobre el banco completo.</p>
      </Block>
      <Block title="Cobertura, evidencias y solidez" id="cobertura">
        <Formula note={`Bandas: < ${t.coverageInsufficient} % insuficiente; < ${t.coverageExploratory} % exploratoria; < ${t.coveragePartial} % parcial; desde ${t.coveragePartial} % alta.`}>Cobertura = criterios aplicables con puntuación / criterios aplicables del alcance × 100</Formula>
        <dl className="grid gap-2 sm:grid-cols-4">{(Object.keys(EVIDENCE_FACTOR) as EvidenceStatus[]).map((k) => <div key={k} className="rounded-md border border-line p-3"><dt className="text-sm font-semibold">{k} · factor {n(EVIDENCE_FACTOR[k])}</dt><dd className="text-xs text-muted">{EVIDENCE_LABEL[k]}</dd></div>)}</dl>
        <Formula>Soporte de evidencias = Σ(factor × peso) / Σ(peso) × 100</Formula>
        <Formula note="Índice orientativo; no es una medida de confianza estadística.">Solidez = {n(SOLIDITY_WEIGHTS.coverage)}·Cobertura + {n(SOLIDITY_WEIGHTS.evidence)}·Soporte de evidencias + {n(SOLIDITY_WEIGHTS.agreement)}·Acuerdo</Formula>
      </Block>
      <Block title="Triangulación" id="triangulacion">
        <p>El motor aplica {CONTRADICTION_RULES.length} reglas de contraste entre criterios relacionados (por ejemplo, un programa de preservación evaluado como avanzado sin una política que lo respalde). Las alertas se resuelven en la mesa de validación; nunca modifican automáticamente las respuestas.</p>
        <p className="text-sm text-muted">Otras alertas: niveles iguales o superiores a {t.highScoreWithoutEvidence} sin evidencia revisada, criterios críticos sin evaluar o en niveles 0–1, «no aplica» controvertido y dimensiones con baja cobertura.</p>
      </Block>
      <Block title="Brechas, riesgos y priorización" id="priorizacion">
        <Formula note={`Meta por defecto: nivel ${DEFAULT_TARGET}. Sin puntuación, la recomendación es evaluar la capacidad.`}>Brecha = máx(0, meta − nivel actual)</Formula>
        <Formula note={`Bandas: ${RISK_BANDS.map((b, i) => `${i === 0 ? 1 : RISK_BANDS[i - 1].max + 1}–${b.max} ${b.label.toLowerCase()}`).join('; ')}.`}>Riesgo = probabilidad (1–5) × impacto (1–5)</Formula>
        <Formula note="Factores en escala 0–5. Los valores no valorados se estiman y se identifican como estimaciones.">Prioridad = {n(PRIORITY_WEIGHTS.gap)}·Brecha + {n(PRIORITY_WEIGHTS.impact)}·Impacto + {n(PRIORITY_WEIGHTS.criticality)}·Criticidad + {n(PRIORITY_WEIGHTS.urgency)}·Urgencia + {n(PRIORITY_WEIGHTS.enabler)}·Habilitador</Formula>
        <p>La matriz impacto–esfuerzo clasifica las oportunidades en victorias rápidas, proyectos estratégicos, mejoras menores y reevaluación. El esfuerzo nunca reduce la prioridad de un riesgo crítico, y las tecnologías inteligentes no se priorizan antes de los controles esenciales sin una justificación registrada.</p>
      </Block>
      <Block title="Hoja de ruta" id="hoja-de-ruta">
        <p>Las brechas se agrupan en {INITIATIVE_TEMPLATES.length} plantillas de iniciativa transversales, ordenadas según sus dependencias en cuatro fases:</p>
        <ol className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">{PHASES.map((p) => <li key={p.phase} className="bg-white p-4"><p className="text-xs text-muted">Fase {p.phase} · {p.horizon}</p><p className="mt-1 font-semibold">{p.name}</p></li>)}</ol>
      </Block>
      <Block title="Alcance y limitaciones">
        <p>DIAM es un modelo de diagnóstico y consultoría. No reemplaza los instrumentos oficiales ni constituye auditoría o certificación. Las asociaciones con referentes son conceptuales; la aplicabilidad normativa de cada criterio debe validarse para cada organización.</p>
      </Block>
    </Page>
  );
}

export function ReferencesPage() {
  const counts = SOURCES.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.verificationStatus]: (acc[s.verificationStatus] ?? 0) + 1 }), {});
  return (
    <Page eyebrow="Referentes" title="Referentes normativos, técnicos y académicos" intro="Registro de las fuentes que sustentan conceptualmente el modelo, con su estado de verificación. DOCMATURITY es una herramienta independiente: no cuenta con aval de las organizaciones que publican estos referentes.">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
        {(Object.keys(VERIFICATION_LABEL) as VerificationStatus[]).map((k) => <div key={k} className="bg-white p-4"><dt className="text-xs text-muted">{VERIFICATION_LABEL[k]}</dt><dd className="mt-1 font-display text-2xl font-semibold text-navy num">{counts[k] ?? 0}</dd></div>)}
      </dl>
      <Sources />
    </Page>
  );
}

export function PrivacyPage() {
  return (
    <Page eyebrow="Privacidad" title="Privacidad y datos locales" intro={LOCAL_DATA_NOTICE}>
      <Block title="Qué datos se tratan">
        <p>Los datos que el evaluador registra: caracterización de organizaciones, códigos y perfiles de participantes, respuestas, notas, referencias a evidencias y, de forma opcional, adjuntos. Se recomienda identificar a los participantes con códigos y no con nombres.</p>
        <p>No se recomienda adjuntar historias clínicas, expedientes reservados, credenciales ni información personal innecesaria. Para información especialmente sensible, utilice un entorno institucional autorizado, controles del dispositivo y procedimientos de tratamiento aprobados.</p>
      </Block>
      <Block title="Dónde se almacenan">
        <p>En la base de datos IndexedDB del navegador del dispositivo. La aplicación no tiene servidor, no requiere registro, no usa analítica ni rastreadores, y no envía datos de forma automática. La política de seguridad de contenido del sitio solo permite conexiones al mismo origen.</p>
        <p>Si se borran los datos del navegador, la información se pierde. Exporte copias de seguridad periódicas desde Configuración.</p>
      </Block>
      <Block title="Archivos exportados">
        <p>Los archivos pueden protegerse con contraseña mediante AES-GCM de 256 bits, con una clave derivada por PBKDF2-SHA-256 ({n(PBKDF2_ITERATIONS)} iteraciones) y salt e IV aleatorios. La contraseña no se guarda: si se pierde, el archivo no puede recuperarse.</p>
        <p>Proteger un archivo exportado no implica que los datos almacenados en el navegador estén cifrados por la aplicación. La seguridad también depende del dispositivo y de los canales usados para compartir los archivos.</p>
      </Block>
      <Block title="Modos de trabajo">
        <p>El modo evaluador y el modo entrevistado son modos de interfaz, no roles autenticados por un servidor. La aplicación no simula control de acceso empresarial.</p>
      </Block>
      <Block title="Responsabilidad">
        <p>La aplicación no sustituye el análisis institucional de protección de datos personales. Cada organización debe definir la base legal, las finalidades y los controles del tratamiento de la información que registra.</p>
      </Block>
    </Page>
  );
}
