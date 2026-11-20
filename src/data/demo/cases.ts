/**
 * Casos académicos ficticios. Todas las organizaciones, personas, sistemas y hechos son simulaciones
 * con fines pedagógicos y no deben atribuirse a organizaciones reales.
 */
import type { DimensionId, RespondentProfile } from '@/types/bank';

export interface CaseParticipant {
  code: string;
  profile: RespondentProfile;
  area: string;
  bias: number;
  voice: string;
}

export interface AcademicCase {
  id: string;
  seed: number;
  title: string;
  shortName: string;
  profileId: string;
  sector: string;
  municipality: string;
  department: string;
  size: 'micro' | 'pequena' | 'mediana' | 'grande';
  employees: string;
  context: string;
  orgChart: string[];
  systems: string[];
  documentaryState: string;
  budgetConstraints: string;
  techChallenges: string;
  needs: string;
  legal: { publicFunctions: 'si' | 'no' | 'desconocido'; publicResources: 'si' | 'no' | 'desconocido'; publicServices: 'si' | 'no' | 'desconocido'; personalData: 'si' | 'no' | 'desconocido'; sectoralRegulation: string };
  documentary: Record<string, string>;
  baseline: Record<DimensionId, number>;
  participants: CaseParticipant[];
  /** Valores fijos por criterio para provocar contradicciones o discrepancias deliberadas. */
  overrides: Record<string, number | Record<string, number>>;
  deliberateContradictions: string[];
  evidence: { questionId: string; title: string; reference: string; status: 'E1' | 'E2' | 'E3'; reviewResult: string }[];
  reflection: string[];
}

const B = (v: number[]): Record<DimensionId, number> =>
  Object.fromEntries(v.map((x, i) => [`D${String(i + 1).padStart(2, '0')}`, x])) as Record<DimensionId, number>;

