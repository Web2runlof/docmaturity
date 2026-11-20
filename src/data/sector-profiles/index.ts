import type { LegalFlags } from '@/types/domain';

export interface SectorProfile {
  id: string;
  label: string;
  /** Naturaleza pública: true, false o 'depende' (requiere consulta al evaluador). */
  publicNature: true | false | 'depende';
  description: string;
  terminologyNote: string;
  defaultFlags: Partial<LegalFlags>;
}

export const SECTOR_PROFILES: SectorProfile[] = [
  { id: 'publica_nacional', label: 'Entidad pública nacional', publicNature: true, description: 'Entidad del orden nacional sujeta a la función archivística del Estado.', terminologyNote: 'Se usan los instrumentos archivísticos formales (CCD, TRD, TVD, PGD, PINAR, SIC).', defaultFlags: { publicFunctions: 'si', publicResources: 'si' } },
  { id: 'publica_territorial', label: 'Entidad pública territorial', publicNature: true, description: 'Gobernación, alcaldía o entidad descentralizada territorial.', terminologyNote: 'Se usan los instrumentos archivísticos formales y la articulación con archivos generales territoriales.', defaultFlags: { publicFunctions: 'si', publicResources: 'si' } },
  { id: 'eice', label: 'Empresa industrial y comercial del Estado', publicNature: true, description: 'Empresa estatal con régimen mixto de derecho público y privado.', terminologyNote: 'Las obligaciones archivísticas deben analizarse según su régimen y la información pública que produce.', defaultFlags: { publicResources: 'si' } },
  { id: 'privada_funciones_publicas', label: 'Empresa privada que ejerce funciones públicas', publicNature: 'depende', description: 'Particular que cumple funciones públicas por delegación o ley.', terminologyNote: 'Las obligaciones aplican a la información relacionada con la función pública ejercida.', defaultFlags: { publicFunctions: 'si' } },
  { id: 'privada_servicios_publicos', label: 'Empresa privada prestadora de servicios públicos', publicNature: 'depende', description: 'Operador privado de servicios públicos domiciliarios u otros servicios públicos.', terminologyNote: 'Las obligaciones aplican al ámbito de información asociado al servicio prestado.', defaultFlags: { publicServices: 'si' } },
  { id: 'privada_recursos_publicos', label: 'Empresa privada que administra recursos públicos', publicNature: 'depende', description: 'Particular que administra, recauda o ejecuta recursos públicos.', terminologyNote: 'Las obligaciones aplican a la documentación de la administración de los recursos públicos.', defaultFlags: { publicResources: 'si' } },
  { id: 'privada_ordinaria', label: 'Empresa privada ordinaria', publicNature: false, description: 'Organización privada sin funciones, servicios ni recursos públicos.', terminologyNote: 'Se evalúan capacidades equivalentes (plan de clasificación, calendario de conservación) como buenas prácticas, salvo obligaciones generales o sectoriales.', defaultFlags: { publicFunctions: 'no', publicResources: 'no', publicServices: 'no' } },
  { id: 'educacion_superior', label: 'Institución de educación superior', publicNature: 'depende', description: 'Universidad o institución universitaria pública o privada.', terminologyNote: 'Las IES públicas aplican instrumentos formales; las privadas, según su régimen y la regulación sectorial.', defaultFlags: { historicalValue: 'si' } },
  { id: 'salud', label: 'Organización de salud', publicNature: 'depende', description: 'IPS, EPS u otra organización del sector salud.', terminologyNote: 'La regulación sectorial sobre historias clínicas y datos sensibles es determinante.', defaultFlags: { personalData: 'si', sectoralRegulation: 'Regulación sectorial de salud (historia clínica, datos sensibles)' } },
  { id: 'financiera', label: 'Organización financiera', publicNature: 'depende', description: 'Entidad vigilada del sector financiero, asegurador o solidario.', terminologyNote: 'La regulación sectorial de conservación y reporte define obligaciones adicionales.', defaultFlags: { personalData: 'si', sectoralRegulation: 'Regulación financiera aplicable (por validar)' } },
  { id: 'industrial', label: 'Organización industrial', publicNature: false, description: 'Empresa manufacturera o de transformación.', terminologyNote: 'Predominan buenas prácticas y obligaciones comerciales, tributarias, laborales y ambientales.', defaultFlags: {} },
  { id: 'comercial', label: 'Organización comercial', publicNature: false, description: 'Empresa de comercio o distribución.', terminologyNote: 'Predominan obligaciones comerciales, tributarias y de protección de datos.', defaultFlags: { personalData: 'si' } },
  { id: 'servicios', label: 'Organización de servicios', publicNature: false, description: 'Empresa prestadora de servicios profesionales o técnicos.', terminologyNote: 'Predominan obligaciones contractuales, laborales y de protección de datos.', defaultFlags: {} },
  { id: 'sin_animo_lucro', label: 'Organización sin ánimo de lucro', publicNature: 'depende', description: 'Fundación, asociación, corporación o cooperativa.', terminologyNote: 'Si administra recursos públicos, las obligaciones aplican al ámbito de esos recursos.', defaultFlags: {} },
  { id: 'otro', label: 'Otro', publicNature: 'depende', description: 'Organización con naturaleza no contemplada en los perfiles anteriores.', terminologyNote: 'Las obligaciones deben definirse caso a caso en el panel de aplicabilidad jurídica.', defaultFlags: {} },
];

export const getProfile = (id: string): SectorProfile => SECTOR_PROFILES.find((p) => p.id === id) ?? SECTOR_PROFILES[SECTOR_PROFILES.length - 1];

export const EMPTY_LEGAL_FLAGS: LegalFlags = {
  publicFunctions: 'desconocido',
  publicResources: 'desconocido',
  publicServices: 'desconocido',
  sectoralRegulation: '',
  personalData: 'desconocido',
  historicalValue: 'desconocido',
  retentionObligations: '',
  affectedScope: '',
};

/** Campos de caracterización documental. Cada uno distingue dato proporcionado, estimado, verificado o desconocido. */
export const DOCUMENTARY_FIELDS: { key: string; label: string; kind: 'text' | 'tri' }[] = [
  { key: 'physicalVolume', label: 'Volumen físico aproximado', kind: 'text' },
  { key: 'digitalVolume', label: 'Volumen digital aproximado', kind: 'text' },
  { key: 'units', label: 'Unidades de medida utilizadas', kind: 'text' },
  { key: 'mainSeries', label: 'Principales series o categorías documentales', kind: 'text' },
  { key: 'hasPhysical', label: 'Existencia de archivos físicos', kind: 'tri' },
  { key: 'hasHybrid', label: 'Existencia de expedientes híbridos', kind: 'tri' },
  { key: 'hasNativeDigital', label: 'Existencia de documentos nativos digitales', kind: 'tri' },
  { key: 'documentSystems', label: 'Sistemas documentales actuales', kind: 'text' },
  { key: 'missionSystems', label: 'Sistemas misionales', kind: 'text' },
  { key: 'erp', label: 'ERP', kind: 'text' },
  { key: 'crm', label: 'CRM', kind: 'text' },
  { key: 'collaboration', label: 'Ofimática colaborativa', kind: 'text' },
  { key: 'email', label: 'Correo electrónico', kind: 'text' },
  { key: 'repositories', label: 'Repositorios', kind: 'text' },
  { key: 'cloud', label: 'Uso de nube', kind: 'tri' },
  { key: 'eSignature', label: 'Uso de firma electrónica o digital', kind: 'tri' },
  { key: 'preservationProgram', label: 'Existencia de programas de preservación', kind: 'tri' },
  { key: 'outsourcedCustody', label: 'Custodia o procesamiento documental tercerizado', kind: 'tri' },
  { key: 'aiTools', label: 'Uso de herramientas de automatización o IA', kind: 'tri' },
  { key: 'techProjects', label: 'Proyectos tecnológicos en ejecución', kind: 'text' },
];