export const ACADEMIC_CASES: AcademicCase[] = [
  {
    id: 'caso-alcaldia', seed: 11, title: 'Alcaldía de Valle Sereno (simulación)', shortName: 'Alcaldía Valle Sereno', profileId: 'publica_territorial',
    sector: 'Administración pública territorial', municipality: 'Valle Sereno (ficticio)', department: 'Departamento ficticio', size: 'mediana', employees: '310',
    context: 'Municipio de categoría intermedia con 14 secretarías. Inició hace dos años un programa de trámites en línea, pero conserva la mayor parte de sus expedientes en papel y en carpetas compartidas.',
    orgChart: ['Despacho del alcalde', 'Secretaría General (gestión documental)', 'Secretaría de Hacienda', 'Secretaría de Planeación', 'Secretaría de Gobierno', 'Oficina TIC', 'Control Interno'],
    systems: ['Sistema de correspondencia local (2014)', 'Software financiero municipal', 'Portal de trámites en línea', 'Carpetas compartidas en servidor local', 'Correo institucional'],
    documentaryState: 'Archivo central con 1.800 metros lineales, de los cuales cerca de 700 son fondos acumulados. Expedientes híbridos en licencias y contratación. Las tablas de retención fueron elaboradas hace ocho años.',
    budgetConstraints: 'Presupuesto documental anual simulado cercano al 0,3 % del funcionamiento; sin recursos plurianuales asegurados.',
    techChallenges: 'El sistema de correspondencia no registra los correos recibidos y no se integra con el portal de trámites. Las copias de seguridad existen pero nunca se han restaurado.',
    needs: 'Reducir tiempos de respuesta a peticiones, organizar fondos acumulados y preparar la adopción de un SGDEA.',
    legal: { publicFunctions: 'si', publicResources: 'si', publicServices: 'no', personalData: 'si', sectoralRegulation: '' },
    documentary: { hasPhysical: 'si', hasHybrid: 'si', hasNativeDigital: 'si', cloud: 'no', eSignature: 'si', preservationProgram: 'no', outsourcedCustody: 'no', aiTools: 'no', physicalVolume: '1.800 metros lineales (estimado)', digitalVolume: '1,2 TB (estimado)' },
    baseline: B([2.2, 2, 1.4, 2, 2.1, 1.6, 1.3, 1.8, 1.1, 1.7, 0.7, 1.8, 1.2, 0.4, 1.4]),
    participants: [
      { code: 'DIR-01', profile: 'direccion', area: 'Despacho', bias: 0.9, voice: 'Considera que el programa de trámites en línea resolvió buena parte de los problemas.' },
      { code: 'GD-01', profile: 'gestion_documental', area: 'Secretaría General', bias: -0.2, voice: 'Conoce en detalle el rezago de los instrumentos y los fondos acumulados.' },
      { code: 'TEC-01', profile: 'tecnologia', area: 'Oficina TIC', bias: 0.5, voice: 'Valora positivamente la infraestructura, aunque reconoce la falta de integración.' },
      { code: 'CI-01', profile: 'control_interno', area: 'Control Interno', bias: -0.4, voice: 'Ha documentado hallazgos repetidos sobre préstamos y transferencias.' },
      { code: 'USU-01', profile: 'usuarios', area: 'Secretaría de Gobierno', bias: -0.6, voice: 'Reporta dificultades para encontrar expedientes y uso intensivo de correo personal.' },
    ],
    overrides: { 'D05-Q03': 1, 'D07-Q04': 4, 'D08-Q13': 4, 'D08-Q14': 1, 'D01-Q05': { 'DIR-01': 5, 'GD-01': 2, 'CI-01': 1 } },
    deliberateContradictions: ['R07: cuadro de clasificación poco desarrollado frente a clasificación electrónica avanzada', 'R05: copias de seguridad avanzadas sin pruebas de recuperación', 'Discrepancia en el patrocinio directivo (D01-Q05)'],
    evidence: [
      { questionId: 'D05-Q05', title: 'Tablas de retención documental 2017 (documento sintético)', reference: 'TRD-2017-v1', status: 'E2', reviewResult: 'Aprobadas, pero desactualizadas frente a la estructura vigente.' },
      { questionId: 'D08-Q13', title: 'Reporte de ejecución de copias (sintético)', reference: 'TIC-BK-2026-03', status: 'E3', reviewResult: 'Copias diarias ejecutadas; no hay registro de restauraciones.' },
      { questionId: 'D06-Q12', title: 'Diagnóstico de fondos acumulados (sintético)', reference: 'DX-FA-2025', status: 'E2', reviewResult: 'Cuantifica el volumen; no incluye plan de intervención.' },
    ],
    reflection: [
      '¿Qué diferencia hay entre tener copias de seguridad y poder recuperar la información? ¿Qué evidencia lo demostraría?',
      '¿Cómo explicaría la diferencia entre la percepción de la dirección y la de control interno sobre el patrocinio directivo?',
      '¿Qué debería resolverse antes de adquirir un SGDEA en este municipio?',
    ],
  },
  {
    id: 'caso-universidad', seed: 23, title: 'Universidad Horizonte del Norte (simulación)', shortName: 'U. Horizonte', profileId: 'educacion_superior',
    sector: 'Educación superior privada', municipality: 'Ciudad ficticia', department: 'Departamento ficticio', size: 'grande', employees: '1.150',
    context: 'Universidad privada con cinco facultades. Migró su ofimática a una plataforma colaborativa en la nube y cada facultad organizó su información de manera autónoma.',
    orgChart: ['Rectoría', 'Secretaría General', 'Vicerrectoría Académica', 'Vicerrectoría Administrativa', 'Dirección de Tecnología', 'Facultades (5)', 'Registro académico'],
    systems: ['Plataforma colaborativa en la nube', 'Sistema académico', 'ERP administrativo', 'Repositorio institucional de tesis', 'Mesa de ayuda'],
    documentaryState: 'Expedientes académicos en el sistema académico y en sitios colaborativos; actas de consejos en carpetas compartidas. No existe esquema de metadatos común.',
    budgetConstraints: 'Recursos tecnológicos suficientes; poca inversión en personal archivístico especializado.',
    techChallenges: 'Duplicidad de documentos entre sitios colaborativos, permisos heredados sin revisión y cuentas de egresados y docentes retirados activas.',
    needs: 'Unificar criterios de organización, proteger datos personales de estudiantes y preservar la producción académica.',
    legal: { publicFunctions: 'desconocido', publicResources: 'no', publicServices: 'si', personalData: 'si', sectoralRegulation: 'Regulación de educación superior (por validar)' },
    documentary: { hasPhysical: 'si', hasHybrid: 'si', hasNativeDigital: 'si', cloud: 'si', eSignature: 'si', preservationProgram: 'no', outsourcedCustody: 'no', aiTools: 'si', digitalVolume: '38 TB (estimado)' },
    baseline: B([2.4, 1.6, 2.2, 1.8, 1.5, 2.1, 1.9, 3.1, 1.6, 2.2, 1.2, 2.3, 2.0, 1.6, 1.8]),
    participants: [
      { code: 'DIR-01', profile: 'direccion', area: 'Rectoría', bias: 0.6, voice: 'Destaca la inversión tecnológica reciente.' },
      { code: 'GD-01', profile: 'gestion_documental', area: 'Secretaría General', bias: -0.3, voice: 'Señala que no existe una clasificación común entre facultades.' },
      { code: 'TEC-01', profile: 'tecnologia', area: 'Dirección de Tecnología', bias: 0.7, voice: 'Confía en las capacidades de la plataforma en la nube.' },
      { code: 'DAT-01', profile: 'gobierno_datos', area: 'Planeación', bias: 0, voice: 'Ha detectado inconsistencias entre el sistema académico y los reportes institucionales.' },
      { code: 'USU-01', profile: 'usuarios', area: 'Facultad de Ingeniería', bias: -0.4, voice: 'Encuentra varias versiones de un mismo documento.' },
    ],
    overrides: { 'D09-Q01': 1, 'D09-Q08': 4, 'D10-Q04': 4, 'D10-Q05': 1, 'D08-Q03': { 'TEC-01': 4, 'GD-01': 1, 'USU-01': 1 } },
    deliberateContradictions: ['R02: validación avanzada de metadatos sin esquema', 'R08: controles de acceso avanzados sin gestión de usuarios', 'Discrepancia sobre la identificación de repositorios (D08-Q03)'],
    evidence: [
      { questionId: 'D10-Q04', title: 'Matriz de permisos de la plataforma (sintética)', reference: 'TI-PERM-2026', status: 'E2', reviewResult: 'Define perfiles, pero muestra permisos heredados sin depurar.' },
      { questionId: 'D09-Q01', title: 'Borrador de campos mínimos de descripción (sintético)', reference: 'SG-MD-0.2', status: 'E1', reviewResult: '' },
      { questionId: 'D13-Q09', title: 'Prueba de búsqueda en el repositorio de tesis (sintética)', reference: 'REP-TEST-01', status: 'E3', reviewResult: 'Búsqueda por metadatos funcional en el repositorio de tesis.' },
    ],
    reflection: [
      '¿Una plataforma colaborativa con buen buscador equivale a un sistema de gestión documental? Argumente con criterios del banco.',
      '¿Qué riesgos genera mantener cuentas activas de personas retiradas en la plataforma?',
      '¿Cómo priorizaría entre unificar la clasificación y fortalecer la preservación de tesis?',
    ],
  },
  {
    id: 'caso-ips', seed: 37, title: 'Clínica Santa Brisa IPS (simulación)', shortName: 'Clínica Santa Brisa', profileId: 'salud',
    sector: 'Salud', municipality: 'Ciudad ficticia', department: 'Departamento ficticio', size: 'mediana', employees: '640',
    context: 'Institución prestadora de servicios de salud de mediana complejidad. Implementó historia clínica electrónica hace cuatro años y conserva historias en papel de periodos anteriores.',
    orgChart: ['Gerencia', 'Dirección médica', 'Gestión de la información (archivo clínico)', 'Sistemas', 'Jurídica', 'Calidad', 'Facturación'],
    systems: ['Historia clínica electrónica', 'Sistema de facturación', 'Laboratorio clínico', 'Imágenes diagnósticas', 'Correo y mensajería interna'],
    documentaryState: 'Archivo clínico físico con 950 metros lineales en un depósito sin control ambiental; historia clínica electrónica desde hace cuatro años; formularios de consentimiento en papel escaneados.',
    budgetConstraints: 'Restricciones presupuestales severas simuladas; prioridad en servicios asistenciales.',
    techChallenges: 'El sistema de historia clínica elimina automáticamente borradores, pero no existe una tabla de retención aprobada para la información clínica digital.',
    needs: 'Proteger datos sensibles, asegurar la disponibilidad de historias clínicas y responder oportunamente a solicitudes de pacientes y entes de control.',
    legal: { publicFunctions: 'no', publicResources: 'si', publicServices: 'si', personalData: 'si', sectoralRegulation: 'Regulación sectorial de salud (historia clínica)' },
    documentary: { hasPhysical: 'si', hasHybrid: 'si', hasNativeDigital: 'si', cloud: 'no', eSignature: 'si', preservationProgram: 'no', outsourcedCustody: 'si', aiTools: 'no' },
    baseline: B([2.0, 2.1, 1.3, 2.6, 1.6, 1.4, 2.4, 2.4, 1.9, 1.9, 1.0, 2.0, 1.6, 0.6, 2.1]),
    participants: [
      { code: 'GER-01', profile: 'direccion', area: 'Gerencia', bias: 0.5, voice: 'Prioriza la continuidad del servicio y la facturación.' },
      { code: 'GD-01', profile: 'archivo', area: 'Archivo clínico', bias: -0.5, voice: 'Advierte sobre el estado del depósito y la falta de tablas de retención clínicas.' },
      { code: 'TEC-01', profile: 'tecnologia', area: 'Sistemas', bias: 0.6, voice: 'Considera robusta la historia clínica electrónica.' },
      { code: 'JUR-01', profile: 'juridica', area: 'Jurídica', bias: -0.2, voice: 'Atiende requerimientos de autoridades y pacientes con plazos estrictos.' },
      { code: 'SEG-01', profile: 'seguridad', area: 'Sistemas', bias: 0.1, voice: 'Ha identificado accesos compartidos en urgencias.' },
    ],
    overrides: { 'D05-Q05': 1, 'D07-Q14': 4, 'D10-Q10': 1, 'D06-Q03': { 'GD-01': 0, 'GER-01': 3 }, 'D10-Q06': 1 },
    deliberateContradictions: ['R01: aplicación avanzada de retención electrónica sin tiempos definidos', 'Capacidad crítica baja en protección de datos personales (D10-Q10)', 'Discrepancia sobre condiciones ambientales del depósito (D06-Q03)'],
    evidence: [
      { questionId: 'D07-Q14', title: 'Configuración de depuración automática (sintética)', reference: 'HCE-CONF-12', status: 'E2', reviewResult: 'La depuración aplica a borradores, no a reglas de retención aprobadas.' },
      { questionId: 'D06-Q03', title: 'Registro de humedad del depósito (sintético)', reference: 'ARC-HUM-2026', status: 'E3', reviewResult: 'Mediciones fuera de rango durante cinco meses.' },
      { questionId: 'D10-Q10', title: 'Política de tratamiento de datos (sintética)', reference: 'JUR-PTD-2023', status: 'E2', reviewResult: 'Existe política general; no hay controles específicos para documentos clínicos.' },
    ],
    reflection: [
      '¿Por qué una depuración automática no equivale a aplicar reglas de retención?',
      '¿Qué riesgos jurídicos y asistenciales implica la baja madurez en protección de datos personales?',
      'Con restricciones presupuestales severas, ¿qué tres acciones priorizaría y por qué?',
    ],
  },
  {
    id: 'caso-industrial', seed: 41, title: 'Manufacturas Andinas del Sur S.A.S. (simulación)', shortName: 'Manufacturas Andinas', profileId: 'industrial',
    sector: 'Industria manufacturera', municipality: 'Ciudad ficticia', department: 'Departamento ficticio', size: 'grande', employees: '890',
    context: 'Empresa de manufactura con tres plantas. Implementó un ERP hace seis años y automatizó aprobaciones de compras, pero los procesos documentales de calidad, contratos y mantenimiento están fragmentados.',
    orgChart: ['Gerencia general', 'Dirección financiera', 'Dirección de operaciones (3 plantas)', 'Calidad', 'Tecnología', 'Jurídica', 'Talento humano'],
    systems: ['ERP corporativo', 'Sistema de gestión de calidad', 'Gestor de mantenimiento', 'Herramienta de automatización de flujos', 'Carpetas compartidas por planta'],
    documentaryState: 'No existe un plan de clasificación corporativo; cada planta conserva sus registros de calidad y mantenimiento con criterios propios. Contratos firmados en papel y escaneados.',
    budgetConstraints: 'Presupuesto disponible para tecnología; la gestión documental no tiene rubro propio.',
    techChallenges: 'Flujos automatizados sin caracterización previa; documentos aprobados en el flujo no se conservan como evidencia; dependencia de un integrador externo.',
    needs: 'Reducir reprocesos, conservar evidencia para auditorías de clientes y organizar contratos.',
    legal: { publicFunctions: 'no', publicResources: 'no', publicServices: 'no', personalData: 'si', sectoralRegulation: '' },
    documentary: { hasPhysical: 'si', hasHybrid: 'si', hasNativeDigital: 'si', cloud: 'si', eSignature: 'no', preservationProgram: 'no', outsourcedCustody: 'si', aiTools: 'si' },
    baseline: B([1.9, 1.5, 1.4, 2.3, 1.2, 1.7, 1.6, 2.9, 2.0, 2.1, 0.8, 1.9, 1.8, 2.5, 2.4]),
    participants: [
      { code: 'GG-01', profile: 'direccion', area: 'Gerencia', bias: 0.7, voice: 'Percibe que el ERP centraliza la información de la empresa.' },
      { code: 'CAL-01', profile: 'calidad', area: 'Calidad', bias: -0.1, voice: 'Mantiene listados maestros separados por planta.' },
      { code: 'TEC-01', profile: 'tecnologia', area: 'Tecnología', bias: 0.4, voice: 'Destaca la automatización de aprobaciones.' },
      { code: 'PRO-01', profile: 'procesos', area: 'Operaciones', bias: -0.3, voice: 'Indica que los flujos automatizados no reflejan las excepciones reales.' },
      { code: 'FIN-01', profile: 'financiera', area: 'Financiera', bias: 0.2, voice: 'Desconoce los costos de custodia externa.' },
    ],
    overrides: { 'D04-Q04': 1, 'D14-Q03': 4, 'D02-Q03': 1, 'D02-Q12': 4, 'D14-Q02': 1 },
    deliberateContradictions: ['R21: flujos automatizados sin caracterización de flujos', 'R22: automatización sin estandarización previa', 'R06: rendición de cuentas sin roles definidos'],
    evidence: [
      { questionId: 'D14-Q03', title: 'Diagrama del flujo de compras automatizado (sintético)', reference: 'TI-FLW-COMP', status: 'E3', reviewResult: 'Flujo operativo con registro de aprobaciones.' },
      { questionId: 'D04-Q04', title: 'Inventario de procedimientos por planta (sintético)', reference: 'CAL-INV-2025', status: 'E2', reviewResult: 'Procedimientos sin caracterización de flujos documentales.' },
      { questionId: 'D08-Q12', title: 'Contrato con integrador (extracto sintético)', reference: 'JUR-CT-118', status: 'E1', reviewResult: '' },
    ],
    reflection: [
      '¿Qué se pierde cuando se automatiza un flujo sin caracterizarlo ni estandarizarlo?',
      '¿Es posible una alta rendición de cuentas sin roles definidos? ¿Qué evidencia pediría?',
      '¿Qué capacidades básicas deberían fortalecerse antes de ampliar la automatización?',
    ],
  },
  {
    id: 'caso-financiera', seed: 53, title: 'Cooperativa Financiera Puente Claro (simulación)', shortName: 'Cooperativa Puente Claro', profileId: 'financiera',
    sector: 'Financiero solidario', municipality: 'Ciudad ficticia', department: 'Departamento ficticio', size: 'grande', employees: '720',
    context: 'Entidad financiera con alta digitalización: originación de créditos en línea, firma electrónica, OCR y un asistente de IA interno. Conserva información de largo plazo (créditos hipotecarios) sin programa de preservación.',
    orgChart: ['Gerencia', 'Riesgos', 'Operaciones', 'Tecnología', 'Seguridad de la información', 'Cumplimiento', 'Gestión documental (dos personas)'],
    systems: ['Core financiero', 'Plataforma de originación digital', 'Gestor documental corporativo', 'Motor OCR', 'Asistente de IA interno', 'Nube pública'],
    documentaryState: 'Expedientes de crédito electrónicos con firma electrónica; formatos variados en imágenes; no hay identificación de documentos que deben preservarse a largo plazo.',
    budgetConstraints: 'Presupuesto alto en tecnología; sin partida para preservación digital.',
    techChallenges: 'El asistente de IA se usa con documentos de clientes sin autorización formal de casos de uso; las copias de los expedientes residen en la misma región de nube.',
    needs: 'Asegurar la disponibilidad de expedientes de créditos de largo plazo y gobernar el uso de IA.',
    legal: { publicFunctions: 'no', publicResources: 'no', publicServices: 'no', personalData: 'si', sectoralRegulation: 'Regulación financiera y solidaria (por validar)' },
    documentary: { hasPhysical: 'no', hasHybrid: 'no', hasNativeDigital: 'si', cloud: 'si', eSignature: 'si', preservationProgram: 'no', outsourcedCustody: 'si', aiTools: 'si' },
    baseline: B([2.8, 2.6, 2.4, 3.0, 2.3, 1.0, 3.2, 3.6, 3.0, 3.1, 0.9, 2.6, 2.7, 3.2, 2.9]),
    participants: [
      { code: 'GER-01', profile: 'direccion', area: 'Gerencia', bias: 0.5, voice: 'Considera la transformación digital como una fortaleza institucional.' },
      { code: 'GD-01', profile: 'gestion_documental', area: 'Gestión documental', bias: -0.4, voice: 'Advierte que nadie ha definido qué conservar a largo plazo.' },
      { code: 'TEC-01', profile: 'tecnologia', area: 'Tecnología', bias: 0.6, voice: 'Lidera la integración de OCR e IA con el gestor documental.' },
      { code: 'SEG-01', profile: 'seguridad', area: 'Seguridad', bias: -0.1, voice: 'Preocupado por el uso de IA con datos de clientes.' },
      { code: 'CUM-01', profile: 'juridica', area: 'Cumplimiento', bias: 0, voice: 'Requiere evidencias para auditorías del supervisor.' },
    ],
    overrides: { 'D11-Q01': 1, 'D11-Q15': 4, 'D14-Q11': 1, 'D14-Q08': 4, 'D11-Q08': 1, 'D14-Q14': { 'TEC-01': 4, 'SEG-01': 1, 'CUM-01': 2 } },
    deliberateContradictions: ['R03: evaluación avanzada del programa de preservación sin política', 'R04: automatización integrada sin gobierno de IA', 'Discrepancia sobre protección de información en IA (D14-Q14)'],
    evidence: [
      { questionId: 'D14-Q08', title: 'Arquitectura de integración OCR–gestor documental (sintética)', reference: 'TI-ARQ-OCR', status: 'E3', reviewResult: 'Integración operativa con metadatos.' },
      { questionId: 'D14-Q11', title: 'Correo de aprobación informal del asistente de IA (sintético)', reference: 'TI-MAIL-2026-07', status: 'E1', reviewResult: '' },
      { questionId: 'D11-Q07', title: 'Configuración de réplicas en nube (sintética)', reference: 'TI-REPL-01', status: 'E2', reviewResult: 'Réplicas en la misma región del proveedor.' },
    ],
    reflection: [
      '¿Por qué una alta madurez tecnológica no compensa una deficiencia crítica de preservación?',
      '¿Qué controles mínimos debería tener el asistente de IA antes de seguir usándose con documentos de clientes?',
      '¿Cómo justificaría ante la gerencia una partida para preservación digital?',
    ],
  },
];

export const ACADEMIC_READINGS = [
  {
    sourceId: 'A01',
    title: 'Diagnóstico de la gestión documental para la transición hacia un SGDEA en la Municipalidad de San Rafael de Heredia, Costa Rica (2025)',
    url: 'https://www.revistas.una.ac.cr/index.php/respaldo/article/view/23129',
    note: 'El contenido de este artículo no pudo consultarse durante el desarrollo; las preguntas se formulan sobre el alcance declarado en su título y no atribuyen hallazgos al artículo.',
    questions: [
      '¿Qué condiciones previas debería verificar un diagnóstico antes de recomendar la transición a un SGDEA en un gobierno local?',
      'Compare el enfoque del caso académico de Alcaldía de Valle Sereno con un diagnóstico orientado a la transición electrónica: ¿qué dimensiones del DIAM serían determinantes?',
      'Después de leer el artículo, identifique dos criterios del banco que permitirían contrastar sus conclusiones con evidencias.',
    ],
  },
  {
    sourceId: 'A02',
    title: 'Prospectiva de los sistemas gestores de documentos: homenaje a Pedro Manuel Díaz Ortuño',
    url: 'https://revistas.um.es/analesdoc/article/view/687111',
    note: 'Según su resumen público, el estudio examina la evolución y perspectivas de los sistemas de gestión documental en la transformación digital y destaca a los gestores documentales abiertos como base para políticas interoperables y sostenibles.',
    questions: [
      '¿Qué criterios de D08 y D09 permitirían evaluar si un gestor documental abierto es sostenible para una organización concreta?',
      '¿Cómo se relacionan las normas ISO 15489 e ISO 16175 con la diferencia entre capacidad de un sistema y uso real?',
      '¿Qué riesgos de dependencia tecnológica podría reducir una solución abierta y cuáles podría introducir?',
    ],
  },
];

export const LAB_PHASES = [
  { id: 1, name: 'Caracterizar', minutes: 10, goal: 'Revisar el contexto del caso, su perfil normativo y los sistemas.' },
  { id: 2, name: 'Entrevistar y evaluar', minutes: 20, goal: 'Analizar las entrevistas simuladas y registrar o revisar respuestas.' },
  { id: 3, name: 'Interpretar y triangular', minutes: 15, goal: 'Resolver discrepancias y contradicciones en la mesa de validación.' },
  { id: 4, name: 'Priorizar y sustentar', minutes: 15, goal: 'Valorar riesgos, priorizar iniciativas y argumentar conclusiones.' },
];
